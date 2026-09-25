import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { kt as projectCreateSchema } from "./src-BdeAuGX5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-client-DuI6j9MY.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "dce3a5ca-82ea-4090-a1bb-c59aa4d7ad82", e._sentryDebugIdIdentifier = "sentry-dbid-dce3a5ca-82ea-4090-a1bb-c59aa4d7ad82");
	} catch (e) {}
})();
createServerFn({ method: "GET" }).handler(createSsrRpc("bb2dc0f2e379de57cead5731dfd375b5f344e086036dc88426cdb54f886fbd16"));
var getSelenaWorkspaceFn = createServerFn({ method: "GET" }).handler(createSsrRpc("0b0306174603c17d7ba37f6b71132621c504573e95969a545b723125722b59e2"));
var createSelenaProjectFn = createServerFn({ method: "POST" }).validator(projectCreateSchema).handler(createSsrRpc("a0730865ed85f3cec94c1c993df36a118c61d3e45a54a3df6d046de3470d8b8e"));
createServerFn({ method: "GET" }).validator(object({ projectId: string().uuid() })).handler(createSsrRpc("e912e78f16389da6082058523972fff9773584da5ff8849c9dd0d1a68d8df6bb"));
//#endregion
export { getSelenaWorkspaceFn as n, createSelenaProjectFn as t };

//# sourceMappingURL=selena-client-DuI6j9MY.mjs.map