import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { A as CircleCheck, S as KeyRound, b as LoaderCircle, l as ShieldCheck, n as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { n as AlertDescription, r as AlertTitle, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { n as saveProviderCredentialFn, t as Route } from "./providers-BztcMlRy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/providers-DIQXiclJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "2b4225ed-8a4c-4c63-a78d-c421c123a9db", e._sentryDebugIdIdentifier = "sentry-dbid-2b4225ed-8a4c-4c63-a78d-c421c123a9db");
	} catch (e) {}
})();
var providerCopy = { BRIGHT_DATA_SERP: {
	title: "Bright Data SERP",
	description: "Public search evidence used by the recommendation engine.",
	placeholder: "Paste the Bright Data API token"
} };
function ProviderCredentialsPage() {
	const initial = Route.useLoaderData();
	const [statuses, setStatuses] = (0, import_react.useState)(() => Object.fromEntries(initial.providers.map(({ provider, status }) => [provider, status])));
	const allPresent = Object.values(statuses).every((status) => status === "PRESENT");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl font-bold tracking-tight",
					children: "Provider credentials"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "max-w-3xl text-muted-foreground",
					children: "Enter each credential once. Elmo encrypts it before database storage and never displays the saved value again."
				})]
			}),
			initial.storage !== "READY" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, {
				variant: "destructive",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "size-4" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertTitle, { children: "Encrypted storage is unavailable" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: "Configure a valid ELMO_ENCRYPTION_KEY in the deployment secret manager and restart Elmo before saving provider credentials." })
				]
			}) : allPresent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-4" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertTitle, { children: "Credential preflight ready" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: "The Bright Data credential is available. The worker refreshes encrypted credentials within 60 seconds. No provider request has been made; a controlled smoke test still requires the owner's go command." })
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "size-4" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertTitle, { children: "Add the Bright Data credential once" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: "Saving only updates encrypted storage. It does not contact Bright Data and has no provider cost." })
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "max-w-xl",
				children: initial.providers.map(({ provider }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CredentialCard, {
					provider,
					status: statuses[provider],
					storageReady: initial.storage === "READY",
					onStored: () => setStatuses((current) => ({
						...current,
						[provider]: "PRESENT"
					}))
				}, provider))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Stored credentials are deployment-wide and can only be managed by an Elmo administrator. Connected review and social accounts remain optional future modules and are not required for the MVP."
			})
		]
	});
}
function CredentialCard({ provider, status, storageReady, onStored }) {
	const copy = providerCopy[provider];
	const [credential, setCredential] = (0, import_react.useState)("");
	const [isSaving, setIsSaving] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)(null);
	const helpId = `${provider}-credential-help`;
	const messageId = `${provider}-credential-message`;
	const handleSubmit = async (event) => {
		event.preventDefault();
		if (isSaving || !storageReady) return;
		if (credential.trim().length < 8) {
			setMessage({
				kind: "error",
				text: "Enter at least 8 characters."
			});
			return;
		}
		setIsSaving(true);
		setMessage(null);
		try {
			const result = await saveProviderCredentialFn({ data: {
				provider,
				credential
			} });
			onStored();
			setMessage({
				kind: "success",
				text: result.runtimeRefreshed ? "Encrypted credential saved. The worker will load it within 60 seconds." : "Encrypted credential saved. Runtime refresh will retry automatically within 60 seconds."
			});
		} catch {
			setMessage({
				kind: "error",
				text: "Credential could not be stored. Check encrypted storage and try again."
			});
		} finally {
			setCredential("");
			setIsSaving(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: copy.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: copy.description })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: status === "PRESENT" ? "secondary" : "outline",
			children: status === "PRESENT" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex items-center gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "size-3.5" }), " Present"]
			}) : "Missing"
		})]
	}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "space-y-4",
		onSubmit: handleSubmit,
		"aria-busy": isSaving,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: `${provider}-credential`,
						children: status === "PRESENT" ? "Replace credential" : "Credential"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: `${provider}-credential`,
						type: "password",
						autoComplete: "off",
						spellCheck: false,
						"aria-describedby": `${helpId}${message ? ` ${messageId}` : ""}`,
						value: credential,
						onChange: (event) => setCredential(event.target.value),
						placeholder: copy.placeholder,
						disabled: !storageReady || isSaving,
						minLength: 8,
						maxLength: 4096,
						className: "min-h-11",
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: helpId,
						className: "text-sm text-muted-foreground",
						children: "At least 8 characters. The saved value will never be displayed again."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				className: "min-h-11",
				disabled: !storageReady || isSaving,
				children: isSaving ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }), " Saving…"] }) : status === "PRESENT" ? "Replace securely" : "Save securely"
			}),
			message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				id: messageId,
				className: message.kind === "error" ? "text-sm text-destructive" : "text-sm text-foreground",
				role: "status",
				"aria-live": "polite",
				children: message.text
			})
		]
	}) })] });
}
//#endregion
export { ProviderCredentialsPage as component };

//# sourceMappingURL=providers-DIQXiclJ.mjs.map