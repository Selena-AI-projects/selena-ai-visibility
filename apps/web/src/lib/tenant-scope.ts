/**
 * Request-scoped tenant context for the legacy brand-scoped server functions.
 *
 * An access check that names an organization pins one pooled connection to the
 * request and sets `app.organization_id` and `app.user_id` on it, so every
 * later query of the request, including ones in shared modules that import
 * `db` directly, runs under that tenant's row-level security. The settings are
 * session-level rather than transaction-local so statements keep autocommitting
 * exactly as they did on the pool.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { db } from "@workspace/lib/db/db";
import type { OrganizationDatabase } from "@workspace/lib/db/organization-transaction";
import * as schema from "@workspace/lib/db/schema";
import { installScopedDatabaseResolver } from "@workspace/lib/db/tenant-scope";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";

type TenantScope = {
	organizationId: string;
	userId: string;
	client: PoolClient;
	database: OrganizationDatabase;
};

type RequestScope = { opening?: Promise<TenantScope>; active?: TenantScope };

const storage = new AsyncLocalStorage<RequestScope>();

installScopedDatabaseResolver(() => storage.getStore()?.active?.database);

const CLEAR_TENANT_SETTINGS =
	"select set_config('app.organization_id', '', false), set_config('app.user_id', '', false)";

async function openTenantScope(organizationId: string, userId: string): Promise<TenantScope> {
	const client = await (db.$client as Pool).connect();
	try {
		await client.query(
			"select set_config('app.organization_id', $1, false), set_config('app.user_id', $2, false)",
			[organizationId, userId],
		);
	} catch (error) {
		client.release(error instanceof Error ? error : true);
		throw error;
	}
	return { organizationId, userId, client, database: drizzle(client, { schema }) };
}

async function closeTenantScope(scope: RequestScope): Promise<void> {
	if (!scope.opening) return;
	let tenant: TenantScope;
	try {
		tenant = await scope.opening;
	} catch {
		return;
	}
	try {
		await tenant.client.query(CLEAR_TENANT_SETTINGS);
		tenant.client.release();
	} catch (error) {
		// A connection that could not be cleared is destroyed rather than
		// returned, so one tenant's settings can never reach another request.
		tenant.client.release(error instanceof Error ? error : true);
	}
}

/** Runs one server-side entry point with its own, initially empty, tenant scope. */
export async function runWithRequestTenantScope<Result>(work: () => Promise<Result>): Promise<Result> {
	const scope: RequestScope = {};
	try {
		return await storage.run(scope, work);
	} finally {
		await closeTenantScope(scope);
	}
}

/**
 * Pins the request to an organization after its access check passed. Outside a
 * request scope this does nothing, so callers outside the web request path keep
 * the pool. A second, different organization in the same request is refused:
 * one entry point serves one tenant.
 */
export async function enterOrganizationScope(organizationId: string, userId: string): Promise<void> {
	const scope = storage.getStore();
	if (!scope) return;
	if (!scope.opening) {
		scope.opening = openTenantScope(organizationId, userId).then((tenant) => {
			scope.active = tenant;
			return tenant;
		});
	}
	const tenant = await scope.opening;
	if (tenant.organizationId !== organizationId || tenant.userId !== userId)
		throw new Error("Forbidden: request is already scoped to another organization");
}

/**
 * Runs work that belongs to one of several organizations the caller reaches in
 * a single request (a brand list across every workspace), each in a scope of
 * its own so the request's single-tenant rule still holds per unit of work.
 * The caller must already have established membership in `organizationId`.
 */
export async function withOrganizationScope<Result>(
	organizationId: string,
	userId: string,
	work: () => Promise<Result>,
): Promise<Result> {
	return runWithRequestTenantScope(async () => {
		await enterOrganizationScope(organizationId, userId);
		return work();
	});
}
