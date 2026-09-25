import { i as __toESM } from "./_runtime.mjs";
import { nt as require_react } from "./_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./_ssr/button-DFsJLuMy.mjs";
import { _ as useNavigate, l as Outlet, x as useRouter } from "./_libs/@tanstack/react-router+[...].mjs";
import { a as trackEvent } from "./_ssr/posthog-DaElL-hv.mjs";
import { t as FullPageCard } from "./_ssr/full-page-card-Bn7eTsZh.mjs";
import { t as Input } from "./_ssr/input-BKn_RBJw.mjs";
import { t as Label } from "./_ssr/label-D2dD1vst.mjs";
import { d as SidebarProvider, s as SidebarInset } from "./_ssr/sidebar-DNi-GjZe.mjs";
import { r as createBrandFn } from "./_ssr/brands-Djh0ZZPk.mjs";
import { t as Route } from "./_brand-CHFP-D5G.mjs";
import { n as SiteHeader, t as AppSidebar } from "./_ssr/site-header-DM9jZ_Ek.mjs";
import { t as PlatformSelectionStep } from "./_ssr/platform-selection-step-lm2iF7uo.mjs";
import { t as validateWebsiteUrl } from "./_ssr/brand-website-COFlckqV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_brand-ClJNvY4g.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "487d0b3e-1419-4376-84fb-548795609713", e._sentryDebugIdIdentifier = "sentry-dbid-487d0b3e-1419-4376-84fb-548795609713");
	} catch (e) {}
})();
function BrandOnboarding({ brandId, brandName, platformState }) {
	const [step, setStep] = (0, import_react.useState)("website");
	const [website, setWebsite] = (0, import_react.useState)("");
	const [selected, setSelected] = (0, import_react.useState)(platformState ? new Set(platformState.defaultSelected) : /* @__PURE__ */ new Set());
	const [isLoading, setIsLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const navigate = useNavigate();
	const router = useRouter();
	const createBrand = async (enabledModels) => {
		setIsLoading(true);
		setError("");
		try {
			await createBrandFn({ data: {
				brandId,
				brandName,
				website,
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
	const handleWebsiteSubmit = async () => {
		setError("");
		const validation = validateWebsiteUrl(website);
		if (!validation.isValid) {
			setError(validation.error);
			return;
		}
		if (platformState) {
			setStep("platforms");
			return;
		}
		await createBrand(null);
	};
	if (step === "platforms" && platformState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: `Setup ${brandName}`,
		subtitle: "Choose which AI platforms to track",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformSelectionStep, {
			state: platformState,
			selected,
			onSelectedChange: setSelected,
			disabled: isLoading,
			error,
			onBack: () => setStep("website"),
			onSubmit: () => createBrand([...selected]),
			submitLabel: isLoading ? "Setting up..." : "Complete Setup"
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FullPageCard, {
		title: `Setup ${brandName}`,
		subtitle: "Configure your brand to get started",
		showBackButton: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			action: handleWebsiteSubmit,
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "website",
							children: "Website"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "website",
							name: "website",
							type: "text",
							placeholder: "example.com",
							required: true,
							disabled: isLoading,
							value: website,
							onChange: (e) => setWebsite(e.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Enter your brand's website"
						})
					]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-destructive",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "w-full",
					disabled: isLoading,
					children: isLoading ? "Setting up..." : platformState ? "Continue" : "Complete Setup"
				})
			]
		})
	});
}
/**
* /app/$brand layout - Brand-specific layout with sidebar
*
* Fetches brand data and provides it to child routes.
* Shows sidebar navigation, header, and optional demo banner.
* If brand exists in auth but not in DB, shows onboarding.
*/
/** No access, and nothing else worth saying about it. */
function BrandLayout() {
	const { brand, brandName, isAdmin, hasReportAccess, needsOnboarding, onboardingPlatformState } = Route.useLoaderData();
	const { brand: brandId } = Route.useParams();
	if (needsOnboarding) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandOnboarding, {
		brandId,
		brandName: brandName || brandId,
		platformState: onboardingPlatformState
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppSidebar, {
		isAdmin,
		hasReportAccess,
		brand
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarInset, {
		className: "md:border md:border-border/60 md:rounded-xl overflow-clip",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-1 flex-col",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "@container/main flex flex-1 flex-col gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
				})
			})
		})]
	})] });
}
//#endregion
export { BrandLayout as component };

//# sourceMappingURL=_brand-ClJNvY4g.mjs.map