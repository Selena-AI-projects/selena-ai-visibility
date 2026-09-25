import { Client } from "pg";
import { describe, expect, it } from "vitest";
import {
	internalDatabaseUrl,
	runtimeDatabaseConnection,
	runtimeDatabaseUrl,
	runtimePgBossSchemaLifecycle,
} from "./postgres-config";

const CERTIFICATE = ["-----BEGIN CERTIFICATE-----", "QUJDREVGRw==", "-----END CERTIFICATE-----"].join("\n");
const PRIVATE_KEY = ["-----BEGIN ", "PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----"].join("");

describe("runtimeDatabaseConnection", () => {
	it("preserves the existing connection-string-only behavior when no CA is configured", () => {
		expect(runtimeDatabaseConnection({ DATABASE_URL: "postgres://localhost/elmo" })).toEqual({
			connectionString: "postgres://localhost/elmo",
		});
	});

	it("normalizes escaped newlines and requires certificate verification", () => {
		expect(
			runtimeDatabaseConnection({
				DATABASE_URL: "postgres://staging/elmo",
				SELENA_RUNTIME_DATABASE_CA_PEM: CERTIFICATE.replaceAll("\n", "\\n"),
			}),
		).toEqual({
			connectionString: "postgres://staging/elmo",
			ssl: { ca: CERTIFICATE, rejectUnauthorized: true },
		});
	});

	it("accepts a CA bundle containing only PEM certificates", () => {
		const bundle = `${CERTIFICATE}\r\n${CERTIFICATE}`;
		const config = runtimeDatabaseConnection({
			DATABASE_URL: "postgres://staging/elmo",
			SELENA_RUNTIME_DATABASE_CA_PEM: bundle,
		});

		expect(config.ssl).toEqual({ ca: `${CERTIFICATE}\n${CERTIFICATE}`, rejectUnauthorized: true });
	});

	it("prevents DATABASE_URL TLS options from weakening pg certificate verification", () => {
		const config = runtimeDatabaseConnection({
			DATABASE_URL:
				"postgres://staging/elmo?sslmode=no-verify&uselibpqcompat=true&sslrootcert=%2Ftmp%2Fother.pem&application_name=selena",
			SELENA_RUNTIME_DATABASE_CA_PEM: CERTIFICATE,
		});
		const client = new Client(config);
		const connectionParameters = Reflect.get(client, "connectionParameters") as { ssl: unknown };

		expect(config.connectionString).toBe("postgres://staging/elmo?application_name=selena");
		expect(connectionParameters.ssl).toEqual({ ca: CERTIFICATE, rejectUnauthorized: true });
	});

	it.each(["", "not a certificate", `${CERTIFICATE}\n${PRIVATE_KEY}`])("fails closed for invalid CA material", (ca) => {
		expect(() =>
			runtimeDatabaseConnection({
				DATABASE_URL: "postgres://staging/elmo",
				SELENA_RUNTIME_DATABASE_CA_PEM: ca,
			}),
		).toThrow("SELENA_RUNTIME_DATABASE_CA_PEM_INVALID");
	});

	it("requires DATABASE_URL without including its value in the error", () => {
		expect(() => runtimeDatabaseConnection({ SELENA_RUNTIME_DATABASE_CA_PEM: CERTIFICATE })).toThrow(
			"DATABASE_URL_REQUIRED",
		);
	});

	it("fails closed when CA is set with an invalid DATABASE_URL", () => {
		expect(() =>
			runtimeDatabaseConnection({ DATABASE_URL: "not a URL", SELENA_RUNTIME_DATABASE_CA_PEM: CERTIFICATE }),
		).toThrow("DATABASE_URL_INVALID");
	});
});

describe("runtimePgBossSchemaLifecycle", () => {
	it("preserves pg-boss bootstrap for clean local and self-hosted installs", () => {
		expect(runtimePgBossSchemaLifecycle({})).toEqual({ createSchema: true, migrate: true });
		expect(runtimePgBossSchemaLifecycle({ SELENA_PGBOSS_OWNER_MANAGED_SCHEMA: "false" })).toEqual({
			createSchema: true,
			migrate: true,
		});
	});

	it("disables runtime DDL only for an explicit owner-managed schema", () => {
		expect(runtimePgBossSchemaLifecycle({ SELENA_PGBOSS_OWNER_MANAGED_SCHEMA: "true" })).toEqual({
			createSchema: false,
			migrate: false,
		});
	});

	it("fails closed for an ambiguous lifecycle value", () => {
		expect(() => runtimePgBossSchemaLifecycle({ SELENA_PGBOSS_OWNER_MANAGED_SCHEMA: "TRUE" })).toThrow(
			"SELENA_PGBOSS_OWNER_MANAGED_SCHEMA_INVALID",
		);
	});
});

