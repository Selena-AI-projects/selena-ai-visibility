import { z } from "zod";
import { type MeasurementScope, measurementScopeSchema } from "./measurement-scope.js";

/**
 * Stamped into every configuration lock this catalog writes. Locks keep the
 * version they were written under, and nothing resolves a plan through it, so
 * a v2 lock that still lists Perplexity reads as it was sold; approving one
 * that has not been dispatched is refused (see assertVisitorSystemsMeasured).
 */
export const SELENA_CATALOG_VERSION = "selena-catalog-v3" as const;
export const SELENA_SELLER_LEGAL_ENTITY = "Selena Systems LLC" as const;
export const SELENA_CHECKOUT_METADATA = {
	sellerLegalEntity: SELENA_SELLER_LEGAL_ENTITY,
	sellerStatus: "temporary_owner_approved_pending_kyc",
	currency: "USD",
	livePayments: "off",
} as const;

/** Every Visitor View surface the engine can address, measured or not. */
export const visitorSurfaces = ["ChatGPT", "Gemini", "Perplexity"] as const;
type VisitorSurface = (typeof visitorSurfaces)[number];

/**
 * Whether a surface is sold as measured. Perplexity has no verified transport
 * (Bright Data returned a sign-up wall on 2026-09-05, Oxylabs a 4xx on
 * 2026-09-07, the other routes are unproven). Until one is verified it stays
 * out of every plan's measured systems (owner decision, 2026-10-12), so no
 * permit is minted for it and no allowance counts it; plans list it as being
 * connected instead.
 */
const visitorSurfaceStatus = {
	ChatGPT: "measured",
	Gemini: "measured",
	Perplexity: "pending_connection",
} as const satisfies Record<VisitorSurface, "measured" | "pending_connection">;

const measuredVisitorSurfaces = visitorSurfaces.filter((surface) => visitorSurfaceStatus[surface] === "measured");
const pendingVisitorSurfaces = visitorSurfaces.filter(
	(surface) => visitorSurfaceStatus[surface] === "pending_connection",
);
export const apiModelIds = [
	"anthropic/claude-haiku-4.5",
	"deepseek/deepseek-v3.2",
	"qwen/qwen3.5-9b",
	"mistralai/mistral-small-2603",
	"x-ai/grok-4.5",
] as const;
export type ApiModelId = (typeof apiModelIds)[number];
export const channels = ["VISITOR_VIEW", "API_VIEW"] as const;
export type SelenaChannel = (typeof channels)[number];

export const planIds = [
	"visibility-snapshot",
	"full-discovery-landscape",
	"competitive-audit",
	"managed-discovery-90",
] as const;
export type SelenaPlanId = (typeof planIds)[number];
export type BillingInterval = "month" | "one_time" | "ninety_days";

/**
 * Plan ids from earlier catalog versions. Stored orders, quotes and requests
 * keep the id they were written with, so readers resolve through this map;
 * new writes must use a current id.
 */
export const legacyPlanIdAliases = {
	"visitor-local": "visibility-snapshot",
	"full-ai-landscape": "full-discovery-landscape",
	"expert-verified": "competitive-audit",
	"growth-90-days": "managed-discovery-90",
	"ai-visibility-snapshot": "visibility-snapshot",
	"ai-visibility-landscape": "full-discovery-landscape",
	"ai-visibility-expert-verified": "competitive-audit",
	"ai-visibility-implementation-90-days": "managed-discovery-90",
} as const satisfies Record<string, SelenaPlanId>;

/**
 * Offers that were sold on staging as separate products and must not come back
 * as commercial plans. Local Maps is a measurement surface inside the plans.
 */
export const retiredCommercialOffers = ["LOCAL_MAPS_ONE_OFF"] as const;

/** Resolves a current or legacy plan id; null for unknown ids and retired offers. */
export function resolvePlanId(id: string): SelenaPlanId | null {
	if ((planIds as readonly string[]).includes(id)) return id as SelenaPlanId;
	return (legacyPlanIdAliases as Record<string, SelenaPlanId>)[id] ?? null;
}

export const FREE_PUBLIC_READINESS = {
	planId: "public-readiness",
	name: "FREE Public Readiness",
	price: 0,
	currency: "USD",
} as const;

