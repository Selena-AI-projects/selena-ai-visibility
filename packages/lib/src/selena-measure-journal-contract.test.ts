import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptUrl = new URL("../../../apps/worker/src/scripts/measure-journal.ts", import.meta.url);
const entrypointUrl = new URL("../../../apps/worker/src/scripts/measure-journal-entrypoint.ts", import.meta.url);
const scriptPath = fileURLToPath(entrypointUrl);
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const source = readFileSync(scriptUrl, "utf8");
const entrypointSource = readFileSync(entrypointUrl, "utf8");
const canarySource = readFileSync(
	new URL("../../../apps/worker/src/scripts/dataforseo-perplexity-canary.ts", import.meta.url),
	"utf8",
);
const brightDataCanarySource = readFileSync(
	new URL("../../../apps/worker/src/scripts/brightdata-response-canary.ts", import.meta.url),
	"utf8",
);
const workerPackage = JSON.parse(
	readFileSync(new URL("../../../apps/worker/package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };
const publishScriptUrl = new URL("../../../apps/worker/src/scripts/publish-journal.ts", import.meta.url);
const publishScriptPath = fileURLToPath(publishScriptUrl);
const dockerfile = readFileSync(new URL("../../../docker/Dockerfile", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("./selena-visibility-repositories.ts", import.meta.url), "utf8");
const approvedDeploymentEnv = {
	SELENA_MEASUREMENT_ENABLED: "true",
	SELENA_MEASUREMENT_APPROVED_COMMIT_SHA: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	RAILWAY_GIT_COMMIT_SHA: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	SELENA_MEASUREMENT_APPROVED_ENVIRONMENT: "staging",
	RAILWAY_ENVIRONMENT_NAME: "staging",
};

function expectNoProviderCapabilityError(output: string): void {
	expect(output).not.toContain("DATAFORSEO_CREDENTIALS_MISSING");
	expect(output).not.toContain("DataForSEO requires DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD");
	expect(output).not.toContain("DATABASE_URL is required");
}

describe("journal provider stop", () => {
	it("refuses affirmative operator stop values before credentials, database, or provider access", () => {
		const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				...approvedDeploymentEnv,
				SELENA_EMERGENCY_STOP: " yes ",
				SELENA_MEASUREMENT_RUN_MODE: "dataforseo-perplexity-canary",
				SELENA_DATAFORSEO_PERPLEXITY_CANARY_ENABLED: "true",
				SELENA_DATAFORSEO_PERPLEXITY_CANARY_COUNT: "1",
			},
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).not.toBe(0);
		expect(output).toContain("PROVIDER_CALLS_STOPPED");
		expectNoProviderCapabilityError(output);
	}, 15_000);

	it("keeps an enabled auto-deployment closed without exact release approval", () => {
		const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				SELENA_MEASUREMENT_ENABLED: "true",
			},
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(output).toContain("JOURNAL_MEASUREMENT_DEPLOYMENT_NOT_APPROVED");
		expect(output).not.toContain("DATABASE_URL is required");
		expect(output).not.toContain("BRIGHTDATA_API_TOKEN is required");
	}, 15_000);
});

describe("journal measurement run modes", () => {
	it("keeps an approved canary disabled before credential or database access without exact opt-in", () => {
		const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				...approvedDeploymentEnv,
				SELENA_MEASUREMENT_RUN_MODE: "dataforseo-perplexity-canary",
			},
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(output).toContain("DATAFORSEO_PERPLEXITY_CANARY_DISABLED");
		expectNoProviderCapabilityError(output);
	}, 15_000);

	it("keeps the Bright Data response canary disabled before credential access without exact opt-in", () => {
		const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				...approvedDeploymentEnv,
				SELENA_MEASUREMENT_RUN_MODE: "brightdata-response-canary",
			},
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(output).toContain("BRIGHTDATA_RESPONSE_CANARY_DISABLED");
		expect(output).not.toContain("BRIGHTDATA_API_TOKEN_REQUIRED");
		expect(output).not.toContain("DATABASE_URL is required");
	}, 15_000);

	it("keeps the Bright Data persisted canary disabled before credential or database access without exact opt-in", () => {
		const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				...approvedDeploymentEnv,
				SELENA_MEASUREMENT_RUN_MODE: "brightdata-persisted-canary",
			},
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(output).toContain("BRIGHTDATA_PERSISTED_CANARY_DISABLED");
		expect(output).not.toContain("BRIGHTDATA_API_TOKEN is required");
		expect(output).not.toContain("DATABASE_URL is required");
	}, 15_000);

	it.each([
		[
			"BRIGHTDATA_PERSISTED_CANARY_ADAPTER_INVALID",
			{ SELENA_MEASUREMENT_ADAPTER: "branch-c", SELENA_JOURNAL_PROJECTS: "korafoodhall" },
		],
		[
			"BRIGHTDATA_PERSISTED_CANARY_PROJECTS_INVALID",
			{ SELENA_MEASUREMENT_ADAPTER: "brightdata", SELENA_JOURNAL_PROJECTS: "all" },
		],
	])(
		"fails the persisted canary closed on %s before credentials or database access",
		(guard, scopedEnv) => {
			const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
				cwd: repositoryRoot,
				encoding: "utf8",
				env: {
					PATH: process.env.PATH,
					...approvedDeploymentEnv,
					SELENA_MEASUREMENT_RUN_MODE: "brightdata-persisted-canary",
					SELENA_BRIGHTDATA_PERSISTED_CANARY_ENABLED: "true",
					...scopedEnv,
				},
				timeout: 10_000,
			});
			const output = `${result.stdout}\n${result.stderr}`;

			expect(result.error).toBeUndefined();
			expect(result.status).not.toBe(0);
			expect(output).toContain(guard);
			expect(output).not.toContain("BRIGHTDATA_API_TOKEN is required");
			expect(output).not.toContain("DATABASE_URL is required");
		},
		15_000,
	);

	it.each([undefined, "4"])(
		"rejects canary count %s before credential or database access",
		(count) => {
			const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
				cwd: repositoryRoot,
				encoding: "utf8",
				env: {
					PATH: process.env.PATH,
					...approvedDeploymentEnv,
					SELENA_MEASUREMENT_RUN_MODE: "dataforseo-perplexity-canary",
					SELENA_DATAFORSEO_PERPLEXITY_CANARY_ENABLED: "true",
					...(count === undefined ? {} : { SELENA_DATAFORSEO_PERPLEXITY_CANARY_COUNT: count }),
				},
				timeout: 10_000,
			});
			const output = `${result.stdout}\n${result.stderr}`;

			expect(result.error).toBeUndefined();
			expect(result.status).not.toBe(0);
			expect(output).toContain("DATAFORSEO_PERPLEXITY_CANARY_COUNT_INVALID");
			expectNoProviderCapabilityError(output);
		},
		15_000,
	);

	it("fails closed on an unknown approved run mode without importing provider-capable modules", () => {
		const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				...approvedDeploymentEnv,
				SELENA_MEASUREMENT_RUN_MODE: "dataforseo-perplexity-canry",
			},
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(output).toContain("JOURNAL_MEASUREMENT_RUN_MODE_INVALID");
		expectNoProviderCapabilityError(output);
	}, 15_000);

	it("wires the canary through the approved wrapper and worker package script", () => {
		expect(entrypointSource).toContain('import("./dataforseo-perplexity-canary.js")');
		expect(canarySource).toContain("assertMeasurementDeploymentApproved(process.env)");
		expect(canarySource).toContain("createDataForSeoPerplexityAdapter({");
		expect(workerPackage.scripts["canary:dataforseo-perplexity"]).toBe(
			"tsx src/scripts/dataforseo-perplexity-canary.ts",
		);
	});

	it("wires the bounded Bright Data response canary through the approved wrapper", () => {
		expect(entrypointSource).toContain('import("./brightdata-response-canary.js")');
		expect(brightDataCanarySource).toContain("assertMeasurementDeploymentApproved(process.env)");
		expect(brightDataCanarySource).toContain('const CANARY_SYSTEMS = ["chatgpt", "gemini"]');
		expect(brightDataCanarySource).toContain("createBrightDataAdapter({");
		expect(workerPackage.scripts["canary:brightdata-response"]).toBe("tsx src/scripts/brightdata-response-canary.ts");
	});

	it("wires the persisted Bright Data canary through the guarded journal entrypoint", () => {
		expect(entrypointSource).toContain('runMode === "brightdata-persisted-canary"');
		expect(entrypointSource).toContain("SELENA_BRIGHTDATA_PERSISTED_CANARY_ENABLED");
		expect(workerPackage.scripts["canary:brightdata-persisted"]).toContain(
			"tsx src/scripts/measure-journal-entrypoint.ts",
		);
		expect(workerPackage.scripts["canary:brightdata-persisted"]).not.toContain("tsx src/scripts/measure-journal.ts");
	});
});

