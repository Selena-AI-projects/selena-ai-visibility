import { z } from "zod";
import { normalizeDomain } from "./selena-answer-analysis";
import type { GraderRecommendation } from "./selena-grader-report";

export const followupStatuses = ["NEW", "IN_PROGRESS", "DONE", "DISMISSED"] as const;
export type FollowupStatus = (typeof followupStatuses)[number];

export const FOLLOWUP_ASSIGNEE_MAX_LENGTH = 120;
export const FOLLOWUP_NOTE_MAX_LENGTH = 2000;

/**
 * A recommendation is recomputed from the cycle's runs on every read and
 * carries no id, so what a client records about it is keyed by what the
 * recommendation is about. The domain is normalised the way the report
 * normalises cited hosts, so two reads of one cycle name one row even when
 * the host is spelled differently.
 */
export function recommendationKey(recommendation: GraderRecommendation): string {
	switch (recommendation.kind) {
		case "SOURCE_PRESENCE":
			return `SOURCE_PRESENCE:${normalizeDomain(recommendation.domain)}`;
		case "OWN_SITE_UNDERCITED":
			return `OWN_SITE_UNDERCITED:${normalizeDomain(recommendation.domain)}`;
		case "CATEGORY_CONTENT":
			return "CATEGORY_CONTENT";
	}
}

/** The date type accepts 2026-02-31; Postgres would not, with a message nobody can act on. */
function isCalendarDate(value: string): boolean {
	const parsed = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const recommendationFollowupInputSchema = z.object({
	status: z.enum(followupStatuses),
	assignee: z.string().trim().max(FOLLOWUP_ASSIGNEE_MAX_LENGTH).optional(),
	dueOn: z.iso.date().refine(isCalendarDate, "not a calendar date").optional(),
	note: z.string().trim().max(FOLLOWUP_NOTE_MAX_LENGTH).optional(),
});

export type RecommendationFollowupInput = z.infer<typeof recommendationFollowupInputSchema>;

export const RECOMMENDATION_FOLLOWUPS_UNAVAILABLE = "SELENA_FOLLOWUP_UNAVAILABLE";

/**
 * The web ships before its migration does: release deploys the code, and the
 * table reaches a database only once the owner moves the migration frontier
 * and re-runs the runtime-role grants. Until then follow-ups are unavailable,
 * not broken, and the report they sit on must still open.
 */
export class RecommendationFollowupsUnavailable extends Error {
	constructor(cause: unknown) {
		super(RECOMMENDATION_FOLLOWUPS_UNAVAILABLE, { cause });
		this.name = "RecommendationFollowupsUnavailable";
	}
}

const FOLLOWUP_TABLE = "sv_recommendation_followups";

/**
 * Only the table's absence or a missing grant on it counts. A row-policy
 * refusal shares the permission code but means a cross-tenant write, which
 * must surface as the error it is.
 */
export function isFollowupStorageMissing(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 5 && current; depth += 1) {
		const { code, message } = current as { code?: unknown; message?: unknown };
		if (typeof message === "string" && message.includes(FOLLOWUP_TABLE)) {
			if (code === "42P01") return true;
			if (code === "42501" && message.startsWith("permission denied")) return true;
		}
		current = (current as { cause?: unknown }).cause;
	}
	return false;
}
