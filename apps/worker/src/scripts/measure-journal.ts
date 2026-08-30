/**
 * Measures the owner's own projects where the product runs.
 *
 * This is the same chain a paid order takes — configuration lock, order, run
 * permits, the executor, the evidence ledger — driven from a command instead of
 * from the order desk, because the projects being measured are the owner's own
 * and the decision to spend is the act of running it.
 *
 * It exists to get off a CI runner. A runner is billed by the wall clock and
 * spends nearly all of it idle, waiting on a collector to think: the answers
 * cost about ninety cents and the machine that waited for them cost six
 * dollars. Here the compute is already paid for and already running.
 *
 * It is not a scheduler. Nothing calls it on a timer, one invocation measures
 * the projects named in one variable, and it refuses to start without a spend
 * ceiling it can check before the first request.
 *
 * Usage:
 *   DATABASE_URL=postgres://... BRIGHTDATA_API_TOKEN=... \
 *   SELENA_MEASUREMENT_ENABLED=true SELENA_MEASUREMENT_ADAPTER=brightdata \
 *   SELENA_JOURNAL_TENANT=<organization id> \
 *   SELENA_JOURNAL_PROJECTS=korafoodhall SELENA_JOURNAL_MAX_COST_USD=0.5 \
 *   pnpm -C apps/worker exec tsx src/scripts/measure-journal.ts
 */

import { brightDataVisitorSurface, createBrightDataAdapter } from "@workspace/lib/adapters/brightdata";
import { apiModelIds, createOpenRouterAdapter } from "@workspace/lib/adapters/openrouter";
import { db } from "@workspace/lib/db/db";
import * as schema from "@workspace/lib/db/schema";
import { createSelenaMeasurementResolvers, lockedProfileBlock } from "@workspace/lib/selena-extraction-context";
import { journalScenario, journalScenarioSlugs } from "@workspace/lib/selena-journal-scenarios";
import type { SelenaMeasurementAdapter } from "@workspace/lib/selena-measurement";
import {
	measurementAdapterNamesFor,
	measurementConfigFromEnv,
	runMeasurementForPermit,
} from "@workspace/lib/selena-run-executor";
import { createSelenaRepositories, type SelenaRepositoryContext } from "@workspace/lib/selena-visibility-repositories";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

/** What Bright Data's pricing page showed per answer; the ceiling is checked against it. */
const PRICE_PER_ANSWER_USD = 0.0015;

/**
 * An API View answer is bought by the token and costs more than a scraped one,
 * so the ceiling has to price the two channels apart. This is the contract's
 * conservative estimate rather than a measured figure: the ceiling exists to
 * refuse a run before it spends, and an estimate that runs low would not.
 */
const API_PRICE_PER_ANSWER_USD = 0.005;

/** The collector is the bottleneck and it is patient, so many can wait at once. */
// Bright Data's own scrape call can take well past a minute per question, and
// under concurrent load a snapshot has been observed not to become ready
// within the adapter's 5-minute default poll window — every permit sent that
// way was recorded as MALFORMED_RESPONSE (2026-08-29 run: 0 valid of 200).
// A gentler pace keeps each call inside that window.
const CONCURRENCY = 3;

const BRIGHTDATA_ENDPOINT = "https://api.brightdata.com/datasets/v3/scrape";
const BRIGHTDATA_SURFACES = ["chatgpt", "gemini", "perplexity"] as const;
const BRIGHTDATA_DATASET_IDS: Record<(typeof BRIGHTDATA_SURFACES)[number], string> = {
	chatgpt: "gd_m7aof0k82r803d5bjm",
	gemini: "gd_mbz66arm2mf9cu856y",
	perplexity: "gd_m7dhdot1vw9a7gc1n",
};

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		console.error(`${name} is required`);
		process.exit(2);
	}
	return value;
}

const DATABASE_URL = required("DATABASE_URL");
const apiKey = required("BRIGHTDATA_API_TOKEN");
const tenantId = required("SELENA_JOURNAL_TENANT");
const maxCostUsd = Number(required("SELENA_JOURNAL_MAX_COST_USD"));
if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) {
	console.error("SELENA_JOURNAL_MAX_COST_USD must be a positive number");
	process.exit(2);
}
void DATABASE_URL;

