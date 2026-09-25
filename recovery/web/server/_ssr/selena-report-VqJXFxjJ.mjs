import { d as lazyRouteComponent, f as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { n as getSelenaWorkspaceFn } from "./selena-client-DuI6j9MY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-report-VqJXFxjJ.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "62d09c0c-3cf1-4e58-89c2-037ee8ec9c66", e._sentryDebugIdIdentifier = "sentry-dbid-62d09c0c-3cf1-4e58-89c2-037ee8ec9c66");
	} catch (e) {}
})();
/**
* /app/selena-report — the customer-facing grader report, one screen for both
* paid plans: the plan only decides which sections have data. Layout follows
* docs/selena-visibility/REPORT_DESIGN_SPEC.md and the approved mockup; every
* empty group renders UNKNOWN, never zero, and no composite score exists.
*/
var $$splitComponentImporter = () => import("./selena-report-B1834QvX.mjs");
var Route = createFileRoute("/_authed/app/selena-report")({
	validateSearch: object({ project: string().uuid().optional() }),
	loader: () => getSelenaWorkspaceFn(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=selena-report-VqJXFxjJ.mjs.map