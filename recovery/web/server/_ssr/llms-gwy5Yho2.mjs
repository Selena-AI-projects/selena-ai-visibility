import { i as __toESM } from "../_runtime.mjs";
import { N as IconExternalLink, Y as IconArrowUpRight, nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link, x as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as PROVIDERS_DOCS_URL } from "./constants-ChC5ZOH6.mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { r as updateEnabledModelsFn } from "./platform-picks-CbYihqfx.mjs";
import { n as getModelMeta } from "./models-DjvggVKS.mjs";
import { d as premiumModelLabel, i as PLATFORM_TIER_LABELS, o as PREMIUM_MODELS } from "./plans-D-CRwAoX.mjs";
import { t as ModelIcon } from "./model-icon-CXwDenx1.mjs";
import { i as projectSelectionCostUsd, n as PlatformPicker, r as formatUsd, t as PlatformOperatorDetail } from "./platform-picker-CyUiwNgc.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { n as AlertDescription, t as Alert } from "./alert-6CmvZ_CO.mjs";
import { t as Route } from "./llms-CBtNKu_H.mjs";
import { t as UnsavedChangesBar } from "./unsaved-changes-bar-jcpYpDDB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/llms-gwy5Yho2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9da1382e-71bb-4563-9476-5fddd4b56b1a", e._sentryDebugIdIdentifier = "sentry-dbid-9da1382e-71bb-4563-9476-5fddd4b56b1a");
	} catch (e) {}
})();
/**
* How the LLM settings page groups tracked platforms.
*
* The three groups answer different questions about a brand, which is why they
* are separate cards with their own copy rather than one grid of pills: a
* scraped surface tells you what a visitor sees, an ungrounded API call tells
* you what the model already believes, and a grounded one tells you what it
* finds and cites. They also behave differently — grounded calls cost roughly
* ten times an ungrounded one, so in cloud they are metered per prompt instead
* of picked per brand.
*
* The tiers themselves — their ids and names — belong to the plan catalog,
* which prices them. Only the long descriptions live here, because this page is
* the one surface with room for them.
*/
var GROUP_DESCRIPTIONS = {
	scraped: "Driven the way a person would, then read back from the answer they render. You see what a real visitor sees.",
	api: "Called directly, with no web search.",
	premium: "Called directly with the model's own web-search tool switched on, so the answer is grounded in live sources and cites them."
};
/** Which group an option belongs to. The one place that rule is decided. */
function platformGroupId(option) {
	if (option.access === "scraped") return "scraped";
	return option.webSearch ? "premium" : "api";
}
/**
* Split options into their groups, cheapest signal first, dropping any group the
* instance configures nothing for. Order within a group is preserved so it keeps
* following SCRAPE_TARGETS.
*/
function groupPlatformOptions(options) {
	return [
		"scraped",
		"api",
		"premium"
	].map((id) => ({
		id,
		...platformGroupCopy(id),
		options: options.filter((option) => platformGroupId(option) === id)
	})).filter((group) => group.options.length > 0);
}
function platformGroupCopy(id) {
	return {
		title: PLATFORM_TIER_LABELS[id],
		description: GROUP_DESCRIPTIONS[id]
	};
}
/**
* /app/$brand/settings/llms - LLM configuration page
*
* Which platforms a brand is tracked against, grouped by what each group tells
* you: a scraped engine shows what a visitor sees, an ungrounded API call shows
* what a model already believes, and a grounded one shows what it finds and
* cites. Grounded calls cost roughly ten times an ungrounded one, so in cloud
* they are metered per prompt instead of picked per brand.
*
* Picks are buffered and saved together from the bar at the bottom, matching the
* prompts editor. The server functions hold the real limits; this page only
* renders them.
*/
function LlmsSettingsPage() {
	const { picker, premium } = Route.useLoaderData();
	const singlePlatform = picker.planLimits?.platformPicks === 1 && picker.available.length === 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-6xl space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-bold",
				children: "LLMs"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground",
				children: "Your prompts are evaluated against these AI models to track how your brand appears across different types of AI search."
			})] }),
			singlePlatform ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SinglePlatformSummary, { picker }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformGroups, { picker }),
			premium.available && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PremiumApiPool, { premium }),
			picker.unconfiguredPlatforms.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddPlatformsCard, { platforms: picker.unconfiguredPlatforms })
		]
	});
}
/**
* The pickable tiers, in one card divided by tier. They answer different
* questions about a brand — a scraped surface shows what a visitor sees, an API
* call what the model already believes — but they spend a single pick budget, and
* as separate cards they read as separate allowances.
*/
function PlatformGroups({ picker }) {
	const { brand: brandId } = Route.useParams();
	const router = useRouter();
	const stored = new Set(picker.enabledModels ?? picker.available.map((m) => m.model));
	const [selected, setSelected] = (0, import_react.useState)(stored);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const groups = groupPlatformOptions(picker.available);
	const limit = picker.planLimits?.platformPicks ?? null;
	const costBasis = picker.costBasis;
	const spend = costBasis ? {
		saved: projectSelectionCostUsd(picker.available, stored, costBasis),
		next: projectSelectionCostUsd(picker.available, selected, costBasis)
	} : null;
	const overLimit = limit !== null && selected.size > limit;
	const isDirty = selected.size !== stored.size || [...selected].some((m) => !stored.has(m));
	const save = async () => {
		setSaving(true);
		setError(null);
		try {
			await updateEnabledModelsFn({ data: {
				brandId,
				models: [...selected]
			} });
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save platform picks");
		} finally {
			setSaving(false);
		}
	};
	if (picker.available.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Tracked platforms" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "text-sm text-muted-foreground",
		children: [
			"No models are configured on this deployment. Set ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
				className: "font-mono text-xs",
				children: "SCRAPE_TARGETS"
			}),
			"."
		]
	}) })] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			spend && costBasis && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [
						"Estimated provider spend for this brand: ",
						costBasis.enabledPrompts,
						" tracked prompt",
						costBasis.enabledPrompts === 1 ? "" : "s",
						" sampled ",
						costBasis.runsPerDay,
						"×/day across the platforms below."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					variant: "secondary",
					className: "font-mono tabular-nums",
					children: [
						"≈",
						formatUsd(spend.saved),
						"/mo"
					]
				})]
			}),
			limit !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [
						"Your plan tracks up to ",
						limit,
						" platform",
						limit === 1 ? "" : "s",
						" for this brand, in any combination below. Changes apply from the next sampling cycle."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					variant: overLimit ? "destructive" : "secondary",
					children: [
						selected.size,
						" / ",
						limit,
						" picks"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "gap-0 py-0",
				children: groups.map((group, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("flex flex-col gap-6 py-6", index > 0 && "border-t"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: group.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: group.description })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformPicker, {
						options: group.options,
						selected,
						onSelectedChange: setSelected,
						limit,
						disabled: saving
					}) })]
				}, group.id))
			}),
			picker.upgradeOptions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UpgradePanel, {
				options: picker.upgradeOptions,
				brandId
			}),
			selected.size === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				variant: "destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDescription, { children: "Pick at least one platform — a brand with none is not tracked." })
			}),
			overLimit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				variant: "destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDescription, { children: [
					"That is ",
					selected.size - (limit ?? 0),
					" more than your plan allows. Clear some, or upgrade."
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnsavedChangesBar, {
				isDirty: isDirty && selected.size > 0 && !overLimit,
				isSaving: saving,
				summary: summarizeSelection(selected.size, spend),
				error,
				onSave: save,
				onDiscard: () => {
					setSelected(stored);
					setError(null);
				}
			})
		]
	});
}
/** What the bar says: how many platforms, and where saving leaves the bill. */
function summarizeSelection(count, spend) {
	const platforms = `${count} platform${count === 1 ? "" : "s"} selected`;
	if (!spend) return platforms;
	const direction = spend.next > spend.saved ? "up from" : spend.next < spend.saved ? "down from" : "unchanged from";
	return `${platforms} · ≈${formatUsd(spend.next)}/mo, ${direction} ${formatUsd(spend.saved)}`;
}
/**
* What a higher plan would add, in the same tiers as the cards above. A single
* wrapped sentence of platform names was unreadable once a plan was missing more
* than a couple, so each name is its own chip and each tier its own row.
*/
function UpgradePanel({ options, brandId }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3 rounded-md border border-dashed p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium",
				children: "Upgrade to track more platforms"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2.5",
				children: groupPlatformOptions(options).map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: group.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1.5",
						children: group.options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
								iconId: getModelMeta(option.model).iconId,
								className: "size-3.5"
							}), getModelMeta(option.model).label]
						}, option.model))
					})]
				}, group.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				size: "sm",
				variant: "outline",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/app/$brand/settings/billing",
					params: { brand: brandId },
					children: ["Compare plans", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowUpRight, { className: "h-4 w-4" })]
				})
			})
		]
	});
}
/**
* A plan with a single platform has nothing to choose, so it states what is
* tracked and what an upgrade would add.
*/
function SinglePlatformSummary({ picker }) {
	const { brand: brandId } = Route.useParams();
	const option = picker.available[0];
	const copy = platformGroupCopy(platformGroupId(option));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: copy.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: copy.description })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 rounded-md border p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
						iconId: getModelMeta(option.model).iconId,
						className: "size-5"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1 text-sm font-medium",
						children: getModelMeta(option.model).label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformOperatorDetail, { option })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Your plan tracks one platform for this brand."
			}),
			picker.upgradeOptions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UpgradePanel, {
				options: picker.upgradeOptions,
				brandId
			})
		]
	})] });
}
/**
* The premium group in cloud: a grounded call is an allowance rather than a pick,
* so this card reports the pool and points at the two places that change it —
* billing for how many slots, the prompts editor for which prompts and models
* spend them.
*/
function PremiumApiPool({ premium }) {
	const { brand: brandId } = Route.useParams();
	const copy = platformGroupCopy("premium");
	const remaining = Math.max(0, premium.total - premium.assigned);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
		className: "flex items-center justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: copy.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
			variant: remaining === 0 ? "destructive" : "secondary",
			children: [
				premium.assigned,
				" / ",
				premium.total,
				" pairings"
			]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: copy.description })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: PREMIUM_MODELS.map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 rounded-md border p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
							iconId: getModelMeta(model).iconId,
							className: "size-5"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex-1 text-sm font-medium",
							children: premiumModelLabel(model)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-[10px] text-muted-foreground tabular-nums",
							children: [1, "×/day"]
						})
					]
				}, model))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: remaining > 0 ? `${remaining} of ${premium.total} pairings still available, shared across every brand in this workspace. A prompt spends one for each model you track it on.` : `All ${premium.total} pairings are in use. Free one up or buy more to add another.`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "outline",
					size: "sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/$brand/settings/prompts",
						params: { brand: brandId },
						children: "Choose prompts"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "ghost",
					size: "sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/app/$brand/settings/billing",
						params: { brand: brandId },
						children: ["Change how many", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowUpRight, { className: "h-4 w-4" })]
					})
				})]
			})
		]
	})] });
}
/**
* Self-hosted only: what else Elmo can track, and which provider account each
* one needs. Every suggestion comes from a combination the provider status
* workflow exercises, so none of them is aspirational.
*
* Scrapers and direct APIs are separate columns because they are not
* interchangeable — Perplexity through BrightData returns the surface a visitor
* sees, while Perplexity through OpenRouter returns the model's own answer. A
* single list of provider names hid that choice.
*/
var PROVIDER_COLUMNS = [{
	access: "scraped",
	header: "Scrapers"
}, {
	access: "api",
	header: "Direct APIs"
}];
var PROVIDER_GRID = "grid grid-cols-[minmax(7rem,1fr)_1.5fr_1fr] gap-x-4";
function AddPlatformsCard({ platforms }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Track more platforms" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
		"Add these to ",
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
			className: "font-mono text-xs",
			children: "SCRAPE_TARGETS"
		}),
		" to start tracking them. One account is enough, but which kind you pick changes the data: a scraper reads the product a visitor uses, an API asks the model directly."
	] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `${PROVIDER_GRID} gap-y-2 border-b pb-2 text-xs font-medium text-muted-foreground`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Platform" }), PROVIDER_COLUMNS.map((column) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: column.header }, column.access))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "divide-y",
				children: platforms.map((platform) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `${PROVIDER_GRID} items-start gap-y-1 py-2`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-2 text-sm font-medium",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelIcon, {
							iconId: getModelMeta(platform.model).iconId,
							className: "size-4 shrink-0"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: getModelMeta(platform.model).label
						})]
					}), PROVIDER_COLUMNS.map((column) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderLinks, { providers: platform.providers.filter((provider) => provider.access === column.access) }, column.access))]
				}, platform.model))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				variant: "outline",
				size: "sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: PROVIDERS_DOCS_URL,
					target: "_blank",
					rel: "noopener noreferrer",
					children: ["Provider setup guide", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, { className: "h-4 w-4" })]
				})
			})
		]
	})] });
}
/** A cell's providers, or a dash when a platform can't be reached that way. */
function ProviderLinks({ providers }) {
	if (providers.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-sm text-muted-foreground",
		children: "—"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "flex flex-wrap gap-x-2 gap-y-1",
		children: providers.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: provider.docsUrl,
			target: "_blank",
			rel: "noopener noreferrer",
			className: "text-sm text-muted-foreground underline decoration-dotted hover:text-foreground",
			children: provider.name
		}, provider.id))
	});
}
//#endregion
export { LlmsSettingsPage as component };

//# sourceMappingURL=llms-gwy5Yho2.mjs.map