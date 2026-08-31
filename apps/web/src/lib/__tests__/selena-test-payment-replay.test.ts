import { describe, expect, it } from "vitest";
import {
	assertSelenaTestPaymentCanStart,
	assertSelenaTestPaymentMatchesQuote,
	isSelenaTestPaymentAmount,
	resolveSelenaTestPaymentReplay,
} from "../../server/selena-test-payment-replay";

const stored = {
	id: "10000000-0000-4000-8000-000000000001",
	organizationId: "tenant-a",
	orderId: "20000000-0000-4000-8000-000000000001",
	provider: "test",
	providerEventId: "event-1",
	status: "SUCCEEDED",
	amount: "49.00",
	currency: "USD",
};

const input = {
	tenantId: "tenant-a",
	orderId: stored.orderId,
	providerEventId: stored.providerEventId,
	amount: 49,
	currency: "USD",
};

describe("Selena test-payment replay", () => {
	it("returns the persisted payment for an exact owned replay", () => {
		expect(resolveSelenaTestPaymentReplay(stored, input)).toEqual({
			id: stored.id,
			orderId: stored.orderId,
			status: "SUCCEEDED",
			provider: "test",
			providerEventId: stored.providerEventId,
			amount: stored.amount,
			currency: stored.currency,
			duplicate: true,
		});
	});

	it.each([
		["missing row", null, input],
		["foreign tenant", { ...stored, organizationId: "tenant-b" }, input],
		["different order", { ...stored, orderId: "20000000-0000-4000-8000-000000000002" }, input],
		["different provider", { ...stored, provider: "live" }, input],
		["different event", { ...stored, providerEventId: "event-2" }, input],
		["different amount", stored, { ...input, amount: 79 }],
		["different currency", stored, { ...input, currency: "EUR" }],
		["non-success status", { ...stored, status: "FAILED" }, input],
		["malformed stored amount", { ...stored, amount: "49.001" }, input],
	])("rejects %s without a success-shaped replay", (_name, payment, replayInput) => {
		expect(() => resolveSelenaTestPaymentReplay(payment, replayInput)).toThrow("SELENA_TEST_PAYMENT_EVENT_CONFLICT");
	});

	it("rejects sub-cent amounts instead of comparing a rounded database value", () => {
		expect(() => resolveSelenaTestPaymentReplay(stored, { ...input, amount: 49.001 })).toThrow(
			"SELENA_TEST_PAYMENT_EVENT_CONFLICT",
		);
	});

	it("accepts only nonnegative payment amounts representable in whole cents", () => {
		expect(isSelenaTestPaymentAmount(0)).toBe(true);
		expect(isSelenaTestPaymentAmount(49)).toBe(true);
		expect(isSelenaTestPaymentAmount(49.01)).toBe(true);
		expect(isSelenaTestPaymentAmount(49.001)).toBe(false);
		expect(isSelenaTestPaymentAmount(-1)).toBe(false);
		expect(isSelenaTestPaymentAmount(Number.POSITIVE_INFINITY)).toBe(false);
	});

	it("requires the payment to match the immutable quote amount and currency", () => {
		expect(() => assertSelenaTestPaymentMatchesQuote("49.00", "USD", input)).not.toThrow();
		expect(() => assertSelenaTestPaymentMatchesQuote("49.00", "USD", { ...input, amount: 0 })).toThrow(
			"SELENA_TEST_PAYMENT_QUOTE_MISMATCH",
		);
		expect(() => assertSelenaTestPaymentMatchesQuote("49.00", "USD", { ...input, amount: 48.99 })).toThrow(
			"SELENA_TEST_PAYMENT_QUOTE_MISMATCH",
		);
		expect(() => assertSelenaTestPaymentMatchesQuote("49.00", "USD", { ...input, currency: "EUR" })).toThrow(
			"SELENA_TEST_PAYMENT_QUOTE_MISMATCH",
		);
		expect(() => assertSelenaTestPaymentMatchesQuote("invalid", "USD", input)).toThrow(
			"SELENA_TEST_PAYMENT_QUOTE_MISMATCH",
		);
	});

	it("allows a new payment only from the awaiting-payment state", () => {
		expect(() => assertSelenaTestPaymentCanStart("AWAITING_PAYMENT")).not.toThrow();
		expect(() => assertSelenaTestPaymentCanStart("AWAITING_PAYMENT", false)).toThrow(
			"SELENA_TEST_PAYMENTS_UNAVAILABLE",
		);
		for (const status of ["PAID_REVIEW_REQUIRED", "APPROVED", "RUNNING", "DELIVERED", "CANCELLED", "REFUND_REVIEW"])
			expect(() => assertSelenaTestPaymentCanStart(status)).toThrow("SELENA_TEST_PAYMENT_ORDER_STATE_CONFLICT");
	});
});
