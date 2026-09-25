import { i as __toESM } from "../_runtime.mjs";
import { T as IconLoader2, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as SidebarProvider, s as SidebarInset } from "./sidebar-DNi-GjZe.mjs";
import { t as authClient } from "./client-CSZfU_Y2.mjs";
import { n as SiteHeader, t as AppSidebar } from "./site-header-DM9jZ_Ek.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { t as Switch } from "./switch-2VQ8weif.mjs";
import { n as AlertDescription, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { n as getPaywallStateFn } from "./billing-44PVeuc9.mjs";
import { t as PlanComparison } from "./plan-comparison-DI2j5M0B.mjs";
import { t as Route } from "./choose-plan-BiKkL5Ya.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/choose-plan-d4UyTm3l.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "3a6604ba-10e2-4553-a410-07643ce86c0c", e._sentryDebugIdIdentifier = "sentry-dbid-3a6604ba-10e2-4553-a410-07643ce86c0c");
	} catch (e) {}
})();
/**
* /choose-plan — checkout-first cloud onboarding.
*
* An authenticated org with no active subscription lands here (redirected from
* the app routes) and can't reach anything else until Stripe Checkout
* completes. The plan catalog renders straight from packages/config/plans —
* pricing changes never touch this file. After Checkout returns
* (?status=success) the page polls until the webhook lands, then enters the
* app.
*/
function ChoosePlanPage() {
	const paywall = Route.useLoaderData();
	const { status, org } = Route.useSearch();
	const body = status === "success" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivatingWorkspace, { organizationId: org }) : paywall.needsPlan ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanPicker, { paywall }) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppSidebar, { scope: "account" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarInset, {
		className: "md:border md:border-border/60 md:rounded-xl overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { title: "Choose a plan" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-1 flex-col",
			children: body
		})]
	})] });
}
/** Post-checkout: wait for the Stripe webhook to record the subscription. */
function ActivatingWorkspace({ organizationId }) {
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		const poll = async () => {
			for (let i = 0; i < 30 && !cancelled; i++) {
				if (!(await getPaywallStateFn({ data: { organizationId } })).needsPlan) {
					navigate({ to: "/app" });
					return;
				}
				await new Promise((resolve) => setTimeout(resolve, 2e3));
			}
		};
		poll();
		return () => {
			cancelled = true;
		};
	}, [navigate, organizationId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, { className: "h-8 w-8 animate-spin text-muted-foreground" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-bold",
				children: "Activating your workspace…"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground",
				children: "Payment received — finishing setup. This takes a few seconds."
			})
		]
	});
}
function PlanPicker({ paywall }) {
	const [annual, setAnnual] = (0, import_react.useState)(false);
	const [subscribing, setSubscribing] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const isAdmin = paywall.isOrgAdmin;
	const subscribe = async (plan) => {
		setSubscribing(plan);
		setError(null);
		const origin = window.location.origin;
		const { error: upgradeError } = await authClient.subscription.upgrade({
			plan,
			annual,
			referenceId: paywall.organizationId,
			customerType: "organization",
			successUrl: `${origin}/choose-plan?status=success&org=${encodeURIComponent(paywall.organizationId)}`,
			cancelUrl: `${origin}/choose-plan?org=${encodeURIComponent(paywall.organizationId)}`,
			disableRedirect: false
		});
		if (upgradeError) {
			setError(upgradeError.message ?? "Could not start checkout");
			setSubscribing(null);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl space-y-8 p-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-bold",
						children: "Choose your plan"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground",
						children: "Start tracking how AI answer engines talk about your brand."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-center gap-3 pt-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: annual ? "text-muted-foreground" : "font-medium",
								children: "Monthly"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: annual,
								onCheckedChange: setAnnual,
								"aria-label": "Annual billing"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: annual ? "font-medium" : "text-muted-foreground",
								children: ["Annual ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "secondary",
									children: "2 months free"
								})]
							})
						]
					})
				]
			}),
			!isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: "Only a workspace admin can choose a plan. Ask the person who created this workspace." }) }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				variant: "destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: error })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanComparison, {
				annual,
				highlightPlan: "pro",
				renderAction: (plan) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full",
					size: "sm",
					"aria-label": `Subscribe to ${plan.name}`,
					disabled: !isAdmin || subscribing !== null,
					onClick: () => subscribe(plan.key),
					children: subscribing === plan.key ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, { className: "h-4 w-4 animate-spin" }) : "Subscribe"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-center text-sm text-muted-foreground",
				children: [
					"Need more brands, any other models, higher numbers of samples, SSO, white label, or custom limits?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "underline",
						href: "mailto:hello@elmohq.com?subject=Elmo%20Cloud%20custom%20plan",
						children: "Talk to us about a custom plan"
					}),
					"."
				]
			})
		]
	});
}
//#endregion
export { ChoosePlanPage as component };

//# sourceMappingURL=choose-plan-d4UyTm3l.mjs.map