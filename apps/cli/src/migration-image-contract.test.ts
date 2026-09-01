import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("database migration image", () => {
	it("runs the packaged drizzle-kit binary without a package manager wrapper", () => {
		const dockerfile = readFileSync(new URL("../../../docker/Dockerfile", import.meta.url), "utf8");
		const migrateStage = dockerfile.slice(
			dockerfile.indexOf("FROM base AS migrate"),
			dockerfile.indexOf("# Worker stage"),
		);

		expect(migrateStage).toContain('CMD ["./node_modules/.bin/drizzle-kit", "migrate"]');
		expect(migrateStage).not.toMatch(/CMD \["(?:npx|pnpm)"/);
	});
});
