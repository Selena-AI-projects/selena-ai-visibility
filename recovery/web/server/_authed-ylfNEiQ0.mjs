import { i as __toESM } from "./_runtime.mjs";
import { nt as require_react } from "./_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { g as useRouteContext, l as Outlet } from "./_libs/@tanstack/react-router+[...].mjs";
import { i as setPersonProperties, t as identifyUser } from "./_ssr/posthog-DaElL-hv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authed-ylfNEiQ0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "eb3062b2-8da5-4336-8d15-03ff8769b444", e._sentryDebugIdIdentifier = "sentry-dbid-eb3062b2-8da5-4336-8d15-03ff8769b444");
	} catch (e) {}
})();
/**
* Auth layout route - pathless layout that protects all child routes.
*
* Checks for an authenticated better-auth session, redirects to /auth/login if not found.
*/
function AuthedLayout() {
	const context = useRouteContext({ strict: false });
	const identifiedRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const user = context.session?.user;
		if (!user || identifiedRef.current === user.id) return;
		identifiedRef.current = user.id;
		identifyUser(user.id, {
			email: user.email,
			name: user.name,
			deployment_mode: context.clientConfig?.mode
		});
		setPersonProperties({ deployment_mode: context.clientConfig?.mode });
	}, [context.session?.user, context.clientConfig?.mode]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
}
//#endregion
export { AuthedLayout as component };

//# sourceMappingURL=_authed-ylfNEiQ0.mjs.map