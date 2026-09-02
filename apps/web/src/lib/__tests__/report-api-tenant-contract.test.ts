import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const collectionRoute = readFileSync(
	fileURLToPath(new URL("../../routes/api/v1/reports/index.ts", import.meta.url)),
	"utf8",
);
const detailRoute = readFileSync(
	fileURLToPath(new URL("../../routes/api/v1/reports/$reportId.ts", import.meta.url)),
	"utf8",
);
const seed = readFileSync(fileURLToPath(new URL("../../../../../e2e/seed.ts", import.meta.url)), "utf8");

describe("report API tenant contract", () => {
	it("seeds the legacy admin credential as a tenant API key without storing the plaintext", () => {
		expect(seed).toContain('createHash("sha256").update(TEST_API_KEY).digest("hex")');
		expect(seed).toContain("INSERT INTO sv_api_keys (organization_id, name, key_hash, permissions, created_by)");
		expect(seed).toContain("[TEST_BRAND_ID, createHash");
		expect(seed).not.toContain("'test-api-key-e2e'");
	});

	it("attributes every seeded report to the API key tenant", () => {
		expect(seed.match(/INSERT INTO reports \(id, organization_id,/g)).toHaveLength(2);
		expect(seed).not.toContain("INSERT INTO reports (id, brand_name");
	});

	it("keeps collection and detail reads behind tenant transactions and predicates", () => {
		for (const source of [collectionRoute, detailRoute]) {
			expect(source).toContain("withOrganizationTransaction(db, auth.tenantId");
			expect(source).toContain("eq(reports.organizationId, auth.tenantId)");
			expect(source).toContain("mapError: mapReportApiError");
		}
	});

	it("requires tenant write permission before creating and queueing a report", () => {
		expect(collectionRoute).toContain("if (!canWrite(auth))");
		expect(collectionRoute.indexOf("if (!canWrite(auth))")).toBeLessThan(collectionRoute.indexOf("tx.insert(reports)"));
	});
});