const config = measurementConfigFromEnv(process.env);
if (!config.enabled) {
	console.error("SELENA_MEASUREMENT_ENABLED must be true — this spends money on the Bright Data account");
	process.exit(2);
}

const requested = (process.env.SELENA_JOURNAL_PROJECTS ?? "").trim();
const slugs =
	requested === "" || requested === "all" ? journalScenarioSlugs : requested.split(",").map((s) => s.trim());
const unknown = slugs.filter((slug) => !journalScenarioSlugs.includes(slug));
if (unknown.length > 0) {
	console.error(`Unknown project(s): ${unknown.join(", ")}. Known: ${journalScenarioSlugs.join(", ")}`);
	process.exit(2);
}

/** Repeating a same-day measurement is deliberate, never a restart's doing. */
const FORCE = process.env.SELENA_JOURNAL_FORCE === "1";

const ctx: SelenaRepositoryContext = {
	actorId: "selena-measure-journal",
	tenantId,
	role: "owner",
	authType: "session",
	permissions: ["client:write"],
};

const repositories = createSelenaRepositories(db);
const resolvers = createSelenaMeasurementResolvers(db);

/** Only the surfaces the configured name can actually route to are built. */
const selected = new Set(measurementAdapterNamesFor(config.adapter));
const adapters: Record<string, SelenaMeasurementAdapter> = Object.fromEntries(
	BRIGHTDATA_SURFACES.filter((surface) => selected.has(`brightdata-${surface}`)).map((surface) => [
		`brightdata-${surface}`,
		createBrightDataAdapter({
			apiKey,
			endpoint: BRIGHTDATA_ENDPOINT,
			datasetId:
				process.env[`SELENA_BRIGHTDATA_DATASET_${surface.toUpperCase()}`]?.trim() || BRIGHTDATA_DATASET_IDS[surface],
			system: surface,
			fetchImpl: fetch,
			resolveScenarioText: resolvers.resolveScenarioText,
			resolveExtractionContext: resolvers.resolveExtractionContext,
			// Default is 5 minutes; the 2026-08-29 run showed snapshots still
			// running past that under concurrent load, so every call in it was
			// lost as MALFORMED_RESPONSE despite Bright Data having produced
			// (and billed) an answer. Doubled here rather than left unbounded.
			snapshotTimeoutMs: 10 * 60 * 1000,
		}),
	]),
);
if (selected.has("openrouter")) {
	// The family routes all five API models to one adapter name, but an
	// OpenRouter adapter is built around a single model. So the registered
	// adapter is a dispatcher: it reads the model off the permit it was given
	// and hands the call to that model's adapter. Choosing by permit is the
	// same rule the executor uses to choose the adapter itself — the sold
	// system decides, never a service-wide setting.
	const openRouterKey = required("OPENROUTER_API_KEY");
	const byModel = new Map<string, SelenaMeasurementAdapter>(
		apiModelIds.map((model: string) => [
			model,
			createOpenRouterAdapter({
				apiKey: openRouterKey,
				model,
				fetchImpl: fetch,
				resolveScenarioText: resolvers.resolveScenarioText,
				resolveExtractionContext: resolvers.resolveExtractionContext,
			}),
		]),
	);
	const first = byModel.get(apiModelIds[0]);
	if (!first) throw new Error("SELENA_API_MODELS_EMPTY");
	adapters.openrouter = {
		channel: first.channel,
		measure: (permit) => first.measure(permit),
		execute: (permit) => {
			const adapter = permit.systemId ? byModel.get(permit.systemId) : undefined;
			// A permit whose system has no model is refused rather than measured
			// by whichever model happens to be first: the wrong model's answer
			// stored under the right name is worse than no answer.
			if (!adapter) throw new Error(`SELENA_API_MODEL_UNKNOWN: ${permit.systemId ?? "null"}`);
			return adapter.execute(permit);
		},
	};
}
if (Object.keys(adapters).length === 0) {
	console.error(`SELENA_MEASUREMENT_ADAPTER=${config.adapter} reaches no Visitor View collector`);
	process.exit(2);
}

