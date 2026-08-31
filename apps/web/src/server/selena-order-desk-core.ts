import { db } from "@workspace/lib/db/db";
import {
	svAuditEvents,
	svConfigurationLocks,
	svCycles,
	svOrders,
	svPayments,
	svProjectProfiles,
	svProjects,
	svPromptFamilies,
	svQuotes,
	svScenarios,
} from "@workspace/lib/db/schema";
import { lockedProfileBlock } from "@workspace/lib/selena-extraction-context";
import {
	allocateConfigurationLockInTransaction,
	createSelenaRepositories,
	type SelenaRepositoryContext,
} from "@workspace/lib/selena-visibility-repositories";
import {
	analysisSubjectsSchema,
	apiModelIds,
	assertPaymentAllowed,
	expectedRunsFromScope,
	type MeasurementScope,
	measurementScopeSchema,
	monthlyAnswerAllowance,
	paymentConfigFromEnv,
	type planIds,
	SELENA_CATALOG,
	SELENA_CATALOG_VERSION,
	SELENA_CHECKOUT_METADATA,
	type SelenaPlan,
	type SelenaPlanId,
	visitorSurfaces,
} from "@workspace/selena-visibility-contracts";
import { and, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import {
	MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES,
	MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES,
} from "@/lib/selena-monthly-allowance";
import { approveOrder, enqueueOrderRunsForOrder } from "./selena-admin-orders";
import { freezeSelenaOrderRequest, matchesFrozenSelenaOrderRequest } from "./selena-order-idempotency";

// The order desk: where a confirmed brand profile becomes an order the
// operator queue can act on. It contacts no provider and starts no run — it
// ends at PAID_REVIEW_REQUIRED, which is exactly where the approval screen
// begins.
//
// The questions a customer typed live in the profile snapshot as free text.
// A measurement addresses scenario rows, so this module promotes that text
// into scenarios a human then approves one by one: nothing is measured that a
// person did not read and accept, which is the whole point of the
// configuration lock.

const repositories = /* @__PURE__ */ createSelenaRepositories(db);

/** The family every promoted profile question lands in, one per project. */
const PROFILE_FAMILY_SOURCE = "brand_profile";

type ProfileQuestion = { text: string; language: string; intentType: string };

function readProfileQuestions(snapshot: unknown): ProfileQuestion[] {
	if (!Array.isArray(snapshot)) return [];
	return snapshot.flatMap((entry) => {
		if (typeof entry !== "object" || entry === null) return [];
		const record = entry as Record<string, unknown>;
		const text = typeof record.text === "string" ? record.text.trim() : "";
		if (text === "") return [];
		return [
			{
				text,
				language: typeof record.language === "string" ? record.language : "en",
				intentType: typeof record.intentType === "string" ? record.intentType : "discovery",
			},
		];
	});
}

function readProfileCompetitors(snapshot: unknown): { name: string; domain?: string }[] {
	if (!Array.isArray(snapshot)) return [];
	return snapshot.flatMap((entry) => {
		if (typeof entry !== "object" || entry === null) return [];
		const record = entry as Record<string, unknown>;
		const name = typeof record.name === "string" ? record.name.trim() : "";
		if (name === "") return [];
		const domains = Array.isArray(record.domains) ? record.domains : [];
		const domain = domains.find((value): value is string => typeof value === "string" && value.trim() !== "");
		return [domain ? { name, domain } : { name }];
	});
}

export async function getSelenaOrderDesk(context: SelenaRepositoryContext) {
	const projects = await db
		.select({
			id: svProjects.id,
			name: svProjects.name,
			category: svProjects.category,
			country: svProjects.country,
			region: svProjects.region,
			languages: svProjects.languages,
			brandName: svProjectProfiles.brandName,
			primaryDomain: svProjectProfiles.primaryDomain,
			profileConfirmedAt: svProjectProfiles.confirmedAt,
			scenarioSnapshot: svProjectProfiles.scenarioSnapshot,
		})
		.from(svProjects)
		.leftJoin(svProjectProfiles, eq(svProjectProfiles.projectId, svProjects.id))
		.where(eq(svProjects.organizationId, context.tenantId))
		.orderBy(desc(svProjects.createdAt));

	return Promise.all(
		projects.map(async (project) => {
			const scenarios = await db
				.select({
					id: svScenarios.id,
					text: svScenarios.text,
					language: svScenarios.language,
					status: svScenarios.status,
				})
				.from(svScenarios)
				.innerJoin(svPromptFamilies, eq(svScenarios.familyId, svPromptFamilies.id))
				.where(and(eq(svPromptFamilies.projectId, project.id), eq(svScenarios.organizationId, context.tenantId)))
				.orderBy(svScenarios.createdAt);
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
				scenarios,
			};
		}),
	);
}

