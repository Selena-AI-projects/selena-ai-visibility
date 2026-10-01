import assert from "node:assert/strict";
import { test } from "node:test";
import type { Job } from "pg-boss";

test("the production measure handler cannot be configured into running the stub adapter", async () => {
	Object.assign(process.env, {
		// Nothing listens here: reaching storage would fail differently.
		DATABASE_URL: process.env.DATABASE_URL ?? "postgres://nobody@127.0.0.1:1/unreachable",
		SELENA_MEASUREMENT_ENABLED: "true",
		SELENA_MEASUREMENT_ADAPTER: "stub",
		SCHEDULE_MAINTENANCE_ENABLED: "false",
		SELENA_E2E_STUB_ADAPTER: "1",
	});
	const { selenaMeasureJob } = await import("./selena-measure.js");
	const job = { id: "job-1", data: { permitId: "permit-1", organizationId: "org-1" } } as Job<{
		permitId: string;
		organizationId: string;
	}>;

	await assert.rejects(selenaMeasureJob([job]), /SELENA_ADAPTER_NOT_REGISTERED/);
});
