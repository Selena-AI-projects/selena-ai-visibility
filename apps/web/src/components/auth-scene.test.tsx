import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthScene } from "./auth-scene";

describe("AuthScene", () => {
	it("shows the still and its caption on the desktop panel", () => {
		const html = renderToStaticMarkup(createElement(AuthScene, { scene: "lens", variant: "panel" }));

		expect(html).toContain('src="/media/cinematic/lens.webp"');
		expect(html).toContain("A workspace for what AI systems say about your brand.");
		expect(html).not.toContain("<video");
	});

	it("shows the same still, described, on the narrow-screen strip", () => {
		const html = renderToStaticMarkup(createElement(AuthScene, { scene: "lens", variant: "strip" }));

		expect(html).toContain('src="/media/cinematic/lens.webp"');
		expect(html).toContain('alt="A lens barrel standing on a dark surface, its glass lit from within"');
		expect(html).not.toContain("<video");
	});
});
