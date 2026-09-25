import {
	assertAdaptersConfigured,
	assertMeasurementAllowed,
	measurementAdapterNamesFor,
	type RunOutcome,
	resolveMeasurementAdapterName,
	runOutcomeSchema,
	type SelenaMeasurementConfig,
} from "@workspace/selena-visibility-contracts";
import { assertTransportAllowed, type ControlledCycleState } from "./run-policy";
import type { SelenaExecutablePermit, SelenaMeasurementAdapter } from "./selena-measurement";

// This module is the whole execution path, and it is pure: the adapter is
// injected, so no queue client, scheduler or transport can be reached from
// here. Every guard that must hold before a provider is contacted lives in
// executePermit, which means an adapter has no way to be invoked without them.

// Re-exported so the worker reads the execution contract through this module
// rather than restating the flag names it depends on.
export {
	assertDispatchModes,
	isAffirmativeEnvValue,
	measurementAdapterNamesFor,
	measurementConfigFromEnv,
	type SelenaMeasurementConfig,
} from "@workspace/selena-visibility-contracts";

/** The planning-seam adapter is exactly what the executor consumes. */
export type MeasurementAdapter = SelenaMeasurementAdapter;
export type MeasurementAdapterRegistry = Readonly<Record<string, MeasurementAdapter>>;

export type ExecutePermitInput = {
	permit: SelenaExecutablePermit;
	adapter: MeasurementAdapter;
	cycleState: ControlledCycleState;
	config: SelenaMeasurementConfig;
	/** Injected so permit expiry is testable and never reads an ambient clock. */
	now: Date;
};

export async function executePermit(input: ExecutePermitInput): Promise<RunOutcome> {
	const { permit, adapter, cycleState, config, now } = input;
	assertMeasurementAllowed(config);
	// Transport-adjacent by design: an emergency stop has to be able to halt a
	// run that is already claimed, not merely stop new ones from being planned.
	assertTransportAllowed(cycleState);
	if (permit.expiresAt.getTime() <= now.getTime()) throw new Error("SELENA_PERMIT_EXPIRED");
	// The permit handed in is the pre-consumption snapshot the claim returned;
	// a replay therefore arrives already consumed and is refused here, so one
	// permit can never authorize a second provider call.
	if (permit.consumedAt !== null) throw new Error("SELENA_PERMIT_ALREADY_CONSUMED");
	const outcome = runOutcomeSchema.parse(await adapter.execute(permit));
	if (outcome.dispatchKey !== permit.dispatchKey) throw new Error("SELENA_DISPATCH_KEY_MISMATCH");
	// P0-07: evidence attributed to a system the permit did not authorize must
	// not enter the ledger — but the run itself is paid and valid, so the
	// measurement is dropped (recoverable offline from the raw response)
	// rather than turning the run into a FAILED row.
	if (outcome.measurement && permit.systemId !== null && outcome.measurement.system !== permit.systemId) {
		const { measurement: _dropped, ...withoutMeasurement } = outcome;
		return withoutMeasurement;
	}
	return outcome;
}

/**
 * Optional cumulative spend meter for the paid path.
 *
 * Structural for the same reason as the run store: this module must not import
 * a database. The worker passes the real one; a caller that passes nothing
 * keeps the previous behaviour, where the only ceilings are the per-order
 * preflight cap and the limit on the provider account.
 *
 * Budget is held before the permit is claimed, because claiming spends the
 * permit: a refusal has to arrive while it is still unspent, the same reason
 * the adapter check sits where it does.
 */
export type MeasurementSpendMeter = {
	reserve(request: { requestKey: string; estimatedUsd: number }): Promise<void>;
	settle(request: { requestKey: string; actualUsd: number }): Promise<void>;
	release(request: { requestKey: string }): Promise<void>;
};

/**
 * What one answer is booked at before the invoice says otherwise. Read off the
 * account's own usage on 2026-09-01: nine ChatGPT records cost USD 0.0135.
 */
export const MEASUREMENT_ESTIMATED_COST_USD = 0.0015;
const DATAFORSEO_PERPLEXITY_ESTIMATED_COST_USD = 0.005;

function estimatedCostForAdapter(configuredAdapter: string): number {
	return measurementAdapterNamesFor(configuredAdapter).includes("dataforseo-perplexity")
		? DATAFORSEO_PERPLEXITY_ESTIMATED_COST_USD
		: MEASUREMENT_ESTIMATED_COST_USD;
}

/**
 * Storage port for the runner. Kept structural so this module stays free of
 * repository and database imports; the worker passes the real repositories.
 */
export type MeasurementRunStore<Ctx> = {
	claim(
		ctx: Ctx,
		permitId: string,
		opts?: { now?: Date; journalClaimId?: string },
	): Promise<{
		permit: SelenaExecutablePermit;
		run: { id: string };
		cycle: { id: string; status: string };
		claimed: boolean;
		providerBoundary?: { journalClaimId: string; runId: string };
	}>;
	complete(ctx: Ctx, runId: string, outcome: RunOutcome, opts?: { now?: Date }): Promise<unknown>;
};

