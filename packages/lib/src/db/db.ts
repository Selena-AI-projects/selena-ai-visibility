import { drizzle } from "drizzle-orm/node-postgres";
import { runtimeDatabaseConnection, runtimeDatabaseUrl } from "./postgres-config";
import * as schema from "./schema";
import { tenantAwareDatabase } from "./tenant-scope";

const legacyDatabaseUrl = /* @__PURE__ */ runtimeDatabaseUrl() as string;

// Annotated pure so a bundle that never reaches the handle can drop it, and
// with it the Postgres driver. Server-function modules build their repositories
// at module scope, and the browser build keeps that module: without this the
// driver shipped to the browser, where `Buffer` does not exist, and the bundle
// threw before React could hydrate.
const poolDatabase =
	process.env.SELENA_RUNTIME_DATABASE_CA_PEM === undefined
		? /* @__PURE__ */ drizzle(legacyDatabaseUrl, { schema })
		: /* @__PURE__ */ drizzle({ connection: runtimeDatabaseConnection(), schema });

export const db = /* @__PURE__ */ tenantAwareDatabase(poolDatabase);