/**
 * Copy the confirmed profile's questions into scenario rows, as PROPOSED.
 *
 * Idempotent by text: running it again after the customer edits their profile
 * adds only what is new, so an approval already given is never silently reset.
 */
export async function prepareSelenaScenarios(context: SelenaRepositoryContext, projectId: string) {
	const profile = await repositories.profiles.get(context, projectId);
	if (!profile) throw new Error("SELENA_PROFILE_MISSING");
	if (!profile.confirmedAt) throw new Error("SELENA_PROFILE_NOT_CONFIRMED");
	const questions = readProfileQuestions(profile.scenarioSnapshot);
	if (questions.length === 0) throw new Error("SELENA_PROFILE_HAS_NO_QUESTIONS");

	const [existingFamily] = await db
		.select({ id: svPromptFamilies.id })
		.from(svPromptFamilies)
		.where(
			and(
				eq(svPromptFamilies.projectId, projectId),
				eq(svPromptFamilies.organizationId, context.tenantId),
				eq(svPromptFamilies.source, PROFILE_FAMILY_SOURCE),
			),
		)
		.limit(1);
	const family =
		existingFamily ??
		(await repositories.families.create(context, {
			projectId,
			intentType: "discovery",
			source: PROFILE_FAMILY_SOURCE,
			status: "PROPOSED",
		}));

	const existing = await repositories.scenarios.list(context, family.id);
	const known = new Set(existing.map((scenario) => scenario.text));
	const fresh = questions.filter((question) => !known.has(question.text));
	for (const question of fresh) {
		await repositories.scenarios.create(context, {
			familyId: family.id,
			text: question.text,
			language: question.language,
			status: "PROPOSED",
		});
	}
	return { familyId: family.id, added: fresh.length, total: existing.length + fresh.length };
}

/**
 * The human gate. A scenario reaches a paid run only by being approved here,
 * so an auto-suggested question that misreads the business dies at this step
 * instead of becoming a measurement nobody can interpret.
 */
export async function decideSelenaScenarios(
	context: SelenaRepositoryContext,
	data: {
		projectId: string;
		scenarioIds: string[];
		decision: "APPROVED" | "REJECTED" | "PROPOSED";
	},
) {
	const owned = await db
		.select({ id: svScenarios.id })
		.from(svScenarios)
		.innerJoin(svPromptFamilies, eq(svScenarios.familyId, svPromptFamilies.id))
		.where(
			and(
				inArray(svScenarios.id, data.scenarioIds),
				eq(svScenarios.organizationId, context.tenantId),
				eq(svPromptFamilies.projectId, data.projectId),
			),
		);
	if (owned.length !== data.scenarioIds.length)
		throw new Error("Not found: scenario is outside AuthContext tenant or project");
	await db
		.update(svScenarios)
		.set({ status: data.decision, updatedAt: new Date() })
		.where(and(inArray(svScenarios.id, data.scenarioIds), eq(svScenarios.organizationId, context.tenantId)));
	return { updated: data.scenarioIds.length, decision: data.decision };
}

function scopeForPlan(plan: SelenaPlan, scenarioIds: string[]): MeasurementScope {
	const systems = plan.systems.map((systemId) => ({
		systemId,
		channel: (visitorSurfaces as readonly string[]).includes(systemId) ? ("VISITOR" as const) : ("API" as const),
	}));
	const unknown = plan.systems.filter(
		(systemId) =>
			!(visitorSurfaces as readonly string[]).includes(systemId) &&
			!(apiModelIds as readonly string[]).includes(systemId),
	);
	if (unknown.length > 0) throw new Error(`SELENA_UNKNOWN_CATALOG_SYSTEM: ${unknown.join(", ")}`);
	return measurementScopeSchema.parse({
		scenarios: scenarioIds,
		systems,
		repeats: plan.repeatCount ?? 1,
	});
}

/**
 * Build one order from an approved scope: configuration lock, quote, order and
 * the recorded test payment that leaves it at PAID_REVIEW_REQUIRED.
 *
 * The lock is what a run is measured against, so it is written before the
 * money objects and never mutated afterwards: an order that has been paid for
 * always points at the exact scope the customer agreed to.
 */
type OrderDraftInput = {
	projectId: string;
	planId: (typeof planIds)[number];
	scenarioIds: string[];
	idempotencyKey: string;
};

