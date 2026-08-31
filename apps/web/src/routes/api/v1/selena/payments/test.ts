import { createFileRoute } from "@tanstack/react-router";
import {
	assertPaymentAllowed,
	paymentConfigFromEnv,
	SELENA_CHECKOUT_METADATA,
} from "@workspace/selena-visibility-contracts";
import { z } from "zod";
import { resolveApiKeyAuthContext } from "../../../../../lib/selena-auth-context";
import { isSelenaTestPaymentAmount, SelenaTestPaymentError } from "../../../../../server/selena-test-payment-replay";
import { recordSelenaTestPayment } from "../../../../../server/selena-test-payment-store";

const bodySchema = z.object({
	orderId: z.string().uuid(),
	amount: z.number().nonnegative().refine(isSelenaTestPaymentAmount, "Payment amount must use whole cents"),
	currency: z.string().regex(/^[A-Z]{3}$/, "Currency must be a three-letter uppercase code"),
	providerEventId: z.string().min(1).max(200),
});

function paymentErrorResponse(error: unknown): Response {
	if (error instanceof SelenaTestPaymentError) {
		if (error.code === "SELENA_TEST_PAYMENT_NOT_FOUND")
			return Response.json({ error: "Not Found", message: "Order is outside AuthContext tenant" }, { status: 404 });
		if (error.code === "SELENA_TEST_PAYMENT_QUOTE_MISMATCH")
			return Response.json(
				{ error: "Validation Error", message: "Payment amount and currency must match the order quote" },
				{ status: 400 },
			);
		if (error.code === "SELENA_TEST_PAYMENTS_UNAVAILABLE")
			return Response.json(
				{ error: "Payments Disabled", message: "Test payments are not accepting new writes" },
				{ status: 503 },
			);
		if (error.code === "SELENA_TEST_PAYMENT_WRITE_FAILED")
			return Response.json({ error: "Request Failed", message: "Test payment request failed" }, { status: 500 });
		return Response.json(
			{ error: "Conflict", message: "Payment request conflicts with the original order or event" },
			{ status: 409 },
		);
	}
	const message = error instanceof Error ? error.message : "";
	if (message.startsWith("Unauthorized:"))
		return Response.json({ error: "Unauthorized", message: "Valid API credentials are required" }, { status: 401 });
	if (message.startsWith("Forbidden:"))
		return Response.json({ error: "Forbidden", message: "API credentials do not permit this action" }, { status: 403 });
	return Response.json({ error: "Request Failed", message: "Test payment request failed" }, { status: 500 });
}

function testPaymentWritesAllowed(): boolean {
	try {
		assertPaymentAllowed(paymentConfigFromEnv(process.env), "test");
		return true;
	} catch {
		return false;
	}
}

export const Route = createFileRoute("/api/v1/selena/payments/test")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const auth = await resolveApiKeyAuthContext(request);
					if (!auth.permissions.includes("client:write"))
						return Response.json(
							{ error: "Forbidden", message: "API key lacks client:write permission" },
							{ status: 403 },
						);
					let body: unknown;
					try {
						body = await request.json();
					} catch {
						return Response.json(
							{ error: "Validation Error", message: "Request body must be valid JSON" },
							{ status: 400 },
						);
					}
					const parsed = bodySchema.safeParse(body);
					if (!parsed.success)
						return Response.json({ error: "Validation Error", message: parsed.error.message }, { status: 400 });
					// The owner kill-switch blocks new writes. An exact persisted replay
					// remains a read-only idempotency result and cannot charge or mutate.
					const payment = await recordSelenaTestPayment(
						{ tenantId: auth.tenantId, ...parsed.data },
						{ writesAllowed: testPaymentWritesAllowed() },
					);
					return Response.json({ ...payment, checkoutMetadata: SELENA_CHECKOUT_METADATA });
				} catch (error) {
					return paymentErrorResponse(error);
				}
			},
		},
	},
});
