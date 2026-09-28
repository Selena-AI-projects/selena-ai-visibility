import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The web client bundles this package, and Vite's dev server does not strip
// Node built-ins the way the production build happens to: one `node:` import
// in a runtime module breaks hydration of every page that imports the
// contracts. Tests and scripts stay free to use them.
describe("the contracts package stays loadable in a browser", () => {
	it("imports no Node built-in from a runtime module", () => {
		const srcDir = fileURLToPath(new URL(".", import.meta.url));
		const offenders = readdirSync(srcDir)
			.filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".d.ts"))
			.filter((name) => /(^|\n)\s*import\b[^;]*?\bfrom\s+["']node:/.test(readFileSync(`${srcDir}/${name}`, "utf8")));
		expect(offenders).toEqual([]);
	});
});
