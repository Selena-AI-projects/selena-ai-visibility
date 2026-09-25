import { n as __exportAll } from "../_runtime.mjs";
import { r as __exportAll$1 } from "./rolldown-runtime-BXiOSzN2.mjs";
import { t as drizzle } from "../_libs/drizzle-orm.mjs";
import { p as schema_exports } from "./schema-ejW7s7Gs.mjs";
import { t as runtimeDatabaseConnection } from "./postgres-config-IAJOu_38.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/db-DcHqq7B9.js
var db_DcHqq7B9_exports = /* @__PURE__ */ __exportAll({
	n: () => db_exports,
	t: () => db
});
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "fc94dcbe-f239-48e4-b69a-cae783b5dd56", e._sentryDebugIdIdentifier = "sentry-dbid-fc94dcbe-f239-48e4-b69a-cae783b5dd56");
	} catch (e) {}
})();
var db_exports = /* @__PURE__ */ __exportAll$1({ db: () => db });
var legacyDatabaseUrl = process.env.DATABASE_URL;
var db = process.env.SELENA_RUNTIME_DATABASE_CA_PEM === void 0 ? /* @__PURE__ */ drizzle(legacyDatabaseUrl, { schema: schema_exports }) : /* @__PURE__ */ drizzle({
	connection: runtimeDatabaseConnection(),
	schema: schema_exports
});
//#endregion
export { db_DcHqq7B9_exports as n, db as t };

//# sourceMappingURL=db-DcHqq7B9.mjs.map