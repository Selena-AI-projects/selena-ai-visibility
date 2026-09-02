import type {
	PreparedProviderDatasetCanary,
	ProviderDatasetRawCapture,
	ProviderDatasetSourceId,
} from "./dataset-registry";
import {
	consumePreparedProviderDatasetCanary,
	createProviderDatasetRawCaptureFromLifecycle,
} from "./provider-dataset-authority";

export type BrightDataSnapshotProgress = Readonly<{ status: string }>;
export type BrightDataSnapshotTrigger = Readonly<{ snapshotId: string }>;
export type BrightDataSynchronousScrape = Readonly<{
	snapshotId: string;
	rawPayload?: unknown;
	rawReference?: string;
}>;

export type BrightDataDatasetTransportRequest = Readonly<{
	source: ProviderDatasetSourceId;
	datasetId: string;
	input: PreparedProviderDatasetCanary["input"];
}>;

export type BrightDataDatasetTransport = Readonly<{
	preflight(request: BrightDataDatasetTransportRequest, signal: AbortSignal): Promise<void>;
	trigger(request: BrightDataDatasetTransportRequest, signal: AbortSignal): Promise<BrightDataSnapshotTrigger>;
	scrape?(request: BrightDataDatasetTransportRequest, signal: AbortSignal): Promise<BrightDataSynchronousScrape>;
	progress(snapshotId: string, signal: AbortSignal): Promise<BrightDataSnapshotProgress>;
	download(snapshotId: string, signal: AbortSignal): Promise<unknown>;
	cancel(snapshotId: string, signal: AbortSignal): Promise<void>;
}>;

export type BrightDataSnapshotLifecycleContract = Readonly<{
	timeoutMs: number;
	pollIntervalMs: number;
	cancelTimeoutMs: number;
	readyStatuses: readonly string[];
	pendingStatuses: readonly string[];
	terminalFailureStatuses: readonly string[];
}>;

export type BrightDataSnapshotJournalPhase =
	| "TRIGGERED"
	| "RESUMED"
	| "PENDING"
	| "READY"
	| "DELIVERED"
	| "TIMEOUT"
	| "TERMINAL_FAILURE"
	| "INVALID"
	| "INTERRUPTED";

export type BrightDataSnapshotJournalEntry = Readonly<{
	source: ProviderDatasetSourceId;
	datasetId: string;
	snapshotId: string;
	phase: BrightDataSnapshotJournalPhase;
	observedAt: string;
	providerStatus?: string;
	recordCount?: number;
}>;

/** This must use durable storage before the client is wired into a worker. */
export type BrightDataSnapshotJournal = Readonly<{
	record(entry: BrightDataSnapshotJournalEntry): Promise<void>;
}>;

export type BrightDataDatasetCollectionResult =
	| Readonly<{ status: "COMPLETE"; snapshotId: string; capture: ProviderDatasetRawCapture }>
	| Readonly<{ status: "TIMEOUT"; snapshotId: string }>
	| Readonly<{ status: "TERMINAL_FAILURE"; snapshotId: string; providerStatus: string }>
	| Readonly<{ status: "INVALID"; snapshotId: string; reason: "UNRECOGNIZED_STATUS" | "DOWNLOAD_EMPTY" }>;

export type BrightDataDatasetClientOptions = Readonly<{
	transport?: BrightDataDatasetTransport;
	journal: BrightDataSnapshotJournal;
	lifecycle: BrightDataSnapshotLifecycleContract;
	now?: () => number;
	nowIso?: () => string;
	sleep?: (durationMs: number) => Promise<void>;
}>;

export class BrightDataDatasetInterruptedError extends Error {
	constructor(
		message:
			| "BRIGHTDATA_DATASET_PROGRESS_FAILED"
			| "BRIGHTDATA_DATASET_DOWNLOAD_FAILED"
			| "BRIGHTDATA_DATASET_JOURNAL_FAILED",
		public readonly snapshotId: string,
	) {
		super(message);
		this.name = "BrightDataDatasetInterruptedError";
	}
}

