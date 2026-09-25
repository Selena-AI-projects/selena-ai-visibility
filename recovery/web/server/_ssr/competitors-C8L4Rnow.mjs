import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime, i as useQueryClient } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { n as TriangleAlert } from "../_libs/lucide-react.mjs";
import { l as updateCompetitors } from "./brands-Djh0ZZPk.mjs";
import { n as useBrand, r as useCompetitors } from "./use-brands-CqDybx5x.mjs";
import { n as dashboardKeys, t as citationKeys } from "./use-dashboard-summary-CZd6zvH8.mjs";
import { t as CompetitorsEditor } from "./competitors-editor-D8XrL4tl.mjs";
import { n as AlertDescription, r as AlertTitle, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { t as Route } from "./competitors-CBFTQaxN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/competitors-C8L4Rnow.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "ab5c379c-04f3-4341-a4b7-419f670efdc3", e._sentryDebugIdIdentifier = "sentry-dbid-ab5c379c-04f3-4341-a4b7-419f670efdc3");
	} catch (e) {}
})();
/**
* /app/$brand/settings/competitors - Competitor management page
*
* Form to manage competitor list with multiple domains and aliases per competitor.
*/
function CompetitorsSettingsPage() {
	const { brand: brandId } = Route.useParams();
	const { brand, isLoading } = useBrand(brandId);
	const { competitors: existingCompetitors, isLoading: competitorsLoading } = useCompetitors(brandId);
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [success, setSuccess] = (0, import_react.useState)("");
	const [competitors, setCompetitors] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		if (existingCompetitors.length > 0) setCompetitors(existingCompetitors.map((c) => ({
			_key: crypto.randomUUID(),
			name: c.name,
			domains: c.domains ?? [],
			aliases: c.aliases || [],
			expanded: false
		})));
	}, [existingCompetitors]);
	if (isLoading || competitorsLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-3xl font-bold",
			children: "Competitors"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted-foreground",
			children: "Loading..."
		})] })
	});
	if (!brand) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-3xl font-bold",
			children: "Competitors"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-destructive",
			children: "Brand not found"
		})] })
	});
	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError("");
		setSuccess("");
		try {
			const validCompetitors = competitors.filter((c) => c.name.trim() && c.domains.some((d) => d.trim())).map((c) => ({
				name: c.name.trim(),
				domains: c.domains.map((d) => d.trim()).filter(Boolean),
				aliases: c.aliases.map((a) => a.trim()).filter(Boolean)
			}));
			await updateCompetitors({ data: {
				brandId: brand.id,
				competitors: validCompetitors
			} });
			queryClient.invalidateQueries({ queryKey: citationKeys.all });
			queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
			setSuccess("Competitors updated successfully!");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-bold",
				children: "Competitors"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground",
				children: "Manage your competitive landscape for reputation tracking."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, {
				variant: "default",
				className: "border-yellow-200 bg-yellow-50 text-yellow-800",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4 text-yellow-600" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertTitle, { children: "Warning" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, {
						className: "text-yellow-700",
						children: "Updating competitors will only apply to future prompt evaluations. Citation categorization updates retroactively."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleSubmit,
				className: "space-y-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CompetitorsEditor, {
						competitors,
						onChange: setCompetitors,
						disabled: isSubmitting
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
			})
		]
	});
}
//#endregion
export { CompetitorsSettingsPage as component };

//# sourceMappingURL=competitors-C8L4Rnow.mjs.map