export const reportTabs = [
	"visitor_ai",
	"expanded_ai",
	"local_discovery",
	"competitors",
	"sources",
	"recommendations",
	"history",
] as const;
export type ReportTab = (typeof reportTabs)[number];

export type PlanEntitlements = {
	tabs: readonly ReportTab[];
	/**
	 * Automated Local Discovery is part of the plan only where production-capable
	 * measurement is verified; until then the plan shows it as pending, not as delivered.
	 */
	localDiscovery: "not_included" | "pending_verification" | "included";
	/** Manual Google Ask Maps / Local AI investigation by an analyst. */
	localManualAudit: boolean;
};

const localDiscoveryPlans: readonly SelenaPlanId[] = [
	"full-discovery-landscape",
	"competitive-audit",
	"managed-discovery-90",
];
const expandedAiPlans: readonly SelenaPlanId[] = localDiscoveryPlans;
const localManualAuditPlans: readonly SelenaPlanId[] = ["competitive-audit", "managed-discovery-90"];

export function entitlementsFor(planId: SelenaPlanId, options: { localDiscoveryVerified: boolean }): PlanEntitlements {
	const hasLocal = localDiscoveryPlans.includes(planId);
	const localDiscovery = !hasLocal
		? "not_included"
		: options.localDiscoveryVerified
			? "included"
			: "pending_verification";
	const tabs = reportTabs.filter((tab) => {
		if (tab === "expanded_ai") return expandedAiPlans.includes(planId);
		if (tab === "local_discovery") return hasLocal;
		return true;
	});
	return { tabs, localDiscovery, localManualAudit: localManualAuditPlans.includes(planId) };
}

/**
 * Plans whose published offer names the weekly Telegram digest. A client on
 * any other plan was not promised one, so the digest job leaves them alone.
 * Landscape shares Snapshot's weekly measurement, so it gets the same digest
 * (owner decision, 2026-09-28).
 */
export const weeklyDigestPlans: readonly SelenaPlanId[] = [
	"visibility-snapshot",
	"full-discovery-landscape",
	"managed-discovery-90",
];

/** Takes the plan id as stored, so a legacy or unreadable id is answered too. */
export function planIncludesWeeklyDigest(storedPlanId: string | null | undefined): boolean {
	const planId = storedPlanId ? resolvePlanId(storedPlanId) : null;
	return planId !== null && weeklyDigestPlans.includes(planId);
}

export type SelenaPlan = {
	planId: SelenaPlanId;
	name: string;
	billingInterval: BillingInterval;
	price: number;
	currency: "USD";
	channelScope: readonly SelenaChannel[];
	/** The systems a measurement under this plan actually queries. */
	systems: readonly string[];
	/** Named in the offer as being connected; never measured, never counted. */
	pendingSystems: readonly string[];
	languageLimit: number;
	scenarioLimit: number | null;
	/** Questions accepted in a single measurement; null = negotiated scope. */
	questionLimitPerMeasurement: number | null;
	repeatCount: number | null;
	includedFeatures: readonly string[];
	excludedFeatures: readonly string[];
	verificationLevel: "automated" | "awaiting_expert_review" | "expert_verified";
	laborHours: number;
	providerBudgetCap: number;
	retryPolicy: "one_technical_invalid";
	purchaseMode: "self_service" | "manual_approval_contact_sales";
	activationGates: readonly string[];
};

const commonGates = ["admin_approval", "providers_off", "maintenance_off"] as const;

