import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("database migration image", () => {
	it("runs the packaged drizzle-kit binary without a package manager wrapper", () => {
		const dockerfile = readFileSync(new URL("../../../docker/Dockerfile", import.meta.url), "utf8");
		const migrateStage = dockerfile.slice(
			dockerfile.indexOf("FROM base AS migrate"),
			dockerfile.indexOf("# Worker stage"),
		);

		expect(migrateStage).toContain('CMD ["node", "./scripts/run-bounded-migrations.mjs"]');
		expect(migrateStage).toContain("requires an explicit maximum migration index");
		expect(migrateStage).not.toMatch(/CMD \["(?:npx|pnpm)"/);
	});

	it("pins the generated compose service to the reviewed migration ceiling", () => {
		const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
		expect(source).toContain('"    - SELENA_MIGRATION_MAX_INDEX=52"');
	});
});
