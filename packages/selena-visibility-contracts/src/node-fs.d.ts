// This package depends on nothing but zod, so @types/node is not available.
// Only tests and scripts may touch Node built-ins (browser-safe.test.ts holds
// the runtime modules to that); they need exactly these.
declare module "node:fs" {
	export function readdirSync(path: string): string[];
	export function readFileSync(path: string, encoding: "utf8"): string;
	export function writeFileSync(path: string, data: string): void;
}

declare module "node:url" {
	export function fileURLToPath(url: URL | string): string;
}

declare const process: { argv: string[] };