function normalizedStatuses(statuses: readonly string[], field: string): ReadonlySet<string> {
	const normalized = new Set(statuses.map((status) => status.trim().toLowerCase()).filter(Boolean));
	if (normalized.size === 0) throw new Error(`BRIGHTDATA_DATASET_${field}_STATUSES_REQUIRED`);
	return normalized;
}

function validateLifecycle(contract: BrightDataSnapshotLifecycleContract): void {
	if (!Number.isSafeInteger(contract.timeoutMs) || contract.timeoutMs <= 0)
		throw new Error("BRIGHTDATA_DATASET_TIMEOUT_POLICY_REQUIRED");
	if (!Number.isSafeInteger(contract.pollIntervalMs) || contract.pollIntervalMs <= 0)
		throw new Error("BRIGHTDATA_DATASET_POLL_POLICY_REQUIRED");
	if (!Number.isSafeInteger(contract.cancelTimeoutMs) || contract.cancelTimeoutMs <= 0)
		throw new Error("BRIGHTDATA_DATASET_CANCEL_POLICY_REQUIRED");
	const groups = [
		normalizedStatuses(contract.readyStatuses, "READY"),
		normalizedStatuses(contract.pendingStatuses, "PENDING"),
		normalizedStatuses(contract.terminalFailureStatuses, "TERMINAL"),
	];
	const combined = new Set<string>();
	for (const group of groups) {
		for (const status of group) {
			if (combined.has(status)) throw new Error("BRIGHTDATA_DATASET_STATUS_POLICY_OVERLAP");
			combined.add(status);
		}
	}
}

function requireSnapshotId(value: string): string {
	const snapshotId = value.trim();
	if (!snapshotId) throw new Error("BRIGHTDATA_DATASET_SNAPSHOT_ID_REQUIRED");
	return snapshotId;
}

function defaultSleep(durationMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, durationMs));
}

class SnapshotDeadlineError extends Error {}

async function withinDeadline<T>(
	deadline: number,
	now: () => number,
	operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const remainingMs = deadline - now();
	if (remainingMs <= 0) throw new SnapshotDeadlineError();
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			controller.abort();
			reject(new SnapshotDeadlineError());
		}, remainingMs);
	});
	try {
		return await Promise.race([operation(controller.signal), timeout]);
	} catch (error) {
		if (controller.signal.aborted) throw new SnapshotDeadlineError();
		throw error;
	} finally {
		if (timer) clearTimeout(timer);
	}
}

async function bestEffortCancel(
	transport: BrightDataDatasetTransport,
	snapshotId: string,
	timeoutMs: number,
): Promise<void> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			transport.cancel(snapshotId, controller.signal),
			new Promise<never>((_resolve, reject) => {
				timer = setTimeout(() => {
					controller.abort();
					reject(new SnapshotDeadlineError());
				}, timeoutMs);
			}),
		]);
	} catch {
		// Cancellation is cleanup. The fail-closed collection result remains authoritative.
	} finally {
		if (timer) clearTimeout(timer);
	}
}