/** Find the project by the name this script gives it, or make it. */
async function projectFor(slug: string) {
	const scenario = journalScenario(slug);
	const existing = (await repositories.projects.list(ctx)).find((project) => project.name === scenario.brand);
	const project =
		existing ??
		(await repositories.projects.create(ctx, {
			name: scenario.brand,
			category: "journal",
			country: "ID",
			region: scenario.market,
			languages: [scenario.language],
		}));
	// Confirmed every time: the profile is what extraction reads, and a set
	// whose questions changed must not be measured against a stale brand.
	await repositories.profiles.confirm(ctx, {
		projectId: project.id,
		brandName: scenario.brand,
		primaryDomain: `https://${scenario.site}`,
		publicProfiles: [],
		competitorSnapshot: [],
		scenarioSnapshot: scenario.questions.map((text) => ({ text, language: scenario.language })),
	});
	return { project, scenario };
}

/** The question rows, approved. Idempotent by text, so a re-run adds only what is new. */
async function scenarioRowsFor(projectId: string, slug: string) {
	const scenario = journalScenario(slug);
	const [existingFamily] = await db
		.select({ id: schema.svPromptFamilies.id })
		.from(schema.svPromptFamilies)
		.where(
			and(
				eq(schema.svPromptFamilies.projectId, projectId),
				eq(schema.svPromptFamilies.organizationId, tenantId),
				eq(schema.svPromptFamilies.source, scenario.version),
			),
		)
		.limit(1);
	const family =
		existingFamily ??
		(await repositories.families.create(ctx, {
			projectId,
			intentType: "discovery",
			// The version is the family's identity: a new question set is a new
			// series, never more rows on the old one.
			source: scenario.version,
			status: "APPROVED",
		}));

	const existing = await repositories.scenarios.list(ctx, family.id);
	const known = new Map(existing.map((row) => [row.text, row]));
	const rows = [];
	for (const text of scenario.questions) {
		const row =
			known.get(text) ??
			(await repositories.scenarios.create(ctx, {
				familyId: family.id,
				text,
				language: scenario.language,
				status: "APPROVED",
			}));
		rows.push(row);
	}
	return rows;
}

async function inPool<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = [];
	for (let index = 0; index < items.length; index += size) {
		results.push(...(await Promise.all(items.slice(index, index + size).map(worker))));
	}
	return results;
}

type DailyClaimDecision =
	| { kind: "CLAIMED"; id: string; attempt: number; utcDay: string }
	| { kind: "ALREADY_COMPLETED"; attempt: number; utcDay: string }
	| { kind: "HOLD"; attempt: number; status: string; utcDay: string };

/**
 * Claim one project/version/UTC-day before any provider-capable chain exists.
 *
 * The transaction-scoped advisory lock makes allocation deterministic; the
 * unique database identity makes it durable. A CLAIMED or HOLD row is treated
 * as ambiguous spend and blocks even FORCE. FORCE may only allocate the next
 * attempt after the prior attempt is proven COMPLETED.
 */
