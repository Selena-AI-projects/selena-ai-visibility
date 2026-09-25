import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { f as eq, u as desc } from "../_libs/drizzle-orm.mjs";
import { d as prompts } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, l as requireBrandAccess } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prompts-CYuuwAQc.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "646a8ea0-b568-419b-885e-83f1894e4ee3", e._sentryDebugIdIdentifier = "sentry-dbid-646a8ea0-b568-419b-885e-83f1894e4ee3");
	} catch (e) {}
})();
/**
* /app/$brand/settings/prompts - Prompt management page
*
* Editor to add/edit/remove prompts.
*/
var getPromptsForEditing_createServerFn_handler = createServerRpc({
	id: "a0dd3391399a4e9d9933e4ae4026385f6411ac7564e83dc79a576cdedcc3e4ca",
	name: "getPromptsForEditing",
	filename: "src/routes/_authed/app/$brand/settings/prompts.tsx"
}, (opts) => getPromptsForEditing.__executeServer(opts));
var getPromptsForEditing = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(getPromptsForEditing_createServerFn_handler, async ({ data }) => {
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	return await db.select().from(prompts).where(eq(prompts.brandId, data.brandId)).orderBy(prompts.value, desc(prompts.enabled), prompts.id);
});
//#endregion
export { getPromptsForEditing_createServerFn_handler };

//# sourceMappingURL=prompts-CYuuwAQc.mjs.map