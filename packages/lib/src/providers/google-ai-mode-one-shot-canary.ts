import { executeLegacyProviderTransport, isLegacyProviderExecutionEnabled } from "../run-policy/spend-gate";
import {
	type BrightDataDatasetTransport,
	type BrightDataSnapshotLifecycleContract,
	createBrightDataDatasetClient,
} from "./brightdata-dataset-client";
import {
	type PreparedProviderDatasetCanary,
	type ProviderDatasetAccessRequest,
	type ProviderDatasetEnvKey,
	type ProviderDatasetRawCapture,
	prepareProviderDatasetCanary,
} from "./dataset-registry";

export const GOOGLE_AI_MODE_CANARY_MAX_COST_USD = 0.25;
export const GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY = "selena-v1-3-google-ai-mode-canary" as const;
export const GOOGLE_AI_MODE_COST_PREFLIGHT_MAX_AGE_MS = 15 * 60 * 1_000;
export const GOOGLE_AI_MODE_CANARY_LIFECYCLE = Object.freeze({
	// Cancellation gets its own 10-second ceiling, keeping wall time below 25m.
	timeoutMs: 24 * 60 * 1_000,
	triggerTimeoutMs: 25_000,
	progressTimeoutMs: 20_000,
	downloadTimeoutMs: 60_000,
	pollIntervalMs: 10_000,
	cancelTimeoutMs: 10_000,
	readyStatuses: Object.freeze(["ready"]),
	pendingStatuses: Object.freeze(["pending", "running", "building", "starting", "queued"]),
	terminalFailureStatuses: Object.freeze(["failed", "error", "cancelled"]),
}) satisfies BrightDataSnapshotLifecycleContract;

export type GoogleAiModeCanaryReceipt = Readonly<{
	schemaVersion: "google-ai-mode-canary-receipt-v1.3";
	terminal: true;
	source: "GOOGLE_AI_MODE";
	status: "COMPLETE" | "TIMEOUT" | "TERMINAL_FAILURE" | "INVALID" | "OUTCOME_UNKNOWN" | "PREFLIGHT_BLOCKED";
	reason: string | null;
	providerCalls: 0 | 1;
	recurring: false;
	automaticRetries: 0;
	retryAllowed: false;
	reservationReference: string | null;
	cost: Readonly<{
		currency: "USD";
		status: "NOT_INCURRED" | "UNKNOWN";
		amountUsd: 0 | null;
		estimatedWorstCaseUsd: number | null;
		approvedCapUsd: 0.25;
		reservedUsd: 0 | 0.25;
		basis: "NOT_INCURRED" | "PROVIDER_ACTUAL_UNAVAILABLE";
		reconciliation: "NOT_REQUIRED" | "REQUIRED";
		acceptance: "NOT_APPLICABLE" | "HOLD";
		preflightEvidenceReference: string | null;
	}>;
	timing: Readonly<{
		overallTimeoutMs: number;
		triggerTimeoutMs: number;
		progressTimeoutMs: number;
		downloadTimeoutMs: number;
		pollIntervalMs: number;
		cancelTimeoutMs: number;
	}>;
	snapshotReference: string | null;
	recordCount: number | null;
	startedAt: string;
	finishedAt: string;
}>;

export type GoogleAiModeCanaryReservationResult =
	| Readonly<{
			status: "RESERVED";
			reservationReference: string;
			approvedCapUsd: 0.25;
			remainingAuthorizedUsd: number;
	  }>
	| Readonly<{ status: "ALREADY_RESERVED" | "BUDGET_BLOCKED" }>;

export type GoogleAiModeCostPreflightEvidence = Readonly<{
	schemaVersion: "google-ai-mode-cost-preflight-v1";
	verifiedWorstCaseUsd: number;
	enforcedMaximumUsd: number;
	remainingAuthorizedBudgetUsd: number;
	enforcement: "PROVIDER_ACCOUNT_HARD_CAP" | "PROVIDER_REQUEST_HARD_CAP";
	evidenceReference: string;
	verifiedAt: string;
}>;

