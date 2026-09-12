import { describe, expect, it } from "vitest";
import { localReadyResponse } from "./index";

describe("localReadyResponse", () => {
	it("returns a successful readiness response without touching the database", async () => {
		const response = localReadyResponse();
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ status: "ok" });
	});
});
