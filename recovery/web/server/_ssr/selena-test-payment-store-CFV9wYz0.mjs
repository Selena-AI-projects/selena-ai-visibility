import { r as __exportAll } from "./rolldown-runtime-BXiOSzN2.mjs";
import { D as canonicalLocalMapsJson } from "./src-BdeAuGX5.mjs";
import { d as and, f as eq } from "../_libs/drizzle-orm.mjs";
import { Q as svPayments, S as svConfigurationLocks, Z as svOrders, it as svQuotes } from "./schema-ejW7s7Gs.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { t as assertLocalCustomerTestPayment } from "./selena-local-customer-order-CjadfhpK.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-test-payment-store-CFV9wYz0.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a6c77985-ddee-4db7-9f99-70481901fb5f", e._sentryDebugIdIdentifier = "sentry-dbid-a6c77985-ddee-4db7-9f99-70481901fb5f");
	} catch (e) {}
})();
var SelenaTestPaymentError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "SelenaTestPaymentError";
	}
};
function amountInCents(value) {
	if (typeof value === "string") {
		const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
		if (!match) return null;
		return BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"));
	}
	if (!Number.isFinite(value) || value < 0) return null;
	const scaled = value * 100;
	const rounded = Math.round(scaled);
	if (Math.abs(scaled - rounded) > Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4) return null;
	return BigInt(rounded);
}
function isSelenaTestPaymentAmount(value) {
	return amountInCents(value) !== null;
}
function assertSelenaTestPaymentMatchesQuote(quoteAmount, quoteCurrency, input) {
	const expectedAmount = amountInCents(quoteAmount);
	const requestedAmount = amountInCents(input.amount);
	if (expectedAmount === null || requestedAmount === null || expectedAmount !== requestedAmount || quoteCurrency !== input.currency) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_QUOTE_MISMATCH");
}
function assertSelenaTestPaymentCanStart(orderStatus, writesAllowed = true) {
	if (!writesAllowed) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENTS_UNAVAILABLE");
	if (orderStatus !== "AWAITING_PAYMENT") throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_ORDER_STATE_CONFLICT");
}
/**
* A database uniqueness conflict is not proof of an owned successful replay.
* Return the stored row only when tenant, order and payload match exactly;
* otherwise fail closed without revealing which tenant owns the event ID.
*/
function resolveSelenaTestPaymentReplay(stored, input) {
	const storedAmount = stored ? amountInCents(stored.amount) : null;
	const requestedAmount = amountInCents(input.amount);
	if (!stored || stored.organizationId !== input.tenantId || stored.orderId !== input.orderId || stored.provider !== "test" || stored.providerEventId !== input.providerEventId || stored.status !== "SUCCEEDED" || stored.currency !== input.currency || storedAmount === null || requestedAmount === null || storedAmount !== requestedAmount) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_EVENT_CONFLICT");
	return {
		id: stored.id,
		orderId: stored.orderId,
		status: "SUCCEEDED",
		provider: "test",
		providerEventId: stored.providerEventId,
		amount: stored.amount,
		currency: stored.currency,
		duplicate: true
	};
}
var selena_test_payment_store_exports = /* @__PURE__ */ __exportAll({ recordSelenaTestPayment: () => recordSelenaTestPayment });
var storedPaymentSelection = {
	id: svPayments.id,
	organizationId: svPayments.organizationId,
	orderId: svPayments.orderId,
	provider: svPayments.provider,
	providerEventId: svPayments.providerEventId,
	status: svPayments.status,
	amount: svPayments.amount,
	currency: svPayments.currency
};
async function recordSelenaTestPayment(input, options) {
	const db = options.database ?? (await import("./db-DcHqq7B9.mjs").then((n) => n.n).then((n) => n.n)).db;
	return withOrganizationTransaction(db, input.tenantId, async (tx) => {
		await options.authorize?.(tx);
		const [order] = await tx.select({
			id: svOrders.id,
			status: svOrders.status,
			quoteAmount: svQuotes.priceAmount,
			quoteCurrency: svQuotes.currency,
			snapshot: svConfigurationLocks.snapshot,
			quoteExpiresAt: svQuotes.expiresAt
		}).from(svOrders).innerJoin(svQuotes, and(eq(svQuotes.id, svOrders.quoteId), eq(svQuotes.organizationId, input.tenantId))).innerJoin(svConfigurationLocks, and(eq(svConfigurationLocks.id, svOrders.lockId), eq(svConfigurationLocks.id, svQuotes.lockId), eq(svConfigurationLocks.organizationId, input.tenantId))).where(and(eq(svOrders.id, input.orderId), eq(svOrders.organizationId, input.tenantId))).for("update");
		if (!order) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_NOT_FOUND");
		assertSelenaTestPaymentMatchesQuote(order.quoteAmount, order.quoteCurrency, input);
		const isLocalOrder = !!order.snapshot && typeof order.snapshot === "object" && "domainId" in order.snapshot && order.snapshot.domainId === "LOCAL_MAPS_ORDER";
		if (options.requireLocalOrder && !isLocalOrder) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_NOT_FOUND");
		if (isLocalOrder) {
			const digest = `sha256:${createHash("sha256").update(canonicalLocalMapsJson(order.snapshot)).digest("hex")}`;
			assertLocalCustomerTestPayment({
				orderId: input.orderId,
				expectedOrderId: order.id,
				snapshotSha256: options.localSnapshotSha256 ?? "",
				expectedSnapshotSha256: digest,
				amount: String(input.amount),
				currency: input.currency,
				mode: "TEST"
			});
		}
		const [stored] = await tx.select(storedPaymentSelection).from(svPayments).where(and(eq(svPayments.organizationId, input.tenantId), eq(svPayments.provider, "test"), eq(svPayments.providerEventId, input.providerEventId))).limit(1);
		if (stored) return resolveSelenaTestPaymentReplay(stored, input);
		if (isLocalOrder && order.quoteExpiresAt.getTime() <= Date.now()) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_ORDER_STATE_CONFLICT");
		assertSelenaTestPaymentCanStart(order.status, options.writesAllowed);
		const [payment] = await tx.insert(svPayments).values({
			organizationId: input.tenantId,
			orderId: input.orderId,
			provider: "test",
			providerEventId: input.providerEventId,
			status: "SUCCEEDED",
			amount: String(input.amount),
			currency: input.currency
		}).onConflictDoNothing({ target: [svPayments.provider, svPayments.providerEventId] }).returning({
			id: svPayments.id,
			orderId: svPayments.orderId,
			amount: svPayments.amount,
			currency: svPayments.currency
		});
		if (!payment) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_EVENT_CONFLICT");
		const [updated] = await tx.update(svOrders).set({
			status: "PAID_REVIEW_REQUIRED",
			paidAt: /* @__PURE__ */ new Date(),
			updatedAt: /* @__PURE__ */ new Date()
		}).where(and(eq(svOrders.id, input.orderId), eq(svOrders.organizationId, input.tenantId), eq(svOrders.status, "AWAITING_PAYMENT"))).returning({ id: svOrders.id });
		if (!updated) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_WRITE_FAILED");
		return {
			id: payment.id,
			orderId: payment.orderId,
			status: "SUCCEEDED",
			provider: "test",
			providerEventId: input.providerEventId,
			amount: payment.amount,
			currency: payment.currency,
			duplicate: false
		};
	});
}
//#endregion
export { isSelenaTestPaymentAmount as i, selena_test_payment_store_exports as n, SelenaTestPaymentError as r, recordSelenaTestPayment as t };

//# sourceMappingURL=selena-test-payment-store-CFV9wYz0.mjs.map