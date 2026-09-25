import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { g as useRouteContext, m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Separator } from "./separator-D7PdY237.mjs";
import { t as Logo } from "./logo-Bdm1AKfI.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/full-page-card-Bn7eTsZh.js
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "8070c0b9-42ff-4d8a-92ca-9814b7e0fdf7", e._sentryDebugIdIdentifier = "sentry-dbid-8070c0b9-42ff-4d8a-92ca-9814b7e0fdf7");
	} catch (e) {}
})();
/**
* Still from the Selena Systems public site, shown beside the auth form.
*
* Each variant fixes its own aspect ratio so the crop is the same at every
* window size: a panel sized by its container's height crops a 16:9 frame by
* an amount nobody chose, and the subject can fall outside it entirely.
*/
var SCENES = { lens: {
	image: "/media/cinematic/lens.webp",
	alt: "A lens barrel standing on a dark surface, its glass lit from within",
	eyebrow: "AI Visibility by Selena Systems",
	line: "A workspace for what AI systems say about your brand."
} };
function AuthScene({ scene, variant }) {
	const { image, alt, eyebrow, line } = SCENES[scene];
	if (variant === "strip") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "aspect-[21/9] overflow-hidden rounded-xl bg-[var(--selena-charcoal)]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: image,
			alt,
			className: "size-full object-cover",
			fetchPriority: "low"
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className: "relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[var(--selena-charcoal)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: image,
				alt,
				className: "absolute inset-0 size-full object-cover"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"aria-hidden": "true",
				className: "absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[var(--selena-charcoal)]/90 to-transparent"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figcaption", {
				className: "absolute inset-x-0 bottom-0 p-8 text-[var(--selena-ivory)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--selena-copper)]",
					children: eyebrow
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "selena-heading mt-2 text-xl",
					children: line
				})]
			})
		]
	});
}
function isSelenaBranding(branding) {
	return !branding?.icon || !branding?.name || branding.icon === "/icons/selena-icon.svg" && branding.name === "Selena Systems";
}
function FullPageCard({ title, subtitle, children = void 0, showBackButton = false, backButtonHref = "/app", backButtonText = "Go Back", customBackButton, className = "w-full max-w-md", scene }) {
	const context = useRouteContext({ strict: false });
	const showScene = scene !== void 0 && isSelenaBranding(context.clientConfig?.branding);
	const body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `mx-auto ${className}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-center space-x-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "selena-auth-card my-8",
				children: [(title || subtitle) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: subtitle ? "text-center" : "text-center grid-rows-1 gap-0",
					children: [title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
						className: "text-xl",
						children: title
					}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: subtitle
					})]
				}), children && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(title || subtitle) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: title || subtitle ? "" : "flex flex-col items-center space-y-6 py-4 px-12",
					children
				})] })]
			}),
			customBackButton ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-center",
				children: customBackButton
			}) : showBackButton ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: "sm",
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: backButtonHref,
						children: backButtonText
					})
				})
			}) : null
		]
	});
	if (showScene && scene) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "selena-auth-shell min-h-screen",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid min-h-screen w-full max-w-6xl gap-6 p-4 lg:grid-cols-2 lg:gap-10 lg:p-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-col justify-center gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lg:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthScene, {
						scene,
						variant: "strip"
					})
				}), body]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden lg:flex lg:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthScene, {
					scene,
					variant: "panel"
				})
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "selena-auth-shell min-h-screen flex items-center justify-center p-4",
		children: body
	});
}
//#endregion
export { FullPageCard as t };

//# sourceMappingURL=full-page-card-Bn7eTsZh.mjs.map