export const SELENA_CATALOG: Readonly<Record<SelenaPlanId, SelenaPlan>> = {
	"visibility-snapshot": {
		planId: "visibility-snapshot",
		name: "Visibility Snapshot",
		billingInterval: "month",
		price: 49,
		currency: "USD",
		channelScope: ["VISITOR_VIEW"],
		systems: [...measuredVisitorSurfaces],
		pendingSystems: [...pendingVisitorSurfaces],
		languageLimit: 1,
		scenarioLimit: 100,
		questionLimitPerMeasurement: 25,
		repeatCount: 1,
		includedFeatures: [
			"1 organization",
			"1 site",
			"1 brand",
			"1 city or district",
			"ChatGPT and Gemini measured; Perplexity being connected, not measured yet",
			"200 planned answers until Perplexity is connected, 300 once it is",
			"competitors",
			"mentions",
			"positions",
			"citations",
			"public website scan",
			"approved public business/review signals",
			"dashboard",
			"CSV",
			"automatic recommendations",
		],
		excludedFeatures: [
			"five API View models",
			"manual analyst review",
			"Competitive Audit",
			"Connected Analytics by default",
		],
		verificationLevel: "automated",
		laborHours: 0,
		providerBudgetCap: 12,
		retryPolicy: "one_technical_invalid",
		purchaseMode: "self_service",
		activationGates: [...commonGates],
	},
	"full-discovery-landscape": {
		planId: "full-discovery-landscape",
		name: "Full Discovery Landscape",
		billingInterval: "month",
		price: 79,
		currency: "USD",
		channelScope: ["VISITOR_VIEW", "API_VIEW"],
		systems: [...measuredVisitorSurfaces, ...apiModelIds],
		pendingSystems: [...pendingVisitorSurfaces],
		languageLimit: 2,
		scenarioLimit: 100,
		questionLimitPerMeasurement: 25,
		repeatCount: 1,
		includedFeatures: [
			"7 systems measured; Perplexity being connected, not measured yet",
			"separate Visitor/API views",
			"divergence",
			"700 planned answers until Perplexity is connected, 800 once it is",
			"expanded source map",
			"Evidence Ledger",
			"PDF/XLSX/CSV when available",
		],
		excludedFeatures: ["manual analyst review", "Competitive Audit"],
		verificationLevel: "automated",
		laborHours: 0,
		providerBudgetCap: 28,
		retryPolicy: "one_technical_invalid",
		purchaseMode: "self_service",
		activationGates: [...commonGates],
	},
	"competitive-audit": {
		planId: "competitive-audit",
		name: "Verified Discovery & Competitive Audit",
		billingInterval: "one_time",
		price: 399,
		currency: "USD",
		channelScope: ["VISITOR_VIEW", "API_VIEW"],
		systems: [...measuredVisitorSurfaces, ...apiModelIds],
		pendingSystems: [...pendingVisitorSurfaces],
		languageLimit: 2,
		scenarioLimit: 20,
		questionLimitPerMeasurement: 20,
		repeatCount: 5,
		includedFeatures: [
			"20 scenarios across up to 2 languages",
			"7 systems measured; Perplexity being connected, not measured yet",
			"700 planned answers until Perplexity is connected, 800 once it is",
			"deep review of the top 10 priorities",
			"Evidence Ledger",
			"PDF/XLSX/CSV",
			"Recommendation Engine",
			"manual semantic/citation/factual QC",
			"5–10 approved recommendations",
			"2–3 analyst hours",
		],
		excludedFeatures: ["Expert Verified label before QC record"],
		verificationLevel: "awaiting_expert_review",
		laborHours: 3,
		providerBudgetCap: 48,
		retryPolicy: "one_technical_invalid",
		purchaseMode: "self_service",
		activationGates: [...commonGates, "expert_qc_record"],
	},
	"managed-discovery-90": {
		planId: "managed-discovery-90",
		name: "Managed Discovery Growth",
		billingInterval: "ninety_days",
		price: 2490,
		currency: "USD",
		channelScope: ["VISITOR_VIEW", "API_VIEW"],
		systems: [...measuredVisitorSurfaces, ...apiModelIds],
		pendingSystems: [...pendingVisitorSurfaces],
		languageLimit: 0,
		scenarioLimit: null,
		questionLimitPerMeasurement: null,
		repeatCount: null,
		includedFeatures: [
			"Expert Verified baseline",
			"Visitor/API divergence",
			"Public Data",
			"Uploaded Evidence",
			"optional Connected Analytics",
			"GSC/GBP/Instagram Insights when connected",
			"personal Action Plan",
			"up to 10 implementation hours",
			"8–12 lead expert hours",
			"90-day monitoring",
			"same Configuration Lock remeasurement",
			"second recommendation iteration",
			"final presentation",
		],
		excludedFeatures: ["automatic self-service checkout", "unlocked scope assumptions"],
		verificationLevel: "awaiting_expert_review",
		laborHours: 22,
		providerBudgetCap: 0,
		retryPolicy: "one_technical_invalid",
		purchaseMode: "manual_approval_contact_sales",
		activationGates: [
			...commonGates,
			"locked_custom_scope",
			"cycle_count",
			"provider_cost_cap",
			"margin_floor",
			"admin_approval",
		],
	},
};

