export type StoredSelenaTestPayment = {
	id: string;
	organizationId: string;
	orderId: string;
	provider: string;
	providerEventId: string;
	status: string;
	amount: string;
	currency: string;
};

export type SelenaTestPaymentReplayInput = {
	tenantId: string;
	orderId: string;
	providerEventId: string;
	amount: number;
	currency: string;
};

export type SelenaTestPaymentErrorCode =
	| "SELENA_TEST_PAYMENT_NOT_FOUND"
	| "SELENA_TEST_PAYMENT_QUOTE_MISMATCH"
	| "SELENA_TEST_PAYMENT_ORDER_STATE_CONFLICT"
	| "SELENA_TEST_PAYMENT_EVENT_CONFLICT"
	| "SELENA_TEST_PAYMENTS_UNAVAILABLE"
	| "SELENA_TEST_PAYMENT_WRITE_FAILED";

export class SelenaTestPaymentError extends Error {
	constructor(readonly code: SelenaTestPaymentErrorCode) {
		super(code);
		this.name = "SelenaTestPaymentError";
	}
}

function amountInCents(value: string | number): bigint | null {
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

export function isSelenaTestPaymentAmount(value: number): boolean {
	return amountInCents(value) !== null;
}

export function assertSelenaTestPaymentMatchesQuote(
	quoteAmount: string,
	quoteCurrency: string,
	input: Pick<SelenaTestPaymentReplayInput, "amount" | "currency">,
): void {
	const expectedAmount = amountInCents(quoteAmount);
	const requestedAmount = amountInCents(input.amount);
	if (
		expectedAmount === null ||
		requestedAmount === null ||
		expectedAmount !== requestedAmount ||
		quoteCurrency !== input.currency
	)
		throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_QUOTE_MISMATCH");
}

export function assertSelenaTestPaymentCanStart(orderStatus: string, writesAllowed = true): void {
	if (!writesAllowed) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENTS_UNAVAILABLE");
	if (orderStatus !== "AWAITING_PAYMENT") throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_ORDER_STATE_CONFLICT");
}

/**
 * A database uniqueness conflict is not proof of an owned successful replay.
 * Return the stored row only when tenant, order and payload match exactly;
 * otherwise fail closed without revealing which tenant owns the event ID.
 */
export function resolveSelenaTestPaymentReplay(
	stored: StoredSelenaTestPayment | null,
	input: SelenaTestPaymentReplayInput,
) {
	const storedAmount = stored ? amountInCents(stored.amount) : null;
	const requestedAmount = amountInCents(input.amount);
	if (
		!stored ||
		stored.organizationId !== input.tenantId ||
		stored.orderId !== input.orderId ||
		stored.provider !== "test" ||
		stored.providerEventId !== input.providerEventId ||
		stored.status !== "SUCCEEDED" ||
		stored.currency !== input.currency ||
		storedAmount === null ||
		requestedAmount === null ||
		storedAmount !== requestedAmount
	) {
		throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_EVENT_CONFLICT");
	}

	return {
		id: stored.id,
		orderId: stored.orderId,
		status: "SUCCEEDED" as const,
		provider: "test" as const,
		providerEventId: stored.providerEventId,
		amount: stored.amount,
		currency: stored.currency,
		duplicate: true as const,
	};
}