export type GoogleAiModeCanaryRunResult = Readonly<{
	receipt: GoogleAiModeCanaryReceipt;
	/** Private evidence for explicit persistence by the caller; never print this object. */
	capture?: ProviderDatasetRawCapture;
	/** Exact approved contract binding used by the lifecycle; never print this object. */
	prepared?: PreparedProviderDatasetCanary;
}>;

type Clock = Readonly<{
	now?: () => number;
	nowIso?: () => string;
	wallNow?: () => number;
	sleep?: (durationMs: number) => Promise<void>;
}>;

export type GoogleAiModeOneShotCanaryOptions = Readonly<{
	access: ProviderDatasetAccessRequest;
	environment: Readonly<Partial<Record<ProviderDatasetEnvKey, string | undefined>>>;
	providerInput: unknown;
	transport?: BrightDataDatasetTransport;
	costPreflight?: GoogleAiModeCostPreflightEvidence;
	reserveOnce?: () => Promise<GoogleAiModeCanaryReservationResult>;
	clock?: Clock;
}>;

function isApprovedCostPolicy(
	access: ProviderDatasetAccessRequest,
	evidence: GoogleAiModeCostPreflightEvidence,
): boolean {
	return (
		access.worstCaseCostUsd !== null &&
		access.approvedCostCapUsd === GOOGLE_AI_MODE_CANARY_MAX_COST_USD &&
		Number.isFinite(access.worstCaseCostUsd) &&
		Number.isFinite(access.approvedCostCapUsd) &&
		access.worstCaseCostUsd >= 0 &&
		access.worstCaseCostUsd <= GOOGLE_AI_MODE_CANARY_MAX_COST_USD &&
		access.approvedCostCapUsd >= access.worstCaseCostUsd &&
		access.worstCaseCostUsd === evidence.verifiedWorstCaseUsd
	);
}

function isValidCostPreflightEvidence(
	evidence: GoogleAiModeCostPreflightEvidence | undefined,
	nowMs: number,
): evidence is GoogleAiModeCostPreflightEvidence {
	if (evidence?.schemaVersion !== "google-ai-mode-cost-preflight-v1") return false;
	const keys = Object.keys(evidence).sort();
	if (
		keys.join(",") !==
		"enforcedMaximumUsd,enforcement,evidenceReference,remainingAuthorizedBudgetUsd,schemaVersion,verifiedAt,verifiedWorstCaseUsd"
	)
		return false;
	if (evidence.enforcement !== "PROVIDER_ACCOUNT_HARD_CAP" && evidence.enforcement !== "PROVIDER_REQUEST_HARD_CAP")
		return false;
	if (
		!Number.isFinite(evidence.verifiedWorstCaseUsd) ||
		evidence.verifiedWorstCaseUsd <= 0 ||
		evidence.verifiedWorstCaseUsd > GOOGLE_AI_MODE_CANARY_MAX_COST_USD ||
		!Number.isFinite(evidence.enforcedMaximumUsd) ||
		evidence.enforcedMaximumUsd < evidence.verifiedWorstCaseUsd ||
		evidence.enforcedMaximumUsd > GOOGLE_AI_MODE_CANARY_MAX_COST_USD ||
		!Number.isFinite(evidence.remainingAuthorizedBudgetUsd) ||
		evidence.remainingAuthorizedBudgetUsd < evidence.verifiedWorstCaseUsd
	)
		return false;
	if (!/^cost-preflight:[a-zA-Z0-9._-]{8,128}$/.test(evidence.evidenceReference)) return false;
	const verifiedAt = Date.parse(evidence.verifiedAt);
	const ageMs = nowMs - verifiedAt;
	return Number.isFinite(verifiedAt) && ageMs >= 0 && ageMs <= GOOGLE_AI_MODE_COST_PREFLIGHT_MAX_AGE_MS;
}

function isValidReservation(
	reservation: GoogleAiModeCanaryReservationResult,
): reservation is Extract<GoogleAiModeCanaryReservationResult, { status: "RESERVED" }> {
	return (
		reservation.status === "RESERVED" &&
		reservation.approvedCapUsd === GOOGLE_AI_MODE_CANARY_MAX_COST_USD &&
		Number.isFinite(reservation.remainingAuthorizedUsd) &&
		reservation.remainingAuthorizedUsd >= GOOGLE_AI_MODE_CANARY_MAX_COST_USD &&
		/^[a-zA-Z0-9:_-]{8,160}$/.test(reservation.reservationReference)
	);
}

