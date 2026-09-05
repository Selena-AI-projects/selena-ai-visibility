import { sql } from "drizzle-orm";
import type { OrganizationTransaction } from "./organization-transaction";

/**
 * Private reconciliation and human acceptance are operator control-plane
 * actions. Tenant runtime connections must fail before those services inspect
 * any private or owner-only rows.
 */
export async function assertOwnerScopedConnection(tx: OrganizationTransaction, errorCode: string): Promise<string> {
	const result = await tx.execute(
		sql`select current_user as role, session_user as session_role, pg_catalog.pg_get_userbyid(relation.relowner) as owner_role from pg_catalog.pg_class as relation where relation.oid = pg_catalog.to_regclass('public.sv_evidence_acceptance_receipts')`,
	);
	const row = (result as { rows?: Array<{ role?: unknown; session_role?: unknown; owner_role?: unknown }> }).rows?.[0];
	if (
		!row ||
		typeof row.role !== "string" ||
		!row.role ||
		row.role === "selena_app" ||
		row.session_role !== row.role ||
		row.owner_role !== row.role
	)
		throw new Error(errorCode);
	return row.role;
}
