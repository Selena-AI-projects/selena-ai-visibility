import { horecaLocalFirstReadModelSchema } from "@workspace/selena-visibility-contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelenaHorecaLocalFirst } from "../../components/selena-horeca-local-first";
import {
	assembleHorecaLocalFirstReadModel,
	buildHorecaLocalFirstPreview,
	type HorecaEvidenceSource,
	type HorecaProjectSource,
	horecaEvidenceDetailSchema,
	horecaProjectPhaseFromPersistedState,
	resolveHorecaEvidenceDetail,
} from "../selena-horeca-local-first";

const tenantId = "tenant-a";
const projectId = "11111111-1111-4111-8111-111111111111";
const evidenceId = "22222222-2222-4222-8222-222222222222";
const generatedAt = "2026-09-01T00:00:00.000Z";

const project: HorecaProjectSource = {
	id: projectId,
	organizationId: tenantId,
	name: "KORA evidence workspace",
	category: "FOOD HALL",
	phase: "PRE_OPENING",
};

const linkedEvidence: HorecaEvidenceSource = {
	organizationId: tenantId,
	projectId,
	acceptanceStatus: "ACCEPTED",
	acceptedAt: "2026-08-31T23:30:00.000Z",
	snapshotLinked: true,
	evidenceId,
	domain: "LOCAL_MAPS",
	surface: "GOOGLE_MAPS_PLACE",
	source: "GOOGLE_MAPS_PLACE",
	datasetVersion: 1,
	capturedAt: "2026-08-31T23:00:00.000Z",
	moduleState: "ACTIVE",
	provenanceState: "LINKED",
};

function assemble(evidence: readonly HorecaEvidenceSource[]) {
	return assembleHorecaLocalFirstReadModel({ tenantId, project, evidence, generatedAt });
}

