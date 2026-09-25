import { i as __toESM } from "../_runtime.mjs";
import { N as IconExternalLink, T as IconLoader2, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { x as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as CardContent, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { g as summarizeSubscriptionCost, l as planDisplayName } from "./plans-D-CRwAoX.mjs";
import { t as authClient } from "./client-CSZfU_Y2.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { n as isOrgAdminRole } from "./roles-CHs0lopm.mjs";
import { n as AlertDescription, r as AlertTitle, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { r as setPremiumAddonQuantityFn } from "./billing-44PVeuc9.mjs";
import { t as Route } from "./billing-D87jHz2s.mjs";
import { t as Progress } from "./progress-DJY9He7H.mjs";
import { t as PlanComparison } from "./plan-comparison-DI2j5M0B.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/billing--BAIrLJi.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9759ad36-5e27-4bb0-8e19-d2d633997aa0", e._sentryDebugIdIdentifier = "sentry-dbid-9759ad36-5e27-4bb0-8e19-d2d633997aa0");
	} catch (e) {}
})();
/**
* /app/$brand/settings/billing — plan, usage meters, and the extra-premium-
* prompts add-on (cloud only).
*
* Card changes, invoices, plan switches, and cancellation go through the
* Stripe Customer Portal / Checkout via better-auth — no card data or payment
* state lives here. The redirect in the loader is UX only; the real gates are
* the entitlement guards in the server functions.
*/
function formatDate(iso) {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString(void 0, {
		year: "numeric",
		month: "long",
		day: "numeric"
	});
}
function BillingSettingsPage() {
	const state = Route.useLoaderData();
	const { brand: brandId } = Route.useParams();
	const router = useRouter();
	const isAdmin = isOrgAdminRole(state.organization.role);
	const { entitlements } = state;
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const openPortal = async () => {
		setBusy("portal");
		setError(null);
		const { error: portalError } = await authClient.subscription.billingPortal({
			referenceId: state.organization.id,
			customerType: "organization",
			returnUrl: window.location.href
		});
		if (portalError) {
			setError(portalError.message ?? "Could not open the billing portal");
			setBusy(null);
		}
	};
	const changePlan = async (plan) => {
		setBusy(`plan-${plan}`);
		setError(null);
		const { error: upgradeError } = await authClient.subscription.upgrade({
			plan,
			annual: state.subscription?.billingInterval === "year",
			referenceId: state.organization.id,
			customerType: "organization",
			...state.subscription && { subscriptionId: state.subscription.id },
			successUrl: window.location.href,
			cancelUrl: window.location.href,
			disableRedirect: false
		});
		if (upgradeError) setError(upgradeError.message ?? "Could not change the plan");
		setBusy(null);
		router.invalidate();
	};
	const showPlanGrid = isAdmin && state.subscription !== null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-6xl space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-bold",
				children: "Billing"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-muted-foreground",
				children: [
					"Plan and usage for the ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium",
						children: state.organization.name
					}),
					" workspace."
				]
			})] }),
			entitlements.standing === "grace" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, {
				variant: "destructive",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertTitle, { children: "Payment failed" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: "We couldn't renew your subscription. Tracking continues for a few more days while Stripe retries — update your card in the billing portal to avoid a pause." })]
			}),
			entitlements.standing === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, {
				variant: "destructive",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertTitle, { children: "Tracking paused" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: "Payment is more than a week overdue, so prompt tracking is paused. Your data stays readable; fix the payment in the billing portal and tracking resumes automatically." })]
			}),
			entitlements.standing === "none" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, {
				variant: "destructive",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertTitle, { children: "No active subscription" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: "Tracking is stopped until a plan is chosen." })]
			}),
			state.subscription?.cancelAtPeriodEnd && entitlements.standing === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDescription, { children: [
				"Your subscription is set to cancel on ",
				formatDate(state.subscription.periodEnd),
				". You can restore it from the billing portal."
			] }) }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				variant: "destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: error })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Plans",
				description: showPlanGrid ? "Switching takes effect immediately; Stripe prorates the difference." : "What your workspace is on, and what it costs.",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubscriptionSummary, {
						state,
						isAdmin,
						busy,
						onOpenPortal: openPortal,
						onChoosePlan: () => router.navigate({ to: "/choose-plan" }),
						showPlanGrid
					}),
					showPlanGrid && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlanComparison, {
						annual: state.subscription?.billingInterval === "year",
						activePlan: entitlements.planKey,
						align: "start",
						renderAction: (plan) => entitlements.planKey === plan.key ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "w-full",
							size: "sm",
							variant: "outline",
							disabled: !isAdmin || busy !== null,
							onClick: openPortal,
							children: busy === "portal" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, { className: "h-4 w-4 animate-spin" }) : "Manage"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "w-full",
							size: "sm",
							variant: "secondary",
							"aria-label": `Switch to ${plan.name}`,
							disabled: !isAdmin || busy !== null,
							onClick: () => changePlan(plan.key),
							children: busy === `plan-${plan.key}` ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, { className: "h-4 w-4 animate-spin" }) : "Switch"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted-foreground",
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
			}),
			state.premiumAddonAvailable && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Extra premium",
				description: `Beyond what your plan includes, at $5 per pairing per month.`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PremiumAddonCard, {
					brandId,
					quantity: state.premiumAddonQuantity,
					isAdmin,
					hasSubscription: state.subscription !== null
				})
			}),
			showMeters(entitlements) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Usage",
				description: "What your workspace is using against its plan.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageCard, { state })
			})
		]
	});
}
/**
* The state of the subscription in one line, plus what it bills.
*
* Deliberately thin: when the plan grid is showing, it already names the plan,
* its price and which one is current, so repeating all that in a card above it
* left two blocks saying the same thing. What is left is what the grid cannot
* say — whether the subscription is healthy, when it renews, and how an add-on
* adds up — and the grid's own current-plan card carries the way in to Stripe.
*/
function SubscriptionSummary({ state, isAdmin, busy, onOpenPortal, onChoosePlan, showPlanGrid }) {
	const { entitlements, subscription } = state;
	const annual = subscription?.billingInterval === "year";
	const cost = subscription && entitlements.planKey !== null && entitlements.planKey !== "custom" ? summarizeSubscriptionCost({
		plan: entitlements.planKey,
		interval: annual ? "annual" : "monthly",
		addonQuantity: state.premiumAddonQuantity
	}) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm",
			children: [
				!showPlanGrid && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-base font-semibold",
					children: planDisplayName(entitlements.planKey)
				}),
				subscription && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: entitlements.standing === "active" ? "secondary" : "destructive",
					children: humanizeStatus(subscription.status)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: subscription ? `${annual ? "Annual" : "Monthly"} billing · renews ${formatDate(subscription.periodEnd)}` : entitlements.planKey === "custom" ? "Custom agreement billed outside self-serve." : "No subscription on file."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm",
			children: [
				cost && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [cost.lines.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: cost.lines.map((line) => `${line.label} $${line.amountUsd.toLocaleString()}`).join(" · ")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-xl font-bold tabular-nums",
					children: ["$", cost.totalUsd.toLocaleString()]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: annual ? "/year" : "/month"
				})] })] }),
				isAdmin && !showPlanGrid && (subscription ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					onClick: onOpenPortal,
					disabled: busy !== null,
					children: [busy === "portal" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, { className: "h-4 w-4" }), "Manage billing"]
				}) : entitlements.planKey !== "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					onClick: onChoosePlan,
					children: "Choose a plan"
				})),
				!isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: "Only workspace admins can change the plan."
				})
			]
		})]
	});
}
/** A page section: what it is, why it is here, then the cards. */
function Section({ title, description, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-lg font-semibold",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: description
		})] }), children]
	});
}
/** Metered plans only: an unlimited or unsubscribed workspace has nothing to measure. */
function showMeters(entitlements) {
	return !entitlements.unlimited && entitlements.planKey !== null;
}
function UsageCard({ state }) {
	const { entitlements } = state;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageMeter, {
				label: "Brands",
				used: state.usage.brands,
				limit: entitlements.maxBrands
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageMeter, {
				label: "Tracked prompts",
				used: state.usage.enabledPrompts,
				limit: entitlements.maxPrompts
			}),
			entitlements.premiumPool > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageMeter, {
				label: state.premiumAddonQuantity > 0 ? `Premium pairings (${state.premiumAddonQuantity} purchased)` : "Premium pairings",
				used: state.usage.premiumAssigned,
				limit: entitlements.premiumPool
			})
		]
	}) });
}
/** Stripe's status ids are snake_case and lowercase; a badge shouldn't be. */
function humanizeStatus(status) {
	const words = status.replace(/_/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}
function UsageMeter({ label, used, limit }) {
	const percent = limit && limit > 0 ? Math.min(100, used / limit * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: used > (limit ?? Number.POSITIVE_INFINITY) ? "font-medium text-destructive" : void 0,
				children: [
					used,
					" / ",
					limit ?? "∞"
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, { value: percent })]
	});
}
function PremiumAddonCard({ brandId, quantity, isAdmin, hasSubscription }) {
	const router = useRouter();
	const [value, setValue] = (0, import_react.useState)(String(quantity));
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const parsed = Number.parseInt(value, 10);
	const changed = Number.isInteger(parsed) && parsed >= 0 && parsed <= 1e3 && parsed !== quantity;
	const save = async () => {
		setSaving(true);
		setError(null);
		try {
			await setPremiumAddonQuantityFn({ data: {
				brandId,
				quantity: parsed
			} });
			router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not update the add-on");
		} finally {
			setSaving(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-3",
		children: [
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				variant: "destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: error })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "premium-addon-quantity",
						children: "Purchased pairings"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "premium-addon-quantity",
						type: "number",
						min: 0,
						max: 1e3,
						className: "w-32",
						value,
						disabled: !isAdmin || !hasSubscription || saving,
						onChange: (event) => setValue(event.target.value)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: save,
					disabled: !isAdmin || !hasSubscription || !changed || saving,
					children: saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, { className: "h-4 w-4 animate-spin" }) : "Update"
				})]
			}),
			!hasSubscription && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "An active subscription is required to buy the add-on."
			})
		]
	}) });
}
//#endregion
export { BillingSettingsPage as component };

//# sourceMappingURL=billing--BAIrLJi.mjs.map