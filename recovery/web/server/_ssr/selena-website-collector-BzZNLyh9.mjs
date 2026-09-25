import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { c as actionPlanSchema } from "./src-BdeAuGX5.mjs";
import { d as and, f as eq, l as asc } from "../_libs/drizzle-orm.mjs";
import { Et as svWebsiteSnapshots, at as svRecommendationActions, ct as svRecommendationManifests, et as svProjectProfiles, lt as svRecommendationRuns, ot as svRecommendationEvidence, st as svRecommendationFindings, tt as svProjects, ut as svRecommendationTasks } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { n as buildManifest, r as validateGrounding, t as buildActionPlan } from "./recommendation-engine-E4GDgmMi.mjs";
import { r as readStoredGoogleMapsLocation } from "./google-maps-location-Dex-PeaZ.mjs";
import { n as buildWebsiteActionPlan, r as collectWebsite } from "./website-collector-JRCKbLvO.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-website-collector-BzZNLyh9.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "cd166c6b-559a-4ac9-8aee-02ae49415c94", e._sentryDebugIdIdentifier = "sentry-dbid-cd166c6b-559a-4ac9-8aee-02ae49415c94");
	} catch (e) {}
})();
function inputHash(datasetId, evidence, rulepackVersion) {
	return JSON.stringify({
		datasetId,
		rulepackVersion,
		evidence: evidence.map(({ id, tenantId, snapshotId, sourceRef, capturedAt, subject, text, metadata }) => ({
			id,
			tenantId,
			snapshotId,
			sourceRef,
			capturedAt,
			subject,
			text,
			metadata
		}))
	});
}
function writeGuard(ctx) {
	if (ctx.role === "viewer") throw new Error("RECOMMENDATION_WRITE_FORBIDDEN");
}
function createRecommendationRepositories(db) {
	const assertProject = async (tx, ctx, projectId) => {
		const [project] = await tx.select({ id: svProjects.id }).from(svProjects).where(and(eq(svProjects.id, projectId), eq(svProjects.organizationId, ctx.tenantId))).limit(1);
		if (!project) throw new Error("RECOMMENDATION_PROJECT_NOT_FOUND");
	};
	const getRun = async (tx, ctx, runId) => {
		const [run] = await tx.select().from(svRecommendationRuns).where(and(eq(svRecommendationRuns.id, runId), eq(svRecommendationRuns.organizationId, ctx.tenantId))).limit(1);
		if (!run) throw new Error("RECOMMENDATION_RUN_NOT_FOUND");
		return run;
	};
	return {
		create: async (ctx, input) => {
			writeGuard(ctx);
			const version = input.rulepackVersion ?? "ai-website-v1";
			if (input.evidence.some((item) => item.tenantId !== ctx.tenantId)) throw new Error("RECOMMENDATION_CROSS_TENANT_EVIDENCE");
			const hash = inputHash(input.datasetId, input.evidence, version);
			const manifest = input.manifest ?? buildManifest(ctx.tenantId, input.datasetId, input.evidence, version);
			if (manifest.tenantId !== ctx.tenantId || manifest.datasetId !== input.datasetId || manifest.evidenceIds.length !== input.evidence.length) throw new Error("RECOMMENDATION_MANIFEST_INPUT_MISMATCH");
			const plan = actionPlanSchema.parse(input.actionPlan ?? buildActionPlan(ctx.tenantId, manifest, input.evidence));
			if (plan.tenantId !== ctx.tenantId || plan.manifestId !== manifest.id) throw new Error("RECOMMENDATION_MANIFEST_MISMATCH");
			const groundingErrors = validateGrounding(plan, input.evidence);
			if (groundingErrors.length) throw new Error(`RECOMMENDATION_GROUNDING_FAILED:${groundingErrors.join(",")}`);
			return withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
				await assertProject(tx, ctx, input.projectId);
				const [existing] = await tx.select().from(svRecommendationRuns).where(and(eq(svRecommendationRuns.organizationId, ctx.tenantId), eq(svRecommendationRuns.idempotencyKey, input.idempotencyKey))).limit(1);
				if (existing) {
					if (existing.inputHash !== hash) throw new Error("RECOMMENDATION_IMMUTABLE_INPUT_MISMATCH");
					return existing;
				}
				const [run] = await tx.insert(svRecommendationRuns).values({
					organizationId: ctx.tenantId,
					projectId: input.projectId,
					idempotencyKey: input.idempotencyKey,
					datasetId: input.datasetId,
					inputHash: hash,
					rulepackVersion: version,
					status: "READY",
					groundingStatus: "PASS",
					actionPlan: plan,
					createdBy: ctx.actorId,
					completedAt: /* @__PURE__ */ new Date()
				}).returning();
				await tx.insert(svRecommendationManifests).values({
					id: manifest.id,
					runId: run.id,
					organizationId: ctx.tenantId,
					datasetId: manifest.datasetId,
					inputHash: hash,
					snapshotIds: manifest.snapshotIds,
					evidenceIds: manifest.evidenceIds,
					rulepackVersion: manifest.rulepackVersion
				});
				if (input.evidence.length) await tx.insert(svRecommendationEvidence).values(input.evidence.map((item) => ({
					...item,
					runId: run.id,
					organizationId: ctx.tenantId,
					metadata: item.metadata
				})));
				if (plan.findings.length) await tx.insert(svRecommendationFindings).values(plan.findings.map((item) => ({
					id: item.id,
					organizationId: ctx.tenantId,
					runId: run.id,
					category: item.category,
					statement: item.statement,
					evidenceIds: item.evidenceIds,
					confidence: item.confidence,
					confidenceScore: String(item.confidenceScore),
					severity: item.severity,
					unknown: item.unknown,
					ruleId: item.ruleId
				})));
				if (plan.recommendations.length) await tx.insert(svRecommendationActions).values(plan.recommendations.map((item) => ({
					id: item.id,
					organizationId: ctx.tenantId,
					runId: run.id,
					findingId: item.findingId,
					title: item.title,
					action: item.action,
					rationale: item.rationale,
					evidenceIds: item.evidenceIds,
					priority: item.priority,
					effort: item.effort,
					confidence: item.confidence,
					blocked: item.blocked,
					blockReason: item.blockReason
				})));
				if (plan.tasks.length) await tx.insert(svRecommendationTasks).values(plan.tasks.map((item) => ({
					id: item.id,
					organizationId: ctx.tenantId,
					runId: run.id,
					recommendationId: item.recommendationId,
					title: item.title,
					horizon: item.horizon,
					owner: item.owner,
					steps: item.steps,
					evidenceIds: item.evidenceIds,
					verificationPlan: item.verificationPlan
				})));
				return run;
			});
		},
		status: (ctx, runId) => withOrganizationTransaction(db, ctx.tenantId, (tx) => getRun(tx, ctx, runId)),
		findings: (ctx, runId) => withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
			await getRun(tx, ctx, runId);
			return tx.select().from(svRecommendationFindings).where(and(eq(svRecommendationFindings.runId, runId), eq(svRecommendationFindings.organizationId, ctx.tenantId))).orderBy(asc(svRecommendationFindings.id));
		}),
		recommendations: (ctx, runId) => withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
			await getRun(tx, ctx, runId);
			return tx.select().from(svRecommendationActions).where(and(eq(svRecommendationActions.runId, runId), eq(svRecommendationActions.organizationId, ctx.tenantId))).orderBy(asc(svRecommendationActions.id));
		}),
		actionPlan: (ctx, runId) => withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
			return (await getRun(tx, ctx, runId)).actionPlan ?? {};
		})
	};
}
var recommendationRepositories = /* @__PURE__ */ createRecommendationRepositories(db);
var collectSelenaWebsiteFn_createServerFn_handler = createServerRpc({
	id: "2e23353b5d22ea5821a70811e083e4e964ca57aabe94300278bb2fdda456e0f4",
	name: "collectSelenaWebsiteFn",
	filename: "src/server/selena-website-collector.ts"
}, (opts) => collectSelenaWebsiteFn.__executeServer(opts));
var collectSelenaWebsiteFn = createServerFn({ method: "POST" }).validator(object({ projectId: string().uuid() })).handler(collectSelenaWebsiteFn_createServerFn_handler, async ({ data }) => {
	const auth = await resolveSessionAuthContext();
	const [profile] = await withOrganizationTransaction(db, auth.tenantId, (tx) => tx.select({
		primaryDomain: svProjectProfiles.primaryDomain,
		mapsLocation: svProjectProfiles.mapsLocation
	}).from(svProjectProfiles).where(and(eq(svProjectProfiles.projectId, data.projectId), eq(svProjectProfiles.organizationId, auth.tenantId))).limit(1));
	if (!profile) throw new Error("Website collection requires a confirmed project profile");
	const collection = await collectWebsite(auth.tenantId, profile.primaryDomain);
	const actionPlan = buildWebsiteActionPlan(collection, { mapsLocation: readStoredGoogleMapsLocation(profile.mapsLocation) });
	const [stored] = await withOrganizationTransaction(db, auth.tenantId, (tx) => tx.insert(svWebsiteSnapshots).values({
		id: collection.snapshot.id,
		organizationId: auth.tenantId,
		projectId: data.projectId,
		website: collection.snapshot.url,
		contentHash: collection.snapshot.contentHash,
		capturedAt: new Date(collection.snapshot.capturedAt),
		snapshot: collection.snapshot,
		immutable: true
	}).onConflictDoNothing({ target: [svWebsiteSnapshots.projectId, svWebsiteSnapshots.contentHash] }).returning());
	const run = await recommendationRepositories.create(auth, {
		projectId: data.projectId,
		datasetId: collection.snapshot.id,
		idempotencyKey: `website:${collection.snapshot.id}`,
		evidence: collection.evidence,
		rulepackVersion: collection.manifest.rulepackVersion,
		actionPlan,
		manifest: collection.manifest
	});
	return {
		snapshot: {
			id: stored?.id ?? collection.snapshot.id,
			url: stored?.website ?? collection.snapshot.url,
			contentHash: stored?.contentHash ?? collection.snapshot.contentHash,
			capturedAt: (stored?.capturedAt ?? new Date(collection.snapshot.capturedAt)).toISOString(),
			immutable: true
		},
		manifest: collection.manifest,
		recommendationRunId: run.id,
		evidenceCount: collection.evidence.length,
		actionPlan
	};
});
//#endregion
export { collectSelenaWebsiteFn_createServerFn_handler };

//# sourceMappingURL=selena-website-collector-BzZNLyh9.mjs.map