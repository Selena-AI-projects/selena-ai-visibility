import { and, eq } from "drizzle-orm";
import { type OrganizationDatabase, withOrganizationTransaction } from "./db/organization-transaction";
import { svAuditEvents, svCycles, svOrders, svRecommendationFollowups } from "./db/schema";
import {
	type FollowupStatus,
	followupStatuses,
	type RecommendationFollowupInput,
} from "./selena-recommendation-followups";

export type RecommendationFollowupContext = { actorId: string; tenantId: string };

export type RecommendationFollowupRecord = {
	id: string;
	cycleId: string;
	recommendationKey: string;
	status: FollowupStatus;
	assignee: string | null;
	dueOn: string | null;
	note: string | null;
	updatedBy: string;
	updatedAt: Date;
};

export const RECOMMENDATION_FOLLOWUP_UPDATED_EVENT = "RECOMMENDATION_FOLLOWUP_UPDATED";

function toRecord(row: typeof svRecommendationFollowups.$inferSelect): RecommendationFollowupRecord {
	const status = followupStatuses.find((candidate) => candidate === row.status);
	if (!status) throw new Error(`RECOMMENDATION_FOLLOWUP_STATUS_UNKNOWN: ${row.status}`);
	return {
		id: row.id,
		cycleId: row.cycleId,
		recommendationKey: row.recommendationKey,
		status,
		assignee: row.assignee,
		dueOn: row.dueOn,
		note: row.note,
		updatedBy: row.updatedBy,
		updatedAt: row.updatedAt,
	};
}

/** A blank field is a cleared field, not a value. */
function optionalText(value: string | undefined): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed === "" ? null : trimmed;
}

export function createRecommendationFollowupRepository(db: OrganizationDatabase) {
	return {
		async list(
			ctx: RecommendationFollowupContext,
			input: { projectId: string; cycleId: string },
		): Promise<RecommendationFollowupRecord[]> {
			return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
				const rows = await tx
					.select()
					.from(svRecommendationFollowups)
					.where(
						and(
							eq(svRecommendationFollowups.organizationId, ctx.tenantId),
							eq(svRecommendationFollowups.projectId, input.projectId),
							eq(svRecommendationFollowups.cycleId, input.cycleId),
						),
					)
					.orderBy(svRecommendationFollowups.recommendationKey);
				return rows.map(toRecord);
			});
		},

		/**
		 * One row per recommendation per cycle, rewritten in place; every call
		 * leaves an audit event with the status it moved from, so the history
		 * survives even though the row does not keep it.
		 */
		async upsert(
			ctx: RecommendationFollowupContext,
			input: { projectId: string; cycleId: string; recommendationKey: string } & RecommendationFollowupInput,
		): Promise<RecommendationFollowupRecord> {
			return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
				// The composite foreign keys would refuse a foreign cycle anyway; the
				// check here answers with not-found instead of a constraint error.
				const [cycle] = await tx
					.select({ id: svCycles.id })
					.from(svCycles)
					.innerJoin(svOrders, eq(svCycles.orderId, svOrders.id))
					.where(
						and(
							eq(svCycles.id, input.cycleId),
							eq(svCycles.organizationId, ctx.tenantId),
							eq(svOrders.projectId, input.projectId),
							eq(svOrders.organizationId, ctx.tenantId),
						),
					)
					.limit(1);
				if (!cycle) throw new Error("Not found: cycle is outside AuthContext tenant");

				// Locked for the transaction, so two saves of one recommendation
				// serialise and each audit row names the status it really moved from.
				const [previous] = await tx
					.select()
					.from(svRecommendationFollowups)
					.where(
						and(
							eq(svRecommendationFollowups.organizationId, ctx.tenantId),
							eq(svRecommendationFollowups.cycleId, input.cycleId),
							eq(svRecommendationFollowups.recommendationKey, input.recommendationKey),
						),
					)
					.limit(1)
					.for("update");

				const fields = {
					status: input.status,
					assignee: optionalText(input.assignee),
					dueOn: input.dueOn ?? null,
					note: optionalText(input.note),
					updatedBy: ctx.actorId,
				};
				// A save that repeats what is stored is not a change: no row is touched
				// and no audit event claims a move that did not happen.
				if (
					previous &&
					previous.status === fields.status &&
					previous.assignee === fields.assignee &&
					previous.dueOn === fields.dueOn &&
					previous.note === fields.note
				)
					return toRecord(previous);
				const [row] = await tx
					.insert(svRecommendationFollowups)
					.values({
						organizationId: ctx.tenantId,
						projectId: input.projectId,
						cycleId: input.cycleId,
						recommendationKey: input.recommendationKey,
						...fields,
					})
					.onConflictDoUpdate({
						target: [
							svRecommendationFollowups.organizationId,
							svRecommendationFollowups.cycleId,
							svRecommendationFollowups.recommendationKey,
						],
						set: { ...fields, updatedAt: new Date() },
					})
					.returning();
				if (!row) throw new Error("RECOMMENDATION_FOLLOWUP_UPSERT_RETURNED_NOTHING");

				await tx.insert(svAuditEvents).values({
					organizationId: ctx.tenantId,
					actorId: ctx.actorId,
					event: RECOMMENDATION_FOLLOWUP_UPDATED_EVENT,
					subjectKind: "sv_recommendation_followups",
					subjectId: row.id,
					details: {
						recommendationKey: input.recommendationKey,
						from: previous?.status ?? null,
						to: input.status,
						assignee: fields.assignee,
						dueOn: fields.dueOn,
					},
				});
				return toRecord(row);
			});
		},
	};
}

export type RecommendationFollowupRepository = ReturnType<typeof createRecommendationFollowupRepository>;
