import type { OrganizationDatabase } from "./organization-transaction";

type ScopedDatabaseResolver = () => OrganizationDatabase | undefined;

// Kept on globalThis under a registered symbol so that a module graph which
// loads this file twice (ESM and CJS copies) still shares one resolver.
const RESOLVER_KEY = Symbol.for("selena.scopedDatabaseResolver");
const registry = globalThis as { [RESOLVER_KEY]?: ScopedDatabaseResolver };

function resolveScopedDatabase(): OrganizationDatabase | undefined {
	return registry[RESOLVER_KEY]?.();
}

/**
 * The web server installs a resolver that returns the request's
 * tenant-scoped connection once an access check has named the organization.
 * The worker installs one only for jobs that run on the operator connection.
 */
export function installScopedDatabaseResolver(resolver: ScopedDatabaseResolver): void {
	registry[RESOLVER_KEY] = resolver;
}

export function scopedDatabaseResolverInstalled(): boolean {
	return registry[RESOLVER_KEY] !== undefined;
}

/**
 * Routes every use of the shared handle to the current request's scoped
 * connection when there is one, so modules that import `db` directly inherit
 * the tenant context without threading a handle through their signatures.
 */
export function tenantAwareDatabase<Database extends OrganizationDatabase>(base: Database): Database {
	return new Proxy(base, {
		get(target, property) {
			const source = resolveScopedDatabase() ?? target;
			const value = Reflect.get(source, property, source);
			return typeof value === "function" ? value.bind(source) : value;
		},
	});
}
