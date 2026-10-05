import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/lib/db/db", () => ({ db: {} }));

import { setupStatusResponse } from "./index";

const SHA = "7abeb6f5f1d71fde463fa0e863184711d9224125";

describe("setupStatusResponse", () => {
	it("reports a reachable database together with the serving commit", async () => {
		const response = await setupStatusResponse(async () => undefined, { RAILWAY_GIT_COMMIT_SHA: SHA });
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ready: true, commit: "7abeb6f5f1d7" });
	});

	it("still answers, as not ready, when the database probe fails", async () => {
		const response = await setupStatusResponse(
			async () => {
				throw new Error("connection refused");
			},
			{ RAILWAY_GIT_COMMIT_SHA: SHA },
		);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ready: false, commit: "7abeb6f5f1d7" });
	});

	it("reports no commit where the platform does not say which one is serving", async () => {
		await expect(setupStatusResponse(async () => undefined, {}).then((r) => r.json())).resolves.toEqual({
			ready: true,
			commit: null,
		});
		await expect(
			setupStatusResponse(async () => undefined, { RAILWAY_GIT_COMMIT_SHA: "  " }).then((r) => r.json()),
		).resolves.toEqual({ ready: true, commit: null });
	});
});
