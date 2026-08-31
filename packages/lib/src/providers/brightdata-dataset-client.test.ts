import { describe, expect, it, vi } from "vitest";
import {
	BrightDataDatasetInterruptedError,
	type BrightDataDatasetTransport,
	type BrightDataSnapshotJournalEntry,
	type BrightDataSnapshotLifecycleContract,
	createBrightDataDatasetClient,
} from "./brightdata-dataset-client";
import { type ProviderDatasetAccessRequest, prepareProviderDatasetCanary } from "./dataset-registry";

const access: ProviderDatasetAccessRequest = {
	mode: "CANARY",
	environment: "ISOLATED_CANARY",
	ownerApproved: true,
	schemaDiscoveryOnly: true,
	providerCalls: 1,
	recurring: false,
	worstCaseCostUsd: 0.01,
	approvedCostCapUsd: 0.01,
	redactionPolicyApproved: true,
};

function preparedCanary() {
	return prepareProviderDatasetCanary(
		"GOOGLE_SERP",
		access,
		{ SELENA_BRIGHTDATA_DATASET_GOOGLE_SERP: "gd_fixture123" },
		{ query: "restaurant in Ubud" },
	);
}

const lifecycle: BrightDataSnapshotLifecycleContract = {
	timeoutMs: 1_000,
	pollIntervalMs: 100,
	cancelTimeoutMs: 100,
	readyStatuses: ["ready"],
	pendingStatuses: ["pending", "running"],
	terminalFailureStatuses: ["failed", "cancelled"],
};

function createJournal() {
	const entries: BrightDataSnapshotJournalEntry[] = [];
	return {
		entries,
		journal: { record: vi.fn(async (entry: BrightDataSnapshotJournalEntry) => void entries.push(entry)) },
	};
}

function transportWith(overrides: Partial<BrightDataDatasetTransport> = {}): BrightDataDatasetTransport {
	return {
		preflight: vi.fn(async () => undefined),
		trigger: vi.fn(async () => ({ snapshotId: "snapshot-1" })),
		progress: vi.fn(async () => ({ status: "ready" })),
		download: vi.fn(async () => [{ observed: true }]),
		cancel: vi.fn(async () => undefined),
		...overrides,
	};
}

