import { createHash } from "node:crypto";
import type { CycleDiffReport } from "./selena-cycle-diff";
import type { GraderReport } from "./selena-grader-report";

export const WEEKLY_DIGEST_SCHEMA_VERSION = 1;
export const WEEKLY_DIGEST_MAX_LENGTH = 3500;

export type WeeklyDigestLocale = "ru" | "en";

export type WeeklyDigestContent = {
	schemaVersion: typeof WEEKLY_DIGEST_SCHEMA_VERSION;
	projectName: string;
	periodStart: string;
	periodEnd: string;
	cycleId: string;
	previousCycleId: string | null;
	systems: {
		total: number;
		mentioned: number;
		notMentioned: number;
		/** Systems with no analyzed answer this cycle: neither mentioned nor absent. */
		unknown: number;
	};
	/** Null when nothing was analyzed: UNKNOWN, never a confident zero. */
	brandMentionRate: number | null;
	/** Null on the first cycle, when there is nothing to compare with. */
	changes: {
		mentionAppeared: number;
		mentionDisappeared: number;
		positionImproved: number;
		positionWorsened: number;
		unknownComparisons: number;
	} | null;
};

/**
 * A digest reports one finished cycle. Returns null when no cycle finished
 * inside the week, so a quiet week sends nothing instead of repeating old news.
 */
export function buildWeeklyDigest(input: {
	projectName: string;
	periodStart: Date;
	periodEnd: Date;
	cycle: { id: string; completedAt: Date | null };
	previousCycleId: string | null;
	report: GraderReport;
	diff: CycleDiffReport | null;
}): WeeklyDigestContent | null {
	if (!(input.periodEnd > input.periodStart)) throw new Error("WEEKLY_DIGEST_PERIOD_INVALID");
	const completedAt = input.cycle.completedAt;
	if (!completedAt || completedAt < input.periodStart || completedAt >= input.periodEnd) return null;
	if ((input.previousCycleId === null) !== (input.diff === null)) throw new Error("WEEKLY_DIGEST_DIFF_MISMATCH");
	if (input.previousCycleId === input.cycle.id) throw new Error("WEEKLY_DIGEST_DIFF_MISMATCH");

	let mentioned = 0;
	let notMentioned = 0;
	let unknown = 0;
	for (const system of input.report.systems) {
		if (system.answersAnalyzed === 0) unknown += 1;
		else if (system.brandMentioned > 0) mentioned += 1;
		else notMentioned += 1;
	}

	let changes: WeeklyDigestContent["changes"] = null;
	if (input.diff) {
		changes = {
			mentionAppeared: 0,
			mentionDisappeared: 0,
			positionImproved: 0,
			positionWorsened: 0,
			unknownComparisons: 0,
		};
		for (const change of input.diff.changes) {
			if (change.type === "MENTION_APPEARED") changes.mentionAppeared += 1;
			else if (change.type === "MENTION_DISAPPEARED") changes.mentionDisappeared += 1;
			// A lower ordinal means the brand is named earlier in the answer.
			else if (change.type === "POSITION_SHIFTED")
				change.comparePosition < change.basePosition ? changes.positionImproved++ : changes.positionWorsened++;
		}
		changes.unknownComparisons = input.diff.groups.filter((group) => group.status === "UNKNOWN").length;
	}

	return {
		schemaVersion: WEEKLY_DIGEST_SCHEMA_VERSION,
		projectName: input.projectName,
		periodStart: input.periodStart.toISOString(),
		periodEnd: input.periodEnd.toISOString(),
		cycleId: input.cycle.id,
		previousCycleId: input.previousCycleId,
		systems: { total: input.report.systems.length, mentioned, notMentioned, unknown },
		brandMentionRate: input.report.overall.brandMentionRate,
		changes,
	};
}

/** The stored form; `sv_weekly_digests` checks the hash against exactly this text. */
export function canonicalWeeklyDigest(content: WeeklyDigestContent): { canonical: string; sha256: string } {
	const canonical = JSON.stringify(content);
	return { canonical, sha256: `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}` };
}

const copy = {
	ru: {
		title: "Selena · отчёт за неделю",
		period: "Период",
		systems: (c: WeeklyDigestContent["systems"]) =>
			`Упоминание в AI-системах: ${c.mentioned} из ${c.total}` + (c.unknown > 0 ? ` (нет данных: ${c.unknown})` : ""),
		rate: "Доля ответов с упоминанием",
		unknown: "неизвестно",
		first: "Это первый замер — сравнивать пока не с чем.",
		changes: "Изменения с прошлого замера",
		appeared: "появились упоминания",
		disappeared: "пропали упоминания",
		improved: "бренд назван раньше",
		worsened: "бренд назван позже",
		noChanges: "Заметных изменений нет.",
		unknownComparisons: (n: number) => `Не удалось сравнить: ${n}`,
		open: "Полный отчёт",
	},
	en: {
		title: "Selena · weekly report",
		period: "Period",
		systems: (c: WeeklyDigestContent["systems"]) =>
			`Mentioned in AI systems: ${c.mentioned} of ${c.total}` + (c.unknown > 0 ? ` (no data: ${c.unknown})` : ""),
		rate: "Answers that mention you",
		unknown: "unknown",
		first: "This is the first measurement — nothing to compare with yet.",
		changes: "Changes since the last measurement",
		appeared: "new mentions",
		disappeared: "lost mentions",
		improved: "named earlier",
		worsened: "named later",
		noChanges: "No notable changes.",
		unknownComparisons: (n: number) => `Could not compare: ${n}`,
		open: "Full report",
	},
} as const;

/** The chat message carries a summary and a link; the report stays behind sign-in. */
export function renderWeeklyDigestMessage(
	content: WeeklyDigestContent,
	locale: WeeklyDigestLocale,
	workspaceUrl: string,
): string {
	const t = copy[locale];
	const url = new URL(workspaceUrl);
	if (url.protocol !== "https:") throw new Error("WEEKLY_DIGEST_URL_INVALID");
	const lines = [
		`${t.title}: ${content.projectName}`,
		`${t.period}: ${content.periodStart.slice(0, 10)} — ${content.periodEnd.slice(0, 10)}`,
		"",
		t.systems(content.systems),
		`${t.rate}: ${content.brandMentionRate === null ? t.unknown : `${Math.round(content.brandMentionRate * 100)}%`}`,
		"",
	];
	if (content.changes === null) lines.push(t.first);
	else {
		const c = content.changes;
		const parts = [
			[c.mentionAppeared, t.appeared],
			[c.mentionDisappeared, t.disappeared],
			[c.positionImproved, t.improved],
			[c.positionWorsened, t.worsened],
		]
			.filter(([count]) => (count as number) > 0)
			.map(([count, label]) => `• ${label}: ${count}`);
		lines.push(`${t.changes}:`, ...(parts.length ? parts : [t.noChanges]));
		if (c.unknownComparisons > 0) lines.push(t.unknownComparisons(c.unknownComparisons));
	}
	lines.push("", `${t.open}: ${url.toString()}`);
	const message = lines.join("\n");
	if (message.length > WEEKLY_DIGEST_MAX_LENGTH) throw new Error("WEEKLY_DIGEST_TOO_LONG");
	return message;
}
