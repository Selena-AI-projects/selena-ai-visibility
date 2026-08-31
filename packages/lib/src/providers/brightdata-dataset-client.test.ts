import { describe, expect, it, vi } from "vitest";
import {
	type BrightDataDatasetTransport,
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

function transportWith(overrides: Partial<BrightDataDatasetTransport> = {}): BrightDataDatasetTransport {
	return {
		trigger: vi.fn(async () => ({ snapshotId: "snapshot-1" })),
		progress: vi.fn(async () => ({ status: "ready" })),
		download: vi.fn(async () => [{ observed: true }]),
		cancel: vi.fn(async () => undefined),
		...overrides,
	};
}

describe("Bright Data dataset lifecycle client", () => {
	it("cannot use ambient network when no transport is injected", async () => {
		const client = createBrightDataDatasetClient({ lifecycle });
		await expect(client.collect(preparedCanary())).rejects.toThrow("BRIGHTDATA_DATASET_TRANSPORT_REQUIRED");
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
		const client = createBrightDataDatasetClient({
			transport: transportWith({ trigger }),
			lifecycle: { ...lifecycle, triggerTimeoutMs: 5 },
		});

		await expect(client.collect(preparedCanary())).rejects.toThrow("BRIGHTDATA_DATASET_TRIGGER_TIMEOUT");
		expect(trigger).toHaveBeenCalledTimes(1);
		expect(triggerSignal?.aborted).toBe(true);
	});

	it("triggers once, polls progress and downloads a ready snapshot", async () => {
		const statuses = ["pending", "running", "ready"];
		let currentTime = 0;
		const transport = transportWith({ progress: vi.fn(async () => ({ status: statuses.shift() ?? "ready" })) });
		const client = createBrightDataDatasetClient({
			transport,
			lifecycle,
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
		expect(transport.trigger).toHaveBeenCalledTimes(1);
		expect(transport.progress).toHaveBeenCalledTimes(3);
		expect(transport.download).toHaveBeenCalledTimes(1);
		expect(transport.cancel).not.toHaveBeenCalled();
	});

	it("rejects a structurally forged request before transport", async () => {
		const transport = transportWith();
		const client = createBrightDataDatasetClient({ transport, lifecycle });
		const forged = { ...preparedCanary() };
		await expect(client.collect(forged)).rejects.toThrow("PROVIDER_DATASET_CANARY_PREPARATION_REQUIRED");
		expect(transport.trigger).not.toHaveBeenCalled();
	});

	it("consumes each prepared canary exactly once", async () => {
		const transport = transportWith();
		const client = createBrightDataDatasetClient({ transport, lifecycle });
		const prepared = preparedCanary();

		await expect(client.collect(prepared)).resolves.toMatchObject({ status: "COMPLETE" });
		await expect(client.collect(prepared)).rejects.toThrow("PROVIDER_DATASET_CANARY_ALREADY_CONSUMED");
		expect(transport.trigger).toHaveBeenCalledTimes(1);
	});

	it("rejects status groups that normalize to empty strings", () => {
		expect(() => createBrightDataDatasetClient({ lifecycle: { ...lifecycle, readyStatuses: ["   "] } })).toThrow(
			"BRIGHTDATA_DATASET_READY_STATUSES_REQUIRED",
		);
	});

	it("times out without retriggering and performs best-effort cancellation", async () => {
		let currentTime = 0;
		const cancel = vi.fn(async () => {
			throw new Error("cleanup unavailable");
		});
		const transport = transportWith({ progress: vi.fn(async () => ({ status: "pending" })), cancel });
		const client = createBrightDataDatasetClient({
			transport,
			lifecycle: { ...lifecycle, timeoutMs: 200 },
			now: () => currentTime,
			sleep: async (durationMs) => {
				currentTime += durationMs;
			},
		});

		await expect(client.collect(preparedCanary())).resolves.toEqual({ status: "TIMEOUT", snapshotId: "snapshot-1" });
		expect(transport.trigger).toHaveBeenCalledTimes(1);
		expect(transport.progress).toHaveBeenCalledTimes(2);
		expect(transport.download).not.toHaveBeenCalled();
		expect(cancel).toHaveBeenCalledTimes(1);
	});

	it("bounds best-effort cancellation when the transport only reacts to abort", async () => {
		let currentTime = 0;
		let cancelSignal: AbortSignal | undefined;
		const cancel = vi.fn(
			(_snapshotId: string, signal: AbortSignal) =>
				new Promise<never>((_resolve, reject) => {
					cancelSignal = signal;
					signal.addEventListener("abort", () => reject(new Error("aborted")));
				}),
		);
		const client = createBrightDataDatasetClient({
			transport: transportWith({ progress: vi.fn(async () => ({ status: "pending" })), cancel }),
			lifecycle: { ...lifecycle, timeoutMs: 1, cancelTimeoutMs: 5 },
			now: () => currentTime,
			sleep: async (durationMs) => {
				currentTime += durationMs;
			},
		});

		await expect(client.collect(preparedCanary())).resolves.toEqual({ status: "TIMEOUT", snapshotId: "snapshot-1" });
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(cancelSignal?.aborted).toBe(true);
	});

	it("fails closed on unknown status and never invents a result", async () => {
		const transport = transportWith({ progress: vi.fn(async () => ({ status: "new-provider-state" })) });
		const client = createBrightDataDatasetClient({ transport, lifecycle });

		await expect(client.collect(preparedCanary())).resolves.toEqual({
			status: "INVALID",
			snapshotId: "snapshot-1",
			reason: "UNRECOGNIZED_STATUS",
		});
		expect(transport.trigger).toHaveBeenCalledTimes(1);
		expect(transport.download).not.toHaveBeenCalled();
		expect(transport.cancel).toHaveBeenCalledTimes(1);
	});

	it("does not internally retry a failed trigger or progress request", async () => {
		const trigger = vi.fn(async () => {
			throw new Error("secret-bearing provider detail");
		});
		const triggerFailure = transportWith({ trigger });
		await expect(
			createBrightDataDatasetClient({ transport: triggerFailure, lifecycle }).collect(preparedCanary()),
		).rejects.toThrow("BRIGHTDATA_DATASET_TRIGGER_FAILED");
		expect(trigger).toHaveBeenCalledTimes(1);

		const progress = vi.fn(async () => {
			throw new Error("transient");
		});
		const progressFailure = transportWith({ progress });
		await expect(
			createBrightDataDatasetClient({ transport: progressFailure, lifecycle }).collect(preparedCanary()),
		).rejects.toThrow("BRIGHTDATA_DATASET_PROGRESS_FAILED");
		expect(progressFailure.trigger).toHaveBeenCalledTimes(1);
		expect(progress).toHaveBeenCalledTimes(1);
		expect(progressFailure.cancel).toHaveBeenCalledTimes(1);
	});
});