function snapshotReference(snapshotId: string | undefined): string | null {
	if (!snapshotId || !/^[a-zA-Z0-9_-]+$/.test(snapshotId)) return null;
	return `brightdata:snapshot:${snapshotId}`;
}

function createReceipt(input: {
	status: GoogleAiModeCanaryReceipt["status"];
	reason: string | null;
	providerCalls: 0 | 1;
	access: ProviderDatasetAccessRequest;
	startedAt: string;
	finishedAt: string;
	snapshotId?: string;
	recordCount?: number;
	reservationMade?: boolean;
	reservationReference?: string;
	preflightEvidenceReference?: string;
}): GoogleAiModeCanaryReceipt {
	const callWasAttempted = input.providerCalls === 1;
	const reservationMade = input.reservationMade === true;
	return Object.freeze({
		schemaVersion: "google-ai-mode-canary-receipt-v1.3" as const,
		terminal: true as const,
		source: "GOOGLE_AI_MODE" as const,
		status: input.status,
		reason: input.reason,
		providerCalls: input.providerCalls,
		recurring: false as const,
		automaticRetries: 0 as const,
		retryAllowed: false as const,
		reservationReference: input.reservationReference ?? null,
		cost: Object.freeze({
			currency: "USD" as const,
			status: callWasAttempted ? ("UNKNOWN" as const) : ("NOT_INCURRED" as const),
			amountUsd: callWasAttempted ? null : (0 as const),
			estimatedWorstCaseUsd: callWasAttempted ? input.access.worstCaseCostUsd : null,
			approvedCapUsd: GOOGLE_AI_MODE_CANARY_MAX_COST_USD,
			reservedUsd: reservationMade ? GOOGLE_AI_MODE_CANARY_MAX_COST_USD : (0 as const),
			basis: callWasAttempted ? ("PROVIDER_ACTUAL_UNAVAILABLE" as const) : ("NOT_INCURRED" as const),
			reconciliation: callWasAttempted ? ("REQUIRED" as const) : ("NOT_REQUIRED" as const),
			acceptance: callWasAttempted ? ("HOLD" as const) : ("NOT_APPLICABLE" as const),
			preflightEvidenceReference: input.preflightEvidenceReference ?? null,
		}),
		timing: Object.freeze({
			overallTimeoutMs: GOOGLE_AI_MODE_CANARY_LIFECYCLE.timeoutMs,
			triggerTimeoutMs: GOOGLE_AI_MODE_CANARY_LIFECYCLE.triggerTimeoutMs,
			progressTimeoutMs: GOOGLE_AI_MODE_CANARY_LIFECYCLE.progressTimeoutMs,
			downloadTimeoutMs: GOOGLE_AI_MODE_CANARY_LIFECYCLE.downloadTimeoutMs,
			pollIntervalMs: GOOGLE_AI_MODE_CANARY_LIFECYCLE.pollIntervalMs,
			cancelTimeoutMs: GOOGLE_AI_MODE_CANARY_LIFECYCLE.cancelTimeoutMs,
		}),
		snapshotReference: snapshotReference(input.snapshotId),
		recordCount: input.recordCount ?? null,
		startedAt: input.startedAt,
		finishedAt: input.finishedAt,
	});
}

/**
 * Executes the one owner-authorized GOOGLE_AI_MODE schema-discovery attempt.
 * Every terminal path returns a redacted receipt; no path automatically retries.
 */
