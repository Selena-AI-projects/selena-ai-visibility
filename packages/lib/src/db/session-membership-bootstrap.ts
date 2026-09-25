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
		db,
		"public.sv_resolve_session_memberships(text)",
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

const presentFunctions = new Set<string>();

/**
 * Deployments pin the migration frontier independently of the web image, so
 * the web can run against a database that predates the bootstrap function.
 * There it still connects as the table owner, and the equivalent direct read
 * answers the same question; under a non-owner role that read sees no rows,
 * so the fallback can only fail closed.
 *
 * The function is looked up rather than called and caught: a failed call
 * inside a caller's transaction would abort it, and the fallback with it.
 * Only presence is cached, since a migration can add the function at any time.
 */
export async function withBootstrapFallback<Result>(
	db: Pick<OrganizationDatabase, "execute">,
	functionSignature: string,
	viaFunction: () => Promise<Result>,
	direct: () => Promise<Result>,
): Promise<Result> {
	if (!presentFunctions.has(functionSignature)) {
		const probe = await db.execute(sql`SELECT to_regprocedure(${functionSignature}) IS NOT NULL AS present`);
		if ((probe.rows[0] as { present?: boolean } | undefined)?.present !== true) return direct();
		presentFunctions.add(functionSignature);
	}
	return viaFunction();
}

/** The active organization when the user still belongs to it, otherwise the oldest membership. */
export function pickSessionMembership(
	memberships: readonly SessionMembership[],
	activeOrganizationId: string | null | undefined,
): SessionMembership | undefined {
	if (activeOrganizationId) return memberships.find((row) => row.organizationId === activeOrganizationId);
	return memberships[0];
}

export type BrandMembership = { organizationId: string; organizationName: string; role: string };
export type PromptMembership = { brandId: string; organizationId: string; role: string };
export type UserOrganization = { id: string; name: string; role: string };

/**
 * The organization owning a brand, only when the user belongs to it. A missing
 * brand and someone else's brand both resolve to undefined.
 */
export async function resolveBrandMembership(
	db: OrganizationDatabase,
	userId: string,
	brandId: string,
): Promise<BrandMembership | undefined> {
	const result = await withBootstrapFallback(
		db,
		"public.sv_resolve_brand_membership(text, text)",
		() =>
			db.execute(sql`
				SELECT organization_id, organization_name, role FROM public.sv_resolve_brand_membership(${userId}, ${brandId})
			`),
		() =>
			db.execute(sql`
				SELECT o.id AS organization_id, o.name AS organization_name, m.role
				FROM public.brands AS b
				JOIN public.member AS m ON m.organization_id = b.organization_id AND m.user_id = ${userId}
				JOIN public.organization AS o ON o.id = b.organization_id
				WHERE b.id = ${brandId}
				LIMIT 1
			`),
	);
	const [row] = result.rows as { organization_id: string; organization_name: string; role: string }[];
	return row && { organizationId: row.organization_id, organizationName: row.organization_name, role: row.role };
}

/** As resolveBrandMembership, from a prompt id; a malformed id resolves to undefined like a foreign one. */
export async function resolvePromptMembership(
	db: OrganizationDatabase,
	userId: string,
	promptId: string,
): Promise<PromptMembership | undefined> {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promptId)) return undefined;
	const result = await withBootstrapFallback(
		db,
		"public.sv_resolve_prompt_membership(text, uuid)",
		() =>
			db.execute(sql`
				SELECT brand_id, organization_id, role FROM public.sv_resolve_prompt_membership(${userId}, ${promptId}::uuid)
			`),
		() =>
			db.execute(sql`
				SELECT b.id AS brand_id, b.organization_id, m.role
				FROM public.prompts AS p
				JOIN public.brands AS b ON b.id = p.brand_id
				JOIN public.member AS m ON m.organization_id = b.organization_id AND m.user_id = ${userId}
				WHERE p.id = ${promptId}::uuid
				LIMIT 1
			`),
	);
	const [row] = result.rows as { brand_id: string; organization_id: string; role: string }[];
	return row && { brandId: row.brand_id, organizationId: row.organization_id, role: row.role };
}

/** The user's organizations with names, oldest membership first. */
export async function resolveUserOrganizations(db: OrganizationDatabase, userId: string): Promise<UserOrganization[]> {
	const result = await withBootstrapFallback(
		db,
		"public.sv_resolve_user_organizations(text)",
		() =>
			db.execute(sql`
				SELECT organization_id, organization_name, role FROM public.sv_resolve_user_organizations(${userId})
			`),
		() =>
			db.execute(sql`
				SELECT o.id AS organization_id, o.name AS organization_name, m.role
				FROM public.member AS m
				JOIN public.organization AS o ON o.id = m.organization_id
				WHERE m.user_id = ${userId}
				ORDER BY m.created_at, o.id
			`),
	);
	return (result.rows as { organization_id: string; organization_name: string; role: string }[]).map((row) => ({
		id: row.organization_id,
		name: row.organization_name,
		role: row.role,
	}));
}
