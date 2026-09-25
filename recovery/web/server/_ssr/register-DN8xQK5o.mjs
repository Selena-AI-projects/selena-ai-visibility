import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react, q as IconBrandGoogle } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { _ as useNavigate, g as useRouteContext, m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Separator } from "./separator-D7PdY237.mjs";
import { t as FullPageCard } from "./full-page-card-Bn7eTsZh.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { t as authClient } from "./client-CSZfU_Y2.mjs";
import { n as AlertDescription, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { t as safeReturnTo } from "./return-to-D3SCz52E.mjs";
import { t as Route } from "./register-BEV104Wf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/register-DN8xQK5o.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "09f4b2f5-4902-41ae-be7d-896d3eba426a", e._sentryDebugIdIdentifier = "sentry-dbid-09f4b2f5-4902-41ae-be7d-896d3eba426a");
	} catch (e) {}
})();
/**
* /auth/register - Account registration page
*
* Available in local mode for the single bootstrap signup and in cloud mode
* for public self-serve signup. Cloud requires email verification before
* sign-in and also offers Google OAuth.
*/
function RegisterPage() {
	const { returnTo } = Route.useSearch();
	const context = useRouteContext({ strict: false });
	const hasUsers = context.clientConfig?.hasUsers ?? false;
	const isCloud = context.clientConfig?.mode === "cloud";
	const navigate = useNavigate();
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [pendingVerification, setPendingVerification] = (0, import_react.useState)(false);
	const [resending, setResending] = (0, import_react.useState)(false);
	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const result = await authClient.signUp.email({
				email,
				password,
				name,
				...isCloud && { callbackURL: safeReturnTo(returnTo) }
			});
			if (result.error) {
				setError(result.error.message ?? "Registration failed");
				setLoading(false);
				return;
			}
			if (isCloud) {
				setPendingVerification(true);
				setLoading(false);
				return;
			}
			navigate({ to: safeReturnTo(returnTo) });
		} catch {
			setError("Something went wrong. Please try again.");
			setLoading(false);
		}
	}
	async function handleResend() {
		setResending(true);
		try {
			await authClient.sendVerificationEmail({
				email,
				callbackURL: safeReturnTo(returnTo)
			});
		} finally {
			setResending(false);
		}
	}
	if (pendingVerification) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: "Check your email",
		subtitle: `We sent a verification link to ${email}`,
		scene: "lens",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4 w-full",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground text-center",
				children: "Click the link in the email to verify your address and get started. The link expires, so verify soon."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "outline",
				className: "w-full",
				onClick: handleResend,
				disabled: resending,
				children: resending ? "Sending..." : "Resend verification email"
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FullPageCard, {
		title: "Create your workspace",
		subtitle: "Set up your AI Visibility account",
		scene: "lens",
		children: [
			isCloud && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 w-full pb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "outline",
					className: "w-full",
					onClick: () => authClient.signIn.social({
						provider: "google",
						callbackURL: safeReturnTo(returnTo)
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBrandGoogle, { className: "size-4" }), "Continue with Google"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "flex-1" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground",
							children: "or"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "flex-1" })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
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
							htmlFor: "name",
							children: "Name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "name",
							type: "text",
							placeholder: "Your name",
							value: name,
							onChange: (e) => setName(e.target.value),
							required: true,
							autoComplete: "name",
							autoFocus: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
							autoComplete: "email"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "password",
							children: "Password"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "password",
							type: "password",
							placeholder: "Create a password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							required: true,
							autoComplete: "new-password",
							minLength: isCloud ? 8 : 6
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "w-full",
						disabled: loading,
						children: loading ? "Creating account..." : "Create account"
					})
				]
			}),
			hasUsers && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-sm text-muted-foreground pt-4",
				children: [
					"Already have an account?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth/login",
						search: returnTo ? { returnTo } : {},
						className: "text-primary hover:underline font-medium",
						children: "Sign in"
					})
				]
			})
		]
	});
}
//#endregion
export { RegisterPage as component };

//# sourceMappingURL=register-DN8xQK5o.mjs.map