import { describe, expect, it } from "vitest";
import {
	apiModelIds,
	assertDispatchModes,
	assertExpertVerified,
	assertHardCaps,
	createOrderLock,
	entitlementsFor,
	FREE_PUBLIC_READINESS,
	getPlan,
	monthlyAnswerAllowance,
	isApiViewWebSearchEnabled,
	measurementScopeForPlan,
	orderLockHash,
	planIds,
	plannedAnswers,
	resolvePlanId,
	retiredCommercialOffers,
	SELENA_CHECKOUT_METADATA,
	validateCatalogScope,
	validateMeasurementLanguageScope,
} from "./catalog";

const systems = ["ChatGPT", "Gemini"];
const apiSystems = [...systems, ...apiModelIds];
const base = (
	planId: "visibility-snapshot" | "full-discovery-landscape" | "competitive-audit" | "managed-discovery-90",
	overrides = {},
) => ({
	planId,
	languages: ["en"],
	languageScenarios: 100,
	repeats: 1,
	systems,
	providerCostCap: 100,
	laborCapHours: 0,
	adminApproved: true,
	growthScopeLocked: true,
	...overrides,
});

describe("Selena RC6 catalog", () => {
	it("Visibility Snapshot is 100 × 2 × 1 while Perplexity is pending", () =>
		expect(plannedAnswers(base("visibility-snapshot"))).toBe(200));
	it("Full Discovery Landscape keeps 100 total scenarios across two languages", () => {
		const scope = base("full-discovery-landscape", { languages: ["en", "id"], systems: apiSystems });
		expect(plannedAnswers(scope)).toBe(700);
		expect(() => validateCatalogScope({ ...scope, languageScenarios: 101 })).toThrow("SCENARIO_LIMIT_EXCEEDED");
	});
	it("Competitive Audit takes 20 scenarios and refuses a 21st", () => {
		const scope = base("competitive-audit", {
			languages: ["en", "id"],
			systems: apiSystems,
			languageScenarios: 20,
			repeats: 5,
		});
		expect(getPlan("competitive-audit").scenarioLimit).toBe(20);
		expect(validateCatalogScope(scope).planId).toBe("competitive-audit");
		expect(() => validateCatalogScope({ ...scope, languageScenarios: 21 })).toThrow("SCENARIO_LIMIT_EXCEEDED");
	});
	it("Competitive Audit is 20 × 7 × 5 = 700 now and 20 × 8 × 5 = 800 once Perplexity is connected", () => {
		const plan = getPlan("competitive-audit");
		const scope = base("competitive-audit", {
			languages: ["en"],
			systems: apiSystems,
			languageScenarios: 20,
			repeats: 5,
		});
		expect(plannedAnswers(scope)).toBe(700);
		expect(20 * (plan.systems.length + plan.pendingSystems.length) * 5).toBe(800);
	});
	it("keeps Visitor and API channels distinct and API web search off", () => {
		expect(getPlan("full-discovery-landscape").channelScope).toEqual(["VISITOR_VIEW", "API_VIEW"]);
		expect(isApiViewWebSearchEnabled()).toBe(false);
	});
	it("enforces model allowlist, caps, dispatch conflict, and QC", () => {
		expect(() =>
			validateCatalogScope(base("full-discovery-landscape", { systems: [...apiSystems, "unknown"] })),
		).toThrow("SYSTEM_SCOPE_MISMATCH");
		expect(() => assertDispatchModes(true, true)).toThrow("DISPATCH_MODE_CONFLICT");
		expect(() => assertExpertVerified(false)).toThrow("EXPERT_QC_REQUIRED");
	});
	it("locks quote/order inputs immutably and hashes the snapshot", () => {
		const scope = base("visibility-snapshot");
		const lock = createOrderLock(
			scope,
			{ amount: 49, currency: "USD", taxMode: "owner-defined", refundPolicyVersion: "pending-owner-input" },
			"config-v1",
		);
		expect(lock.plannedAnswers).toBe(200);
		expect(lock.checkoutMetadata).toEqual(SELENA_CHECKOUT_METADATA);
		expect(orderLockHash(lock)).toBe(orderLockHash(lock));
		lock.scope.languages.push("id");
		expect(orderLockHash(lock)).not.toBe(
			orderLockHash(
				createOrderLock(
					scope,
					{ amount: 49, currency: "USD", taxMode: "owner-defined", refundPolicyVersion: "pending-owner-input" },
					"config-v1",
				),
			),
		);
	});
	it("requires a locked custom scope and approval for Growth", () => {
		expect(() =>
			validateCatalogScope(
				base("managed-discovery-90", { systems: apiSystems, providerCostCap: 0, growthScopeLocked: false }),
			),
		).toThrow("GROWTH_SCOPE_REQUIRED");
	});
	it("blocks overflow, caps and a second technical-invalid retry", () => {
		expect(() =>
			assertHardCaps({
				createdRuns: 300,
				expectedRuns: 300,
				estimatedCost: 1,
				providerCostCap: 10,
				orderCap: 10,
				retryUsed: 0,
				retryReserve: 1,
			}),
		).toThrow("CARDINALITY_BLOCKED");
		expect(() =>
			assertHardCaps({
				createdRuns: 1,
				expectedRuns: 2,
				estimatedCost: 11,
				providerCostCap: 10,
				orderCap: 20,
				retryUsed: 0,
				retryReserve: 1,
			}),
		).toThrow("PROVIDER_CAP_BLOCKED");
		expect(() =>
			assertHardCaps({
				createdRuns: 1,
				expectedRuns: 2,
				estimatedCost: 1,
				providerCostCap: 10,
				orderCap: 10,
				retryUsed: 2,
				retryReserve: 1,
			}),
		).toThrow("RETRY_RESERVE_EXCEEDED");
	});
});

