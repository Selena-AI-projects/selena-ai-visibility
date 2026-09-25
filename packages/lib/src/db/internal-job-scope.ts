import { AsyncLocalStorage } from "node:async_hooks";
import { internalDatabase } from "./internal-db";
import type { OrganizationDatabase } from "./organization-transaction";
import { installScopedDatabaseResolver, scopedDatabaseResolverInstalled } from "./tenant-scope";

const storage = new AsyncLocalStorage<OrganizationDatabase>();
let resolverClaimed = false;

function claimResolver(): void {
	if (resolverClaimed) return;
	// The web owns the resolver for request scopes; sharing it would let one
	// process's operator scope leak into another's tenant requests.
	if (scopedDatabaseResolverInstalled()) throw new Error("SCOPED_DATABASE_RESOLVER_TAKEN");
	installScopedDatabaseResolver(() => storage.getStore());
	resolverClaimed = true;
}

/**
 * Runs a worker job whose work spans every tenant on the operator connection:
 * every use of the shared `db` inside it goes there instead of the runtime
 * role, which can see one tenant at a time. Reserved for platform sweeps that
 * were written for the table owner.
 */
export function runOnInternalDatabase<Result>(work: () => Promise<Result>): Promise<Result> {
	claimResolver();
	return storage.run(internalDatabase(), work);
}