describe("journal publisher opt-in", () => {
	it("routes the publish image through the guarded entrypoint", () => {
		expect(dockerfile).toContain('CMD ["./node_modules/.bin/tsx", "src/scripts/publish-journal.ts"]');
		expect(dockerfile).not.toContain('CMD ["./node_modules/.bin/tsx", "src/scripts/publish-journal-detail.ts"]');
		expect(dockerfile).not.toContain('CMD ["npx"');
	});

	it("routes the measurement image through its deployment approval wrapper", () => {
		expect(dockerfile).toContain('CMD ["./node_modules/.bin/tsx", "src/scripts/measure-journal-entrypoint.ts"]');
		expect(dockerfile).not.toContain('CMD ["./node_modules/.bin/tsx", "src/scripts/measure-journal.ts"]');
	});

	it.each([undefined, "", "false", "TRUE", "1"])(
		"stops before credentials, database, or GitHub access for %s",
		(value) => {
			const result = spawnSync(process.execPath, ["--import", "tsx", publishScriptPath], {
				cwd: repositoryRoot,
				encoding: "utf8",
				env: {
					PATH: process.env.PATH,
					...(value === undefined ? {} : { SELENA_JOURNAL_PUBLISH_ENABLED: value }),
				},
				timeout: 10_000,
			});
			const output = `${result.stdout}\n${result.stderr}`;

			expect(result.error).toBeUndefined();
			expect(result.status).toBe(0);
			expect(output).toContain("JOURNAL_PUBLISH_DISABLED");
			expect(output).not.toContain("GITHUB_TOKEN is required");
			expect(output).not.toContain("DATABASE_URL is required");
		},
		15_000,
	);

	it("refuses the implementation entrypoint when the guarded wrapper is bypassed", () => {
		const detailScriptPath = fileURLToPath(
			new URL("../../../apps/worker/src/scripts/publish-journal-detail.ts", import.meta.url),
		);
		const result = spawnSync(process.execPath, ["--import", "tsx", detailScriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: { PATH: process.env.PATH },
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).not.toBe(0);
		expect(output).toContain("JOURNAL_PUBLISH_DISABLED");
		expect(output).not.toContain("SELENA_JOURNAL_TENANT is required");
		expect(output).not.toContain("GITHUB_TOKEN is required");
		expect(output).not.toContain("DATABASE_URL is required");
	});

	it("enters the guarded publisher exactly for lowercase true", () => {
		const result = spawnSync(process.execPath, ["--import", "tsx", publishScriptPath], {
			cwd: repositoryRoot,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH,
				SELENA_JOURNAL_PUBLISH_ENABLED: "true",
			},
			timeout: 10_000,
		});
		const output = `${result.stdout}\n${result.stderr}`;

		expect(result.error).toBeUndefined();
		expect(result.status).not.toBe(0);
		expect(output).toContain("SELENA_JOURNAL_TENANT is required");
		expect(output).not.toContain("JOURNAL_PUBLISH_DISABLED");
	});
});

