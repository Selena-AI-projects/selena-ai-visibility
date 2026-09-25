import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { A as hasPermissionFn, B as ownerAc, F as isSafeUrlScheme, R as memberAc, S as defu, U as userAc, V as parseJSON, W as userRole, _ as createFetch, b as defineErrorCodes, c as PACKAGE_VERSION$1$1, d as adminAc, f as adminAc$1, k as hasPermission, o as ORGANIZATION_ERROR_CODES, p as adminRole, s as PACKAGE_VERSION$1, t as ADMIN_ERROR_CODES, u as ac, v as defaultRoles, w as getBaseURL } from "./permissions-Bf6y4quC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/client-CSZfU_Y2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f899c6c9-34de-4a55-8ac5-7b3926c0f3c8", e._sentryDebugIdIdentifier = "sentry-dbid-f899c6c9-34de-4a55-8ac5-7b3926c0f3c8");
	} catch (e) {}
})();
function capitalizeFirstLetter(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
var WORD_PATTERN = /[\p{Ll}\d]+|\p{Lu}+(?!\p{Ll})|\p{Lu}[\p{Ll}\d]+|\p{Lo}+/gu;
var APOSTROPHE_PATTERN = /['\u2019]/g;
function splitWords(input) {
	return input.replace(APOSTROPHE_PATTERN, "").match(WORD_PATTERN) ?? [];
}
function toKebabCase(input) {
	return splitWords(input).map((word) => word.toLowerCase()).join("-");
}
var redirectPlugin = {
	id: "redirect",
	name: "Redirect",
	hooks: { onSuccess(context) {
		if (context.data?.url && context.data?.redirect && isSafeUrlScheme(context.data.url)) {
			if (typeof window !== "undefined" && window.location) {
				if (window.location) try {
					window.location.href = context.data.url;
				} catch {}
			}
		}
	} }
};
var listenerQueue = [];
var lqIndex = 0;
var batchSeen = null;
var QUEUE_ITEMS_PER_LISTENER = 4;
var nanostoresGlobal = globalThis.nanostoresGlobal ||= { epoch: 0 };
var drainQueue = () => {
	for (lqIndex = 0; lqIndex < listenerQueue.length; lqIndex += QUEUE_ITEMS_PER_LISTENER) listenerQueue[lqIndex](listenerQueue[lqIndex + 1].value, listenerQueue[lqIndex + 2], listenerQueue[lqIndex + 3]);
	listenerQueue.length = 0;
};
var atom = /* @__NO_SIDE_EFFECTS__ */ (initialValue) => {
	let listeners = [];
	let $atom = {
		get() {
			if (!$atom.lc) $atom.listen(() => {})();
			return $atom.value;
		},
		init: initialValue,
		lc: 0,
		listen(listener) {
			$atom.lc = listeners.push(listener);
			return () => {
				for (let i = lqIndex + QUEUE_ITEMS_PER_LISTENER; i < listenerQueue.length;) if (listenerQueue[i] === listener) listenerQueue.splice(i, QUEUE_ITEMS_PER_LISTENER);
				else i += QUEUE_ITEMS_PER_LISTENER;
				let index = listeners.indexOf(listener);
				if (~index) {
					listeners.splice(index, 1);
					if (!--$atom.lc) $atom.off();
				}
			};
		},
		notify(oldValue, changedKey) {
			nanostoresGlobal.epoch++;
			let runListenerQueue = !listenerQueue.length && !batchSeen;
			for (let listener of listeners) {
				if (batchSeen?.has(listener)) continue;
				batchSeen?.add(listener);
				listenerQueue.push(listener, $atom, oldValue, batchSeen ? void 0 : changedKey);
			}
			if (runListenerQueue) drainQueue();
		},
		off() {},
		set(newValue) {
			let oldValue = $atom.value;
			if (oldValue !== newValue) {
				$atom.value = newValue;
				$atom.notify(oldValue);
			}
		},
		subscribe(listener) {
			let unbind = $atom.listen(listener);
			listener($atom.value);
			return unbind;
		},
		value: initialValue
	};
	return $atom;
};
var SET = 2;
var MOUNT = 5;
var UNMOUNT = 6;
var REVERT_MUTATION = 10;
var on = (object, listener, eventKey, mutateStore) => {
	object.events = object.events || {};
	if (!object.events[eventKey + REVERT_MUTATION]) object.events[eventKey + REVERT_MUTATION] = mutateStore((eventProps) => {
		object.events[eventKey].reduceRight((event, l) => (l(event), event), {
			shared: {},
			...eventProps
		});
	});
	object.events[eventKey] = object.events[eventKey] || [];
	object.events[eventKey].push(listener);
	return () => {
		let currentListeners = object.events[eventKey];
		let index = currentListeners.indexOf(listener);
		currentListeners.splice(index, 1);
		if (!currentListeners.length) {
			delete object.events[eventKey];
			object.events[eventKey + REVERT_MUTATION]();
			delete object.events[eventKey + REVERT_MUTATION];
		}
	};
};
var onSet = ($store, listener) => on($store, listener, SET, (runListeners) => {
	let originSet = $store.set;
	let originSetKey = $store.setKey;
	if ($store.setKey) $store.setKey = (changed, changedValue) => {
		let isAborted;
		let abort = () => {
			isAborted = true;
		};
		runListeners({
			abort,
			changed,
			newValue: {
				...$store.value,
				[changed]: changedValue
			}
		});
		if (!isAborted) return originSetKey(changed, changedValue);
	};
	$store.set = (newValue) => {
		let isAborted;
		let abort = () => {
			isAborted = true;
		};
		runListeners({
			abort,
			newValue
		});
		if (!isAborted) return originSet(newValue);
	};
	return () => {
		$store.set = originSet;
		$store.setKey = originSetKey;
	};
});
var STORE_UNMOUNT_DELAY = 1e3;
var onMount = ($store, initialize) => {
	let listener = (payload) => {
		let destroy = initialize(payload);
		if (destroy) $store.events[UNMOUNT].push(destroy);
	};
	return on($store, listener, MOUNT, (runListeners) => {
		let originListen = $store.listen;
		$store.listen = (...args) => {
			if (!$store.lc && !$store.active) {
				$store.active = true;
				runListeners();
			}
			return originListen(...args);
		};
		let originOff = $store.off;
		$store.events[UNMOUNT] = [];
		$store.off = () => {
			originOff();
			setTimeout(() => {
				if ($store.active && !$store.lc) {
					$store.active = false;
					for (let destroy of $store.events[UNMOUNT]) destroy();
					$store.events[UNMOUNT] = [];
				}
			}, STORE_UNMOUNT_DELAY);
		};
		return () => {
			$store.listen = originListen;
			$store.off = originOff;
		};
	});
};
function listenKeys($store, keys, listener) {
	let keysSet = new Set(keys);
	return $store.listen((value, oldValue, changed) => {
		if (changed === void 0 ? keys.some((key) => value[key] !== oldValue[key]) : keysSet.has(changed) || keysSet.has(changed.split(/\.|\[/)[0])) listener(value, oldValue, changed);
	});
}
function isPlainObject(value) {
	if (typeof value !== "object" || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
/**
* Deep structural equality for JSON-serializable values.
* Handles: primitives, null, arrays, and plain objects.
* Short-circuits on referential equality at every recursion level.
*/
function isJsonEqual(a, b) {
	if (a === b) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (!isJsonEqual(a[i], b[i])) return false;
		return true;
	}
	if (isPlainObject(a) && isPlainObject(b)) {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;
		for (const key of keysA) if (!(key in b) || !isJsonEqual(a[key], b[key])) return false;
		return true;
	}
	return false;
}
/**
* Attach an equality gate to a nanostores atom via `onSet`.
* When `isEqual(currentValue, newValue)` returns true, the `set()` call
* is aborted: no listeners fire, no framework re-renders occur.
*
* Returns the unsubscribe function from `onSet`.
*/
function withEquality(store, isEqual) {
	return onSet(store, ({ newValue, abort }) => {
		if (isEqual(store.value, newValue)) abort();
	});
}
var kBroadcastChannel = Symbol.for("better-auth:broadcast-channel");
var now$1 = () => Math.floor(Date.now() / 1e3);
var WindowBroadcastChannel = class {
	listeners = /* @__PURE__ */ new Set();
	name;
	constructor(name = "better-auth.message") {
		this.name = name;
	}
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	post(message) {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(this.name, JSON.stringify({
				...message,
				timestamp: now$1()
			}));
		} catch {}
	}
	setup() {
		if (typeof window === "undefined" || typeof window.addEventListener === "undefined") return () => {};
		const handler = (event) => {
			if (event.key !== this.name) return;
			const message = JSON.parse(event.newValue ?? "{}");
			if (message?.event !== "session" || !message?.data) return;
			this.listeners.forEach((listener) => listener(message));
		};
		window.addEventListener("storage", handler);
		return () => {
			window.removeEventListener("storage", handler);
		};
	}
};
function getGlobalBroadcastChannel(name = "better-auth.message") {
	if (!globalThis[kBroadcastChannel]) globalThis[kBroadcastChannel] = new WindowBroadcastChannel(name);
	return globalThis[kBroadcastChannel];
}
var kFocusManager = Symbol.for("better-auth:focus-manager");
var WindowFocusManager = class {
	listeners = /* @__PURE__ */ new Set();
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	setFocused(focused) {
		this.listeners.forEach((listener) => listener(focused));
	}
	setup() {
		if (typeof window === "undefined" || typeof document === "undefined" || typeof window.addEventListener === "undefined") return () => {};
		const visibilityHandler = () => {
			if (document.visibilityState === "visible") this.setFocused(true);
		};
		document.addEventListener("visibilitychange", visibilityHandler, false);
		return () => {
			document.removeEventListener("visibilitychange", visibilityHandler, false);
		};
	}
};
function getGlobalFocusManager() {
	if (!globalThis[kFocusManager]) globalThis[kFocusManager] = new WindowFocusManager();
	return globalThis[kFocusManager];
}
var kOnlineManager = Symbol.for("better-auth:online-manager");
var WindowOnlineManager = class {
	listeners = /* @__PURE__ */ new Set();
	isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
	subscribe(listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
	setOnline(online) {
		this.isOnline = online;
		this.listeners.forEach((listener) => listener(online));
	}
	setup() {
		if (typeof window === "undefined" || typeof window.addEventListener === "undefined") return () => {};
		const onOnline = () => this.setOnline(true);
		const onOffline = () => this.setOnline(false);
		window.addEventListener("online", onOnline, false);
		window.addEventListener("offline", onOffline, false);
		return () => {
			window.removeEventListener("online", onOnline, false);
			window.removeEventListener("offline", onOffline, false);
		};
	}
};
function getGlobalOnlineManager() {
	if (!globalThis[kOnlineManager]) globalThis[kOnlineManager] = new WindowOnlineManager();
	return globalThis[kOnlineManager];
}
var now = () => Math.floor(Date.now() / 1e3);
/**
* Rate limit: don't refetch on focus if a session request was made within this many seconds
*/
var FOCUS_REFETCH_RATE_LIMIT_SECONDS = 5;
function createSessionRefreshManager(opts) {
	const { fetchSession, shouldPollSession = () => true, sessionSignal, options = {} } = opts;
	const refetchInterval = options.sessionOptions?.refetchInterval ?? 0;
	const refetchOnWindowFocus = options.sessionOptions?.refetchOnWindowFocus ?? true;
	const refetchWhenOffline = options.sessionOptions?.refetchWhenOffline ?? false;
	const state = {
		isInitialized: false,
		lastSessionRequest: 0
	};
	const shouldRefetch = () => {
		return refetchWhenOffline || getGlobalOnlineManager().isOnline;
	};
	const triggerRefetch = (event) => {
		if (!shouldRefetch()) return;
		if (event?.event === "storage") {
			fetchSession();
			return;
		}
		if (event?.event === "poll") {
			state.lastSessionRequest = now();
			fetchSession();
			return;
		}
		if (event?.event === "visibilitychange") {
			if (now() - state.lastSessionRequest < FOCUS_REFETCH_RATE_LIMIT_SECONDS) return;
			state.lastSessionRequest = now();
			fetchSession();
			return;
		}
		fetchSession();
	};
	const broadcastSessionUpdate = (trigger) => {
		getGlobalBroadcastChannel().post({
			event: "session",
			data: { trigger },
			clientId: Math.random().toString(36).substring(7)
		});
	};
	const setupPolling = () => {
		if (refetchInterval && refetchInterval > 0) state.pollInterval = setInterval(() => {
			if (shouldPollSession()) triggerRefetch({ event: "poll" });
		}, refetchInterval * 1e3);
	};
	const setupBroadcast = () => {
		state.unsubscribeBroadcast = getGlobalBroadcastChannel().subscribe(() => {
			triggerRefetch({ event: "storage" });
		});
	};
	const setupFocusRefetch = () => {
		if (!refetchOnWindowFocus) return;
		state.unsubscribeFocus = getGlobalFocusManager().subscribe(() => {
			triggerRefetch({ event: "visibilitychange" });
		});
	};
	const setupOnlineRefetch = () => {
		state.unsubscribeOnline = getGlobalOnlineManager().subscribe((online) => {
			if (online) triggerRefetch({ event: "visibilitychange" });
		});
	};
	const setupSignalSubscription = () => {
		state.unsubscribeSignal = sessionSignal.listen(() => {
			fetchSession();
		});
	};
	const init = () => {
		if (state.isInitialized) return;
		state.isInitialized = true;
		setupPolling();
		setupBroadcast();
		setupFocusRefetch();
		setupOnlineRefetch();
		setupSignalSubscription();
		state.cleanupBroadcastSetup = getGlobalBroadcastChannel().setup();
		state.cleanupFocusSetup = getGlobalFocusManager().setup();
		state.cleanupOnlineSetup = getGlobalOnlineManager().setup();
	};
	const cleanup = () => {
		if (!state.isInitialized) return;
		if (state.pollInterval) {
			clearInterval(state.pollInterval);
			state.pollInterval = void 0;
		}
		if (state.unsubscribeBroadcast) {
			state.unsubscribeBroadcast();
			state.unsubscribeBroadcast = void 0;
		}
		if (state.unsubscribeFocus) {
			state.unsubscribeFocus();
			state.unsubscribeFocus = void 0;
		}
		if (state.unsubscribeOnline) {
			state.unsubscribeOnline();
			state.unsubscribeOnline = void 0;
		}
		if (state.unsubscribeSignal) {
			state.unsubscribeSignal();
			state.unsubscribeSignal = void 0;
		}
		if (state.cleanupBroadcastSetup) {
			state.cleanupBroadcastSetup();
			state.cleanupBroadcastSetup = void 0;
		}
		if (state.cleanupFocusSetup) {
			state.cleanupFocusSetup();
			state.cleanupFocusSetup = void 0;
		}
		if (state.cleanupOnlineSetup) {
			state.cleanupOnlineSetup();
			state.cleanupOnlineSetup = void 0;
		}
		state.isInitialized = false;
		state.lastSessionRequest = 0;
	};
	return {
		init,
		cleanup,
		triggerRefetch,
		broadcastSessionUpdate
	};
}
var isServer$1 = () => typeof window === "undefined";
/**
* Normalize $fetch response: `throw: true` returns data directly,
* otherwise `{ data, error }`.
*/
function normalizeSessionResponse(res) {
	if (typeof res === "object" && res !== null && "data" in res && "error" in res) return res;
	return {
		data: res,
		error: null
	};
}
function normalizeSessionData(data) {
	if (!data) return null;
	if (data.session === null && data.user === null) return null;
	return data;
}
function isSessionAtomEqual(a, b) {
	return isJsonEqual(a.data, b.data) && a.error === b.error && a.isPending === b.isPending && a.isRefetching === b.isRefetching && a.refetch === b.refetch;
}
function getSessionAtom($fetch, options) {
	const $signal = /* @__PURE__ */ atom(false);
	let abortController;
	const refetch = (queryParams) => fetchSession(queryParams);
	const session = /* @__PURE__ */ atom({
		data: null,
		error: null,
		isPending: true,
		isRefetching: false,
		refetch
	});
	withEquality(session, isSessionAtomEqual);
	const settleAbortedFetch = (controller) => {
		if (abortController !== controller) return;
		const current = session.get();
		abortController = void 0;
		if (!current.isPending && !current.isRefetching) return;
		session.set({
			...current,
			isPending: false,
			isRefetching: false,
			refetch
		});
	};
	const fetchSession = async (queryParams) => {
		abortController?.abort();
		const controller = new AbortController();
		abortController = controller;
		const current = session.get();
		session.set({
			...current,
			isPending: current.data === null,
			isRefetching: true,
			error: null,
			refetch
		});
		try {
			const res = await $fetch("/get-session", {
				method: "GET",
				query: queryParams?.query,
				signal: controller.signal
			});
			if (controller.signal.aborted) {
				settleAbortedFetch(controller);
				return;
			}
			let { data, error } = normalizeSessionResponse(res);
			if (data?.needsRefresh) try {
				const refreshRes = await $fetch("/get-session", {
					method: "POST",
					signal: controller.signal
				});
				if (controller.signal.aborted) {
					settleAbortedFetch(controller);
					return;
				}
				({data, error} = normalizeSessionResponse(refreshRes));
			} catch {
				if (controller.signal.aborted) {
					settleAbortedFetch(controller);
					return;
				}
			}
			if (error) {
				const latest = session.get();
				const isUnauthorized = error?.status === 401;
				session.set({
					data: isUnauthorized ? null : latest.data,
					error,
					isPending: false,
					isRefetching: false,
					refetch
				});
				return;
			}
			const sessionData = normalizeSessionData(data);
			const current = session.get();
			const stableData = current.data != null && sessionData != null && isJsonEqual(current.data, sessionData) ? current.data : sessionData;
			session.set({
				data: stableData,
				error: null,
				isPending: false,
				isRefetching: false,
				refetch
			});
		} catch (fetchError) {
			if (controller.signal.aborted) {
				settleAbortedFetch(controller);
				return;
			}
			const latest = session.get();
			session.set({
				data: latest.data,
				error: fetchError,
				isPending: false,
				isRefetching: false,
				refetch
			});
		}
	};
	let broadcastSessionUpdate = () => {};
	onMount(session, () => {
		let timeoutId;
		if (!isServer$1()) timeoutId = setTimeout(() => {
			fetchSession();
		}, 0);
		const refreshManager = createSessionRefreshManager({
			fetchSession,
			shouldPollSession: () => session.get().data != null,
			sessionSignal: $signal,
			options
		});
		refreshManager.init();
		broadcastSessionUpdate = refreshManager.broadcastSessionUpdate;
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
			const controller = abortController;
			controller?.abort();
			if (controller) settleAbortedFetch(controller);
			refreshManager.cleanup();
		};
	});
	return {
		session,
		$sessionSignal: $signal,
		broadcastSessionUpdate: (trigger) => broadcastSessionUpdate(trigger)
	};
}
var resolvePublicAuthUrl = (basePath) => {
	if (typeof process === "undefined") return void 0;
	const path = basePath ?? "/api/auth";
	if (process.env.NEXT_PUBLIC_AUTH_URL) return process.env.NEXT_PUBLIC_AUTH_URL;
	if (typeof window === "undefined") {
		if (process.env.NEXTAUTH_URL) try {
			return process.env.NEXTAUTH_URL;
		} catch {}
		if (process.env.VERCEL_URL) try {
			const protocol = process.env.VERCEL_URL.startsWith("http") ? "" : "https://";
			return `${new URL(`${protocol}${process.env.VERCEL_URL}`).origin}${path}`;
		} catch {}
	}
};
var getClientConfig = (options, loadEnv) => {
	const isCredentialsSupported = "credentials" in Request.prototype;
	const baseURL = getBaseURL(options?.baseURL, options?.basePath, void 0, loadEnv) ?? resolvePublicAuthUrl(options?.basePath) ?? "/api/auth";
	const pluginsFetchPlugins = options?.plugins?.flatMap((plugin) => plugin.fetchPlugins).filter((pl) => pl !== void 0) || [];
	const lifeCyclePlugin = {
		id: "lifecycle-hooks",
		name: "lifecycle-hooks",
		hooks: {
			onSuccess: options?.fetchOptions?.onSuccess,
			onError: options?.fetchOptions?.onError,
			onRequest: options?.fetchOptions?.onRequest,
			onResponse: options?.fetchOptions?.onResponse
		}
	};
	const { onSuccess: _onSuccess, onError: _onError, onRequest: _onRequest, onResponse: _onResponse, ...restOfFetchOptions } = options?.fetchOptions || {};
	const $fetch = createFetch({
		baseURL,
		...isCredentialsSupported ? { credentials: "include" } : {},
		method: "GET",
		jsonParser(text) {
			if (!text) return null;
			return parseJSON(text, { strict: false });
		},
		customFetchImpl: fetch,
		...restOfFetchOptions,
		plugins: [
			lifeCyclePlugin,
			...restOfFetchOptions.plugins || [],
			...options?.disableDefaultFetchPlugins ? [] : [redirectPlugin],
			...pluginsFetchPlugins
		]
	});
	const { $sessionSignal, session, broadcastSessionUpdate } = getSessionAtom($fetch, options);
	const plugins = options?.plugins || [];
	let pluginsActions = {};
	const pluginsAtoms = {
		$sessionSignal,
		session
	};
	const pluginPathMethods = {
		"/sign-out": "POST",
		"/revoke-sessions": "POST",
		"/revoke-other-sessions": "POST",
		"/delete-user": "POST"
	};
	const atomListeners = [{
		signal: "$sessionSignal",
		matcher(path) {
			return path === "/sign-out" || path === "/update-user" || path === "/update-session" || path === "/sign-up/email" || path === "/sign-in/email" || path === "/delete-user" || path === "/verify-email" || path === "/revoke-sessions" || path === "/revoke-session" || path === "/revoke-other-sessions" || path === "/change-email" || path === "/change-password";
		},
		callback(path) {
			if (path === "/sign-out") broadcastSessionUpdate("signout");
			else if (path === "/update-user" || path === "/update-session") broadcastSessionUpdate("updateUser");
		}
	}];
	for (const plugin of plugins) {
		if (plugin.getAtoms) Object.assign(pluginsAtoms, plugin.getAtoms?.($fetch));
		if (plugin.pathMethods) Object.assign(pluginPathMethods, plugin.pathMethods);
		if (plugin.atomListeners) atomListeners.push(...plugin.atomListeners);
	}
	const $store = {
		notify: (signal) => {
			pluginsAtoms[signal].set(!pluginsAtoms[signal].get());
		},
		listen: (signal, listener) => {
			pluginsAtoms[signal].subscribe(listener);
		},
		atoms: pluginsAtoms
	};
	for (const plugin of plugins) if (plugin.getActions) pluginsActions = defu(plugin.getActions?.($fetch, $store, options) ?? {}, pluginsActions);
	return {
		get baseURL() {
			return baseURL;
		},
		pluginsActions,
		pluginsAtoms,
		pluginPathMethods,
		atomListeners,
		$fetch,
		$store
	};
};
function isAtom(value) {
	return typeof value === "object" && value !== null && "get" in value && typeof value.get === "function" && "lc" in value && typeof value.lc === "number";
}
function getMethod(path, knownPathMethods, args) {
	const method = knownPathMethods[path];
	const { fetchOptions, query: _query, ...body } = args || {};
	if (method) return method;
	if (fetchOptions?.method) return fetchOptions.method;
	if (body && Object.keys(body).length > 0) return "POST";
	return "GET";
}
function createDynamicPathProxy(routes, client, knownPathMethods, atoms, atomListeners) {
	function createProxy(path = []) {
		return new Proxy(function() {}, {
			get(_, prop) {
				if (typeof prop !== "string") return;
				if (prop === "then" || prop === "catch" || prop === "finally") return;
				const fullPath = [...path, prop];
				let current = routes;
				for (const segment of fullPath) if (current && typeof current === "object" && segment in current) current = current[segment];
				else {
					current = void 0;
					break;
				}
				if (typeof current === "function") return current;
				if (isAtom(current)) return current;
				return createProxy(fullPath);
			},
			apply: async (_, __, args) => {
				const routePath = "/" + path.map(toKebabCase).join("/");
				const arg = args[0] || {};
				const fetchOptions = args[1] || {};
				const { query, fetchOptions: argFetchOptions, ...body } = arg;
				const options = {
					...fetchOptions,
					...argFetchOptions
				};
				const method = getMethod(routePath, knownPathMethods, arg);
				return await client(routePath, {
					...options,
					body: method === "GET" ? void 0 : {
						...body,
						...options?.body || {}
					},
					query: query || options?.query,
					method,
					async onSuccess(context) {
						await options?.onSuccess?.(context);
						if (!atomListeners || options.disableSignal) return;
						/**
						* We trigger listeners
						*/
						const matches = atomListeners.filter((s) => s.matcher(routePath));
						if (!matches.length) return;
						const visited = /* @__PURE__ */ new Set();
						for (const match of matches) {
							const signal = atoms[match.signal];
							if (!signal) return;
							if (visited.has(match.signal)) continue;
							visited.add(match.signal);
							/**
							* To avoid race conditions we set the signal in a setTimeout
							*/
							const val = signal.get();
							setTimeout(() => {
								signal.set(!val);
							}, 10);
							match.callback?.(routePath);
						}
					}
				});
			}
		});
	}
	return createProxy();
}
/**
* Subscribe to store changes and get store's value.
*
* Can be used with store builder too.
*
* ```js
* import { useStore } from 'nanostores/react'
*
* import { router } from '../store/router'
*
* export const Layout = () => {
*   let page = useStore(router)
*   if (page.route === 'home') {
*     return <HomePage />
*   } else {
*     return <Error404 />
*   }
* }
* ```
*
* @param store Store instance.
* @returns Store value.
*/
function useStore(store, options = {}) {
	const snapshotRef = (0, import_react.useRef)(store.get());
	const { keys, deps = [store, keys] } = options;
	const subscribe = (0, import_react.useCallback)((onChange) => {
		const emitChange = (value) => {
			if (snapshotRef.current === value) return;
			snapshotRef.current = value;
			onChange();
		};
		emitChange(store.value);
		if (keys?.length) return listenKeys(store, keys, emitChange);
		return store.listen(emitChange);
	}, deps);
	const get = () => snapshotRef.current;
	return (0, import_react.useSyncExternalStore)(subscribe, get, get);
}
function getAtomKey(str) {
	return `use${capitalizeFirstLetter(str)}`;
}
function createAuthClient(options) {
	const { pluginPathMethods, pluginsActions, pluginsAtoms, $fetch, $store, atomListeners } = getClientConfig(options);
	const resolvedHooks = {};
	for (const [key, value] of Object.entries(pluginsAtoms)) resolvedHooks[getAtomKey(key)] = () => useStore(value);
	return createDynamicPathProxy({
		...pluginsActions,
		...resolvedHooks,
		$fetch,
		$store
	}, $fetch, pluginPathMethods, pluginsAtoms, atomListeners);
}
var adminClient = (options) => {
	const roles = {
		admin: adminAc$1,
		user: userAc,
		...options?.roles
	};
	return {
		id: "admin-client",
		version: PACKAGE_VERSION$1,
		$InferServerPlugin: {},
		getActions: () => ({ admin: { checkRolePermission: (data) => {
			return hasPermission({
				role: data.role,
				options: {
					ac: options?.ac,
					roles
				},
				permissions: data.permissions
			});
		} } }),
		pathMethods: {
			"/admin/list-users": "GET",
			"/admin/impersonate-user": "POST",
			"/admin/stop-impersonating": "POST"
		},
		atomListeners: [{
			matcher: (path) => path === "/admin/impersonate-user" || path === "/admin/stop-impersonating",
			signal: "$sessionSignal"
		}],
		$ERROR_CODES: ADMIN_ERROR_CODES
	};
};
var isServer = () => typeof window === "undefined";
function isAuthQueryStateEqual(a, b) {
	return isJsonEqual(a.data, b.data) && a.error === b.error && a.isPending === b.isPending && a.isRefetching === b.isRefetching && a.refetch === b.refetch;
}
var useAuthQuery = (initializedAtom, path, $fetch, options) => {
	const value = /* @__PURE__ */ atom({
		data: null,
		error: null,
		isPending: true,
		isRefetching: false,
		refetch: (queryParams) => fn(queryParams)
	});
	withEquality(value, isAuthQueryStateEqual);
	const fn = async (queryParams) => {
		return new Promise((resolve) => {
			const opts = typeof options === "function" ? options({
				data: value.get().data,
				error: value.get().error,
				isPending: value.get().isPending
			}) : options;
			$fetch(path, {
				...opts,
				query: {
					...opts?.query,
					...queryParams?.query
				},
				async onSuccess(context) {
					const current = value.get();
					const stableData = current.data != null && context.data != null && isJsonEqual(current.data, context.data) ? current.data : context.data;
					value.set({
						data: stableData,
						error: null,
						isPending: false,
						isRefetching: false,
						refetch: value.value.refetch
					});
					await opts?.onSuccess?.(context);
				},
				async onError(context) {
					const { request } = context;
					const retryAttempts = typeof request.retry === "number" ? request.retry : request.retry?.attempts;
					const retryAttempt = request.retryAttempt || 0;
					if (retryAttempts && retryAttempt < retryAttempts) return;
					const isUnauthorized = context.error.status === 401;
					value.set({
						error: context.error,
						data: isUnauthorized ? null : value.get().data,
						isPending: false,
						isRefetching: false,
						refetch: value.value.refetch
					});
					await opts?.onError?.(context);
				},
				async onRequest(context) {
					const currentValue = value.get();
					value.set({
						isPending: currentValue.data === null,
						data: currentValue.data,
						error: null,
						isRefetching: true,
						refetch: value.value.refetch
					});
					await opts?.onRequest?.(context);
				}
			}).catch((error) => {
				value.set({
					error,
					data: value.get().data,
					isPending: false,
					isRefetching: false,
					refetch: value.value.refetch
				});
			}).finally(() => {
				resolve(void 0);
			});
		});
	};
	initializedAtom = Array.isArray(initializedAtom) ? initializedAtom : [initializedAtom];
	let isMountFetchPending = false;
	let isMounted = false;
	let shouldRefetchAfterPending = false;
	const fetchOnMount = () => {
		if (isMountFetchPending) {
			shouldRefetchAfterPending = true;
			return;
		}
		isMountFetchPending = true;
		fn().finally(() => {
			isMountFetchPending = false;
			const shouldRefetch = shouldRefetchAfterPending && isMounted;
			shouldRefetchAfterPending = false;
			if (shouldRefetch) fetchOnMount();
		});
	};
	onMount(value, () => {
		if (isServer()) return;
		isMounted = true;
		let isInitialized = false;
		let timeoutId;
		const cleanups = initializedAtom.map((initAtom) => initAtom.listen(() => {
			if (isInitialized) fn();
			else {
				isInitialized = true;
				clearTimeout(timeoutId);
				fetchOnMount();
			}
		}));
		timeoutId = setTimeout(() => {
			isInitialized = true;
			fetchOnMount();
		}, 0);
		return () => {
			isMounted = false;
			for (const cleanup of cleanups) cleanup();
			clearTimeout(timeoutId);
		};
	});
	return value;
};
/**
* Using the same `hasPermissionFn` function, but without the need for a `ctx` parameter or the `organizationId` parameter.
*/
var clientSideHasPermission = (input) => {
	return hasPermissionFn(input, input.options.roles || defaultRoles);
};
var organizationClient = (options) => {
	const $listOrg = /* @__PURE__ */ atom(false);
	const $activeOrgSignal = /* @__PURE__ */ atom(false);
	const $activeMemberSignal = /* @__PURE__ */ atom(false);
	const $activeMemberRoleSignal = /* @__PURE__ */ atom(false);
	const roles = {
		admin: adminAc,
		member: memberAc,
		owner: ownerAc,
		...options?.roles
	};
	return {
		id: "organization",
		version: PACKAGE_VERSION$1,
		$InferServerPlugin: {},
		getActions: ($fetch, _$store, co) => ({
			$Infer: {
				ActiveOrganization: {},
				Organization: {},
				Invitation: {},
				Member: {},
				Team: {}
			},
			organization: { checkRolePermission: (data) => {
				return clientSideHasPermission({
					role: data.role,
					options: {
						ac: options?.ac,
						roles
					},
					permissions: data.permissions
				});
			} }
		}),
		getAtoms: ($fetch) => {
			const listOrganizations = useAuthQuery($listOrg, "/organization/list", $fetch, { method: "GET" });
			const activeOrganization = useAuthQuery([$activeOrgSignal], "/organization/get-full-organization", $fetch, () => ({ method: "GET" }));
			const activeMember = useAuthQuery([$activeOrgSignal, $activeMemberSignal], "/organization/get-active-member", $fetch, { method: "GET" });
			const activeMemberRole = useAuthQuery([$activeOrgSignal, $activeMemberRoleSignal], "/organization/get-active-member-role", $fetch, { method: "GET" });
			return {
				$listOrg,
				$activeOrgSignal,
				$activeMemberSignal,
				$activeMemberRoleSignal,
				activeOrganization,
				listOrganizations,
				activeMember,
				activeMemberRole
			};
		},
		pathMethods: {
			"/organization/get-full-organization": "GET",
			"/organization/list-user-teams": "GET"
		},
		atomListeners: [
			{
				matcher(path) {
					return path === "/organization/create" || path === "/organization/delete" || path === "/organization/update";
				},
				signal: "$listOrg"
			},
			{
				matcher(path) {
					return path === "/sign-out" || path.startsWith("/organization");
				},
				signal: "$activeOrgSignal"
			},
			{
				matcher(path) {
					return path.startsWith("/organization/set-active") || path === "/organization/create" || path === "/organization/delete" || path === "/organization/remove-member" || path === "/organization/leave" || path === "/organization/accept-invitation";
				},
				signal: "$sessionSignal"
			},
			{
				matcher(path) {
					return path.includes("/organization/update-member-role") || path.startsWith("/organization/set-active");
				},
				signal: "$activeMemberSignal"
			},
			{
				matcher(path) {
					return path.includes("/organization/update-member-role") || path.startsWith("/organization/set-active");
				},
				signal: "$activeMemberRoleSignal"
			}
		],
		$ERROR_CODES: ORGANIZATION_ERROR_CODES
	};
};
var ssoClient = (options) => {
	return {
		id: "sso-client",
		version: PACKAGE_VERSION$1$1,
		$InferServerPlugin: {},
		pathMethods: {
			"/sso/providers": "GET",
			"/sso/get-provider": "GET"
		}
	};
};
var STRIPE_ERROR_CODES = defineErrorCodes({
	UNAUTHORIZED: "Unauthorized access",
	INVALID_REQUEST_BODY: "Invalid request body",
	SUBSCRIPTION_NOT_FOUND: "Subscription not found",
	SUBSCRIPTION_PLAN_NOT_FOUND: "Subscription plan not found",
	ALREADY_SUBSCRIBED_PLAN: "You're already subscribed to this plan",
	REFERENCE_ID_NOT_ALLOWED: "Reference id is not allowed",
	CUSTOMER_NOT_FOUND: "Stripe customer not found for this user",
	UNABLE_TO_CREATE_CUSTOMER: "Unable to create customer",
	UNABLE_TO_CREATE_BILLING_PORTAL: "Unable to create billing portal session",
	STRIPE_SIGNATURE_NOT_FOUND: "Stripe signature not found",
	STRIPE_WEBHOOK_SECRET_NOT_FOUND: "Stripe webhook secret not found",
	STRIPE_WEBHOOK_ERROR: "Stripe webhook error",
	FAILED_TO_CONSTRUCT_STRIPE_EVENT: "Failed to construct Stripe event",
	FAILED_TO_FETCH_PLANS: "Failed to fetch plans",
	EMAIL_VERIFICATION_REQUIRED: "Email verification is required before you can subscribe to a plan",
	SUBSCRIPTION_NOT_ACTIVE: "Subscription is not active",
	/**
	* @deprecated Use `SUBSCRIPTION_NOT_PENDING_CHANGE` instead.
	*/
	SUBSCRIPTION_NOT_SCHEDULED_FOR_CANCELLATION: "Subscription is not scheduled for cancellation",
	SUBSCRIPTION_NOT_PENDING_CHANGE: "Subscription has no pending cancellation or scheduled plan change",
	ORGANIZATION_NOT_FOUND: "Organization not found",
	ORGANIZATION_SUBSCRIPTION_NOT_ENABLED: "Organization subscription is not enabled",
	AUTHORIZE_REFERENCE_REQUIRED: "Organization subscriptions require authorizeReference callback to be configured",
	ORGANIZATION_HAS_ACTIVE_SUBSCRIPTION: "Cannot delete organization with active subscription",
	ORGANIZATION_REFERENCE_ID_REQUIRED: "Reference ID is required. Provide referenceId or set activeOrganizationId in session"
});
var PACKAGE_VERSION = "1.6.25";
var stripeClient = (options) => {
	return {
		id: "stripe-client",
		version: PACKAGE_VERSION,
		$InferServerPlugin: {},
		pathMethods: {
			"/subscription/billing-portal": "POST",
			"/subscription/restore": "POST"
		},
		$ERROR_CODES: STRIPE_ERROR_CODES
	};
};
/**
* Better-auth client instance.
*
* Used in browser code for session management, organization switching,
* permission checks, and SSO flows.
*/
var authClient = createAuthClient({
	baseURL: typeof window !== "undefined" ? window.location.origin : "",
	basePath: "/api/auth",
	plugins: [
		organizationClient(),
		adminClient({
			ac,
			roles: {
				admin: adminRole,
				user: userRole
			}
		}),
		ssoClient(),
		stripeClient({ subscription: true })
	]
});
//#endregion
export { authClient as t };

//# sourceMappingURL=client-CSZfU_Y2.mjs.map