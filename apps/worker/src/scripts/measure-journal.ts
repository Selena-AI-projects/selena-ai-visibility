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
import { apiModelIds, createOpenRouterFamilyAdapter } from "@workspace/lib/adapters/openrouter";
import { db } from "@workspace/lib/db/db";
import * as schema from "@workspace/lib/db/schema";
import { assertGlobalProviderStop } from "@workspace/lib/run-policy";
import { createSelenaMeasurementResolvers, lockedProfileBlock } from "@workspace/lib/selena-extraction-context";
import { journalScenario, journalScenarioSlugs } from "@workspace/lib/selena-journal-scenarios";
import type { SelenaMeasurementAdapter } from "@workspace/lib/selena-measurement";
import {
	isAffirmativeEnvValue,
	measurementAdapterNamesFor,
	measurementConfigFromEnv,
	runMeasurementForPermit,
} from "@workspace/lib/selena-run-executor";
import { createSelenaRepositories, type SelenaRepositoryContext } from "@workspace/lib/selena-visibility-repositories";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

assertGlobalProviderStop(process.env);

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
// The pace that lost the 2026-08-29 run — 0 valid of 200, every permit
// MALFORMED_RESPONSE — was concurrency against a 5-minute poll window: the
// snapshots were produced and billed, and the adapter gave up before they were
// ready. The window is 15 minutes below, and no observed answer has come close
// to it, so the ceiling rises by one step rather than to whatever the account
// might bear. Raise it again only against a run that stayed valid at this one.
const CONCURRENCY = 6;

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
const FORCE = isAffirmativeEnvValue(process.env.SELENA_JOURNAL_FORCE);

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
			collectionMode: surface === "perplexity" ? "trigger" : "scrape",
			fetchImpl: fetch,
			resolveScenarioText: resolvers.resolveScenarioText,
			resolveExtractionContext: resolvers.resolveExtractionContext,
			// ChatGPT and Gemini wait 15 minutes for this bounded journal run: a
			// snapshot slowed by the wider concurrency above is still a produced and
			// billed answer, and timing it out buys nothing back. Perplexity is
			// exempt: its collector has taken ~16 minutes on this account, so it
			// keeps the adapter's 25-minute surface deadline — and one non-succeeded
			// Perplexity run stops the whole cycle.
			...(surface === "perplexity" ? {} : { snapshotTimeoutMs: 15 * 60 * 1000 }),
		}),
	]),
);
if (selected.has("openrouter")) {
	adapters.openrouter = createOpenRouterFamilyAdapter({
		apiKey: required("OPENROUTER_API_KEY"),
		fetchImpl: fetch,
		resolveScenarioText: resolvers.resolveScenarioText,
		resolveExtractionContext: resolvers.resolveExtractionContext,
	});
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

/**
 * A slot frees the moment its own answer lands, not when its neighbours do.
 * In fixed batches one Perplexity call — routinely a quarter of an hour — held
 * the other slots idle until it returned, so the run moved at the speed of its
 * slowest answer rather than its own concurrency.
 */
async function inPool<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	async function drain(): Promise<void> {
		for (let index = next++; index < items.length; index = next++) {
			const item = items[index];
			if (item === undefined) return;
			results[index] = await worker(item);
		}
	}
	await Promise.all(Array.from({ length: Math.min(size, items.length) }, drain));
	return results;
}

type DailyClaimDecision =
	| { kind: "CLAIMED"; id: string; attempt: number; utcDay: string; abandonedAttempt?: number }
	| { kind: "ALREADY_COMPLETED"; attempt: number; utcDay: string }
	| { kind: "HOLD"; id: string; attempt: number; status: string; utcDay: string };

