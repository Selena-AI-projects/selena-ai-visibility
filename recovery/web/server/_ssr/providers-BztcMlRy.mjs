import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { n as getAppName } from "./route-head-BwwsuPJZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/providers-BztcMlRy.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c5174b1b-23d7-4b48-9fd0-7da342c5abbb", e._sentryDebugIdIdentifier = "sentry-dbid-c5174b1b-23d7-4b48-9fd0-7da342c5abbb");
	} catch (e) {}
})();
var providerSchema = _enum(["BRIGHT_DATA_SERP"]);
var getProviderCredentialStatusFn = createServerFn({ method: "GET" }).handler(createSsrRpc("972a8e5d4f6e57855554eb2821225b8023c7854c5c559b2601437f7f6c81135d"));
var saveProviderCredentialFn = createServerFn({ method: "POST" }).validator(object({
	provider: providerSchema,
	credential: string().trim().min(8).max(4096)
})).handler(createSsrRpc("03b88e37001905638dad66a6dd260f2297960819bd264941c2725ec46e5da20a"));
var $$splitComponentImporter = () => import("./providers-DIQXiclJ.mjs");
var Route = createFileRoute("/_authed/admin/providers")({
	head: ({ match }) => {
		return { meta: [{ title: `Provider credentials · ${getAppName(match)}` }, {
			name: "description",
			content: "Secure provider credential management."
		}] };
	},
	loader: () => getProviderCredentialStatusFn(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { saveProviderCredentialFn as n, Route as t };

//# sourceMappingURL=providers-BztcMlRy.mjs.map