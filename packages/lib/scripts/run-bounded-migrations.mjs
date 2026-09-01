import { spawn } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { waitForMigrationChild } from "../src/db/bounded-migration-process.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = resolve(packageRoot, "src/db/migrations");

function assertSafeTargetDirectory(targetDirectory) {
	const absoluteTarget = resolve(targetDirectory);
	const temporaryRoot = resolve(tmpdir());
	const relativeTarget = relative(temporaryRoot, absoluteTarget);
	if (
		!relativeTarget ||
		isAbsolute(relativeTarget) ||
		relativeTarget.startsWith("..") ||
		!relativeTarget.split("/").at(-1)?.startsWith("selena-")
	)
		throw new Error("SELENA_BOUNDED_MIGRATIONS_DIR_UNSAFE");
}

export function prepareBoundedMigrations({ maximumIndex, targetDirectory }) {
	if (!Number.isSafeInteger(maximumIndex) || maximumIndex < 0) throw new Error("SELENA_MIGRATION_MAX_INDEX_INVALID");
	assertSafeTargetDirectory(targetDirectory);
	const journal = JSON.parse(readFileSync(resolve(sourceDirectory, "meta/_journal.json"), "utf8"));
	if (!Array.isArray(journal.entries)) throw new Error("SELENA_MIGRATION_JOURNAL_INVALID");
	const entries = journal.entries.filter((entry) => Number.isSafeInteger(entry.idx) && entry.idx <= maximumIndex);
	if (entries.at(-1)?.idx !== maximumIndex) throw new Error("SELENA_MIGRATION_MAX_INDEX_NOT_FOUND");
	rmSync(targetDirectory, { recursive: true, force: true });
	mkdirSync(resolve(targetDirectory, "meta"), { recursive: true });
	for (const entry of entries)
		cpSync(resolve(sourceDirectory, `${entry.tag}.sql`), resolve(targetDirectory, `${entry.tag}.sql`));
	writeFileSync(
		resolve(targetDirectory, "meta/_journal.json"),
		`${JSON.stringify({ ...journal, entries }, null, 2)}\n`,
	);
	return Object.freeze({ targetDirectory, migrationCount: entries.length, maximumIndex });
}

async function main() {
	const configuredMaximum = process.env.SELENA_MIGRATION_MAX_INDEX;
	if (!configuredMaximum || !/^\d+$/.test(configuredMaximum)) throw new Error("SELENA_MIGRATION_MAX_INDEX_REQUIRED");
	const maximumIndex = Number(configuredMaximum);
	const targetDirectory =
		process.env.SELENA_BOUNDED_MIGRATIONS_DIR ?? resolve(tmpdir(), `selena-migrations-through-${maximumIndex}`);
	const prepared = prepareBoundedMigrations({ maximumIndex, targetDirectory });
	process.stdout.write(
		`prepared ${prepared.migrationCount} migrations through index ${prepared.maximumIndex} in bounded runtime bundle\n`,
	);
	if (process.argv.includes("--prepare-only")) return;
	const migrationRunner = resolve(packageRoot, "scripts/apply-migrations.mjs");
	const child = spawn(process.execPath, [migrationRunner], {
		cwd: packageRoot,
		env: { ...process.env, SELENA_MIGRATIONS_DIR: targetDirectory },
		stdio: "inherit",
	});
	const { childCode, code, timedOut } = await waitForMigrationChild(child);
	if (timedOut) process.stderr.write("SELENA_MIGRATION_HARD_TIMEOUT\n");
	process.stdout.write(`drizzle-orm migration runner exited with code ${childCode}\n`);
	await delay(15_000);
	process.exitCode = code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		process.stderr.write(`${error instanceof Error ? error.message : "SELENA_MIGRATION_RUNNER_FAILED"}\n`);
		process.exitCode = 1;
	});
}
