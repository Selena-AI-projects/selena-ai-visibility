import type { FollowupStatus } from "@workspace/lib/selena-recommendation-followups";
import type { RecommendationFollowupRecord } from "@workspace/lib/selena-recommendation-followups-store";

export type RecommendationFollowupView = {
	recommendationKey: string;
	status: FollowupStatus;
	assignee: string | null;
	dueOn: string | null;
	note: string | null;
	updatedAt: string;
};

export function serializeRecommendationFollowup(record: RecommendationFollowupRecord): RecommendationFollowupView {
	return {
		recommendationKey: record.recommendationKey,
		status: record.status,
		assignee: record.assignee,
		dueOn: record.dueOn,
		note: record.note,
		updatedAt: record.updatedAt.toISOString(),
	};
}
