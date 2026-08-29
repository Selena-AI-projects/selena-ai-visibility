import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { runtimeDatabaseConnection } from "./postgres-config";

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
