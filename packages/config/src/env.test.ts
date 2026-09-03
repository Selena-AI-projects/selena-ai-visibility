import { describe, expect, it } from "vitest";
import { getEnvRequirements, reportUnknownSelenaEnv, requireEnvVars, validateEnvRequirements } from "./env";

// Vars required specifically because the deployment is cloud.
const CLOUD_ONLY_VARS = [
	"APP_URL",
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"RESEND_API_KEY",
	"GOOGLE_CLIENT_ID",
	"GOOGLE_CLIENT_SECRET",
	"RESEND_FROM_EMAIL",
];
// Infra vars every validated mode needs — cloud now among them.
const CLOUD_SHARED_VARS = ["DATABASE_URL", "BETTER_AUTH_SECRET", "SCRAPE_TARGETS", "DEPLOYMENT_MODE"];

describe("cloud env requirements", () => {
	const cloudReqs = getEnvRequirements("cloud");
	const requiredIds = new Set(cloudReqs.map((requirement) => requirement.id));

	it("requires the cloud-specific service credentials", () => {
		for (const name of CLOUD_ONLY_VARS) {
			expect(requiredIds.has(name), `${name} should be required in cloud`).toBe(true);
		}
	});

	it("requires the shared infra vars", () => {
		for (const name of CLOUD_SHARED_VARS) {
			expect(requiredIds.has(name), `${name} should be required in cloud`).toBe(true);
		}
	});

	it("flags every cloud var missing on an empty env", () => {
		const { missing, isValid } = validateEnvRequirements(cloudReqs, {});
		const missingIds = new Set(missing.map((entry) => entry.id));
		for (const name of [...CLOUD_ONLY_VARS, ...CLOUD_SHARED_VARS]) {
			expect(missingIds.has(name), `${name} should be reported missing`).toBe(true);
		}
		expect(isValid).toBe(false);
	});

	it("does not flag the cloud vars once they are set", () => {
		const env: Record<string, string> = {
			DEPLOYMENT_MODE: "cloud",
			DATABASE_URL: "postgres://localhost/elmo",
			BETTER_AUTH_SECRET: "secret",
			SCRAPE_TARGETS: "chatgpt:olostep:online",
			APP_URL: "https://app.elmo.com/",
			STRIPE_SECRET_KEY: "sk_test_x",
			STRIPE_WEBHOOK_SECRET: "whsec_x",
			RESEND_API_KEY: "re_test_x",
			GOOGLE_CLIENT_ID: "test-google-client-id",
			GOOGLE_CLIENT_SECRET: "test-google-client-secret",
			RESEND_FROM_EMAIL: "Elmo <notifications@example.com>",
		};
		const { missing } = validateEnvRequirements(cloudReqs, env);
		const missingIds = new Set(missing.map((entry) => entry.id));
		for (const name of [...CLOUD_ONLY_VARS, ...CLOUD_SHARED_VARS]) {
			expect(missingIds.has(name), `${name} should be satisfied`).toBe(false);
		}
	});
});

describe("ELMO_ENCRYPTION_KEY", () => {
	it("is required by local, which the CLI provisions", () => {
		const ids = new Set(getEnvRequirements("local").map((requirement) => requirement.id));
		expect(ids.has("ELMO_ENCRYPTION_KEY")).toBe(true);
	});

	it("is not required by the modes provisioned out of band", () => {
		for (const mode of ["demo", "whitelabel", "cloud"] as const) {
			const ids = new Set(getEnvRequirements(mode).map((requirement) => requirement.id));
			expect(ids.has("ELMO_ENCRYPTION_KEY"), `${mode} should not require it`).toBe(false);
		}
	});
});

describe("requireEnvVars", () => {
	it("reports every missing required env var at once", () => {
		expect(() =>
			requireEnvVars(["VITE_APP_NAME", "VITE_APP_ICON", "VITE_APP_URL"], { VITE_APP_URL: "https://app.elmo.com" }),
		).toThrow("Missing required environment variables: VITE_APP_NAME, VITE_APP_ICON");
	});

	it("uses the singular message when a single var is missing", () => {
		expect(() => requireEnvVars(["VITE_APP_NAME"], {})).toThrow("Missing required environment variable: VITE_APP_NAME");
	});

	it("returns the resolved values when every var is present", () => {
		const env = { VITE_APP_NAME: "Acme", VITE_APP_URL: "https://app.elmo.com" };
		expect(requireEnvVars(["VITE_APP_NAME", "VITE_APP_URL"], env)).toEqual(env);
	});
});

describe("unrecognised Selena variables", () => {
	it("names a variable nothing reads, with the name it was probably meant to be", () => {
		const lines: string[] = [];
		reportUnknownSelenaEnv({ SELENA_EMERGENCE_STOP: "true" }, (message) => lines.push(message));
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain("SELENA_EMERGENCE_STOP");
		expect(lines[0]).toContain("did you mean SELENA_EMERGENCY_STOP?");
	});

	it("says nothing about the variables the app actually reads", () => {
		const lines: string[] = [];
		reportUnknownSelenaEnv(
			{ SELENA_EMERGENCY_STOP: "true", SELENA_MEASUREMENT_ENABLED: "false", DATABASE_URL: "postgres://x" },
			(message) => lines.push(message),
		);
		expect(lines).toEqual([]);
	});

	// The migration runner has its own settings and is not the app's business.
	it("leaves the migration runner's own settings alone", () => {
		const lines: string[] = [];
		reportUnknownSelenaEnv({ SELENA_MIGRATION_APPROVED_SHA: "c71bf0e" }, (message) => lines.push(message));
		expect(lines).toEqual([]);
	});

	it("reports a name too far from anything known without guessing", () => {
		const lines: string[] = [];
		reportUnknownSelenaEnv({ SELENA_QQQQQQQQQQQQ: "1" }, (message) => lines.push(message));
		expect(lines[0]).not.toContain("did you mean");
	});
});
