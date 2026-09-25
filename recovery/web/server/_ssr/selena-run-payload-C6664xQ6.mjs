//#region node_modules/.nitro/vite/services/ssr/assets/selena-run-payload-C6664xQ6.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0a32c581-be2a-4f7b-991f-2039d48ac950", e._sentryDebugIdIdentifier = "sentry-dbid-0a32c581-be2a-4f7b-991f-2039d48ac950");
	} catch (e) {}
})();
function readAnswer(payload) {
	if (typeof payload !== "object" || payload === null) return { state: "absent" };
	const answer = payload.answer;
	if (typeof answer !== "object" || answer === null) return { state: "absent" };
	const record = answer;
	if (typeof record.text === "string") return {
		state: "present",
		text: record.text
	};
	if (typeof record.textDeletedAt === "string") return {
		state: "deleted",
		deletedAt: record.textDeletedAt
	};
	return { state: "absent" };
}
function readSources(payload) {
	if (typeof payload !== "object" || payload === null) return [];
	const sources = payload.sources;
	if (!Array.isArray(sources)) return [];
	return sources.flatMap((item) => {
		if (typeof item !== "object" || item === null) return [];
		const record = item;
		if (typeof record.url !== "string" || typeof record.domain !== "string") return [];
		return [{
			url: record.url,
			domain: record.domain,
			...typeof record.title === "string" ? { title: record.title } : {}
		}];
	});
}
function readCitations(value) {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (typeof item !== "object" || item === null) return [];
		const record = item;
		return typeof record.url === "string" && typeof record.domain === "string" ? [{
			url: record.url,
			domain: record.domain
		}] : [];
	});
}
//#endregion
export { readCitations as n, readSources as r, readAnswer as t };

//# sourceMappingURL=selena-run-payload-C6664xQ6.mjs.map