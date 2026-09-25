import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { i as useComposedRefs, n as createSlot } from "./dist-B2Wsyazf.mjs";
import { n as cn } from "./utils-D1_nNGq4.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as dispatchDiscreteCustomEvent, t as Primitive } from "./dist-Dkr14p02.mjs";
import { n as composeEventHandlers, r as useControllableState, t as Presence } from "./dist-BUa3vsWH.mjs";
import { t as createContextScope } from "./dist-NquxrNib.mjs";
import { a as useId$1, n as Portal$1, r as useCallbackRef, t as DismissableLayer } from "./dist-1xKXGPiL.mjs";
import { i as useFocusGuards, n as ReactRemoveScroll, r as hideOthers, t as FocusScope } from "./es2015-DqFfANlx.mjs";
import { a as Root2$1, r as Content, s as createPopperScope, t as Anchor } from "./dist-DMggANG0.mjs";
import { O as Circle } from "../_libs/lucide-react.mjs";
import { n as useDirection, t as createCollection } from "./dist-BBk_4MHb.mjs";
import { n as Root, r as createRovingFocusGroupScope, t as Item } from "./dist-BpVimTz4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dropdown-menu-_EIWZQsZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c6a37e39-912e-4979-adf0-4268a553d851", e._sentryDebugIdIdentifier = "sentry-dbid-c6a37e39-912e-4979-adf0-4268a553d851");
	} catch (e) {}
})();
var __defProp$1 = Object.defineProperty;
var __name$1 = (target, value) => __defProp$1(target, "name", {
	value,
	configurable: true
});
var SELECTION_KEYS = ["Enter", " "];
var FIRST_KEYS = [
	"ArrowDown",
	"PageUp",
	"Home"
];
var LAST_KEYS = [
	"ArrowUp",
	"PageDown",
	"End"
];
var FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
[...SELECTION_KEYS], [...SELECTION_KEYS];
var MENU_NAME = "Menu";
var [Collection, useCollection, createCollectionScope] = createCollection(MENU_NAME);
var [createMenuContext, createMenuScope] = createContextScope(MENU_NAME, [
	createCollectionScope,
	createPopperScope,
	createRovingFocusGroupScope
]);
var usePopperScope = createPopperScope();
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var [MenuProvider, useMenuContext] = createMenuContext(MENU_NAME);
var [MenuRootProvider, useMenuRootContext] = createMenuContext(MENU_NAME);
var Menu = /* @__PURE__ */ __name$1((props) => {
	const { __scopeMenu, open = false, children, dir, onOpenChange, modal = true } = props;
	const popperScope = usePopperScope(__scopeMenu);
	const [content, setContent] = import_react.useState(null);
	const isUsingKeyboardRef = import_react.useRef(false);
	const handleOpenChange = useCallbackRef(onOpenChange);
	const direction = useDirection(dir);
	import_react.useEffect(() => {
		const handleKeyDown = /* @__PURE__ */ __name$1(() => {
			isUsingKeyboardRef.current = true;
			document.addEventListener("pointerdown", handlePointer, {
				capture: true,
				once: true
			});
			document.addEventListener("pointermove", handlePointer, {
				capture: true,
				once: true
			});
		}, "handleKeyDown");
		const handlePointer = /* @__PURE__ */ __name$1(() => isUsingKeyboardRef.current = false, "handlePointer");
		document.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			document.removeEventListener("keydown", handleKeyDown, { capture: true });
			document.removeEventListener("pointerdown", handlePointer, { capture: true });
			document.removeEventListener("pointermove", handlePointer, { capture: true });
		};
	}, []);
	import_react.useEffect(() => {
		if (!open) return;
		const handleBlur = /* @__PURE__ */ __name$1(() => handleOpenChange(false), "handleBlur");
		window.addEventListener("blur", handleBlur);
		return () => window.removeEventListener("blur", handleBlur);
	}, [open, handleOpenChange]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2$1, {
		...popperScope,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuProvider, {
			scope: __scopeMenu,
			open,
			onOpenChange: handleOpenChange,
			content,
			onContentChange: setContent,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRootProvider, {
				scope: __scopeMenu,
				onClose: import_react.useCallback(() => handleOpenChange(false), [handleOpenChange]),
				isUsingKeyboardRef,
				dir: direction,
				modal,
				children
			})
		})
	});
}, "Menu");
var MenuAnchor = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuAnchor2(props, forwardedRef) {
	const { __scopeMenu, ...anchorProps } = props;
	const popperScope = usePopperScope(__scopeMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Anchor, {
		...popperScope,
		...anchorProps,
		ref: forwardedRef
	});
}, "MenuAnchor"));
var PORTAL_NAME = "MenuPortal";
var [PortalProvider, usePortalContext] = createMenuContext(PORTAL_NAME, { forceMount: void 0 });
var MenuPortal = /* @__PURE__ */ __name$1((props) => {
	const { __scopeMenu, forceMount, children, container } = props;
	const context = useMenuContext(PORTAL_NAME, __scopeMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortalProvider, {
		scope: __scopeMenu,
		forceMount,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
			present: forceMount || context.open,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal$1, {
				asChild: true,
				container,
				children
			})
		})
	});
}, "MenuPortal");
var CONTENT_NAME$1 = "MenuContent";
var [MenuContentProvider, useMenuContentContext] = createMenuContext(CONTENT_NAME$1);
var MenuContent = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuContent2(props, forwardedRef) {
	const portalContext = usePortalContext(CONTENT_NAME$1, props.__scopeMenu);
	const { forceMount = portalContext.forceMount, ...contentProps } = props;
	const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
	const rootContext = useMenuRootContext(CONTENT_NAME$1, props.__scopeMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Collection.Provider, {
		scope: props.__scopeMenu,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
			present: forceMount || context.open,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Collection.Slot, {
				scope: props.__scopeMenu,
				children: rootContext.modal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRootContentModal, {
					...contentProps,
					ref: forwardedRef
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuRootContentNonModal, {
					...contentProps,
					ref: forwardedRef
				})
			})
		})
	});
}, "MenuContent"));
var MenuRootContentModal = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuRootContentModal2(props, forwardedRef) {
	const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
	const ref = import_react.useRef(null);
	const composedRefs = useComposedRefs(forwardedRef, ref);
	import_react.useEffect(() => {
		const content = ref.current;
		if (content) return hideOthers(content);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuContentImpl, {
		...props,
		ref: composedRefs,
		trapFocus: context.open,
		disableOutsidePointerEvents: context.open,
		disableOutsideScroll: true,
		onFocusOutside: composeEventHandlers(props.onFocusOutside, (event) => event.preventDefault(), { checkForDefaultPrevented: false }),
		onDismiss: () => context.onOpenChange(false)
	});
}, "MenuRootContentModal"));
var MenuRootContentNonModal = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuRootContentNonModal2(props, forwardedRef) {
	const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuContentImpl, {
		...props,
		ref: forwardedRef,
		trapFocus: false,
		disableOutsidePointerEvents: false,
		disableOutsideScroll: false,
		onDismiss: () => context.onOpenChange(false)
	});
}, "MenuRootContentNonModal"));
var Slot = createSlot("MenuContent.ScrollLock");
var MenuContentImpl = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuContentImpl2(props, forwardedRef) {
	const { __scopeMenu, loop = false, trapFocus, onOpenAutoFocus, onCloseAutoFocus, disableOutsidePointerEvents, onEntryFocus, onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside, onDismiss, disableOutsideScroll, ...contentProps } = props;
	const context = useMenuContext(CONTENT_NAME$1, __scopeMenu);
	const rootContext = useMenuRootContext(CONTENT_NAME$1, __scopeMenu);
	const popperScope = usePopperScope(__scopeMenu);
	const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeMenu);
	const getItems = useCollection(__scopeMenu);
	const [currentItemId, setCurrentItemId] = import_react.useState(null);
	const contentRef = import_react.useRef(null);
	const composedRefs = useComposedRefs(forwardedRef, contentRef, context.onContentChange);
	const timerRef = import_react.useRef(0);
	const searchRef = import_react.useRef("");
	const pointerGraceTimerRef = import_react.useRef(0);
	const pointerGraceIntentRef = import_react.useRef(null);
	const pointerDirRef = import_react.useRef("right");
	const lastPointerXRef = import_react.useRef(0);
	const ScrollLockWrapper = disableOutsideScroll ? ReactRemoveScroll : import_react.Fragment;
	const scrollLockWrapperProps = disableOutsideScroll ? {
		as: Slot,
		allowPinchZoom: true
	} : void 0;
	const handleTypeaheadSearch = /* @__PURE__ */ __name$1((key) => {
		const search = searchRef.current + key;
		const items = getItems().filter((item) => !item.disabled);
		const currentItem = document.activeElement;
		const currentMatch = items.find((item) => item.ref.current === currentItem)?.textValue;
		const nextMatch = getNextMatch(items.map((item) => item.textValue), search, currentMatch);
		const newItem = items.find((item) => item.textValue === nextMatch)?.ref.current;
		(/* @__PURE__ */ __name$1((function updateSearch(value) {
			searchRef.current = value;
			window.clearTimeout(timerRef.current);
			if (value !== "") timerRef.current = window.setTimeout(() => updateSearch(""), 1e3);
		}), "updateSearch"))(search);
		if (newItem) setTimeout(() => newItem.focus());
	}, "handleTypeaheadSearch");
	import_react.useEffect(() => {
		return () => window.clearTimeout(timerRef.current);
	}, []);
	useFocusGuards();
	const isPointerMovingToSubmenu = import_react.useCallback((event) => {
		return pointerDirRef.current === pointerGraceIntentRef.current?.side && isPointerInGraceArea(event, pointerGraceIntentRef.current?.area);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuContentProvider, {
		scope: __scopeMenu,
		searchRef,
		onItemEnter: import_react.useCallback((event) => {
			if (isPointerMovingToSubmenu(event)) event.preventDefault();
		}, [isPointerMovingToSubmenu]),
		onItemLeave: import_react.useCallback((event) => {
			if (isPointerMovingToSubmenu(event)) return;
			contentRef.current?.focus();
			setCurrentItemId(null);
		}, [isPointerMovingToSubmenu]),
		onTriggerLeave: import_react.useCallback((event) => {
			if (isPointerMovingToSubmenu(event)) event.preventDefault();
		}, [isPointerMovingToSubmenu]),
		pointerGraceTimerRef,
		onPointerGraceIntentChange: import_react.useCallback((intent) => {
			pointerGraceIntentRef.current = intent;
		}, []),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollLockWrapper, {
			...scrollLockWrapperProps,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusScope, {
				asChild: true,
				trapped: trapFocus,
				onMountAutoFocus: composeEventHandlers(onOpenAutoFocus, (event) => {
					event.preventDefault();
					contentRef.current?.focus({ preventScroll: true });
				}),
				onUnmountAutoFocus: onCloseAutoFocus,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DismissableLayer, {
					asChild: true,
					disableOutsidePointerEvents,
					onEscapeKeyDown,
					onPointerDownOutside,
					onFocusOutside,
					onInteractOutside,
					onDismiss,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
						asChild: true,
						...rovingFocusGroupScope,
						dir: rootContext.dir,
						orientation: "vertical",
						loop,
						currentTabStopId: currentItemId,
						onCurrentTabStopIdChange: setCurrentItemId,
						onEntryFocus: composeEventHandlers(onEntryFocus, (event) => {
							if (!rootContext.isUsingKeyboardRef.current) event.preventDefault();
						}),
						preventScrollOnEntryFocus: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
							role: "menu",
							"aria-orientation": "vertical",
							"data-state": getOpenState(context.open),
							"data-radix-menu-content": "",
							dir: rootContext.dir,
							...popperScope,
							...contentProps,
							ref: composedRefs,
							style: {
								outline: "none",
								...contentProps.style
							},
							onKeyDown: composeEventHandlers(contentProps.onKeyDown, (event) => {
								const isKeyDownInside = event.target.closest("[data-radix-menu-content]") === event.currentTarget;
								const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
								const isCharacterKey = event.key.length === 1;
								if (isKeyDownInside) {
									if (event.key === "Tab") event.preventDefault();
									if (!isModifierKey && isCharacterKey) handleTypeaheadSearch(event.key);
								}
								const content = contentRef.current;
								if (event.target !== content) return;
								if (!FIRST_LAST_KEYS.includes(event.key)) return;
								event.preventDefault();
								const candidateNodes = getItems().filter((item) => !item.disabled).map((item) => item.ref.current);
								if (LAST_KEYS.includes(event.key)) candidateNodes.reverse();
								focusFirst(candidateNodes);
							}),
							onBlur: composeEventHandlers(props.onBlur, (event) => {
								if (!event.currentTarget.contains(event.target)) {
									window.clearTimeout(timerRef.current);
									searchRef.current = "";
								}
							}),
							onPointerMove: composeEventHandlers(props.onPointerMove, whenMouse((event) => {
								const target = event.target;
								const pointerXHasChanged = lastPointerXRef.current !== event.clientX;
								if (event.currentTarget.contains(target) && pointerXHasChanged) {
									const newDir = event.clientX > lastPointerXRef.current ? "right" : "left";
									pointerDirRef.current = newDir;
									lastPointerXRef.current = event.clientX;
								}
							}))
						})
					})
				})
			})
		})
	});
}, "MenuContentImpl"));
var MenuGroup = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuGroup2(props, forwardedRef) {
	const { __scopeMenu, ...groupProps } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
		role: "group",
		...groupProps,
		ref: forwardedRef
	});
}, "MenuGroup"));
var MenuLabel = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuLabel2(props, forwardedRef) {
	const { __scopeMenu, ...labelProps } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
		...labelProps,
		ref: forwardedRef
	});
}, "MenuLabel"));
var ITEM_NAME = "MenuItem";
var ITEM_SELECT = "menu.itemSelect";
var MenuItem = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuItem2(props, forwardedRef) {
	const { disabled = false, onSelect, ...itemProps } = props;
	const ref = import_react.useRef(null);
	const rootContext = useMenuRootContext(ITEM_NAME, props.__scopeMenu);
	const contentContext = useMenuContentContext(ITEM_NAME, props.__scopeMenu);
	const composedRefs = useComposedRefs(forwardedRef, ref);
	const isPointerDownRef = import_react.useRef(false);
	const handleSelect = /* @__PURE__ */ __name$1(() => {
		const menuItem = ref.current;
		if (!disabled && menuItem) {
			const itemSelectEvent = new CustomEvent(ITEM_SELECT, {
				bubbles: true,
				cancelable: true
			});
			menuItem.addEventListener(ITEM_SELECT, (event) => onSelect?.(event), { once: true });
			dispatchDiscreteCustomEvent(menuItem, itemSelectEvent);
			if (itemSelectEvent.defaultPrevented) isPointerDownRef.current = false;
			else rootContext.onClose();
		}
	}, "handleSelect");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItemImpl, {
		...itemProps,
		ref: composedRefs,
		disabled,
		onClick: composeEventHandlers(props.onClick, handleSelect),
		onPointerDown: (event) => {
			props.onPointerDown?.(event);
			isPointerDownRef.current = true;
		},
		onPointerUp: composeEventHandlers(props.onPointerUp, (event) => {
			if (!isPointerDownRef.current) event.currentTarget?.click();
		}),
		onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
			if (disabled || event.target !== event.currentTarget) return;
			if (contentContext.searchRef.current !== "" && event.key === " ") return;
			if (SELECTION_KEYS.includes(event.key)) {
				event.currentTarget.click();
				event.preventDefault();
			}
		})
	});
}, "MenuItem"));
var MenuItemImpl = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuItemImpl2(props, forwardedRef) {
	const { __scopeMenu, disabled = false, textValue, ...itemProps } = props;
	const contentContext = useMenuContentContext(ITEM_NAME, __scopeMenu);
	const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeMenu);
	const ref = import_react.useRef(null);
	const composedRefs = useComposedRefs(forwardedRef, ref);
	const [isFocused, setIsFocused] = import_react.useState(false);
	const [textContent, setTextContent] = import_react.useState("");
	import_react.useEffect(() => {
		const menuItem = ref.current;
		if (menuItem) setTextContent((menuItem.textContent ?? "").trim());
	}, [itemProps.children]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Collection.ItemSlot, {
		scope: __scopeMenu,
		disabled,
		textValue: textValue ?? textContent,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
			asChild: true,
			...rovingFocusGroupScope,
			focusable: !disabled,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
				role: "menuitem",
				"data-highlighted": isFocused ? "" : void 0,
				"aria-disabled": disabled || void 0,
				"data-disabled": disabled ? "" : void 0,
				...itemProps,
				ref: composedRefs,
				onPointerMove: composeEventHandlers(props.onPointerMove, whenMouse((event) => {
					if (disabled) contentContext.onItemLeave(event);
					else {
						contentContext.onItemEnter(event);
						if (!event.defaultPrevented) event.currentTarget.focus({ preventScroll: true });
					}
				})),
				onPointerLeave: composeEventHandlers(props.onPointerLeave, whenMouse((event) => contentContext.onItemLeave(event))),
				onFocus: composeEventHandlers(props.onFocus, () => setIsFocused(true)),
				onBlur: composeEventHandlers(props.onBlur, () => setIsFocused(false))
			})
		})
	});
}, "MenuItemImpl"));
var [RadioGroupProvider, useRadioGroupContext] = createMenuContext("MenuRadioGroup", {
	value: void 0,
	onValueChange: /* @__PURE__ */ __name$1(() => {}, "onValueChange")
});
var MenuRadioGroup = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuRadioGroup2(props, forwardedRef) {
	const { value, onValueChange, ...groupProps } = props;
	const handleValueChange = useCallbackRef(onValueChange);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupProvider, {
		scope: props.__scopeMenu,
		value,
		onValueChange: handleValueChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuGroup, {
			...groupProps,
			ref: forwardedRef
		})
	});
}, "MenuRadioGroup"));
var RADIO_ITEM_NAME = "MenuRadioItem";
var MenuRadioItem = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuRadioItem2(props, forwardedRef) {
	const { value, ...radioItemProps } = props;
	const context = useRadioGroupContext(RADIO_ITEM_NAME, props.__scopeMenu);
	const checked = value === context.value;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicatorProvider, {
		scope: props.__scopeMenu,
		checked,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, {
			role: "menuitemradio",
			"aria-checked": checked,
			...radioItemProps,
			ref: forwardedRef,
			"data-state": getCheckedState(checked),
			onSelect: composeEventHandlers(radioItemProps.onSelect, () => context.onValueChange?.(value), { checkForDefaultPrevented: false })
		})
	});
}, "MenuRadioItem"));
var ITEM_INDICATOR_NAME = "MenuItemIndicator";
var [ItemIndicatorProvider, useItemIndicatorContext] = createMenuContext(ITEM_INDICATOR_NAME, { checked: false });
var MenuItemIndicator = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuItemIndicator2(props, forwardedRef) {
	const { __scopeMenu, forceMount, ...itemIndicatorProps } = props;
	const indicatorContext = useItemIndicatorContext(ITEM_INDICATOR_NAME, __scopeMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
		present: forceMount || isIndeterminate(indicatorContext.checked) || indicatorContext.checked === true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.span, {
			...itemIndicatorProps,
			ref: forwardedRef,
			"data-state": getCheckedState(indicatorContext.checked)
		})
	});
}, "MenuItemIndicator"));
var MenuSeparator = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$1(function MenuSeparator2(props, forwardedRef) {
	const { __scopeMenu, ...separatorProps } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
		role: "separator",
		"aria-orientation": "horizontal",
		...separatorProps,
		ref: forwardedRef
	});
}, "MenuSeparator"));
var [MenuSubProvider, useMenuSubContext] = createMenuContext("MenuSub");
function getOpenState(open) {
	return open ? "open" : "closed";
}
__name$1(getOpenState, "getOpenState");
function isIndeterminate(checked) {
	return checked === "indeterminate";
}
__name$1(isIndeterminate, "isIndeterminate");
function getCheckedState(checked) {
	return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
}
__name$1(getCheckedState, "getCheckedState");
function focusFirst(candidates) {
	const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
	for (const candidate of candidates) {
		if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
		candidate.focus();
		if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
	}
}
__name$1(focusFirst, "focusFirst");
function wrapArray(array, startIndex) {
	return array.map((_, index) => array[(startIndex + index) % array.length]);
}
__name$1(wrapArray, "wrapArray");
function getNextMatch(values, search, currentMatch) {
	const normalizedSearch = search.length > 1 && Array.from(search).every((char) => char === search[0]) ? search[0] : search;
	const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1;
	let wrappedValues = wrapArray(values, Math.max(currentMatchIndex, 0));
	if (normalizedSearch.length === 1) wrappedValues = wrappedValues.filter((v) => v !== currentMatch);
	const nextMatch = wrappedValues.find((value) => value.toLowerCase().startsWith(normalizedSearch.toLowerCase()));
	return nextMatch !== currentMatch ? nextMatch : void 0;
}
__name$1(getNextMatch, "getNextMatch");
function isPointInPolygon(point, polygon) {
	const { x, y } = point;
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const ii = polygon[i];
		const jj = polygon[j];
		const xi = ii.x;
		const yi = ii.y;
		const xj = jj.x;
		const yj = jj.y;
		if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
__name$1(isPointInPolygon, "isPointInPolygon");
function isPointerInGraceArea(event, area) {
	if (!area) return false;
	return isPointInPolygon({
		x: event.clientX,
		y: event.clientY
	}, area);
}
__name$1(isPointerInGraceArea, "isPointerInGraceArea");
function whenMouse(handler) {
	return (event) => event.pointerType === "mouse" ? handler(event) : void 0;
}
__name$1(whenMouse, "whenMouse");
var Root3 = Menu;
var Anchor2 = MenuAnchor;
var Portal = MenuPortal;
var Content2$1 = MenuContent;
var Group = MenuGroup;
var Label = MenuLabel;
var Item2$1 = MenuItem;
var RadioGroup = MenuRadioGroup;
var RadioItem = MenuRadioItem;
var ItemIndicator = MenuItemIndicator;
var Separator = MenuSeparator;
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
	value,
	configurable: true
});
var DROPDOWN_MENU_NAME = "DropdownMenu";
var [createDropdownMenuContext, createDropdownMenuScope] = createContextScope(DROPDOWN_MENU_NAME, [createMenuScope]);
var useMenuScope = createMenuScope();
var [DropdownMenuProvider, useDropdownMenuContext] = createDropdownMenuContext(DROPDOWN_MENU_NAME);
var DropdownMenu$1 = /* @__PURE__ */ __name((props) => {
	const { __scopeDropdownMenu, children, dir, open: openProp, defaultOpen, onOpenChange, modal = true } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	const triggerRef = import_react.useRef(null);
	const [open, setOpen] = useControllableState({
		prop: openProp,
		defaultProp: defaultOpen ?? false,
		onChange: onOpenChange,
		caller: DROPDOWN_MENU_NAME
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuProvider, {
		scope: __scopeDropdownMenu,
		triggerId: useId$1(),
		triggerRef,
		contentId: useId$1(),
		open,
		onOpenChange: setOpen,
		onOpenToggle: import_react.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
		modal,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root3, {
			...menuScope,
			open,
			onOpenChange: setOpen,
			dir,
			modal,
			children
		})
	});
}, "DropdownMenu");
var TRIGGER_NAME = "DropdownMenuTrigger";
var DropdownMenuTrigger$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuTrigger2(props, forwardedRef) {
	const { __scopeDropdownMenu, disabled = false, ...triggerProps } = props;
	const context = useDropdownMenuContext(TRIGGER_NAME, __scopeDropdownMenu);
	const menuScope = useMenuScope(__scopeDropdownMenu);
	const composedRefs = useComposedRefs(forwardedRef, context.triggerRef);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Anchor2, {
		asChild: true,
		...menuScope,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.button, {
			type: "button",
			id: context.triggerId,
			"aria-haspopup": "menu",
			"aria-expanded": context.open,
			"aria-controls": context.open ? context.contentId : void 0,
			"data-state": context.open ? "open" : "closed",
			"data-disabled": disabled ? "" : void 0,
			disabled,
			...triggerProps,
			ref: composedRefs,
			onPointerDown: composeEventHandlers(props.onPointerDown, (event) => {
				if (!disabled && event.button === 0 && event.ctrlKey === false) {
					context.onOpenToggle();
					if (!context.open) event.preventDefault();
				}
			}),
			onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
				if (disabled) return;
				if (["Enter", " "].includes(event.key)) context.onOpenToggle();
				if (event.key === "ArrowDown") context.onOpenChange(true);
				if ([
					"Enter",
					" ",
					"ArrowDown"
				].includes(event.key)) event.preventDefault();
			})
		})
	});
}, "DropdownMenuTrigger"));
var DropdownMenuPortal = /* @__PURE__ */ __name((props) => {
	const { __scopeDropdownMenu, ...portalProps } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, {
		...menuScope,
		...portalProps
	});
}, "DropdownMenuPortal");
var CONTENT_NAME = "DropdownMenuContent";
var DropdownMenuContent$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuContent2(props, forwardedRef) {
	const { __scopeDropdownMenu, ...contentProps } = props;
	const context = useDropdownMenuContext(CONTENT_NAME, __scopeDropdownMenu);
	const menuScope = useMenuScope(__scopeDropdownMenu);
	const hasInteractedOutsideRef = import_react.useRef(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
		id: context.contentId,
		"aria-labelledby": context.triggerId,
		...menuScope,
		...contentProps,
		ref: forwardedRef,
		onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
			if (!hasInteractedOutsideRef.current) context.triggerRef.current?.focus();
			hasInteractedOutsideRef.current = false;
			event.preventDefault();
		}),
		onInteractOutside: composeEventHandlers(props.onInteractOutside, (event) => {
			const originalEvent = event.detail.originalEvent;
			const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
			const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
			if (!context.modal || isRightClick) hasInteractedOutsideRef.current = true;
		}),
		style: {
			...props.style,
			"--radix-dropdown-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
			"--radix-dropdown-menu-content-available-width": "var(--radix-popper-available-width)",
			"--radix-dropdown-menu-content-available-height": "var(--radix-popper-available-height)",
			"--radix-dropdown-menu-trigger-width": "var(--radix-popper-anchor-width)",
			"--radix-dropdown-menu-trigger-height": "var(--radix-popper-anchor-height)"
		}
	});
}, "DropdownMenuContent"));
var DropdownMenuGroup$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuGroup2(props, forwardedRef) {
	const { __scopeDropdownMenu, ...groupProps } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
		...menuScope,
		...groupProps,
		ref: forwardedRef
	});
}, "DropdownMenuGroup"));
var DropdownMenuLabel$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuLabel2(props, forwardedRef) {
	const { __scopeDropdownMenu, ...labelProps } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
		...menuScope,
		...labelProps,
		ref: forwardedRef
	});
}, "DropdownMenuLabel"));
var DropdownMenuItem$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuItem2(props, forwardedRef) {
	const { __scopeDropdownMenu, ...itemProps } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2$1, {
		...menuScope,
		...itemProps,
		ref: forwardedRef
	});
}, "DropdownMenuItem"));
var DropdownMenuRadioGroup$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuRadioGroup2(props, forwardedRef) {
	const { __scopeDropdownMenu, ...radioGroupProps } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroup, {
		...menuScope,
		...radioGroupProps,
		ref: forwardedRef
	});
}, "DropdownMenuRadioGroup"));
var DropdownMenuRadioItem$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuRadioItem2(props, forwardedRef) {
	const { __scopeDropdownMenu, ...radioItemProps } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioItem, {
		...menuScope,
		...radioItemProps,
		ref: forwardedRef
	});
}, "DropdownMenuRadioItem"));
var DropdownMenuItemIndicator = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuItemIndicator2(props, forwardedRef) {
	const { __scopeDropdownMenu, ...itemIndicatorProps } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator, {
		...menuScope,
		...itemIndicatorProps,
		ref: forwardedRef
	});
}, "DropdownMenuItemIndicator"));
var DropdownMenuSeparator$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuSeparator2(props, forwardedRef) {
	const { __scopeDropdownMenu, ...separatorProps } = props;
	const menuScope = useMenuScope(__scopeDropdownMenu);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
		...menuScope,
		...separatorProps,
		ref: forwardedRef
	});
}, "DropdownMenuSeparator"));
var Root2 = DropdownMenu$1;
var Trigger = DropdownMenuTrigger$1;
var Portal2 = DropdownMenuPortal;
var Content2 = DropdownMenuContent$1;
var Group2 = DropdownMenuGroup$1;
var Label2 = DropdownMenuLabel$1;
var Item2 = DropdownMenuItem$1;
var RadioGroup2 = DropdownMenuRadioGroup$1;
var RadioItem2 = DropdownMenuRadioItem$1;
var ItemIndicator2 = DropdownMenuItemIndicator;
var Separator2 = DropdownMenuSeparator$1;
function DropdownMenu({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2, {
		"data-slot": "dropdown-menu",
		...props
	});
}
function DropdownMenuTrigger({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
		"data-slot": "dropdown-menu-trigger",
		...props
	});
}
function DropdownMenuContent({ className, sideOffset = 4, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		"data-slot": "dropdown-menu-content",
		sideOffset,
		className: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md", className),
		...props
	}) });
}
function DropdownMenuGroup({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group2, {
		"data-slot": "dropdown-menu-group",
		...props
	});
}
function DropdownMenuItem({ className, inset, variant = "default", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
		"data-slot": "dropdown-menu-item",
		"data-inset": inset,
		"data-variant": variant,
		className: cn("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className),
		...props
	});
}
function DropdownMenuRadioGroup({ ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroup2, {
		"data-slot": "dropdown-menu-radio-group",
		...props
	});
}
function DropdownMenuRadioItem({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioItem2, {
		"data-slot": "dropdown-menu-radio-item",
		className: cn("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "size-2 fill-current" }) })
		}), children]
	});
}
function DropdownMenuLabel({ className, inset, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
		"data-slot": "dropdown-menu-label",
		"data-inset": inset,
		className: cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className),
		...props
	});
}
function DropdownMenuSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
		"data-slot": "dropdown-menu-separator",
		className: cn("bg-border -mx-1 my-1 h-px", className),
		...props
	});
}
//#endregion
export { DropdownMenuLabel as a, DropdownMenuSeparator as c, DropdownMenuItem as i, DropdownMenuTrigger as l, DropdownMenuContent as n, DropdownMenuRadioGroup as o, DropdownMenuGroup as r, DropdownMenuRadioItem as s, DropdownMenu as t };

//# sourceMappingURL=dropdown-menu-_EIWZQsZ.mjs.map