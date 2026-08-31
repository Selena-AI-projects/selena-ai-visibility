import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
	fileURLToPath(new URL("../../routes/api/v1/selena/locks/index.ts", import.meta.url)),
	"utf8",
);
const resourcesSource = readFileSync(
	fileURLToPath(new URL("../../server/selena-resources.ts", import.meta.url)),
	"utf8",
);
const orderDeskSource = readFileSync(
	fileURLToPath(new URL("../../server/selena-order-desk-core.ts", import.meta.url)),
	"utf8",
);

describe("configuration lock caller contract", () => {
	it("treats a public version as an expectation and returns HTTP 409 for a stale value", () => {
		expect(routeSource).toContain("expectedVersion: parsed.data.version");
		expect(routeSource).toContain('message === "SELENA_CONFIGURATION_LOCK_VERSION_CONFLICT"');
		expect(routeSource).toMatch(/SELENA_CONFIGURATION_LOCK_VERSION_CONFLICT[\s\S]*?\? 409/);
		expect(routeSource).toContain("status === 409 ? { code: message } : {}");
		expect(resourcesSource).toContain("expectedVersion: data.version");
	});

	it("leaves internal order creation to the centralized allocator", () => {
		expect(orderDeskSource).toContain("allocateConfigurationLockInTransaction(tx, context");
		expect(orderDeskSource).not.toContain("repositories.locks.allocate(context");
		expect(orderDeskSource).not.toContain("expectedVersion:");
	});

	it("serializes one payment key and keeps the immutable order chain atomic and idempotent", () => {
		const start = orderDeskSource.indexOf("export async function createSelenaOrderDraft");
		const end = orderDeskSource.indexOf("\n/**", start);
		const draft = orderDeskSource.slice(start, end);
		expect(draft).toContain("return withOrganizationTransaction(db, context.tenantId, async (tx)");
		expect(draft).toContain("pg_advisory_xact_lock");
		expect(draft).toContain("selena-order-draft:test:");
		expect(draft).toContain("SELENA_ORDER_IDEMPOTENCY_CONFLICT");
		expect(draft).toContain("matchesFrozenSelenaOrderRequest(snapshot.orderRequest, data)");
		expect(draft).toContain("orderRequest: freezeSelenaOrderRequest(data)");
		expect(draft).toContain("allocateConfigurationLockInTransaction(tx, context");
		expect(draft).toContain("await tx.insert(svAuditEvents)");
		expect(draft).not.toContain("await db.");
		expect(draft.indexOf("if (existing)")).toBeLessThan(draft.indexOf("assertPaymentAllowed("));
	});
});
