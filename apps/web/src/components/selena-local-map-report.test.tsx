import type { LocalReportContent } from "@workspace/lib/selena-local-report-publication";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelenaLocalMapReport } from "./selena-local-map-report";

const cycleId = "00000000-0000-4000-8000-000000000001";
const base = {
	keyword: "hotel ubud",
	language: "en",
	validity: "VALID",
	capturedAt: "2026-09-26T00:00:00.000Z",
	reason: null,
};

const report: LocalReportContent = {
	schemaVersion: 1,
	localCycleId: cycleId,
	measurementCycleId: "00000000-0000-4000-8000-000000000002",
	provider: "dataforseo-google-maps",
	generatedAt: "2026-09-26T00:00:00.000Z",
	status: "PARTIAL",
	totals: { expected: 9, terminal: 2, valid: 1, invalid: 0, unknown: 1, blocked: 0, pending: 0 },
	observations: [
		{
			...base,
			id: "00000000-0000-4000-8000-000000000010",
			pointIndex: 0,
			latitude: -8.5,
			longitude: 115.26,
			outcome: "FOUND",
			targetRank: 3,
			evidenceId: "00000000-0000-4000-8000-000000000020",
		},
		{
			...base,
			id: "00000000-0000-4000-8000-000000000011",
			pointIndex: 1,
			latitude: -8.49,
			longitude: 115.27,
			outcome: "UNKNOWN",
			validity: "UNMEASURED",
			targetRank: null,
			reason: "PROVIDER_OUTCOME_UNKNOWN",
			evidenceId: null,
		},
	],
};

describe("Local Maps report", () => {
	const html = renderToStaticMarkup(createElement(SelenaLocalMapReport, { report }));

	it("is presented as Google Maps visibility, not Ask Maps", () => {
		expect(html).toContain("Google Maps visibility");
		expect(html).not.toContain("Ask Maps");
	});

	it("links a measured position to its evidence and never shows a rank for an unconfirmed point", () => {
		expect(html).toContain(
			`/api/v1/selena/local-scan-cycles/${cycleId}/report?evidence=00000000-0000-4000-8000-000000000020`,
		);
		expect(html).toContain("#3");
		expect(html).toContain("PROVIDER_OUTCOME_UNKNOWN");
		expect(html.match(/>#\d+</g)).toEqual([">#3<"]);
	});
});
