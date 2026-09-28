import { assertDirectDispatchAllowed, type ControlledCycleState, cardinalityExceeded } from "@workspace/lib/run-policy";
import type { RunOutcome } from "@workspace/selena-visibility-contracts";

export type SelenaMeasurementChannel = "visitor_view" | "api_view";

// The worker lease for the slow scraped collectors includes room after the
// provider deadline for snapshot cancellation and the transaction that makes
// the run and cycle terminal. It lives here rather than in the Bright Data
// adapter because the web app sizes its queues from it and must not pull the
// adapter (and node:crypto) into the browser.
export const SLOW_COLLECTOR_QUEUE_LEASE_SECONDS = 35 * 60;
export type SelenaMeasurementPermit = {
	cycleId: string;
	organizationId: string;
	scenarioId: string;
	channel: SelenaMeasurementChannel;
	dispatchKey: string;
};
/**
 * A permit as it is stored: the executor validates this record's own lifecycle
 * (expiry, consumption) before an adapter is allowed to see it.
 */
export type SelenaExecutablePermit = {
	id: string;
	organizationId: string;
	cycleId: string;
	scenarioId: string;
	channel: string;
	/** The sold system this permit authorizes, fixed at planning time. Null on permits minted before P0-07. */
	systemId: string | null;
	dispatchKey: string;
	expiresAt: Date;
	consumedAt: Date | null;
};
export type SelenaMeasurementAdapter = {
	readonly channel: SelenaMeasurementChannel;
	measure(permit: SelenaMeasurementPermit): Promise<{ dispatchKey: string; status: "queued" }>;
	/**
	 * The single seam where provider transport would live. A live adapter
	 * implements exactly this method; every guard around it lives in the
	 * executor, so an adapter cannot be reached without passing them.
	 */
	execute(permit: SelenaExecutablePermit): Promise<RunOutcome>;
};
export function planSelenaMeasurement(permits: SelenaMeasurementPermit[]): SelenaMeasurementPermit[] {
	const seen = new Set<string>();
	return permits.filter((permit) => {
		if (seen.has(permit.dispatchKey)) return false;
		seen.add(permit.dispatchKey);
		return permit.dispatchKey.length > 0;
	});
}
export function prepareSelenaDispatch(
	state: ControlledCycleState,
	permits: SelenaMeasurementPermit[],
): SelenaMeasurementPermit[] {
	assertDirectDispatchAllowed(state);
	const planned = planSelenaMeasurement(permits);
	if (cardinalityExceeded(planned.length, planned.length, state)) throw new Error("SELENA_CARDINALITY_BLOCKED");
	return planned;
}
export function createNoopMeasurementAdapter(channel: SelenaMeasurementChannel = "api_view"): SelenaMeasurementAdapter {
	return {
		channel,
		async measure(permit) {
			// The real adapter supplies the same state guard before provider
			// transport; the noop adapter keeps the contract testable without calls.
			if (permit.channel !== channel) throw new Error("MEASUREMENT_CHANNEL_MISMATCH");
			return { dispatchKey: permit.dispatchKey, status: "queued" };
		},
		async execute(permit) {
			// Deliberately never VALID: the noop adapter measures nothing, so
			// enabling execution with it wired in cannot manufacture a row that
			// reads like a real observation.
			return {
				dispatchKey: permit.dispatchKey,
				status: "INVALID",
				validity: "INVALID",
				invalidReason: "NOOP_ADAPTER_NO_PROVIDER_CALL",
			};
		},
	};
}