describe("runtimeDatabaseUrl", () => {
	const owner = "postgres://owner@db/elmo";
	const web = "postgres://selena_app@db/elmo";
	const worker = "postgres://selena_worker@db/elmo";

	it("keeps the owner connection for migrations and processes that name no surface", () => {
		expect(runtimeDatabaseUrl({ DATABASE_URL: owner, SELENA_WEB_DATABASE_URL: web })).toBe(owner);
		expect(runtimeDatabaseUrl({ DATABASE_URL: owner, SELENA_DATABASE_SURFACE: "migrate", SELENA_HOSTED: "true" })).toBe(
			owner,
		);
	});

	it("connects web and worker with their own roles", () => {
		const env = { DATABASE_URL: owner, SELENA_WEB_DATABASE_URL: web, SELENA_WORKER_DATABASE_URL: worker };
		expect(runtimeDatabaseUrl({ ...env, SELENA_DATABASE_SURFACE: "web" })).toBe(web);
		expect(runtimeDatabaseUrl({ ...env, SELENA_DATABASE_SURFACE: "worker" })).toBe(worker);
		expect(runtimeDatabaseConnection({ ...env, SELENA_DATABASE_SURFACE: "web" }).connectionString).toBe(web);
	});

	it("refuses to fall back to the owner on a hosted runtime", () => {
		expect(() =>
			runtimeDatabaseUrl({ DATABASE_URL: owner, SELENA_DATABASE_SURFACE: "web", SELENA_HOSTED: "true" }),
		).toThrow("SELENA_WEB_DATABASE_URL_REQUIRED");
		expect(() =>
			runtimeDatabaseUrl({ DATABASE_URL: owner, SELENA_DATABASE_SURFACE: "worker", SELENA_HOSTED: "true" }),
		).toThrow("SELENA_WORKER_DATABASE_URL_REQUIRED");
	});

	it("falls back to DATABASE_URL on a local install without a role URL", () => {
		expect(runtimeDatabaseUrl({ DATABASE_URL: owner, SELENA_DATABASE_SURFACE: "web" })).toBe(owner);
	});

	it("rejects a misspelled surface or hosted flag instead of guessing", () => {
		expect(() => runtimeDatabaseUrl({ DATABASE_URL: owner, SELENA_DATABASE_SURFACE: "webb" })).toThrow(
			"SELENA_DATABASE_SURFACE_INVALID",
		);
		expect(() => runtimeDatabaseUrl({ DATABASE_URL: owner, SELENA_HOSTED: "yes" })).toThrow("SELENA_HOSTED_INVALID");
	});
});

describe("internalDatabaseUrl", () => {
	const owner = "postgres://owner@db/elmo";
	const web = "postgres://selena_app@db/elmo";
	const internal = "postgres://selena_internal@db/elmo";

	it("gives web operator views their own connection rather than the tenant role", () => {
		expect(
			internalDatabaseUrl({
				DATABASE_URL: owner,
				SELENA_DATABASE_SURFACE: "web",
				SELENA_WEB_DATABASE_URL: web,
				SELENA_INTERNAL_DATABASE_URL: internal,
			}),
		).toBe(internal);
	});

	it("refuses to fall back to the owner for hosted web operator views", () => {
		expect(() =>
			internalDatabaseUrl({
				DATABASE_URL: owner,
				SELENA_DATABASE_SURFACE: "web",
				SELENA_WEB_DATABASE_URL: web,
				SELENA_HOSTED: "true",
			}),
		).toThrow("SELENA_INTERNAL_DATABASE_URL_REQUIRED");
	});

	it("uses the process's own connection outside the web", () => {
		expect(internalDatabaseUrl({ DATABASE_URL: owner })).toBe(owner);
		expect(internalDatabaseUrl({ DATABASE_URL: owner, SELENA_DATABASE_SURFACE: "web" })).toBe(owner);
	});

	it("gives a non-owner worker the operator connection for platform-wide reads", () => {
		expect(internalDatabaseUrl({ DATABASE_URL: web, SELENA_INTERNAL_DATABASE_URL: internal })).toBe(internal);
		expect(
			internalDatabaseUrl({
				DATABASE_URL: owner,
				SELENA_DATABASE_SURFACE: "worker",
				SELENA_WORKER_DATABASE_URL: web,
				SELENA_INTERNAL_DATABASE_URL: internal,
			}),
		).toBe(internal);
	});

	it("keeps migrations on their own connection even when an operator URL is set", () => {
		expect(
			internalDatabaseUrl({
				DATABASE_URL: owner,
				SELENA_DATABASE_SURFACE: "migrate",
				SELENA_INTERNAL_DATABASE_URL: internal,
			}),
		).toBe(owner);
	});
});
