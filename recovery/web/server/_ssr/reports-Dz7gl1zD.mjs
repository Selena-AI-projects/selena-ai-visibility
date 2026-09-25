import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as trackEvent } from "./posthog-DaElL-hv.mjs";
import { n as CardContent, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { w as ExternalLink } from "../_libs/lucide-react.mjs";
import { d as SidebarProvider, s as SidebarInset } from "./sidebar-DNi-GjZe.mjs";
import { n as SiteHeader, t as AppSidebar } from "./site-header-DM9jZ_Ek.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { t as Textarea } from "./textarea-D11Pept6.mjs";
import { r as getReportsFn, t as createReportFn } from "./reports-CG5bFrq_.mjs";
import { t as Route } from "./reports-C8vqkJKv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-Dz7gl1zD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0daafa48-2552-499c-880d-b44ebdc86d01", e._sentryDebugIdIdentifier = "sentry-dbid-0daafa48-2552-499c-880d-b44ebdc86d01");
	} catch (e) {}
})();
/**
* /reports - Reports list page
*
* Requires admin OR report generator access.
* Replicates: apps/web/src/app/reports/page.tsx + reports-content.tsx
*/
function ReportsPage() {
	const { isAdmin, hasReportAccess } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const { data: reports = [], error, isLoading } = useQuery({
		queryKey: ["reports"],
		queryFn: () => getReportsFn(),
		refetchInterval: 5e3,
		staleTime: 2e3
	});
	const [formData, setFormData] = (0, import_react.useState)({
		brandName: "",
		brandWebsite: "",
		manualPrompts: ""
	});
	const [submitError, setSubmitError] = (0, import_react.useState)("");
	const [success, setSuccess] = (0, import_react.useState)("");
	const createMutation = useMutation({
		mutationFn: (data) => createReportFn({ data }),
		onSuccess: (_data, variables) => {
			trackEvent("report_created", { has_manual_prompts: Boolean(variables.manualPrompts) });
			setSuccess("Report request submitted successfully!");
			setFormData({
				brandName: "",
				brandWebsite: "",
				manualPrompts: ""
			});
			queryClient.invalidateQueries({ queryKey: ["reports"] });
		},
		onError: (err) => {
			setSubmitError(err.message || "An error occurred");
		}
	});
	const handleSubmit = (e) => {
		e.preventDefault();
		setSubmitError("");
		setSuccess("");
		createMutation.mutate(formData);
	};
	const getStatusBadgeVariant = (status) => {
		switch (status) {
			case "completed": return "default";
			case "processing": return "secondary";
			case "failed": return "destructive";
			default: return "outline";
		}
	};
	const extractDomain = (url) => {
		try {
			return new URL(url).hostname.replace("www.", "");
		} catch {
			return url;
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppSidebar, {
		isAdmin,
		hasReportAccess,
		scope: "admin"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarInset, {
		className: "md:border md:border-border/60 md:rounded-xl overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-1 flex-col",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "@container/main flex flex-1 flex-col gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-col gap-4 p-4 md:gap-6 md:p-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-3xl font-bold tracking-tight",
								children: "Reports"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-muted-foreground",
								children: "Generate one-time brand reports."
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-6 max-w-4xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-2xl font-semibold",
									children: "Create New Report"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: handleSubmit,
									className: "space-y-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 md:grid-cols-2 gap-4",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "space-y-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
													htmlFor: "brandName",
													children: "Brand Name"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													id: "brandName",
													type: "text",
													placeholder: "Enter brand name",
													value: formData.brandName,
													onChange: (e) => setFormData({
														...formData,
														brandName: e.target.value
													}),
													required: true,
													disabled: createMutation.isPending
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "space-y-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
													htmlFor: "brandWebsite",
													children: "Brand Website"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													id: "brandWebsite",
													type: "url",
													placeholder: "https://example.com",
													value: formData.brandWebsite,
													onChange: (e) => setFormData({
														...formData,
														brandWebsite: e.target.value
													}),
													required: true,
													disabled: createMutation.isPending
												})]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
													htmlFor: "manualPrompts",
													children: ["Manual Prompts ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-muted-foreground font-normal",
														children: "(Optional)"
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
													id: "manualPrompts",
													placeholder: "Enter one prompt per line, up to 50",
													value: formData.manualPrompts,
													onChange: (e) => setFormData({
														...formData,
														manualPrompts: e.target.value
													}),
													disabled: createMutation.isPending,
													rows: 6,
													className: "font-mono text-sm"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-muted-foreground",
													children: formData.manualPrompts.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Note:" }),
														" Prompts will NOT be auto-generated. Using your",
														" ",
														formData.manualPrompts.trim().split("\n").filter((line) => line.trim()).length,
														" ",
														"manual prompt",
														formData.manualPrompts.trim().split("\n").filter((line) => line.trim()).length !== 1 ? "s" : "",
														"."
													] }) : "Leave empty to auto-generate prompts based on website analysis, competitors, and keywords."
												})
											]
										}),
										submitError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-destructive",
											children: submitError
										}),
										success && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-green-600",
											children: success
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "submit",
											disabled: createMutation.isPending,
											className: "cursor-pointer",
											children: createMutation.isPending ? "Creating Report..." : "Create Report"
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-2xl font-semibold",
										children: "Report History"
									}),
									error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
										className: "py-8 text-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-destructive",
											children: error instanceof Error ? error.message : "Failed to load reports"
										})
									}) }),
									isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex items-center justify-center py-8",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center space-x-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Loading reports..." })]
										})
									}) : !error && reports.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
										className: "py-8 text-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-muted-foreground",
											children: "No reports found."
										})
									}) }) : !error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "space-y-3",
										children: reports.map((report) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "bg-gray-50 border border-gray-200 rounded-lg p-4",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "flex-1 min-w-0",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
														className: "font-semibold text-lg",
														children: [
															report.brandName,
															" ",
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "text-gray-600 font-normal",
																children: [
																	"(",
																	extractDomain(report.brandWebsite),
																	")"
																]
															})
														]
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "ml-4",
													children: report.status === "completed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
														to: "/reports/render/$reportId",
														params: { reportId: report.id },
														target: "_blank",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
															variant: "default",
															size: "sm",
															className: "cursor-pointer h-6 px-2 text-xs",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3 mr-0.5" }), "View Report"]
														})
													}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: getStatusBadgeVariant(report.status),
														className: "text-xs",
														children: report.status.charAt(0).toUpperCase() + report.status.slice(1)
													})
												})]
											})
										}, report.id))
									})
								]
							})]
						})]
					})
				})
			})
		})]
	})] });
}
//#endregion
export { ReportsPage as component };

//# sourceMappingURL=reports-Dz7gl1zD.mjs.map