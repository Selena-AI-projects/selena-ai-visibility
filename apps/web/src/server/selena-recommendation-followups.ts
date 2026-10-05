import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import {
	RecommendationFollowupsUnavailable,
	recommendationFollowupInputSchema,
} from "@workspace/lib/selena-recommendation-followups";
import { createRecommendationFollowupRepository } from "@workspace/lib/selena-recommendation-followups-store";
import { z } from "zod";
import { canWrite, resolveSessionAuthContext } from "../lib/selena-auth-context";
import {
	type RecommendationFollowupView,
	serializeRecommendationFollowup,
} from "./selena-recommendation-followups-view";
import { loadReportAnchor } from "./selena-report-cycle-query";

// Only server functions live here: the report page imports this module, and a
// plain export would keep the database driver in the browser bundle.

const repository = /* @__PURE__ */ createRecommendationFollowupRepository(db);

const projectInput = z.object({ projectId: z.string().uuid() });

export const listSelenaRecommendationFollowupsFn = createServerFn({ method: "GET" })
	.validator(projectInput)
	.handler(
		async ({
			data,
		}): Promise<{ cycleId: string | null; available: boolean; followups: RecommendationFollowupView[] }> => {
			const context = await resolveSessionAuthContext();
			const anchor = await withOrganizationTransaction(db, context.tenantId, (tx) =>
				loadReportAnchor(tx, { projectId: data.projectId, tenantId: context.tenantId }),
			);
			if (!anchor?.cycle) return { cycleId: null, available: true, followups: [] };
			try {
				const records = await repository.list(context, { projectId: data.projectId, cycleId: anchor.cycle.id });
				return { cycleId: anchor.cycle.id, available: true, followups: records.map(serializeRecommendationFollowup) };
			} catch (error) {
				if (!(error instanceof RecommendationFollowupsUnavailable)) throw error;
				return { cycleId: anchor.cycle.id, available: false, followups: [] };
			}
		},
	);

/**
 * Follow-ups attach to the READY cycle the report speaks for; a report that is
 * still being measured or was rejected has no recommendations to act on.
 */
export const upsertSelenaRecommendationFollowupFn = createServerFn({ method: "POST" })
	.validator(
		projectInput
			.extend({ recommendationKey: z.string().trim().min(1).max(200) })
			.extend(recommendationFollowupInputSchema.shape),
	)
	.handler(async ({ data }): Promise<RecommendationFollowupView> => {
		const context = await resolveSessionAuthContext();
		if (!canWrite(context)) throw new Error("SELENA_FOLLOWUP_READ_ONLY");
		const anchor = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			loadReportAnchor(tx, { projectId: data.projectId, tenantId: context.tenantId }),
		);
		if (!anchor?.cycle) throw new Error("SELENA_REPORT_NOT_READY");
		const { projectId, recommendationKey, ...fields } = data;
		const record = await repository.upsert(context, {
			projectId,
			cycleId: anchor.cycle.id,
			recommendationKey,
			...fields,
		});
		return serializeRecommendationFollowup(record);
	});
