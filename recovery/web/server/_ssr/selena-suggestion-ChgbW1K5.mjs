//#region node_modules/.nitro/vite/services/ssr/assets/selena-suggestion-ChgbW1K5.js
/**
* Shared by the suggestion server function and the workspace UI that describes
* it, so the promise on screen and the request sent cannot drift apart.
*
* Kept out of the server module on purpose: importing a plain value from there
* would pull its database imports into the client bundle.
*/
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c430e1c9-f218-4258-a311-6f1dffd2a77c", e._sentryDebugIdIdentifier = "sentry-dbid-c430e1c9-f218-4258-a311-6f1dffd2a77c");
	} catch (e) {}
})();
var SUGGESTION_LIMITS = {
	competitors: 8,
	questions: 12
};
/**
* The research call returns question text with no language field, so the
* script decides: Cyrillic is Russian, anything else belongs to the language
* the project was created in. The prefix is what the profile form parses back.
*/
function questionLanguagePrefix(question, projectLanguage) {
	if (/[Ѐ-ӿ]/.test(question)) return "RU";
	return (projectLanguage ?? "en").toUpperCase();
}
//#endregion
export { questionLanguagePrefix as n, SUGGESTION_LIMITS as t };

//# sourceMappingURL=selena-suggestion-ChgbW1K5.mjs.map