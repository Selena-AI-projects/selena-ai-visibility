import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptUrl = new URL("../../../apps/worker/src/scripts/measure-journal.ts", import.meta.url);
const scriptPath = fileURLToPath(scriptUrl);
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const source = readFileSync(scriptUrl, "utf8");
const repositorySource = readFileSync(new URL("./selena-visibility-repositories.ts", import.meta.url), "utf8");

describe("journal provider stop", () => {
	it("refuses affirmative operator stop values before credentials, database, or provider access", () => {
		const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				SELENA_EMERGENCY_STOP: " yes ",
			},
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).not.toBe(0);
		expect(output).toContain("PROVIDER_CALLS_STOPPED");
		expect(output).not.toContain("DATABASE_URL is required");
	});
});

describe("journal durable daily claim", () => {
	it("serializes allocation before provider-capable writes and fails closed on ambiguity", () => {
		const claimStart = source.indexOf("async function acquireDailyClaim");
		const transitionStart = source.indexOf("async function transitionDailyClaim", claimStart);
		const measureStart = source.indexOf("async function measure", transitionStart);
		const allocator = source.slice(claimStart, transitionStart);
		const claimLifecycle = source.slice(claimStart, measureStart);
		const measurement = source.slice(measureStart);
		const advisoryStart = allocator.indexOf("pg_advisory_xact_lock");
		const advisory = allocator.slice(advisoryStart, allocator.indexOf(";", advisoryStart));
		expect(allocator).toContain("db.transaction");
		expect(allocator).toContain("CURRENT_TIMESTAMP AT TIME ZONE 'UTC'");
		expect(allocator).not.toContain(".from(schema.svMeasurementDomains)");
		expect(allocator).toContain("pg_advisory_xact_lock");
		expect(advisory).not.toContain("utcDay");
		expect(allocator).toContain("schema.svJournalDailyClaims");
		expect(allocator).toContain('["CLAIMED", "EXECUTING", "HOLD"]');
		expect(allocator).toContain('kind: "HOLD"');
		expect(allocator).toContain('eq(schema.svJournalDailyClaims.status, "COMPLETED")');
		expect(allocator).toContain("if (completed && !FORCE && abandonedAttempt === undefined)");
		expect(allocator.indexOf("if (completed && !FORCE && abandonedAttempt === undefined)")).toBeLessThan(
			allocator.indexOf("const [prior]"),
		);
		expect(allocator).toContain('event: "JOURNAL_DAILY_CLAIM_CLAIMED"');
		expect(allocator).toContain('event: "JOURNAL_DAILY_CLAIM_ABANDONED"');
		expect(allocator).toContain("interval '45 minutes'");
		expect(allocator).not.toContain("eq(schema.svJournalDailyClaims.updatedAt, unresolved.updatedAt)");
		expect(allocator).toContain("recordedCostUsd");
		expect(allocator).toContain("forced: FORCE");
		expect(claimLifecycle).not.toContain("new Date()");
		expect(claimLifecycle.match(/updatedAt: sql`CURRENT_TIMESTAMP`/g)?.length).toBeGreaterThanOrEqual(4);
		expect(claimLifecycle).toContain('completedAt: status === "COMPLETED" ? sql`CURRENT_TIMESTAMP` : null');
		expect(measurement.indexOf("await acquireDailyClaim")).toBeLessThan(
			measurement.indexOf("repositories.locks.allocate"),
		);
		expect(measurement).toContain("await linkDailyClaim(claim.id, lock.id)");
		expect(measurement).toContain('await transitionDailyClaim(claim.id, "CLAIMED", "EXECUTING")');
		expect(measurement).toContain("journalClaimId: claim.id");
		expect(source).toContain("isAffirmativeEnvValue(process.env.SELENA_JOURNAL_FORCE)");
		expect(measurement).toContain('outcome.outcome.status !== "SUCCEEDED"');
		expect(measurement).toContain("terminalCycle.completedRuns !== terminalCycle.expectedRuns");
		expect(measurement).toContain('providerBoundaryCrossed ? "HOLD" : "NO_SPEND"');
		expect(measurement).toContain('await transitionDailyClaim(claim.id, "EXECUTING", "COMPLETED")');
		expect(source).toContain("JOURNAL_DAILY_CLAIM_" + "$" + "{status}");
		expect(source).toContain("select set_config('app.organization_id'");
		const runClaim = repositorySource.slice(
			repositorySource.indexOf("claim: async ("),
			repositorySource.indexOf("complete: async", repositorySource.indexOf("claim: async (")),
		);
		expect(runClaim).toContain("opts?.journalClaimId");
		expect(runClaim).toContain('eq(schema.svJournalDailyClaims.status, "EXECUTING")');
		expect(runClaim).toContain("SELENA_JOURNAL_DAILY_CLAIM_LEASE_LOST");
		expect(runClaim.indexOf("opts?.journalClaimId")).toBeLessThan(runClaim.indexOf('status: "consumed"'));
	});
});
