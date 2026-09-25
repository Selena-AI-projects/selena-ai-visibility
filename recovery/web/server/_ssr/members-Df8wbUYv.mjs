import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { x as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as trackEvent } from "./posthog-DaElL-hv.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { n as AlertDescription, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { i as inviteTeamMemberFn, n as cancelInvitationFn, o as removeTeamMemberFn, s as updateOrganizationFn } from "./team-BEREAu2S.mjs";
import { t as Route } from "./members-DDfCB6nW.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Bxx1zYOu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/members-Df8wbUYv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "1e3cea55-8c90-40ea-bdec-96a90f66a4c3", e._sentryDebugIdIdentifier = "sentry-dbid-1e3cea55-8c90-40ea-bdec-96a90f66a4c3");
	} catch (e) {}
})();
/**
* /app/$brand/settings/members - Team settings page (cloud only)
*
* Invite teammates by email, list current members, and manage pending
* invitations. The redirect in the loader is UX only — the security
* boundary is the teamInvites guard inside every team server function.
*/
function TeamSettingsPage() {
	const { brand: brandId } = Route.useParams();
	const { members, invitations, currentUserId, organization } = Route.useLoaderData();
	const router = useRouter();
	const [inviteEmail, setInviteEmail] = (0, import_react.useState)("");
	const [inviteRole, setInviteRole] = (0, import_react.useState)("member");
	const [inviting, setInviting] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [workspaceName, setWorkspaceName] = (0, import_react.useState)(organization.name);
	const [savingWorkspace, setSavingWorkspace] = (0, import_react.useState)(false);
	async function handleSaveWorkspace(e) {
		e.preventDefault();
		setError(null);
		setSavingWorkspace(true);
		try {
			await updateOrganizationFn({ data: {
				brandId,
				name: workspaceName
			} });
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update workspace name");
		} finally {
			setSavingWorkspace(false);
		}
	}
	async function handleInvite(e) {
		e.preventDefault();
		setError(null);
		setInviting(true);
		try {
			await inviteTeamMemberFn({ data: {
				brandId,
				email: inviteEmail,
				role: inviteRole
			} });
			trackEvent("team_member_invited", { role: inviteRole });
			setInviteEmail("");
			setInviteRole("member");
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send invitation");
		} finally {
			setInviting(false);
		}
	}
	async function handleRemove(memberId) {
		setError(null);
		try {
			await removeTeamMemberFn({ data: {
				brandId,
				memberId
			} });
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to remove member");
		}
	}
	async function handleCancel(invitationId) {
		setError(null);
		try {
			await cancelInvitationFn({ data: {
				brandId,
				invitationId
			} });
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to cancel invitation");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-bold",
				children: "Team"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground",
				children: "Invite teammates and manage who has access to your workspace."
			})] }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				variant: "destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: error })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Workspace"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSaveWorkspace,
					className: "flex flex-wrap items-end gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "workspace-name",
							children: "Name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "workspace-name",
							value: workspaceName,
							onChange: (e) => setWorkspaceName(e.target.value),
							required: true,
							className: "w-64"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: savingWorkspace,
						children: savingWorkspace ? "Saving..." : "Save"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleInvite,
				className: "flex flex-wrap items-end gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "invite-email",
							children: "Email"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "invite-email",
							type: "email",
							placeholder: "teammate@example.com",
							value: inviteEmail,
							onChange: (e) => setInviteEmail(e.target.value),
							required: true,
							className: "w-64"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "invite-role",
							children: "Role"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: inviteRole,
							onValueChange: (value) => setInviteRole(value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								id: "invite-role",
								className: "w-32",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "member",
								children: "Member"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "admin",
								children: "Admin"
							})] })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: inviting,
						children: inviting ? "Inviting..." : "Invite"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Members"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y rounded-md border",
					children: members.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3 p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-medium",
								children: m.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm text-muted-foreground",
								children: m.email
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								children: m.role
							}), m.userId !== currentUserId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "outline",
								size: "sm",
								onClick: () => handleRemove(m.id),
								children: "Remove"
							})]
						})]
					}, m.id))
				})]
			}),
			invitations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Pending invitations"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y rounded-md border",
					children: invitations.map((inv) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3 p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-medium",
								children: inv.email
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted-foreground",
								children: ["Expires ", new Date(inv.expiresAt).toLocaleDateString()]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								children: inv.role ?? "member"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "outline",
								size: "sm",
								onClick: () => handleCancel(inv.id),
								children: "Cancel"
							})]
						})]
					}, inv.id))
				})]
			})
		]
	});
}
//#endregion
export { TeamSettingsPage as component };

//# sourceMappingURL=members-Df8wbUYv.mjs.map