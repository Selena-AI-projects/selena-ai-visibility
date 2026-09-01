import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svEvidenceReadModel } from "@workspace/lib/db/schema";
import { type EvidenceProjection, toEvidenceReadModel } from "@workspace/lib/selena-evidence-read-models";
import { createSelenaRepositories } from "@workspace/lib/selena-visibility-repositories";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
	assembleHorecaLocalFirstReadModel,
	horecaProjectPhaseFromPersistedState,
	resolveHorecaEvidenceDetail,
} from "@/lib/selena-horeca-local-first";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";

const repositories = /* @__PURE__ */ createSelenaRepositories(db);
const MAX_HORECA_EVIDENCE_ROWS = 250;

const horecaWorkspaceInputSchema = z.object({
	projectId: z.string().uuid().optional(),
	evidenceId: z.string().uuid().optional(),
});

export function toHorecaApplicationEvidence(row: EvidenceProjection, scope: { tenantId: string; projectId: string }) {
	return {
		...toEvidenceReadModel(row, scope),
		organizationId: row.organizationId,
		projectId: row.projectId,
		snapshotLinked: row.sourceSnapshotId !== null,
	};
}

async function readApplicationEvidence(tenantId: string, projectId: string) {
	const rows = await withOrganizationTransaction(db, tenantId, (tx) =>
		tx
			.select({
				organizationId: svEvidenceReadModel.organizationId,
				projectId: svEvidenceReadModel.projectId,
				evidenceId: svEvidenceReadModel.evidenceId,
				domainId: svEvidenceReadModel.domainId,
				datasetVersion: svEvidenceReadModel.datasetVersion,
				sourceSnapshotId: svEvidenceReadModel.sourceSnapshotId,
				capabilityId: svEvidenceReadModel.capabilityId,
				sourceType: svEvidenceReadModel.sourceType,
				source: svEvidenceReadModel.source,
				surface: svEvidenceReadModel.surface,
				capabilityDomain: svEvidenceReadModel.capabilityDomain,
				capabilityStatus: svEvidenceReadModel.capabilityStatus,
				inputSchemaVersion: svEvidenceReadModel.inputSchemaVersion,
				outputSchemaVersion: svEvidenceReadModel.outputSchemaVersion,
				capabilityInputSchemaVersion: svEvidenceReadModel.capabilityInputSchemaVersion,
				capabilityOutputSchemaVersion: svEvidenceReadModel.capabilityOutputSchemaVersion,
				acceptanceStatus: svEvidenceReadModel.acceptanceStatus,
				acceptedAt: svEvidenceReadModel.acceptedAt,
				evidenceCapturedAt: svEvidenceReadModel.evidenceCapturedAt,
			})
			.from(svEvidenceReadModel)
			.where(and(eq(svEvidenceReadModel.organizationId, tenantId), eq(svEvidenceReadModel.projectId, projectId)))
			.orderBy(desc(svEvidenceReadModel.evidenceCapturedAt), desc(svEvidenceReadModel.evidenceId))
			.limit(MAX_HORECA_EVIDENCE_ROWS + 1),
	);
	if (rows.length > MAX_HORECA_EVIDENCE_ROWS) throw new Error("HORECA_EVIDENCE_WINDOW_EXCEEDED");
	return rows.map((row) => toHorecaApplicationEvidence(row, { tenantId, projectId }));
}

export const getSelenaHorecaWorkspaceFn = createServerFn({ method: "GET" })
	.validator(horecaWorkspaceInputSchema)
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		const projects = await repositories.projects.list(context);
		const project = data.projectId ? projects.find((candidate) => candidate.id === data.projectId) : projects[0];
		if (data.projectId && !project) throw new Error("Not found: project is outside AuthContext tenant");
		if (!project) {
			return {
				projects: [],
				selectedProjectId: null,
				model: null,
				evidenceDetail: null,
				fallbackReason: "NO_PROJECT" as const,
			};
		}

		const [evidence, entities] = await Promise.all([
			readApplicationEvidence(context.tenantId, project.id),
			repositories.entities.list(context, project.id),
		]);
		const generatedAt = new Date().toISOString();
		const model = assembleHorecaLocalFirstReadModel({
			tenantId: context.tenantId,
			project: {
				id: project.id,
				organizationId: project.organizationId,
				name: project.name,
				category: project.category,
				phase: horecaProjectPhaseFromPersistedState(project.status, entities),
			},
			evidence,
			generatedAt,
		});
		const evidenceDetail =
			model && data.evidenceId
				? resolveHorecaEvidenceDetail({
						tenantId: context.tenantId,
						projectId: project.id,
						evidenceId: data.evidenceId,
						evidence,
					})
				: null;

		return {
			projects: projects.map((item) => ({ id: item.id, name: item.name })),
			selectedProjectId: project.id,
			model,
			evidenceDetail,
			fallbackReason: model ? null : ("NO_ACCEPTED_LINKED_DATA" as const),
		};
	});