describe("question limits", () => {
	it("keeps 25 questions per measurement on the monthly self-service tiers", () => {
		expect(getPlan("visibility-snapshot").questionLimitPerMeasurement).toBe(25);
		expect(getPlan("full-discovery-landscape").questionLimitPerMeasurement).toBe(25);
		expect(getPlan("managed-discovery-90").questionLimitPerMeasurement).toBeNull();
	});

	it("caps the Competitive Audit at 20 scenarios whether in one language or split across two", () => {
		const audit = getPlan("competitive-audit");
		expect(audit.questionLimitPerMeasurement).toBe(20);
		expect(audit.scenarioLimit).toBe(20);
		expect(validateMeasurementLanguageScope("competitive-audit", Array(20).fill("en")).planId).toBe(
			"competitive-audit",
		);
		expect(() => validateMeasurementLanguageScope("competitive-audit", Array(21).fill("en"))).toThrow();
		expect(() =>
			validateMeasurementLanguageScope("competitive-audit", [...Array(11).fill("en"), ...Array(10).fill("ru")]),
		).toThrow("SCENARIO_LIMIT_EXCEEDED");
	});
});

describe("monthlyAnswerAllowance", () => {
	it("counts only the systems a plan measures", () => {
		expect(monthlyAnswerAllowance("visibility-snapshot")).toBe(200);
		expect(monthlyAnswerAllowance("full-discovery-landscape")).toBe(700);
		expect(monthlyAnswerAllowance("competitive-audit")).toBe(700);
	});

	it("reports no computable allowance for a negotiated plan", () => {
		expect(monthlyAnswerAllowance("managed-discovery-90")).toBeNull();
	});
});

/**
 * The Founding Restaurant Pilot sells the AI answer path and nothing else. The
 * owner took Local Visibility, Search, Reputation, the Visibility Map and the
 * Outcome layer out of scope on 2026-09-03 because none of them can measure:
 * there is no runtime executor behind them, and the write and admin APIs refuse
 * a Local cycle before anything is queued.
 *
 * This is the guard on that decision. A plan a customer can request must never
 * name a system the platform cannot actually measure — that is the difference
 * between a pilot and a promise.
 */
describe("what a requestable plan may promise", () => {
	const requestable = ["visibility-snapshot", "full-discovery-landscape"] as const;
	const measurable = new Set<string>(apiSystems);

	it.each(requestable)("names only systems with a real adapter behind them: %s", (planId) => {
		const outside = getPlan(planId).systems.filter((system) => !measurable.has(system));
		expect(outside, `${planId} promises systems nothing can measure`).toEqual([]);
	});

	it.each(planIds)("lists Perplexity as being connected, never as measured: %s", (planId) => {
		const plan = getPlan(planId);
		expect(plan.systems).not.toContain("Perplexity");
		expect(plan.pendingSystems).toEqual(["Perplexity"]);
	});

	it("does not sell a Maps rank, a local pack or a review metric", () => {
		const forbidden = /maps|local pack|geo|grid|review|outcome/i;
		for (const planId of requestable) {
			const named = getPlan(planId).systems.filter((system) => forbidden.test(system));
			expect(named, `${planId} names an out-of-scope surface`).toEqual([]);
		}
	});
});

