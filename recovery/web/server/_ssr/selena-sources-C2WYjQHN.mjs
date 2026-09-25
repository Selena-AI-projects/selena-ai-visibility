import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, p as boolean } from "../_libs/zod.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-sources-C2WYjQHN.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f6b98825-fddf-488b-a15c-e7daf7fda3ee", e._sentryDebugIdIdentifier = "sentry-dbid-f6b98825-fddf-488b-a15c-e7daf7fda3ee");
	} catch (e) {}
})();
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
/**
* The Source Opportunity Map (addendum §8) reads the stored snapshots rather
* than recomputing them, so what the customer sees is the aggregation that was
* written when the cycle was analysed, under the formula version stored beside
* it. Recomputing on read would quietly change a number the client already saw.
*/
var getSelenaSourceMapFn_createServerFn_handler = createServerRpc({
	id: "764e60639ea5d4e62d1eb3b022fdfb9d7c0c5a3e7667cb7d96982545b12dfb78",
	name: "getSelenaSourceMapFn",
	filename: "src/server/selena-sources.ts"
}, (opts) => getSelenaSourceMapFn.__executeServer(opts));
var getSelenaSourceMapFn = createServerFn({ method: "GET" }).validator(object({
	projectId: string().uuid(),
	gapsOnly: boolean().optional()
})).handler(getSelenaSourceMapFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	const project = await repositories.projects.get(context, data.projectId);
	if (!project) throw new Error("Project not found");
	const sources = await repositories.citationGaps.listForProject(context, data.projectId, { gapsOnly: data.gapsOnly });
	return {
		project: {
			id: project.id,
			name: project.name
		},
		sources: sources.map((source) => ({
			id: source.id,
			cycleId: source.cycleId,
			domain: source.sourceDomain,
			urls: source.sourceUrls,
			ownedCitationCount: source.ownedCitationCount,
			competitorCitationCount: source.competitorCitationCount,
			competitorNames: source.competitorNames,
			scenarioCount: source.scenarioCount,
			engineCount: source.engineCount,
			repeatStability: source.repeatStability === null ? null : Number(source.repeatStability),
			firstSeen: source.firstSeen?.toISOString() ?? null,
			lastSeen: source.lastSeen?.toISOString() ?? null,
			gapType: source.gapType,
			priorityBand: source.priorityBand,
			formulaVersion: source.formulaVersion,
			evidenceRunIds: source.evidenceRunIds
		}))
	};
});
var listSelenaSourceProjectsFn_createServerFn_handler = createServerRpc({
	id: "d58c98343591a2e7aad06ebb8d9be9b867b92872bda2667247f25bc6b67d000e",
	name: "listSelenaSourceProjectsFn",
	filename: "src/server/selena-sources.ts"
}, (opts) => listSelenaSourceProjectsFn.__executeServer(opts));
var listSelenaSourceProjectsFn = createServerFn({ method: "GET" }).handler(listSelenaSourceProjectsFn_createServerFn_handler, async () => {
	const context = await resolveSessionAuthContext();
	return (await repositories.projects.list(context)).map((project) => ({
		id: project.id,
		name: project.name
	}));
});
//#endregion
export { getSelenaSourceMapFn_createServerFn_handler, listSelenaSourceProjectsFn_createServerFn_handler };

//# sourceMappingURL=selena-sources-C2WYjQHN.mjs.map