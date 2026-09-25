import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { L as horecaLocalFirstReadModelSchema, M as customerVisibleHorecaModules } from "./src-BdeAuGX5.mjs";
import { d as and, f as eq, u as desc } from "../_libs/drizzle-orm.mjs";
import { D as svEvidenceReadModel } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { r as listProjectReportDocuments } from "./selena-report-library-DaJj8lm0.mjs";
import { a as horecaProjectPhaseFromPersistedState, r as assembleHorecaLocalFirstReadModel, s as resolveHorecaEvidenceDetail } from "./selena-horeca-local-first-BejoPszS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-evidence-read-models-BerEBdgi.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c8056a5b-eadf-4c04-bc82-e5da8c9134aa", e._sentryDebugIdIdentifier = "sentry-dbid-c8056a5b-eadf-4c04-bc82-e5da8c9134aa");
	} catch (e) {}
})();
function customerModuleState(capabilityStatus) {
	switch (capabilityStatus) {
		case "CONFIGURED_ONLY":
		case "CANARY_ONLY": return "LOCKED";
		case "PILOT_ONLY": return "PILOT";
		case "ALLOWED": return "ACTIVE";
		case "BLOCKED": return "BLOCKED";
		default: return "UNKNOWN";
	}
}
function toEvidenceReadModel(row, scope) {
	if (row.organizationId !== scope.tenantId || row.projectId !== scope.projectId) throw new Error("Not found: evidence is outside AuthContext tenant or project");
	const hasSnapshot = row.sourceSnapshotId !== null;
	const compatibleDomain = row.capabilityDomain === row.domainId || row.capabilityDomain === "ENTITY" && (row.domainId === "LOCAL" || row.domainId === "LOCAL_MAPS");
	const hasVersionedCapability = hasSnapshot && row.capabilityId !== null && row.sourceType === row.source && row.source !== null && row.surface !== null && compatibleDomain && row.inputSchemaVersion !== null && row.inputSchemaVersion === row.capabilityInputSchemaVersion && row.outputSchemaVersion !== null && row.outputSchemaVersion === row.capabilityOutputSchemaVersion;
	const acceptedAtMs = row.acceptedAt?.getTime();
	const accepted = row.acceptanceStatus === "ACCEPTED" && typeof acceptedAtMs === "number" && Number.isFinite(acceptedAtMs) && acceptedAtMs >= row.evidenceCapturedAt.getTime();
	return {
		evidenceId: row.evidenceId,
		domain: row.domainId,
		surface: row.surface,
		source: row.source,
		datasetVersion: row.datasetVersion,
		capturedAt: row.evidenceCapturedAt.toISOString(),
		moduleState: customerModuleState(row.capabilityStatus),
		provenanceState: hasVersionedCapability ? "LINKED" : hasSnapshot ? "PARTIAL" : "UNKNOWN",
		acceptanceStatus: accepted ? "ACCEPTED" : "UNKNOWN",
		acceptedAt: accepted ? row.acceptedAt?.toISOString() ?? null : null
	};
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/selena-horeca-BM8SpFNE.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "bee4d483-0349-472f-ae64-1c01e264f610", e._sentryDebugIdIdentifier = "sentry-dbid-bee4d483-0349-472f-ae64-1c01e264f610");
	} catch (e) {}
})();
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
var MAX_HORECA_EVIDENCE_ROWS = 250;
var horecaWorkspaceInputSchema = object({
	projectId: string().uuid().optional(),
	evidenceId: string().uuid().optional()
});
function toHorecaApplicationEvidence(row, scope) {
	return {
		...toEvidenceReadModel(row, scope),
		organizationId: row.organizationId,
		projectId: row.projectId,
		snapshotLinked: row.sourceSnapshotId !== null
	};
}
function toCustomerHorecaWorkspaceModel(model) {
	return horecaLocalFirstReadModelSchema.parse({
		...model,
		modules: customerVisibleHorecaModules(model.modules)
	});
}
async function readApplicationEvidence(tenantId, projectId) {
	const rows = await withOrganizationTransaction(db, tenantId, (tx) => tx.select({
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
		evidenceCapturedAt: svEvidenceReadModel.evidenceCapturedAt
	}).from(svEvidenceReadModel).where(and(eq(svEvidenceReadModel.organizationId, tenantId), eq(svEvidenceReadModel.projectId, projectId))).orderBy(desc(svEvidenceReadModel.evidenceCapturedAt), desc(svEvidenceReadModel.evidenceId)).limit(251));
	if (rows.length > MAX_HORECA_EVIDENCE_ROWS) throw new Error("HORECA_EVIDENCE_WINDOW_EXCEEDED");
	return rows.map((row) => toHorecaApplicationEvidence(row, {
		tenantId,
		projectId
	}));
}
var getSelenaHorecaWorkspaceFn_createServerFn_handler = createServerRpc({
	id: "af09ab5503c54f30fec502474e552f2d0a6fd01e7669ce31739ec3a5697e4bba",
	name: "getSelenaHorecaWorkspaceFn",
	filename: "src/server/selena-horeca.ts"
}, (opts) => getSelenaHorecaWorkspaceFn.__executeServer(opts));
var getSelenaHorecaWorkspaceFn = createServerFn({ method: "GET" }).validator(horecaWorkspaceInputSchema).handler(getSelenaHorecaWorkspaceFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	const projects = await repositories.projects.list(context);
	const project = data.projectId ? projects.find((candidate) => candidate.id === data.projectId) : projects[0];
	if (data.projectId && !project) throw new Error("Not found: project is outside AuthContext tenant");
	if (!project) return {
		projects: [],
		reportDocuments: [],
		selectedProjectId: null,
		model: null,
		evidenceDetail: null,
		fallbackReason: "NO_PROJECT"
	};
	const [evidence, entities] = await Promise.all([readApplicationEvidence(context.tenantId, project.id), repositories.entities.list(context, project.id)]);
	const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
	const model = assembleHorecaLocalFirstReadModel({
		tenantId: context.tenantId,
		project: {
			id: project.id,
			organizationId: project.organizationId,
			name: project.name,
			category: project.category,
			phase: horecaProjectPhaseFromPersistedState(project.status, entities)
		},
		evidence,
		generatedAt
	});
	const evidenceDetail = model && data.evidenceId ? resolveHorecaEvidenceDetail({
		tenantId: context.tenantId,
		projectId: project.id,
		evidenceId: data.evidenceId,
		evidence
	}) : null;
	return {
		projects: projects.map((item) => ({
			id: item.id,
			name: item.name
		})),
		reportDocuments: listProjectReportDocuments(context, project.id),
		selectedProjectId: project.id,
		model: model ? toCustomerHorecaWorkspaceModel(model) : null,
		evidenceDetail,
		fallbackReason: model ? null : "NO_ACCEPTED_LINKED_DATA"
	};
});
//#endregion
export { getSelenaHorecaWorkspaceFn_createServerFn_handler };

//# sourceMappingURL=selena-horeca-BM8SpFNE.mjs.map