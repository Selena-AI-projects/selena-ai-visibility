import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { t as getSelenaLocalVisibilityStateFn } from "./selena-local-visibility-2f4Yzn8q.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-horeca-CyeknTkv.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "1a1c75aa-b2ee-4819-9448-63d9ced0748f", e._sentryDebugIdIdentifier = "sentry-dbid-1a1c75aa-b2ee-4819-9448-63d9ced0748f");
	} catch (e) {}
})();
var horecaWorkspaceInputSchema = object({
	projectId: string().uuid().optional(),
	evidenceId: string().uuid().optional()
});
var getSelenaHorecaWorkspaceFn = createServerFn({ method: "GET" }).validator(horecaWorkspaceInputSchema).handler(createSsrRpc("af09ab5503c54f30fec502474e552f2d0a6fd01e7669ce31739ec3a5697e4bba"));
var $$splitComponentImporter = () => import("./selena-horeca-DivBAySm.mjs");
var Route = createFileRoute("/_authed/app/selena-horeca")({
	validateSearch: object({
		locale: _enum(["ru", "en"]).optional(),
		project: string().uuid().optional(),
		evidence: string().uuid().optional()
	}),
	loaderDeps: ({ search }) => ({
		project: search.project,
		evidence: search.evidence
	}),
	loader: async ({ deps }) => {
		const [localVisibility, workspace] = await Promise.all([getSelenaLocalVisibilityStateFn(), getSelenaHorecaWorkspaceFn({ data: {
			projectId: deps.project,
			evidenceId: deps.evidence
		} })]);
		return {
			localVisibility,
			workspace,
			generatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=selena-horeca-CyeknTkv.mjs.map