function visibleText(html: string): string {
	return html
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

describe("HoReCa application evidence assembler", () => {
	it("assembles a tenant-owned project from accepted LINKED evidence and parses the final contract", () => {
		const model = assemble([linkedEvidence]);
		expect(model).not.toBeNull();
		if (!model) return;
		expect(horecaLocalFirstReadModelSchema.parse(model)).toEqual(model);
		expect(model.project).toMatchObject({ displayName: project.name, businessType: "FOOD_HALL", phase: "PRE_OPENING" });
		expect(model.evidence).toHaveLength(1);
		expect(model.evidence[0]).toMatchObject({ id: evidenceId, domain: "MAPS", accessClass: "DERIVED" });
		expect(model.modules.find((module) => module.moduleId === "LOCAL_MAPS")).toMatchObject({
			state: "UNKNOWN",
			evidenceIds: [evidenceId],
			summary: { kind: "UNKNOWN" },
		});
		expect(model).not.toHaveProperty("compositeScore");
	});

	it("fails closed to no accepted model for PARTIAL, UNKNOWN, pending, and malformed evidence", () => {
		for (const row of [
			{ ...linkedEvidence, provenanceState: "PARTIAL" as const },
			{ ...linkedEvidence, provenanceState: "UNKNOWN" as const },
			{ ...linkedEvidence, acceptanceStatus: "UNKNOWN" as const },
			{ ...linkedEvidence, acceptedAt: null },
			{ ...linkedEvidence, acceptedAt: "2026-08-31T22:59:59.000Z" },
			{ ...linkedEvidence, snapshotLinked: false },
			{ ...linkedEvidence, evidenceId: "../../raw/provider-object" },
			{ ...linkedEvidence, capturedAt: "not-a-date" },
		]) {
			expect(assemble([row])).toBeNull();
		}
	});

	it("rejects cross-tenant projects and evidence instead of filtering them into another tenant view", () => {
		expect(() =>
			assembleHorecaLocalFirstReadModel({
				tenantId,
				project: { ...project, organizationId: "tenant-b" },
				evidence: [linkedEvidence],
				generatedAt,
			}),
		).toThrow("project is outside AuthContext tenant");
		expect(() => assemble([{ ...linkedEvidence, organizationId: "tenant-b" }])).toThrow(
			"evidence is outside AuthContext tenant or project",
		);
		expect(() => assemble([{ ...linkedEvidence, projectId: "33333333-3333-4333-8333-333333333333" }])).toThrow(
			"evidence is outside AuthContext tenant or project",
		);
	});

	it("keeps Social and Travel hidden even when linked rows are supplied", () => {
		const model = assemble([
			linkedEvidence,
			{ ...linkedEvidence, evidenceId: "33333333-3333-4333-8333-333333333333", domain: "SOCIAL" },
			{ ...linkedEvidence, evidenceId: "44444444-4444-4444-8444-444444444444", domain: "TRAVEL" },
		]);
		expect(model?.evidence.map((item) => item.id)).toEqual([evidenceId]);
		expect(model?.modules.find((module) => module.moduleId === "SOCIAL")?.state).toBe("HIDDEN");
		expect(model?.modules.find((module) => module.moduleId === "TRAVEL")?.state).toBe("HIDDEN");
		expect(assemble([{ ...linkedEvidence, domain: "SOCIAL" }])).toBeNull();
	});

	it("keeps accepted WEBSITE and MENU rows as evidence-only records without inventing a module measurement", () => {
		const model = assemble([
			{ ...linkedEvidence, domain: "WEBSITE", source: "WEBSITE_COLLECTOR", surface: "PUBLIC_WEBSITE" },
			{
				...linkedEvidence,
				evidenceId: "33333333-3333-4333-8333-333333333333",
				domain: "MENU",
				source: "MENU_UPLOAD",
				surface: "MENU",
			},
		]);
		expect(model?.evidence.map((item) => item.domain)).toEqual(["WEBSITE", "MENU"]);
		expect(model?.modules.every((module) => module.evidenceIds.length === 0)).toBe(true);
	});

	it("derives project phase only from confirmed persisted prelaunch state", () => {
		expect(
			horecaProjectPhaseFromPersistedState("DRAFT", [{ confirmationStatus: "CLIENT_CONFIRMED", prelaunch: true }]),
		).toBe("PRE_OPENING");
		expect(
			horecaProjectPhaseFromPersistedState("ACTIVE", [{ confirmationStatus: "ANALYST_CONFIRMED", prelaunch: false }]),
		).toBe("ACTIVE");
		expect(horecaProjectPhaseFromPersistedState("DRAFT", [])).toBe("UNKNOWN");
		expect(horecaProjectPhaseFromPersistedState("ACTIVE", [{ confirmationStatus: "PROPOSED", prelaunch: true }])).toBe(
			"UNKNOWN",
		);
		expect(
			horecaProjectPhaseFromPersistedState("ACTIVE", [
				{ confirmationStatus: "CLIENT_CONFIRMED", prelaunch: true },
				{ confirmationStatus: "ANALYST_CONFIRMED", prelaunch: false },
			]),
		).toBe("UNKNOWN");
	});

	it("uses the explicitly labelled source-only preview only when no accepted model exists", () => {
		expect(assemble([])).toBeNull();
		expect(() =>
			assembleHorecaLocalFirstReadModel({
				tenantId,
				project: { ...project, category: "UNKNOWN" },
				evidence: [linkedEvidence],
				generatedAt,
			}),
		).toThrow("HORECA_PROJECT_BUSINESS_TYPE_REQUIRED");
		const preview = buildHorecaLocalFirstPreview(false, generatedAt);
		expect(preview.project.displayName).toBe("Source-only preview");
		expect(preview.evidence).toEqual([]);
		const previewHtml = renderToStaticMarkup(SelenaHorecaLocalFirst({ locale: "en", model: preview }));
		const previewText = visibleText(previewHtml);
		expect(previewHtml).toContain("SOURCE-ONLY PREVIEW");
		expect(previewText).toContain("Visibility coverage Not measured");
		expect(previewText).not.toContain("Visibility coverage 0");
	});

	it("returns only normalized, non-downloadable evidence detail keyed by evidenceId", () => {
		const injected = {
			...linkedEvidence,
			rawReference: "s3://private/raw-object",
			providerDatasetRef: "gd_private",
			contentSha256: "sha256:private",
			objectKey: "private/key",
			sourceSnapshotId: "55555555-5555-4555-8555-555555555555",
		};
		const detail = resolveHorecaEvidenceDetail({
			tenantId,
			projectId,
			evidenceId,
			evidence: [injected],
		});
		expect(detail).toEqual({
			evidenceId,
			domain: "MAPS",
			sourceLabel: "Google Maps place evidence",
			surfaceLabel: "GOOGLE_MAPS_PLACE",
			datasetVersion: 1,
			capturedAt: linkedEvidence.capturedAt,
			accessClass: "DERIVED",
			reference: `evidence:${evidenceId}`,
			snapshotReference: `snapshot:evidence:${evidenceId}`,
			sourceUrl: null,
			downloadable: false,
		});
		for (const forbidden of [
			"rawReference",
			"providerDatasetRef",
			"contentSha256",
			"objectKey",
			"sourceSnapshotId",
			"secret",
		]) {
			expect(detail).not.toHaveProperty(forbidden);
		}
		expect(() => horecaEvidenceDetailSchema.parse({ ...detail, reference: "../../private/raw" })).toThrow();
		expect(() => horecaEvidenceDetailSchema.parse({ ...detail, sourceUrl: "javascript:alert(1)" })).toThrow();
		expect(
			resolveHorecaEvidenceDetail({ tenantId, projectId, evidenceId: "not-a-reference", evidence: [injected] }),
		).toBeNull();

		const model = assemble([linkedEvidence]);
		if (!model || !detail) throw new Error("valid HoReCa fixture did not assemble");
		const html = renderToStaticMarkup(
			SelenaHorecaLocalFirst({
				locale: "en",
				model,
				sourceOnlyPreview: false,
				evidenceDetail: detail,
				evidenceDetailHref: (id) => `/app/selena-horeca?evidence=${id}`,
			}),
		);
		expect(html).toContain("READ-ONLY EVIDENCE");
		expect(html).toContain("Normalized detail only");
		expect(html).toContain(`evidence:${evidenceId}`);
		expect(html).not.toContain("s3://private/raw-object");
		expect(html).not.toContain("gd_private");
	});
});
