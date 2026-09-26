import { type OrganizationDatabase, withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svLocalRawRetentionHealth } from "@workspace/lib/db/schema";
import {
	checkLocalRawRetentionInTransaction,
	cleanupExpiredLocalRawEvidenceInTransaction,
} from "@workspace/lib/selena-local-raw-retention";
import { sql } from "drizzle-orm";
import type { Job } from "pg-boss";

export interface SelenaLocalRawRetentionData {
	organizationId: string;
}

export function createLocalRawRetentionHandler(
	database: OrganizationDatabase,
	now?: () => Date,
	onOverdue: (count: number) => void = (count) =>
		console.warn(`[selena-local-raw-retention] Cleanup overdue: ${count} payloads`),
) {
	return async (jobs: Pick<Job<SelenaLocalRawRetentionData>, "data">[]): Promise<void> => {
		for (const job of jobs) {
			const organizationId = job.data?.organizationId?.trim();
			if (!organizationId) throw new Error("LOCAL_RAW_RETENTION_ORGANIZATION_REQUIRED");
			const expired = await withOrganizationTransaction(database, organizationId, async (tx) => {
				const clock = now?.() ?? new Date((await tx.execute(sql`select now() as now`)).rows[0].now as string);
				const before = await checkLocalRawRetentionInTransaction(tx, organizationId, clock);
				if (before.overdue > 0) onOverdue(before.overdue);
				const deleted = await cleanupExpiredLocalRawEvidenceInTransaction(tx, organizationId, clock);
				const after = await checkLocalRawRetentionInTransaction(tx, organizationId, clock);
				if (after.overdue > 0) throw new Error("LOCAL_RAW_RETENTION_CLEANUP_INCOMPLETE");
				await tx
					.insert(svLocalRawRetentionHealth)
					.values({ organizationId, checkedAt: clock, deletedCount: deleted, overdueCount: after.overdue })
					.onConflictDoUpdate({
						target: svLocalRawRetentionHealth.organizationId,
						set: { checkedAt: clock, deletedCount: deleted, overdueCount: after.overdue },
					});
				return deleted;
			});
			console.log(`[selena-local-raw-retention] Expired ${expired} raw payloads`);
		}
	};
}

export async function selenaLocalRawRetentionJob(jobs: Job<SelenaLocalRawRetentionData>[]): Promise<void> {
	const { db } = await import("@workspace/lib/db/db");
	await createLocalRawRetentionHandler(db)(jobs);
}
