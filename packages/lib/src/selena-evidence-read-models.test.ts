import { describe, expect, it } from "vitest";
import {
	createHmacEvidenceCursorCodec,
	customerModuleState,
	summarizeEvidenceCoverage,
	toEvidenceReadModel,
	validateEvidenceCursorPayload,
} from "./selena-evidence-read-models";

const baseRow = {
	organizationId: "tenant-1",
	projectId: "11111111-1111-4111-8111-111111111111",
	evidenceId: "22222222-2222-4222-8222-222222222222",
	domainId: "SOCIAL",
	datasetVersion: 1,
	sourceSnapshotId: "44444444-4444-4444-8444-444444444444",
	capabilityId: "55555555-5555-4555-8555-555555555555",
	sourceType: "INSTAGRAM_PROFILES",
	source: "INSTAGRAM_PROFILES",
	surface: "INSTAGRAM",
	capabilityDomain: "SOCIAL",
	capabilityStatus: "PILOT_ONLY",
	inputSchemaVersion: "schema-discovery-input-v1",
	outputSchemaVersion: "instagram-profile-output-v1",
	capabilityInputSchemaVersion: "schema-discovery-input-v1",
	capabilityOutputSchemaVersion: "instagram-profile-output-v1",
	acceptanceStatus: "ACCEPTED",
	acceptedAt: new Date("2026-08-31T05:05:00.000Z"),
	evidenceCapturedAt: new Date("2026-08-31T05:00:00.000Z"),
};

