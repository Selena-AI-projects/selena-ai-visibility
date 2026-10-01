import { builtinModules } from "node:module";
import type { Plugin } from "vite";

const STUB_PREFIX = "\0node-builtin-inert:";
const builtinNames = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

/**
 * A module with the built-in's real export names, each an inert value: any
 * property of it is inert, calling or constructing it yields another inert
 * value, and the first call of each warns in the console. Dependencies such
 * as node-fetch call built-ins while their module body evaluates, so a stub
 * that threw on call would still break the page; production never runs those
 * bodies at all because nothing on the client imports their exports.
 */
async function inertStub(name: string): Promise<string> {
	const real = (await import(name)) as Record<string, unknown>;
	const keys = Object.keys(real).filter((key) => key !== "default" && /^[A-Za-z_$][\w$]*$/.test(key));
	return [
		"const warned = new Set();",
		"function inert(path) {",
		"\tconst warn = () => { if (warned.has(path)) return; warned.add(path); console.warn(path + ' is server-only; the browser called it and the call was ignored'); };",
		"\treturn new Proxy(function () {}, {",
		"\t\tget: (_, key) => (typeof key === 'symbol' || key === 'then' ? undefined : inert(path + '.' + key)),",
		"\t\tapply: () => { warn(); return inert(path + '()'); },",
		"\t\tconstruct: () => { warn(); return inert(path + '()'); },",
		"\t});",
		"}",
		...keys.map((key) => `export const ${key} = inert(${JSON.stringify(`${name}.${key}`)});`),
		`export default { ${keys.join(", ")} };`,
	].join("\n");
}

const resolveInert = (source: string) => (builtinNames.has(source) ? STUB_PREFIX + source : null);
const loadInert = (id: string) => (id.startsWith(STUB_PREFIX) ? inertStub(id.slice(STUB_PREFIX.length)) : null);

/**
 * Dev-server counterpart of what the production build already does.
 *
 * A server function's file keeps its module-level helpers in the client
 * bundle, and with them every import those helpers reach: repositories,
 * provider registries, the secrets store. The production build tree-shakes
 * all of that away because nothing on the client calls it. The dev server
 * cannot tree-shake, and Vite's stand-in for a Node built-in throws (in
 * source modules) or yields undefined (in pre-bundled dependencies) as soon
 * as an import is read, so one `import { createHash } from "node:crypto"`
 * anywhere in that reachable graph broke hydration of every page.
 *
 * `plugin` serves the client environment's source modules; `optimizeDeps`
 * gives the dependency pre-bundler the same stubs. Neither applies to a build.
 */
export const nodeBuiltinsInertOnClient = {
	plugin(): Plugin {
		return {
			name: "node-builtins-inert-on-client",
			apply: "serve",
			enforce: "pre",
			applyToEnvironment: (environment) => environment.name === "client",
			resolveId: resolveInert,
			load: loadInert,
		};
	},
	optimizeDeps: {
		rolldownOptions: {
			plugins: [{ name: "node-builtins-inert-on-client:deps", resolveId: resolveInert, load: loadInert }],
		},
	},
};