describe("canonical product catalog", () => {
	it("sells the locked ladder with its prices and billing", () => {
		expect(planIds.map((id) => [id, getPlan(id).name, getPlan(id).price, getPlan(id).billingInterval])).toEqual([
			["visibility-snapshot", "Visibility Snapshot", 49, "month"],
			["full-discovery-landscape", "Full Discovery Landscape", 79, "month"],
			["competitive-audit", "Verified Discovery & Competitive Audit", 399, "one_time"],
			["managed-discovery-90", "Managed Discovery Growth", 2490, "ninety_days"],
		]);
		expect(FREE_PUBLIC_READINESS).toMatchObject({ planId: "public-readiness", price: 0 });
	});

	it("reads ids stored by earlier catalog versions", () => {
		expect(resolvePlanId("visitor-local")).toBe("visibility-snapshot");
		expect(resolvePlanId("full-ai-landscape")).toBe("full-discovery-landscape");
		expect(resolvePlanId("expert-verified")).toBe("competitive-audit");
		expect(resolvePlanId("growth-90-days")).toBe("managed-discovery-90");
		expect(resolvePlanId("ai-visibility-landscape")).toBe("full-discovery-landscape");
		expect(resolvePlanId("competitive-audit")).toBe("competitive-audit");
	});

	it("does not bring back the separate Local Maps offer", () => {
		expect(retiredCommercialOffers).toContain("LOCAL_MAPS_ONE_OFF");
		expect(resolvePlanId("LOCAL_MAPS_ONE_OFF")).toBeNull();
		expect(resolvePlanId("unknown-plan")).toBeNull();
	});

	it("shows Local Discovery only from Full Discovery Landscape up, and only as pending until verified", () => {
		const verified = { localDiscoveryVerified: true };
		const pending = { localDiscoveryVerified: false };
		expect(entitlementsFor("visibility-snapshot", verified)).toMatchObject({
			localDiscovery: "not_included",
			localManualAudit: false,
		});
		expect(entitlementsFor("visibility-snapshot", verified).tabs).not.toContain("local_discovery");
		expect(entitlementsFor("visibility-snapshot", verified).tabs).not.toContain("expanded_ai");
		expect(entitlementsFor("full-discovery-landscape", pending).localDiscovery).toBe("pending_verification");
		expect(entitlementsFor("full-discovery-landscape", verified)).toMatchObject({
			localDiscovery: "included",
			localManualAudit: false,
		});
		expect(entitlementsFor("competitive-audit", verified).localManualAudit).toBe(true);
		expect(entitlementsFor("managed-discovery-90", verified).localManualAudit).toBe(true);
	});
});

describe("the scope a new order is locked to", () => {
	const scenarioIds = ["00000000-0000-4000-8000-000000000001"];

	it("covers only the measured systems, Visitor and API on their own channels", () => {
		expect(measurementScopeForPlan(getPlan("full-discovery-landscape"), scenarioIds).systems).toEqual([
			{ systemId: "ChatGPT", channel: "VISITOR" },
			{ systemId: "Gemini", channel: "VISITOR" },
			...apiModelIds.map((systemId) => ({ systemId, channel: "API" })),
		]);
	});

	it("refuses a plan that names a surface nobody measures", () => {
		const slipped = { ...getPlan("visibility-snapshot"), systems: ["ChatGPT", "Gemini", "Perplexity"] };
		expect(() => measurementScopeForPlan(slipped, scenarioIds)).toThrow("SELENA_SYSTEM_NOT_MEASURED: Perplexity");
	});
});

describe("languages in one measurement order", () => {
	const questions = (count: number, language: string) => Array.from({ length: count }, () => language);

	it("refuses 50 questions in one language on the two-language $79 plan", () =>
		expect(() => validateMeasurementLanguageScope("full-discovery-landscape", questions(50, "en"))).toThrow(
			"LANGUAGE_QUESTION_LIMIT_EXCEEDED",
		));
	it("refuses an uneven split that puts more than 25 questions in one language", () =>
		expect(() =>
			validateMeasurementLanguageScope("full-discovery-landscape", [...questions(40, "en"), ...questions(10, "ru")]),
		).toThrow("LANGUAGE_QUESTION_LIMIT_EXCEEDED"));
	it("accepts 25 questions in each of two languages on $79", () =>
		expect(
			validateMeasurementLanguageScope("full-discovery-landscape", [...questions(25, "en"), ...questions(25, "ru")])
				.planId,
		).toBe("full-discovery-landscape"));
	it("refuses a second language on the one-language $49 plan", () =>
		expect(() =>
			validateMeasurementLanguageScope("visibility-snapshot", [...questions(10, "en"), ...questions(1, "ru")]),
		).toThrow("LANGUAGE_LIMIT_EXCEEDED"));
	it("counts the same language written differently as one language", () =>
		expect(validateMeasurementLanguageScope("visibility-snapshot", ["en", "EN", " en "]).planId).toBe(
			"visibility-snapshot",
		));
	it("accepts 25 questions in one language on $49", () =>
		expect(validateMeasurementLanguageScope("visibility-snapshot", questions(25, "ru")).planId).toBe(
			"visibility-snapshot",
		));
});
