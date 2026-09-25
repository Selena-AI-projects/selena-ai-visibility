import { i as __toESM } from "../_runtime.mjs";
import { A as IconInfoCircle, nt as require_react, q as IconBrandGoogle } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { _ as useNavigate, g as useRouteContext, m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Separator } from "./separator-D7PdY237.mjs";
import { t as FullPageCard } from "./full-page-card-Bn7eTsZh.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { t as authClient } from "./client-CSZfU_Y2.mjs";
import { n as AlertDescription, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { n as canResetPassword, t as Route } from "./login-U46RH-PE.mjs";
import { t as safeReturnTo } from "./return-to-D3SCz52E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-_CvetHKj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "093a384f-36b8-4dd5-9207-d20b3bfe7cf7", e._sentryDebugIdIdentifier = "sentry-dbid-093a384f-36b8-4dd5-9207-d20b3bfe7cf7");
	} catch (e) {}
})();
/**
* /auth/login - Login page
*
* Local/cloud modes: email/password form.
* Whitelabel mode: auto-redirects to Auth0 SSO (no form shown).
*/
function LoginPage() {
	const { returnTo } = Route.useSearch();
	const context = useRouteContext({ strict: false });
	const mode = context.clientConfig?.mode;
	const canRegister = context.clientConfig?.canRegister ?? false;
	const supportsPasswordReset = canResetPassword(context.clientConfig);
	if (mode === "whitelabel") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SSOLogin, { returnTo });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmailPasswordLogin, {
		returnTo,
		isDemo: mode === "demo",
		isCloud: mode === "cloud",
		supportsPasswordReset,
		canRegister
	});
}
function SSOLogin({ returnTo }) {
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		authClient.signIn.sso({
			providerId: "auth0-whitelabel",
			callbackURL: safeReturnTo(returnTo)
		}).then((result) => {
			if (cancelled) return;
			if (result.error) setError(result.error.message ?? "Failed to start sign-in");
		}).catch(() => {
			if (!cancelled) setError("Something went wrong. Please try again.");
		});
		return () => {
			cancelled = true;
		};
	}, [returnTo]);
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FullPageCard, {
		title: "Sign in",
		scene: "lens",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
			variant: "destructive",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: error })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			className: "w-full",
			onClick: () => window.location.reload(),
			children: "Try Again"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: "Signing in...",
		subtitle: "Redirecting to your identity provider",
		scene: "lens"
	});
}
function EmailPasswordLogin({ returnTo, isDemo, isCloud, supportsPasswordReset, canRegister }) {
	const navigate = useNavigate();
	const [email, setEmail] = (0, import_react.useState)(isDemo ? "demo@elmohq.com" : "");
	const [password, setPassword] = (0, import_react.useState)(isDemo ? "demo" : "");
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const result = await authClient.signIn.email({
				email,
				password
			});
			if (result.error) {
				if (supportsPasswordReset && result.error.status === 403) setError("Please verify your email first — we just sent you a new verification link.");
				else setError(result.error.message ?? "Invalid email or password");
				setLoading(false);
				return;
			}
			navigate({ to: safeReturnTo(returnTo) });
		} catch {
			setError("Something went wrong. Please try again.");
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FullPageCard, {
		title: "Welcome back",
		subtitle: isDemo ? void 0 : "Sign in to your AI Visibility workspace",
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
					isDemo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DemoCredentialsCallout, {}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
						variant: "destructive",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: error })
					}),
					!isDemo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "password",
								children: "Password"
							}), supportsPasswordReset && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/auth/forgot-password",
								className: "text-xs text-primary hover:underline",
								children: "Forgot password?"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "password",
							type: "password",
							placeholder: "Password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							required: true,
							autoComplete: "current-password"
						})]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "w-full",
						disabled: loading,
						children: loading ? "Signing in..." : "Sign in"
					})
				]
			}),
			canRegister && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-sm text-muted-foreground pt-4",
				children: [
					"Don't have an account?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth/register",
						search: returnTo ? { returnTo } : {},
						className: "text-primary hover:underline font-medium",
						children: "Create one"
					})
				]
			})
		]
	});
}
function DemoCredentialsCallout() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-medium text-amber-900 dark:text-amber-100",
				children: "Demo Account"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-900/90 dark:text-amber-100/80",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "opacity-70",
						children: "Email"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px]",
						children: "demo@elmohq.com"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "opacity-70",
						children: "Password"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px]",
						children: "demo"
					})]
				})]
			})]
		})]
	});
}
//#endregion
export { EmailPasswordLogin, LoginPage as component };

//# sourceMappingURL=login-_CvetHKj.mjs.map