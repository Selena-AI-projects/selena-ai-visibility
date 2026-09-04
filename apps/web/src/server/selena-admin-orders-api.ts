/**
 * The order desk over the versioned API.
 *
 * Approving mints run permits and queueing spends a provider budget, so both
 * lived only behind a browser session: a person at the desk was the gate. That
 * gate fails whenever the desk itself cannot render, which leaves a paid order
 * with no way to reach the worker at all.
 *
 * These handlers move the gate rather than remove it. A session says a human
 * clicked; a key carrying `orders:approve` says the owner granted one specific
 * credential the right to approve. `client:write` is not enough — that scope
 * only creates the records an order is assembled from, and every key issued for
 * ordinary client work carries it.
 *
 * The decisions themselves are not reimplemented here. `collectPreflight`,
 * `approveOrder` and `enqueueOrderRunsForOrder` are the same functions the
 * server functions call, so a blocker added to one path applies to both.
 */
import { randomUUID } from "node:crypto";
import { SelenaApiHttpError, selenaApiErrorResponse, selenaApiHttpErrorResponse } from "../lib/selena-api-http";
import { resolveApiKeyAuthContext } from "../lib/selena-auth-context";
import { approveOrder, collectPreflight, enqueueOrderRunsForOrder } from "./selena-admin-orders";

/** The permission an ordinary client key does not carry. */
export const ORDER_DESK_SCOPE = "orders:approve";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function deskContext(request: Request) {
	const auth = await resolveApiKeyAuthContext(request);
	if (!auth.permissions.includes(ORDER_DESK_SCOPE))
		throw new SelenaApiHttpError(403, "SCOPE_FORBIDDEN", `API key lacks ${ORDER_DESK_SCOPE} scope.`);
	return auth;
}

function assertOrderId(orderId: string): string {
	if (!UUID_PATTERN.test(orderId))
		throw new SelenaApiHttpError(400, "VALIDATION_ERROR", "orderId must be a UUID.", false);
	return orderId;
}

/**
 * An idempotency key is what makes a retried approval replay instead of
 * minting a second set of permits, so a caller that omits one still gets a
 * stable key rather than an unguarded write.
 */
async function idempotencyKeyFrom(request: Request, fallback: string): Promise<string> {
	const header = request.headers.get("idempotency-key")?.trim();
	if (header) return header.slice(0, 200);
	const body = await request
		.json()
		.then((value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : {}))
		.catch(() => ({}) as Record<string, unknown>);
	const supplied = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
	return supplied ? supplied.slice(0, 200) : fallback;
}

async function respond(work: () => Promise<unknown>): Promise<Response> {
	const requestId = randomUUID();
	try {
		return Response.json(await work());
	} catch (error) {
		if (error instanceof SelenaApiHttpError) return selenaApiHttpErrorResponse(error, requestId);
		// A refused approval is a domain answer rather than a server fault, so
		// it answers 400. The reason does not travel with it: error bodies are
		// sanitised to an allowlist, and widening that list to carry order
		// internals would trade a real protection for convenience. `preflight`
		// is where a caller reads why, as a plain 200.
		return selenaApiErrorResponse(400, {
			code: "ORDER_DESK_REFUSED",
			message: error instanceof Error ? error.message : "Order desk action failed",
			requestId,
			retryable: false,
		});
	}
}

export const selenaOrderDeskRouteHandlers = {
	preflight: (request: Request, orderId: string) =>
		respond(async () => collectPreflight(await deskContext(request), assertOrderId(orderId))),

	approve: (request: Request, orderId: string) =>
		respond(async () => {
			const context = await deskContext(request);
			const id = assertOrderId(orderId);
			return approveOrder(context, id, await idempotencyKeyFrom(request, `approve:${id}`));
		}),

	enqueue: (request: Request, orderId: string) =>
		respond(async () => {
			const context = await deskContext(request);
			const id = assertOrderId(orderId);
			return enqueueOrderRunsForOrder(context, id, await idempotencyKeyFrom(request, `enqueue:${id}`));
		}),
};