describe("Bright Data dataset lifecycle client", () => {
	it("cannot use ambient network when no transport is injected", async () => {
		const state = createJournal();
		const client = createBrightDataDatasetClient({ lifecycle, journal: state.journal });
		await expect(client.collect(preparedCanary())).rejects.toThrow("BRIGHTDATA_DATASET_TRANSPORT_REQUIRED");
	});

	it("preflights before the single trigger and journals the snapshot before polling", async () => {
		const state = createJournal();
		const order: string[] = [];
		const transport = transportWith({
			preflight: vi.fn(async () => void order.push("preflight")),
			trigger: vi.fn(async () => {
				order.push("trigger");
				return { snapshotId: "snapshot-1" };
			}),
			progress: vi.fn(async () => {
				order.push("progress");
				expect(state.entries[0]?.phase).toBe("TRIGGERED");
				return { status: "ready" };
			}),
		});
		const client = createBrightDataDatasetClient({ transport, lifecycle, journal: state.journal });

		await expect(client.collect(preparedCanary())).resolves.toMatchObject({ status: "COMPLETE" });
		expect(order).toEqual(["preflight", "trigger", "progress"]);
		expect(transport.trigger).toHaveBeenCalledTimes(1);
		expect(state.entries.map((entry) => entry.phase)).toEqual(["TRIGGERED", "READY", "DELIVERED"]);
	});

	it("aborts a trigger that exceeds the collection deadline", async () => {
		let triggerSignal: AbortSignal | undefined;
		const trigger = vi.fn(
			(_request: Parameters<BrightDataDatasetTransport["trigger"]>[0], signal: AbortSignal) =>
				new Promise<never>((_resolve, reject) => {
					triggerSignal = signal;
					signal.addEventListener("abort", () => reject(new Error("aborted")));
				}),
		);
		const state = createJournal();
		const client = createBrightDataDatasetClient({
			transport: transportWith({ trigger }),
			lifecycle: { ...lifecycle, timeoutMs: 5 },
			journal: state.journal,
		});

		await expect(client.collect(preparedCanary())).rejects.toThrow("BRIGHTDATA_DATASET_TRIGGER_TIMEOUT");
		expect(trigger).toHaveBeenCalledTimes(1);
		expect(triggerSignal?.aborted).toBe(true);
	});

	it("polls progress and returns an immutable raw capture", async () => {
		const statuses = ["pending", "running", "ready"];
		let currentTime = 0;
		const state = createJournal();
		const transport = transportWith({ progress: vi.fn(async () => ({ status: statuses.shift() ?? "ready" })) });
		const client = createBrightDataDatasetClient({
			transport,
			lifecycle,
			journal: state.journal,
			now: () => currentTime,
			nowIso: () => "2026-08-31T01:00:00.000Z",
			sleep: async (durationMs) => {
				currentTime += durationMs;
			},
		});

		const result = await client.collect(preparedCanary());
		expect(result).toEqual({
			status: "COMPLETE",
			snapshotId: "snapshot-1",
			capture: {
				environment: "ISOLATED_CANARY",
				source: "GOOGLE_SERP",
				providerDatasetId: "gd_fixture123",
				capturedAt: "2026-08-31T01:00:00.000Z",
				rawReference: "brightdata:snapshot:snapshot-1",
				rawPayload: [{ observed: true }],
				recordCount: 1,
			},
		});
		if (result.status !== "COMPLETE") throw new Error("expected complete fixture");
		expect(Object.isFrozen(result.capture.rawPayload)).toBe(true);
		expect(transport.progress).toHaveBeenCalledTimes(3);
		expect(state.entries.map((entry) => entry.phase)).toEqual([
			"TRIGGERED",
			"PENDING",
			"PENDING",
			"READY",
			"DELIVERED",
		]);
	});

	it("rejects a structurally forged request before transport", async () => {
		const state = createJournal();
		const transport = transportWith();
		const client = createBrightDataDatasetClient({ transport, lifecycle, journal: state.journal });
		await expect(client.collect({ ...preparedCanary() })).rejects.toThrow(
			"PROVIDER_DATASET_CANARY_PREPARATION_REQUIRED",
		);
		expect(transport.preflight).not.toHaveBeenCalled();
	});

	it("consumes each prepared canary exactly once", async () => {
		const state = createJournal();
		const transport = transportWith();
		const client = createBrightDataDatasetClient({ transport, lifecycle, journal: state.journal });
		const prepared = preparedCanary();

		await expect(client.collect(prepared)).resolves.toMatchObject({ status: "COMPLETE" });
		await expect(client.collect(prepared)).rejects.toThrow("PROVIDER_DATASET_CANARY_ALREADY_CONSUMED");
		expect(transport.trigger).toHaveBeenCalledTimes(1);
	});

	it("resumes a durable snapshot without retriggering", async () => {
		const state = createJournal();
		const transport = transportWith();
		const client = createBrightDataDatasetClient({ transport, lifecycle, journal: state.journal });

		await expect(client.resume(preparedCanary(), { snapshotId: "snapshot-existing" })).resolves.toMatchObject({
			status: "COMPLETE",
			snapshotId: "snapshot-existing",
		});
		expect(transport.trigger).not.toHaveBeenCalled();
		expect(state.entries.map((entry) => entry.phase)).toEqual(["RESUMED", "READY", "DELIVERED"]);
	});

	it("does not poll when durable snapshot journaling fails", async () => {
		const transport = transportWith();
		const client = createBrightDataDatasetClient({
			transport,
			lifecycle,
			journal: { record: vi.fn(async () => Promise.reject(new Error("storage unavailable"))) },
		});

		await expect(client.collect(preparedCanary())).rejects.toMatchObject({
			message: "BRIGHTDATA_DATASET_JOURNAL_FAILED",
			snapshotId: "snapshot-1",
		});
		expect(transport.progress).not.toHaveBeenCalled();
	});

	it("times out without retriggering and performs best-effort cancellation", async () => {
		let currentTime = 0;
		const state = createJournal();
		const cancel = vi.fn(async () => Promise.reject(new Error("cleanup unavailable")));
		const transport = transportWith({ progress: vi.fn(async () => ({ status: "pending" })), cancel });
		const client = createBrightDataDatasetClient({
			transport,
			lifecycle: { ...lifecycle, timeoutMs: 200 },
			journal: state.journal,
			now: () => currentTime,
			sleep: async (durationMs) => {
				currentTime += durationMs;
			},
		});

		await expect(client.collect(preparedCanary())).resolves.toEqual({ status: "TIMEOUT", snapshotId: "snapshot-1" });
		expect(transport.trigger).toHaveBeenCalledTimes(1);
		expect(transport.download).not.toHaveBeenCalled();
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(state.entries.at(-1)?.phase).toBe("TIMEOUT");
	});

	it("fails closed on an unknown status", async () => {
		const state = createJournal();
		const transport = transportWith({ progress: vi.fn(async () => ({ status: "new-provider-state" })) });
		const client = createBrightDataDatasetClient({ transport, lifecycle, journal: state.journal });

		await expect(client.collect(preparedCanary())).resolves.toEqual({
			status: "INVALID",
			snapshotId: "snapshot-1",
			reason: "UNRECOGNIZED_STATUS",
		});
		expect(transport.download).not.toHaveBeenCalled();
		expect(transport.cancel).toHaveBeenCalledTimes(1);
	});

	it("never retries trigger and preserves snapshot authority across a transient progress failure", async () => {
		const trigger = vi.fn(async () => Promise.reject(new Error("secret-bearing provider detail")));
		const triggerState = createJournal();
		const triggerFailure = transportWith({ trigger });
		await expect(
			createBrightDataDatasetClient({ transport: triggerFailure, lifecycle, journal: triggerState.journal }).collect(
				preparedCanary(),
			),
		).rejects.toThrow("BRIGHTDATA_DATASET_TRIGGER_FAILED");
		expect(trigger).toHaveBeenCalledTimes(1);

		const progress = vi.fn(async () => Promise.reject(new Error("transient")));
		const progressState = createJournal();
		const progressFailure = transportWith({ progress });
		let failure: unknown;
		try {
			await createBrightDataDatasetClient({
				transport: progressFailure,
				lifecycle,
				journal: progressState.journal,
			}).collect(preparedCanary());
		} catch (error) {
			failure = error;
		}
		expect(failure).toBeInstanceOf(BrightDataDatasetInterruptedError);
		expect(failure).toMatchObject({ message: "BRIGHTDATA_DATASET_PROGRESS_FAILED", snapshotId: "snapshot-1" });
		expect(progressFailure.trigger).toHaveBeenCalledTimes(1);
		expect(progress).toHaveBeenCalledTimes(1);
		expect(progressFailure.cancel).not.toHaveBeenCalled();
		expect(progressState.entries.at(-1)?.phase).toBe("INTERRUPTED");
	});
});
