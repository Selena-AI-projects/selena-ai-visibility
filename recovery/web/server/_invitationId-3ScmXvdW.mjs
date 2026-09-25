import { d as lazyRouteComponent, f as createFileRoute } from "./_libs/@tanstack/react-router+[...].mjs";
import { r as getInvitationFn } from "./_ssr/team-BEREAu2S.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_invitationId-3ScmXvdW.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "75c819d7-55c6-454e-b3eb-d7218adf4833", e._sentryDebugIdIdentifier = "sentry-dbid-75c819d7-55c6-454e-b3eb-d7218adf4833");
	} catch (e) {}
})();
/**
* /accept-invitation/:invitationId - Accept a team invitation (cloud only)
*
* Sits under _authed so an invitee without a session is sent to login with
* returnTo, and the login → register → verify chain lands them back here.
* Better-auth requires the session email to match the invited email
* (case-insensitively) and rejects expired or already-handled invitations.
*/
var $$splitComponentImporter = () => import("./_invitationId-CPOyS6Vf.mjs");
var Route = createFileRoute("/_authed/accept-invitation/$invitationId")({
	loader: async ({ params }) => {
		try {
			return {
				invitation: await getInvitationFn({ data: { invitationId: params.invitationId } }),
				error: null
			};
		} catch (err) {
			return {
				invitation: null,
				error: err instanceof Error ? err.message : "This invitation could not be loaded"
			};
		}
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };

//# sourceMappingURL=_invitationId-3ScmXvdW.mjs.map