import { describe, expect, it } from "vitest";
import { measurementReportLabel } from "../selena-measurement-label";

const formatDate = (iso: string) => iso.slice(0, 10);

describe("the project row names the same measurement as the client report", () => {
	it("dates the newest quality-reviewed cycle", () => {
		const report = { measuredAt: "2026-09-01T10:00:00Z", update: null };

		expect(measurementReportLabel(report, "ru", formatDate)).toBe("AI-замер: 2026-09-01");
		expect(measurementReportLabel(report, "en", formatDate)).toBe("AI measurement: 2026-09-01");
	});

	it("keeps the reviewed date when a newer cycle failed review, and says so", () => {
		const report = {
			measuredAt: "2026-09-01T10:00:00Z",
			update: { state: "unsuccessful" as const, createdAt: "2026-09-20T10:00:00Z" },
		};

		expect(measurementReportLabel(report, "ru", formatDate)).toBe(
			"AI-замер: обновление не прошло проверку, показан отчёт от 2026-09-01",
		);
		expect(measurementReportLabel(report, "en", formatDate)).toBe(
			"AI measurement: update did not pass quality review, showing the report of 2026-09-01",
		);
		expect(measurementReportLabel(report, "ru", formatDate)).not.toContain("2026-09-20");
	});

	it("gives neither a date nor a count while no cycle has passed review", () => {
		for (const update of [
			null,
			{ state: "in_progress" as const, createdAt: "2026-09-20T10:00:00Z" },
			{ state: "unsuccessful" as const, createdAt: "2026-09-20T10:00:00Z" },
		]) {
			const label = measurementReportLabel({ measuredAt: null, update }, "ru", formatDate);

			expect(label).toBe("AI-замер: отчёт не готов");
			expect(label).not.toMatch(/\d/);
		}
		expect(measurementReportLabel({ measuredAt: null, update: null }, "en", formatDate)).toBe(
			"AI measurement: report not ready",
		);
	});

	it("tells an unfinished or unreviewed update apart from a rejected one", () => {
		const measuredAt = "2026-09-01T10:00:00Z";
		const createdAt = "2026-09-20T10:00:00Z";

		expect(measurementReportLabel({ measuredAt, update: { state: "in_progress", createdAt } }, "ru", formatDate)).toBe(
			"AI-замер: обновление выполняется, показан отчёт от 2026-09-01",
		);
		expect(
			measurementReportLabel({ measuredAt, update: { state: "awaiting_review", createdAt } }, "ru", formatDate),
		).toBe("AI-замер: обновление ждёт проверки, показан отчёт от 2026-09-01");
	});
});
