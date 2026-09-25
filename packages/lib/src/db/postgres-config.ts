export interface RuntimeDatabaseEnvironment {
	DATABASE_URL?: string;
	SELENA_DATABASE_SURFACE?: string;
	SELENA_WEB_DATABASE_URL?: string;
	SELENA_WORKER_DATABASE_URL?: string;
	SELENA_INTERNAL_DATABASE_URL?: string;
	SELENA_HOSTED?: string;
	SELENA_RUNTIME_DATABASE_CA_PEM?: string;
	SELENA_PGBOSS_OWNER_MANAGED_SCHEMA?: string;
}

export interface RuntimeDatabaseConnection {
	connectionString: string;
	ssl?: {
		ca: string;
		rejectUnauthorized: true;
	};
}

export interface RuntimePgBossSchemaLifecycle {
	createSchema: boolean;
	migrate: boolean;
}

const CERTIFICATE_BLOCK = /-----BEGIN CERTIFICATE-----\n[A-Za-z0-9+/=\n]+-----END CERTIFICATE-----/g;
const CONNECTION_STRING_TLS_OPTIONS = [
	"ssl",
	"sslcert",
	"sslkey",
	"sslmode",
	"sslnegotiation",
	"sslpassword",
	"sslrootcert",
	"uselibpqcompat",
] as const;

function normalizeCertificateBundle(raw: string): string {
	const normalized = raw
		.replaceAll("\\r\\n", "\n")
		.replaceAll("\\n", "\n")
		.replaceAll("\r\n", "\n")
		.split("\n")
		.map((line) => line.trim())
		.join("\n")
		.trim();
	const certificates = normalized.match(CERTIFICATE_BLOCK);
	const remainder = normalized.replace(CERTIFICATE_BLOCK, "").trim();

	if (!certificates?.length || remainder) {
		throw new Error("SELENA_RUNTIME_DATABASE_CA_PEM_INVALID");
	}

	return certificates.join("\n");
}

function withoutConnectionStringTlsOptions(connectionString: string): string {
	let url: URL;
	try {
		url = new URL(connectionString);
	} catch {
		throw new Error("DATABASE_URL_INVALID");
	}

	for (const option of CONNECTION_STRING_TLS_OPTIONS) url.searchParams.delete(option);
	return url.toString();
}

const SURFACE_DATABASE_URL = {
	web: "SELENA_WEB_DATABASE_URL",
	worker: "SELENA_WORKER_DATABASE_URL",
} as const;

/**
 * The connection string for this process. Web and worker connect with their own
 * non-owner roles so row-level security applies to them; only migrations use
 * the table owner in DATABASE_URL. On a hosted runtime a missing role URL is an
 * error rather than a silent fall back to the owner, which would bypass tenant
 * isolation. `DEPLOYMENT_MODE` cannot mark "hosted": Selena runs hosted in local mode.
 */
export function runtimeDatabaseUrl(env: RuntimeDatabaseEnvironment = process.env): string | undefined {
	const hosted = env.SELENA_HOSTED;
	if (hosted !== undefined && hosted !== "true" && hosted !== "false") throw new Error("SELENA_HOSTED_INVALID");

	const surface = env.SELENA_DATABASE_SURFACE;
	if (surface === undefined || surface === "migrate") return env.DATABASE_URL;
	if (surface !== "web" && surface !== "worker") throw new Error("SELENA_DATABASE_SURFACE_INVALID");

	const variable = SURFACE_DATABASE_URL[surface];
	const roleUrl = env[variable];
	if (roleUrl) return roleUrl;
	if (hosted === "true") throw new Error(`${variable}_REQUIRED`);
	return env.DATABASE_URL;
}

export function runtimeDatabaseConnection(env: RuntimeDatabaseEnvironment = process.env): RuntimeDatabaseConnection {
	return databaseConnection(runtimeDatabaseUrl(env), env);
}

/**
 * The connection for operator work that spans every tenant, used only after a
 * platform-admin or ADMIN_API_KEYS check. The web's own role is confined to
 * one tenant, so operators reach the rest through a separate role; the worker
 * and migrations already run with the owner and share their own URL.
 */
export function internalDatabaseUrl(env: RuntimeDatabaseEnvironment = process.env): string | undefined {
	if (env.SELENA_DATABASE_SURFACE !== "web") return runtimeDatabaseUrl(env);
	if (env.SELENA_INTERNAL_DATABASE_URL) return env.SELENA_INTERNAL_DATABASE_URL;
	if (env.SELENA_HOSTED === "true") throw new Error("SELENA_INTERNAL_DATABASE_URL_REQUIRED");
	return env.DATABASE_URL;
}

export function internalDatabaseConnection(env: RuntimeDatabaseEnvironment = process.env): RuntimeDatabaseConnection {
	return databaseConnection(internalDatabaseUrl(env), env);
}

function databaseConnection(
	connectionString: string | undefined,
	env: RuntimeDatabaseEnvironment,
): RuntimeDatabaseConnection {
	if (!connectionString) throw new Error("DATABASE_URL_REQUIRED");

	if (env.SELENA_RUNTIME_DATABASE_CA_PEM === undefined) return { connectionString };

	return {
		connectionString: withoutConnectionStringTlsOptions(connectionString),
		ssl: {
			ca: normalizeCertificateBundle(env.SELENA_RUNTIME_DATABASE_CA_PEM),
			rejectUnauthorized: true,
		},
	};
}

/**
 * Keep clean local/self-hosted installs compatible with pg-boss' normal
 * bootstrap. Hosted non-owner runtimes must opt into an owner-provisioned
 * schema explicitly so a missing or misspelled flag cannot silently change
 * the lifecycle contract.
 */
export function runtimePgBossSchemaLifecycle(
	env: RuntimeDatabaseEnvironment = process.env,
): RuntimePgBossSchemaLifecycle {
	const ownerManaged = env.SELENA_PGBOSS_OWNER_MANAGED_SCHEMA;
	if (ownerManaged === undefined || ownerManaged === "false") return { createSchema: true, migrate: true };
	if (ownerManaged === "true") return { createSchema: false, migrate: false };
	throw new Error("SELENA_PGBOSS_OWNER_MANAGED_SCHEMA_INVALID");
}
