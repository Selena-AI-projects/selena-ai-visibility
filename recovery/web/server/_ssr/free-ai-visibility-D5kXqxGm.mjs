import { i as __toESM } from "../_runtime.mjs";
import { S as IconMail, T as IconLoader2, U as IconCheck, et as IconAlertCircle, f as IconSparkles, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SelenaWordmark } from "./selena-wordmark-DhsBFluR.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/free-ai-visibility-D5kXqxGm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "1c5959d8-e520-4d4f-baec-b4dc83c3d70b", e._sentryDebugIdIdentifier = "sentry-dbid-1c5959d8-e520-4d4f-baec-b4dc83c3d70b");
	} catch (e) {}
})();
var knownErrors = [
	["SELENA_FREE_AI_VISIBILITY_EMAIL_VERIFICATION_REQUIRED", "EMAIL_VERIFICATION_REQUIRED"],
	["SELENA_FREE_AI_VISIBILITY_ALREADY_CLAIMED", "ALREADY_CLAIMED"],
	["SELENA_FREE_AI_VISIBILITY_CAP_REACHED", "BUDGET_UNAVAILABLE"],
	["SELENA_FREE_AI_VISIBILITY_DOMAIN_INVALID", "DOMAIN_INVALID"],
	["SELENA_FREE_AI_VISIBILITY_DISABLED", "DISABLED"]
];
function freeAiVisibilityCustomerError(error) {
	const message = error instanceof Error ? error.message : String(error);
	return knownErrors.find(([code]) => message.includes(code))?.[1] ?? "FAILED";
}
function shouldPollFreeAiVisibilityStatus(status) {
	return status?.status === "QUEUED" || status?.status === "UNCONFIRMED";
}
var claimFreeAiVisibilityCheckFn = createServerFn({ method: "POST" }).validator(object({ website: string().trim().min(1).max(2048) })).handler(createSsrRpc("080eb55b421ef783eb77235216e7edc7ced17ed7312f7ebe70d63197e5fdb4e8"));
var getFreeAiVisibilityCheckStatusFn = createServerFn({ method: "GET" }).handler(createSsrRpc("30a81c0b72bea2f9b00f9d475313457b0f6f916679ec552fd453a568b0db949a"));
var statusQueryKey = ["selena", "free-ai-visibility"];
var errorContent = {
	EMAIL_VERIFICATION_REQUIRED: {
		heading: "Verify your email to continue",
		body: "This one-time check is available after your email address is verified."
	},
	ALREADY_CLAIMED: {
		heading: "Your free check has already been used",
		body: "Each verified account can run one no-cost check across the two systems."
	},
	BUDGET_UNAVAILABLE: {
		heading: "The free-check budget is unavailable",
		body: "Please try again later. No check was started."
	},
	DOMAIN_INVALID: {
		heading: "Enter a public website address",
		body: "Use a website URL such as https://example.com."
	},
	DISABLED: {
		heading: "The free check is not available right now",
		body: "Please try again later."
	},
	FAILED: {
		heading: "We could not start or read this check",
		body: "Please try again later. No provider response or source link is shown here."
	}
};
function FreeAiVisibilityPage() {
	const queryClient = useQueryClient();
	const [website, setWebsite] = (0, import_react.useState)("");
	const [submissionError, setSubmissionError] = (0, import_react.useState)(null);
	const statusQuery = useQuery({
		queryKey: statusQueryKey,
		queryFn: () => getFreeAiVisibilityCheckStatusFn(),
		retry: false,
		refetchInterval: (query) => shouldPollFreeAiVisibilityStatus(query.state.data) ? 3e3 : false,
		refetchIntervalInBackground: true
	});
	const claim = useMutation({
		mutationFn: (nextWebsite) => claimFreeAiVisibilityCheckFn({ data: { website: nextWebsite } }),
		onSuccess: (check) => {
			setSubmissionError(null);
			setWebsite("");
			queryClient.setQueryData(statusQueryKey, {
				...check,
				report: null
			});
			queryClient.invalidateQueries({ queryKey: statusQueryKey });
		},
		onError: (error) => setSubmissionError(freeAiVisibilityCustomerError(error))
	});
	const queryError = statusQuery.isError ? freeAiVisibilityCustomerError(statusQuery.error) : null;
	const error = submissionError ?? queryError;
	function submit(event) {
		event.preventDefault();
		setSubmissionError(null);
		claim.mutate(website.trim());
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "selena-app min-h-screen px-4 py-6 sm:px-6 sm:py-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "selena-app-header flex items-center justify-between rounded-2xl px-5 py-4 sm:px-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaWordmark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-[#574d45]",
						children: "Verified account check"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "selena-section selena-section--anchor mt-6 p-6 sm:p-8",
					"aria-labelledby": "free-check-heading",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "selena-anchor-meta",
							children: "One-time, no-cost check"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							id: "free-check-heading",
							className: "selena-heading mt-3 text-3xl sm:text-4xl",
							children: "See whether two AI systems mention your domain"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "selena-anchor-lede mt-4 max-w-2xl",
							children: "This verified-account check runs once in ChatGPT and Gemini. It reports only whether your domain was mentioned and the number of citations returned, not answer text or source links."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6",
					children: [
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
							state: error,
							onTryAgain: () => {
								setSubmissionError(null);
								if (queryError) statusQuery.refetch();
							}
						}) : null,
						!error && statusQuery.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PendingStatus, {}) : null,
						!error && statusQuery.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckStatus, { status: statusQuery.data }) : null,
						!error && !statusQuery.isPending && !statusQuery.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "selena-section p-6 sm:p-8",
							onSubmit: submit,
							noValidate: true,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "selena-heading text-2xl",
									children: "Start your check"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm leading-6 text-[#574d45]",
									children: "Enter one public website URL. This is the only information needed."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-6 space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "free-ai-visibility-website",
											children: "Website URL"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "free-ai-visibility-website",
											name: "website",
											type: "url",
											inputMode: "url",
											autoComplete: "url",
											placeholder: "https://example.com",
											value: website,
											onChange: (event) => setWebsite(event.target.value),
											required: true,
											"aria-describedby": "free-ai-visibility-website-hint"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											id: "free-ai-visibility-website-hint",
											className: "text-sm text-[#574d45]",
											children: "We normalize the domain before the check starts."
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									className: "selena-primary-button mt-6 min-h-11",
									type: "submit",
									disabled: claim.isPending,
									"aria-busy": claim.isPending,
									children: [claim.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, {
										className: "size-4 animate-spin",
										"aria-hidden": "true"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSparkles, {
										className: "size-4",
										"aria-hidden": "true"
									}), claim.isPending ? "Starting check" : "Run free two-system check"]
								})
							]
						}) : null
					]
				})
			]
		})
	});
}
function PendingStatus() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section flex items-center gap-3 p-6 sm:p-8",
		role: "status",
		"aria-live": "polite",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, {
			className: "size-5 animate-spin text-[#8f5c34]",
			"aria-hidden": "true"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "selena-heading text-2xl",
			children: "Checking your account"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-[#574d45]",
			children: "We are loading your one-time check status."
		})] })]
	});
}
function ErrorState({ state, onTryAgain }) {
	const content = errorContent[state];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "selena-section p-6 sm:p-8",
		role: "alert",
		"aria-live": "assertive",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAlertCircle, {
				className: "mt-0.5 size-5 shrink-0 text-[#8f5c34]",
				"aria-hidden": "true"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "selena-heading text-2xl",
					children: content.heading
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 leading-6 text-[#574d45]",
					children: content.body
				}),
				state === "EMAIL_VERIFICATION_REQUIRED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					className: "selena-text-button mt-4 inline-flex",
					to: "/auth/login",
					search: { returnTo: "/free-ai-visibility" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconMail, {
						className: "size-4",
						"aria-hidden": "true"
					}), "Sign in again to receive a verification email"]
				}) : null,
				state !== "EMAIL_VERIFICATION_REQUIRED" && state !== "ALREADY_CLAIMED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-4 min-h-11",
					type: "button",
					variant: "outline",
					onClick: onTryAgain,
					children: state === "DOMAIN_INVALID" ? "Edit website" : "Try again"
				}) : null
			] })]
		})
	});
}
function CheckStatus({ status }) {
	if (status.status !== "COMPLETED") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "selena-section p-6 sm:p-8",
		role: "status",
		"aria-live": "polite",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLoader2, {
				className: "mt-0.5 size-5 animate-spin text-[#8f5c34]",
				"aria-hidden": "true"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "selena-heading text-2xl",
				children: status.status === "QUEUED" ? "Your check is queued" : "Confirming your check"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 leading-6 text-[#574d45]",
				children: [
					"We will update this page when the two-system result is ready for ",
					status.domain,
					"."
				]
			})] })]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section p-6 sm:p-8",
		"aria-labelledby": "free-check-result-heading",
		role: "status",
		"aria-live": "polite",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconCheck, {
				className: "mt-0.5 size-5 shrink-0 text-[#52705b]",
				"aria-hidden": "true"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				id: "free-check-result-heading",
				className: "selena-heading text-2xl",
				children: "Your two-system check is ready"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 leading-6 text-[#574d45]",
				children: [
					"Results for ",
					status.domain,
					". These are limited observations from this one check, not a recommendation or future ranking prediction."
				]
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-6 grid gap-3 sm:grid-cols-2",
			children: status.report.systems.map((system) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "rounded-xl border border-[#dccfbe] bg-[#fffdf8] p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-semibold text-[#161413]",
					children: system.system === "chatgpt" ? "ChatGPT" : "Gemini"
				}), system.terminalStatus === "FAILED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-6 text-[#574d45]",
					children: "This system could not be confirmed for this check."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-3 grid gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-[#574d45]",
							children: "Domain mentioned"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-medium text-[#161413]",
							children: system.domainMentioned ? "Yes" : "No"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-[#574d45]",
							children: "Citations returned"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-medium text-[#161413]",
							children: system.citationCount
						})]
					})]
				})]
			}, system.system))
		})]
	});
}
//#endregion
export { FreeAiVisibilityPage as component };

//# sourceMappingURL=free-ai-visibility-D5kXqxGm.mjs.map