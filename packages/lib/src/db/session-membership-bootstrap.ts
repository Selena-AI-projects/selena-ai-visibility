import { sql } from "drizzle-orm";
import type { OrganizationDatabase } from "./organization-transaction";

export type SessionMembership = { organizationId: string; role: string };

/**
 * Lists a signed-in user's organizations before any tenant RLS context exists.
 * The narrow SECURITY DEFINER function is the only read of `member` a non-owner
 * runtime role needs for this; it returns memberships oldest first so the
 * default organization is the same on every request.
 */
export async function resolveSessionMemberships(
	db: OrganizationDatabase,
	userId: string,
): Promise<SessionMembership[]> {
	const result = await db.execute(sql`
		SELECT organization_id, role FROM public.sv_resolve_session_memberships(${userId})
	`);
	return (result.rows as { organization_id: string; role: string }[]).map((row) => ({
		organizationId: row.organization_id,
		role: row.role,
	}));
}

/** The active organization when the user still belongs to it, otherwise the oldest membership. */
export function pickSessionMembership(
	memberships: readonly SessionMembership[],
	activeOrganizationId: string | null | undefined,
): SessionMembership | undefined {
	if (activeOrganizationId) return memberships.find((row) => row.organizationId === activeOrganizationId);
	return memberships[0];
}
