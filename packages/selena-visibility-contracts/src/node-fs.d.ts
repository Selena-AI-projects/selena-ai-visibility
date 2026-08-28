// Same reason as node-crypto.d.ts: this package depends on nothing but zod, so
// @types/node is not available. The tests that hold the economics document to
// the calculator, and the one that greps the calculator for a hidden tariff,
// need exactly these three built-ins.
declare module "node:fs" {
	export function readFileSync(path: string, encoding: "utf8"): string;
	export function writeFileSync(path: string, data: string): void;
}

declare module "node:url" {
	export function fileURLToPath(url: URL | string): string;
}

declare const process: { argv: string[] };
