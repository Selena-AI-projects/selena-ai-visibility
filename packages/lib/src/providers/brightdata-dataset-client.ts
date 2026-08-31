import type { PreparedProviderDatasetCanary, ProviderDatasetRawCapture } from "./dataset-registry";
import {
	consumePreparedProviderDatasetCanary,
	createProviderDatasetRawCaptureFromLifecycle,
} from "./provider-dataset-authority";

export type BrightDataSnapshotProgress = Readonly<{ status: string }>;
export type BrightDataSnapshotTrigger = Readonly<{ snapshotId: string }>;

export type BrightDataDatasetTransport = Readonly<{
	trigger(
		request: Readonly<{ datasetId: string; input: PreparedProviderDatasetCanary["input"] }>,
		signal: AbortSignal,
	): Promise<BrightDataSnapshotTrigger>;
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

export type BrightDataDatasetCollectionResult =
	| Readonly<{ status: "COMPLETE"; snapshotId: string; capture: ProviderDatasetRawCapture }>
	| Readonly<{ status: "TIMEOUT"; snapshotId: string }>
	| Readonly<{ status: "TERMINAL_FAILURE"; snapshotId: string; providerStatus: string }>
	| Readonly<{ status: "INVALID"; snapshotId: string; reason: "UNRECOGNIZED_STATUS" | "DOWNLOAD_EMPTY" }>;

export type BrightDataDatasetClientOptions = Readonly<{
	transport?: BrightDataDatasetTransport;
	lifecycle: BrightDataSnapshotLifecycleContract;
	now?: () => number;
	nowIso?: () => string;
	sleep?: (durationMs: number) => Promise<void>;
}>;

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

	return Object.freeze({
		async collect(prepared: PreparedProviderDatasetCanary): Promise<BrightDataDatasetCollectionResult> {
			consumePreparedProviderDatasetCanary(prepared);
			const transport = options.transport;
			if (!transport) throw new Error("BRIGHTDATA_DATASET_TRANSPORT_REQUIRED");
			const startedAt = now();
			const deadline = startedAt + options.lifecycle.timeoutMs;
			let trigger: BrightDataSnapshotTrigger;
			try {
				// Exactly one collection trigger. Retry authority belongs to the attempt ledger.
				trigger = await withinDeadline(deadline, now, (signal) =>
					transport.trigger({ datasetId: prepared.providerDatasetId, input: prepared.input }, signal),
				);
			} catch (error) {
				if (error instanceof SnapshotDeadlineError) throw new Error("BRIGHTDATA_DATASET_TRIGGER_TIMEOUT");
				throw new Error("BRIGHTDATA_DATASET_TRIGGER_FAILED");
			}
			const snapshotId = requireSnapshotId(trigger.snapshotId);

			while (now() < deadline) {
				let progress: BrightDataSnapshotProgress;
				try {
					progress = await withinDeadline(deadline, now, (signal) => transport.progress(snapshotId, signal));
				} catch (error) {
					await bestEffortCancel(transport, snapshotId, options.lifecycle.cancelTimeoutMs);
					if (error instanceof SnapshotDeadlineError) return Object.freeze({ status: "TIMEOUT" as const, snapshotId });
					throw new Error("BRIGHTDATA_DATASET_PROGRESS_FAILED");
				}
				const status = progress.status.trim().toLowerCase();
				if (ready.has(status)) {
					let rawPayload: unknown;
					try {
						rawPayload = await withinDeadline(deadline, now, (signal) => transport.download(snapshotId, signal));
					} catch (error) {
						if (error instanceof SnapshotDeadlineError) {
							await bestEffortCancel(transport, snapshotId, options.lifecycle.cancelTimeoutMs);
							return Object.freeze({ status: "TIMEOUT" as const, snapshotId });
						}
						throw new Error("BRIGHTDATA_DATASET_DOWNLOAD_FAILED");
					}
					if (rawPayload === undefined || rawPayload === null)
						return Object.freeze({ status: "INVALID" as const, snapshotId, reason: "DOWNLOAD_EMPTY" as const });
					return Object.freeze({
						status: "COMPLETE" as const,
						snapshotId,
						capture: createProviderDatasetRawCaptureFromLifecycle(prepared, {
							snapshotId,
							capturedAt: nowIso(),
							rawPayload,
						}),
					});
				}
				if (terminal.has(status))
					return Object.freeze({ status: "TERMINAL_FAILURE" as const, snapshotId, providerStatus: status });
				if (!pending.has(status)) {
					await bestEffortCancel(transport, snapshotId, options.lifecycle.cancelTimeoutMs);
					return Object.freeze({ status: "INVALID" as const, snapshotId, reason: "UNRECOGNIZED_STATUS" as const });
				}
				const remainingMs = deadline - now();
				if (remainingMs <= 0) break;
				await sleep(Math.min(options.lifecycle.pollIntervalMs, remainingMs));
			}

			await bestEffortCancel(transport, snapshotId, options.lifecycle.cancelTimeoutMs);
			return Object.freeze({ status: "TIMEOUT" as const, snapshotId });
		},
	});
}
