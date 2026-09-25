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
	const result = await withBootstrapFallback(
		() =>
			db.execute(sql`
				SELECT organization_id, role FROM public.sv_resolve_session_memberships(${userId})
			`),
		() =>
			db.execute(sql`
				SELECT m.organization_id, m.role
				FROM public.member AS m
				JOIN public.organization AS o ON o.id = m.organization_id
				WHERE m.user_id = ${userId}
				ORDER BY m.created_at, m.organization_id
			`),
	);
	return (result.rows as { organization_id: string; role: string }[]).map((row) => ({
		organizationId: row.organization_id,
		role: row.role,
	}));
}

const UNDEFINED_FUNCTION = "42883";

function isUndefinedFunction(error: unknown): boolean {
	const candidate = error as { code?: unknown; cause?: { code?: unknown } } | null;
	return candidate?.code === UNDEFINED_FUNCTION || candidate?.cause?.code === UNDEFINED_FUNCTION;
}

/**
 * Deployments pin the migration frontier independently of the web image, so
 * the web can run against a database that predates the bootstrap function.
 * There it still connects as the table owner, and the equivalent direct read
 * answers the same question; under a non-owner role that read sees no rows,
 * so the fallback can only fail closed.
 */
async function withBootstrapFallback<Result>(
	viaFunction: () => Promise<Result>,
	direct: () => Promise<Result>,
): Promise<Result> {
	try {
		return await viaFunction();
	} catch (error) {
		if (!isUndefinedFunction(error)) throw error;
		return direct();
	}
}

/** The active organization when the user still belongs to it, otherwise the oldest membership. */
export function pickSessionMembership(
	memberships: readonly SessionMembership[],
	activeOrganizationId: string | null | undefined,
): SessionMembership | undefined {
	if (activeOrganizationId) return memberships.find((row) => row.organizationId === activeOrganizationId);
	return memberships[0];
}