const CLAIM_LEASE_MINUTES = 45;

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
				id: schema.svJournalDailyClaims.id,
				attempt: schema.svJournalDailyClaims.attempt,
				configurationLockId: schema.svJournalDailyClaims.configurationLockId,
				status: schema.svJournalDailyClaims.status,
				utcDay: schema.svJournalDailyClaims.utcDay,
				updatedAt: schema.svJournalDailyClaims.updatedAt,
				stale: sql<boolean>`${schema.svJournalDailyClaims.updatedAt} <= CURRENT_TIMESTAMP - interval '45 minutes'`,
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
		let abandonedAttempt: number | undefined;
		if (unresolved?.stale) {
			const [spendEvidence] = unresolved.configurationLockId
				? await tx
						.select({
							recordedRuns: sql<number>`count(${schema.svRuns.id})::int`,
							recordedCostUsd: sql<string>`coalesce(sum(${schema.svRuns.costUsd}), 0)::text`,
						})
						.from(schema.svCycles)
						.leftJoin(
							schema.svRuns,
							and(eq(schema.svRuns.cycleId, schema.svCycles.id), eq(schema.svRuns.organizationId, tenantId)),
						)
						.where(
							and(
								eq(schema.svCycles.lockId, unresolved.configurationLockId),
								eq(schema.svCycles.organizationId, tenantId),
							),
						)
				: [];
			const recordedRuns = spendEvidence?.recordedRuns ?? 0;
			// A hold is the fail-closed state: it exists so that a person reads the
			// spend before the same question set is asked again. A hold whose lock
			// recorded no run has no spend to read, and leaving it would retire the
			// project for good, because nothing else may move that row. The database
			// carries the same condition, so this is not the only thing between a
			// hold and a repeat.
			const releasable = unresolved.status !== "HOLD" || recordedRuns === 0;
			const [abandoned] = releasable
				? await tx
						.update(schema.svJournalDailyClaims)
						.set({
							status: "ABANDONED",
							abandonedAt: sql`CURRENT_TIMESTAMP`,
							updatedAt: sql`CURRENT_TIMESTAMP`,
						})
						.where(
							and(
								eq(schema.svJournalDailyClaims.id, unresolved.id),
								eq(schema.svJournalDailyClaims.organizationId, tenantId),
								eq(schema.svJournalDailyClaims.status, unresolved.status),
								// The lease is compared in the database rather than against the timestamp
								// read into this process: the column keeps microseconds and a JavaScript
								// Date keeps milliseconds, so an equality on the value read back can never
								// match a row whose timestamp came from CURRENT_TIMESTAMP. Status and the
								// interval are the compare-and-swap — a holder that is still alive has
								// either moved the row on or refreshed it with a heartbeat.
								sql`${schema.svJournalDailyClaims.updatedAt} <= CURRENT_TIMESTAMP - interval '45 minutes'`,
							),
						)
						.returning({ id: schema.svJournalDailyClaims.id })
				: [];
			if (abandoned) {
				await tx.insert(schema.svAuditEvents).values({
					organizationId: tenantId,
					actorId: ctx.actorId,
					event: "JOURNAL_DAILY_CLAIM_ABANDONED",
					subjectKind: "journal_daily_claim",
					subjectId: unresolved.id,
					details: {
						fromStatus: unresolved.status,
						toStatus: "ABANDONED",
						leaseMinutes: CLAIM_LEASE_MINUTES,
						previousUpdatedAt: unresolved.updatedAt.toISOString(),
						configurationLockId: unresolved.configurationLockId,
						recordedRuns,
						recordedCostUsd: spendEvidence?.recordedCostUsd ?? "0",
						providerSpendAmbiguous: unresolved.status === "EXECUTING",
					},
				});
				abandonedAttempt = unresolved.attempt;
			}
		}
		if (unresolved && abandonedAttempt === undefined) {
			return {
				kind: "HOLD",
				id: unresolved.id,
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

		if (completed && !FORCE && abandonedAttempt === undefined)
			return { kind: "ALREADY_COMPLETED", attempt: completed.attempt, utcDay };

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
		return { kind: "CLAIMED", id: claim.id, attempt, utcDay, abandonedAttempt };
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

async function heartbeatDailyClaim(claimId: string): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.organization_id', ${tenantId}, true)`);
		const [heartbeat] = await tx
			.update(schema.svJournalDailyClaims)
			.set({ updatedAt: sql`CURRENT_TIMESTAMP` })
			.where(
				and(
					eq(schema.svJournalDailyClaims.id, claimId),
					eq(schema.svJournalDailyClaims.organizationId, tenantId),
					eq(schema.svJournalDailyClaims.status, "EXECUTING"),
				),
			)
			.returning({ id: schema.svJournalDailyClaims.id });
		if (!heartbeat) throw new Error("SELENA_JOURNAL_DAILY_CLAIM_LEASE_LOST");
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
			`SELENA_JOURNAL_DAILY_CLAIM_HOLD: ${claim.utcDay} attempt ${claim.attempt} (${claim.id}) is ${claim.status}; inspect spend evidence before any repeat`,
		);
	}
	if (claim.abandonedAttempt !== undefined) {
		console.log(`${scenario.brand}: recovered abandoned attempt ${claim.abandonedAttempt} as attempt ${claim.attempt}`);
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
				journalClaimId: claim.id,
				ctx,
				store: repositories.runs,
				adapters,
				config,
			});
			await heartbeatDailyClaim(claim.id);
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
				`${slug}: daily claim remains fail-closed after settlement error: ${describeError(settlementError)}`,
			);
		}
		throw error;
	}
}

/**
 * A database rejection arrives wrapped: the outer message names the statement
 * and the constraint or trigger that refused it is the cause. Reporting only
 * the outer message leaves an operator reading a failed query with no way to
 * learn why it failed.
 */
function describeError(error: unknown): string {
	const messages: string[] = [];
	let current: unknown = error;
	while (current instanceof Error && !messages.includes(current.message)) {
		messages.push(current.message);
		current = current.cause;
	}
	return messages.length > 0 ? messages.join(" ← ") : String(error);
}

async function main(): Promise<void> {
	console.log(`Measuring ${slugs.length} project(s) through ${Object.keys(adapters).join(", ")}`);
	for (const slug of slugs) {
		try {
			await measure(slug);
		} catch (error) {
			console.error(`${slug}: ${describeError(error)}`);
			process.exitCode = 1;
		}
	}
}

main().then(
	() => process.exit(process.exitCode ?? 0),
	(error) => {
		console.error(describeError(error));
		process.exit(1);
	},
);
