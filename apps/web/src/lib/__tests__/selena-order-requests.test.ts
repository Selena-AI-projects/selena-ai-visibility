import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The request layer is the server-function module plus the submission it
// calls; the invariants hold for both.
const source = ["../../server/selena-order-requests.ts", "../../server/selena-order-request-submit.ts"]
	.map((path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8"))
	.join("\n");

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

	it("keeps reading and closing requests behind the platform-operator gate", () => {
		const listing = source.slice(source.indexOf("export const listSelenaOrderRequestsFn"));
		expect(listing).toContain("requireAdmin()");
		// Closing a request acts in the request's own workspace, which the
		// operator scope resolves only after its own requireAdmin() check.
		const updating = source.slice(source.indexOf("export const updateSelenaOrderRequestStatusFn"));
		expect(updating).toContain('operatorScopeForRequest(data.requestId, "request_status")');
	});

	// One code is one request: the id is derived from the workspace and the
	// code's digest, so a resubmission cannot mint a second request or order.
	it("files every submission of one pilot code under one request", () => {
		expect(source).toContain("pilotSeatRequestId(context.tenantId, hashPilotInviteCode(code))");
		expect(source).toContain(".onConflictDoNothing({ target: svOrderRequests.id })");
	});

	// The two daily caps span every tenant, and the runtime role cannot count
	// other tenants' rows, so the count and the decision belong to one database
	// claim; an application-side count would be both blind and racy.
	it("decides the cross-tenant promo caps in the database, never by counting here", () => {
		expect(source).toContain("claimFreeAutoDispatch(tx");
		expect(source).toContain("releaseFreeAutoDispatchClaim(tx");
		expect(source).not.toContain("count()");
	});
});
