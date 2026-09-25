import { I as expectedRunsFromScope, Xt as visitorSurfaces, _t as monthlyAnswerAllowance, a as SELENA_CHECKOUT_METADATA, gt as measurementScopeSchema, i as SELENA_CATALOG_VERSION, r as SELENA_CATALOG, u as apiModelIds } from "./src-BdeAuGX5.mjs";
import { C as notInArray, L as sql, d as and, f as eq, g as inArray, m as gte, u as desc } from "../_libs/drizzle-orm.mjs";
import { Q as svPayments, S as svConfigurationLocks, Z as svOrders, et as svProjectProfiles, ht as svScenarios, it as svQuotes, nt as svPromptFamilies, tt as svProjects, v as svAuditEvents, w as svCycles } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { n as paymentConfigFromEnv, t as assertPaymentAllowed } from "./payment-CX6LylpI.mjs";
import { a as lockedProfileBlock, n as analysisSubjectsFromProfile, r as createSelenaRepositories, t as allocateConfigurationLockInTransaction } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { i as enqueueOrderRunsForOrder, t as approveOrder } from "./selena-admin-orders-CbZS8oDU.mjs";
import { n as MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES, t as MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES } from "./selena-monthly-allowance-D_oHYZLf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-desk-core-VYmlVsWR.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8412a9b6-8796-4144-9152-7656e24db490", e._sentryDebugIdIdentifier = "sentry-dbid-8412a9b6-8796-4144-9152-7656e24db490");
	} catch (e) {}
})();
function freezeSelenaOrderRequest(input) {
	return {
		schemaVersion: 1,
		projectId: input.projectId,
		planId: input.planId,
		scenarioIds: [...input.scenarioIds].sort()
	};
}
function matchesFrozenSelenaOrderRequest(value, input) {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value;
	if (candidate.schemaVersion !== 1 || candidate.projectId !== input.projectId || candidate.planId !== input.planId || !Array.isArray(candidate.scenarioIds) || !candidate.scenarioIds.every((scenarioId) => typeof scenarioId === "string")) return false;
	return JSON.stringify([...candidate.scenarioIds].sort()) === JSON.stringify([...input.scenarioIds].sort());
}
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
/** The family every promoted profile question lands in, one per project. */
var PROFILE_FAMILY_SOURCE = "brand_profile";
function readProfileQuestions(snapshot) {
	if (!Array.isArray(snapshot)) return [];
	return snapshot.flatMap((entry) => {
		if (typeof entry !== "object" || entry === null) return [];
		const record = entry;
		const text = typeof record.text === "string" ? record.text.trim() : "";
		if (text === "") return [];
		return [{
			text,
			language: typeof record.language === "string" ? record.language : "en",
			intentType: typeof record.intentType === "string" ? record.intentType : "discovery"
		}];
	});
}
async function getSelenaOrderDesk(context) {
	return withOrganizationTransaction(db, context.tenantId, async (tx) => {
		const projects = await tx.select({
			id: svProjects.id,
			name: svProjects.name,
			category: svProjects.category,
			country: svProjects.country,
			region: svProjects.region,
			languages: svProjects.languages,
			brandName: svProjectProfiles.brandName,
			primaryDomain: svProjectProfiles.primaryDomain,
			profileConfirmedAt: svProjectProfiles.confirmedAt,
			scenarioSnapshot: svProjectProfiles.scenarioSnapshot
		}).from(svProjects).leftJoin(svProjectProfiles, eq(svProjectProfiles.projectId, svProjects.id)).where(eq(svProjects.organizationId, context.tenantId)).orderBy(desc(svProjects.createdAt));
		return Promise.all(projects.map(async (project) => {
			const scenarios = await tx.select({
				id: svScenarios.id,
				text: svScenarios.text,
				language: svScenarios.language,
				status: svScenarios.status
			}).from(svScenarios).innerJoin(svPromptFamilies, eq(svScenarios.familyId, svPromptFamilies.id)).where(and(eq(svPromptFamilies.projectId, project.id), eq(svScenarios.organizationId, context.tenantId))).orderBy(svScenarios.createdAt);
			return {
				id: project.id,
				name: project.name,
				category: project.category,
				country: project.country,
				region: project.region,
				languages: project.languages,
				brandName: project.brandName,
				primaryDomain: project.primaryDomain,
				profileConfirmedAt: project.profileConfirmedAt,
				profileQuestions: readProfileQuestions(project.scenarioSnapshot).length,
				scenarios
			};
		}));
	});
}
/**
* Copy the confirmed profile's questions into scenario rows, as PROPOSED.
*
* Idempotent by text: running it again after the customer edits their profile
* adds only what is new, so an approval already given is never silently reset.
*/
async function prepareSelenaScenarios(context, projectId) {
	const profile = await repositories.profiles.get(context, projectId);
	if (!profile) throw new Error("SELENA_PROFILE_MISSING");
	if (!profile.confirmedAt) throw new Error("SELENA_PROFILE_NOT_CONFIRMED");
	const questions = readProfileQuestions(profile.scenarioSnapshot);
	if (questions.length === 0) throw new Error("SELENA_PROFILE_HAS_NO_QUESTIONS");
	const [existingFamily] = await withOrganizationTransaction(db, context.tenantId, (tx) => tx.select({ id: svPromptFamilies.id }).from(svPromptFamilies).where(and(eq(svPromptFamilies.projectId, projectId), eq(svPromptFamilies.organizationId, context.tenantId), eq(svPromptFamilies.source, PROFILE_FAMILY_SOURCE))).limit(1));
	const family = existingFamily ?? await repositories.families.create(context, {
		projectId,
		intentType: "discovery",
		source: PROFILE_FAMILY_SOURCE,
		status: "PROPOSED"
	});
	const existing = await repositories.scenarios.list(context, family.id);
	const known = new Set(existing.map((scenario) => scenario.text));
	const fresh = questions.filter((question) => !known.has(question.text));
	for (const question of fresh) await repositories.scenarios.create(context, {
		familyId: family.id,
		text: question.text,
		language: question.language,
		status: "PROPOSED"
	});
	return {
		familyId: family.id,
		added: fresh.length,
		total: existing.length + fresh.length
	};
}
/**
* The human gate. A scenario reaches a paid run only by being approved here,
* so an auto-suggested question that misreads the business dies at this step
* instead of becoming a measurement nobody can interpret.
*/
async function decideSelenaScenarios(context, data) {
	return withOrganizationTransaction(db, context.tenantId, async (tx) => {
		if ((await tx.select({ id: svScenarios.id }).from(svScenarios).innerJoin(svPromptFamilies, eq(svScenarios.familyId, svPromptFamilies.id)).where(and(inArray(svScenarios.id, data.scenarioIds), eq(svScenarios.organizationId, context.tenantId), eq(svPromptFamilies.projectId, data.projectId)))).length !== data.scenarioIds.length) throw new Error("Not found: scenario is outside AuthContext tenant or project");
		await tx.update(svScenarios).set({
			status: data.decision,
			updatedAt: /* @__PURE__ */ new Date()
		}).where(and(inArray(svScenarios.id, data.scenarioIds), eq(svScenarios.organizationId, context.tenantId)));
		return {
			updated: data.scenarioIds.length,
			decision: data.decision
		};
	});
}
function scopeForPlan(plan, scenarioIds) {
	const systems = plan.systems.map((systemId) => ({
		systemId,
		channel: visitorSurfaces.includes(systemId) ? "VISITOR" : "API"
	}));
	const unknown = plan.systems.filter((systemId) => !visitorSurfaces.includes(systemId) && !apiModelIds.includes(systemId));
	if (unknown.length > 0) throw new Error(`SELENA_UNKNOWN_CATALOG_SYSTEM: ${unknown.join(", ")}`);
	return measurementScopeSchema.parse({
		scenarios: scenarioIds,
		systems,
		repeats: plan.repeatCount ?? 1
	});
}
async function createSelenaOrderDraft(context, data) {
	return withOrganizationTransaction(db, context.tenantId, async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('selena-order-draft:test:' || ${data.idempotencyKey}, 0))`);
		const [existing] = await tx.select({
			paymentId: svPayments.id,
			paymentOrganizationId: svPayments.organizationId,
			paymentStatus: svPayments.status,
			orderId: svOrders.id,
			orderOrganizationId: svOrders.organizationId,
			orderProjectId: svOrders.projectId,
			orderStatus: svOrders.status,
			orderCap: svOrders.orderCap,
			lockId: svConfigurationLocks.id,
			lockOrganizationId: svConfigurationLocks.organizationId,
			lockProjectId: svConfigurationLocks.projectId,
			lockVersion: svConfigurationLocks.version,
			lockSnapshot: svConfigurationLocks.snapshot,
			lockExpectedRuns: svConfigurationLocks.expectedRuns,
			quoteId: svQuotes.id,
			quoteOrganizationId: svQuotes.organizationId,
			quoteProjectId: svQuotes.projectId,
			quoteLockId: svQuotes.lockId,
			quotePrice: svQuotes.priceAmount,
			quoteCurrency: svQuotes.currency,
			quoteExpectedRuns: svQuotes.expectedRuns
		}).from(svPayments).innerJoin(svOrders, eq(svOrders.id, svPayments.orderId)).innerJoin(svQuotes, eq(svQuotes.id, svOrders.quoteId)).innerJoin(svConfigurationLocks, eq(svConfigurationLocks.id, svOrders.lockId)).where(and(eq(svPayments.provider, "test"), eq(svPayments.providerEventId, data.idempotencyKey))).limit(1);
		if (existing) {
			const snapshot = typeof existing.lockSnapshot === "object" && existing.lockSnapshot !== null ? existing.lockSnapshot : {};
			if (!(existing.paymentOrganizationId === context.tenantId && existing.orderOrganizationId === context.tenantId && existing.quoteOrganizationId === context.tenantId && existing.lockOrganizationId === context.tenantId && existing.paymentStatus === "SUCCEEDED" && existing.orderProjectId === data.projectId && existing.quoteProjectId === data.projectId && existing.lockProjectId === data.projectId && existing.quoteLockId === existing.lockId && existing.quoteExpectedRuns === existing.lockExpectedRuns && matchesFrozenSelenaOrderRequest(snapshot.orderRequest, data))) throw new Error("SELENA_ORDER_IDEMPOTENCY_CONFLICT");
			const retryPlan = SELENA_CATALOG[data.planId];
			return {
				orderId: existing.orderId,
				lockId: existing.lockId,
				lockVersion: existing.lockVersion,
				quoteId: existing.quoteId,
				planId: retryPlan.planId,
				planName: retryPlan.name,
				price: Number(existing.quotePrice),
				currency: existing.quoteCurrency,
				expectedRuns: existing.lockExpectedRuns,
				budgetCap: Number(existing.orderCap),
				status: existing.orderStatus,
				paymentRecorded: true
			};
		}
		assertPaymentAllowed(paymentConfigFromEnv(process.env), "test");
		const plan = SELENA_CATALOG[data.planId];
		const scope = scopeForPlan(plan, data.scenarioIds);
		const expectedRuns = expectedRunsFromScope(scope);
		const approved = await tx.select({
			id: svScenarios.id,
			text: svScenarios.text,
			language: svScenarios.language
		}).from(svScenarios).innerJoin(svPromptFamilies, eq(svScenarios.familyId, svPromptFamilies.id)).where(and(inArray(svScenarios.id, data.scenarioIds), eq(svScenarios.organizationId, context.tenantId), eq(svPromptFamilies.projectId, data.projectId), eq(svScenarios.status, "APPROVED")));
		if (approved.length !== data.scenarioIds.length) throw new Error("SELENA_SCENARIOS_NOT_APPROVED");
		if (plan.scenarioLimit !== null && approved.length > plan.scenarioLimit) throw new Error(`SELENA_PLAN_SCENARIO_LIMIT_EXCEEDED: ${plan.scenarioLimit}`);
		if (plan.questionLimitPerMeasurement !== null) {
			const scenarioCap = plan.questionLimitPerMeasurement * Math.max(1, plan.languageLimit);
			if (data.scenarioIds.length > scenarioCap) throw new Error(`SELENA_QUESTION_LIMIT_EXCEEDED: this plan takes up to ${plan.questionLimitPerMeasurement} questions (${scenarioCap} language scenarios) per measurement, got ${data.scenarioIds.length}`);
		}
		const allowance = monthlyAnswerAllowance(plan.planId);
		if (allowance !== null) {
			const monthStart = /* @__PURE__ */ new Date();
			monthStart.setUTCDate(1);
			monthStart.setUTCHours(0, 0, 0, 0);
			const [usage] = await tx.select({ used: sql`coalesce(sum(${svCycles.expectedRuns}), 0)` }).from(svCycles).innerJoin(svOrders, eq(svCycles.orderId, svOrders.id)).where(and(eq(svOrders.projectId, data.projectId), eq(svOrders.organizationId, context.tenantId), gte(svCycles.createdAt, monthStart), notInArray(svOrders.status, [...MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES]), notInArray(svCycles.status, [...MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES])));
			const used = Number(usage?.used ?? 0);
			if (used + expectedRuns > allowance) throw new Error(`SELENA_MONTHLY_ALLOWANCE_EXCEEDED: used ${used} of ${allowance} this month; this measurement needs ${expectedRuns} more`);
		}
		const [profile] = await tx.select().from(svProjectProfiles).where(and(eq(svProjectProfiles.projectId, data.projectId), eq(svProjectProfiles.organizationId, context.tenantId))).limit(1);
		if (!profile) throw new Error("SELENA_PROFILE_MISSING");
		const subjects = analysisSubjectsFromProfile(profile);
		const lock = await allocateConfigurationLockInTransaction(tx, context, {
			projectId: data.projectId,
			snapshot: {
				orderRequest: freezeSelenaOrderRequest(data),
				measurementScope: scope,
				analysisSubjects: subjects,
				profile: lockedProfileBlock(profile),
				planId: plan.planId,
				catalogVersion: SELENA_CATALOG_VERSION,
				scenarios: approved.map((scenario) => ({
					id: scenario.id,
					text: scenario.text,
					language: scenario.language
				}))
			},
			engineSha: SELENA_CATALOG_VERSION,
			expectedRuns,
			budgetCap: String(plan.providerBudgetCap)
		});
		const [quote] = await tx.insert(svQuotes).values({
			organizationId: context.tenantId,
			projectId: data.projectId,
			lockId: lock.id,
			status: "ISSUED",
			priceAmount: String(plan.price),
			currency: plan.currency,
			expectedRuns,
			expiresAt: new Date(Date.now() + 6048e5)
		}).returning();
		if (!quote) throw new Error("SELENA_ORDER_DRAFT_WRITE_FAILED");
		const [order] = await tx.insert(svOrders).values({
			organizationId: context.tenantId,
			projectId: data.projectId,
			quoteId: quote.id,
			lockId: lock.id,
			status: "AWAITING_PAYMENT",
			orderCap: String(plan.providerBudgetCap)
		}).returning();
		if (!order) throw new Error("SELENA_ORDER_DRAFT_WRITE_FAILED");
		const [payment] = await tx.insert(svPayments).values({
			organizationId: context.tenantId,
			orderId: order.id,
			provider: "test",
			providerEventId: data.idempotencyKey,
			status: "SUCCEEDED",
			amount: String(plan.price),
			currency: plan.currency
		}).onConflictDoNothing({ target: [svPayments.provider, svPayments.providerEventId] }).returning({ id: svPayments.id });
		if (!payment) throw new Error("SELENA_ORDER_IDEMPOTENCY_CONFLICT");
		await tx.update(svOrders).set({
			status: "PAID_REVIEW_REQUIRED",
			paidAt: /* @__PURE__ */ new Date(),
			updatedAt: /* @__PURE__ */ new Date()
		}).where(and(eq(svOrders.id, order.id), eq(svOrders.organizationId, context.tenantId)));
		await tx.insert(svAuditEvents).values({
			organizationId: context.tenantId,
			actorId: context.actorId,
			event: "ORDER_DRAFTED",
			subjectKind: "sv_orders",
			subjectId: order.id,
			details: {
				planId: plan.planId,
				lockId: lock.id,
				lockVersion: lock.version,
				quoteId: quote.id,
				expectedRuns,
				scenarioCount: approved.length,
				idempotencyKey: data.idempotencyKey,
				checkoutMetadata: SELENA_CHECKOUT_METADATA
			}
		});
		return {
			orderId: order.id,
			lockId: lock.id,
			lockVersion: lock.version,
			quoteId: quote.id,
			planId: plan.planId,
			planName: plan.name,
			price: plan.price,
			currency: plan.currency,
			expectedRuns,
			budgetCap: plan.providerBudgetCap,
			status: "PAID_REVIEW_REQUIRED",
			paymentRecorded: true
		};
	});
}
/**
* Order, approve and queue in one action.
*
* The judgement an operator makes is which questions are worth measuring;
* ordering, approving and queueing are three clicks on a decision already
* taken. They stay three separate gates in the code — this only stops asking
* three times for one answer, and spends nothing until something calls it.
*
* Its callers are what decide: the operator's own action, or a free request
* that passed the auto-dispatch caps.
*/
async function startSelenaMeasurement(context, data) {
	const draft = await createSelenaOrderDraft(context, data);
	if (!draft.paymentRecorded) return {
		...draft,
		approved: null,
		queued: null,
		stoppedAt: "payment"
	};
	const approved = await approveOrder(context, draft.orderId, `${data.idempotencyKey}:approve`);
	const queued = await enqueueOrderRunsForOrder(context, draft.orderId, `${data.idempotencyKey}:enqueue`);
	return {
		...draft,
		approved: {
			permits: approved.created,
			expected: approved.expected
		},
		queued: {
			enqueued: queued.enqueued,
			skipped: queued.skipped,
			reason: queued.reason
		},
		stoppedAt: queued.reason ? "execution" : null
	};
}
//#endregion
export { startSelenaMeasurement as a, prepareSelenaScenarios as i, decideSelenaScenarios as n, getSelenaOrderDesk as r, createSelenaOrderDraft as t };

//# sourceMappingURL=selena-order-desk-core-VYmlVsWR.mjs.map