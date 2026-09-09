import { describe, expect, it } from "vitest";
import { selectReportAnchor } from "@/lib/selena-report-anchor";

describe("selectReportAnchor", () => {
	it("keeps the newest existing cycle when a newer order has no cycle", () => {
		const cycleCreatedAt = new Date("2026-09-01T10:00:00.000Z");
		const anchor = selectReportAnchor(
			{
				orderId: "measured-order",
				lockId: "measured-lock",
				cycle: {
					id: "latest-cycle",
					status: "READY",
					expectedRuns: 75,
					completedRuns: 75,
					createdAt: cycleCreatedAt,
				},
			},
			{ id: "empty-order", lockId: "empty-lock", createdAt: new Date("2026-09-02T10:00:00.000Z") },
		);

		expect(anchor).toEqual({
			orderId: "measured-order",
			lockId: "measured-lock",
			cycle: {
				id: "latest-cycle",
				status: "READY",
				expectedRuns: 75,
				completedRuns: 75,
				createdAt: cycleCreatedAt,
			},
		});
	});

	it("falls back to the newest order when no cycle exists", () => {
		expect(
			selectReportAnchor(null, {
				id: "empty-order",
				lockId: "empty-lock",
				createdAt: new Date("2026-09-02T10:00:00.000Z"),
			}),
		).toEqual({ orderId: "empty-order", lockId: "empty-lock", cycle: null });
	});
});