export const planCatalogSchema = z.object({
	planId: z.enum(planIds),
	languages: z.array(z.string().min(2)).min(1).max(2),
	languageScenarios: z.number().int().positive(),
	repeats: z.number().int().positive(),
	systems: z.array(z.string().min(1)).min(1),
	providerCostCap: z.number().nonnegative(),
	laborCapHours: z.number().nonnegative(),
	adminApproved: z.boolean().default(false),
	growthScopeLocked: z.boolean().default(false),
});
export type CatalogScope = z.infer<typeof planCatalogSchema>;

export function plannedAnswers(scope: Pick<CatalogScope, "languageScenarios" | "systems" | "repeats">): number {
	return scope.languageScenarios * scope.systems.length * scope.repeats;
}

/**
 * The plan's monthly answer allowance over the systems it actually measures
 * (100 scenarios × 2 Visitor systems = 200 while Perplexity is pending, and so
 * on). Null when the plan sets no scenario or repeat bound (Growth), meaning
 * the allowance is negotiated, not computed.
 */
export function monthlyAnswerAllowance(planId: SelenaPlanId): number | null {
	const plan = SELENA_CATALOG[planId];
	if (plan.scenarioLimit === null || plan.repeatCount === null) return null;
	return plan.scenarioLimit * plan.systems.length * plan.repeatCount;
}

export function getPlan(planId: SelenaPlanId): SelenaPlan {
	return SELENA_CATALOG[planId];
}

/**
 * The scope a new order under this plan is locked to, and so the permits its
 * approval mints. A surface that is not measured is refused even if a plan
 * names it, so a catalog slip cannot buy a provider call nobody can deliver.
 */
export function measurementScopeForPlan(plan: SelenaPlan, scenarioIds: readonly string[]): MeasurementScope {
	const isVisitor = (systemId: string) => (visitorSurfaces as readonly string[]).includes(systemId);
	const unknown = plan.systems.filter(
		(systemId) => !isVisitor(systemId) && !(apiModelIds as readonly string[]).includes(systemId),
	);
	if (unknown.length > 0) throw new Error(`SELENA_UNKNOWN_CATALOG_SYSTEM: ${unknown.join(", ")}`);
	const systems = plan.systems.map((systemId) => ({
		systemId,
		channel: isVisitor(systemId) ? ("VISITOR" as const) : ("API" as const),
	}));
	assertVisitorSystemsMeasured(systems);
	return measurementScopeSchema.parse({ scenarios: [...scenarioIds], systems, repeats: plan.repeatCount ?? 1 });
}

/**
 * Refuses a scope that would buy a Visitor View answer from a surface no plan
 * measures. A lock keeps the systems it was written with, so an order locked
 * under an earlier catalog can still name Perplexity; approving it is where
 * that is caught, before any permit is minted.
 */
export function assertVisitorSystemsMeasured(systems: readonly { systemId: string; channel: string }[]): void {
	const unmeasured = systems
		.filter(
			(system) =>
				system.channel === "VISITOR" && !(measuredVisitorSurfaces as readonly string[]).includes(system.systemId),
		)
		.map((system) => system.systemId);
	if (unmeasured.length > 0) throw new Error(`SELENA_SYSTEM_NOT_MEASURED: ${unmeasured.join(", ")}`);
}

export function validateCatalogScope(input: CatalogScope): SelenaPlan {
	const plan = getPlan(input.planId);
	if (plan.planId !== "managed-discovery-90" && input.languages.length > plan.languageLimit)
		throw new Error("LANGUAGE_LIMIT_EXCEEDED");
	if (plan.scenarioLimit !== null && input.languageScenarios > plan.scenarioLimit)
		throw new Error("SCENARIO_LIMIT_EXCEEDED");
	if (plan.repeatCount !== null && input.repeats !== plan.repeatCount) throw new Error("REPEAT_COUNT_MISMATCH");
	if (input.planId === "managed-discovery-90" && !input.growthScopeLocked) throw new Error("GROWTH_SCOPE_REQUIRED");
	if (input.planId === "managed-discovery-90" && input.providerCostCap <= 0)
		throw new Error("GROWTH_PROVIDER_CAP_REQUIRED");
	if (!input.adminApproved && input.planId === "managed-discovery-90")
		throw new Error("GROWTH_ADMIN_APPROVAL_REQUIRED");
	if (input.systems.length !== plan.systems.length || input.systems.some((system) => !plan.systems.includes(system)))
		throw new Error("SYSTEM_SCOPE_MISMATCH");
	return plan;
}

