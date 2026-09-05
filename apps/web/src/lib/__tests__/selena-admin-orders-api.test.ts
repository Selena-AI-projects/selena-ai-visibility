import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveApiKeyAuthContext = vi.fn();
const collectPreflight = vi.fn();
const approveOrder = vi.fn();
const enqueueOrderRunsForOrder = vi.fn();

vi.mock("../selena-auth-context", () => ({ resolveApiKeyAuthContext }));
vi.mock("../../server/selena-admin-orders", () => ({
	collectPreflight,
	approveOrder,
	enqueueOrderRunsForOrder,
}));

const { ORDER_DESK_SCOPE, selenaOrderDeskRouteHandlers } = await import("../../server/selena-admin-orders-api");

const ORDER_ID = "239c25cb-a855-4dcd-8798-c85b6408cf73";

function keyWith(permissions: string[]) {
	return { actorId: "api-key:1", tenantId: "default", role: "owner", authType: "api_key", permissions };
}

function post(body?: unknown, headers?: Record<string, string>) {
	return new Request("https://example.test/api/v1/selena/admin/orders/x/approve", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	resolveApiKeyAuthContext.mockResolvedValue(keyWith([ORDER_DESK_SCOPE]));
	approveOrder.mockResolvedValue({ orderId: ORDER_ID, status: "QUEUED", created: 30 });
	enqueueOrderRunsForOrder.mockResolvedValue({ orderId: ORDER_ID, enqueued: 30 });
	collectPreflight.mockResolvedValue({ blockers: [] });
});

describe("who may approve", () => {
	// The gate this moves off the browser: a key that can assemble an order
	// must not also be able to spend on it.
	it("refuses a key that only carries client write", async () => {
		resolveApiKeyAuthContext.mockResolvedValue(keyWith(["client:read", "client:write"]));
		const response = await selenaOrderDeskRouteHandlers.approve(post(), ORDER_ID);
		expect(response.status).toBe(403);
		expect(approveOrder).not.toHaveBeenCalled();
	});

	it("refuses enqueue on the same key", async () => {
		resolveApiKeyAuthContext.mockResolvedValue(keyWith(["client:read", "client:write"]));
		expect((await selenaOrderDeskRouteHandlers.enqueue(post(), ORDER_ID)).status).toBe(403);
		expect(enqueueOrderRunsForOrder).not.toHaveBeenCalled();
	});

	it("admits a key the owner granted the desk scope", async () => {
		expect((await selenaOrderDeskRouteHandlers.approve(post(), ORDER_ID)).status).toBe(200);
		expect(approveOrder).toHaveBeenCalledOnce();
	});
});

describe("the order id", () => {
	it("refuses anything that is not a uuid before touching the order", async () => {
		const response = await selenaOrderDeskRouteHandlers.approve(post(), "not-a-uuid");
		expect(response.status).toBe(400);
		expect(approveOrder).not.toHaveBeenCalled();
	});
});

describe("replay", () => {
	// Without a key a retried POST mints a second set of permits, so the
	// handler supplies a stable one rather than leaving the write unguarded.
	it("falls back to a stable key when the caller sends none", async () => {
		await selenaOrderDeskRouteHandlers.approve(post(), ORDER_ID);
		expect(approveOrder).toHaveBeenCalledWith(expect.anything(), ORDER_ID, `approve:${ORDER_ID}`);
	});

	it("prefers the caller's header", async () => {
		await selenaOrderDeskRouteHandlers.approve(post(undefined, { "idempotency-key": "run-7" }), ORDER_ID);
		expect(approveOrder).toHaveBeenCalledWith(expect.anything(), ORDER_ID, "run-7");
	});

	it("accepts one in the body", async () => {
		await selenaOrderDeskRouteHandlers.enqueue(post({ idempotencyKey: "run-8" }), ORDER_ID);
		expect(enqueueOrderRunsForOrder).toHaveBeenCalledWith(expect.anything(), ORDER_ID, "run-8");
	});
});

describe("a refused action", () => {
	it("answers 400 rather than a server fault", async () => {
		approveOrder.mockRejectedValue(new Error("SELENA_ORDER_NOT_APPROVABLE"));
		expect((await selenaOrderDeskRouteHandlers.approve(post(), ORDER_ID)).status).toBe(400);
	});

	// Error bodies are sanitised to an allowlist. That holds for order
	// internals too, so a caller reads the reason from preflight instead of
	// from the refusal — this asserts the leak does not open.
	it("does not carry the order's internal reason", async () => {
		approveOrder.mockRejectedValue(new Error("SELENA_ORDER_NOT_APPROVABLE"));
		const body = await (await selenaOrderDeskRouteHandlers.approve(post(), ORDER_ID)).json();
		expect(JSON.stringify(body)).not.toContain("SELENA_ORDER_NOT_APPROVABLE");
		expect(body.error.code).toBe("ORDER_DESK_REFUSED");
	});

	it("serves the blockers from preflight as a plain answer", async () => {
		collectPreflight.mockResolvedValue({ blockers: ["PAYMENT_RECORDED"] });
		const response = await selenaOrderDeskRouteHandlers.preflight(post(), ORDER_ID);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ blockers: ["PAYMENT_RECORDED"] });
	});
});
