export interface RuntimeDatabaseEnvironment {
	DATABASE_URL?: string;
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

export function runtimeDatabaseConnection(env: RuntimeDatabaseEnvironment = process.env): RuntimeDatabaseConnection {
	const connectionString = env.DATABASE_URL;
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
