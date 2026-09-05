import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema";

export type OrganizationDatabase = NodePgDatabase<typeof schema>;
export type OrganizationTransaction = Parameters<Parameters<OrganizationDatabase["transaction"]>[0]>[0];

/**
 * Runs tenant work with a transaction-local RLS identity.
 *
 * The callback receives only the transaction handle so tenant queries cannot
 * accidentally escape onto the pool connection where the setting is absent.
 */
export async function withOrganizationTransaction<Result>(
	db: OrganizationDatabase,
	organizationId: string,
	work: (tx: OrganizationTransaction) => Promise<Result>,
): Promise<Result> {
	if (organizationId.trim().length === 0) throw new Error("ORGANIZATION_TRANSACTION_ID_REQUIRED");
	return db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.organization_id', ${organizationId}, true)`);
		return work(tx);
	});
}
