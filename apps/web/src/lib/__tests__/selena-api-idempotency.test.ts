import { describe, expect, it, vi } from "vitest";
import { runSelenaApiMutation, type SelenaApiIdempotencyRunner } from "../../server/selena-api-idempotency";

const identity = {
	tenantId: "tenant-1",
	operation: "quote-create",
	resourceId: "00000000-0000-4000-8000-000000000001",
	idempotencyKey: "local-write-1",
	bodyHash: `sha256:${"a".repeat(64)}`,
};

describe("Selena API idempotency route seam", () => {
	it("lets a transaction-owned runner replay without invoking the mutation", async () => {
		const execute = vi.fn(async () => ({ status: 201, body: { quoteId: "persisted" } }));
		const runner: SelenaApiIdempotencyRunner = async (input) => {
			expect(input.identity).toEqual(identity);
			return { status: 201, body: { quoteId: "replayed" } };
		};

		const response = await runSelenaApiMutation({ runner, identity, execute });
		expect(response).toEqual({ status: 201, body: { quoteId: "replayed" } });
		expect(execute).not.toHaveBeenCalled();
	});

	it("executes normally when the owner-gated runner is absent", async () => {
		const execute = vi.fn(async () => ({ status: 202, body: { operation: "preflight" } }));
		expect(await runSelenaApiMutation({ identity: { ...identity, operation: "preflight" }, execute })).toEqual({
			status: 202,
			body: { operation: "preflight" },
		});
		expect(execute).toHaveBeenCalledTimes(1);
	});

	it("rejects a runner response outside the successful HTTP range", async () => {
		await expect(
			runSelenaApiMutation({
				identity,
				runner: async () => ({ status: 500, body: {} }),
				execute: async () => ({ status: 201, body: {} }),
			}),
		).rejects.toThrow("IDEMPOTENCY_RESPONSE_STATUS_INVALID");
	});
});
