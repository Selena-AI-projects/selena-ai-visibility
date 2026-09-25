import { i as __toESM } from "../_runtime.mjs";
import { A as IconInfoCircle, C as IconLogout, D as IconListDetails, F as IconDashboard, G as IconBuildings, I as IconCreditCard, J as IconBrandGithub, K as IconBuilding, L as IconCpu, N as IconExternalLink, O as IconLink, W as IconChartBar, a as IconTool, c as IconTable, d as IconSpeakerphone, g as IconReport, i as IconUser, k as IconKey, m as IconSelector, n as IconWorld, nt as require_react, o as IconTimeline, p as IconSitemap, r as IconUsers, s as IconTarget, u as IconStatusChange } from "../_libs/react+tabler__icons-react.mjs";
import { t as Slot } from "./dist-B2Wsyazf.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { a as useLocation, g as useRouteContext, m as Link, y as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as resetPostHog } from "./posthog-DaElL-hv.mjs";
import { t as Primitive } from "./dist-Dkr14p02.mjs";
import { t as Separator } from "./separator-D7PdY237.mjs";
import { t as Logo } from "./logo-Bdm1AKfI.mjs";
import { i as useLayoutEffect2 } from "./dist-BUa3vsWH.mjs";
import { t as createContextScope } from "./dist-NquxrNib.mjs";
import { r as useCallbackRef } from "./dist-1xKXGPiL.mjs";
import { i as TooltipTrigger, n as TooltipContent, t as Tooltip } from "./tooltip-BswNQ_0y.mjs";
import { N as ChevronRight } from "../_libs/lucide-react.mjs";
import { a as SidebarGroupLabel, c as SidebarMenu, f as SidebarTrigger, i as SidebarGroup, l as SidebarMenuButton, n as SidebarContent, o as SidebarHeader, p as useSidebar, r as SidebarFooter, t as Sidebar, u as SidebarMenuItem } from "./sidebar-DNi-GjZe.mjs";
import { n as useBrand } from "./use-brands-CqDybx5x.mjs";
import { t as authClient } from "./client-CSZfU_Y2.mjs";
import { a as DropdownMenuLabel, c as DropdownMenuSeparator, i as DropdownMenuItem, l as DropdownMenuTrigger, n as DropdownMenuContent, r as DropdownMenuGroup, t as DropdownMenu } from "./dropdown-menu-_EIWZQsZ.mjs";
import { t as useAuth } from "./use-auth-CC3osVLV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/site-header-DM9jZ_Ek.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "bb19348f-c82d-4548-9012-1f21615ed098", e._sentryDebugIdIdentifier = "sentry-dbid-bb19348f-c82d-4548-9012-1f21615ed098");
	} catch (e) {}
})();
function DemoModePill() {
	if (!(useRouteContext({ strict: false }).clientConfig?.features.readOnly ?? false)) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconInfoCircle, { className: "size-3" }), "Demo"]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "This is a read-only demo. Any edits will fail." })] });
}
function NavAppInfo() {
	if (useRouteContext({ strict: false }).clientConfig?.mode === "whitelabel") return null;
	const linkClass = "text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-2 mt-1 flex items-center gap-2 border-t border-sidebar-border/60 px-1 pt-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
			href: `https://github.com/elmohq/elmo/releases/tag/v0.2.19`,
			target: "_blank",
			rel: "noreferrer",
			className: "flex-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
			children: ["v", "0.2.19"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "https://www.elmohq.com/",
					target: "_blank",
					rel: "noreferrer",
					className: linkClass,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconWorld, { className: "size-4" })
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "elmohq.com" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "https://github.com/elmohq/elmo",
					target: "_blank",
					rel: "noreferrer",
					className: linkClass,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBrandGithub, { className: "size-4" })
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "View on GitHub" })] })]
		})]
	});
}
function NavMain({ groups }) {
	const brandId = useParams({ strict: false }).brand;
	const { setOpenMobile } = useSidebar();
	const pathname = useLocation().pathname;
	const getHref = (url, absolute) => {
		return absolute ? url : `/app/${brandId}${url}`;
	};
	const isActive = (url, absolute) => {
		const href = getHref(url, absolute);
		if (href === `/app/${brandId}` || href === `/app/${brandId}/`) return pathname === `/app/${brandId}` || pathname === `/app/${brandId}/`;
		return pathname.startsWith(href);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarGroup, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarGroupLabel, { children: group.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenu, { children: group.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuButton, {
		asChild: true,
		tooltip: item.title,
		isActive: isActive(item.url, item.absolute),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: getHref(item.url, item.absolute),
			onClick: () => setOpenMobile(false),
			children: [item.icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.title })]
		})
	}) }, item.title)) })] }, group.label)) });
}
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
	value,
	configurable: true
});
var AVATAR_NAME = "Avatar";
var [createAvatarContext, createAvatarScope] = createContextScope(AVATAR_NAME);
var STATIC_IMAGE_COUNT_STATE = [0, () => void 0];
var [AvatarProvider, useAvatarContext] = createAvatarContext(AVATAR_NAME);
var Avatar$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function Avatar2(props, forwardedRef) {
	const { __scopeAvatar, ...avatarProps } = props;
	const [imageLoadingStatus, setImageLoadingStatus] = import_react.useState("idle");
	const [imageCount, setImageCount] = useImageCount();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarProvider, {
		scope: __scopeAvatar,
		imageLoadingStatus,
		setImageLoadingStatus,
		imageCount,
		setImageCount,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.span, {
			...avatarProps,
			ref: forwardedRef
		})
	});
}, "Avatar"));
var IMAGE_NAME = "AvatarImage";
var AvatarImage$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function AvatarImage2(props, forwardedRef) {
	const { __scopeAvatar, src, onLoadingStatusChange, ...imageProps } = props;
	const context = useAvatarContext(IMAGE_NAME, __scopeAvatar);
	context.setImageCount;
	const imageLoadingStatus = useImageLoadingStatus(src, {
		referrerPolicy: imageProps.referrerPolicy,
		crossOrigin: imageProps.crossOrigin,
		loadingStatus: context.imageLoadingStatus,
		setLoadingStatus: context.setImageLoadingStatus
	});
	const handleLoadingStatusChange = useCallbackRef((status) => {
		onLoadingStatusChange?.(status);
	});
	const loadingStatusRef = import_react.useRef(imageLoadingStatus);
	useLayoutEffect2(() => {
		const previousLoadingStatus = loadingStatusRef.current;
		loadingStatusRef.current = imageLoadingStatus;
		if (imageLoadingStatus !== previousLoadingStatus) handleLoadingStatusChange(imageLoadingStatus);
	}, [imageLoadingStatus, handleLoadingStatusChange]);
	return imageLoadingStatus === "loaded" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.img, {
		...imageProps,
		ref: forwardedRef,
		src
	}) : null;
}, "AvatarImage"));
var FALLBACK_NAME = "AvatarFallback";
var AvatarFallback$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function AvatarFallback2(props, forwardedRef) {
	const { __scopeAvatar, delayMs, ...fallbackProps } = props;
	const context = useAvatarContext(FALLBACK_NAME, __scopeAvatar);
	const [canRender, setCanRender] = import_react.useState(delayMs === void 0);
	import_react.useEffect(() => {
		if (delayMs !== void 0) {
			const timerId = window.setTimeout(() => setCanRender(true), delayMs);
			return () => window.clearTimeout(timerId);
		}
	}, [delayMs]);
	return canRender && context.imageLoadingStatus !== "loaded" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.span, {
		...fallbackProps,
		ref: forwardedRef
	}) : null;
}, "AvatarFallback"));
function useImageLoadingStatus(src, { loadingStatus, setLoadingStatus, referrerPolicy, crossOrigin }) {
	useLayoutEffect2(() => {
		if (!src) {
			setLoadingStatus("error");
			return;
		}
		const image = new window.Image();
		const handleLoad = /* @__PURE__ */ __name((event) => {
			const image2 = event.currentTarget;
			setLoadingStatus(getImageLoadingStatus(image2));
		}, "handleLoad");
		const handleError = /* @__PURE__ */ __name(() => setLoadingStatus("error"), "handleError");
		image.addEventListener("load", handleLoad);
		image.addEventListener("error", handleError);
		if (referrerPolicy) image.referrerPolicy = referrerPolicy;
		image.crossOrigin = crossOrigin ?? null;
		image.src = src;
		setLoadingStatus(getImageLoadingStatus(image));
		return () => {
			image.removeEventListener("load", handleLoad);
			image.removeEventListener("error", handleError);
			setLoadingStatus("idle");
		};
	}, [
		src,
		crossOrigin,
		referrerPolicy,
		setLoadingStatus
	]);
	return loadingStatus;
}
__name(useImageLoadingStatus, "useImageLoadingStatus");
function getImageLoadingStatus(image) {
	return image.complete ? image.naturalWidth > 0 ? "loaded" : "error" : "loading";
}
__name(getImageLoadingStatus, "getImageLoadingStatus");
function useImageCount() {
	return STATIC_IMAGE_COUNT_STATE;
}
__name(useImageCount, "useImageCount");
function useUpdateImageCount(setImageCount) {}
__name(useUpdateImageCount, "useUpdateImageCount");
function Avatar({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar$1, {
		"data-slot": "avatar",
		className: cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className),
		...props
	});
}
function AvatarImage({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarImage$1, {
		"data-slot": "avatar-image",
		className: cn("aspect-square size-full", className),
		...props
	});
}
function AvatarFallback({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarFallback$1, {
		"data-slot": "avatar-fallback",
		className: cn("bg-muted flex size-full items-center justify-center rounded-full", className),
		...props
	});
}
/** `canSwitchBrand` is false on gate pages, where /app just redirects back. */
function NavUser({ canSwitchBrand = true } = {}) {
	const { user } = useAuth();
	const { isMobile, setOpenMobile } = useSidebar();
	const clientConfig = useRouteContext({ strict: false }).clientConfig;
	if (!user) return null;
	const isNameEmailSame = user.name?.trim().toLowerCase() === user.email?.trim().toLowerCase();
	const branding = clientConfig?.branding;
	const parentDashboard = branding?.parentUrl && branding?.parentName ? {
		url: branding.parentUrl,
		name: branding.parentName
	} : null;
	const hasDestinations = canSwitchBrand || parentDashboard !== null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenu, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarMenuButton, {
			size: "lg",
			className: "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Avatar, {
					className: "h-8 w-8 rounded-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarImage, {
						src: user.picture,
						alt: user.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarFallback, {
						className: "rounded-lg bg-primary/10 text-primary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconUser, { className: "size-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid flex-1 text-left text-sm leading-tight",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate font-medium",
						children: user.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate text-xs",
						children: isNameEmailSame ? "Your Account" : user.email
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSelector, { className: "ml-auto size-4" })
			]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
		className: "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg",
		side: isMobile ? "bottom" : "right",
		align: "end",
		sideOffset: 4,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuLabel, {
				className: "p-0 font-normal",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 px-1 py-1.5 text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Avatar, {
						className: "h-8 w-8 rounded-lg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarImage, {
							src: user.picture,
							alt: user.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarFallback, {
							className: "rounded-lg bg-primary/10 text-primary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconUser, { className: "size-4" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid flex-1 text-left text-sm leading-tight",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate font-medium",
							children: user.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate text-xs",
							children: isNameEmailSame ? "Your Account" : user.email
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
			hasDestinations && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuGroup, { children: [canSwitchBrand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
				asChild: true,
				className: "cursor-pointer",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/app",
					onClick: () => setOpenMobile(false),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconStatusChange, {}), "Switch Brand"]
				})
			}), parentDashboard && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
				asChild: true,
				className: "cursor-pointer",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: parentDashboard.url,
					target: "_blank",
					rel: "noreferrer",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, {}),
						parentDashboard.name,
						" Dashboard"
					]
				})
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
				className: "cursor-pointer",
				onClick: () => {
					authClient.signOut({ fetchOptions: { onSuccess: () => {
						resetPostHog();
						window.location.href = "/auth/logout";
					} } });
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLogout, {}), "Log out"]
			})
		]
	})] }) }) });
}
function AppSidebar({ isAdmin = false, hasReportAccess = false, scope = "brand", brand, ...props }) {
	const { setOpenMobile } = useSidebar();
	const context = useRouteContext({ strict: false });
	const reportsEnabled = context.clientConfig?.features.reportGeneration ?? true;
	const showAdminSection = scope !== "account" && (isAdmin || hasReportAccess && reportsEnabled);
	const groups = [];
	if (scope === "brand") {
		const dashboardItems = [{
			title: "Overview",
			url: "/",
			icon: IconDashboard
		}];
		if (brand?.onboarded) dashboardItems.push({
			title: "Visibility",
			url: "/visibility",
			icon: IconChartBar
		}, {
			title: "Share of Voice",
			url: "/share-of-voice",
			icon: IconSpeakerphone
		}, {
			title: "Query Fan-Out",
			url: "/query-fan-out",
			icon: IconSitemap
		}, {
			title: "Citations",
			url: "/citations",
			icon: IconLink
		}, {
			title: "Opportunities",
			url: "/opportunities",
			icon: IconTarget
		});
		groups.push({
			label: "Dashboard",
			items: dashboardItems
		});
		if (brand?.onboarded) groups.push({
			label: "Settings",
			items: [
				{
					title: "Brand",
					url: "/settings/brand",
					icon: IconBuilding
				},
				{
					title: "Competitors",
					url: "/settings/competitors",
					icon: IconBuildings
				},
				{
					title: "Prompts",
					url: "/settings/prompts",
					icon: IconListDetails
				},
				{
					title: "LLMs",
					url: "/settings/llms",
					icon: IconCpu
				},
				...context.clientConfig?.features.teamInvites ? [{
					title: "Team",
					url: "/settings/members",
					icon: IconUsers
				}] : [],
				...context.clientConfig?.features.billing ? [{
					title: "Billing",
					url: "/settings/billing",
					icon: IconCreditCard
				}] : []
			]
		});
	}
	if (showAdminSection) {
		const reportsItem = {
			title: "Reports",
			url: "/reports",
			icon: IconReport,
			absolute: true
		};
		const adminItems = isAdmin ? [
			{
				title: "Brands",
				url: "/admin",
				icon: IconTable,
				absolute: true
			},
			...reportsEnabled ? [reportsItem] : [],
			{
				title: "Workflows",
				url: "/admin/workflows",
				icon: IconTimeline,
				absolute: true
			},
			{
				title: "Tools",
				url: "/admin/tools",
				icon: IconTool,
				absolute: true
			},
			{
				title: "Providers",
				url: "/admin/providers",
				icon: IconKey,
				absolute: true
			}
		] : [reportsItem];
		groups.push({
			label: "Admin",
			items: adminItems
		});
	}
	const brandmark = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, { iconClassName: "!size-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "ml-auto group-data-[collapsible=icon]:hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DemoModePill, {})
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sidebar, {
		variant: "inset",
		...props,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenu, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuItem, { children: scope === "account" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-2 p-2",
				children: brandmark
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuButton, {
				size: "lg",
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app",
					onClick: () => setOpenMobile(false),
					children: brandmark
				})
			}) }) }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavMain, { groups }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavUser, { canSwitchBrand: scope !== "account" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavAppInfo, {})] })
		]
	});
}
function Breadcrumb({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		"aria-label": "breadcrumb",
		"data-slot": "breadcrumb",
		...props
	});
}
function BreadcrumbList({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		"data-slot": "breadcrumb-list",
		className: cn("text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5", className),
		...props
	});
}
function BreadcrumbItem({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
		"data-slot": "breadcrumb-item",
		className: cn("inline-flex items-center gap-1.5", className),
		...props
	});
}
function BreadcrumbLink({ asChild, className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "a", {
		"data-slot": "breadcrumb-link",
		className: cn("hover:text-foreground transition-colors", className),
		...props
	});
}
function BreadcrumbPage({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"data-slot": "breadcrumb-page",
		role: "link",
		"aria-disabled": "true",
		"aria-current": "page",
		className: cn("text-foreground font-normal", className),
		...props
	});
}
function BreadcrumbSeparator({ children, className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
		"data-slot": "breadcrumb-separator",
		role: "presentation",
		"aria-hidden": "true",
		className: cn("[&>svg]:size-3.5", className),
		...props,
		children: children ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {})
	});
}
/** Map of page segments to display names */
var PAGE_NAMES = {
	visibility: "Visibility",
	"share-of-voice": "Share of Voice",
	"query-fan-out": "Query Fan-Out",
	opportunities: "Opportunities",
	prompts: "Prompts",
	citations: "Citations",
	brand: "Brand",
	competitors: "Competitors",
	llms: "LLMs",
	workflows: "Workflows",
	tools: "Tools"
};
function getPageDisplayName(segment) {
	return PAGE_NAMES[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}
function AdminBreadcrumbs({ pathname }) {
	const segments = pathname.split("/").filter(Boolean);
	if (segments[0] === "reports") {
		if (segments.length > 1) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbLink, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/reports",
						children: "Reports"
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbSeparator, { className: "hidden md:block" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: "View Report" }) })
		] });
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: "Admin"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbSeparator, { className: "hidden md:block" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: "Reports" }) })
		] });
	}
	if (segments.length === 1) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, {
			className: "hidden md:block",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground",
				children: "Admin"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbSeparator, { className: "hidden md:block" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: "Brands" }) })
	] });
	const subPage = segments[1];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, {
			className: "hidden md:block",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground",
				children: "Admin"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbSeparator, { className: "hidden md:block" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: getPageDisplayName(subPage) }) })
	] });
}
function BrandBreadcrumbs({ pathname, brandId, brandName }) {
	const pathSegments = pathname.split("/");
	const brandIndex = pathSegments.findIndex((segment) => segment === "app");
	const pageSegment = brandIndex >= 0 && pathSegments[brandIndex + 2] ? pathSegments[brandIndex + 2] : "";
	const subSegment = brandIndex >= 0 && pathSegments[brandIndex + 3] ? pathSegments[brandIndex + 3] : "";
	const isPromptDetailPage = pageSegment === "prompts" && subSegment && subSegment !== "edit" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subSegment);
	const isEditPage = pathname.endsWith("/edit");
	const isSettingsSubPage = pageSegment === "settings" && subSegment;
	const pageName = pageSegment ? getPageDisplayName(pageSegment) : "Overview";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, {
			className: "hidden md:block",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbLink, {
				asChild: true,
				children: brandId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app/$brand",
					params: { brand: brandId },
					children: brandName
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: brandName })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbSeparator, { className: "hidden md:block" }),
		isPromptDetailPage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbLink, {
					asChild: true,
					children: brandId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/$brand/visibility",
						params: { brand: brandId },
						children: "Visibility"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Visibility" })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbSeparator, { className: "hidden md:block" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: "Prompt History" }) })
		] }) : isSettingsSubPage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: "Settings"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbSeparator, { className: "hidden md:block" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: getPageDisplayName(subSegment) }) })
		] }) : isEditPage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbLink, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: pathname.slice(0, -5),
						children: pageName
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbSeparator, { className: "hidden md:block" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: "Edit" }) })
		] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: pageName }) })
	] });
}
/**
* `title` names a page that sits outside the brand and admin trees, where there
* is no trail to derive — the breadcrumb becomes that one label.
*/
function SiteHeader({ title } = {}) {
	const { brandId, brand } = useBrand();
	const { pathname } = useLocation();
	const isAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/reports");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarTrigger, { className: "-ml-1 cursor-pointer" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
					orientation: "vertical",
					className: "mx-2 data-[orientation=vertical]:h-4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Breadcrumb, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbList, { children: title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BreadcrumbPage, { children: title }) }) : isAdminPage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminBreadcrumbs, { pathname }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandBreadcrumbs, {
					pathname,
					brandId,
					brandName: brand?.name || "Dashboard"
				}) }) })
			]
		})
	});
}
//#endregion
export { SiteHeader as n, AppSidebar as t };

//# sourceMappingURL=site-header-DM9jZ_Ek.mjs.map