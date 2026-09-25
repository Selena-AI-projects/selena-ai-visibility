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
	const result = await db.execute(sql`
		SELECT organization_id, organization_name, role FROM public.sv_resolve_brand_membership(${userId}, ${brandId})
	`);
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
	const result = await db.execute(sql`
		SELECT brand_id, organization_id, role FROM public.sv_resolve_prompt_membership(${userId}, ${promptId}::uuid)
	`);
	const [row] = result.rows as { brand_id: string; organization_id: string; role: string }[];
	return row && { brandId: row.brand_id, organizationId: row.organization_id, role: row.role };
}

/** The user's organizations with names, oldest membership first. */
export async function resolveUserOrganizations(db: OrganizationDatabase, userId: string): Promise<UserOrganization[]> {
	const result = await db.execute(sql`
		SELECT organization_id, organization_name, role FROM public.sv_resolve_user_organizations(${userId})
	`);
	return (result.rows as { organization_id: string; organization_name: string; role: string }[]).map((row) => ({
		id: row.organization_id,
		name: row.organization_name,
		role: row.role,
	}));
}
