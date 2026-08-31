import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svOrders, svPayments, svQuotes } from "@workspace/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
	assertSelenaTestPaymentCanStart,
	assertSelenaTestPaymentMatchesQuote,
	resolveSelenaTestPaymentReplay,
	SelenaTestPaymentError,
	type SelenaTestPaymentReplayInput,
} from "./selena-test-payment-replay";

const storedPaymentSelection = {
	id: svPayments.id,
	organizationId: svPayments.organizationId,
	orderId: svPayments.orderId,
	provider: svPayments.provider,
	providerEventId: svPayments.providerEventId,
	status: svPayments.status,
	amount: svPayments.amount,
	currency: svPayments.currency,
};

export async function recordSelenaTestPayment(
	input: SelenaTestPaymentReplayInput,
	options: { writesAllowed: boolean },
) {
	return withOrganizationTransaction(db, input.tenantId, async (tx) => {
		const [order] = await tx
			.select({
				id: svOrders.id,
				status: svOrders.status,
				quoteAmount: svQuotes.priceAmount,
				quoteCurrency: svQuotes.currency,
			})
			.from(svOrders)
			.innerJoin(svQuotes, and(eq(svQuotes.id, svOrders.quoteId), eq(svQuotes.organizationId, input.tenantId)))
			.where(and(eq(svOrders.id, input.orderId), eq(svOrders.organizationId, input.tenantId)))
			.for("update");
		if (!order) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_NOT_FOUND");

		assertSelenaTestPaymentMatchesQuote(order.quoteAmount, order.quoteCurrency, input);

		const [stored] = await tx
			.select(storedPaymentSelection)
			.from(svPayments)
			.where(
				and(
					eq(svPayments.organizationId, input.tenantId),
					eq(svPayments.provider, "test"),
					eq(svPayments.providerEventId, input.providerEventId),
				),
			)
			.limit(1);
		if (stored) return resolveSelenaTestPaymentReplay(stored, input);

		assertSelenaTestPaymentCanStart(order.status, options.writesAllowed);

		const [payment] = await tx
			.insert(svPayments)
			.values({
				organizationId: input.tenantId,
				orderId: input.orderId,
				provider: "test",
				providerEventId: input.providerEventId,
				status: "SUCCEEDED",
				amount: String(input.amount),
				currency: input.currency,
			})
			.onConflictDoNothing({ target: [svPayments.provider, svPayments.providerEventId] })
			.returning({
				id: svPayments.id,
				orderId: svPayments.orderId,
				amount: svPayments.amount,
				currency: svPayments.currency,
			});
		if (!payment) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_EVENT_CONFLICT");

		const [updated] = await tx
			.update(svOrders)
			.set({ status: "PAID_REVIEW_REQUIRED", paidAt: new Date(), updatedAt: new Date() })
			.where(
				and(
					eq(svOrders.id, input.orderId),
					eq(svOrders.organizationId, input.tenantId),
					eq(svOrders.status, "AWAITING_PAYMENT"),
				),
			)
			.returning({ id: svOrders.id });
		if (!updated) throw new SelenaTestPaymentError("SELENA_TEST_PAYMENT_WRITE_FAILED");

		return {
			id: payment.id,
			orderId: payment.orderId,
			status: "SUCCEEDED" as const,
			provider: "test" as const,
			providerEventId: input.providerEventId,
			amount: payment.amount,
			currency: payment.currency,
			duplicate: false as const,
		};
	});
}
