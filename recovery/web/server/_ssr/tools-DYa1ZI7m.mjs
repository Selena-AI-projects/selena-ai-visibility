import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { E as Copy, F as Check, b as LoaderCircle, c as Sparkles } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, s as DialogTrigger, t as Dialog } from "./dialog-BmGdp57D.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { t as adminAnalyzeBrandFn } from "./admin-BGFhkJzE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tools-DYa1ZI7m.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a2ac65d6-7e4c-455c-8c18-6849c3e7f2fb", e._sentryDebugIdIdentifier = "sentry-dbid-a2ac65d6-7e4c-455c-8c18-6849c3e7f2fb");
	} catch (e) {}
})();
/**
* /admin/tools — Admin utility for running the onboarding analysis against an
* arbitrary website without going through the wizard.
*/
function AnalyzeBrandDialog() {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [website, setWebsite] = (0, import_react.useState)("");
	const [brandName, setBrandName] = (0, import_react.useState)("");
	const [isLoading, setIsLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [result, setResult] = (0, import_react.useState)(null);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const handleAnalyze = async () => {
		if (!website.trim()) {
			setError("Please enter a website URL");
			return;
		}
		setError(null);
		setResult(null);
		setIsLoading(true);
		try {
			const data = await adminAnalyzeBrandFn({ data: {
				website: website.trim(),
				brandName: brandName.trim() || void 0
			} });
			setResult(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsLoading(false);
		}
	};
	const handleCopy = async () => {
		if (!result) return;
		await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
		setCopied(true);
		setTimeout(() => setCopied(false), 2e3);
	};
	const handleCopyPrompts = async () => {
		if (!result) return;
		await navigator.clipboard.writeText(result.suggestedPrompts.map((p) => p.prompt).join("\n"));
		setCopied(true);
		setTimeout(() => setCopied(false), 2e3);
	};
	const handleClose = () => {
		setOpen(false);
		setWebsite("");
		setBrandName("");
		setResult(null);
		setError(null);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: (o) => o ? setOpen(true) : handleClose(),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "outline",
				className: "cursor-pointer w-full",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 mr-2" }), "Analyze brand"]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-3xl max-h-[80vh] overflow-y-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Analyze brand" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Run the onboarding analysis for any website." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 py-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "analyze-website",
								children: "Website URL"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "analyze-website",
								placeholder: "https://example.com",
								value: website,
								onChange: (e) => setWebsite(e.target.value),
								disabled: isLoading
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "analyze-brand",
								children: "Brand name (optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "analyze-brand",
								placeholder: "Auto-detected from URL",
								value: brandName,
								onChange: (e) => setBrandName(e.target.value),
								disabled: isLoading
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: handleAnalyze,
						disabled: isLoading,
						className: "cursor-pointer w-full",
						children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }), "Analyzing… (this may take a minute)"] }) : "Analyze"
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-destructive",
						children: error
					}),
					result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "font-semibold",
									children: result.brandName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										size: "sm",
										onClick: handleCopyPrompts,
										className: "cursor-pointer",
										children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 mr-1" }), " Copied"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4 mr-1" }), " Copy prompts"] })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "ghost",
										size: "sm",
										onClick: handleCopy,
										className: "cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4 mr-1" }), " Copy JSON"]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-4 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Competitors",
									value: result.competitors.length
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Prompts",
									value: result.suggestedPrompts.length
								})]
							}),
							result.additionalDomains.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagSection, {
								title: "Additional domains",
								items: result.additionalDomains
							}),
							result.aliases.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagSection, {
								title: "Aliases",
								items: result.aliases
							}),
							result.competitors.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-muted-foreground",
									children: "Competitors"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-1 text-sm",
									children: result.competitors.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: c.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted-foreground",
											children: [
												"(",
												c.domains.join(", ") || "—",
												")"
											]
										})]
									}, c.name))
								})]
							}),
							result.suggestedPrompts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-muted-foreground",
									children: "Prompts"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "max-h-60 overflow-y-auto border rounded-md p-2 space-y-1 text-sm",
									children: result.suggestedPrompts.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start gap-2 py-1 border-b last:border-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-muted-foreground w-6 flex-shrink-0",
												children: [i + 1, "."]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "flex-1",
												children: p.prompt
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex flex-wrap gap-1 flex-shrink-0",
												children: p.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
													variant: "outline",
													className: "text-[10px] px-1 py-0",
													children: tag
												}, tag))
											})
										]
									}, p.prompt))
								})]
							})
						]
					})
				]
			})]
		})]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
		className: "text-muted-foreground",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "font-medium",
		children: value.toLocaleString()
	})] });
}
function TagSection({ title, items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			className: "text-muted-foreground",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap gap-1",
			children: items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
				variant: "secondary",
				children: it
			}, it))
		})]
	});
}
function ToolsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-bold tracking-tight",
				children: "Tools"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-muted-foreground",
				children: [
					"Run the onboarding analysis for any brand without creating it. Same pipeline as the wizard and",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "mx-1 rounded bg-muted px-1",
						children: "POST /api/v1/tools/analyze"
					}),
					"."
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-6 md:grid-cols-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5" }), "Brand analysis"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Analyze a website to discover its competitors, additional brand domains, aliases, and suggested AI tracking prompts. Works with any configured LLM provider." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnalyzeBrandDialog, {}) })] })
		})]
	});
}
//#endregion
export { ToolsPage as component };

//# sourceMappingURL=tools-DYa1ZI7m.mjs.map