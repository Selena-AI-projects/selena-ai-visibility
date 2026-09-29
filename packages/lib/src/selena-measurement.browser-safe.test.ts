import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The web app sizes its queues from this module's lease constant, and a server
// function file keeps its module-level helpers, boss-client among them, in the
// client bundle. Whatever this module reaches at runtime is therefore evaluated
// in the browser: the provider registry's SDKs read Node built-ins while their
// module bodies run, which broke the citations and prompt pages once the
// run-policy index was on the path. Type-only imports are erased and stay free.
const srcDir = fileURLToPath(new URL(".", import.meta.url));
const libExports: Record<string, string> = JSON.parse(readFileSync(resolve(srcDir, "../package.json"), "utf8")).exports;
const importPattern = /(?:^|\n)\s*(import|export)\s+(type\s+)?[^;'"]*?\bfrom\s+["']([^"']+)["']/g;
const serverOnlyDirectories = ["providers/", "secrets/", "adapters/", "db/"];

function resolveModule(specifier: string, from: string): string | null {
	const base = specifier.startsWith(".")
		? resolve(dirname(from), specifier)
		: specifier.startsWith("@workspace/lib/")
			? resolve(srcDir, "..", libExports[`.${specifier.slice("@workspace/lib".length)}`] ?? "")
			: null;
	if (!base) return null;
	for (const candidate of [base, `${base}.ts`, resolve(base, "index.ts")]) {
		try {
			readFileSync(candidate);
			return candidate;
		} catch {}
	}
	return null;
}

function runtimeImportClosure(entry: string): Map<string, string[]> {
	const nodeImports = new Map<string, string[]>();
	const queue = [entry];
	while (queue.length > 0) {
		const file = queue.shift() as string;
		if (nodeImports.has(file)) continue;
		const builtins: string[] = [];
		for (const match of readFileSync(file, "utf8").matchAll(importPattern)) {
			if (match[2]) continue;
			const specifier = match[3];
			if (specifier.startsWith("node:")) builtins.push(specifier);
			const target = resolveModule(specifier, file);
			if (target) queue.push(target);
		}
		nodeImports.set(file, builtins);
	}
	return nodeImports;
}

describe("the measurement module stays loadable in a browser", () => {
	const closure = runtimeImportClosure(resolve(srcDir, "selena-measurement.ts"));
	const reached = [...closure.keys()].map((file) => file.slice(srcDir.length));

	it("reaches no server-only module", () => {
		expect(reached.filter((file) => serverOnlyDirectories.some((dir) => file.startsWith(dir)))).toEqual([]);
	});

	it("imports no Node built-in anywhere on its import path", () => {
		const offenders = [...closure]
			.filter(([, builtins]) => builtins.length > 0)
			.map(([file]) => file.slice(srcDir.length));
		expect(offenders).toEqual([]);
	});
});
