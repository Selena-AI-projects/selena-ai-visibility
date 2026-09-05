import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("../../server/selena-order-requests.ts", import.meta.url)), "utf8");

describe("plan request layer zero invariant", () => {
	// A request is a lead. Turning one into a paid measurement stays the
	// operator's explicit act on the order desk, so this module must not be
	// able to create money objects, mint permits or queue work.
	const forbidden = ["svOrders", "svQuotes", "svRunPermits", "createPermits", "enqueue", "boss", "fetch("];

	it("keeps the request module free of the order and dispatch path", () => {
		for (const marker of forbidden) {
			expect(source.includes(marker), `selena-order-requests.ts must not contain "${marker}"`).toBe(false);
		}
	});

	it("decides free passage by spending a seat in the database, not by matching a string", () => {
		expect(source).toContain("redeemPilotInvite(tx");
		expect(source).toContain("planId: data.planId");
		expect(source).not.toContain("promoCodeApplies");
	});

	// Storing what the customer typed would turn the lead table into a list of
	// working codes for anyone who can read one tenant's rows.
	it("never stores the submitted code", () => {
		expect(source).toContain("promoCode: null");
	});

	it("keeps reading and closing requests behind the admin gate", () => {
		const listing = source.slice(source.indexOf("listSelenaOrderRequestsFn"));
		expect(listing).toContain("requireAdmin()");
		const updating = source.slice(source.indexOf("updateSelenaOrderRequestStatusFn"));
		expect(updating).toContain("requireAdmin()");
	});

	it("fails closed before the cross-tenant promo cap until an atomic claim exists", () => {
		expect(source).toContain("RLS_GLOBAL_CAP_ATOMIC_CLAIM_REQUIRED");
		expect(source).not.toContain("await db\n");
		expect(source).not.toContain("count()");
	});
});
