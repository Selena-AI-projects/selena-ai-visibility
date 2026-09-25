//#region node_modules/.nitro/vite/services/ssr/assets/postgres-config-IAJOu_38.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8ab79240-b1d5-45f7-869e-2cc7c3f9aa55", e._sentryDebugIdIdentifier = "sentry-dbid-8ab79240-b1d5-45f7-869e-2cc7c3f9aa55");
	} catch (e) {}
})();
var CERTIFICATE_BLOCK = /-----BEGIN CERTIFICATE-----\n[A-Za-z0-9+/=\n]+-----END CERTIFICATE-----/g;
var CONNECTION_STRING_TLS_OPTIONS = [
	"ssl",
	"sslcert",
	"sslkey",
	"sslmode",
	"sslnegotiation",
	"sslpassword",
	"sslrootcert",
	"uselibpqcompat"
];
function normalizeCertificateBundle(raw) {
	const normalized = raw.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n").replaceAll("\r\n", "\n").split("\n").map((line) => line.trim()).join("\n").trim();
	const certificates = normalized.match(CERTIFICATE_BLOCK);
	const remainder = normalized.replace(CERTIFICATE_BLOCK, "").trim();
	if (!certificates?.length || remainder) throw new Error("SELENA_RUNTIME_DATABASE_CA_PEM_INVALID");
	return certificates.join("\n");
}
function withoutConnectionStringTlsOptions(connectionString) {
	let url;
	try {
		url = new URL(connectionString);
	} catch {
		throw new Error("DATABASE_URL_INVALID");
	}
	for (const option of CONNECTION_STRING_TLS_OPTIONS) url.searchParams.delete(option);
	return url.toString();
}
function runtimeDatabaseConnection(env = process.env) {
	const connectionString = env.DATABASE_URL;
	if (!connectionString) throw new Error("DATABASE_URL_REQUIRED");
	if (env.SELENA_RUNTIME_DATABASE_CA_PEM === void 0) return { connectionString };
	return {
		connectionString: withoutConnectionStringTlsOptions(connectionString),
		ssl: {
			ca: normalizeCertificateBundle(env.SELENA_RUNTIME_DATABASE_CA_PEM),
			rejectUnauthorized: true
		}
	};
}
/**
* Keep clean local/self-hosted installs compatible with pg-boss' normal
* bootstrap. Hosted non-owner runtimes must opt into an owner-provisioned
* schema explicitly so a missing or misspelled flag cannot silently change
* the lifecycle contract.
*/
function runtimePgBossSchemaLifecycle(env = process.env) {
	const ownerManaged = env.SELENA_PGBOSS_OWNER_MANAGED_SCHEMA;
	if (ownerManaged === void 0 || ownerManaged === "false") return {
		createSchema: true,
		migrate: true
	};
	if (ownerManaged === "true") return {
		createSchema: false,
		migrate: false
	};
	throw new Error("SELENA_PGBOSS_OWNER_MANAGED_SCHEMA_INVALID");
}
//#endregion
export { runtimePgBossSchemaLifecycle as n, runtimeDatabaseConnection as t };

//# sourceMappingURL=postgres-config-IAJOu_38.mjs.map