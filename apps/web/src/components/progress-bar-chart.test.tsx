import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProgressBarChart } from "./progress-bar-chart";

describe("ProgressBarChart", () => {
	it("uses native button semantics only for actionable labels", () => {
		const html = renderToStaticMarkup(
			<ProgressBarChart
				items={[
					{ label: "Open report", count: 3, onClick: vi.fn() },
					{ label: "Reference only", count: 2 },
				]}
			/>,
		);

		expect(html).toMatch(/<button[^>]*type="button"[^>]*>Open report<\/button>/);
		expect(html).not.toMatch(/<button[^>]*>Reference only<\/button>/);
		expect(html).toContain(">Reference only</span>");
	});
});
