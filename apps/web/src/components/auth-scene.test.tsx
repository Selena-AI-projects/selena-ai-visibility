import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthScene } from "./auth-scene";

describe("AuthScene", () => {
	it("keeps the mobile strip poster-only", () => {
		const html = renderToStaticMarkup(createElement(AuthScene, { scene: "doors", variant: "strip" }));

		expect(html).toContain('src="/media/cinematic/doors.webp"');
		expect(html).toContain('alt="Two lit doorways at the end of a dark corridor"');
		expect(html).not.toContain("<video");
	});

	it("keeps the desktop poster as the server-rendered reduced-motion-safe fallback", () => {
		const html = renderToStaticMarkup(createElement(AuthScene, { scene: "doors", variant: "panel" }));

		expect(html).toContain('src="/media/cinematic/doors.webp"');
		expect(html).toContain("Every report inside is dated and sourced.");
		expect(html).not.toContain("<video");
		expect(html).not.toContain("doors-loop");
	});
});
