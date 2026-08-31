import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { getProvider } from "./index";
import { stub } from "./registry/stub";

describe("provider registry execution gate", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("blocks run before the provider transport when measurement is disabled", async () => {
		const transport = vi.spyOn(stub, "run");

		await expect(getProvider("stub").run("stub", "fixture")).rejects.toThrow("LEGACY_PROVIDER_EXECUTION_DISABLED");
		expect(transport).not.toHaveBeenCalled();
	});

	it("blocks runStructuredResearch before transport when the emergency stop is engaged", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "true");
		const transport = vi.spyOn(stub, "runStructuredResearch");
		const provider = getProvider("stub");

		await expect(
			provider.runStructuredResearch?.({ prompt: "fixture", schema: z.object({ brandName: z.string() }) }),
		).rejects.toThrow("LEGACY_PROVIDER_EXECUTION_DISABLED");
		expect(transport).not.toHaveBeenCalled();
	});

	it("preserves both provider methods when execution is explicitly enabled", async () => {
		vi.stubEnv("SELENA_MEASUREMENT_ENABLED", "true");
		vi.stubEnv("SELENA_EMERGENCY_STOP", "false");
		const provider = getProvider("stub");

		expect(await provider.run("stub", "fixture")).toMatchObject({ modelVersion: "stub" });
		await expect(
			provider.runStructuredResearch?.({ prompt: "fixture", schema: z.object({ brandName: z.string() }) }),
		).resolves.toMatchObject({ object: { brandName: "Stub Brand" } });
	});
});