async function acquireDailyClaim(projectId: string, version: string): Promise<DailyClaimDecision> {
	return db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.organization_id', ${tenantId}, true)`);
		const clockResult = await tx.execute(sql`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date::text AS utc_day`);
		const clock = clockResult.rows?.[0] as { utc_day?: string } | undefined;
		if (!clock?.utc_day) throw new Error("SELENA_JOURNAL_DATABASE_CLOCK_UNAVAILABLE");
		const utcDay = clock.utc_day;
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended('selena-journal:' || ${tenantId} || ':' || ${projectId}::text, 0))`,
		);
		const [unresolved] = await tx
			.select({
				attempt: schema.svJournalDailyClaims.attempt,
				status: schema.svJournalDailyClaims.status,
				utcDay: schema.svJournalDailyClaims.utcDay,
			})
			.from(schema.svJournalDailyClaims)
			.where(
				and(
					eq(schema.svJournalDailyClaims.organizationId, tenantId),
					eq(schema.svJournalDailyClaims.projectId, projectId),
					inArray(schema.svJournalDailyClaims.status, ["CLAIMED", "EXECUTING", "HOLD"]),
				),
			)
			.orderBy(desc(schema.svJournalDailyClaims.utcDay), desc(schema.svJournalDailyClaims.attempt))
			.limit(1);
		if (unresolved) {
			return {
				kind: "HOLD",
				attempt: unresolved.attempt,
				status: unresolved.status,
				utcDay: unresolved.utcDay,
			};
		}
		const [completed] = await tx
			.select({ attempt: schema.svJournalDailyClaims.attempt })
			.from(schema.svJournalDailyClaims)
			.where(
				and(
					eq(schema.svJournalDailyClaims.organizationId, tenantId),
					eq(schema.svJournalDailyClaims.projectId, projectId),
					eq(schema.svJournalDailyClaims.questionSetVersion, version),
					eq(schema.svJournalDailyClaims.utcDay, utcDay),
					eq(schema.svJournalDailyClaims.status, "COMPLETED"),
				),
			)
			.orderBy(desc(schema.svJournalDailyClaims.attempt))
			.limit(1);

		if (completed && !FORCE) return { kind: "ALREADY_COMPLETED", attempt: completed.attempt, utcDay };

		const [prior] = await tx
			.select({ attempt: schema.svJournalDailyClaims.attempt, status: schema.svJournalDailyClaims.status })
			.from(schema.svJournalDailyClaims)
			.where(
				and(
					eq(schema.svJournalDailyClaims.organizationId, tenantId),
					eq(schema.svJournalDailyClaims.projectId, projectId),
					eq(schema.svJournalDailyClaims.questionSetVersion, version),
					eq(schema.svJournalDailyClaims.utcDay, utcDay),
				),
			)
			.orderBy(desc(schema.svJournalDailyClaims.attempt))
			.limit(1);

		const attempt = (prior?.attempt ?? 0) + 1;
		const [claim] = await tx
			.insert(schema.svJournalDailyClaims)
			.values({
				organizationId: tenantId,
				projectId,
				questionSetVersion: version,
				utcDay,
				attempt,
				status: "CLAIMED",
			})
			.returning({ id: schema.svJournalDailyClaims.id });
		if (!claim) throw new Error("SELENA_JOURNAL_DAILY_CLAIM_FAILED");
		await tx.insert(schema.svAuditEvents).values({
			organizationId: tenantId,
			actorId: ctx.actorId,
			event: "JOURNAL_DAILY_CLAIM_CLAIMED",
			subjectKind: "journal_daily_claim",
			subjectId: claim.id,
			details: { questionSetVersion: version, utcDay, attempt, forced: FORCE },
		});
		return { kind: "CLAIMED", id: claim.id, attempt, utcDay };
	});
}

async function linkDailyClaim(claimId: string, configurationLockId: string): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.organization_id', ${tenantId}, true)`);
		const [linked] = await tx
			.update(schema.svJournalDailyClaims)
			.set({ configurationLockId, updatedAt: sql`CURRENT_TIMESTAMP` })
			.where(
				and(
					eq(schema.svJournalDailyClaims.id, claimId),
					eq(schema.svJournalDailyClaims.organizationId, tenantId),
					eq(schema.svJournalDailyClaims.status, "CLAIMED"),
					sql`${schema.svJournalDailyClaims.configurationLockId} IS NULL`,
				),
			)
			.returning({ id: schema.svJournalDailyClaims.id });
		if (!linked) throw new Error("SELENA_JOURNAL_DAILY_CLAIM_LINK_CONFLICT");
	});
}

async function transitionDailyClaim(
	claimId: string,
	fromStatus: "CLAIMED" | "EXECUTING",
	status: "EXECUTING" | "NO_SPEND" | "HOLD" | "COMPLETED",
): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.organization_id', ${tenantId}, true)`);
		const [settled] = await tx
			.update(schema.svJournalDailyClaims)
			.set({
				status,
				completedAt: status === "COMPLETED" ? sql`CURRENT_TIMESTAMP` : null,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(
				and(
					eq(schema.svJournalDailyClaims.id, claimId),
					eq(schema.svJournalDailyClaims.organizationId, tenantId),
					eq(schema.svJournalDailyClaims.status, fromStatus),
				),
			)
			.returning({ id: schema.svJournalDailyClaims.id });
		if (!settled) throw new Error("SELENA_JOURNAL_DAILY_CLAIM_SETTLEMENT_CONFLICT");
		await tx.insert(schema.svAuditEvents).values({
			organizationId: tenantId,
			actorId: ctx.actorId,
			event: `JOURNAL_DAILY_CLAIM_${status}`,
			subjectKind: "journal_daily_claim",
			subjectId: claimId,
			details: { fromStatus, toStatus: status },
		});
	});
}

