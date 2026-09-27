import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CycleDiffReport } from "./selena-cycle-diff";
import type { GraderReport } from "./selena-grader-report";
import { buildWeeklyDigest, canonicalWeeklyDigest, renderWeeklyDigestMessage } from "./selena-weekly-digest";

const periodStart = new Date("2026-09-21T00:00:00Z");
const periodEnd = new Date("2026-09-28T00:00:00Z");
const url = "https://app.example.invalid/app/selena-report?project=p";

function system(systemId: string, answersAnalyzed: number, brandMentioned: number) {
	return { systemId, answersAnalyzed, brandMentioned };
}

// The digest reads only the per-system counts and the overall mention rate.
function report(systems: ReturnType<typeof system>[], brandMentionRate: number | null) {
	return { systems, overall: { brandMentionRate } } as unknown as GraderReport;
}

const diff: CycleDiffReport = {
	formulaVersion: "selena-cycle-diff/1",
	groups: [
		{ scenarioId: "q1", system: "chatgpt", status: "COMPARED" },
		{ scenarioId: "q2", system: "gemini", status: "UNKNOWN", reason: "NO_MEASURED_RUNS" },
	],
	changes: [
		{ type: "MENTION_APPEARED", scenarioId: "q1", system: "chatgpt", evidence: { baseRunIds: [], compareRunIds: [] } },
		{
			type: "POSITION_SHIFTED",
			scenarioId: "q3",
			system: "claude",
			basePosition: 3,
			comparePosition: 1,
			evidence: { baseRunIds: [], compareRunIds: [] },
		},
	],
};

function digest(overrides: Partial<Parameters<typeof buildWeeklyDigest>[0]> = {}) {
	return buildWeeklyDigest({
		projectName: "Kora",
		periodStart,
		periodEnd,
		cycle: { id: "cycle-2", completedAt: new Date("2026-09-24T10:00:00Z") },
		previousCycleId: "cycle-1",
		report: report([system("chatgpt", 10, 4), system("gemini", 10, 0), system("perplexity", 0, 0)], 0.2),
		diff,
		...overrides,
	});
}

describe("weekly digest", () => {
	it("sends nothing in a week when no measurement finished", () => {
		expect(digest({ cycle: { id: "cycle-2", completedAt: new Date("2026-09-20T23:59:59Z") } })).toBeNull();
		expect(digest({ cycle: { id: "cycle-2", completedAt: periodEnd } })).toBeNull();
		expect(digest({ cycle: { id: "cycle-2", completedAt: null } })).toBeNull();
	});

	it("keeps a system without answers apart from one that did not mention the brand", () => {
		expect(digest()?.systems).toEqual({ total: 3, mentioned: 1, notMentioned: 1, unknown: 1 });
	});

	it("says unknown rather than zero when nothing was analyzed", () => {
		const content = digest({ report: report([system("chatgpt", 0, 0)], null) });
		if (!content) throw new Error("expected a digest");
		const ru = renderWeeklyDigestMessage(content, "ru", url);
		const en = renderWeeklyDigestMessage(content, "en", url);
		expect(ru).toContain("Доля ответов с упоминанием: неизвестно");
		expect(en).toContain("Answers that mention you: unknown");
		expect(`${ru}\n${en}`).not.toMatch(/\b0%/);
	});

	it("claims no changes on the first measurement", () => {
		const content = digest({ previousCycleId: null, diff: null });
		expect(content?.changes).toBeNull();
		if (!content) throw new Error("expected a digest");
		expect(renderWeeklyDigestMessage(content, "ru", url)).toContain("первый замер");
	});

	it("reports each kind of change and the comparisons it could not make", () => {
		const content = digest();
		expect(content?.changes).toEqual({
			mentionAppeared: 1,
			mentionDisappeared: 0,
			positionImproved: 1,
			positionWorsened: 0,
			unknownComparisons: 1,
		});
		if (!content) throw new Error("expected a digest");
		const en = renderWeeklyDigestMessage(content, "en", url);
		expect(en).toContain("• new mentions: 1");
		expect(en).toContain("• named earlier: 1");
		expect(en).not.toContain("lost mentions");
		expect(en).toContain("Could not compare: 1");
		expect(en).toContain(url);
	});

	it("refuses a comparison that does not match its previous cycle", () => {
		expect(() => digest({ previousCycleId: null })).toThrow("WEEKLY_DIGEST_DIFF_MISMATCH");
		expect(() => digest({ previousCycleId: "cycle-2" })).toThrow("WEEKLY_DIGEST_DIFF_MISMATCH");
	});

	it("only links to an https workspace", () => {
		const content = digest();
		if (!content) throw new Error("expected a digest");
		expect(() => renderWeeklyDigestMessage(content, "en", "http://app.example.invalid/")).toThrow(
			"WEEKLY_DIGEST_URL_INVALID",
		);
	});

	it("stores a hash the database can recompute from the canonical text", () => {
		const content = digest();
		if (!content) throw new Error("expected a digest");
		const { canonical, sha256 } = canonicalWeeklyDigest(content);
		expect(JSON.parse(canonical)).toEqual(content);
		expect(sha256).toBe(`sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`);
	});
});