/**
 * The per-measurement check an order desk runs on the approved scenarios it is
 * about to lock. `questionLimitPerMeasurement` is a per-language allowance:
 * the $79 plan's 50 is 25 questions in each of two languages, not 50 in one.
 * The negotiated Growth scope has no fixed allowance and is left to its own
 * admin-approved lock.
 */
export function validateMeasurementLanguageScope(
	planId: SelenaPlanId,
	scenarioLanguages: readonly string[],
): SelenaPlan {
	const plan = getPlan(planId);
	if (plan.questionLimitPerMeasurement === null) return plan;
	const perLanguage = new Map<string, number>();
	for (const language of scenarioLanguages) {
		const key = language.trim().toLowerCase();
		perLanguage.set(key, (perLanguage.get(key) ?? 0) + 1);
	}
	validateCatalogScope({
		planId,
		languages: [...perLanguage.keys()],
		languageScenarios: scenarioLanguages.length,
		repeats: plan.repeatCount ?? 1,
		systems: [...plan.systems],
		providerCostCap: plan.providerBudgetCap,
		laborCapHours: plan.laborHours,
		adminApproved: false,
		growthScopeLocked: false,
	});
	for (const count of perLanguage.values())
		if (count > plan.questionLimitPerMeasurement) throw new Error("LANGUAGE_QUESTION_LIMIT_EXCEEDED");
	return plan;
}

export type OrderLockSnapshot = {
	catalogVersion: string;
	plan: SelenaPlan;
	scope: CatalogScope;
	plannedAnswers: number;
	modelIds: readonly string[];
	configurationLockHash: string;
	pricing: { amount: number; currency: "USD"; taxMode: string; refundPolicyVersion: string };
	retryReserve: number;
	checkoutMetadata: typeof SELENA_CHECKOUT_METADATA;
};

export function createOrderLock(
	scope: CatalogScope,
	pricing: OrderLockSnapshot["pricing"],
	configurationLockHash: string,
): OrderLockSnapshot {
	const plan = validateCatalogScope(scope);
	return {
		catalogVersion: SELENA_CATALOG_VERSION,
		plan,
		scope: structuredClone(scope),
		plannedAnswers: plannedAnswers(scope),
		modelIds: [...apiModelIds],
		configurationLockHash,
		pricing: structuredClone(pricing),
		retryReserve: 1,
		checkoutMetadata: { ...SELENA_CHECKOUT_METADATA },
	};
}

export function orderLockHash(lock: OrderLockSnapshot): string {
	const input = JSON.stringify(lock);
	let hash = 2166136261;
	for (let index = 0; index < input.length; index += 1) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
	return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function assertHardCaps(input: {
	createdRuns: number;
	expectedRuns: number;
	estimatedCost: number;
	providerCostCap: number;
	orderCap: number;
	retryUsed: number;
	retryReserve: number;
}): void {
	if (input.createdRuns >= input.expectedRuns) throw new Error("CARDINALITY_BLOCKED");
	if (input.estimatedCost > input.providerCostCap) throw new Error("PROVIDER_CAP_BLOCKED");
	if (input.estimatedCost > input.orderCap) throw new Error("ORDER_CAP_BLOCKED");
	if (input.retryUsed > input.retryReserve) throw new Error("RETRY_RESERVE_EXCEEDED");
}

export function assertDispatchModes(maintenanceEnabled: boolean, directDispatchEnabled: boolean): void {
	if (maintenanceEnabled && directDispatchEnabled) throw new Error("DISPATCH_MODE_CONFLICT");
}

export function assertExpertVerified(hasQcRecord: boolean): void {
	if (!hasQcRecord) throw new Error("EXPERT_QC_REQUIRED");
}
export function isApiViewWebSearchEnabled(): false {
	return false;
}