describe("journal durable daily claim", () => {
	it("serializes allocation before provider-capable writes and fails closed on ambiguity", () => {
		const claimStart = source.indexOf("async function acquireDailyClaim");
		const transitionStart = source.indexOf("async function transitionDailyClaim", claimStart);
		const measureStart = source.indexOf("async function measure", transitionStart);
		const allocator = source.slice(claimStart, transitionStart);
		const claimLifecycle = source.slice(claimStart, measureStart);
		const measurement = source.slice(measureStart);
		const advisoryStart = allocator.indexOf("pg_advisory_xact_lock");
		const advisory = allocator.slice(advisoryStart, allocator.indexOf(";", advisoryStart));
		expect(allocator).toContain("db.transaction");
		expect(allocator).toContain("clock_timestamp() AT TIME ZONE 'UTC'");
		expect(allocator).not.toContain(".from(schema.svMeasurementDomains)");
		expect(allocator).toContain("pg_advisory_xact_lock");
		expect(advisory).not.toContain("utcDay");
		expect(allocator).toContain("schema.svJournalDailyClaims");
		expect(allocator).toContain('["CLAIMED", "EXECUTING", "HOLD"]');
		expect(allocator).toContain('kind: "HOLD"');
		expect(allocator).toContain('eq(schema.svJournalDailyClaims.status, "COMPLETED")');
		expect(allocator).toContain("BRIGHTDATA_PERSISTED_CANARY_QUESTION_SET_SUFFIX");
		expect(allocator).toContain("unresolvedQuestionSet");
		expect(allocator).toContain("if (completed && !FORCE)");
		expect(allocator.indexOf("if (completed && !FORCE)")).toBeLessThan(allocator.indexOf("const [prior]"));
		expect(allocator).toContain('event: "JOURNAL_DAILY_CLAIM_CLAIMED"');
		expect(allocator).toContain("recoverJournalDailyClaim");
		expect(allocator).toContain('recovery === "COMPLETED"');
		expect(allocator).toContain("unresolved.questionSetVersion === version && unresolved.utcDay === utcDay");
		expect(allocator).toContain('recovery === "ABANDONED"');
		expect(allocator).not.toContain('status: "ABANDONED"');
		expect(allocator).not.toContain("providerSpendAmbiguous");
		expect(allocator).toContain("forced: FORCE");
		expect(claimLifecycle).not.toContain("new Date()");
		expect(claimLifecycle.match(/updatedAt: sql`clock_timestamp\(\)`/g)?.length).toBeGreaterThanOrEqual(3);
		expect(claimLifecycle).toContain('completedAt: status === "COMPLETED" ? sql`clock_timestamp()` : null');
		expect(measurement.indexOf("await acquireDailyClaim")).toBeLessThan(
			measurement.indexOf("repositories.locks.allocate"),
		);
		expect(measurement).toContain("await linkDailyClaim(claim.id, lock.id)");
		expect(measurement).toContain('await transitionDailyClaim(claim.id, "CLAIMED", "EXECUTING")');
		expect(measurement).toContain("journalClaimId: claim.id");
		expect(source).toContain("isAffirmativeEnvValue(process.env.SELENA_JOURNAL_FORCE)");
		expect(measurement).toContain('outcome.outcome.status !== "SUCCEEDED"');
		expect(measurement).toContain("terminalCycle.completedRuns !== terminalCycle.expectedRuns");
		expect(measurement).toContain("if (providerBoundaryCrossed) await recoverDailyClaim(claim.id)");
		expect(measurement).not.toContain('providerBoundaryCrossed ? "HOLD" : "NO_SPEND"');
		expect(repositorySource).toContain('if (permit.status !== "issued") throw new Error("SELENA_PERMIT_NOT_ISSUED")');
		expect(measurement).toContain('await transitionDailyClaim(claim.id, "EXECUTING", "COMPLETED")');
		expect(source).toContain("JOURNAL_DAILY_CLAIM_" + "$" + "{status}");
		expect(source).toContain("select set_config('app.organization_id'");
		const runClaim = repositorySource.slice(
			repositorySource.indexOf("claim: async ("),
			repositorySource.indexOf("complete: async", repositorySource.indexOf("claim: async (")),
		);
		expect(runClaim).toContain("opts?.journalClaimId");
		expect(runClaim).toContain('eq(schema.svJournalDailyClaims.status, "EXECUTING")');
		expect(runClaim).toContain("SELENA_JOURNAL_DAILY_CLAIM_LEASE_LOST");
		expect(runClaim.indexOf("opts?.journalClaimId")).toBeLessThan(runClaim.indexOf('status: "consumed"'));
		expect(runClaim).toContain("schema.svJournalProviderBoundaries");
		expect(runClaim.indexOf("schema.svJournalProviderBoundaries")).toBeLessThan(runClaim.indexOf("RUN_CLAIMED"));
	});
});

describe("journal Branch C scope", () => {
	it("includes DataForSEO Perplexity in the priced system list", () => {
		const pricedStart = source.indexOf("const priced =");
		const systemsStart = source.indexOf("const systems =", pricedStart);
		const priced = source.slice(pricedStart, systemsStart);

		expect(priced).toContain("dataForSeoSelected");
		expect(priced).toContain("brightDataVisitorSurface.perplexity");
		expect(priced).toContain("DATAFORSEO_PERPLEXITY_PRICE_PER_ANSWER_USD");
	});
});
