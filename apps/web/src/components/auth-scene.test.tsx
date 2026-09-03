import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthScene } from "./auth-scene";

describe("AuthScene", () => {
	it("keeps the mobile strip a still", () => {
		const html = renderToStaticMarkup(createElement(AuthScene, { scene: "lens", variant: "strip" }));

		expect(html).toContain('src="/media/cinematic/lens.webp"');
		expect(html).toContain('alt="A lens barrel standing on a dark surface, its glass lit from within"');
		expect(html).not.toContain("<video");
	});

	it("keeps the desktop panel a still", () => {
		const html = renderToStaticMarkup(createElement(AuthScene, { scene: "lens", variant: "panel" }));

		expect(html).toContain('src="/media/cinematic/lens.webp"');
		expect(html).toContain("A workspace for what AI systems say about your brand.");
		expect(html).not.toContain("<video");
	});

	/**
	 * The panel used to take its height from the viewport and crop a 16:9 frame
	 * down to the middle third of its width, which is how the two-doors shot
	 * ended up showing only the wall between the doors. Both variants must state
	 * their own ratio so the crop is the same at every window size.
	 */
	it("fixes each variant's aspect ratio instead of inheriting the viewport height", () => {
		const panel = renderToStaticMarkup(createElement(AuthScene, { scene: "lens", variant: "panel" }));
		const strip = renderToStaticMarkup(createElement(AuthScene, { scene: "lens", variant: "strip" }));

		expect(panel).toContain("aspect-[3/4]");
		expect(panel).not.toContain("min-h-");
		expect(strip).toContain("aspect-[21/9]");
	});
});
