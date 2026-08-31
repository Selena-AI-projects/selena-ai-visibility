import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { createSelenaRepositories } from "@workspace/lib/selena-visibility-repositories";
import {
	assertPaymentAllowed,
	calculateQuote,
	paymentConfigFromEnv,
	quoteCreateSchema,
	quotePricingSchema,
	SELENA_CHECKOUT_METADATA,
} from "@workspace/selena-visibility-contracts";
import { z } from "zod";
import { canWrite, resolveSessionAuthContext } from "../lib/selena-auth-context";
import { isSelenaTestPaymentAmount, SelenaTestPaymentError } from "./selena-test-payment-replay";
import { recordSelenaTestPayment } from "./selena-test-payment-store";

const repositories = /* @__PURE__ */ createSelenaRepositories(db);

function testPaymentWritesAllowed(): boolean {
	try {
		assertPaymentAllowed(paymentConfigFromEnv(process.env), "test");
		return true;
	} catch {
		return false;
	}
}

export const createSelenaQuoteFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			projectId: z.string().uuid(),
			lockId: z.string().uuid(),
			scenarioIds: z.array(z.string().uuid()).min(1),
			systems: quoteCreateSchema.shape.systems,
			repeats: z.number().int().min(1).max(100),
			pricing: quotePricingSchema,
		}),
	)
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		const quote = calculateQuote(data, data.pricing);
		return repositories.quotes.create(context, {
			projectId: data.projectId,
			lockId: data.lockId,
			status: "ISSUED",
			priceAmount: String(quote.amount),
			currency: quote.currency,
			expectedRuns: quote.expectedRuns,
			expiresAt: new Date(Date.now() + 7 * 86400000),
		});
	});

export const createSelenaOrderFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			projectId: z.string().uuid(),
			quoteId: z.string().uuid(),
			lockId: z.string().uuid(),
			orderCap: z.number().nonnegative(),
		}),
	)
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		return repositories.orders.create(context, {
			projectId: data.projectId,
			quoteId: data.quoteId,
			lockId: data.lockId,
			status: "AWAITING_PAYMENT",
			orderCap: String(data.orderCap),
		});
	});

export const createSelenaTestPaymentFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			orderId: z.string().uuid(),
			amount: z.number().nonnegative().refine(isSelenaTestPaymentAmount, "Payment amount must use whole cents"),
			currency: z.string().regex(/^[A-Z]{3}$/, "Currency must be a three-letter uppercase code"),
			providerEventId: z.string().min(1).max(200),
		}),
	)
	.handler(async ({ data }) => {
		try {
			const context = await resolveSessionAuthContext();
			if (!canWrite(context)) throw new Error("Forbidden: viewer cannot record payments");
			const payment = await recordSelenaTestPayment(
				{ tenantId: context.tenantId, ...data },
				{ writesAllowed: testPaymentWritesAllowed() },
			);
			return { ...payment, checkoutMetadata: SELENA_CHECKOUT_METADATA };
		} catch (error) {
			if (error instanceof SelenaTestPaymentError) {
				if (error.code === "SELENA_TEST_PAYMENTS_UNAVAILABLE") throw new Error("SELENA_TEST_PAYMENTS_UNAVAILABLE");
				if (error.code === "SELENA_TEST_PAYMENT_NOT_FOUND") throw new Error("SELENA_TEST_PAYMENT_NOT_FOUND");
				if (error.code === "SELENA_TEST_PAYMENT_QUOTE_MISMATCH") throw new Error("SELENA_TEST_PAYMENT_INVALID");
				if (error.code !== "SELENA_TEST_PAYMENT_WRITE_FAILED") throw new Error("SELENA_TEST_PAYMENT_CONFLICT");
			}
			const message = error instanceof Error ? error.message : "";
			if (message.startsWith("Unauthorized:")) throw new Error("Unauthorized: authenticated session required");
			if (message.startsWith("Forbidden:")) throw new Error("Forbidden: payment write permission required");
			throw new Error("SELENA_TEST_PAYMENT_REQUEST_FAILED");
		}
	});
