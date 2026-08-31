import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openApiSpec from "@workspace/api-spec";
import { describe, expect, it } from "vitest";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const routesDirectory = path.resolve(testDirectory, "../../routes/api/v1");
const httpMethodNames = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const httpMethods = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*:/g;

const requiredSelenaApi01 = new Map([
	["/selena/projects/{projectId}/locations", ["POST"]],
	["/selena/locations/{locationId}/place-entity", ["PUT"]],
	["/selena/locations/{locationId}/keyword-sets", ["POST"]],
	["/selena/admin/local-scan-cycles/{cycleId}/preflight", ["POST"]],
	["/selena/admin/local-scan-cycles/{cycleId}/approve", ["POST"]],
	["/selena/admin/local-scan-cycles/{cycleId}/stop", ["POST"]],
	["/selena/admin/local-map-runs/{runId}/retry", ["POST"]],
	["/selena/admin/local-ai-runs/{runId}/retry", ["POST"]],
	["/selena/admin/providers/{providerId}/canary", ["POST"]],
	["/selena/admin/providers/{providerId}/capabilities", ["GET"]],
	["/selena/locations/{locationId}/local-scan/quote", ["POST"]],
	["/selena/locations/{locationId}/local-scan-cycles", ["POST"]],
	["/selena/local-scan-cycles/{cycleId}/progress", ["GET"]],
	["/selena/local-scan-cycles/{cycleId}/map-results", ["GET"]],
	["/selena/local-scan-cycles/{cycleId}/map-results/export", ["GET"]],
	["/selena/local-scan-cycles/{cycleId}/ai-results", ["GET"]],
	["/selena/local-scan-cycles/{cycleId}/evidence", ["GET"]],
]);

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
const routeEntries = routeFiles.map((filePath) => {
	const source = fs.readFileSync(filePath, "utf8");
	return {
		filePath,
		routePath: routePathForFile(filePath),
		methods: new Set([...source.matchAll(httpMethods)].map((match) => match[1])),
	};
});
const routeMethods = new Map(routeEntries.map(({ routePath, methods }) => [routePath, methods]));
const duplicateRoutePaths = routeEntries
	.map(({ routePath }) => routePath)
	.filter((routePath, index, paths) => paths.indexOf(routePath) !== index);

function documentedMethods(operation: Record<string, unknown>): string[] {
	return Object.keys(operation)
		.filter((method) => httpMethodNames.has(method.toUpperCase()))
		.map((method) => method.toUpperCase());
}

function sorted(values: Iterable<string>): string[] {
	return [...values].sort();
}

describe("Selena OpenAPI ↔ route parity", () => {
	it("maps every documented path and exact method set to a concrete v1 route file", () => {
		expect(duplicateRoutePaths, "duplicate normalized route paths").toEqual([]);
		for (const [documentedPath, operation] of Object.entries(openApiSpec.paths)) {
			const routePath = `/api/v1${documentedPath}`;
			const methods = routeMethods.get(routePath);
			expect(methods, `missing route for ${documentedPath}`).toBeDefined();
			expect(sorted(methods ?? []), `method mismatch for ${documentedPath}`).toEqual(
				sorted(documentedMethods(operation)),
			);
		}
	});

	it("keeps the independent Selena API-01 manifest aligned while allowing legacy routes outside its scope", () => {
		const documentedSelena = Object.fromEntries(
			Object.entries(openApiSpec.paths)
				.filter(([documentedPath]) => documentedPath.startsWith("/selena/"))
				.map(([documentedPath, operation]) => [documentedPath, documentedMethods(operation)]),
		);
		expect(sorted(Object.keys(documentedSelena))).toEqual(sorted(requiredSelenaApi01.keys()));
		for (const [documentedPath, expectedMethods] of requiredSelenaApi01) {
			const methods = routeMethods.get(`/api/v1${documentedPath}`);
			expect(sorted(methods ?? []), `API-01 method mismatch for ${documentedPath}`).toEqual(sorted(expectedMethods));
		}
		expect(routeEntries.some(({ routePath }) => routePath === "/api/v1/selena/payments/test")).toBe(true);
	});
});
