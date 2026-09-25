import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, j as strictObject } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-workspaces-BwiY6M8I.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "b82aa5f9-58c2-4e72-aabf-b644ef097f19", e._sentryDebugIdIdentifier = "sentry-dbid-b82aa5f9-58c2-4e72-aabf-b644ef097f19");
	} catch (e) {}
})();
var listSelenaWorkspaces = createServerFn({ method: "GET" }).handler(createSsrRpc("ce5229649c556f69d14479b25522103412b1fccbd58d5f6f6f42909309649cb8"));
var selectSelenaWorkspace = createServerFn({ method: "POST" }).validator(strictObject({ organizationId: string().trim().min(1).max(255) })).handler(createSsrRpc("5023f353975f30415133428000c413211a3781cbb69a8552d4d4276c61fb8056"));
//#endregion
export { selectSelenaWorkspace as n, listSelenaWorkspaces as t };

//# sourceMappingURL=selena-workspaces-BwiY6M8I.mjs.map