import { M as string, O as object, f as array } from "../_libs/zod.mjs";
import { B as localAiTaskContextHash, F as expectedObservations, Ft as resolveExplicitPosition, H as localAiTaskContextSnapshotSchema, I as expectedRunsFromScope, Lt as runOutcomeSchema, P as dispatchKey, St as parseAnalysisSubjects, V as localAiTaskContextIdentityKey, _ as assertObservationCardinality, bt as observerContextFromTaskSnapshot, f as assertCardinality, g as assertMentionMatch, j as contextHash, l as analysisSubjectsSchema, m as assertExpertVerified, v as assertObservationMatchesLockedTask, wt as parseMeasurementScope, y as assertObservationSubmission, yt as observationReviewDecisions, z as localAiDiscoveryLockBlockSchema } from "./src-BdeAuGX5.mjs";
import { L as sql, _ as isNotNull, d as and, f as eq, g as inArray, u as desc } from "../_libs/drizzle-orm.mjs";
import { $ as svPilotCycles, A as svIncidents, C as svCostEvents, J as svObservationEvidenceAssets, L as svLocalObservations, M as svJournalProviderBoundaries, S as svConfigurationLocks, T as svEntities, Y as svObservationMentions, Z as svOrders, b as svCaptureTasks, et as svProjectProfiles, ft as svResponseMentions, ht as svScenarios, it as svQuotes, j as svJournalDailyClaims, mt as svRuns, nt as svPromptFamilies, pt as svRunPermits, rt as svQcRecords, tt as svProjects, v as svAuditEvents, w as svCycles, x as svCitationGapSnapshots, y as svBusinessLocations } from "./schema-ejW7s7Gs.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-visibility-repositories-DjKDsg4F.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f8172e6c-c679-44bf-8be3-360d3141e9ad", e._sentryDebugIdIdentifier = "sentry-dbid-f8172e6c-c679-44bf-8be3-360d3141e9ad");
	} catch (e) {}
})();
function isMaintenanceEnabled(value) {
	return value !== "false";
}
function assertDirectDispatchAllowed(state) {
	assertTransportAllowed(state);
	if (state.activeMaintenanceJobs > 0) throw new Error("Direct dispatch blocked: maintenance jobs are active");
	if (state.activeCohortJobs > 0 || state.seenCohortIds.has(state.cohortId)) throw new Error(`Direct dispatch blocked: cohort ${state.cohortId} already exists`);
}
/**
* This guard is deliberately transport-adjacent: callers must pass it before
* creating a provider request, so an emergency stop cannot merely stop queue
* creation while an already planned request still escapes to a provider.
*/
function assertTransportAllowed(state) {
	if (state.globalEmergencyStop) {
		state.audit?.({
			type: "GLOBAL_EMERGENCY_STOP",
			cohortId: state.cohortId
		});
		throw new Error("SELENA_GLOBAL_EMERGENCY_STOP");
	}
	if (state.orderStopped) {
		state.audit?.({
			type: "ORDER_STOPPED",
			cohortId: state.cohortId
		});
		throw new Error("SELENA_ORDER_STOPPED");
	}
}
/**
* Citation Gap and the Source Opportunity Map (addendum §3.5, §3.6, §6.4, §8).
*
* A gap is a checkable situation, not an inference: inside one locked scope a
* source turns up in answers that name approved competitors and never in an
* answer that names the brand. What the system observed is which sources an
* answer cited and which entities that answer named — it never fetched the
* source, so nothing here claims the source itself links to anyone. The
* counters are counts of runs, and the wording of every field below says so.
*
* Pure: rows and mentions in, sources out. The formula is versioned because
* §5.4 stores its results, and a stored number is only reproducible next to
* the rule that produced it.
*/
var CITATION_GAP_FORMULA_VERSION = "selena-citation-gap/1";
function normalizeDomain(domain) {
	return domain.trim().toLowerCase().replace(/^www\./, "");
}
function parseCitations(value) {
	if (!Array.isArray(value)) return [];
	const parsed = [];
	for (const item of value) {
		if (typeof item !== "object" || item === null) continue;
		const { url, domain } = item;
		if (typeof url !== "string" || typeof domain !== "string") continue;
		const host = normalizeDomain(domain);
		if (url.trim() === "" || host === "") continue;
		parsed.push({
			url: url.trim(),
			domain: host
		});
	}
	return parsed;
}
function isOwned(domain, ownedDomains) {
	return ownedDomains.some((owned) => {
		const base = normalizeDomain(owned);
		return base !== "" && (domain === base || domain.endsWith(`.${base}`));
	});
}
/**
* §6.4 raises priority on transparent signals only: the source spans several
* scenarios, several AI systems, or several approved competitors. The fourth
* signal in the spec — the gap repeating across cycles — needs more than one
* cycle's evidence and is therefore not decided here.
*/
function priorityBandFor(source) {
	const signals = [
		source.scenarioCount > 1,
		source.engineCount > 1,
		source.competitorNames.length > 1
	].filter(Boolean).length;
	if (signals >= 3) return "HIGH";
	return signals === 2 ? "MEDIUM" : "LOW";
}
function computeCitationGaps(input) {
	const { rows, mentions, ownedDomains } = input;
	const measured = rows.filter((row) => row.validity === "VALID" && row.extractorVersion !== null);
	const measuredRunIds = new Set(measured.map((row) => row.runId));
	const brandRuns = /* @__PURE__ */ new Set();
	const competitorsByRun = /* @__PURE__ */ new Map();
	for (const mention of mentions) {
		if (!measuredRunIds.has(mention.runId)) continue;
		if (mention.entityType === "BRAND") brandRuns.add(mention.runId);
		else if (mention.entityType === "COMPETITOR") {
			const named = competitorsByRun.get(mention.runId) ?? /* @__PURE__ */ new Set();
			named.add(mention.name);
			competitorsByRun.set(mention.runId, named);
		}
	}
	const groupKey = (row) => `${row.scenarioId} ${row.system ?? row.channel}`;
	const groupSizes = /* @__PURE__ */ new Map();
	for (const row of measured) groupSizes.set(groupKey(row), (groupSizes.get(groupKey(row)) ?? 0) + 1);
	const groupHits = /* @__PURE__ */ new Map();
	const accumulators = /* @__PURE__ */ new Map();
	for (const row of measured) {
		const seenInRow = /* @__PURE__ */ new Set();
		for (const citation of parseCitations(row.citations)) {
			if (isOwned(citation.domain, ownedDomains)) continue;
			const accumulator = accumulators.get(citation.domain) ?? {
				domain: citation.domain,
				urls: [],
				runIds: /* @__PURE__ */ new Set(),
				brandRuns: /* @__PURE__ */ new Set(),
				competitorRuns: /* @__PURE__ */ new Set(),
				competitorNames: /* @__PURE__ */ new Set(),
				scenarios: /* @__PURE__ */ new Set(),
				engines: /* @__PURE__ */ new Set(),
				groups: /* @__PURE__ */ new Set(),
				firstSeen: null,
				lastSeen: null
			};
			if (!accumulator.urls.includes(citation.url)) accumulator.urls.push(citation.url);
			accumulator.runIds.add(row.runId);
			accumulator.scenarios.add(row.scenarioId);
			accumulator.engines.add(row.system ?? row.channel);
			accumulator.groups.add(groupKey(row));
			if (brandRuns.has(row.runId)) accumulator.brandRuns.add(row.runId);
			const named = competitorsByRun.get(row.runId);
			if (named !== void 0 && named.size > 0) {
				accumulator.competitorRuns.add(row.runId);
				for (const name of named) accumulator.competitorNames.add(name);
			}
			if (row.finishedAt !== null) {
				if (accumulator.firstSeen === null || row.finishedAt < accumulator.firstSeen) accumulator.firstSeen = row.finishedAt;
				if (accumulator.lastSeen === null || row.finishedAt > accumulator.lastSeen) accumulator.lastSeen = row.finishedAt;
			}
			accumulators.set(citation.domain, accumulator);
			if (!seenInRow.has(citation.domain)) {
				seenInRow.add(citation.domain);
				const hits = groupHits.get(citation.domain) ?? /* @__PURE__ */ new Map();
				hits.set(groupKey(row), (hits.get(groupKey(row)) ?? 0) + 1);
				groupHits.set(citation.domain, hits);
			}
		}
	}
	const sources = [...accumulators.values()].map((accumulator) => {
		const hits = groupHits.get(accumulator.domain);
		const shares = hits ? [...hits.entries()].map(([group, count]) => count / (groupSizes.get(group) ?? count)) : [];
		const competitorNames = [...accumulator.competitorNames].sort((a, b) => a.localeCompare(b));
		const scenarioCount = accumulator.scenarios.size;
		const engineCount = accumulator.engines.size;
		const ownedCitationCount = accumulator.brandRuns.size;
		const competitorCitationCount = accumulator.competitorRuns.size;
		return {
			domain: accumulator.domain,
			urls: accumulator.urls,
			ownedCitationCount,
			competitorCitationCount,
			competitorNames,
			scenarioCount,
			engineCount,
			evidenceRunIds: [...accumulator.runIds].sort(),
			firstSeen: accumulator.firstSeen,
			lastSeen: accumulator.lastSeen,
			repeatStability: shares.length === 0 ? null : shares.reduce((sum, share) => sum + share, 0) / shares.length,
			gapType: competitorCitationCount > 0 && ownedCitationCount === 0 ? "COMPETITOR_ONLY_SOURCE" : null,
			priorityBand: priorityBandFor({
				scenarioCount,
				engineCount,
				competitorNames
			})
		};
	}).sort((a, b) => b.evidenceRunIds.length - a.evidenceRunIds.length || b.competitorCitationCount - a.competitorCitationCount || a.domain.localeCompare(b.domain));
	return {
		formulaVersion: CITATION_GAP_FORMULA_VERSION,
		measuredRuns: measured.length,
		sources,
		gaps: sources.filter((source) => source.gapType !== null)
	};
}
function planOrderDispatch(input) {
	const planned = [];
	for (const scenarioId of input.scope.scenarios) for (const system of input.scope.systems) for (let repeatIndex = 0; repeatIndex < input.scope.repeats; repeatIndex += 1) planned.push({
		dispatchKey: dispatchKey({
			orderId: input.orderId,
			scenarioId,
			systemId: system.systemId,
			channel: system.channel,
			repeatIndex,
			configurationVersion: input.lockVersion
		}),
		scenarioId,
		systemId: system.systemId,
		channel: system.channel,
		repeatIndex
	});
	if (planned.length !== expectedRunsFromScope(input.scope)) throw new Error("SELENA_EXPECTED_RUNS_MISMATCH");
	if (new Set(planned.map((permit) => permit.dispatchKey)).size !== planned.length) throw new Error("SELENA_DISPATCH_KEY_COLLISION");
	return planned;
}
/** The lock's committed expectedRuns must equal what its own scope implies. */
function assertLockExpectedRuns(scope, lockExpectedRuns) {
	const expected = expectedRunsFromScope(scope);
	if (expected !== lockExpectedRuns) throw new Error("SELENA_EXPECTED_RUNS_MISMATCH");
	return expected;
}
var qcDecisions = ["approved", "rejected"];
function assertQcDecision(value) {
	if (!qcDecisions.includes(value)) throw new Error("QC_DECISION_INVALID");
}
/**
* Whether an approved QC record may publish this order. Approval is the human
* step that turns measured runs into a deliverable, so it has to be refused
* while the cycle is still producing them: a READY order says the ledger is
* complete, and a half-finished cycle would make that untrue.
*
* READY is accepted as well as QC_REQUIRED because a second approval of the
* same order is a replay of a decision already taken, not a new one.
*/
function assertQcApprovable(orderStatus, cycles) {
	if (orderStatus !== "QC_REQUIRED" && orderStatus !== "READY") throw new Error("SELENA_QC_ORDER_NOT_IN_REVIEW");
	if (cycles.length === 0) throw new Error("SELENA_QC_NO_CYCLE");
	if (cycles.some((cycle) => cycle.completedRuns < cycle.expectedRuns)) throw new Error("SELENA_QC_CYCLE_UNFINISHED");
}
/**
* Whether an order may be handed to the client. Delivery is where the Expert
* Verified promise is either true or a lie, so the QC record is checked here
* rather than assumed from the order having reached READY — every plan goes
* through QC_REQUIRED, and nothing else in the pipeline asks for the sign-off.
*/
function assertOrderDeliverable(orderStatus, hasApprovedQcRecord) {
	if (orderStatus !== "READY") throw new Error("SELENA_ORDER_NOT_READY");
	assertExpertVerified(hasApprovedQcRecord);
}
/**
* The permits an order-scoped dispatch may still act on. A consumed permit is
* spent and an expired one has lost its authorization; the executor refuses
* both, so selecting them here would only enqueue work that must fail.
*/
function selectEnqueueablePermits(permits, now) {
	return permits.filter((permit) => permit.status === "issued" && permit.consumedAt === null && permit.expiresAt.getTime() > now.getTime());
}
function validateEntityParent(entity, parent) {
	if (!entity.parentEntityId) {
		if (entity.parentRelation) throw new Error("SELENA_ENTITY_RELATION_WITHOUT_PARENT");
		return;
	}
	if (entity.id && entity.parentEntityId === entity.id) throw new Error("SELENA_ENTITY_SELF_PARENT");
	if (!parent || parent.organizationId !== entity.organizationId || parent.projectId !== entity.projectId) throw new Error("SELENA_ENTITY_PARENT_FOREIGN");
}
function detectEntityCycle(entities, candidate) {
	if (candidate.parentEntityId && candidate.parentEntityId === candidate.id) throw new Error("SELENA_ENTITY_SELF_PARENT");
	const parents = new Map(entities.map((entity) => [entity.id, entity.parentEntityId ?? null]));
	parents.set(candidate.id, candidate.parentEntityId ?? null);
	const seen = /* @__PURE__ */ new Set([candidate.id]);
	let current = candidate.parentEntityId ?? null;
	while (current) {
		if (seen.has(current)) throw new Error("SELENA_ENTITY_CYCLE");
		seen.add(current);
		current = parents.get(current) ?? null;
	}
}
/**
* What an answer is measured against: the brand's own names and domain, and
* the competitors the customer confirmed.
*
* The terms come from the confirmed project profile rather than from anything
* inferred at run time, so a stored measurement can be re-derived from its raw
* response and the same profile. Where the configuration lock carries its own
* profile block that block wins: a cycle is sold against the locked
* configuration, and a profile edited mid-cycle must not silently change what
* earlier runs were measured against.
*/
var competitorSchema = object({
	name: string(),
	domains: array(string()).default([])
});
var competitorSnapshotSchema = array(competitorSchema);
var lockedProfileSchema = object({
	brandName: string(),
	primaryDomain: string(),
	competitorSnapshot: competitorSnapshotSchema.default([])
});
/** The registrable host of a domain or URL, without www; "" when unusable. */
function hostOf(value) {
	const trimmed = value.trim().toLowerCase();
	if (trimmed === "") return "";
	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
	try {
		return new URL(withScheme).hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}
/**
* Reads a profile block off a configuration-lock snapshot. Absence is a legal
* state and returns null; a present but malformed block is corruption and
* throws, so a broken lock costs the measurement instead of quietly falling
* back to a profile the cycle was not sold against.
*/
function parseLockedProfile(snapshot) {
	if (typeof snapshot !== "object" || snapshot === null) return null;
	const block = snapshot.profile;
	if (block === void 0 || block === null) return null;
	return lockedProfileSchema.parse(block);
}
/**
* The profile block an order freezes into its configuration lock, in exactly
* the shape parseLockedProfile reads back. Built when the lock is minted, so a
* profile edited after purchase cannot change what the cycle's runs are
* measured against. Tolerates both stored competitor forms ({domains: []} and
* the older {domain}) because the block must capture what the customer
* actually confirmed, not what the latest writer happened to store.
*/
function lockedProfileBlock(profile) {
	const competitorSnapshot = (Array.isArray(profile.competitorSnapshot) ? profile.competitorSnapshot : []).flatMap((entry) => {
		if (typeof entry !== "object" || entry === null) return [];
		const record = entry;
		const name = typeof record.name === "string" ? record.name.trim() : "";
		if (name === "") return [];
		return [{
			name,
			domains: Array.isArray(record.domains) ? record.domains.filter((domain) => typeof domain === "string" && domain.trim() !== "") : typeof record.domain === "string" && record.domain.trim() !== "" ? [record.domain] : []
		}];
	});
	return {
		brandName: profile.brandName,
		primaryDomain: profile.primaryDomain,
		competitorSnapshot
	};
}
function analysisSubjectsFromProfile(profile) {
	const frozen = lockedProfileBlock(profile);
	return analysisSubjectsSchema.parse({
		brand: {
			name: frozen.brandName,
			...frozen.primaryDomain.trim() === "" ? {} : { domain: frozen.primaryDomain }
		},
		competitors: frozen.competitorSnapshot.map((competitor) => ({
			name: competitor.name,
			...competitor.domains[0] ? { domain: competitor.domains[0] } : {}
		}))
	});
}
/** Reads either canonical subjects or the frozen profile used by journal locks. */
function parseLockedAnalysisSubjects(snapshot) {
	const subjects = parseAnalysisSubjects(snapshot);
	if (subjects) return subjects;
	const profile = parseLockedProfile(snapshot);
	return profile ? analysisSubjectsFromProfile(profile) : null;
}
/**
* The domains a citation counts as the brand's own. Only the brand's own site:
* a public profile on a shared platform is not owned, and counting it would
* mark a citation of any competitor's page there as the brand's own source.
*/
function ownedDomainsFromProfile(profile) {
	const host = hostOf(profile.primaryDomain);
	return host === "" ? [] : [host];
}
function captureTaskDedupeKey(scenarioId, hash, repeatIndex) {
	return `${scenarioId}:${hash}:${repeatIndex}`;
}
function planCaptureTasks(block) {
	const parsed = localAiDiscoveryLockBlockSchema.parse(block);
	const tasks = [];
	const seenDedupeKeys = /* @__PURE__ */ new Set();
	for (const scenario of parsed.scenarios) for (const context of parsed.observerContexts) {
		const hash = localAiTaskContextHash(context);
		for (let repeatIndex = 0; repeatIndex < parsed.repeats; repeatIndex++) {
			assertObservationCardinality(tasks.length, parsed.expectedObservations);
			const dedupeKey = captureTaskDedupeKey(scenario.scenarioId, hash, repeatIndex);
			if (seenDedupeKeys.has(dedupeKey)) throw new Error("CAPTURE_TASK_DEDUPE_KEY_DUPLICATE");
			seenDedupeKeys.add(dedupeKey);
			tasks.push({
				scenarioId: scenario.scenarioId,
				contextHash: hash,
				contextSnapshot: context,
				repeatIndex,
				queryTextSnapshot: scenario.queryText,
				targetEntityIdsSnapshot: [...scenario.targetEntityIds],
				dedupeKey
			});
		}
	}
	return tasks;
}
function observationContentSha256(transcript) {
	return createHash("sha256").update(transcript).digest("hex");
}
var cycleStatusesPreservedOnRunCompletion = /* @__PURE__ */ new Set([
	"ANALYZING",
	"QC_REQUIRED",
	"READY",
	"STOPPED",
	"FAILED",
	"CARDINALITY_INCIDENT"
]);
/**
* The Perplexity breaker exists for one failure shape: the collector rejecting
* the request contract itself, where every further permit buys the same
* refusal. A 4xx names that shape. A timeout, an empty page or a provider
* outage is one question's loss on a scraped surface — those are recorded
* honestly and the cycle continues, with total spend still held by the order
* cap. Observed on staging (cycle 72b43b3a): one transient Perplexity failure
* cancelled 69 permits that would have measured fine.
*/
function isPerplexityContractRejection(invalidReason) {
	return /^PROVIDER_HTTP_4\d\d$/.test(invalidReason ?? "");
}
function cycleProgressAfterRunCompletion(input) {
	const completedRuns = input.completedRuns + 1;
	const cycleDone = completedRuns >= input.expectedRuns;
	return {
		status: cycleStatusesPreservedOnRunCompletion.has(input.status) ? input.status : input.systemId === "Perplexity" && input.runStatus !== void 0 && input.runStatus !== "SUCCEEDED" && isPerplexityContractRejection(input.invalidReason) ? "STOPPED" : cycleDone ? "QC_REQUIRED" : "RUNNING",
		completedRuns,
		cycleDone
	};
}
function writable(ctx) {
	if (ctx.role === "viewer") throw new Error("Forbidden: viewer is read-only");
	if (ctx.authType === "api_key" && !ctx.permissions.includes("client:write")) throw new Error("Forbidden: API key lacks client:write permission");
}
var configurationLockProjection = {
	id: svConfigurationLocks.id,
	organizationId: svConfigurationLocks.organizationId,
	projectId: svConfigurationLocks.projectId,
	version: svConfigurationLocks.version,
	snapshot: svConfigurationLocks.snapshot,
	engineSha: svConfigurationLocks.engineSha,
	expectedRuns: svConfigurationLocks.expectedRuns,
	budgetCap: svConfigurationLocks.budgetCap,
	createdBy: svConfigurationLocks.createdBy,
	createdAt: svConfigurationLocks.createdAt
};
async function allocateConfigurationLockInTransaction(tx, ctx, value) {
	writable(ctx);
	const [project] = await tx.select({ id: svProjects.id }).from(svProjects).where(and(eq(svProjects.id, value.projectId), eq(svProjects.organizationId, ctx.tenantId))).limit(1);
	if (!project) throw new Error("Not found: project is outside AuthContext tenant");
	await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('selena-configuration-lock:' || ${value.projectId}, 0))`);
	const [latest] = await tx.select({ version: sql`coalesce(max(${svConfigurationLocks.version}), 0)::int` }).from(svConfigurationLocks).where(and(eq(svConfigurationLocks.projectId, value.projectId), eq(svConfigurationLocks.organizationId, ctx.tenantId)));
	const currentVersion = Number(latest?.version ?? 0);
	if (currentVersion >= 2147483647) throw new Error("SELENA_CONFIGURATION_LOCK_VERSION_EXHAUSTED");
	const version = currentVersion + 1;
	if (value.expectedVersion !== void 0 && value.expectedVersion !== version) throw new Error("SELENA_CONFIGURATION_LOCK_VERSION_CONFLICT");
	const { expectedVersion: _expectedVersion, ...lockValue } = value;
	const [lock] = await tx.insert(svConfigurationLocks).values({
		...lockValue,
		version,
		legacyCollisionOrdinal: 0,
		organizationId: ctx.tenantId,
		createdBy: ctx.actorId
	}).onConflictDoNothing({ target: [
		svConfigurationLocks.projectId,
		svConfigurationLocks.version,
		svConfigurationLocks.legacyCollisionOrdinal
	] }).returning(configurationLockProjection);
	if (!lock) throw new Error("SELENA_CONFIGURATION_LOCK_VERSION_CONFLICT");
	return lock;
}
function createSelenaRepositories(db) {
	const assertProjectOwned = async (ctx, projectId, runner = db) => {
		const [project] = await runner.select({ id: svProjects.id }).from(svProjects).where(and(eq(svProjects.id, projectId), eq(svProjects.organizationId, ctx.tenantId))).limit(1);
		if (!project) throw new Error("Not found: project is outside AuthContext tenant");
	};
	const assertLockOwned = async (ctx, lockId, runner = db) => {
		const [lock] = await runner.select({ id: svConfigurationLocks.id }).from(svConfigurationLocks).where(and(eq(svConfigurationLocks.id, lockId), eq(svConfigurationLocks.organizationId, ctx.tenantId))).limit(1);
		if (!lock) throw new Error("Not found: configuration lock is outside AuthContext tenant");
	};
	const assertQuoteOwned = async (ctx, quoteId, runner = db) => {
		const [quote] = await runner.select({ id: svQuotes.id }).from(svQuotes).where(and(eq(svQuotes.id, quoteId), eq(svQuotes.organizationId, ctx.tenantId))).limit(1);
		if (!quote) throw new Error("Not found: quote is outside AuthContext tenant");
	};
	const assertOrderOwned = async (ctx, orderId, runner = db) => {
		const [order] = await runner.select({ id: svOrders.id }).from(svOrders).where(and(eq(svOrders.id, orderId), eq(svOrders.organizationId, ctx.tenantId))).limit(1);
		if (!order) throw new Error("Not found: order is outside AuthContext tenant");
	};
	const getOrderOwned = async (ctx, orderId, runner = db) => {
		const [order] = await runner.select().from(svOrders).where(and(eq(svOrders.id, orderId), eq(svOrders.organizationId, ctx.tenantId))).limit(1);
		if (!order) throw new Error("Not found: order is outside AuthContext tenant");
		return order;
	};
	const getLockOwned = async (ctx, lockId, runner = db) => {
		const [lock] = await runner.select().from(svConfigurationLocks).where(and(eq(svConfigurationLocks.id, lockId), eq(svConfigurationLocks.organizationId, ctx.tenantId))).limit(1);
		if (!lock) throw new Error("Not found: configuration lock is outside AuthContext tenant");
		return lock;
	};
	const latestQcRecordForOrder = async (ctx, orderId, runner = db) => (await runner.select().from(svQcRecords).where(and(eq(svQcRecords.orderId, orderId), eq(svQcRecords.organizationId, ctx.tenantId))).orderBy(desc(svQcRecords.createdAt)).limit(1))[0];
	const recordAudit = async (runner, ctx, event, subjectKind, subjectId, details = {}) => {
		await runner.insert(svAuditEvents).values({
			organizationId: ctx.tenantId,
			actorId: ctx.actorId,
			event,
			subjectKind,
			subjectId,
			details
		});
	};
	/**
	* §9.2 for the manual pilot: the transaction that hit the boundary rolls
	* back, so the incident is written outside it. A safeguard whose firing
	* leaves no trace is indistinguishable from one that never fired, and the
	* pilot's boundary is reached by a person submitting one observation too
	* many — exactly the case somebody has to be able to look up afterwards.
	*
	* The pilot cycle travels in the detail text: sv_incidents references
	* sv_cycles, and a pilot cycle is not one of those.
	*/
	const recordPilotOverflow = async (ctx, pilotCycleId, reason) => {
		await withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
			await tx.insert(svIncidents).values({
				organizationId: ctx.tenantId,
				kind: "PILOT_CARDINALITY_OVERFLOW",
				detail: `${reason}: pilot cycle ${pilotCycleId}`
			});
		});
	};
	const lockBlockFor = async (ctx, lockId, runner = db) => {
		const [lock] = await runner.select().from(svConfigurationLocks).where(and(eq(svConfigurationLocks.id, lockId), eq(svConfigurationLocks.organizationId, ctx.tenantId))).limit(1);
		if (!lock) throw new Error("Not found: configuration lock is outside AuthContext tenant");
		const parsed = localAiDiscoveryLockBlockSchema.safeParse(lock.snapshot?.localAiDiscovery);
		if (!parsed.success) throw new Error("LOCK_LOCAL_AI_DISCOVERY_BLOCK_MISSING");
		return {
			lock,
			block: parsed.data
		};
	};
	const getPilotCycleOwned = async (ctx, pilotCycleId, runner = db) => {
		const [cycle] = await runner.select().from(svPilotCycles).where(and(eq(svPilotCycles.id, pilotCycleId), eq(svPilotCycles.organizationId, ctx.tenantId))).limit(1);
		if (!cycle) throw new Error("Not found: pilot cycle is outside AuthContext tenant");
		return cycle;
	};
	const getObservationOwned = async (ctx, observationId, runner = db) => {
		const [observation] = await runner.select().from(svLocalObservations).where(and(eq(svLocalObservations.id, observationId), eq(svLocalObservations.organizationId, ctx.tenantId))).limit(1);
		if (!observation) throw new Error("Not found: observation is outside AuthContext tenant");
		return observation;
	};
	/**
	* Everything §12 is computed from, for one cycle: the terminal run rows and
	* the mention rows extracted from them. Read as one pair so a metric can
	* never combine the runs of one cycle with the mentions of another.
	*/
	const ledgerForCycle = async (ctx, cycleId, runner = db) => {
		const [rows, mentions] = await Promise.all([runner.select({
			runId: svRuns.id,
			scenarioId: svRuns.scenarioId,
			system: svRuns.system,
			channel: svRuns.channel,
			validity: svRuns.validity,
			extractorVersion: svRuns.extractorVersion,
			captureMode: svRuns.captureMode,
			ownedCitation: svRuns.ownedCitation,
			citations: svRuns.citations,
			finishedAt: svRuns.finishedAt
		}).from(svRuns).where(and(eq(svRuns.cycleId, cycleId), eq(svRuns.organizationId, ctx.tenantId))), runner.select({
			runId: svResponseMentions.runId,
			entityType: svResponseMentions.entityType,
			name: svResponseMentions.name,
			ordinalPosition: svResponseMentions.ordinalPosition,
			captureMode: svResponseMentions.captureMode
		}).from(svResponseMentions).where(and(eq(svResponseMentions.cycleId, cycleId), eq(svResponseMentions.organizationId, ctx.tenantId)))]);
		return {
			rows,
			mentions
		};
	};
	return {
		projects: {
			list: (ctx) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svProjects).where(eq(svProjects.organizationId, ctx.tenantId)).orderBy(desc(svProjects.createdAt))),
			get: async (ctx, id) => (await withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svProjects).where(and(eq(svProjects.id, id), eq(svProjects.organizationId, ctx.tenantId))).limit(1)))[0],
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => (await tx.insert(svProjects).values({
					...value,
					organizationId: ctx.tenantId
				}).returning())[0]);
			}
		},
		locks: {
			allocate: async (ctx, value) => {
				return withOrganizationTransaction(db, ctx.tenantId, (tx) => allocateConfigurationLockInTransaction(tx, ctx, value));
			},
			list: (ctx, projectId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select(configurationLockProjection).from(svConfigurationLocks).where(and(eq(svConfigurationLocks.projectId, projectId), eq(svConfigurationLocks.organizationId, ctx.tenantId))))
		},
		quotes: {
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertProjectOwned(ctx, value.projectId, tx);
					await assertLockOwned(ctx, value.lockId, tx);
					return (await tx.insert(svQuotes).values({
						...value,
						organizationId: ctx.tenantId
					}).returning())[0];
				});
			},
			list: (ctx, projectId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svQuotes).where(and(eq(svQuotes.projectId, projectId), eq(svQuotes.organizationId, ctx.tenantId))))
		},
		orders: {
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertProjectOwned(ctx, value.projectId, tx);
					await assertLockOwned(ctx, value.lockId, tx);
					await assertQuoteOwned(ctx, value.quoteId, tx);
					return (await tx.insert(svOrders).values({
						...value,
						organizationId: ctx.tenantId
					}).returning())[0];
				});
			},
			list: (ctx) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svOrders).where(eq(svOrders.organizationId, ctx.tenantId))),
			/**
			* Hand a published order to the client. The QC record is read inside
			* the same transaction that flips the status, so an approval cannot be
			* withdrawn between the check and the delivery it authorized.
			*/
			deliver: async (ctx, orderId) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [order] = await tx.select().from(svOrders).where(and(eq(svOrders.id, orderId), eq(svOrders.organizationId, ctx.tenantId))).for("update");
					if (!order) throw new Error("Not found: order is outside AuthContext tenant");
					if (order.status === "DELIVERED") return order;
					const [latestQc] = await tx.select().from(svQcRecords).where(and(eq(svQcRecords.orderId, orderId), eq(svQcRecords.organizationId, ctx.tenantId))).orderBy(desc(svQcRecords.createdAt)).limit(1);
					assertOrderDeliverable(order.status, latestQc?.decision === "approved");
					const [delivered] = await tx.update(svOrders).set({
						status: "DELIVERED",
						updatedAt: /* @__PURE__ */ new Date()
					}).where(and(eq(svOrders.id, orderId), eq(svOrders.organizationId, ctx.tenantId))).returning();
					await recordAudit(tx, ctx, "ORDER_DELIVERED", "sv_orders", orderId, { qcRecordId: latestQc?.id ?? null });
					return delivered;
				});
			}
		},
		profiles: {
			get: async (ctx, projectId) => (await withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svProjectProfiles).where(and(eq(svProjectProfiles.projectId, projectId), eq(svProjectProfiles.organizationId, ctx.tenantId))).limit(1)))[0],
			confirm: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertProjectOwned(ctx, value.projectId, tx);
					const [profile] = await tx.insert(svProjectProfiles).values({
						...value,
						organizationId: ctx.tenantId,
						confirmedAt: /* @__PURE__ */ new Date(),
						confirmedBy: ctx.actorId
					}).onConflictDoUpdate({
						target: svProjectProfiles.projectId,
						set: {
							...value,
							organizationId: ctx.tenantId,
							confirmedAt: /* @__PURE__ */ new Date(),
							confirmedBy: ctx.actorId,
							updatedAt: /* @__PURE__ */ new Date()
						}
					}).returning();
					if (!profile) throw new Error("Unable to confirm project profile");
					return profile;
				});
			}
		},
		families: {
			list: (ctx, projectId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svPromptFamilies).where(and(eq(svPromptFamilies.projectId, projectId), eq(svPromptFamilies.organizationId, ctx.tenantId)))),
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertProjectOwned(ctx, value.projectId, tx);
					return (await tx.insert(svPromptFamilies).values({
						...value,
						organizationId: ctx.tenantId
					}).returning())[0];
				});
			}
		},
		scenarios: {
			list: (ctx, familyId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svScenarios).where(and(eq(svScenarios.familyId, familyId), eq(svScenarios.organizationId, ctx.tenantId)))),
			textFor: async (ctx, scenarioId) => {
				const [row] = await withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select({ text: svScenarios.text }).from(svScenarios).where(and(eq(svScenarios.id, scenarioId), eq(svScenarios.organizationId, ctx.tenantId))).limit(1));
				if (!row) throw new Error("Not found: scenario is outside AuthContext tenant");
				return row.text;
			},
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [family] = await tx.select({ id: svPromptFamilies.id }).from(svPromptFamilies).where(and(eq(svPromptFamilies.id, value.familyId), eq(svPromptFamilies.organizationId, ctx.tenantId))).limit(1);
					if (!family) throw new Error("Not found: prompt family is outside AuthContext tenant");
					return (await tx.insert(svScenarios).values({
						...value,
						organizationId: ctx.tenantId
					}).returning())[0];
				});
			},
			/**
			* The one path a question changes status — customer screen and
			* operator desk both come through here, so there is no second
			* status model to drift. Only a PROPOSED question can be decided,
			* and its text can only be edited as part of that decision: an
			* approved question is what the order will freeze, and editing it
			* afterwards would sell text nobody reviewed.
			*/
			review: async (ctx, scenarioId, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [scenario] = await tx.select().from(svScenarios).where(and(eq(svScenarios.id, scenarioId), eq(svScenarios.organizationId, ctx.tenantId))).limit(1);
					if (!scenario) throw new Error("Not found: scenario is outside AuthContext tenant");
					if (scenario.status !== "PROPOSED") throw new Error("SELENA_SCENARIO_NOT_REVIEWABLE");
					const editedText = value.text?.trim();
					if (editedText !== void 0 && editedText === "") throw new Error("SELENA_SCENARIO_TEXT_EMPTY");
					const [updated] = await tx.update(svScenarios).set({
						status: value.decision,
						...editedText === void 0 ? {} : { text: editedText },
						updatedAt: /* @__PURE__ */ new Date()
					}).where(and(eq(svScenarios.id, scenarioId), eq(svScenarios.organizationId, ctx.tenantId))).returning();
					await recordAudit(tx, ctx, value.decision === "APPROVED" ? "SCENARIO_APPROVED" : "SCENARIO_REJECTED", "sv_scenarios", scenarioId, {
						familyId: scenario.familyId,
						textEdited: editedText !== void 0 && editedText !== scenario.text
					});
					return updated;
				});
			}
		},
		entities: {
			list: (ctx, projectId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svEntities).where(and(eq(svEntities.projectId, projectId), eq(svEntities.organizationId, ctx.tenantId))).orderBy(desc(svEntities.createdAt))),
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertProjectOwned(ctx, value.projectId, tx);
					const parent = value.parentEntityId ? (await tx.select({
						id: svEntities.id,
						organizationId: svEntities.organizationId,
						projectId: svEntities.projectId
					}).from(svEntities).where(eq(svEntities.id, value.parentEntityId)).limit(1))[0] : void 0;
					validateEntityParent({
						...value,
						organizationId: ctx.tenantId
					}, parent);
					if (value.parentEntityId) detectEntityCycle(await tx.select({
						id: svEntities.id,
						parentEntityId: svEntities.parentEntityId
					}).from(svEntities).where(and(eq(svEntities.projectId, value.projectId), eq(svEntities.organizationId, ctx.tenantId))), {
						id: value.id ?? globalThis.crypto.randomUUID(),
						parentEntityId: value.parentEntityId
					});
					return (await tx.insert(svEntities).values({
						...value,
						organizationId: ctx.tenantId
					}).returning())[0];
				});
			},
			setConfirmation: async (ctx, entityId, status) => {
				writable(ctx);
				const [entity] = await withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.update(svEntities).set({
					confirmationStatus: status,
					updatedAt: /* @__PURE__ */ new Date()
				}).where(and(eq(svEntities.id, entityId), eq(svEntities.organizationId, ctx.tenantId))).returning());
				if (!entity) throw new Error("Not found: entity is outside AuthContext tenant");
				return entity;
			}
		},
		locations: {
			list: (ctx, entityId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svBusinessLocations).where(and(eq(svBusinessLocations.entityId, entityId), eq(svBusinessLocations.organizationId, ctx.tenantId)))),
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [entity] = await tx.select({ id: svEntities.id }).from(svEntities).where(and(eq(svEntities.id, value.entityId), eq(svEntities.organizationId, ctx.tenantId))).limit(1);
					if (!entity) throw new Error("Not found: entity is outside AuthContext tenant");
					return (await tx.insert(svBusinessLocations).values({
						...value,
						organizationId: ctx.tenantId
					}).returning())[0];
				});
			}
		},
		cycles: {
			list: (ctx, orderId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svCycles).where(and(eq(svCycles.orderId, orderId), eq(svCycles.organizationId, ctx.tenantId)))),
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertOrderOwned(ctx, value.orderId, tx);
					await assertLockOwned(ctx, value.lockId, tx);
					return (await tx.insert(svCycles).values({
						...value,
						organizationId: ctx.tenantId
					}).returning())[0];
				});
			}
		},
		dispatch: {
			listPermits: async (ctx, orderId) => {
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertOrderOwned(ctx, orderId, tx);
					const cycleIds = (await tx.select({ id: svCycles.id }).from(svCycles).where(and(eq(svCycles.orderId, orderId), eq(svCycles.organizationId, ctx.tenantId)))).map((cycle) => cycle.id);
					if (cycleIds.length === 0) return [];
					return tx.select().from(svRunPermits).where(and(inArray(svRunPermits.cycleId, cycleIds), eq(svRunPermits.organizationId, ctx.tenantId)));
				});
			},
			createPermits: async (ctx, orderId, opts) => {
				writable(ctx);
				const order = await withOrganizationTransaction(db, ctx.tenantId, (tx) => getOrderOwned(ctx, orderId, tx));
				const approvingFrom = opts?.approval?.fromStatus;
				if (order.status !== "APPROVED" && order.status !== "QUEUED" && order.status !== approvingFrom) throw new Error("SELENA_ORDER_NOT_APPROVED");
				const lock = await withOrganizationTransaction(db, ctx.tenantId, (tx) => getLockOwned(ctx, order.lockId, tx));
				const scope = parseMeasurementScope(lock.snapshot);
				if (!scope) throw new Error("SELENA_LOCK_SCOPE_MISSING");
				const expected = assertLockExpectedRuns(scope, lock.expectedRuns);
				assertDirectDispatchAllowed({
					activeMaintenanceJobs: 0,
					activeCohortJobs: 0,
					cohortId: orderId,
					expectedJobs: expected,
					expectedProviderCalls: 0,
					seenCohortIds: /* @__PURE__ */ new Set(),
					globalEmergencyStop: false,
					orderStopped: false,
					...opts?.cycleState
				});
				const planned = planOrderDispatch({
					orderId,
					lockVersion: lock.version,
					scope
				});
				const expiresAt = opts?.expiresAt ?? new Date(Date.now() + 864e5);
				const recordOverflow = async (detail) => {
					await withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
						await tx.insert(svIncidents).values({
							organizationId: ctx.tenantId,
							orderId,
							kind: "CARDINALITY_OVERFLOW",
							detail
						});
					});
				};
				try {
					return await withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
						let statusInTransaction = order.status;
						if (opts?.approval && order.status === opts.approval.fromStatus) {
							const [approved] = await tx.update(svOrders).set({
								status: "APPROVED",
								updatedAt: /* @__PURE__ */ new Date()
							}).where(and(eq(svOrders.id, orderId), eq(svOrders.organizationId, ctx.tenantId), eq(svOrders.status, opts.approval.fromStatus))).returning({ id: svOrders.id });
							if (!approved) throw new Error("SELENA_ORDER_STATUS_CHANGED");
							statusInTransaction = "APPROVED";
						}
						const [existingCycle] = await tx.select().from(svCycles).where(and(eq(svCycles.orderId, orderId), eq(svCycles.lockId, order.lockId), eq(svCycles.organizationId, ctx.tenantId))).orderBy(desc(svCycles.createdAt)).limit(1);
						const cycle = existingCycle ?? (await tx.insert(svCycles).values({
							organizationId: ctx.tenantId,
							orderId,
							lockId: order.lockId,
							status: "QUEUED",
							expectedRuns: expected
						}).returning())[0];
						const inserted = await tx.insert(svRunPermits).values(planned.map((permit) => ({
							organizationId: ctx.tenantId,
							cycleId: cycle.id,
							dispatchKey: permit.dispatchKey,
							channel: permit.channel,
							scenarioId: permit.scenarioId,
							systemId: permit.systemId,
							expiresAt
						}))).onConflictDoNothing({ target: svRunPermits.dispatchKey }).returning();
						const permits = await tx.select().from(svRunPermits).where(and(eq(svRunPermits.cycleId, cycle.id), eq(svRunPermits.organizationId, ctx.tenantId)));
						assertCardinality(permits.length, expected + 1);
						if (permits.length !== expected) throw new Error("SELENA_PERMIT_CARDINALITY_MISMATCH");
						await tx.update(svCycles).set({
							createdRuns: permits.length,
							updatedAt: /* @__PURE__ */ new Date()
						}).where(eq(svCycles.id, cycle.id));
						if (statusInTransaction === "APPROVED") await tx.update(svOrders).set({
							status: "QUEUED",
							updatedAt: /* @__PURE__ */ new Date()
						}).where(and(eq(svOrders.id, orderId), eq(svOrders.organizationId, ctx.tenantId)));
						await recordAudit(tx, ctx, "ORDER_DISPATCH_PLANNED", "sv_orders", orderId, {
							orderId,
							cycleId: cycle.id,
							created: inserted.length,
							expected
						});
						if (opts?.approval && order.status === opts.approval.fromStatus) await recordAudit(tx, ctx, opts.approval.auditEvent, "sv_orders", orderId, {
							...opts.approval.auditDetails ?? {},
							orderId,
							cycleId: cycle.id,
							created: inserted.length,
							expected
						});
						return {
							cycleId: cycle.id,
							created: inserted.length,
							expected,
							permits
						};
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					if (message === "CARDINALITY_BLOCKED" || message === "CARDINALITY_INVALID" || message === "SELENA_PERMIT_CARDINALITY_MISMATCH") await recordOverflow(message);
					throw error;
				}
			}
		},
		runs: {
			claim: async (ctx, permitId, opts) => {
				writable(ctx);
				const now = opts?.now ?? /* @__PURE__ */ new Date();
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					let journalClaim;
					const [permit] = await tx.select().from(svRunPermits).where(and(eq(svRunPermits.id, permitId), eq(svRunPermits.organizationId, ctx.tenantId))).for("update");
					if (!permit) throw new Error("Not found: run permit is outside AuthContext tenant");
					const [cycle] = await tx.select().from(svCycles).where(and(eq(svCycles.id, permit.cycleId), eq(svCycles.organizationId, ctx.tenantId))).limit(1);
					if (!cycle) throw new Error("Not found: cycle is outside AuthContext tenant");
					if (opts?.journalClaimId) {
						const [lease] = await tx.update(svJournalDailyClaims).set({ updatedAt: sql`clock_timestamp()` }).where(and(eq(svJournalDailyClaims.id, opts.journalClaimId), eq(svJournalDailyClaims.organizationId, ctx.tenantId), eq(svJournalDailyClaims.configurationLockId, cycle.lockId), eq(svJournalDailyClaims.status, "EXECUTING"))).returning({
							id: svJournalDailyClaims.id,
							projectId: svJournalDailyClaims.projectId,
							configurationLockId: svJournalDailyClaims.configurationLockId
						});
						if (!lease) throw new Error("SELENA_JOURNAL_DAILY_CLAIM_LEASE_LOST");
						if (!lease.configurationLockId) throw new Error("SELENA_JOURNAL_DAILY_CLAIM_LOCK_MISSING");
						journalClaim = {
							id: lease.id,
							projectId: lease.projectId,
							configurationLockId: lease.configurationLockId
						};
					}
					const runFor = async (dispatchKey) => (await tx.select().from(svRuns).where(and(eq(svRuns.dispatchKey, dispatchKey), eq(svRuns.organizationId, ctx.tenantId))).limit(1))[0];
					if (permit.consumedAt) {
						const existing = await runFor(permit.dispatchKey);
						if (!existing) throw new Error("SELENA_PERMIT_CONSUMED_WITHOUT_RUN");
						const [providerBoundary] = journalClaim ? await tx.select({
							journalClaimId: svJournalProviderBoundaries.journalClaimId,
							runId: svJournalProviderBoundaries.runId
						}).from(svJournalProviderBoundaries).where(and(eq(svJournalProviderBoundaries.journalClaimId, journalClaim.id), eq(svJournalProviderBoundaries.permitId, permit.id), eq(svJournalProviderBoundaries.runId, existing.id), eq(svJournalProviderBoundaries.organizationId, ctx.tenantId))).limit(1) : [];
						if (journalClaim && !providerBoundary) throw new Error("SELENA_JOURNAL_PROVIDER_BOUNDARY_MISSING");
						return {
							permit,
							run: existing,
							cycle,
							claimed: false,
							providerBoundary
						};
					}
					if (permit.status !== "issued") throw new Error("SELENA_PERMIT_NOT_ISSUED");
					await tx.update(svRunPermits).set({
						consumedAt: now,
						status: "consumed"
					}).where(eq(svRunPermits.id, permitId));
					await tx.insert(svRuns).values({
						organizationId: ctx.tenantId,
						cycleId: permit.cycleId,
						permitId: permit.id,
						dispatchKey: permit.dispatchKey,
						channel: permit.channel,
						scenarioId: permit.scenarioId,
						systemId: permit.systemId,
						status: "RUNNING",
						startedAt: now
					}).onConflictDoNothing({ target: svRuns.dispatchKey });
					const run = await runFor(permit.dispatchKey);
					if (!run) throw new Error("SELENA_RUN_CLAIM_FAILED");
					const [providerBoundary] = journalClaim ? await tx.insert(svJournalProviderBoundaries).values({
						organizationId: ctx.tenantId,
						projectId: journalClaim.projectId,
						journalClaimId: journalClaim.id,
						configurationLockId: journalClaim.configurationLockId,
						cycleId: cycle.id,
						permitId: permit.id,
						runId: run.id,
						dispatchKey: permit.dispatchKey,
						channel: permit.channel,
						systemId: permit.systemId
					}).returning({
						journalClaimId: svJournalProviderBoundaries.journalClaimId,
						runId: svJournalProviderBoundaries.runId
					}) : [];
					if (journalClaim && !providerBoundary) throw new Error("SELENA_JOURNAL_PROVIDER_BOUNDARY_MISSING");
					await recordAudit(tx, ctx, "RUN_CLAIMED", "sv_runs", run.id, {
						permitId,
						cycleId: permit.cycleId,
						dispatchKey: permit.dispatchKey
					});
					return {
						permit,
						run,
						cycle,
						claimed: true,
						providerBoundary
					};
				});
			},
			complete: async (ctx, runId, outcome, opts) => {
				writable(ctx);
				const parsed = runOutcomeSchema.parse(outcome);
				const now = opts?.now ?? /* @__PURE__ */ new Date();
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [run] = await tx.select().from(svRuns).where(and(eq(svRuns.id, runId), eq(svRuns.organizationId, ctx.tenantId))).for("update");
					if (!run) throw new Error("Not found: run is outside AuthContext tenant");
					if (run.dispatchKey !== parsed.dispatchKey) throw new Error("SELENA_DISPATCH_KEY_MISMATCH");
					if (run.finishedAt) return run;
					const measurement = parsed.measurement;
					const [completed] = await tx.update(svRuns).set({
						status: parsed.status,
						validity: parsed.validity,
						invalidReason: parsed.invalidReason ?? null,
						costUsd: parsed.costUsd === void 0 ? null : String(parsed.costUsd),
						costBasis: parsed.costBasis ?? null,
						tokenInput: parsed.tokenUsage?.input ?? null,
						tokenOutput: parsed.tokenUsage?.output ?? null,
						system: measurement?.system ?? null,
						model: measurement?.model ?? null,
						language: measurement?.language ?? null,
						region: measurement?.region ?? null,
						mention: measurement?.mention ?? null,
						position: measurement?.position ?? null,
						ownedCitation: measurement?.ownedCitation ?? null,
						citations: measurement?.citations ?? null,
						competitors: measurement?.competitors ?? null,
						factualErrors: measurement?.factualErrors ?? null,
						extractorVersion: measurement?.extractorVersion ?? null,
						captureMode: measurement?.captureMode ?? null,
						rawResponseReference: parsed.rawResponseReference ?? null,
						canonicalPayload: parsed,
						finishedAt: now
					}).where(eq(svRuns.id, runId)).returning();
					const [cycle] = await tx.select().from(svCycles).where(and(eq(svCycles.id, run.cycleId), eq(svCycles.organizationId, ctx.tenantId))).for("update");
					if (!cycle) throw new Error("Not found: cycle is outside AuthContext tenant");
					const progress = cycleProgressAfterRunCompletion({
						...cycle,
						systemId: run.systemId,
						runStatus: parsed.status,
						invalidReason: parsed.invalidReason ?? null
					});
					const circuitBroken = progress.status === "STOPPED" && cycle.status !== "STOPPED" && run.systemId === "Perplexity" && parsed.status !== "SUCCEEDED";
					await tx.update(svCycles).set({
						completedRuns: progress.completedRuns,
						status: progress.status,
						updatedAt: /* @__PURE__ */ new Date()
					}).where(eq(svCycles.id, cycle.id));
					if (progress.status === "QC_REQUIRED") await tx.update(svOrders).set({
						status: "QC_REQUIRED",
						updatedAt: /* @__PURE__ */ new Date()
					}).where(and(eq(svOrders.id, cycle.orderId), eq(svOrders.organizationId, ctx.tenantId), inArray(svOrders.status, [
						"QUEUED",
						"RUNNING",
						"ANALYZING"
					])));
					if (circuitBroken) {
						await tx.update(svOrders).set({
							status: "CANCELLED",
							updatedAt: /* @__PURE__ */ new Date()
						}).where(and(eq(svOrders.id, cycle.orderId), eq(svOrders.organizationId, ctx.tenantId), inArray(svOrders.status, [
							"QUEUED",
							"RUNNING",
							"ANALYZING"
						])));
						await tx.insert(svIncidents).values({
							organizationId: ctx.tenantId,
							orderId: cycle.orderId,
							cycleId: cycle.id,
							kind: "PERPLEXITY_CIRCUIT_BREAKER",
							detail: parsed.invalidReason ?? parsed.status,
							dispatchKey: parsed.dispatchKey
						});
						await recordAudit(tx, ctx, "PERPLEXITY_CIRCUIT_OPENED", "sv_cycles", cycle.id, {
							orderId: cycle.orderId,
							runId,
							dispatchKey: parsed.dispatchKey,
							status: parsed.status,
							reason: parsed.invalidReason ?? null
						});
					}
					if (measurement) {
						const mentionRows = [...measurement.mention ? [{
							entityType: "BRAND",
							name: measurement.brand,
							ordinalPosition: measurement.position
						}] : [], ...measurement.competitors.map((competitor) => ({
							entityType: "COMPETITOR",
							name: competitor.name,
							ordinalPosition: competitor.position
						}))];
						if (mentionRows.length > 0) await tx.insert(svResponseMentions).values(mentionRows.map((row) => ({
							organizationId: ctx.tenantId,
							cycleId: cycle.id,
							runId,
							entityType: row.entityType,
							name: row.name,
							ordinalPosition: row.ordinalPosition,
							extractorVersion: measurement.extractorVersion,
							captureMode: measurement.captureMode
						})));
					}
					if (parsed.costUsd !== void 0) await tx.insert(svCostEvents).values({
						organizationId: ctx.tenantId,
						cycleId: cycle.id,
						runId,
						provider: parsed.provider ?? run.channel,
						amountUsd: String(parsed.costUsd),
						basis: parsed.costBasis ?? "estimated"
					});
					if (parsed.invalidReason === "SELENA_GLOBAL_EMERGENCY_STOP" || parsed.invalidReason === "SELENA_ORDER_STOPPED") await tx.insert(svIncidents).values({
						organizationId: ctx.tenantId,
						orderId: cycle.orderId,
						cycleId: cycle.id,
						kind: "EMERGENCY_STOP",
						detail: parsed.invalidReason,
						dispatchKey: parsed.dispatchKey
					});
					await recordAudit(tx, ctx, "RUN_COMPLETED", "sv_runs", runId, {
						cycleId: cycle.id,
						dispatchKey: parsed.dispatchKey,
						status: parsed.status,
						validity: parsed.validity,
						completedRuns: progress.completedRuns,
						expectedRuns: cycle.expectedRuns,
						cycleStatus: progress.status
					});
					return completed;
				});
			},
			ledgerForCycle: (ctx, cycleId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => ledgerForCycle(ctx, cycleId, tx)),
			/**
			* The one way to reach a run's raw answer. Addendum §7: a client viewer
			* never receives an object-storage URL, and tenant authorization is
			* checked before a signed URL is issued — this read is that check, so
			* whoever mints the URL has to come through here and cannot sign a
			* reference it did not return. Every access leaves an audit row.
			*/
			rawEvidenceFor: async (ctx, runId) => {
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [run] = await tx.select({
						runId: svRuns.id,
						cycleId: svRuns.cycleId,
						dispatchKey: svRuns.dispatchKey,
						rawResponseReference: svRuns.rawResponseReference,
						extractorVersion: svRuns.extractorVersion,
						finishedAt: svRuns.finishedAt
					}).from(svRuns).where(and(eq(svRuns.id, runId), eq(svRuns.organizationId, ctx.tenantId))).limit(1);
					if (!run) throw new Error("Not found: run is outside AuthContext tenant");
					await recordAudit(tx, ctx, "RAW_EVIDENCE_ACCESSED", "sv_runs", runId, { dispatchKey: run.dispatchKey });
					return run;
				});
			},
			/** Every terminal run of an order, newest cycle first. */
			listForOrder: async (ctx, orderId) => {
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertOrderOwned(ctx, orderId, tx);
					return tx.select({
						id: svRuns.id,
						cycleId: svRuns.cycleId,
						scenarioId: svRuns.scenarioId,
						systemId: svRuns.systemId,
						channel: svRuns.channel,
						captureMode: svRuns.captureMode,
						status: svRuns.status,
						validity: svRuns.validity,
						canonicalPayload: svRuns.canonicalPayload,
						finishedAt: svRuns.finishedAt
					}).from(svRuns).innerJoin(svCycles, eq(svRuns.cycleId, svCycles.id)).where(and(eq(svCycles.orderId, orderId), eq(svRuns.organizationId, ctx.tenantId))).orderBy(desc(svRuns.finishedAt));
				});
			},
			/**
			* Attach findings to a completed run, beside the answer they were read
			* from. Findings live in the same payload rather than a table of their
			* own so that dropping the answer text at the end of its retention
			* window leaves the evidence derived from it untouched.
			*/
			saveAnalysis: async (ctx, runId, analysis) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [run] = await tx.select({
						id: svRuns.id,
						canonicalPayload: svRuns.canonicalPayload
					}).from(svRuns).where(and(eq(svRuns.id, runId), eq(svRuns.organizationId, ctx.tenantId))).for("update").limit(1);
					if (!run) throw new Error("Not found: run is outside AuthContext tenant");
					const payload = run.canonicalPayload ?? {};
					const [updated] = await tx.update(svRuns).set({ canonicalPayload: {
						...payload,
						analysis
					} }).where(and(eq(svRuns.id, runId), eq(svRuns.organizationId, ctx.tenantId))).returning({ id: svRuns.id });
					return updated;
				});
			}
		},
		incidents: {
			list: (ctx, opts) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svIncidents).where(and(eq(svIncidents.organizationId, ctx.tenantId), ...opts?.status ? [eq(svIncidents.status, opts.status)] : [])).orderBy(desc(svIncidents.createdAt))),
			resolve: async (ctx, incidentId, opts) => {
				writable(ctx);
				const now = opts?.now ?? /* @__PURE__ */ new Date();
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [resolved] = await tx.update(svIncidents).set({
						status: "RESOLVED",
						resolvedAt: now
					}).where(and(eq(svIncidents.id, incidentId), eq(svIncidents.organizationId, ctx.tenantId))).returning();
					if (!resolved) throw new Error("Not found: incident is outside AuthContext tenant");
					await recordAudit(tx, ctx, "INCIDENT_RESOLVED", "sv_incidents", incidentId, { kind: resolved.kind });
					return resolved;
				});
			}
		},
		costEvents: { listForCycle: (ctx, cycleId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svCostEvents).where(and(eq(svCostEvents.cycleId, cycleId), eq(svCostEvents.organizationId, ctx.tenantId))).orderBy(desc(svCostEvents.createdAt))) },
		citationGaps: {
			listForCycle: (ctx, cycleId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svCitationGapSnapshots).where(and(eq(svCitationGapSnapshots.cycleId, cycleId), eq(svCitationGapSnapshots.organizationId, ctx.tenantId))).orderBy(desc(svCitationGapSnapshots.competitorCitationCount))),
			listForProject: (ctx, projectId, opts) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svCitationGapSnapshots).where(and(eq(svCitationGapSnapshots.projectId, projectId), eq(svCitationGapSnapshots.organizationId, ctx.tenantId), ...opts?.gapsOnly ? [isNotNull(svCitationGapSnapshots.gapType)] : [])).orderBy(desc(svCitationGapSnapshots.createdAt), desc(svCitationGapSnapshots.competitorCitationCount))),
			snapshot: async (ctx, cycleId) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [context] = await tx.select({
						projectId: svProjects.id,
						lockId: svCycles.lockId,
						lockSnapshot: svConfigurationLocks.snapshot
					}).from(svCycles).innerJoin(svOrders, eq(svOrders.id, svCycles.orderId)).innerJoin(svProjects, eq(svProjects.id, svOrders.projectId)).innerJoin(svConfigurationLocks, eq(svConfigurationLocks.id, svCycles.lockId)).where(and(eq(svCycles.id, cycleId), eq(svCycles.organizationId, ctx.tenantId))).limit(1);
					if (!context) throw new Error("Not found: cycle is outside AuthContext tenant");
					const [live] = await tx.select({
						brandName: svProjectProfiles.brandName,
						primaryDomain: svProjectProfiles.primaryDomain,
						competitorSnapshot: svProjectProfiles.competitorSnapshot
					}).from(svProjectProfiles).where(and(eq(svProjectProfiles.projectId, context.projectId), eq(svProjectProfiles.organizationId, ctx.tenantId))).limit(1);
					const profile = parseLockedProfile(context.lockSnapshot) ?? live;
					if (!profile) throw new Error("SELENA_PROJECT_PROFILE_NOT_FOUND");
					const { rows, mentions } = await ledgerForCycle(ctx, cycleId, tx);
					const report = computeCitationGaps({
						rows,
						mentions,
						ownedDomains: ownedDomainsFromProfile(profile)
					});
					if (report.sources.length === 0) return [];
					const stored = await tx.insert(svCitationGapSnapshots).values(report.sources.map((source) => ({
						organizationId: ctx.tenantId,
						projectId: context.projectId,
						cycleId,
						configurationLockId: context.lockId,
						sourceDomain: source.domain,
						sourceUrls: source.urls,
						ownedCitationCount: source.ownedCitationCount,
						competitorCitationCount: source.competitorCitationCount,
						competitorNames: source.competitorNames,
						engineCount: source.engineCount,
						scenarioCount: source.scenarioCount,
						repeatStability: source.repeatStability === null ? null : String(source.repeatStability),
						firstSeen: source.firstSeen,
						lastSeen: source.lastSeen,
						gapType: source.gapType,
						priorityBand: source.priorityBand,
						formulaVersion: report.formulaVersion,
						evidenceRunIds: source.evidenceRunIds
					}))).onConflictDoUpdate({
						target: [
							svCitationGapSnapshots.cycleId,
							svCitationGapSnapshots.sourceDomain,
							svCitationGapSnapshots.formulaVersion
						],
						set: {
							sourceUrls: sql`excluded.source_urls`,
							ownedCitationCount: sql`excluded.owned_citation_count`,
							competitorCitationCount: sql`excluded.competitor_citation_count`,
							competitorNames: sql`excluded.competitor_names`,
							engineCount: sql`excluded.engine_count`,
							scenarioCount: sql`excluded.scenario_count`,
							repeatStability: sql`excluded.repeat_stability`,
							firstSeen: sql`excluded.first_seen`,
							lastSeen: sql`excluded.last_seen`,
							gapType: sql`excluded.gap_type`,
							priorityBand: sql`excluded.priority_band`,
							evidenceRunIds: sql`excluded.evidence_run_ids`
						}
					}).returning();
					await recordAudit(tx, ctx, "CITATION_GAP_SNAPSHOT", "sv_cycles", cycleId, {
						formulaVersion: report.formulaVersion,
						measuredRuns: report.measuredRuns,
						sources: report.sources.length,
						gaps: report.gaps.length
					});
					return stored;
				});
			}
		},
		pilotCycles: {
			list: (ctx) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svPilotCycles).where(eq(svPilotCycles.organizationId, ctx.tenantId)).orderBy(desc(svPilotCycles.createdAt))),
			get: (ctx, pilotCycleId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => getPilotCycleOwned(ctx, pilotCycleId, tx)),
			create: async (ctx, value) => {
				writable(ctx);
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertProjectOwned(ctx, value.projectId, tx);
					const { lock, block } = await lockBlockFor(ctx, value.lockId, tx);
					if (lock.projectId !== value.projectId) throw new Error("Not found: configuration lock is outside AuthContext tenant");
					if (value.idempotencyKey) {
						const [priorCreate] = await tx.select({ subjectId: svAuditEvents.subjectId }).from(svAuditEvents).where(and(eq(svAuditEvents.organizationId, ctx.tenantId), eq(svAuditEvents.event, "PILOT_CYCLE_CREATED"), sql`${svAuditEvents.details} ->> 'idempotencyKey' = ${value.idempotencyKey}`)).limit(1);
						if (priorCreate) return getPilotCycleOwned(ctx, priorCreate.subjectId, tx);
					}
					const [cycle] = await tx.insert(svPilotCycles).values({
						organizationId: ctx.tenantId,
						projectId: value.projectId,
						lockId: value.lockId,
						expectedObservations: expectedObservations(block.scenarios, block.observerContexts, block.repeats),
						captureProtocolVersion: block.captureProtocolVersion
					}).returning();
					await recordAudit(tx, ctx, "PILOT_CYCLE_CREATED", "sv_pilot_cycles", cycle.id, {
						lockId: value.lockId,
						idempotencyKey: value.idempotencyKey ?? null
					});
					return cycle;
				});
			}
		},
		captureTasks: {
			list: (ctx, pilotCycleId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svCaptureTasks).where(and(eq(svCaptureTasks.pilotCycleId, pilotCycleId), eq(svCaptureTasks.organizationId, ctx.tenantId)))),
			generate: async (ctx, pilotCycleId, idempotencyKey) => {
				writable(ctx);
				try {
					return await withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
						const cycle = await getPilotCycleOwned(ctx, pilotCycleId, tx);
						const { block } = await lockBlockFor(ctx, cycle.lockId, tx);
						const planned = planCaptureTasks(block);
						if (planned.length !== cycle.expectedObservations) throw new Error("OBSERVATION_CARDINALITY_INVALID");
						const scenarioIds = [...new Set(planned.map((task) => task.scenarioId))];
						if ((await tx.select({ id: svScenarios.id }).from(svScenarios).where(and(inArray(svScenarios.id, scenarioIds), eq(svScenarios.organizationId, ctx.tenantId)))).length !== scenarioIds.length) throw new Error("Not found: scenario is outside AuthContext tenant");
						const inserted = await tx.insert(svCaptureTasks).values(planned.map((task) => ({
							organizationId: ctx.tenantId,
							pilotCycleId,
							scenarioId: task.scenarioId,
							contextHash: task.contextHash,
							contextSnapshot: task.contextSnapshot,
							repeatIndex: task.repeatIndex,
							queryTextSnapshot: task.queryTextSnapshot,
							targetEntityIdsSnapshot: task.targetEntityIdsSnapshot,
							idempotencyKey: `${pilotCycleId}:${task.dedupeKey}`
						}))).onConflictDoNothing({ target: [
							svCaptureTasks.pilotCycleId,
							svCaptureTasks.scenarioId,
							svCaptureTasks.contextHash,
							svCaptureTasks.repeatIndex
						] }).returning();
						await recordAudit(tx, ctx, "CAPTURE_TASKS_GENERATED", "sv_pilot_cycles", pilotCycleId, {
							planned: planned.length,
							inserted: inserted.length,
							idempotencyKey: idempotencyKey ?? null
						});
						return inserted;
					});
				} catch (error) {
					if (error instanceof Error && error.message === "OBSERVATION_CARDINALITY_INVALID") await recordPilotOverflow(ctx, pilotCycleId, error.message);
					throw error;
				}
			}
		},
		observations: {
			submit: async (ctx, input) => {
				writable(ctx);
				const { task, cycle, block } = await withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [task] = await tx.select().from(svCaptureTasks).where(and(eq(svCaptureTasks.id, input.captureTaskId), eq(svCaptureTasks.organizationId, ctx.tenantId))).limit(1);
					if (!task) throw new Error("Not found: capture task is outside AuthContext tenant");
					const cycle = await getPilotCycleOwned(ctx, task.pilotCycleId, tx);
					const { block } = await lockBlockFor(ctx, cycle.lockId, tx);
					return {
						task,
						cycle,
						block
					};
				});
				assertObservationSubmission({
					queryText: input.queryText,
					context: input.context,
					capturedAt: input.capturedAt,
					transcript: input.transcript,
					screenshotReference: input.screenshot?.privateObjectReference ?? null,
					screenshotSha256: input.screenshot?.sha256 ?? null,
					coordinateProofReference: input.coordinateProof?.privateObjectReference ?? null,
					coordinateProofSha256: input.coordinateProof?.sha256 ?? null
				}, block.evidencePolicy);
				const submittedContextSnapshot = localAiTaskContextSnapshotSchema.parse(input.context);
				const taskContextSnapshot = localAiTaskContextSnapshotSchema.parse(task.contextSnapshot);
				const taskContextIdentity = localAiTaskContextIdentityKey(taskContextSnapshot);
				if (!block.observerContexts.some((candidate) => localAiTaskContextIdentityKey(candidate) === taskContextIdentity)) throw new Error("OBSERVATION_POINT_OUTSIDE_LOCK");
				if (submittedContextSnapshot.pointId !== taskContextSnapshot.pointId) throw new Error("OBSERVATION_POINT_MISMATCH");
				const context = observerContextFromTaskSnapshot(submittedContextSnapshot);
				const scenario = block.scenarios.find((candidate) => candidate.scenarioId === task.scenarioId) ?? null;
				assertObservationMatchesLockedTask({
					queryText: input.queryText,
					taskQueryText: task.queryTextSnapshot,
					scenario,
					context
				});
				if (contextHash(context) !== task.contextHash) throw new Error("OBSERVATION_CONTEXT_MISMATCH");
				const [existing] = await withOrganizationTransaction(db, ctx.tenantId, (tx) => tx.select().from(svLocalObservations).where(and(eq(svLocalObservations.captureTaskId, task.id), eq(svLocalObservations.organizationId, ctx.tenantId))).limit(1));
				if (existing) return existing;
				try {
					return await withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
						const [lockedCycle] = await tx.select().from(svPilotCycles).where(and(eq(svPilotCycles.id, cycle.id), eq(svPilotCycles.organizationId, ctx.tenantId))).for("update");
						assertObservationCardinality(lockedCycle.createdObservations, lockedCycle.expectedObservations);
						await tx.update(svPilotCycles).set({
							createdObservations: lockedCycle.createdObservations + 1,
							updatedAt: /* @__PURE__ */ new Date()
						}).where(eq(svPilotCycles.id, cycle.id));
						const [observation] = await tx.insert(svLocalObservations).values({
							organizationId: ctx.tenantId,
							captureTaskId: task.id,
							capturedBy: ctx.actorId,
							capturedAt: new Date(input.capturedAt),
							orderingState: input.orderingState ?? "UNKNOWN",
							transcript: input.transcript,
							queryText: input.queryText,
							contentSha256: observationContentSha256(input.transcript)
						}).returning();
						if (input.screenshot) await tx.insert(svObservationEvidenceAssets).values({
							organizationId: ctx.tenantId,
							observationId: observation.id,
							assetType: "SCREENSHOT",
							mimeType: input.screenshot.mimeType,
							sizeBytes: input.screenshot.sizeBytes,
							sha256: input.screenshot.sha256,
							sequenceIndex: 0,
							privateObjectReference: input.screenshot.privateObjectReference,
							uploadedBy: ctx.actorId,
							capturedAt: new Date(input.capturedAt)
						});
						if (input.coordinateProof) await tx.insert(svObservationEvidenceAssets).values({
							organizationId: ctx.tenantId,
							observationId: observation.id,
							assetType: "COORDINATE_PROOF",
							mimeType: input.coordinateProof.mimeType,
							sizeBytes: input.coordinateProof.sizeBytes,
							sha256: input.coordinateProof.sha256,
							sequenceIndex: 1,
							privateObjectReference: input.coordinateProof.privateObjectReference,
							uploadedBy: ctx.actorId,
							capturedAt: new Date(input.capturedAt)
						});
						await tx.update(svCaptureTasks).set({
							status: "SUBMITTED_FOR_REVIEW",
							updatedAt: /* @__PURE__ */ new Date()
						}).where(eq(svCaptureTasks.id, task.id));
						await recordAudit(tx, ctx, "OBSERVATION_SUBMITTED", "sv_local_observations", observation.id, {
							captureTaskId: task.id,
							pilotCycleId: cycle.id,
							idempotencyKey: input.idempotencyKey ?? null
						});
						return observation;
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					if (message === "OBSERVATION_CARDINALITY_BLOCKED" || message === "OBSERVATION_CARDINALITY_INVALID") await recordPilotOverflow(ctx, cycle.id, message);
					throw error;
				}
			},
			review: async (ctx, observationId, input) => {
				writable(ctx);
				if (!observationReviewDecisions.includes(input.decision)) throw new Error("OBSERVATION_REVIEW_DECISION_INVALID");
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [observation] = await tx.select().from(svLocalObservations).where(and(eq(svLocalObservations.id, observationId), eq(svLocalObservations.organizationId, ctx.tenantId))).for("update").limit(1);
					if (!observation) throw new Error("Not found: observation is outside AuthContext tenant");
					const [task] = await tx.select().from(svCaptureTasks).where(and(eq(svCaptureTasks.id, observation.captureTaskId), eq(svCaptureTasks.organizationId, ctx.tenantId))).for("update").limit(1);
					if (!task) throw new Error("OBSERVATION_REVIEW_STATE_MISMATCH");
					if (input.idempotencyKey) {
						const [priorReview] = await tx.select({ details: svAuditEvents.details }).from(svAuditEvents).where(and(eq(svAuditEvents.organizationId, ctx.tenantId), eq(svAuditEvents.event, "OBSERVATION_REVIEWED"), eq(svAuditEvents.subjectId, observationId), sql`${svAuditEvents.details} ->> 'idempotencyKey' = ${input.idempotencyKey}`)).limit(1);
						if (priorReview) {
							const details = priorReview.details;
							if (details.decision !== input.decision || (details.reason ?? null) !== (input.reason ?? null)) throw new Error("OBSERVATION_REVIEW_IDEMPOTENCY_CONFLICT");
							if (observation.reviewStatus !== input.decision || task.status !== input.decision) throw new Error("OBSERVATION_REVIEW_STATE_MISMATCH");
							return observation;
						}
					}
					if (observation.reviewStatus !== "SUBMITTED_FOR_REVIEW") throw new Error("OBSERVATION_ALREADY_REVIEWED");
					if (task.status !== "SUBMITTED_FOR_REVIEW") throw new Error("OBSERVATION_REVIEW_STATE_MISMATCH");
					const validity = input.decision === "ACCEPTED" || input.decision === "SURFACE_UNAVAILABLE" ? "VALID" : "INVALID";
					const [reviewed] = await tx.update(svLocalObservations).set({
						reviewStatus: input.decision,
						reviewedBy: ctx.actorId,
						reviewedAt: /* @__PURE__ */ new Date(),
						validity,
						invalidReason: validity === "INVALID" ? input.reason ?? input.decision : null
					}).where(and(eq(svLocalObservations.id, observationId), eq(svLocalObservations.organizationId, ctx.tenantId), eq(svLocalObservations.reviewStatus, "SUBMITTED_FOR_REVIEW"))).returning();
					if (!reviewed) throw new Error("OBSERVATION_REVIEW_CONFLICT");
					const [reviewedTask] = await tx.update(svCaptureTasks).set({
						status: input.decision,
						updatedAt: /* @__PURE__ */ new Date()
					}).where(and(eq(svCaptureTasks.id, observation.captureTaskId), eq(svCaptureTasks.organizationId, ctx.tenantId), eq(svCaptureTasks.status, "SUBMITTED_FOR_REVIEW"))).returning({ id: svCaptureTasks.id });
					if (!reviewedTask) throw new Error("OBSERVATION_REVIEW_STATE_MISMATCH");
					await recordAudit(tx, ctx, "OBSERVATION_REVIEWED", "sv_local_observations", observationId, {
						decision: input.decision,
						reason: input.reason ?? null,
						idempotencyKey: input.idempotencyKey ?? null
					});
					return reviewed;
				});
			}
		},
		mentions: { add: async (ctx, value) => {
			writable(ctx);
			return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
				const observation = await getObservationOwned(ctx, value.observationId, tx);
				assertMentionMatch({
					matchStatus: value.matchStatus,
					matchedEntityId: value.matchedEntityId
				});
				const explicitPosition = resolveExplicitPosition(observation.orderingState, value.explicitPosition);
				if (value.matchedEntityId) {
					const [entity] = await tx.select({ id: svEntities.id }).from(svEntities).where(and(eq(svEntities.id, value.matchedEntityId), eq(svEntities.organizationId, ctx.tenantId))).limit(1);
					if (!entity) throw new Error("Not found: entity is outside AuthContext tenant");
				}
				const [mention] = await tx.insert(svObservationMentions).values({
					organizationId: ctx.tenantId,
					observationId: value.observationId,
					rawMentionText: value.rawMentionText,
					matchedEntityId: value.matchedEntityId ?? null,
					mentionRole: value.mentionRole,
					matchStatus: value.matchStatus,
					matchConfidence: value.matchConfidence == null ? null : String(value.matchConfidence),
					explicitPosition,
					orderingBasis: value.orderingBasis ?? null,
					factualError: value.factualError ?? false,
					evidenceLocator: value.evidenceLocator ?? null
				}).returning();
				await recordAudit(tx, ctx, "MENTION_ADDED", "sv_observation_mentions", mention.id, { observationId: value.observationId });
				return mention;
			});
		} },
		evidenceAssets: { add: async (ctx, value) => {
			writable(ctx);
			return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
				await getObservationOwned(ctx, value.observationId, tx);
				const [asset] = await tx.insert(svObservationEvidenceAssets).values({
					organizationId: ctx.tenantId,
					observationId: value.observationId,
					assetType: value.assetType,
					mimeType: value.mimeType,
					sizeBytes: value.sizeBytes,
					sha256: value.sha256,
					sequenceIndex: value.sequenceIndex,
					privateObjectReference: value.privateObjectReference,
					uploadedBy: ctx.actorId,
					capturedAt: new Date(value.capturedAt)
				}).returning();
				await recordAudit(tx, ctx, "EVIDENCE_ASSET_ADDED", "sv_observation_evidence_assets", asset.id, { observationId: value.observationId });
				return asset;
			});
		} },
		qcRecords: {
			create: async (ctx, input) => {
				writable(ctx);
				assertQcDecision(input.decision);
				await withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					await assertOrderOwned(ctx, input.orderId, tx);
					if (input.cycleId) {
						const [cycle] = await tx.select({
							id: svCycles.id,
							orderId: svCycles.orderId
						}).from(svCycles).where(and(eq(svCycles.id, input.cycleId), eq(svCycles.organizationId, ctx.tenantId))).limit(1);
						if (!cycle || cycle.orderId !== input.orderId) throw new Error("Not found: cycle is outside AuthContext tenant");
					}
				});
				return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
					const [order] = await tx.select().from(svOrders).where(and(eq(svOrders.id, input.orderId), eq(svOrders.organizationId, ctx.tenantId))).for("update");
					if (!order) throw new Error("Not found: order is outside AuthContext tenant");
					const [record] = await tx.insert(svQcRecords).values({
						organizationId: ctx.tenantId,
						orderId: input.orderId,
						cycleId: input.cycleId ?? null,
						reviewer: input.reviewer ?? ctx.actorId,
						reviewedAt: new Date(input.reviewedAt),
						scope: input.scope,
						decision: input.decision,
						notes: input.notes ?? null
					}).returning();
					let published = false;
					if (input.decision === "approved") {
						const cycles = await tx.select().from(svCycles).where(and(eq(svCycles.orderId, input.orderId), eq(svCycles.organizationId, ctx.tenantId)));
						assertQcApprovable(order.status, cycles);
						await tx.update(svCycles).set({
							status: "READY",
							updatedAt: /* @__PURE__ */ new Date()
						}).where(and(eq(svCycles.orderId, input.orderId), eq(svCycles.organizationId, ctx.tenantId), eq(svCycles.status, "QC_REQUIRED")));
						await tx.update(svOrders).set({
							status: "READY",
							updatedAt: /* @__PURE__ */ new Date()
						}).where(and(eq(svOrders.id, input.orderId), eq(svOrders.organizationId, ctx.tenantId), eq(svOrders.status, "QC_REQUIRED")));
						published = true;
					}
					await recordAudit(tx, ctx, "QC_RECORD_CREATED", "sv_qc_records", record.id, {
						orderId: input.orderId,
						cycleId: input.cycleId ?? null,
						decision: input.decision,
						published
					});
					return record;
				});
			},
			latestForOrder: latestQcRecordForOrder,
			hasApprovedQcRecord: async (ctx, orderId) => (await latestQcRecordForOrder(ctx, orderId))?.decision === "approved"
		}
	};
}
//#endregion
export { lockedProfileBlock as a, selectEnqueueablePermits as c, isMaintenanceEnabled as i, analysisSubjectsFromProfile as n, parseLockedAnalysisSubjects as o, createSelenaRepositories as r, qcDecisions as s, allocateConfigurationLockInTransaction as t };

//# sourceMappingURL=selena-visibility-repositories-DjKDsg4F.mjs.map