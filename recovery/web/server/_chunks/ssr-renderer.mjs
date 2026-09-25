(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9c64622e-887f-43b1-98b9-643933c31fd5", e._sentryDebugIdIdentifier = "sentry-dbid-9c64622e-887f-43b1-98b9-643933c31fd5");
	} catch (e) {}
})();
import { n as HTTPError, o as toRequest } from "../_libs/h3+rou3+srvx.mjs";
//#region ../../node_modules/.pnpm/nitro-nightly@3.0.1-20260223-102354-c0b46421_@azure+identity@4.13.1_@azure+keyvault-sec_c783f2e4376f953975d9bd97bb418210/node_modules/nitro-nightly/dist/runtime/vite.mjs
function fetchViteEnv(viteEnvName, input, init) {
	const viteEnv = (globalThis.__nitro_vite_envs__ || {})[viteEnvName];
	if (!viteEnv) throw HTTPError.status(404);
	return Promise.resolve(viteEnv.fetch(toRequest(input, init)));
}
//#endregion
//#region ../../node_modules/.pnpm/nitro-nightly@3.0.1-20260223-102354-c0b46421_@azure+identity@4.13.1_@azure+keyvault-sec_c783f2e4376f953975d9bd97bb418210/node_modules/nitro-nightly/dist/runtime/internal/vite/ssr-renderer.mjs
/** @param {{ req: Request }} HTTPEvent */
function ssrRenderer({ req }) {
	return fetchViteEnv("ssr", req);
}
//#endregion
export { ssrRenderer as default };

//# sourceMappingURL=ssr-renderer.mjs.map