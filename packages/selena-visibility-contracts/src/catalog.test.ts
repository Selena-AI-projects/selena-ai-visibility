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
	orderLockHash,
	planIds,
	plannedAnswers,
	resolvePlanId,
	retiredCommercialOffers,
	SELENA_CHECKOUT_METADATA,
	validateCatalogScope,
} from "./catalog";

const systems = ["ChatGPT", "Gemini", "Perplexity"];
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
	it("Visibility Snapshot is 100 × 3 × 1", () => expect(plannedAnswers(base("visibility-snapshot"))).toBe(300));
	it("Full Discovery Landscape keeps 100 total scenarios across two languages", () => {
		const scope = base("full-discovery-landscape", { languages: ["en", "id"], systems: apiSystems });
		expect(plannedAnswers(scope)).toBe(800);
		expect(() => validateCatalogScope({ ...scope, languageScenarios: 101 })).toThrow("SCENARIO_LIMIT_EXCEEDED");
	});
	it("Expert Verified is 25 questions × 2 languages × 8 × 5", () =>
		expect(
			plannedAnswers({
				...base("competitive-audit", {
					languages: ["en", "id"],
					systems: apiSystems,
					languageScenarios: 50,
					repeats: 5,
				}),
			}),
		).toBe(2000));
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
		expect(lock.plannedAnswers).toBe(300);
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
	it("keeps 25 questions per measurement on every self-service paid tier", () => {
		expect(getPlan("visibility-snapshot").questionLimitPerMeasurement).toBe(25);
		expect(getPlan("full-discovery-landscape").questionLimitPerMeasurement).toBe(25);
		expect(getPlan("competitive-audit").questionLimitPerMeasurement).toBe(25);
		expect(getPlan("managed-discovery-90").questionLimitPerMeasurement).toBeNull();
	});
});

describe("monthlyAnswerAllowance", () => {
	it("computes the quoted allowances from the catalog itself", () => {
		expect(monthlyAnswerAllowance("visibility-snapshot")).toBe(300);
		expect(monthlyAnswerAllowance("full-discovery-landscape")).toBe(800);
		expect(monthlyAnswerAllowance("competitive-audit")).toBe(2000);
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
