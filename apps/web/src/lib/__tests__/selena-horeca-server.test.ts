import { describe, expect, it } from "vitest";
import { toHorecaApplicationEvidence } from "../../server/selena-horeca";

const row = {
	organizationId: "tenant-a",
	projectId: "11111111-1111-4111-8111-111111111111",
	evidenceId: "22222222-2222-4222-8222-222222222222",
	domainId: "LOCAL_MAPS",
	datasetVersion: 1,
	sourceSnapshotId: "33333333-3333-4333-8333-333333333333",
	capabilityId: "44444444-4444-4444-8444-444444444444",
	sourceType: "GOOGLE_MAPS_PLACE",
	source: "GOOGLE_MAPS_PLACE",
	surface: "GOOGLE_MAPS_PLACE",
	capabilityDomain: "ENTITY",
	capabilityStatus: "ALLOWED",
	inputSchemaVersion: "google-maps-place-input-v1",
	outputSchemaVersion: "google-maps-place-output-v1",
	capabilityInputSchemaVersion: "google-maps-place-input-v1",
	capabilityOutputSchemaVersion: "google-maps-place-output-v1",
	acceptanceStatus: "ACCEPTED",
	acceptedAt: new Date("2026-09-01T00:05:00.000Z"),
	evidenceCapturedAt: new Date("2026-09-01T00:00:00.000Z"),
};

const scope = { tenantId: row.organizationId, projectId: row.projectId };

describe("HoReCa application evidence mapping", () => {
	it("maps only receipt-backed acceptance from the safe evidence projection", () => {
		expect(toHorecaApplicationEvidence(row, scope)).toEqual({
			organizationId: row.organizationId,
			projectId: row.projectId,
			evidenceId: row.evidenceId,
			domain: "LOCAL_MAPS",
			surface: "GOOGLE_MAPS_PLACE",
			source: "GOOGLE_MAPS_PLACE",
			datasetVersion: 1,
			capturedAt: "2026-09-01T00:00:00.000Z",
			moduleState: "ACTIVE",
			provenanceState: "LINKED",
			acceptanceStatus: "ACCEPTED",
			acceptedAt: "2026-09-01T00:05:00.000Z",
			snapshotLinked: true,
		});
	});

	it("keeps missing receipts UNKNOWN and does not expose private receipt or provenance fields", () => {
		const privateProjection = {
			...row,
			acceptanceStatus: null,
			acceptedAt: null,
			acceptedBy: "private-operator",
			contentSha256: "private-hash",
		};
		const mapped = toHorecaApplicationEvidence(privateProjection, scope);
		expect(mapped).toMatchObject({ acceptanceStatus: "UNKNOWN", acceptedAt: null });
		expect(mapped).not.toHaveProperty("acceptedBy");
		expect(mapped).not.toHaveProperty("contentSha256");
	});
});
