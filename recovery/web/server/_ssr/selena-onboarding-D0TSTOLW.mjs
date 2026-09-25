import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, f as array } from "../_libs/zod.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as assertSuggestSpendAllowed } from "./providers-kvP4SquB.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { n as enqueueAnalyzeBrand, r as getAnalyzeBrandStatus, t as cancelAnalyzeBrand } from "./analyze-brand-job-1M9hMG7P.mjs";
import { r as resolveSessionAuthContext } from "./selena-auth-context-CV5LISuV.mjs";
import { r as createSelenaRepositories } from "./selena-visibility-repositories-DjKDsg4F.mjs";
import { n as parseGoogleMapsLocation } from "./google-maps-location-Dex-PeaZ.mjs";
import { n as assertProviderSpendReserved } from "./selena-provider-spend-D3mI8icY.mjs";
import { n as questionLanguagePrefix, t as SUGGESTION_LIMITS } from "./selena-suggestion-ChgbW1K5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-onboarding-D0TSTOLW.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f8fd9d58-779d-4208-bb4c-6f6352e5a1e8", e._sentryDebugIdIdentifier = "sentry-dbid-f8fd9d58-779d-4208-bb4c-6f6352e5a1e8");
	} catch (e) {}
})();
/**
* What the onboarding suggestion is allowed to spend.
*
* The deployment-wide ceiling could not be enforced by a tenant-scoped count
* followed by an enqueue — concurrent requests race, and a per-tenant count
* silently weakens a global limit — so this path stayed closed. It now rides on
* one atomic reservation that owns the cap, and the cap lives in the database
* rather than in this process's environment.
*/
var SUGGEST_SPEND_SCOPE = "suggest";
/**
* Deliberately coarse, like usage/cost.ts: what one profile suggestion is
* booked at until real invoices retune it. The ledger row says estimated.
*/
var SUGGEST_ESTIMATED_COST_USD = .05;
/**
* Holds budget before the model is called. Throws when the scope has no budget
* configured or the ceiling would be crossed, so a refusal stops the work.
*/
async function reserveSuggestSpend(dbc, request, estimatedUsd = SUGGEST_ESTIMATED_COST_USD) {
	return assertProviderSpendReserved(dbc, {
		scope: SUGGEST_SPEND_SCOPE,
		organizationId: request.organizationId,
		requestKey: request.requestKey,
		estimatedUsd
	});
}
var repositories = /* @__PURE__ */ createSelenaRepositories(db);
var profileSchema = object({
	projectId: string().uuid(),
	brandName: string().trim().min(1).max(160),
	primaryDomain: string().trim().min(3).max(255),
	publicProfiles: array(object({
		platform: string().min(1),
		url: string().url()
	})).max(20),
	mapsLocationUrl: string().trim().max(2048).default(""),
	competitorSnapshot: array(object({
		name: string().min(1),
		domains: array(string()).default([])
	})).max(50),
	scenarioSnapshot: array(object({
		text: string().min(1),
		language: string().min(2),
		intentType: string().min(1)
	})).max(100)
});
var confirmSelenaProfileFn_createServerFn_handler = createServerRpc({
	id: "fd1a01f27660f737e20103cf6311b4d89923b2fd0316d7a0e089232ef62df1ef",
	name: "confirmSelenaProfileFn",
	filename: "src/server/selena-onboarding.ts"
}, (opts) => confirmSelenaProfileFn.__executeServer(opts));
var confirmSelenaProfileFn = createServerFn({ method: "POST" }).validator(profileSchema).handler(confirmSelenaProfileFn_createServerFn_handler, async ({ data }) => {
	const context = await resolveSessionAuthContext();
	const mapsLocation = data.mapsLocationUrl ? parseGoogleMapsLocation(data.mapsLocationUrl) : null;
	if (mapsLocation && !mapsLocation.isValid) throw new Error(`Google Maps location: ${mapsLocation.error}`);
	const profile = await repositories.profiles.confirm(context, {
		projectId: data.projectId,
		brandName: data.brandName,
		primaryDomain: data.primaryDomain,
		publicProfiles: data.publicProfiles,
		mapsLocation: mapsLocation ? mapsLocation.location : null,
		competitorSnapshot: data.competitorSnapshot,
		scenarioSnapshot: data.scenarioSnapshot
	});
	return {
		id: profile.id,
		projectId: profile.projectId,
		brandName: profile.brandName,
		primaryDomain: profile.primaryDomain,
		publicProfiles: data.publicProfiles,
		mapsLocation: mapsLocation ? mapsLocation.location : null,
		competitorSnapshot: data.competitorSnapshot,
		scenarioSnapshot: data.scenarioSnapshot,
		confirmedAt: profile.confirmedAt
	};
});
/**
* Suggest competitors and customer questions from the project's own website.
*
* Owners rarely know who they compete with *inside an AI answer* — it is
* routinely a place they have never considered a rival. The research call
* reads the public site and proposes both lists as a starting hypothesis; the
* customer still edits and confirms them, and a paid measurement is what
* replaces the hypothesis with observed fact.
*
* Runs as a background job: this is an LLM + web-search round trip that takes
* about a minute, which a reverse proxy would cut off mid-request.
*/
var suggestionScopeSchema = object({ projectId: string().uuid() });
async function requireProject(projectId) {
	const context = await resolveSessionAuthContext();
	const project = await repositories.projects.get(context, projectId);
	if (!project) throw new Error("Project not found");
	return project;
}
function countryName(code) {
	try {
		return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
	} catch {
		return code;
	}
}
/**
* Free-text place context for the research prompt. The listing name comes
* from the customer's Google Maps link; the area comes from the project,
* because a share link often carries no readable fields at all.
*/
function buildLocationHint(location, project) {
	const parts = [
		location.placeName,
		project.region,
		countryName(project.country)
	].filter((part) => typeof part === "string" && part.trim() !== "");
	const coordinates = location.latitude !== null && location.longitude !== null ? ` (coordinates ${location.latitude}, ${location.longitude})` : "";
	return `${parts.join(", ")}${coordinates}`.trim();
}
var startSelenaProfileSuggestionFn_createServerFn_handler = createServerRpc({
	id: "5d038a85c5a2c4105b813f0890691c22a076e40eecd1e5a0a3204025aa7461fa",
	name: "startSelenaProfileSuggestionFn",
	filename: "src/server/selena-onboarding.ts"
}, (opts) => startSelenaProfileSuggestionFn.__executeServer(opts));
var startSelenaProfileSuggestionFn = createServerFn({ method: "POST" }).validator(suggestionScopeSchema.extend({
	website: string().trim().min(3).max(255),
	mapsLocationUrl: string().trim().max(2048).default("")
})).handler(startSelenaProfileSuggestionFn_createServerFn_handler, async ({ data }) => {
	assertSuggestSpendAllowed();
	const project = await requireProject(data.projectId);
	await reserveSuggestSpend(db, {
		organizationId: project.organizationId,
		requestKey: data.projectId
	});
	let locationHint;
	if (data.mapsLocationUrl) {
		const maps = parseGoogleMapsLocation(data.mapsLocationUrl);
		if (!maps.isValid) throw new Error(`Google Maps location: ${maps.error}`);
		locationHint = buildLocationHint(maps.location, project) || void 0;
	}
	await enqueueAnalyzeBrand({
		product: "selena",
		requestKey: data.projectId,
		website: data.website,
		brandName: project.name,
		locationHint,
		maxCompetitors: SUGGESTION_LIMITS.competitors,
		maxPrompts: SUGGESTION_LIMITS.questions,
		questionStyle: "customer"
	});
	return { ok: true };
});
var getSelenaProfileSuggestionFn_createServerFn_handler = createServerRpc({
	id: "fa370407bdeee6311af2f72e1d6338e70a580305c222baf9147b44df0f700a60",
	name: "getSelenaProfileSuggestionFn",
	filename: "src/server/selena-onboarding.ts"
}, (opts) => getSelenaProfileSuggestionFn.__executeServer(opts));
var getSelenaProfileSuggestionFn = createServerFn({ method: "POST" }).validator(suggestionScopeSchema).handler(getSelenaProfileSuggestionFn_createServerFn_handler, async ({ data }) => {
	const project = await requireProject(data.projectId);
	const status = await getAnalyzeBrandStatus("selena", data.projectId);
	if (status.status !== "done") return status;
	return {
		status: "done",
		competitors: status.suggestion.competitors.map((item) => item.name).join(", "),
		questions: status.suggestion.suggestedPrompts.map((item) => `${questionLanguagePrefix(item.prompt, project.languages[0])}: ${item.prompt}`).join("\n")
	};
});
var cancelSelenaProfileSuggestionFn_createServerFn_handler = createServerRpc({
	id: "2361f0d3ad7f61af6f587a26b733d8158e4aea6af4067178b6b68bb560e901a1",
	name: "cancelSelenaProfileSuggestionFn",
	filename: "src/server/selena-onboarding.ts"
}, (opts) => cancelSelenaProfileSuggestionFn.__executeServer(opts));
var cancelSelenaProfileSuggestionFn = createServerFn({ method: "POST" }).validator(suggestionScopeSchema).handler(cancelSelenaProfileSuggestionFn_createServerFn_handler, async ({ data }) => {
	await requireProject(data.projectId);
	await cancelAnalyzeBrand("selena", data.projectId);
	return { ok: true };
});
//#endregion
export { cancelSelenaProfileSuggestionFn_createServerFn_handler, confirmSelenaProfileFn_createServerFn_handler, getSelenaProfileSuggestionFn_createServerFn_handler, startSelenaProfileSuggestionFn_createServerFn_handler };

//# sourceMappingURL=selena-onboarding-D0TSTOLW.mjs.map