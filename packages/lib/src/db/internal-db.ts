import { drizzle } from "drizzle-orm/node-postgres";
import type { OrganizationDatabase } from "./organization-transaction";
import { internalDatabaseConnection } from "./postgres-config";
import * as schema from "./schema";

let internal: OrganizationDatabase | undefined;

/**
 * Opened on first operator use rather than at import, so a web process whose
 * operator connection is misconfigured still serves every tenant request and
 * fails only the operator views.
 */
export function internalDatabase(): OrganizationDatabase {
	internal ??= drizzle({ connection: internalDatabaseConnection(), schema });
	return internal;
}
