import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { o as useBlocker } from "../_libs/@tanstack/react-router+[...].mjs";
import { b as LoaderCircle, p as Save } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-BmGdp57D.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/unsaved-changes-bar-jcpYpDDB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "b863c032-55e0-4d87-bf95-5f180a1df666", e._sentryDebugIdIdentifier = "sentry-dbid-b863c032-55e0-4d87-bf95-5f180a1df666");
	} catch (e) {}
})();
/**
* Save bar for pages that buffer edits locally until an explicit save.
*
* It surfaces only once there's something to lose, then stays pinned to the
* bottom of the viewport so it's reachable from anywhere in a long list. It
* also guards the three ways those edits can vanish: in-app navigation,
* browser back/forward, and closing the tab.
*/
function UnsavedChangesBar({ isDirty, isSaving, summary, error, onSave, onDiscard }) {
	const [confirmingDiscard, setConfirmingDiscard] = (0, import_react.useState)(false);
	const blocker = useBlocker({
		shouldBlockFn: () => isDirty,
		enableBeforeUnload: () => isDirty,
		withResolver: true
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		isDirty && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "sticky bottom-4 z-10 animate-in fade-in slide-in-from-bottom-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-lg border border-amber-500/40 bg-background shadow-lg",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg bg-amber-500/10 px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2.5 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "relative flex h-2 w-2 shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-2 w-2 rounded-full bg-amber-500" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-amber-700 dark:text-amber-400",
									children: "Unsaved changes"
								}),
								summary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: summary
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "ghost",
								size: "sm",
								disabled: isSaving,
								onClick: () => setConfirmingDiscard(true),
								className: "cursor-pointer",
								children: "Discard"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								disabled: isSaving,
								onClick: onSave,
								className: "flex items-center gap-2 cursor-pointer",
								children: isSaving ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), " Saving…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), " Save changes"] })
							})]
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "w-full text-sm text-destructive",
							role: "alert",
							children: error
						})
					]
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
			open: confirmingDiscard,
			onOpenChange: setConfirmingDiscard,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Discard changes?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [summary ? `${summary} will be reverted.` : "Your changes will be reverted.", " This can't be undone."] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				onClick: () => setConfirmingDiscard(false),
				className: "cursor-pointer",
				children: "Keep editing"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "destructive",
				onClick: () => {
					setConfirmingDiscard(false);
					onDiscard();
				},
				className: "cursor-pointer",
				children: "Discard changes"
			})] })] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
			open: blocker.status === "blocked",
			onOpenChange: (open) => !open && blocker.reset?.(),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Leave without saving?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [summary ? `You have unsaved changes (${summary}).` : "You have unsaved changes.", " They'll be lost if you leave this page."] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				onClick: () => blocker.reset?.(),
				className: "cursor-pointer",
				children: "Stay on page"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "destructive",
				onClick: () => blocker.proceed?.(),
				className: "cursor-pointer",
				children: "Leave without saving"
			})] })] })
		})
	] });
}
//#endregion
export { UnsavedChangesBar as t };

//# sourceMappingURL=unsaved-changes-bar-jcpYpDDB.mjs.map