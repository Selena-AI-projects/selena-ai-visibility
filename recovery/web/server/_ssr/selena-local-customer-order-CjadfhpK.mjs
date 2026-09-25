import { F as union, M as string, T as literal, f as array, j as strictObject } from "../_libs/zod.mjs";
import { D as canonicalLocalMapsJson, Ht as sphericalGridPointsV1, mt as maximumProviderAttempts } from "./src-BdeAuGX5.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-local-customer-order-CjadfhpK.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ab047bba-d88a-44f2-9f50-3f04100361c9", e._sentryDebugIdIdentifier = "sentry-dbid-ab047bba-d88a-44f2-9f50-3f04100361c9");
	} catch (e) {}
})();
var LOCAL_CUSTOMER_OFFER = Object.freeze({
	product: "LOCAL_MAPS_ONE_OFF",
	priceAmount: "49.00",
	currency: "USD",
	billingInterval: "ONE_OFF",
	maximumQueries: 15
});
var localCustomerOrderRequestSchema = strictObject({
	projectId: string().uuid().transform((value) => value.toLowerCase()),
	locationId: string().uuid().transform((value) => value.toLowerCase()),
	queries: array(string().trim().min(1).max(300)).min(1).max(15),
	language: string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
	gridSize: union([literal(3), literal(5)])
}).superRefine((value, context) => {
	if (new Set(value.queries.map((q) => q.normalize("NFKC").toLowerCase())).size !== value.queries.length) context.addIssue({
		code: "custom",
		message: "LOCAL_ORDER_DUPLICATE_QUERY",
		path: ["queries"]
	});
});
var money = string().regex(/^(0|[1-9]\d*)(?:\.\d{1,6})?$/);
function micros(value) {
	const [whole, fraction = ""] = money.parse(value).split(".");
	return BigInt(whole) * BigInt(1e6) + BigInt(fraction.padEnd(6, "0"));
}
function usd(value) {
	return `${value / BigInt(1e6)}.${(value % BigInt(1e6)).toString().padStart(6, "0")}`;
}
/** Server-confirmed identity and provider price never come from the order request. */
function buildLocalCustomerOrder(input, context) {
	const request = localCustomerOrderRequestSchema.parse(input);
	const location = context.location;
	if (!location.confirmed || !location.cid?.trim() && !location.placeId?.trim()) throw new Error("LOCAL_ORDER_IDENTITY_NOT_CONFIRMED");
	if (location.organizationId !== context.tenantId || location.id !== request.locationId || location.projectId !== request.projectId) throw new Error("LOCAL_ORDER_LOCATION_NOT_FOUND");
	const policy = context.providerPolicy;
	if (!policy.priceSnapshotVersion.trim()) throw new Error("LOCAL_ORDER_PRICE_SNAPSHOT_REQUIRED");
	const price = micros(policy.perAttemptWorstCaseUsd);
	const cap = micros(policy.orderCapUsd);
	if (policy.mode === "FIXTURE" && price !== BigInt(0) || policy.mode === "DATAFORSEO" && price === BigInt(0)) throw new Error("LOCAL_ORDER_PROVIDER_PRICE_INVALID");
	const grid = sphericalGridPointsV1({
		formulaVersion: "sv-grid-sphere-v1",
		locationId: location.id,
		centerLatitude: location.latitude,
		centerLongitude: location.longitude,
		radiusMeters: 3e3,
		size: request.gridSize
	});
	const expectedSlots = request.queries.length * grid.points.length;
	const maxProviderAttempts = maximumProviderAttempts(expectedSlots);
	const worstCaseCost = price * BigInt(maxProviderAttempts);
	if (cap > micros("5") || worstCaseCost > cap) throw new Error("LOCAL_ORDER_BUDGET_EXCEEDED");
	const snapshot = {
		schemaVersion: 1,
		domainId: "LOCAL_MAPS_ORDER",
		organizationId: context.tenantId,
		projectId: request.projectId,
		locationId: request.locationId,
		offer: LOCAL_CUSTOMER_OFFER,
		targetIdentity: {
			...location.cid?.trim() ? { cid: location.cid.trim() } : {},
			...location.placeId?.trim() ? { placeId: location.placeId.trim() } : {},
			identitySource: "USER_CONFIRMED"
		},
		queries: request.queries,
		language: request.language,
		grid,
		expectedSlots,
		maxProviderAttempts,
		providerPolicy: {
			...policy,
			perAttemptWorstCaseUsd: usd(price),
			orderCapUsd: usd(cap)
		},
		worstCaseProviderCostUsd: usd(worstCaseCost),
		paymentMode: "TEST",
		repeats: 1,
		requestProtocol: {
			device: "mobile",
			os: "android",
			seDomain: "google.com",
			depth: 20,
			searchThisArea: true,
			zoom: 13
		}
	};
	const canonical = canonicalLocalMapsJson(snapshot);
	return {
		snapshot,
		canonical,
		sha256: `sha256:${createHash("sha256").update(canonical).digest("hex")}`
	};
}
function assertLocalCustomerTestPayment(input) {
	if (input.mode !== "TEST" || input.currency !== "USD" || micros(input.amount) !== micros(LOCAL_CUSTOMER_OFFER.priceAmount)) throw new Error("LOCAL_ORDER_TEST_PAYMENT_MISMATCH");
	if (input.orderId !== input.expectedOrderId || input.snapshotSha256 !== input.expectedSnapshotSha256) throw new Error("LOCAL_ORDER_TEST_PAYMENT_BINDING_MISMATCH");
}
//#endregion
export { buildLocalCustomerOrder as n, localCustomerOrderRequestSchema as r, assertLocalCustomerTestPayment as t };

//# sourceMappingURL=selena-local-customer-order-CjadfhpK.mjs.map