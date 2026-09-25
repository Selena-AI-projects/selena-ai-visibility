import { d as and, f as eq } from "../_libs/drizzle-orm.mjs";
import { d as prompts, t as SYSTEM_TAGS } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as getEffectiveBrandedStatus } from "./tag-utils-C10EeA61.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prompt-resolution-CPr2lUBZ.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "709732b0-89a6-4234-8e5b-44c8c55e16c6", e._sentryDebugIdIdentifier = "sentry-dbid-709732b0-89a6-4234-8e5b-44c8c55e16c6");
	} catch (e) {}
})();
/**
* Server-only prompt resolution shared by the visibility and analysis server
* functions.
*
* This lives in its own module — rather than being exported from a server-fn
* file like `server/visibility.ts` — on purpose. A server fn file's `.handler`
* bodies (and the imports only they use) get tree-shaken out of the client
* bundle. But the moment a helper like this is *exported* from such a file and
* imported elsewhere, the bundler must keep it, which dragged `db` → pg →
* `Buffer` into the visibility page's client bundle ("Buffer is not defined").
* Keeping it here, imported only inside server-fn handlers, stays strippable.
* See issue #68.
*/
/**
* Resolve the in-scope prompts for a brand from filter criteria, entirely
* server-side. Mirrors the filtering the visibility page applies to build its
* prompt list — the tag filter from `getPromptsSummaryFn` plus the search box —
* so the chart and visibility aggregates cover the same prompts the list shows.
*
* Resolving here (instead of having the client serialize the full prompt-id
* list into the GET request URL) keeps the request bounded regardless of how
* many prompts a brand has. Shipping the id list overflowed the request URL for
* brands with a few hundred prompts — 414 URI Too Long on Vercel, 431 Request
* Header Fields Too Large in dev. See issue #68.
*
* NOTE: the tag-filter logic here must stay in sync with `getPromptsSummaryFn`
* (apps/web/src/server/prompts.ts), which produces the displayed list.
*/
async function resolveFilteredPrompts(brandId, opts) {
	const allPrompts = await db.select({
		id: prompts.id,
		value: prompts.value,
		systemTags: prompts.systemTags,
		tags: prompts.tags
	}).from(prompts).where(and(eq(prompts.brandId, brandId), eq(prompts.enabled, true)));
	const tagFilter = opts.tags?.split(",").filter(Boolean) || [];
	const search = opts.search;
	return allPrompts.filter((p) => {
		const userTags = p.tags || [];
		if (tagFilter.length > 0) {
			const { isBranded } = getEffectiveBrandedStatus(p.systemTags || [], userTags);
			const systemTag = isBranded ? SYSTEM_TAGS.BRANDED : SYSTEM_TAGS.UNBRANDED;
			const effectiveTags = userTags.includes(systemTag) ? userTags : [...userTags, systemTag];
			if (!tagFilter.some((t) => effectiveTags.includes(t))) return false;
		}
		if (search && !p.value.toLowerCase().includes(search.toLowerCase())) return false;
		return true;
	}).map((p) => ({
		id: p.id,
		value: p.value,
		systemTags: p.systemTags || [],
		tags: p.tags || []
	}));
}
//#endregion
export { resolveFilteredPrompts as t };

//# sourceMappingURL=prompt-resolution-CPr2lUBZ.mjs.map