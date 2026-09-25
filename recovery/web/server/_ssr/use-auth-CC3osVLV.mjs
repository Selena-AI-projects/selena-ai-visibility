import { g as useRouteContext } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-auth-CC3osVLV.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "6f867eb4-2d91-4e2f-85ec-97d21f043367", e._sentryDebugIdIdentifier = "sentry-dbid-6f867eb4-2d91-4e2f-85ec-97d21f043367");
	} catch (e) {}
})();
/**
* Auth hook for TanStack Start.
*
* Reads the session from route context (set by _authed layout).
*/
/**
* Get current user across different auth providers.
* Session is loaded server-side in _authed layout's beforeLoad.
*/
function useAuth() {
	const session = useRouteContext({ strict: false }).session;
	return {
		user: session?.user ? {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
			picture: session.user.image ?? void 0
		} : null,
		isLoading: false,
		isAuthenticated: !!session?.user,
		loginUrl: "/auth/login",
		logoutUrl: "/auth/logout"
	};
}
//#endregion
export { useAuth as t };

//# sourceMappingURL=use-auth-CC3osVLV.mjs.map