import { i as __toESM } from "./_runtime.mjs";
import { nt as require_react } from "./_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./_ssr/button-DFsJLuMy.mjs";
import { _ as useNavigate, m as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as FullPageCard } from "./_ssr/full-page-card-Bn7eTsZh.mjs";
import { n as AlertDescription, t as Alert } from "./_ssr/alert-6CmvZ_CO.mjs";
import { t as acceptInvitationFn } from "./_ssr/team-BEREAu2S.mjs";
import { t as Route } from "./_invitationId-3ScmXvdW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_invitationId-CPOyS6Vf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ca55c970-2db7-405a-af8a-f68eb6b199c2", e._sentryDebugIdIdentifier = "sentry-dbid-ca55c970-2db7-405a-af8a-f68eb6b199c2");
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
function AcceptInvitationPage() {
	const { invitationId } = Route.useParams();
	const { invitation, error: loadError } = Route.useLoaderData();
	const navigate = useNavigate();
	const [accepting, setAccepting] = (0, import_react.useState)(false);
	const [acceptError, setAcceptError] = (0, import_react.useState)(null);
	if (loadError || !invitation) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: "Invitation unavailable",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4 w-full",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
					variant: "destructive",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: loadError ?? "This invitation could not be loaded" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground text-center",
					children: "Make sure you're signed in with the email address that received this invitation."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					className: "w-full",
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth/logout",
						children: "Switch account"
					})
				})
			]
		})
	});
	async function handleAccept() {
		setAcceptError(null);
		setAccepting(true);
		try {
			await acceptInvitationFn({ data: { invitationId } });
			navigate({ to: "/app" });
		} catch (err) {
			setAcceptError(err instanceof Error ? err.message : "Failed to accept the invitation");
			setAccepting(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: `You've been invited to join ${invitation.organizationName}`,
		subtitle: `Invited by ${invitation.inviterEmail}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4 w-full",
			children: [acceptError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				variant: "destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: acceptError })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "w-full",
				onClick: handleAccept,
				disabled: accepting,
				children: accepting ? "Accepting..." : "Accept invitation"
			})]
		})
	});
}
//#endregion
export { AcceptInvitationPage as component };

//# sourceMappingURL=_invitationId-CPOyS6Vf.mjs.map