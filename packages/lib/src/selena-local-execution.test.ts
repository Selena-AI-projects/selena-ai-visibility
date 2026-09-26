import { describe, expect, it, vi } from "vitest";
import {
	executeLocalObservation,
	LOCAL_MEASUREMENT_DOMAIN,
	LOCAL_MEASUREMENT_QUEUE,
	retryLocalObservation,
} from "./selena-local-execution";

const runningCycle = {
	status: "RUNNING",
	emergencyStoppedAt: null,
	createdObservations: 8,
	expectedObservations: 9,
};

const enabled = {
	SELENA_LOCAL_VISIBILITY_ENABLED: "true",
	SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED: "true",
	SELENA_LOCAL_EMERGENCY_STOP: "false",
};

function dependencies() {
	return {
		reserveObservation: vi.fn(
			async (): Promise<{ observationId: string } | null> => ({ observationId: "observation-9" }),
		),
		callProvider: vi.fn(async () => ({ rank: 2 })),
		completeObservation: vi.fn(async () => undefined),
	};
}

describe("Local observation execution guard", () => {
	it("keeps the Local domain on its own queue", () => {
		expect(LOCAL_MEASUREMENT_DOMAIN).toBe("LOCAL_MAPS");
		expect(LOCAL_MEASUREMENT_QUEUE).toBe("selena-local-measure");
		expect(LOCAL_MEASUREMENT_QUEUE).not.toBe("selena-measure");
	});

	it("fails closed when the feature flag is absent", async () => {
		const deps = dependencies();
		await expect(
			executeLocalObservation({ env: {}, cycle: runningCycle, recordIncident: vi.fn(async () => undefined) }, deps),
		).rejects.toThrow("LOCAL_VISIBILITY_DISABLED");
		expect(deps.reserveObservation).not.toHaveBeenCalled();
		expect(deps.callProvider).not.toHaveBeenCalled();
	});

	it("keeps provider execution closed until it is enabled and the emergency stop is released", async () => {
		for (const env of [
			{ SELENA_LOCAL_VISIBILITY_ENABLED: "true" },
			{ ...enabled, SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED: "1" },
			{ ...enabled, SELENA_LOCAL_EMERGENCY_STOP: undefined },
			{ ...enabled, SELENA_LOCAL_EMERGENCY_STOP: "true" },
		]) {
			const deps = dependencies();
			await expect(
				executeLocalObservation({ env, cycle: runningCycle, recordIncident: vi.fn(async () => undefined) }, deps),
			).rejects.toThrow("LOCAL_PROVIDER_EXECUTION_BLOCKED");
			expect(deps.reserveObservation).not.toHaveBeenCalled();
			expect(deps.callProvider).not.toHaveBeenCalled();
		}
	});

	it("records expected plus one before reservation or provider execution", async () => {
		const deps = dependencies();
		const recordIncident = vi.fn(async () => undefined);
		await expect(
			executeLocalObservation(
				{
					env: enabled,
					cycle: { ...runningCycle, createdObservations: 9 },
					recordIncident,
				},
				deps,
			),
		).rejects.toThrow("LOCAL_CARDINALITY_BLOCKED");
		expect(recordIncident).toHaveBeenCalledWith("CARDINALITY_INCIDENT");
		expect(deps.reserveObservation).not.toHaveBeenCalled();
		expect(deps.callProvider).not.toHaveBeenCalled();
	});

	it("blocks emergency-stopped cycles before provider execution", async () => {
		const deps = dependencies();
		const recordIncident = vi.fn(async () => undefined);
		await expect(
			executeLocalObservation(
				{
					env: enabled,
					cycle: { ...runningCycle, emergencyStoppedAt: "2026-08-29T00:00:00.000Z" },
					recordIncident,
				},
				deps,
			),
		).rejects.toThrow("LOCAL_EMERGENCY_STOP");
		expect(recordIncident).toHaveBeenCalledWith("LOCAL_EMERGENCY_STOP");
		expect(deps.callProvider).not.toHaveBeenCalled();
	});

	it("requires a committed reservation before the provider call", async () => {
		const order: string[] = [];
		const result = await executeLocalObservation(
			{ env: enabled, cycle: runningCycle, recordIncident: vi.fn(async () => undefined) },
			{
				reserveObservation: async () => {
					order.push("reserve");
					return { observationId: "observation-9" };
				},
				callProvider: async (observationId) => {
					order.push(`provider:${observationId}`);
					return { rank: 2 };
				},
				completeObservation: async (observationId) => {
					order.push(`complete:${observationId}`);
				},
			},
		);
		expect(result).toEqual({ rank: 2 });
		expect(order).toEqual(["reserve", "provider:observation-9", "complete:observation-9"]);
	});

	it("does not call the provider when the database refuses the reservation", async () => {
		const deps = dependencies();
		deps.reserveObservation.mockResolvedValueOnce(null);
		await expect(
			executeLocalObservation(
				{ env: enabled, cycle: runningCycle, recordIncident: vi.fn(async () => undefined) },
				deps,
			),
		).rejects.toThrow("LOCAL_OBSERVATION_RESERVATION_BLOCKED");
		expect(deps.callProvider).not.toHaveBeenCalled();
	});

	it("retries one invalid row without reserving or increasing expected cardinality", async () => {
		const deps = {
			prepareRetry: vi.fn(async () => true),
			callProvider: vi.fn(async () => ({ rank: 1 })),
			completeObservation: vi.fn(async () => undefined),
		};
		await retryLocalObservation(
			{
				env: enabled,
				cycle: { ...runningCycle, createdObservations: 9 },
				recordIncident: vi.fn(async () => undefined),
			},
			{ id: "invalid-point", validity: "INVALID" },
			deps,
		);
		expect(deps.prepareRetry).toHaveBeenCalledWith("invalid-point");
		expect(deps.callProvider).toHaveBeenCalledTimes(1);
	});

	it("never retries a valid row", async () => {
		const deps = {
			prepareRetry: vi.fn(async () => true),
			callProvider: vi.fn(async () => ({ rank: 1 })),
			completeObservation: vi.fn(async () => undefined),
		};
		await expect(
			retryLocalObservation(
				{ env: enabled, cycle: runningCycle, recordIncident: vi.fn(async () => undefined) },
				{ id: "valid-point", validity: "VALID" },
				deps,
			),
		).rejects.toThrow("LOCAL_RETRY_VALID_OBSERVATION");
		expect(deps.prepareRetry).not.toHaveBeenCalled();
		expect(deps.callProvider).not.toHaveBeenCalled();
	});
});