export type MeasurementRunResult =
	| { status: "skipped"; reason: string }
	| { status: "completed"; runId: string; outcome: RunOutcome }
	| { status: "failed"; runId: string; reason: string };

/** Error text is stored in run state, so keep it to the short guard codes. */
function failureReason(error: unknown): string {
	return (error instanceof Error ? error.message : String(error)).slice(0, 200);
}

/**
 * Claim a permit, execute it through the injected adapter, and record the
 * outcome. A failure is recorded as a terminal FAILED run rather than rethrown:
 * the permit is spent by the claim, so a retry could only produce a second
 * provider call for work that is already authorized once.
 */
export async function runMeasurementForPermit<Ctx>(input: {
	permitId: string;
	ctx: Ctx;
	store: MeasurementRunStore<Ctx>;
	adapters: MeasurementAdapterRegistry;
	config: SelenaMeasurementConfig;
	cycleState?: Partial<ControlledCycleState>;
	/** Fresh completion clock; `now` remains the deterministic claim time. */
	clock?: () => Date;
	/** Fenced atomically with permit consumption by the real run store. */
	journalClaimId?: string;
	/** Absent leaves spending unmetered, as it was before the ledger existed. */
	spend?: MeasurementSpendMeter;
	now?: Date;
}): Promise<MeasurementRunResult> {
	// Checked before anything is read or written: while measurement is off the
	// runner touches neither storage nor an adapter.
	if (!input.config.enabled) return { status: "skipped", reason: "SELENA_MEASUREMENT_DISABLED" };
	// Before the permit is claimed, because claiming spends it: a configured
	// name that cannot reach an approved, registered adapter must be refused
	// while the permit is still unspent.
	assertAdaptersConfigured(input.config.adapter, Object.keys(input.adapters));
	// Held before the claim for the same reason, and keyed by the permit so a
	// redelivered job rides on the reservation it already made.
	const estimatedCostUsd = estimatedCostForAdapter(input.config.adapter);
	if (input.spend) await input.spend.reserve({ requestKey: input.permitId, estimatedUsd: estimatedCostUsd });
	const claimTime = input.now ?? input.clock?.() ?? new Date();
	const completionTime = () => input.clock?.() ?? new Date();
	const { permit, run, cycle, claimed, providerBoundary } = await input.store.claim(input.ctx, input.permitId, {
		now: claimTime,
		...(input.journalClaimId ? { journalClaimId: input.journalClaimId } : {}),
	});
	if (
		input.journalClaimId &&
		(!providerBoundary || providerBoundary.journalClaimId !== input.journalClaimId || providerBoundary.runId !== run.id)
	) {
		throw new Error("SELENA_JOURNAL_PROVIDER_BOUNDARY_MISSING");
	}
	if (!claimed) {
		// Someone else already ran this permit, so this attempt spends nothing
		// and must not keep holding budget for a call it will never make.
		if (input.spend) await input.spend.release({ requestKey: input.permitId });
		return { status: "skipped", reason: "SELENA_PERMIT_ALREADY_CONSUMED" };
	}
	// Chosen from the permit, not from the environment: a plan sells several
	// systems and the surface a customer bought decides which adapter measures
	// it.
	const adapter = input.adapters[resolveMeasurementAdapterName(input.config.adapter, permit.systemId)];
	const cycleState: ControlledCycleState = {
		activeMaintenanceJobs: 0,
		activeCohortJobs: 0,
		cohortId: permit.cycleId,
		// One permit authorizes exactly one provider call, and nothing here may
		// widen that: the permit set is the cardinality budget.
		expectedJobs: 1,
		expectedProviderCalls: 1,
		seenCohortIds: new Set<string>(),
		globalEmergencyStop: false,
		orderStopped: cycle.status === "STOPPED",
		...input.cycleState,
	};
	try {
		const outcome = await executePermit({ permit, adapter, cycleState, config: input.config, now: claimTime });
		await input.store.complete(input.ctx, run.id, outcome, { now: completionTime() });
		// The adapter's own figure when it reported one; otherwise the estimate
		// the reservation was taken at. Either way the meter records a number
		// rather than leaving the hold open.
		if (input.spend)
			await input.spend.settle({
				requestKey: input.permitId,
				actualUsd: outcome.costUsd ?? estimatedCostUsd,
			});
		return { status: "completed", runId: run.id, outcome };
	} catch (error) {
		const reason = failureReason(error);
		await input.store.complete(
			input.ctx,
			run.id,
			{ dispatchKey: permit.dispatchKey, status: "FAILED", validity: "INVALID", invalidReason: reason },
			{ now: completionTime() },
		);
		// A failed run may still have reached the provider, so this is not a
		// release: the transport boundary decides, and until it says otherwise
		// the estimate stays committed rather than being handed back.
		if (input.spend) await input.spend.settle({ requestKey: input.permitId, actualUsd: estimatedCostUsd });
		return { status: "failed", runId: run.id, reason };
	}
}
