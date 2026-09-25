import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as FullPageCard } from "./full-page-card-Bn7eTsZh.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { t as authClient } from "./client-CSZfU_Y2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/forgot-password-DI5jBGSe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0ba4a320-feb6-45f7-ac4b-e324b4be139a", e._sentryDebugIdIdentifier = "sentry-dbid-0ba4a320-feb6-45f7-ac4b-e324b4be139a");
	} catch (e) {}
})();
/**
* /auth/forgot-password - Request a password reset email (cloud only)
*
* Always renders the same neutral confirmation whether or not the account
* exists, to avoid account enumeration.
*/
function ForgotPasswordPage() {
	const [email, setEmail] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [submitted, setSubmitted] = (0, import_react.useState)(false);
	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			await authClient.requestPasswordReset({
				email,
				redirectTo: "/auth/reset-password"
			});
		} catch {}
		setSubmitted(true);
		setLoading(false);
	}
	if (submitted) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: "Check your email",
		subtitle: `If an account exists for ${email}, a reset link is on its way.`,
		scene: "lens",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-center text-sm text-muted-foreground w-full",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/auth/login",
				className: "text-primary hover:underline font-medium",
				children: "Back to sign in"
			})
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FullPageCard, {
		title: "Reset your password",
		subtitle: "Enter your email and we'll send you a reset link",
		scene: "lens",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			className: "space-y-4 w-full",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "email",
					children: "Email"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "email",
					type: "email",
					placeholder: "you@example.com",
					value: email,
					onChange: (e) => setEmail(e.target.value),
					required: true,
					autoComplete: "email",
					autoFocus: true
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				className: "w-full",
				disabled: loading,
				children: loading ? "Sending..." : "Send reset link"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-center text-sm text-muted-foreground pt-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/auth/login",
				className: "text-primary hover:underline font-medium",
				children: "Back to sign in"
			})
		})]
	});
}
//#endregion
export { ForgotPasswordPage as component };

//# sourceMappingURL=forgot-password-DI5jBGSe.mjs.map