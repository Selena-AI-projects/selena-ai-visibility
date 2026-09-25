import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { c as actionPlanSchema, kt as projectCreateSchema } from "./src-BdeAuGX5.mjs";
import { d as and, f as eq, u as desc } from "../_libs/drizzle-orm.mjs";
import { Et as svWebsiteSnapshots, Z as svOrders, et as svProjectProfiles, lt as svRecommendationRuns, w as svCycles } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { r as readStoredGoogleMapsLocation } from "./google-maps-location-Dex-PeaZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-client-DT8iwg1H.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "e4002b11-2ec7-42a8-aae7-b522e76300ee", e._sentryDebugIdIdentifier = "sentry-dbid-e4002b11-2ec7-42a8-aae7-b522e76300ee");
	} catch (e) {}
})();
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
var PRIORITY_ORDER = [
	"NOW",
	"NEXT",
	"LATER"
];
function priorityRank(priority) {
	const index = PRIORITY_ORDER.indexOf(priority);
	return index === -1 ? PRIORITY_ORDER.length : index;
}
var listSelenaProjectsFn_createServerFn_handler = createServerRpc({
	id: "bb2dc0f2e379de57cead5731dfd375b5f344e086036dc88426cdb54f886fbd16",
	name: "listSelenaProjectsFn",
	filename: "src/server/selena-client.ts"
}, (opts) => listSelenaProjectsFn.__executeServer(opts));
var listSelenaProjectsFn = createServerFn({ method: "GET" }).handler(listSelenaProjectsFn_createServerFn_handler, async () => {
	const context = await resolveSessionAuthContext();
	return repositories.projects.list(context);
});
var getSelenaWorkspaceFn_createServerFn_handler = createServerRpc({
	id: "0b0306174603c17d7ba37f6b71132621c504573e95969a545b723125722b59e2",
	name: "getSelenaWorkspaceFn",
	filename: "src/server/selena-client.ts"
}, (opts) => getSelenaWorkspaceFn.__executeServer(opts));
var getSelenaWorkspaceFn = createServerFn({ method: "GET" }).handler(getSelenaWorkspaceFn_createServerFn_handler, async () => {
	const context = await resolveSessionAuthContext();
	const projects = await repositories.projects.list(context);
	return { projects: await Promise.all(projects.map(async (project) => {
		const [profile, website, cycle, recommendationRun] = await withOrganizationTransaction(db, context.tenantId, (tx) => Promise.all([
			tx.select().from(svProjectProfiles).where(and(eq(svProjectProfiles.projectId, project.id), eq(svProjectProfiles.organizationId, context.tenantId))).limit(1).then((rows) => rows[0] ?? null),
			tx.select({
				website: svWebsiteSnapshots.website,
				capturedAt: svWebsiteSnapshots.capturedAt
			}).from(svWebsiteSnapshots).where(and(eq(svWebsiteSnapshots.projectId, project.id), eq(svWebsiteSnapshots.organizationId, context.tenantId))).orderBy(desc(svWebsiteSnapshots.capturedAt)).limit(1).then((rows) => rows[0] ?? null),
			tx.select({
				id: svCycles.id,
				status: svCycles.status,
				expectedRuns: svCycles.expectedRuns,
				completedRuns: svCycles.completedRuns,
				createdAt: svCycles.createdAt,
				updatedAt: svCycles.updatedAt
			}).from(svCycles).innerJoin(svOrders, eq(svCycles.orderId, svOrders.id)).where(and(eq(svOrders.projectId, project.id), eq(svOrders.organizationId, context.tenantId), eq(svCycles.organizationId, context.tenantId))).orderBy(desc(svCycles.createdAt)).limit(1).then((rows) => rows[0] ?? null),
			tx.select({
				id: svRecommendationRuns.id,
				status: svRecommendationRuns.status,
				groundingStatus: svRecommendationRuns.groundingStatus,
				actionPlan: svRecommendationRuns.actionPlan,
				createdAt: svRecommendationRuns.createdAt
			}).from(svRecommendationRuns).where(and(eq(svRecommendationRuns.projectId, project.id), eq(svRecommendationRuns.organizationId, context.tenantId))).orderBy(desc(svRecommendationRuns.createdAt)).limit(1).then((rows) => rows[0] ?? null)
		]));
		const parsedPlan = actionPlanSchema.safeParse(recommendationRun?.actionPlan);
		const actionPlan = parsedPlan.success ? parsedPlan.data : null;
		return {
			project: {
				id: project.id,
				name: project.name,
				category: project.category,
				country: project.country,
				region: project.region,
				languages: project.languages,
				status: project.status,
				createdAt: project.createdAt.toISOString()
			},
			profile: profile ? {
				brandName: profile.brandName,
				primaryDomain: profile.primaryDomain,
				publicProfiles: Array.isArray(profile.publicProfiles) ? profile.publicProfiles : [],
				mapsLocation: readStoredGoogleMapsLocation(profile.mapsLocation),
				competitors: Array.isArray(profile.competitorSnapshot) ? profile.competitorSnapshot : [],
				scenarios: Array.isArray(profile.scenarioSnapshot) ? profile.scenarioSnapshot : [],
				confirmedAt: profile.confirmedAt?.toISOString() ?? null
			} : null,
			website: website ? {
				website: website.website,
				capturedAt: website.capturedAt.toISOString()
			} : null,
			measurement: cycle ? {
				id: cycle.id,
				status: cycle.status,
				expectedRuns: cycle.expectedRuns,
				completedRuns: cycle.completedRuns,
				createdAt: cycle.createdAt.toISOString(),
				updatedAt: cycle.updatedAt.toISOString()
			} : null,
			recommendation: recommendationRun ? {
				id: recommendationRun.id,
				status: recommendationRun.status,
				groundingStatus: recommendationRun.groundingStatus,
				createdAt: recommendationRun.createdAt.toISOString(),
				findingsCount: actionPlan?.findings.length ?? 0,
				recommendationsCount: actionPlan?.recommendations.length ?? 0,
				tasksCount: actionPlan?.tasks.length ?? 0,
				topActions: actionPlan?.recommendations.filter((item) => !item.blocked).sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority)).slice(0, 3).map((item) => ({
					ruleId: actionPlan.findings.find((finding) => finding.id === item.findingId)?.ruleId ?? "",
					title: item.title,
					action: item.action,
					priority: item.priority
				})) ?? []
			} : null
		};
	})) };
});
var createSelenaProjectFn_createServerFn_handler = createServerRpc({
	id: "a0730865ed85f3cec94c1c993df36a118c61d3e45a54a3df6d046de3470d8b8e",
	name: "createSelenaProjectFn",
	filename: "src/server/selena-client.ts"
}, (opts) => createSelenaProjectFn.__executeServer(opts));
var createSelenaProjectFn = createServerFn({ method: "POST" }).validator(projectCreateSchema).handler(createSelenaProjectFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	return repositories.projects.create(context, {
		...data,
		status: "DRAFT"
	});
});
var getSelenaProjectFn_createServerFn_handler = createServerRpc({
	id: "e912e78f16389da6082058523972fff9773584da5ff8849c9dd0d1a68d8df6bb",
	name: "getSelenaProjectFn",
	filename: "src/server/selena-client.ts"
}, (opts) => getSelenaProjectFn.__executeServer(opts));
var getSelenaProjectFn = createServerFn({ method: "GET" }).validator(object({ projectId: string().uuid() })).handler(getSelenaProjectFn_createServerFn_handler, async ({ data }) => repositories.projects.get(await resolveSessionAuthContext(), data.projectId));
//#endregion
export { createSelenaProjectFn_createServerFn_handler, getSelenaProjectFn_createServerFn_handler, getSelenaWorkspaceFn_createServerFn_handler, listSelenaProjectsFn_createServerFn_handler };

//# sourceMappingURL=selena-client-DT8iwg1H.mjs.map