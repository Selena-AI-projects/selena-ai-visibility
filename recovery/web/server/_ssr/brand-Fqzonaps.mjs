import { i as __toESM } from "../_runtime.mjs";
import { A as IconInfoCircle, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime, i as useQueryClient } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { c as updateBrandFn } from "./brands-Djh0ZZPk.mjs";
import { s as cleanAndValidateDomain } from "./domain-categories-IivSiXtp.mjs";
import { n as useBrand } from "./use-brands-CqDybx5x.mjs";
import { n as dashboardKeys, t as citationKeys } from "./use-dashboard-summary-CZd6zvH8.mjs";
import { t as TagsInput } from "./tags-input-C2nEtJB0.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/brand-Fqzonaps.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c4cd9cda-8051-4054-bffd-035e02fa5112", e._sentryDebugIdIdentifier = "sentry-dbid-c4cd9cda-8051-4054-bffd-035e02fa5112");
	} catch (e) {}
})();
/**
* /app/$brand/settings/brand - Brand settings page
*
* Form to edit brand name, website, additional domains, and aliases.
*/
function BrandSettingsPage() {
	const { brand, isLoading, revalidate } = useBrand();
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [success, setSuccess] = (0, import_react.useState)("");
	const [additionalDomains, setAdditionalDomains] = (0, import_react.useState)([]);
	const [aliases, setAliases] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		if (brand) {
			setAdditionalDomains(brand.additionalDomains || []);
			setAliases(brand.aliases || []);
		}
	}, [brand]);
	const validateDomain = (0, import_react.useCallback)((val) => {
		if (!cleanAndValidateDomain(val)) return `"${val}" is not a valid domain`;
		return true;
	}, []);
	const handleAliasesChange = (0, import_react.useCallback)((values) => setAliases(values), []);
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-3xl font-bold",
			children: "Brand"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted-foreground",
			children: "Loading..."
		})] })
	});
	if (!brand) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-3xl font-bold",
			children: "Brand"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-destructive",
			children: "Brand not found"
		})] })
	});
	const handleSubmit = async (formData) => {
		setIsSubmitting(true);
		setError("");
		setSuccess("");
		try {
			const name = formData.get("name");
			const website = formData.get("website");
			await updateBrandFn({ data: {
				brandId: brand.id,
				name,
				website,
				additionalDomains,
				aliases
			} });
			queryClient.invalidateQueries({ queryKey: citationKeys.all });
			queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
			setSuccess("Brand details updated successfully!");
			await revalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-2xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-3xl font-bold",
			children: "Brand"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted-foreground",
			children: "Manage your brand name and website"
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			action: handleSubmit,
			className: "space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "name",
									children: "Brand Name"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "name",
									name: "name",
									type: "text",
									placeholder: "Brand Name",
									defaultValue: brand.name,
									required: true,
									disabled: isSubmitting
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Enter your brand's name"
								})
							]
						}),
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
									defaultValue: brand.website,
									required: true,
									disabled: isSubmitting
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Your brand's primary website"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								className: "flex items-center gap-1.5",
								children: ["Additional Domains", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
									className: "max-w-xs text-xs font-normal",
									children: [
										"Other domains your brand owns (e.g. blog.example.com, shop.example.com). Citations from these domains will be counted as your brand's citations. ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Updates retroactively" }),
										" — existing citations will be reclassified immediately."
									]
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsInput, {
								value: additionalDomains,
								onValueChange: setAdditionalDomains,
								placeholder: "Add domain...",
								searchPlaceholder: "Add domain...",
								maxItems: 10,
								normalizeValue: (raw) => cleanAndValidateDomain(raw) ?? raw.trim(),
								onValidate: validateDomain
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								className: "flex items-center gap-1.5",
								children: ["Brand Aliases", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "h-3.5 w-3.5 text-muted-foreground cursor-help" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipContent, {
									className: "max-w-xs text-xs font-normal",
									children: [
										"Alternative names for your brand (sub-brands, product lines, abbreviations). Used for mention detection in ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "future" }),
										" prompt runs only — does not apply retroactively to past results."
									]
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsInput, {
								value: aliases,
								onValueChange: handleAliasesChange,
								placeholder: "Add alias...",
								searchPlaceholder: "Add alias...",
								maxItems: 10
							})]
						})
					]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm text-destructive bg-destructive/10 p-3 rounded-md",
					children: error
				}),
				success && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm text-green-600 bg-green-50 p-3 rounded-md",
					children: success
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: isSubmitting,
						className: "cursor-pointer",
						children: isSubmitting ? "Saving..." : "Save Changes"
					})
				})
			]
		})]
	});
}
//#endregion
export { BrandSettingsPage as component };

//# sourceMappingURL=brand-Fqzonaps.mjs.map