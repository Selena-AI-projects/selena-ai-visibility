import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import type { OrganizationTransaction } from "./db/organization-transaction";
import * as schema from "./db/schema";

/** Remove expired payload bodies while retaining hashes, task ids and snapshot links. */
export async function cleanupExpiredLocalRawEvidenceInTransaction(
	tx: OrganizationTransaction,
	organizationId: string,
	now?: Date,
): Promise<number> {
	const clock = now ?? new Date((await tx.execute(sql`select now() as now`)).rows[0].now as string);
	const rows = await tx
		.update(schema.svLocalRawEvidence)
		.set({ rawResponseBody: null, rawDeletedAt: clock })
		.where(
			and(
				eq(schema.svLocalRawEvidence.organizationId, organizationId),
				lte(schema.svLocalRawEvidence.retentionExpiresAt, clock),
				isNotNull(schema.svLocalRawEvidence.rawResponseBody),
			),
		)
		.returning({ id: schema.svLocalRawEvidence.id });
	const external = await tx.execute(sql`update sv_local_external_raw_evidence set raw_body=null,raw_deleted_at=${clock}
	 where organization_id=${organizationId} and retention_expires_at<=${clock} and raw_deleted_at is null returning provider_task_id`);
	return rows.length + external.rows.length;
}

/** No cross-tenant scan: callers must supply the approved tenant and RLS transaction. */
export async function checkLocalRawRetentionInTransaction(
	tx: OrganizationTransaction,
	organizationId: string,
	now?: Date,
) {
	const clock = now ? sql`${now.toISOString()}::timestamptz` : sql`now()`;
	const result = await tx.execute(sql`
        SELECT (SELECT count(*) FROM sv_local_raw_evidence
        WHERE organization_id=${organizationId} AND retention_expires_at<=${clock} AND raw_response_body IS NOT NULL)
        +(SELECT count(*) FROM sv_local_external_raw_evidence WHERE organization_id=${organizationId} AND retention_expires_at<=${clock} AND raw_deleted_at IS NULL) AS overdue
    `);
	const heartbeat = await tx.execute(
		sql`SELECT checked_at >= ${clock} - interval '180 seconds' AND overdue_count=0 AS fresh FROM sv_local_raw_retention_health WHERE organization_id=${organizationId}`,
	);
	const overdue = Number(result.rows[0]?.overdue ?? 0);
	return { overdue, healthy: overdue === 0 && heartbeat.rows[0]?.fresh === true };
}
