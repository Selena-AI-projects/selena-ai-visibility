import { createHash } from "node:crypto";
import {
	canonicalLocalMapsJson,
	maximumProviderAttempts,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import { z } from "zod";

export const LOCAL_CUSTOMER_OFFER = Object.freeze({
	product: "LOCAL_MAPS_ONE_OFF" as const,
	priceAmount: "49.00" as const,
	currency: "USD" as const,
	billingInterval: "ONE_OFF" as const,
	maximumQueries: 15,
});
export const localCustomerOrderRequestSchema = z
	.strictObject({
		projectId: z
			.string()
			.uuid()
			.transform((value) => value.toLowerCase()),
		locationId: z
			.string()
			.uuid()
			.transform((value) => value.toLowerCase()),
		queries: z.array(z.string().trim().min(1).max(300)).min(1).max(15),
		language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
		gridSize: z.union([z.literal(3), z.literal(5)]),
	})
	.superRefine((value, context) => {
		if (new Set(value.queries.map((q) => q.normalize("NFKC").toLowerCase())).size !== value.queries.length)
			context.addIssue({ code: "custom", message: "LOCAL_ORDER_DUPLICATE_QUERY", path: ["queries"] });
	});
export type LocalCustomerOrderRequest = z.infer<typeof localCustomerOrderRequestSchema>;

const money = z.string().regex(/^(0|[1-9]\d*)(?:\.\d{1,6})?$/);
function micros(value: string) {
	const [whole, fraction = ""] = money.parse(value).split(".");
	return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
}
function usd(value: bigint) {
	return `${value / BigInt(1_000_000)}.${(value % BigInt(1_000_000)).toString().padStart(6, "0")}`;
}

/** Server-confirmed identity and provider price never come from the order request. */
export function buildLocalCustomerOrder(
	input: LocalCustomerOrderRequest,
	context: {
		tenantId: string;
		location: {
			id: string;
			projectId: string;
			organizationId: string;
			latitude: number;
			longitude: number;
			placeId?: string;
			cid?: string;
			confirmed: boolean;
		};
		providerPolicy: {
			mode: "FIXTURE" | "DATAFORSEO";
			priceSnapshotVersion: string;
			perAttemptWorstCaseUsd: string;
			orderCapUsd: string;
		};
	},
) {
	const request = localCustomerOrderRequestSchema.parse(input);
	const location = context.location;
	if (!location.confirmed || (!location.cid?.trim() && !location.placeId?.trim()))
		throw new Error("LOCAL_ORDER_IDENTITY_NOT_CONFIRMED");
	if (
		location.organizationId !== context.tenantId ||
		location.id !== request.locationId ||
		location.projectId !== request.projectId
	)
		throw new Error("LOCAL_ORDER_LOCATION_NOT_FOUND");
	const policy = context.providerPolicy;
	if (!policy.priceSnapshotVersion.trim()) throw new Error("LOCAL_ORDER_PRICE_SNAPSHOT_REQUIRED");
	const price = micros(policy.perAttemptWorstCaseUsd);
	const cap = micros(policy.orderCapUsd);
	if ((policy.mode === "FIXTURE" && price !== BigInt(0)) || (policy.mode === "DATAFORSEO" && price === BigInt(0)))
		throw new Error("LOCAL_ORDER_PROVIDER_PRICE_INVALID");
	const grid = sphericalGridPointsV1({
		formulaVersion: "sv-grid-sphere-v1",
		locationId: location.id,
		centerLatitude: location.latitude,
		centerLongitude: location.longitude,
		radiusMeters: 3000,
		size: request.gridSize,
	});
	const expectedSlots = request.queries.length * grid.points.length;
	const maxProviderAttempts = maximumProviderAttempts(expectedSlots);
	const worstCaseCost = price * BigInt(maxProviderAttempts);
	if (cap > micros("5") || worstCaseCost > cap) throw new Error("LOCAL_ORDER_BUDGET_EXCEEDED");
	const snapshot = {
		schemaVersion: 1,
		domainId: "LOCAL_MAPS_ORDER" as const,
		organizationId: context.tenantId,
		projectId: request.projectId,
		locationId: request.locationId,
		offer: LOCAL_CUSTOMER_OFFER,
		targetIdentity: {
			...(location.cid?.trim() ? { cid: location.cid.trim() } : {}),
			...(location.placeId?.trim() ? { placeId: location.placeId.trim() } : {}),
			identitySource: "USER_CONFIRMED" as const,
		},
		queries: request.queries,
		language: request.language,
		grid,
		expectedSlots,
		maxProviderAttempts,
		providerPolicy: { ...policy, perAttemptWorstCaseUsd: usd(price), orderCapUsd: usd(cap) },
		worstCaseProviderCostUsd: usd(worstCaseCost),
		paymentMode: "TEST" as const,
		repeats: 1 as const,
		requestProtocol: {
			device: "mobile" as const,
			os: "android" as const,
			seDomain: "google.com" as const,
			depth: 20 as const,
			searchThisArea: true as const,
			zoom: 13 as const,
		},
	};
	const canonical = canonicalLocalMapsJson(snapshot);
	return { snapshot, canonical, sha256: `sha256:${createHash("sha256").update(canonical).digest("hex")}` };
}

export function assertLocalCustomerTestPayment(input: {
	orderId: string;
	expectedOrderId: string;
	snapshotSha256: string;
	expectedSnapshotSha256: string;
	amount: string;
	currency: string;
	mode: string;
}) {
	if (
		input.mode !== "TEST" ||
		input.currency !== "USD" ||
		micros(input.amount) !== micros(LOCAL_CUSTOMER_OFFER.priceAmount)
	)
		throw new Error("LOCAL_ORDER_TEST_PAYMENT_MISMATCH");
	if (input.orderId !== input.expectedOrderId || input.snapshotSha256 !== input.expectedSnapshotSha256)
		throw new Error("LOCAL_ORDER_TEST_PAYMENT_BINDING_MISMATCH");
}
