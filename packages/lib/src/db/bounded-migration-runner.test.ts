import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];
const runner = fileURLToPath(new URL("../../scripts/run-bounded-migrations.mjs", import.meta.url));

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("bounded migration runner", () => {
	it("builds an exact Drizzle bundle through 0051 and excludes 0052", () => {
		const targetDirectory = mkdtempSync(resolve(tmpdir(), "selena-bounded-migrations-"));
		temporaryDirectories.push(targetDirectory);
		const result = spawnSync(process.execPath, [runner, "--prepare-only"], {
			env: {
				...process.env,
				SELENA_MIGRATION_MAX_INDEX: "51",
				SELENA_BOUNDED_MIGRATIONS_DIR: targetDirectory,
			},
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		const journal = JSON.parse(readFileSync(resolve(targetDirectory, "meta/_journal.json"), "utf8"));
		expect(journal.entries.at(-1)).toMatchObject({ idx: 51, tag: "0051_visibility_os_provider_evidence_provenance" });
		expect(readdirSync(targetDirectory)).toContain("0051_visibility_os_provider_evidence_provenance.sql");
		expect(readdirSync(targetDirectory)).not.toContain("0052_provider_dataset_snapshot_journal.sql");
	});

	it("fails before invoking drizzle-kit when no maximum is configured", () => {
		const result = spawnSync(process.execPath, [runner, "--prepare-only"], {
			env: { PATH: process.env.PATH },
			encoding: "utf8",
		});

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("SELENA_MIGRATION_MAX_INDEX_REQUIRED");
	});
});
