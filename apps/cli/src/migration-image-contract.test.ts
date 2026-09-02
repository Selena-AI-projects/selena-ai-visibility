import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("database migration image", () => {
	it("runs the packaged migration runner without a package manager wrapper", () => {
		const dockerfile = readFileSync(new URL("../../../docker/Dockerfile", import.meta.url), "utf8");
		const migrateStage = dockerfile.slice(
			dockerfile.indexOf("FROM base AS migrate"),
			dockerfile.indexOf("# Worker stage"),
		);

		expect(migrateStage).toContain('CMD ["node", "./scripts/run-bounded-migrations.mjs"]');
		expect(migrateStage).toContain("requires an explicit maximum migration index");
		expect(migrateStage).not.toMatch(/CMD .*\b(?:npx|pnpm|drizzle-kit)\b/);

		const boundedRunner = readFileSync(
			new URL("../../../packages/lib/scripts/run-bounded-migrations.mjs", import.meta.url),
			"utf8",
		);
		expect(boundedRunner).toContain("apply-migrations.mjs");
		expect(boundedRunner).not.toContain("node_modules/.bin/drizzle-kit");

		const migrationRunner = readFileSync(
			new URL("../../../packages/lib/scripts/apply-migrations.mjs", import.meta.url),
			"utf8",
		);
		expect(migrationRunner).toContain("select hash, created_at::text");
		expect(migrationRunner).toContain("SELENA_MIGRATION_JOURNAL_MISMATCH");
	});

	it("pins the generated compose service to the reviewed migration ceiling", () => {
		const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
		expect(source).toContain('"    - SELENA_MIGRATION_MAX_INDEX=55"');
		expect(source).not.toContain('"    - SELENA_MIGRATION_MAX_INDEX=56"');
	});
});
