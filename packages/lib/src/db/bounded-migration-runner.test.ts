import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { waitForMigrationChild } from "./bounded-migration-process";

const temporaryDirectories: string[] = [];
const runner = fileURLToPath(new URL("../../scripts/run-bounded-migrations.mjs", import.meta.url));

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("bounded migration runner", () => {
	it("keeps the disposable scheduling replay aligned with the source journal frontier", () => {
		const journal = JSON.parse(
			readFileSync(fileURLToPath(new URL("./migrations/meta/_journal.json", import.meta.url)), "utf8"),
		);
		const workflow = readFileSync(
			fileURLToPath(new URL("../../../../.github/workflows/e2e.yaml", import.meta.url)),
			"utf8",
		);
		const sourceFrontier = journal.entries.at(-1)?.idx;

		expect(Number.isSafeInteger(sourceFrontier)).toBe(true);
		expect(workflow).toContain(`SELENA_MIGRATION_MAX_INDEX: "${sourceFrontier}"`);
	});

	it("builds an exact Drizzle bundle through the reviewed journal reconciliation", () => {
		const targetDirectory = mkdtempSync(resolve(tmpdir(), "selena-bounded-migrations-"));
		temporaryDirectories.push(targetDirectory);
		const result = spawnSync(process.execPath, [runner, "--prepare-only"], {
			env: {
				...process.env,
				SELENA_MIGRATION_MAX_INDEX: "58",
				SELENA_BOUNDED_MIGRATIONS_DIR: targetDirectory,
			},
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		const journal = JSON.parse(readFileSync(resolve(targetDirectory, "meta/_journal.json"), "utf8"));
		expect(journal.entries.at(-1)).toMatchObject({ idx: 58, tag: "0058_journal_provider_boundary_recovery" });
		expect(readdirSync(targetDirectory)).toContain("0058_journal_provider_boundary_recovery.sql");
		expect(readdirSync(targetDirectory)).not.toContain("0058_placeholder.sql");
	});

	it("fails before invoking drizzle-kit when no maximum is configured", () => {
		const result = spawnSync(process.execPath, [runner, "--prepare-only"], {
			env: { PATH: process.env.PATH },
			encoding: "utf8",
		});

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("SELENA_MIGRATION_MAX_INDEX_REQUIRED");
	});

	it("refuses a recursive target outside the operating-system temporary directory", () => {
		const result = spawnSync(process.execPath, [runner, "--prepare-only"], {
			env: {
				...process.env,
				SELENA_MIGRATION_MAX_INDEX: "56",
				SELENA_BOUNDED_MIGRATIONS_DIR: "/",
			},
			encoding: "utf8",
		});

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("SELENA_BOUNDED_MIGRATIONS_DIR_UNSAFE");
	});

	it("returns a failure when a timed-out child handles SIGTERM with exit zero", async () => {
		const child = spawn(
			process.execPath,
			[
				"-e",
				"process.on('SIGTERM', () => process.exit(0)); process.stdout.write('ready'); setInterval(() => {}, 1000)",
			],
			{ stdio: ["ignore", "pipe", "ignore"] },
		);
		if (!child.stdout) throw new Error("TEST_CHILD_STDOUT_REQUIRED");
		await once(child.stdout, "data");

		const result = await waitForMigrationChild(child, { hardTimeoutMs: 20, killGraceMs: 100 });

		expect(result).toEqual({ childCode: 0, code: 1, timedOut: true });
	});
});
