import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { _ as useNavigate, m as Link, x as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as trackEvent } from "./posthog-DaElL-hv.mjs";
import { t as FullPageCard } from "./full-page-card-Bn7eTsZh.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { i as createBrandInOrgFn } from "./brands-Djh0ZZPk.mjs";
import { n as getOnboardingPlatformStateFn } from "./platform-picks-CbYihqfx.mjs";
import { t as PlatformSelectionStep } from "./platform-selection-step-lm2iF7uo.mjs";
import { t as validateWebsiteUrl } from "./brand-website-COFlckqV.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Bxx1zYOu.mjs";
import { t as Route } from "./new-Car03DFM.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/new-DiPT3eOY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "fc405530-92e3-4ca2-96f4-f8e341f5ce18", e._sentryDebugIdIdentifier = "sentry-dbid-fc405530-92e3-4ca2-96f4-f8e341f5ce18");
	} catch (e) {}
})();
/**
* /app/new - Create a new brand.
*
* Attaches a new brand to one of the current user's organizations and seeds
* the brand row with the supplied name + website. Gated by the
* canCreateBrands deployment feature (local, cloud) at both the loader
* (redirect to /app) and the server function.
*
* Where the plan meters platforms, a second step asks which ones to track:
* this is the flow every cloud brand goes through, so accepting the defaults
* silently would mean a brand's first cycle runs on platforms nobody chose.
*
* A workspace that has spent its plan's brands is told so here, before anything
* is filled in — the write guard would otherwise reject the finished form, and
* a limit is not something to discover at the end of a wizard.
*/
/** The oldest brand of each org, which is as good a billing entry point as any. */
/** One workspace is the norm; only ask when the answer isn't already decided. */
function WorkspaceSelect({ organizations, value, onChange, disabled }) {
	if (organizations.length <= 1) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			htmlFor: "organization",
			children: "Workspace"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
			value,
			onValueChange: onChange,
			disabled,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
				id: "organization",
				className: "w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: organizations.map((org) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
				value: org.id,
				children: org.name
			}, org.id)) })]
		})]
	});
}
function NewBrandPage() {
	const { organizations } = Route.useLoaderData();
	const [step, setStep] = (0, import_react.useState)("details");
	const [details, setDetails] = (0, import_react.useState)({
		brandName: "",
		website: ""
	});
	const [platformState, setPlatformState] = (0, import_react.useState)(null);
	const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [isLoading, setIsLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [organizationId, setOrganizationId] = (0, import_react.useState)((organizations.find((org) => !org.blocked) ?? organizations[0])?.id ?? "");
	const navigate = useNavigate();
	const router = useRouter();
	const activeOrg = organizations.find((org) => org.id === organizationId);
	const createBrand = async (brandName, website, enabledModels) => {
		setIsLoading(true);
		setError("");
		try {
			const { brandId } = await createBrandInOrgFn({ data: {
				brandName,
				website,
				organizationId: organizationId || void 0,
				...enabledModels && enabledModels.length > 0 && { enabledModels }
			} });
			trackEvent("brand_created", { has_website: Boolean(website) });
			await router.invalidate();
			await navigate({
				to: "/app/$brand",
				params: { brand: brandId }
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsLoading(false);
		}
	};
	const handleDetailsSubmit = async (formData) => {
		const brandName = formData.get("brandName")?.trim() ?? "";
		const website = formData.get("website")?.trim() ?? "";
		setError("");
		const validation = validateWebsiteUrl(website);
		if (!validation.isValid) {
			setError(validation.error);
			return;
		}
		setIsLoading(true);
		try {
			const state = organizationId ? await getOnboardingPlatformStateFn({ data: { organizationId } }) : null;
			if (!state) {
				await createBrand(brandName, website, null);
				return;
			}
			setDetails({
				brandName,
				website
			});
			setPlatformState(state);
			setSelected(new Set(state.defaultSelected));
			setStep("platforms");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsLoading(false);
		}
	};
	if (activeOrg?.blocked) {
		const { code, message } = activeOrg.blocked;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
			title: code === "no-active-plan" ? "This workspace has no plan" : "You've used every brand on your plan",
			subtitle: message,
			showBackButton: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceSelect, {
					organizations,
					value: organizationId,
					onChange: setOrganizationId
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					className: "w-full",
					children: activeOrg.billingBrandId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/$brand/settings/billing",
						params: { brand: activeOrg.billingBrandId },
						children: "Go to billing"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/choose-plan",
						search: { org: activeOrg.id },
						children: "Choose a plan"
					})
				})]
			})
		});
	}
	if (step === "platforms" && platformState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: `Create ${details.brandName}`,
		subtitle: "Choose which AI platforms to track",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformSelectionStep, {
			state: platformState,
			selected,
			onSelectedChange: setSelected,
			disabled: isLoading,
			error,
			onBack: () => setStep("details"),
			onSubmit: () => createBrand(details.brandName, details.website, [...selected]),
			submitLabel: isLoading ? "Creating..." : "Create brand"
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: "Create a new brand",
		subtitle: "Set up a brand to start tracking",
		showBackButton: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			action: handleDetailsSubmit,
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "brandName",
						children: "Brand name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "brandName",
						name: "brandName",
						type: "text",
						placeholder: "Acme",
						required: true,
						disabled: isLoading,
						defaultValue: details.brandName
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "website",
						children: "Website"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "website",
						name: "website",
						type: "text",
						placeholder: "example.com",
						required: true,
						disabled: isLoading,
						defaultValue: details.website
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceSelect, {
					organizations,
					value: organizationId,
					onChange: setOrganizationId,
					disabled: isLoading
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-destructive",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "w-full",
					disabled: isLoading,
					children: isLoading ? "Creating..." : "Continue"
				})
			]
		})
	});
}
//#endregion
export { NewBrandPage as component };

//# sourceMappingURL=new-DiPT3eOY.mjs.map