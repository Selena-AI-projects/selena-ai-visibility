import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { _ as useNavigate, m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as FullPageCard } from "./full-page-card-Bn7eTsZh.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { t as authClient } from "./client-CSZfU_Y2.mjs";
import { n as AlertDescription, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { t as Route } from "./reset-password-DotdJU4P.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reset-password-DGGEoita.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "18140bc4-d58b-438d-848d-2796b8a48ad0", e._sentryDebugIdIdentifier = "sentry-dbid-18140bc4-d58b-438d-848d-2796b8a48ad0");
	} catch (e) {}
})();
/**
* /auth/reset-password - Choose a new password from a reset link (cloud only)
*
* Better-auth redirects here with ?token=... on a valid link, or
* ?error=INVALID_TOKEN on a bad one.
*/
function ResetPasswordPage() {
	const { token, error: searchError } = Route.useSearch();
	const navigate = useNavigate();
	const [newPassword, setNewPassword] = (0, import_react.useState)("");
	const [confirmPassword, setConfirmPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	if (searchError || !token) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: "Reset link invalid or expired",
		scene: "lens",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-center text-sm text-muted-foreground w-full",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/auth/forgot-password",
				className: "text-primary hover:underline font-medium",
				children: "Request a new reset link"
			})
		})
	});
	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		setLoading(true);
		try {
			const result = await authClient.resetPassword({
				newPassword,
				token
			});
			if (result.error) {
				setError(result.error.message ?? "Failed to reset password");
				setLoading(false);
				return;
			}
			navigate({ to: "/auth/login" });
		} catch {
			setError("Something went wrong. Please try again.");
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: "Choose a new password",
		scene: "lens",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			className: "space-y-4 w-full",
			children: [
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
					variant: "destructive",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: error })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "new-password",
						children: "New password"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "new-password",
						type: "password",
						placeholder: "New password",
						value: newPassword,
						onChange: (e) => setNewPassword(e.target.value),
						required: true,
						autoComplete: "new-password",
						minLength: 8,
						autoFocus: true
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "confirm-password",
						children: "Confirm password"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "confirm-password",
						type: "password",
						placeholder: "Confirm password",
						value: confirmPassword,
						onChange: (e) => setConfirmPassword(e.target.value),
						required: true,
						autoComplete: "new-password",
						minLength: 8
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "w-full",
					disabled: loading,
					children: loading ? "Resetting..." : "Reset password"
				})
			]
		})
	});
}
//#endregion
export { ResetPasswordPage as component };

//# sourceMappingURL=reset-password-DGGEoita.mjs.map