async function measure(slug: string): Promise<void> {
	const { project, scenario } = await projectFor(slug);
	const rows = await scenarioRowsFor(project.id, slug);
	// The surfaces the collectors are pointed at, under the names the catalog
	// sells them as — the adapter's own map, so the two cannot drift apart.
	const systems = [
		...BRIGHTDATA_SURFACES.map((surface) => ({
			systemId: brightDataVisitorSurface[surface],
			channel: "VISITOR" as const,
		})),
		...(selected.has("openrouter")
			? apiModelIds.map((model: string) => ({ systemId: model, channel: "API" as const }))
			: []),
	];
	const expectedRuns = rows.length * systems.length;
	// Priced per channel: an API answer is bought by the token and a scraped one
	// by the request, and one rate over both would under-price whichever is
	// dearer — which is the direction that matters for a ceiling.
	const cost = systems.reduce(
		(total, system) =>
			total + rows.length * (system.channel === "API" ? API_PRICE_PER_ANSWER_USD : PRICE_PER_ANSWER_USD),
		0,
	);
	if (cost > maxCostUsd) {
		console.error(
			`${slug}: ${expectedRuns} answers cost about $${cost.toFixed(4)}, ceiling is $${maxCostUsd.toFixed(4)}`,
		);
		process.exitCode = 1;
		return;
	}
	const claim = await acquireDailyClaim(project.id, scenario.version);
	if (claim.kind === "ALREADY_COMPLETED") {
		console.log(
			`${scenario.brand}: already measured on ${claim.utcDay} attempt ${claim.attempt} — set SELENA_JOURNAL_FORCE=1 to repeat`,
		);
		return;
	}
	if (claim.kind === "HOLD") {
		throw new Error(
			`SELENA_JOURNAL_DAILY_CLAIM_HOLD: ${claim.utcDay} attempt ${claim.attempt} is ${claim.status}; inspect spend evidence before any repeat`,
		);
	}

	console.log(`\n${scenario.brand} — ${rows.length} questions × ${systems.length} systems (~$${cost.toFixed(4)})`);
	if (scenario.ownership === "third-party") {
		console.log(
			scenario.consent
				? `  third-party: publishable — ${scenario.consent.grantedBy} agreed on ${scenario.consent.recordedOn}`
				: "  third-party: measurable, but not publishable without that owner's recorded yes",
		);
	}

	let providerBoundaryCrossed = false;
	try {
		const profile = await repositories.profiles.get(ctx, project.id);
		if (!profile) throw new Error(`SELENA_PROFILE_MISSING: ${slug}`);
		const lock = await repositories.locks.allocate(ctx, {
			projectId: project.id,
			snapshot: {
				measurementScope: { scenarios: rows.map((row) => row.id), systems, repeats: 1 },
				// Frozen with the scope so a later profile edit cannot change what
				// this measurement is read against.
				profile: lockedProfileBlock(profile),
				questionSetVersion: scenario.version,
				journalClaim: { id: claim.id, utcDay: claim.utcDay, attempt: claim.attempt },
			},
			engineSha: scenario.version,
			expectedRuns,
			budgetCap: String(maxCostUsd),
		});
		await linkDailyClaim(claim.id, lock.id);
		const quote = await repositories.quotes.create(ctx, {
			projectId: project.id,
			lockId: lock.id,
			status: "ACCEPTED",
			priceAmount: "0",
			currency: "USD",
			expectedRuns,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
		});
		const order = await repositories.orders.create(ctx, {
			projectId: project.id,
			quoteId: quote.id,
			lockId: lock.id,
			orderCap: String(maxCostUsd),
		});
		// The owner measuring her own projects: there is no customer payment to
		// record, and running this command is the decision the desk would ask for.
		await db.update(schema.svOrders).set({ status: "PAID_REVIEW_REQUIRED" }).where(eq(schema.svOrders.id, order.id));

		const dispatch = await repositories.dispatch.createPermits(ctx, order.id, {
			approval: {
				fromStatus: "PAID_REVIEW_REQUIRED",
				auditEvent: "ORDER_APPROVED",
				auditDetails: {
					source: "selena-measure-journal",
					slug,
					questionSetVersion: scenario.version,
					journalClaim: { id: claim.id, utcDay: claim.utcDay, attempt: claim.attempt },
				},
			},
		});

		providerBoundaryCrossed = true;
		await transitionDailyClaim(claim.id, "CLAIMED", "EXECUTING");
		let done = 0;
		const outcomes = await inPool(dispatch.permits, CONCURRENCY, async (permit) => {
			const result = await runMeasurementForPermit({
				permitId: permit.id,
				ctx,
				store: repositories.runs,
				adapters,
				config,
			});
			done += 1;
			if (done % CONCURRENCY === 0 || done === dispatch.permits.length) {
				console.log(`  ${done}/${dispatch.permits.length}`);
			}
			return result;
		});

		const failed = outcomes.filter(
			(outcome) => outcome.status !== "completed" || outcome.outcome.status !== "SUCCEEDED",
		).length;
		const { rows: ledger, mentions } = await repositories.runs.ledgerForCycle(ctx, dispatch.cycleId);
		const [terminalCycle] = await db
			.select({
				status: schema.svCycles.status,
				expectedRuns: schema.svCycles.expectedRuns,
				completedRuns: schema.svCycles.completedRuns,
			})
			.from(schema.svCycles)
			.where(and(eq(schema.svCycles.id, dispatch.cycleId), eq(schema.svCycles.organizationId, tenantId)))
			.limit(1);
		const valid = ledger.filter((row) => row.validity === "VALID").length;
		console.log(
			`  cycle ${dispatch.cycleId}: ${valid} valid of ${dispatch.permits.length} asked, ${mentions.length} mention rows` +
				(failed > 0 ? `, ${failed} did not complete` : ""),
		);
		// Coverage before conclusions: a rate over a fraction of the sample is a
		// different number wearing the same sign.
		if (valid / dispatch.permits.length < 0.8) {
			console.log("  coverage below four fifths — read the counts, not a rate");
		}
		if (
			failed > 0 ||
			ledger.length !== dispatch.permits.length ||
			!terminalCycle ||
			!(["QC_REQUIRED", "READY"] as const).includes(terminalCycle.status as "QC_REQUIRED" | "READY") ||
			terminalCycle.expectedRuns !== dispatch.permits.length ||
			terminalCycle.completedRuns !== terminalCycle.expectedRuns
		) {
			throw new Error(
				`SELENA_JOURNAL_INCOMPLETE_CYCLE: outcomes=${dispatch.permits.length - failed}/${dispatch.permits.length}, ledger=${ledger.length}, cycle=${terminalCycle?.completedRuns ?? "missing"}/${terminalCycle?.expectedRuns ?? "missing"} ${terminalCycle?.status ?? "missing"}`,
			);
		}
		await transitionDailyClaim(claim.id, "EXECUTING", "COMPLETED");
	} catch (error) {
		try {
			await transitionDailyClaim(
				claim.id,
				providerBoundaryCrossed ? "EXECUTING" : "CLAIMED",
				providerBoundaryCrossed ? "HOLD" : "NO_SPEND",
			);
		} catch (settlementError) {
			console.error(
				`${slug}: daily claim remains fail-closed after settlement error: ${settlementError instanceof Error ? settlementError.message : String(settlementError)}`,
			);
		}
		throw error;
	}
}

async function main(): Promise<void> {
	console.log(`Measuring ${slugs.length} project(s) through ${Object.keys(adapters).join(", ")}`);
	for (const slug of slugs) {
		try {
			await measure(slug);
		} catch (error) {
			console.error(`${slug}: ${error instanceof Error ? error.message : String(error)}`);
			process.exitCode = 1;
		}
	}
}

main().then(
	() => process.exit(process.exitCode ?? 0),
	(error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	},
);
