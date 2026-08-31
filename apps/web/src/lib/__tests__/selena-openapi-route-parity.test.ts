import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openApiSpec from "@workspace/api-spec";
import { describe, expect, it } from "vitest";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const routesDirectory = path.resolve(testDirectory, "../../routes/api/v1");
const httpMethods = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*:/g;

function collectRouteFiles(directory: string): string[] {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const absolutePath = path.join(directory, entry.name);
		return entry.isDirectory() ? collectRouteFiles(absolutePath) : entry.name.endsWith(".ts") ? [absolutePath] : [];
	});
}

function routePathForFile(filePath: string): string {
	const relativePath = path.relative(routesDirectory, filePath).replaceAll(path.sep, "/").replace(/\.ts$/, "");
	const segments = relativePath.split("/");
	if (segments.at(-1) === "index") segments.pop();
	return `/api/v1/${segments.map((segment) => (segment.startsWith("$") ? `{${segment.slice(1)}}` : segment)).join("/")}`;
}

const routeFiles = collectRouteFiles(routesDirectory);
const routeMethods = new Map(
	routeFiles.map((filePath) => {
		const source = fs.readFileSync(filePath, "utf8");
		return [routePathForFile(filePath), new Set([...source.matchAll(httpMethods)].map((match) => match[1]))] as const;
	}),
);

describe("Selena OpenAPI ↔ route parity", () => {
	it("maps every documented path and method to a concrete v1 route file", () => {
		for (const [documentedPath, operation] of Object.entries(openApiSpec.paths)) {
			const routePath = `/api/v1${documentedPath}`;
			const methods = routeMethods.get(routePath);
			expect(methods, `missing route for ${documentedPath}`).toBeDefined();
			for (const method of Object.keys(operation)) {
				expect(methods, `missing route for ${documentedPath}`).toBeDefined();
				expect(methods?.has(method.toUpperCase()), `missing ${method.toUpperCase()} handler for ${documentedPath}`).toBe(true);
			}
		}
	});

	it("keeps the bounded Local Maps export route documented and GET-only", () => {
		const routePath = "/api/v1/selena/local-scan-cycles/{cycleId}/map-results/export";
		expect(routeMethods.get(routePath)).toEqual(new Set(["GET"]));
		expect(openApiSpec.paths["/selena/local-scan-cycles/{cycleId}/map-results/export"]).toHaveProperty("get");
	});
});
