import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as Sparkles } from "../_libs/lucide-react.mjs";
import { a as SiGithubcopilot, c as SiMoonshotai, d as SiX, f as RiOpenaiFill, i as SiDeepseek, l as SiPerplexity, o as SiGoogle, r as SiAnthropic, s as SiMistralai, u as SiQwen } from "../_libs/react-icons.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/model-icon-CXwDenx1.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "61f53073-b3e2-4ee9-8745-972bb4cf8984", e._sentryDebugIdIdentifier = "sentry-dbid-61f53073-b3e2-4ee9-8745-972bb4cf8984");
	} catch (e) {}
})();
/**
* Logos for the AI platforms Elmo tracks.
*
* Shared so the product and the marketing site show the same mark for the same
* platform. Which logo a model uses is decided by `iconId` in
* @workspace/config/models; this only turns that into an icon, falling back to a
* neutral glyph for anything without a brand mark.
*/
/**
* Keyed by `iconId`, which is an arbitrary string from the model catalog — a
* model with no brand mark simply has no entry here and falls back below.
*/
var ICONS = {
	openai: RiOpenaiFill,
	anthropic: SiAnthropic,
	google: SiGoogle,
	microsoft: SiGithubcopilot,
	perplexity: SiPerplexity,
	x: SiX,
	mistral: SiMistralai,
	deepseek: SiDeepseek,
	moonshotai: SiMoonshotai,
	qwen: SiQwen
};
function ModelIcon({ iconId, className = "size-3.5" }) {
	const Icon = ICONS[iconId];
	if (!Icon) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className });
}
//#endregion
export { ModelIcon as t };

//# sourceMappingURL=model-icon-CXwDenx1.mjs.map