export async function runGoogleAiModeOneShotCanary(
	options: GoogleAiModeOneShotCanaryOptions,
): Promise<GoogleAiModeCanaryRunResult> {
	const nowIso = options.clock?.nowIso ?? (() => new Date().toISOString());
	const wallNow = options.clock?.wallNow ?? Date.now;
	const startedAt = nowIso();
	const preflightReceipt = (reason: string): GoogleAiModeCanaryRunResult => ({
		receipt: createReceipt({
			status: "PREFLIGHT_BLOCKED",
			reason,
			providerCalls: 0,
			access: options.access,
			startedAt,
			finishedAt: nowIso(),
		}),
	});

	if (!isLegacyProviderExecutionEnabled()) return preflightReceipt("MASTER_PROVIDER_GATE_CLOSED");
	if (!isValidCostPreflightEvidence(options.costPreflight, wallNow()))
		return preflightReceipt("COST_PREFLIGHT_EVIDENCE_REQUIRED");
	if (!isApprovedCostPolicy(options.access, options.costPreflight)) return preflightReceipt("COST_POLICY_INVALID");
	if (!options.transport) return preflightReceipt("VERIFIED_TRANSPORT_REQUIRED");
	if (!options.reserveOnce) return preflightReceipt("DURABLE_RESERVATION_REQUIRED");

	let prepared: ReturnType<typeof prepareProviderDatasetCanary>;
	try {
		prepared = prepareProviderDatasetCanary(
			"GOOGLE_AI_MODE",
			options.access,
			options.environment,
			options.providerInput,
		);
	} catch {
		return preflightReceipt("CANARY_POLICY_INVALID");
	}

	let reservationMade = false;
	let reservationReference: string | undefined;
	try {
		const reservation = await options.reserveOnce();
		if (reservation.status === "ALREADY_RESERVED") return preflightReceipt("RESERVATION_ALREADY_EXISTS");
		if (reservation.status === "BUDGET_BLOCKED") return preflightReceipt("REMAINING_BUDGET_INSUFFICIENT");
		if (!isValidReservation(reservation)) return preflightReceipt("RESERVATION_AUTHORIZATION_INVALID");
		reservationMade = true;
		reservationReference = reservation.reservationReference;
	} catch {
		return preflightReceipt("DURABLE_RESERVATION_UNAVAILABLE");
	}

	let providerCalls: 0 | 1 = 0;
	let observedSnapshotId: string | undefined;
	const transport = options.transport;
	const guardedTransport: BrightDataDatasetTransport = {
		trigger: (request, signal) =>
			executeLegacyProviderTransport(async () => {
				if (providerCalls !== 0) throw new Error("GOOGLE_AI_MODE_CANARY_TRIGGER_ALREADY_ATTEMPTED");
				providerCalls = 1;
				const trigger = await transport.trigger(request, signal);
				observedSnapshotId = trigger.snapshotId;
				return trigger;
			}),
		progress: (snapshotId, signal) => transport.progress(snapshotId, signal),
		download: (snapshotId, signal) => transport.download(snapshotId, signal),
		cancel: (snapshotId, signal) => transport.cancel(snapshotId, signal),
	};

	try {
		const result = await createBrightDataDatasetClient({
			transport: guardedTransport,
			lifecycle: GOOGLE_AI_MODE_CANARY_LIFECYCLE,
			now: options.clock?.now,
			nowIso,
			sleep: options.clock?.sleep,
		}).collect(prepared);
		const finishedAt = nowIso();
		if (result.status === "COMPLETE") {
			return Object.freeze({
				receipt: createReceipt({
					status: "COMPLETE",
					reason: null,
					providerCalls,
					access: options.access,
					startedAt,
					finishedAt,
					snapshotId: result.snapshotId,
					recordCount: result.capture.recordCount,
					reservationMade,
					reservationReference,
					preflightEvidenceReference: options.costPreflight.evidenceReference,
				}),
				capture: result.capture,
				prepared,
			});
		}
		return Object.freeze({
			receipt: createReceipt({
				status: result.status,
				reason:
					result.status === "TIMEOUT"
						? "LIFECYCLE_TIMEOUT"
						: result.status === "TERMINAL_FAILURE"
							? "PROVIDER_TERMINAL_STATUS"
							: result.reason,
				providerCalls,
				access: options.access,
				startedAt,
				finishedAt,
				snapshotId: result.snapshotId,
				reservationMade,
				reservationReference,
				preflightEvidenceReference: options.costPreflight.evidenceReference,
			}),
		});
	} catch {
		return Object.freeze({
			receipt: createReceipt({
				status: providerCalls === 0 ? "PREFLIGHT_BLOCKED" : "OUTCOME_UNKNOWN",
				reason:
					providerCalls === 0
						? "MASTER_PROVIDER_GATE_CLOSED"
						: observedSnapshotId
							? "LIFECYCLE_OUTCOME_UNKNOWN"
							: "TRIGGER_OUTCOME_UNKNOWN",
				providerCalls,
				access: options.access,
				startedAt,
				finishedAt: nowIso(),
				snapshotId: observedSnapshotId,
				reservationMade,
				reservationReference,
				preflightEvidenceReference: options.costPreflight.evidenceReference,
			}),
		});
	}
}