export async function createSelenaOrderDraft(context: SelenaRepositoryContext, data: OrderDraftInput) {
	return db.transaction(async (tx) => {
		// The provider event key is globally unique in the ledger, so its lock is
		// global too. It serializes both same-tenant retries and a cross-tenant
		// collision before either path can mint immutable rows.
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended('selena-order-draft:test:' || ${data.idempotencyKey}, 0))`,
		);
		const [existing] = await tx
			.select({
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
				quoteExpectedRuns: svQuotes.expectedRuns,
			})
			.from(svPayments)
			.innerJoin(svOrders, eq(svOrders.id, svPayments.orderId))
			.innerJoin(svQuotes, eq(svQuotes.id, svOrders.quoteId))
			.innerJoin(svConfigurationLocks, eq(svConfigurationLocks.id, svOrders.lockId))
			.where(and(eq(svPayments.provider, "test"), eq(svPayments.providerEventId, data.idempotencyKey)))
			.limit(1);
		if (existing) {
			const snapshot =
				typeof existing.lockSnapshot === "object" && existing.lockSnapshot !== null
					? (existing.lockSnapshot as Record<string, unknown>)
					: {};
			const sameRequest =
				existing.paymentOrganizationId === context.tenantId &&
				existing.orderOrganizationId === context.tenantId &&
				existing.quoteOrganizationId === context.tenantId &&
				existing.lockOrganizationId === context.tenantId &&
				existing.paymentStatus === "SUCCEEDED" &&
				existing.orderProjectId === data.projectId &&
				existing.quoteProjectId === data.projectId &&
				existing.lockProjectId === data.projectId &&
				existing.quoteLockId === existing.lockId &&
				existing.quoteExpectedRuns === existing.lockExpectedRuns &&
				matchesFrozenSelenaOrderRequest(snapshot.orderRequest, data);
			if (!sameRequest) throw new Error("SELENA_ORDER_IDEMPOTENCY_CONFLICT");
			const retryPlan = SELENA_CATALOG[data.planId as SelenaPlanId];
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
				paymentRecorded: true,
			};
		}

		// A disabled payment gate blocks only a new write. A completed retry
		// above is a read of the result already committed under this key.
		assertPaymentAllowed(paymentConfigFromEnv(process.env), "test");
		const plan = SELENA_CATALOG[data.planId as SelenaPlanId];
		const scope = scopeForPlan(plan, data.scenarioIds);
		const expectedRuns = expectedRunsFromScope(scope);

		const approved = await tx
			.select({ id: svScenarios.id, text: svScenarios.text, language: svScenarios.language })
			.from(svScenarios)
			.innerJoin(svPromptFamilies, eq(svScenarios.familyId, svPromptFamilies.id))
			.where(
				and(
					inArray(svScenarios.id, data.scenarioIds),
					eq(svScenarios.organizationId, context.tenantId),
					eq(svPromptFamilies.projectId, data.projectId),
					eq(svScenarios.status, "APPROVED"),
				),
			);
		if (approved.length !== data.scenarioIds.length) throw new Error("SELENA_SCENARIOS_NOT_APPROVED");
		if (plan.scenarioLimit !== null && approved.length > plan.scenarioLimit)
			throw new Error(`SELENA_PLAN_SCENARIO_LIMIT_EXCEEDED: ${plan.scenarioLimit}`);

		// One measurement takes at most the plan's question count (× languages):
		// twenty-five real questions beat a hundred invented ones.
		if (plan.questionLimitPerMeasurement !== null) {
			const scenarioCap = plan.questionLimitPerMeasurement * Math.max(1, plan.languageLimit);
			if (data.scenarioIds.length > scenarioCap)
				throw new Error(
					`SELENA_QUESTION_LIMIT_EXCEEDED: this plan takes up to ${plan.questionLimitPerMeasurement} questions (${scenarioCap} language scenarios) per measurement, got ${data.scenarioIds.length}`,
				);
		}
		// The pricing page quotes a monthly allowance (300/800 answers); an
		// order that would overrun it is refused with the numbers, not queued
		// quietly. Usage counts this calendar month's created, non-cancelled,
		// non-terminal cycles. Stopped, failed and cardinality incidents release
		// allowance; orders awaiting review still have no cycle and remain the
		// operator's call.
		const allowance = monthlyAnswerAllowance(plan.planId);
		if (allowance !== null) {
			const monthStart = new Date();
			monthStart.setUTCDate(1);
			monthStart.setUTCHours(0, 0, 0, 0);
			const [usage] = await tx
				.select({ used: sql<number>`coalesce(sum(${svCycles.expectedRuns}), 0)` })
				.from(svCycles)
				.innerJoin(svOrders, eq(svCycles.orderId, svOrders.id))
				.where(
					and(
						eq(svOrders.projectId, data.projectId),
						eq(svOrders.organizationId, context.tenantId),
						gte(svCycles.createdAt, monthStart),
						notInArray(svOrders.status, [...MONTHLY_ALLOWANCE_EXCLUDED_ORDER_STATUSES]),
						notInArray(svCycles.status, [...MONTHLY_ALLOWANCE_EXCLUDED_CYCLE_STATUSES]),
					),
				);
			const used = Number(usage?.used ?? 0);
			if (used + expectedRuns > allowance)
				throw new Error(
					`SELENA_MONTHLY_ALLOWANCE_EXCEEDED: used ${used} of ${allowance} this month; this measurement needs ${expectedRuns} more`,
				);
		}

		// Frozen with the scope: analysis looks for exactly the brand and
		// competitors the customer agreed to, so a later profile edit cannot
		// change what a paid report says.
		const [profile] = await tx
			.select()
			.from(svProjectProfiles)
			.where(
				and(eq(svProjectProfiles.projectId, data.projectId), eq(svProjectProfiles.organizationId, context.tenantId)),
			)
			.limit(1);
		if (!profile) throw new Error("SELENA_PROFILE_MISSING");
		const subjects = analysisSubjectsSchema.parse({
			brand: {
				name: profile.brandName,
				domain: profile.primaryDomain,
			},
			competitors: readProfileCompetitors(profile.competitorSnapshot),
		});

		const lock = await allocateConfigurationLockInTransaction(tx, context, {
			projectId: data.projectId,
			snapshot: {
				orderRequest: freezeSelenaOrderRequest(data),
				measurementScope: scope,
				analysisSubjects: subjects,
				// The extraction resolver prefers this block over the live
				// profile: without it a profile edit after purchase would change
				// what the cycle's runs are measured against.
				profile: lockedProfileBlock(profile),
				planId: plan.planId,
				catalogVersion: SELENA_CATALOG_VERSION,
				scenarios: approved.map((scenario) => ({
					id: scenario.id,
					text: scenario.text,
					language: scenario.language,
				})),
			},
			// The catalog version is what a run is reproducible against until a
			// build stamp is threaded through the deployment.
			engineSha: SELENA_CATALOG_VERSION,
			expectedRuns,
			budgetCap: String(plan.providerBudgetCap),
		});

		const [quote] = await tx
			.insert(svQuotes)
			.values({
				organizationId: context.tenantId,
				projectId: data.projectId,
				lockId: lock.id,
				status: "ISSUED",
				priceAmount: String(plan.price),
				currency: plan.currency,
				expectedRuns,
				expiresAt: new Date(Date.now() + 7 * 86400000),
			})
			.returning();
		if (!quote) throw new Error("SELENA_ORDER_DRAFT_WRITE_FAILED");

		const [order] = await tx
			.insert(svOrders)
			.values({
				organizationId: context.tenantId,
				projectId: data.projectId,
				quoteId: quote.id,
				lockId: lock.id,
				status: "AWAITING_PAYMENT",
				// The order cap bounds provider spend, not the price: it is what
				// preflight measures the worst-case run cost against.
				orderCap: String(plan.providerBudgetCap),
			})
			.returning();
		if (!order) throw new Error("SELENA_ORDER_DRAFT_WRITE_FAILED");

		const [payment] = await tx
			.insert(svPayments)
			.values({
				organizationId: context.tenantId,
				orderId: order.id,
				provider: "test",
				providerEventId: data.idempotencyKey,
				status: "SUCCEEDED",
				amount: String(plan.price),
				currency: plan.currency,
			})
			.onConflictDoNothing({ target: [svPayments.provider, svPayments.providerEventId] })
			.returning({ id: svPayments.id });
		if (!payment) throw new Error("SELENA_ORDER_IDEMPOTENCY_CONFLICT");
		await tx
			.update(svOrders)
			.set({ status: "PAID_REVIEW_REQUIRED", paidAt: new Date(), updatedAt: new Date() })
			.where(and(eq(svOrders.id, order.id), eq(svOrders.organizationId, context.tenantId)));

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
				checkoutMetadata: SELENA_CHECKOUT_METADATA,
			},
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
			paymentRecorded: true,
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
export async function startSelenaMeasurement(context: SelenaRepositoryContext, data: OrderDraftInput) {
	const draft = await createSelenaOrderDraft(context, data);
	if (!draft.paymentRecorded) return { ...draft, approved: null, queued: null, stoppedAt: "payment" as const };

	const approved = await approveOrder(context, draft.orderId, `${data.idempotencyKey}:approve`);
	const queued = await enqueueOrderRunsForOrder(context, draft.orderId, `${data.idempotencyKey}:enqueue`);
	return {
		...draft,
		approved: { permits: approved.created, expected: approved.expected },
		queued: { enqueued: queued.enqueued, skipped: queued.skipped, reason: queued.reason },
		stoppedAt: queued.reason ? ("execution" as const) : null,
	};
}
