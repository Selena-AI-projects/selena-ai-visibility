import { pilotSeatRequestId } from "@workspace/selena-visibility-contracts";
import { describe, expect, it } from "vitest";
import { isLegacyRequestId, reconcilePilotSeats } from "./selena-pilot-seat-reconciliation";

const hash = (char: string) => char.repeat(64);
const seat = (seatId: string, organizationId: string, codeHash: string) => ({
	seatId,
	label: seatId,
	planId: "visibility-snapshot",
	organizationId,
	codeHash,
});
const request = (id: string, organizationId: string) => ({
	id,
	organizationId,
	planId: "visibility-snapshot",
	status: "AUTO_QUEUED",
	createdAt: new Date("2026-09-08T00:00:00Z"),
});
const legacyA = "1b4e28ba-2fa1-41d2-883f-0016d3cca427";
const legacyB = "6fa459ea-ee8a-4ca4-894e-db77e160355e";

describe("pilot seat reconciliation", () => {
	it("tells a random request id from a derived one", () => {
		expect(isLegacyRequestId(legacyA)).toBe(true);
		expect(isLegacyRequestId(pilotSeatRequestId("org", hash("a")))).toBe(false);
	});

	it("follows a seat redeemed after the change to its derived request and order", () => {
		const derived = pilotSeatRequestId("org-new", hash("a"));
		const [row] = reconcilePilotSeats({
			seats: [seat("s1", "org-new", hash("a"))],
			requests: [request(derived, "org-new")],
			orders: [{ requestId: derived, orderId: "o1", status: "READY" }],
		});
		expect(row).toMatchObject({ class: "NEW_FLOW_ORDERED", requestIds: [derived], orders: [{ orderId: "o1" }] });
	});

	it("pairs the one old seat of a workspace with its one old request", () => {
		const rows = reconcilePilotSeats({
			seats: [seat("s1", "org-old", hash("b"))],
			requests: [request(legacyA, "org-old")],
			orders: [],
		});
		expect(rows).toEqual([expect.objectContaining({ class: "LEGACY_NO_ORDER", requestIds: [legacyA] })]);
	});

	it("refuses to guess when a workspace holds two old seats and two old requests", () => {
		const rows = reconcilePilotSeats({
			seats: [seat("s1", "org-two", hash("c")), seat("s2", "org-two", hash("d"))],
			requests: [request(legacyA, "org-two"), request(legacyB, "org-two")],
			orders: [{ requestId: legacyB, orderId: "o2", status: "QC_REQUIRED" }],
		});
		expect(rows.map((row) => row.class)).toEqual(["LEGACY_AMBIGUOUS", "LEGACY_AMBIGUOUS"]);
		expect(rows[0].orders).toEqual([{ orderId: "o2", status: "QC_REQUIRED" }]);
	});

	it("reports a redeemed seat with no request at all", () => {
		const [row] = reconcilePilotSeats({ seats: [seat("s1", "org-lost", hash("e"))], requests: [], orders: [] });
		expect(row.class).toBe("ORPHAN_SEAT");
	});
});
