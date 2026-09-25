//#region node_modules/.nitro/vite/services/ssr/assets/models-DjvggVKS.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9276189b-7855-4fde-b6d1-ed29c316fbad", e._sentryDebugIdIdentifier = "sentry-dbid-9276189b-7855-4fde-b6d1-ed29c316fbad");
	} catch (e) {}
})();
var KNOWN_MODELS = {
	chatgpt: {
		label: "ChatGPT",
		iconId: "openai"
	},
	claude: {
		label: "Claude",
		iconId: "anthropic"
	},
	"google-ai-mode": {
		label: "Google AI Mode",
		iconId: "google"
	},
	"google-ai-overview": {
		label: "Google AI Overview",
		iconId: "google"
	},
	gemini: {
		label: "Gemini",
		iconId: "google"
	},
	copilot: {
		label: "Copilot",
		iconId: "microsoft"
	},
	perplexity: {
		label: "Perplexity",
		iconId: "perplexity"
	},
	grok: {
		label: "Grok",
		iconId: "x"
	},
	mistral: {
		label: "Mistral",
		iconId: "mistral"
	},
	deepseek: {
		label: "DeepSeek",
		iconId: "deepseek"
	},
	kimi: {
		label: "Kimi",
		iconId: "moonshotai"
	},
	qwen: {
		label: "Qwen",
		iconId: "qwen"
	}
};
function getModelMeta(model) {
	if (KNOWN_MODELS[model]) return KNOWN_MODELS[model];
	return {
		label: model.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
		iconId: "generic"
	};
}
//#endregion
export { getModelMeta as n, KNOWN_MODELS as t };

//# sourceMappingURL=models-DjvggVKS.mjs.map