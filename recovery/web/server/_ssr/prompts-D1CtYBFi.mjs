import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { a as trackEvent } from "./posthog-DaElL-hv.mjs";
import { o as updatePromptsFn } from "./prompts-C2FXcuMy.mjs";
import { n as useInvalidatePromptsSummary } from "./use-prompts-summary-DoiBkiz3.mjs";
import { t as PromptsListEditor } from "./prompts-list-editor-Cz1MFmWn.mjs";
import { t as UnsavedChangesBar } from "./unsaved-changes-bar-jcpYpDDB.mjs";
import { t as Route } from "./prompts-BFHGXKWp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prompts-D1CtYBFi.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "dc5eeb06-42b5-4223-8661-f25bf1449031", e._sentryDebugIdIdentifier = "sentry-dbid-dc5eeb06-42b5-4223-8661-f25bf1449031");
	} catch (e) {}
})();
/** Order-insensitive, since the picker appends and the server returns catalog order. */
function sameModels(a, b) {
	return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}
/** Same ordering the route loader asks Postgres for, so the list a save leaves
*  behind matches what a reload would show. */
function toEditablePrompts(rows) {
	return rows.map((p) => ({
		id: p.id,
		_key: p.id,
		value: p.value,
		enabled: p.enabled,
		tags: p.tags || [],
		systemTags: p.systemTags || [],
		premiumModels: p.premiumModels ?? []
	})).sort((a, b) => a.value.localeCompare(b.value) || Number(b.enabled) - Number(a.enabled) || a.id.localeCompare(b.id));
}
function sameTags(a, b) {
	if (a.length !== b.length) return false;
	const sortedB = [...b].sort();
	return [...a].sort().every((t, i) => t === sortedB[i]);
}
function PromptsEditor({ initialPrompts, brandId, pageTitle, pageDescription, premium }) {
	const [baseline, setBaseline] = (0, import_react.useState)(() => toEditablePrompts(initialPrompts));
	const [prompts, setPrompts] = (0, import_react.useState)(baseline);
	const [isSaving, setIsSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const saveInProgress = (0, import_react.useRef)(false);
	const invalidatePromptsSummary = useInvalidatePromptsSummary();
	const { changedKeys, removedCount, addedCount, editedCount } = (0, import_react.useMemo)(() => {
		const before = new Map(baseline.map((p) => [p.id, p]));
		const changed = /* @__PURE__ */ new Set();
		let added = 0;
		let edited = 0;
		for (const p of prompts) {
			const prev = p.id ? before.get(p.id) : void 0;
			if (!prev) {
				if (p.value.trim()) {
					changed.add(p._key);
					added++;
				}
				continue;
			}
			if (!p.value.trim()) {
				changed.add(p._key);
				continue;
			}
			if (p.value.trim() !== prev.value.trim() || p.enabled !== prev.enabled || !sameModels(p.premiumModels, prev.premiumModels) || !sameTags(p.tags, prev.tags)) {
				changed.add(p._key);
				edited++;
			}
		}
		const liveIds = new Set(prompts.filter((p) => p.value.trim()).map((p) => p.id));
		return {
			changedKeys: changed,
			addedCount: added,
			editedCount: edited,
			removedCount: baseline.filter((p) => !liveIds.has(p.id)).length
		};
	}, [prompts, baseline]);
	const isDirty = changedKeys.size > 0 || removedCount > 0;
	const summary = [
		addedCount && `${addedCount} added`,
		editedCount && `${editedCount} edited`,
		removedCount && `${removedCount} removed`
	].filter(Boolean).join(" · ");
	const savePrompts = async () => {
		if (saveInProgress.current) return;
		saveInProgress.current = true;
		setIsSaving(true);
		setError(null);
		try {
			const validPrompts = prompts.filter((p) => p.value.trim());
			const currentIds = new Set(validPrompts.filter((p) => p.id).map((p) => p.id));
			const removedPrompts = baseline.filter((p) => !currentIds.has(p.id)).map((p) => ({
				id: p.id,
				value: p.value,
				enabled: false,
				tags: p.tags,
				premiumModels: []
			}));
			const allPrompts = [...validPrompts.map((p) => ({
				...p.id ? { id: p.id } : {},
				value: p.value.trim(),
				enabled: p.enabled,
				tags: p.tags,
				premiumModels: p.premiumModels
			})), ...removedPrompts];
			const saved = await updatePromptsFn({ data: {
				brandId,
				prompts: allPrompts
			} });
			trackEvent("prompts_updated", {
				added: addedCount,
				edited: editedCount,
				deleted: removedCount
			});
			const next = toEditablePrompts(saved);
			setPrompts(next);
			setBaseline(next);
			invalidatePromptsSummary(brandId);
		} catch (err) {
			console.error("Error saving prompts:", err);
			setError(`Failed to save prompts: ${err instanceof Error ? err.message : "Unknown error"}`);
		} finally {
			setIsSaving(false);
			saveInProgress.current = false;
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-between",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl font-bold tracking-tight",
					children: pageTitle
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: pageDescription
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptsListEditor, {
				prompts,
				onChange: setPrompts,
				changedKeys,
				premium
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnsavedChangesBar, {
				isDirty,
				isSaving,
				summary: summary || void 0,
				error,
				onSave: savePrompts,
				onDiscard: () => {
					setPrompts(baseline);
					setError(null);
				}
			})
		]
	});
}
/**
* /app/$brand/settings/prompts - Prompt management page
*
* Editor to add/edit/remove prompts.
*/
function PromptsSettingsPage() {
	const { prompts: brandPrompts, premium } = Route.useLoaderData();
	const { brand: brandId } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromptsEditor, {
		initialPrompts: brandPrompts,
		brandId,
		pageTitle: "Prompts",
		pageDescription: "Add, edit, or remove your brand tracking keywords and prompts",
		premium
	});
}
//#endregion
export { PromptsSettingsPage as component };

//# sourceMappingURL=prompts-D1CtYBFi.mjs.map