describe("HoReCa evidence read models", () => {
	it("keeps configured and canary-only sources behind a customer-visible lock", () => {
		expect(customerModuleState("CONFIGURED_ONLY")).toBe("LOCKED");
		expect(customerModuleState("CANARY_ONLY")).toBe("LOCKED");
		expect(customerModuleState("PILOT_ONLY")).toBe("PILOT");
		expect(customerModuleState("ALLOWED")).toBe("ACTIVE");
		expect(customerModuleState("BLOCKED")).toBe("BLOCKED");
		expect(customerModuleState("UNRECOGNIZED")).toBe("UNKNOWN");
	});

	it("preserves UNKNOWN and invalid slots outside the coverage denominator", () => {
		expect(summarizeEvidenceCoverage(["PRESENT", "ABSENT", "UNKNOWN", "INVALID", "BLOCKED"])).toEqual({
			present: 1,
			knownDenominator: 2,
			unknown: 1,
			invalid: 1,
			blocked: 1,
			coverage: 0.5,
		});
		expect(summarizeEvidenceCoverage(["UNKNOWN", "INVALID"])).toMatchObject({
			knownDenominator: 0,
			coverage: null,
		});
	});

	it("returns linked source provenance without raw references, provider dataset refs, hashes, or environment", () => {
		const model = toEvidenceReadModel(baseRow, {
			tenantId: baseRow.organizationId,
			projectId: baseRow.projectId,
		});
		expect(model).toMatchObject({
			moduleState: "PILOT",
			provenanceState: "LINKED",
			source: "INSTAGRAM_PROFILES",
			surface: "INSTAGRAM",
			acceptanceStatus: "ACCEPTED",
			acceptedAt: "2026-08-31T05:05:00.000Z",
		});
		expect(model).not.toHaveProperty("rawReference");
		expect(model).not.toHaveProperty("providerDatasetRef");
		expect(model).not.toHaveProperty("contentSha256");
		expect(model).not.toHaveProperty("environment");
		expect(model).not.toHaveProperty("sourceSnapshotId");
		expect(model).not.toHaveProperty("datasetId");
		expect(model).not.toHaveProperty("datasetKey");
		expect(model).not.toHaveProperty("observationRef");
	});

	it("keeps missing, malformed, and pre-capture acceptance UNKNOWN", () => {
		for (const acceptance of [
			{ acceptanceStatus: null, acceptedAt: null },
			{ acceptanceStatus: "UNKNOWN", acceptedAt: new Date("2026-08-31T05:05:00.000Z") },
			{ acceptanceStatus: "ACCEPTED", acceptedAt: null },
			{ acceptanceStatus: "ACCEPTED", acceptedAt: new Date("invalid") },
			{ acceptanceStatus: "ACCEPTED", acceptedAt: new Date("2026-08-31T04:59:59.999Z") },
		]) {
			expect(
				toEvidenceReadModel(
					{ ...baseRow, ...acceptance },
					{ tenantId: baseRow.organizationId, projectId: baseRow.projectId },
				),
			).toMatchObject({ acceptanceStatus: "UNKNOWN", acceptedAt: null });
		}
	});

	it("marks missing source linkage as UNKNOWN instead of inventing evidence", () => {
		const model = toEvidenceReadModel(
			{
				...baseRow,
				sourceSnapshotId: null,
				capabilityId: null,
				source: null,
				surface: null,
				capabilityStatus: null,
				outputSchemaVersion: null,
			},
			{ tenantId: baseRow.organizationId, projectId: baseRow.projectId },
		);
		expect(model).toMatchObject({ moduleState: "UNKNOWN", provenanceState: "UNKNOWN" });
	});

	it("keeps a raw canary capture PARTIAL until schema discovery assigns an output version", () => {
		const model = toEvidenceReadModel(
			{
				...baseRow,
				capabilityStatus: "CANARY_ONLY",
				outputSchemaVersion: null,
				capabilityOutputSchemaVersion: null,
			},
			{ tenantId: baseRow.organizationId, projectId: baseRow.projectId },
		);
		expect(model).toMatchObject({ moduleState: "LOCKED", provenanceState: "PARTIAL" });
	});

	it("links an ENTITY place capability to the canonical LOCAL_MAPS domain", () => {
		expect(
			toEvidenceReadModel(
				{
					...baseRow,
					domainId: "LOCAL_MAPS",
					capabilityDomain: "ENTITY",
					sourceType: "GOOGLE_MAPS_PLACE",
					source: "GOOGLE_MAPS_PLACE",
					surface: "GOOGLE_MAPS_PLACE",
				},
				{ tenantId: baseRow.organizationId, projectId: baseRow.projectId },
			),
		).toMatchObject({ provenanceState: "LINKED" });
	});

	it("fails closed when source, domain or schema provenance does not match the capability", () => {
		for (const mismatch of [
			{ sourceType: "TIKTOK_PROFILES" },
			{ capabilityDomain: "REPUTATION" },
			{ capabilityInputSchemaVersion: "different-input-v1" },
			{ capabilityOutputSchemaVersion: "different-output-v1" },
		]) {
			expect(
				toEvidenceReadModel(
					{ ...baseRow, ...mismatch },
					{ tenantId: baseRow.organizationId, projectId: baseRow.projectId },
				),
			).toMatchObject({ provenanceState: "PARTIAL" });
		}
	});

	it("fails closed on cross-tenant and cross-project projections", () => {
		expect(() => toEvidenceReadModel(baseRow, { tenantId: "tenant-2", projectId: baseRow.projectId })).toThrow(
			"Not found: evidence is outside AuthContext tenant or project",
		);
		expect(() =>
			toEvidenceReadModel(baseRow, {
				tenantId: baseRow.organizationId,
				projectId: "66666666-6666-4666-8666-666666666666",
			}),
		).toThrow("Not found: evidence is outside AuthContext tenant or project");
	});

	it("accepts only verified cursor payloads bound to the same tenant and project", () => {
		const now = Date.parse("2026-08-31T06:00:00.000Z");
		const payload = {
			version: 1 as const,
			tenantId: baseRow.organizationId,
			projectId: baseRow.projectId,
			capturedAt: "2026-08-31T05:00:00.000Z",
			evidenceId: "22222222-2222-4222-8222-222222222222",
			issuedAt: "2026-08-31T05:55:00.000Z",
			expiresAt: "2026-08-31T06:05:00.000Z",
		};
		expect(
			validateEvidenceCursorPayload(
				payload,
				{
					tenantId: baseRow.organizationId,
					projectId: baseRow.projectId,
				},
				now,
			),
		).toEqual({
			capturedAt: new Date("2026-08-31T05:00:00.000Z"),
			evidenceId: "22222222-2222-4222-8222-222222222222",
		});
		expect(() =>
			validateEvidenceCursorPayload(payload, { tenantId: "tenant-2", projectId: baseRow.projectId }),
		).toThrow("INVALID_EVIDENCE_CURSOR");
		expect(() =>
			validateEvidenceCursorPayload(
				{ ...payload, evidenceId: "not-a-uuid" },
				{ tenantId: baseRow.organizationId, projectId: baseRow.projectId },
			),
		).toThrow("INVALID_EVIDENCE_CURSOR");
		expect(() =>
			validateEvidenceCursorPayload(
				{ ...payload, expiresAt: "2026-08-31T05:59:59.000Z" },
				{ tenantId: baseRow.organizationId, projectId: baseRow.projectId },
				now,
			),
		).toThrow("INVALID_EVIDENCE_CURSOR");
	});

	it("signs cursors, rejects tampering and supports a previous rotation key", async () => {
		const now = Date.parse("2026-08-31T06:00:00.000Z");
		const previousKey = "previous-cursor-signing-key-0000000001";
		const currentKey = "current-cursor-signing-key-00000000001";
		const previous = createHmacEvidenceCursorCodec({ signingKey: previousKey, now: () => now });
		const rotated = createHmacEvidenceCursorCodec({
			signingKey: currentKey,
			verificationKeys: [previousKey],
			now: () => now,
		});
		const token = await previous.seal({
			version: 1,
			tenantId: baseRow.organizationId,
			projectId: baseRow.projectId,
			capturedAt: "2026-08-31T05:00:00.000Z",
			evidenceId: baseRow.evidenceId,
		});
		await expect(rotated.verifyAndDecode(token)).resolves.toMatchObject({ tenantId: baseRow.organizationId });
		const [payload, signature] = token.split(".");
		if (!payload || !signature) throw new Error("signed cursor fixture is malformed");
		const tamperedSignature = `${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
		await expect(rotated.verifyAndDecode(`${payload}.${tamperedSignature}`)).rejects.toThrow("INVALID_EVIDENCE_CURSOR");
	});
});
