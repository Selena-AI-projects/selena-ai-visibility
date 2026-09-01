import { sql } from "drizzle-orm";
import type { OrganizationDatabase } from "./organization-transaction";

export type SelenaApiKeyBootstrapContext = {
	apiKeyId: string;
	organizationId: string;
	permissions: string[];
};

/**
 * Resolves the tenant for an API key before tenant RLS context can exist.
 * Database permissions restrict this call to the narrow SECURITY DEFINER
 * function installed at the 0051 migration frontier.
 */
export async function resolveSelenaApiKeyBootstrap(
	db: OrganizationDatabase,
	keyHash: string,
): Promise<SelenaApiKeyBootstrapContext | null> {
	const result = await db.execute(sql`
		SELECT api_key_id, organization_id, permissions
		FROM public.sv_resolve_api_key_context(${keyHash})
	`);
	const row = result.rows[0] as { api_key_id: string; organization_id: string; permissions: string[] } | undefined;
	return row ? { apiKeyId: row.api_key_id, organizationId: row.organization_id, permissions: row.permissions } : null;
}