const BRIGHT_DATA_DATASET_BASE_URL = "https://api.brightdata.com/datasets/v3";
const MAX_RESPONSE_BYTES = 1_000_000;

async function readJsonResponse(response: Response, errorCode: string): Promise<unknown> {
	if (!response.ok) {
		await response.body?.cancel().catch(() => undefined);
		throw new Error(errorCode);
	}
	const declaredSize = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredSize) && declaredSize > MAX_RESPONSE_BYTES) throw new Error(errorCode);
	const body = await response.text();
	if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) throw new Error(errorCode);
	try {
		return JSON.parse(body) as unknown;
	} catch {
		throw new Error(errorCode);
	}
}

function record(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** HTTP lifecycle proven by the repository's existing datasets/v3 adapter. */
export function createBrightDataGoogleAiModeTransport(input: {
	apiKey: string;
	fetchImpl?: typeof fetch;
}): BrightDataDatasetTransport {
	if (!input.apiKey.trim()) throw new Error("BRIGHTDATA_API_TOKEN_REQUIRED");
	const fetchImpl = input.fetchImpl ?? fetch;
	const headers = { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" };
	return Object.freeze({
		async trigger(request, signal) {
			return executeLegacyProviderTransport(async () => {
				const url = new URL(`${BRIGHT_DATA_DATASET_BASE_URL}/trigger`);
				url.searchParams.set("dataset_id", request.datasetId);
				url.searchParams.set("notify", "false");
				url.searchParams.set("include_errors", "true");
				url.searchParams.set("format", "json");
				const payload = await readJsonResponse(
					await fetchImpl(url, {
						method: "POST",
						headers,
						body: JSON.stringify(request.input.records),
						signal,
					}),
					"BRIGHTDATA_GOOGLE_AI_MODE_TRIGGER_FAILED",
				);
				const snapshotId = record(payload)?.snapshot_id;
				if (typeof snapshotId !== "string" || !snapshotId.trim())
					throw new Error("BRIGHTDATA_GOOGLE_AI_MODE_TRIGGER_FAILED");
				return { snapshotId };
			});
		},
		async progress(snapshotId, signal) {
			const payload = await readJsonResponse(
				await fetchImpl(`${BRIGHT_DATA_DATASET_BASE_URL}/progress/${encodeURIComponent(snapshotId)}`, {
					headers,
					signal,
				}),
				"BRIGHTDATA_GOOGLE_AI_MODE_PROGRESS_FAILED",
			);
			const status = record(payload)?.status;
			if (typeof status !== "string" || !status.trim()) throw new Error("BRIGHTDATA_GOOGLE_AI_MODE_PROGRESS_FAILED");
			return { status };
		},
		async download(snapshotId, signal) {
			return readJsonResponse(
				await fetchImpl(`${BRIGHT_DATA_DATASET_BASE_URL}/snapshot/${encodeURIComponent(snapshotId)}?format=json`, {
					headers,
					signal,
				}),
				"BRIGHTDATA_GOOGLE_AI_MODE_DOWNLOAD_FAILED",
			);
		},
		async cancel(snapshotId, signal) {
			const response = await fetchImpl(
				`${BRIGHT_DATA_DATASET_BASE_URL}/snapshot/${encodeURIComponent(snapshotId)}/cancel`,
				{ method: "POST", headers, signal },
			);
			await response.body?.cancel().catch(() => undefined);
			if (!response.ok) throw new Error("BRIGHTDATA_GOOGLE_AI_MODE_CANCEL_FAILED");
		},
	});
}
