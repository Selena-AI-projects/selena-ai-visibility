import { sql } from "drizzle-orm";
import type { SqlExecutor } from "./selena-pilot-invites";
import { maskEmail } from "./selena-platform-admin-grant";

/**
 * Which workspaces one account belongs to, read as the owner.
 *
 * The Local Maps owner tasks take a workspace id and the id of an owner or
 * admin member of it. On a hosted environment the owner has no query window to
 * read either, so this read runs where owner rights already live: the one-shot
 * owner service. It writes nothing. The log carries the masked address, the
 * user id and each membership's workspace id, name and role.
 */

export interface MemberLookup {
	maskedEmail: string;
	userId: string;
	memberships: { organizationId: string; organizationName: string; role: string }[];
}

export async function lookupMember(executor: SqlExecutor, email: string): Promise<MemberLookup> {
	const address = email.trim();
	if (address === "" || !address.includes("@")) throw new Error("SELENA_OWNER_ADMIN_EMAIL_INVALID");
	const maskedEmail = maskEmail(address);
	const users = await executor.execute(sql`SELECT "id" FROM "user" WHERE lower("email") = lower(${address}::text)`);
	const userRows = (users.rows ?? []) as { id: unknown }[];
	if (userRows.length === 0) throw new Error(`SELENA_OWNER_ADMIN_NOT_FOUND (${maskedEmail})`);
	if (userRows.length > 1)
		throw new Error(`SELENA_OWNER_ADMIN_AMBIGUOUS (${userRows.length} users match ${maskedEmail})`);
	const userId = String(userRows[0]?.id);
	const rows = await executor.execute(sql`
		SELECT m."organization_id" AS organization_id, o."name" AS organization_name, m."role" AS role
		FROM "member" m JOIN "organization" o ON o."id" = m."organization_id"
		WHERE m."user_id" = ${userId}
		ORDER BY m."created_at"
	`);
	const memberships = ((rows.rows ?? []) as Record<string, unknown>[]).map((row) => ({
		organizationId: String(row.organization_id),
		organizationName: String(row.organization_name),
		role: String(row.role),
	}));
	return { maskedEmail, userId, memberships };
}

export function formatMemberLookup(lookup: MemberLookup): string[] {
	return [
		`find-member: ${lookup.maskedEmail} user id ${lookup.userId}, ${lookup.memberships.length} workspace(s)`,
		...lookup.memberships.map(
			(membership) =>
				`  workspace ${membership.organizationId} "${membership.organizationName}" role ${membership.role}`,
		),
	];
}