export function createBrightDataDatasetClient(options: BrightDataDatasetClientOptions) {
	validateLifecycle(options.lifecycle);
	const ready = normalizedStatuses(options.lifecycle.readyStatuses, "READY");
	const pending = normalizedStatuses(options.lifecycle.pendingStatuses, "PENDING");
	const terminal = normalizedStatuses(options.lifecycle.terminalFailureStatuses, "TERMINAL");
	const now = options.now ?? Date.now;
	const nowIso = options.nowIso ?? (() => new Date().toISOString());
	const sleep = options.sleep ?? defaultSleep;

	async function record(
		prepared: PreparedProviderDatasetCanary,
		snapshotId: string,
		phase: BrightDataSnapshotJournalPhase,
		details: Readonly<{ providerStatus?: string; recordCount?: number }> = {},
	): Promise<void> {
		try {
			await options.journal.record({
				source: prepared.definition.source,
				datasetId: prepared.providerDatasetId,
				snapshotId,
				phase,
				observedAt: nowIso(),
				...details,
			});
		} catch {
			throw new BrightDataDatasetInterruptedError("BRIGHTDATA_DATASET_JOURNAL_FAILED", snapshotId);
		}
	}

	async function preflight(
		prepared: PreparedProviderDatasetCanary,
		transport: BrightDataDatasetTransport,
		deadline: number,
	): Promise<BrightDataDatasetTransportRequest> {
		const request = Object.freeze({
			source: prepared.definition.source,
			datasetId: prepared.providerDatasetId,
			input: prepared.input,
		});
		try {
			await withinDeadline(deadline, now, (signal) => transport.preflight(request, signal));
		} catch (error) {
			if (error instanceof SnapshotDeadlineError) throw new Error("BRIGHTDATA_DATASET_PREFLIGHT_TIMEOUT");
			throw new Error("BRIGHTDATA_DATASET_PREFLIGHT_FAILED");
		}
		return request;
	}

	async function finish(
		prepared: PreparedProviderDatasetCanary,
		transport: BrightDataDatasetTransport,
		snapshotId: string,
		deadline: number,
	): Promise<BrightDataDatasetCollectionResult> {
		while (now() < deadline) {
			let progress: BrightDataSnapshotProgress;
			try {
				progress = await withinDeadline(deadline, now, (signal) => transport.progress(snapshotId, signal));
			} catch (error) {
				if (error instanceof SnapshotDeadlineError) {
					await bestEffortCancel(transport, snapshotId, options.lifecycle.cancelTimeoutMs);
					await record(prepared, snapshotId, "TIMEOUT");
					return Object.freeze({ status: "TIMEOUT" as const, snapshotId });
				}
				await record(prepared, snapshotId, "INTERRUPTED");
				throw new BrightDataDatasetInterruptedError("BRIGHTDATA_DATASET_PROGRESS_FAILED", snapshotId);
			}
			const status = progress.status.trim().toLowerCase();
			if (ready.has(status)) {
				await record(prepared, snapshotId, "READY", { providerStatus: status });
				let rawPayload: unknown;
				try {
					rawPayload = await withinDeadline(deadline, now, (signal) => transport.download(snapshotId, signal));
				} catch (error) {
					if (error instanceof SnapshotDeadlineError) {
						await bestEffortCancel(transport, snapshotId, options.lifecycle.cancelTimeoutMs);
						await record(prepared, snapshotId, "TIMEOUT");
						return Object.freeze({ status: "TIMEOUT" as const, snapshotId });
					}
					await record(prepared, snapshotId, "INTERRUPTED");
					throw new BrightDataDatasetInterruptedError("BRIGHTDATA_DATASET_DOWNLOAD_FAILED", snapshotId);
				}
				if (rawPayload === undefined || rawPayload === null) {
					await record(prepared, snapshotId, "INVALID");
					return Object.freeze({ status: "INVALID" as const, snapshotId, reason: "DOWNLOAD_EMPTY" as const });
				}
				const capture = createProviderDatasetRawCaptureFromLifecycle(prepared, {
					snapshotId,
					capturedAt: nowIso(),
					rawPayload,
				});
				await record(prepared, snapshotId, "DELIVERED", { recordCount: capture.recordCount });
				return Object.freeze({ status: "COMPLETE" as const, snapshotId, capture });
			}
			if (terminal.has(status)) {
				await record(prepared, snapshotId, "TERMINAL_FAILURE", { providerStatus: status });
				return Object.freeze({ status: "TERMINAL_FAILURE" as const, snapshotId, providerStatus: status });
			}
			if (!pending.has(status)) {
				await bestEffortCancel(transport, snapshotId, options.lifecycle.cancelTimeoutMs);
				await record(prepared, snapshotId, "INVALID", { providerStatus: status });
				return Object.freeze({ status: "INVALID" as const, snapshotId, reason: "UNRECOGNIZED_STATUS" as const });
			}
			await record(prepared, snapshotId, "PENDING", { providerStatus: status });
			const remainingMs = deadline - now();
			if (remainingMs <= 0) break;
			await sleep(Math.min(options.lifecycle.pollIntervalMs, remainingMs));
		}

		await bestEffortCancel(transport, snapshotId, options.lifecycle.cancelTimeoutMs);
		await record(prepared, snapshotId, "TIMEOUT");
		return Object.freeze({ status: "TIMEOUT" as const, snapshotId });
	}

	async function collectSynchronous(
		prepared: PreparedProviderDatasetCanary,
		transport: BrightDataDatasetTransport,
	): Promise<BrightDataDatasetCollectionResult> {
		const scrapeTransport = transport.scrape;
		if (!scrapeTransport) throw new Error("BRIGHTDATA_DATASET_SYNC_TRANSPORT_REQUIRED");
		const deadline = now() + options.lifecycle.timeoutMs;
		const request = await preflight(prepared, transport, deadline);
		let scrape: BrightDataSynchronousScrape;
		try {
			scrape = await withinDeadline(deadline, now, (signal) => scrapeTransport(request, signal));
		} catch (error) {
			if (error instanceof SnapshotDeadlineError) throw new Error("BRIGHTDATA_DATASET_SCRAPE_TIMEOUT");
			throw new Error("BRIGHTDATA_DATASET_SCRAPE_FAILED");
		}
		const snapshotId = requireSnapshotId(scrape.snapshotId);
		await record(prepared, snapshotId, "TRIGGERED");
		if (scrape.rawPayload === undefined) return finish(prepared, transport, snapshotId, deadline);
		const capture = createProviderDatasetRawCaptureFromLifecycle(prepared, {
			snapshotId,
			capturedAt: nowIso(),
			rawPayload: scrape.rawPayload,
			...(scrape.rawReference ? { rawReference: scrape.rawReference } : {}),
		});
		await record(prepared, snapshotId, "DELIVERED", { recordCount: capture.recordCount });
		return Object.freeze({ status: "COMPLETE" as const, snapshotId, capture });
	}

	return Object.freeze({
		async collect(prepared: PreparedProviderDatasetCanary): Promise<BrightDataDatasetCollectionResult> {
			consumePreparedProviderDatasetCanary(prepared);
			const transport = options.transport;
			if (!transport) throw new Error("BRIGHTDATA_DATASET_TRANSPORT_REQUIRED");
			const deadline = now() + options.lifecycle.timeoutMs;
			const request = await preflight(prepared, transport, deadline);
			let trigger: BrightDataSnapshotTrigger;
			try {
				// Exactly one collection trigger. A lost response may already represent a billable snapshot.
				trigger = await withinDeadline(deadline, now, (signal) => transport.trigger(request, signal));
			} catch (error) {
				if (error instanceof SnapshotDeadlineError) throw new Error("BRIGHTDATA_DATASET_TRIGGER_TIMEOUT");
				throw new Error("BRIGHTDATA_DATASET_TRIGGER_FAILED");
			}
			const snapshotId = requireSnapshotId(trigger.snapshotId);
			await record(prepared, snapshotId, "TRIGGERED");
			return finish(prepared, transport, snapshotId, deadline);
		},

		async collectSynchronous(prepared: PreparedProviderDatasetCanary): Promise<BrightDataDatasetCollectionResult> {
			consumePreparedProviderDatasetCanary(prepared);
			const transport = options.transport;
			if (!transport) throw new Error("BRIGHTDATA_DATASET_TRANSPORT_REQUIRED");
			return collectSynchronous(prepared, transport);
		},

		async resume(
			prepared: PreparedProviderDatasetCanary,
			resume: Readonly<{ snapshotId: string }>,
		): Promise<BrightDataDatasetCollectionResult> {
			consumePreparedProviderDatasetCanary(prepared);
			const transport = options.transport;
			if (!transport) throw new Error("BRIGHTDATA_DATASET_TRANSPORT_REQUIRED");
			const deadline = now() + options.lifecycle.timeoutMs;
			await preflight(prepared, transport, deadline);
			const snapshotId = requireSnapshotId(resume.snapshotId);
			await record(prepared, snapshotId, "RESUMED");
			return finish(prepared, transport, snapshotId, deadline);
		},
	});
}
