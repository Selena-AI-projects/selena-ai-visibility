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

export const recommendationFollowupInputSchema = z.object({
	status: z.enum(followupStatuses),
	assignee: z.string().trim().max(FOLLOWUP_ASSIGNEE_MAX_LENGTH).optional(),
	dueOn: z.iso.date().optional(),
	note: z.string().trim().max(FOLLOWUP_NOTE_MAX_LENGTH).optional(),
});

export type RecommendationFollowupInput = z.infer<typeof recommendationFollowupInputSchema>;
