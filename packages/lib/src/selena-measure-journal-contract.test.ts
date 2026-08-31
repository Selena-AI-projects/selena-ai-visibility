import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../../apps/worker/src/scripts/measure-journal.ts", import.meta.url), "utf8");

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
		expect(allocator).toContain("if (completed && !FORCE)");
		expect(allocator.indexOf("if (completed && !FORCE)")).toBeLessThan(allocator.indexOf("const [prior]"));
		expect(allocator).toContain('event: "JOURNAL_DAILY_CLAIM_CLAIMED"');
		expect(allocator).toContain("forced: FORCE");
		expect(claimLifecycle).not.toContain("new Date()");
		expect(claimLifecycle.match(/updatedAt: sql`CURRENT_TIMESTAMP`/g)).toHaveLength(2);
		expect(claimLifecycle).toContain('completedAt: status === "COMPLETED" ? sql`CURRENT_TIMESTAMP` : null');
		expect(measurement.indexOf("await acquireDailyClaim")).toBeLessThan(
			measurement.indexOf("repositories.locks.allocate"),
		);
		expect(measurement).toContain("await linkDailyClaim(claim.id, lock.id)");
		expect(measurement).toContain('await transitionDailyClaim(claim.id, "CLAIMED", "EXECUTING")');
		expect(measurement).toContain('outcome.outcome.status !== "SUCCEEDED"');
		expect(measurement).toContain("terminalCycle.completedRuns !== terminalCycle.expectedRuns");
		expect(measurement).toContain('providerBoundaryCrossed ? "HOLD" : "NO_SPEND"');
		expect(measurement).toContain('await transitionDailyClaim(claim.id, "EXECUTING", "COMPLETED")');
		expect(source).toContain("JOURNAL_DAILY_CLAIM_" + "$" + "{status}");
		expect(source).toContain("select set_config('app.organization_id'");
	});
});
