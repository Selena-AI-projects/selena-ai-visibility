import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as selectSelenaWorkspace } from "./selena-workspaces-BwiY6M8I.mjs";
import { t as Route } from "./checkout-B0LvW3gN.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout-CAO-HiPh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "08752b76-0536-48ca-bf79-925e46e72455", e._sentryDebugIdIdentifier = "sentry-dbid-08752b76-0536-48ca-bf79-925e46e72455");
	} catch (e) {}
})();
var control = "inline-flex min-h-11 items-center rounded-xl border border-[#b9825b] px-4 py-2 font-semibold text-[#8f5c34] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60";
function SelenaLocalPublicationLinks({ orderId, status }) {
	const [versions, setVersions] = (0, import_react.useState)([]), [error, setError] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false), [reload, setReload] = (0, import_react.useState)(0);
	const endpoint = `/api/v1/selena/local-orders/${encodeURIComponent(orderId)}/publications`;
	(0, import_react.useEffect)(() => {
		const abort = new AbortController();
		setVersions([]);
		fetch(`${endpoint}?refresh=${reload}`, {
			credentials: "same-origin",
			signal: abort.signal
		}).then(async (r) => {
			if (!r.ok) throw new Error();
			setVersions(await r.json());
			setError("");
		}).catch(() => {
			if (!abort.signal.aborted) setError("Report history is temporarily unavailable. Your measurement results are preserved.");
		});
		return () => abort.abort();
	}, [endpoint, reload]);
	async function publish() {
		setBusy(true);
		setError("");
		try {
			if (!(await fetch(endpoint, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ allowPartial: status === "FAILED" })
			})).ok) throw new Error();
			setReload((v) => v + 1);
		} catch {
			setError("The report could not be saved. Please retry; no new measurement will run.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		"aria-labelledby": "publication-title",
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				id: "publication-title",
				className: "text-xl font-semibold",
				children: "Saved report versions"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Measurements and expert recommendations have separate review states. Saving a report does not run another measurement." }),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				role: "alert",
				children: error
			}),
			["READY", "FAILED"].includes(status) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: control,
				disabled: busy,
				type: "button",
				onClick: () => void publish(),
				children: status === "FAILED" ? "Save partial report — unfinished points remain visible" : "Save report version"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-4",
				children: versions.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Version ",
					v.version,
					" · ",
					v.status === "REVOKED" ? "Revoked" : "Published",
					" · Expert analysis:",
					" ",
					v.analysisStatus === "REVIEWED" ? "reviewed" : "awaiting review"
				] }), v.status === "PUBLISHED" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: control,
						href: `/api/v1/selena/local-publications/${v.id}/`,
						children: "Open report"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: control,
						href: `/api/v1/selena/local-publications/${v.id}/?format=csv`,
						children: "Download report CSV"
					})]
				})] }, v.id))
			})
		]
	});
}
var field$1 = "min-h-11 w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 py-2 text-[#181614] focus-visible:outline-2 focus-visible:outline-offset-4";
function SelenaLocalRestaurantForm({ onRegistered }) {
	const [name, setName] = (0, import_react.useState)(""), [url, setUrl] = (0, import_react.useState)(""), [country, setCountry] = (0, import_react.useState)("ID"), [coordinates, setCoordinates] = (0, import_react.useState)(""), [confirmed, setConfirmed] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false), [error, setError] = (0, import_react.useState)("");
	async function submit() {
		if (busy) return;
		setBusy(true);
		setError("");
		try {
			if (!/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(coordinates)) throw new Error("Enter latitude and longitude separated by a comma.");
			const [latitude, longitude] = coordinates.split(",").map(Number);
			const body = JSON.stringify({
				name,
				countryCode: country,
				mapsUrl: url,
				latitude,
				longitude,
				confirmed
			});
			const storageKey = `selena-local-restaurant:${Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)))).map((b) => b.toString(16).padStart(2, "0")).join("")}`, key = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
			sessionStorage.setItem(storageKey, key);
			const response = await fetch("/api/v1/selena/local-orders/locations", {
				method: "POST",
				credentials: "same-origin",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": key
				},
				body
			});
			if (!response.ok) {
				const result = await response.json().catch(() => null);
				throw new Error(result?.error?.code === "FULL_MAPS_PLACE_LINK_REQUIRED" ? "Use the full Google Maps place link from your browser. Short sharing links and search-result links cannot confirm a restaurant." : "Could not save the restaurant. Check the link, coordinates and your workspace permissions.");
			}
			onRegistered(await response.json());
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not save restaurant.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "space-y-4",
		onSubmit: (e) => {
			e.preventDefault();
			submit();
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-semibold",
				children: "Add your restaurant"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Open the correct place in Google Maps and copy its full browser link. Right-click the restaurant’s point to copy its coordinates. These coordinates will be the center of your measurement grid." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Restaurant name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: field$1,
					required: true,
					maxLength: 160,
					disabled: busy,
					value: name,
					onChange: (e) => setName(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Full Google Maps place link" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "url",
					className: field$1,
					required: true,
					maxLength: 3e3,
					disabled: busy,
					value: url,
					onChange: (e) => setUrl(e.target.value),
					placeholder: "https://www.google.com/maps/place/…"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Country — two-letter code" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: field$1,
					required: true,
					pattern: "[A-Z]{2}",
					maxLength: 2,
					disabled: busy,
					value: country,
					onChange: (e) => setCountry(e.target.value.toUpperCase())
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Restaurant coordinates — latitude, longitude" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: field$1,
					required: true,
					disabled: busy,
					value: coordinates,
					onChange: (e) => setCoordinates(e.target.value),
					placeholder: "-8.81656, 115.09581"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex min-h-11 items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					required: true,
					disabled: busy,
					checked: confirmed,
					onChange: (e) => setConfirmed(e.target.checked)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "I checked that this is the correct restaurant and the correct point on the map." })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm",
				children: "Saving confirms your selection. It does not verify a ranking or start a measurement."
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				role: "alert",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "min-h-11 rounded-xl bg-[#181614] px-5 py-3 font-semibold text-[#fffdf8] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4",
				type: "submit",
				disabled: busy,
				children: busy ? "Saving…" : "Save restaurant"
			})
		]
	});
}
var field = "min-h-11 w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 py-2 text-[#181614] focus-visible:outline-2 focus-visible:outline-offset-4";
var button = "min-h-11 rounded-xl bg-[#181614] px-5 py-3 font-semibold text-[#fffdf8] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60";
async function json(url, options) {
	const r = await fetch(url, {
		...options,
		credentials: "same-origin"
	});
	if (!r.ok) throw new Error(r.status === 503 ? "Test checkout is not enabled yet." : r.status === 409 ? "The order changed or expired. Please reload and review it." : "The request could not be completed. Check your workspace and try again.");
	return r.json();
}
function SelenaLocalCheckout() {
	const [history, setHistory] = (0, import_react.useState)([]);
	const [historyError, setHistoryError] = (0, import_react.useState)(false);
	const [locations, setLocations] = (0, import_react.useState)([]), [locationId, setLocationId] = (0, import_react.useState)("");
	const [adding, setAdding] = (0, import_react.useState)(false);
	const [selectedQuery, setSelectedQuery] = (0, import_react.useState)(0);
	const [queries, setQueries] = (0, import_react.useState)(""), [language, setLanguage] = (0, import_react.useState)("en"), [size, setSize] = (0, import_react.useState)(3);
	const [order, setOrder] = (0, import_react.useState)(null), [busy, setBusy] = (0, import_react.useState)(true), [error, setError] = (0, import_react.useState)("");
	const key = (0, import_react.useRef)({
		body: "",
		key: ""
	}), paymentEvent = (0, import_react.useRef)("");
	(0, import_react.useEffect)(() => {
		let active = true;
		const id = new URLSearchParams(window.location.search).get("order");
		json("/api/v1/selena/local-orders/").then((past) => {
			if (active) setHistory(past);
		}).catch(() => {
			if (active) setHistoryError(true);
		});
		Promise.all([json("/api/v1/selena/local-orders/options"), id ? json(`/api/v1/selena/local-orders/${encodeURIComponent(id)}/`) : Promise.resolve(null)]).then(([rows, existing]) => {
			if (active) {
				setLocations(rows);
				setLocationId(rows[0]?.id ?? "");
				setOrder(existing);
			}
		}).catch((e) => {
			if (active) setError(e.message);
		}).finally(() => {
			if (active) setBusy(false);
		});
		return () => {
			active = false;
		};
	}, []);
	async function create() {
		if (busy) return;
		const location = locations.find((l) => l.id === locationId);
		if (!location) return;
		setBusy(true);
		setError("");
		try {
			const body = JSON.stringify({
				projectId: location.projectId,
				locationId,
				queries: queries.split("\n").map((q) => q.trim()).filter(Boolean),
				language,
				gridSize: size
			});
			if (key.current.body !== body) {
				const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
				const storageKey = `selena-local-order:${sessionStorage.getItem("selena-local-order-draft") ?? "initial"}:${digest}`;
				key.current = {
					body,
					key: sessionStorage.getItem(storageKey) ?? crypto.randomUUID()
				};
				sessionStorage.setItem(storageKey, key.current.key);
			}
			const created = await json("/api/v1/selena/local-orders/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": key.current.key
				},
				body
			});
			setOrder(created);
			window.history.replaceState(null, "", `${window.location.pathname}?order=${encodeURIComponent(created.id)}`);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not create order.");
		} finally {
			setBusy(false);
		}
	}
	async function pay() {
		if (!order || busy) return;
		setBusy(true);
		setError("");
		try {
			paymentEvent.current ||= sessionStorage.getItem(`selena-local-payment:${order.id}`) ?? crypto.randomUUID();
			sessionStorage.setItem(`selena-local-payment:${order.id}`, paymentEvent.current);
			await json(`/api/v1/selena/local-orders/${order.id}/test-payment`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					snapshotSha256: order.snapshotSha256,
					eventId: paymentEvent.current
				})
			});
			setOrder(await json(`/api/v1/selena/local-orders/${order.id}/`));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not record test payment.");
		} finally {
			setBusy(false);
		}
	}
	const pollingOrderId = order?.id, pollingStatus = order?.execution?.status;
	(0, import_react.useEffect)(() => {
		if (!pollingOrderId || !["QUEUED", "RUNNING"].includes(pollingStatus ?? "")) return;
		let active = true;
		let pending = false;
		const timer = setInterval(() => {
			if (pending) return;
			pending = true;
			json(`/api/v1/selena/local-orders/${pollingOrderId}/`).then((next) => {
				if (active) setOrder(next);
			}).catch(() => {
				if (active) setError("Progress could not be refreshed. Your saved order is safe; reload to reconnect.");
			}).finally(() => {
				pending = false;
			});
		}, 1500);
		return () => {
			active = false;
			clearInterval(timer);
		};
	}, [pollingOrderId, pollingStatus]);
	async function start(retry = false) {
		if (!order || busy) return;
		setBusy(true);
		setError("");
		try {
			await json(`/api/v1/selena/local-orders/${order.id}/start`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					snapshotSha256: order.snapshotSha256,
					retry
				})
			});
			setOrder(await json(`/api/v1/selena/local-orders/${order.id}/`));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not start test run.");
		} finally {
			setBusy(false);
		}
	}
	const expired = order?.status === "AWAITING_PAYMENT" && new Date(order.expiresAt).getTime() <= Date.now();
	function newOrder() {
		if (busy) return;
		sessionStorage.setItem("selena-local-order-draft", crypto.randomUUID());
		window.location.assign(window.location.pathname);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "min-h-screen bg-[#f7f2ea] px-4 py-8 text-[#181614]",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-3xl space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					className: "inline-flex min-h-11 items-center underline",
					href: "/app/selena",
					children: "Back to workspace"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-serif text-3xl",
					children: "Local Visibility — $49 once"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-semibold",
					children: "Test checkout. No money is charged. Test execution uses fixture data, not new Google Maps measurements."
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "alert",
					children: error
				}),
				historyError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "status",
					children: "Recent history is temporarily unavailable. You can still use this order."
				}),
				history.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
						className: "min-h-11 cursor-pointer py-3 font-semibold",
						children: "Recent test orders"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-2",
						children: history.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							className: "inline-flex min-h-11 items-center underline",
							href: `/selena/local/checkout?order=${item.id}`,
							children: [
								item.name,
								" · ",
								item.queryCount,
								" queries · ",
								new Date(item.createdAt).toLocaleDateString(),
								" ·",
								" ",
								item.status === "READY" ? "Test report ready" : item.status === "AWAITING_PAYMENT" ? "Awaiting test payment" : "Open order"
							]
						}) }, item.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Latest 50 orders in this workspace. Test results are separate from real Google Maps measurements." })
				] }),
				busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "status",
					children: "Loading…"
				}),
				!order && !busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: button,
					onClick: () => setAdding(!adding),
					children: adding ? "Close restaurant form" : "Add a restaurant"
				}),
				!order && adding && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaLocalRestaurantForm, { onRegistered: (location) => {
					setLocations((rows) => [...rows.filter((r) => r.id !== location.id), location]);
					setLocationId(location.id);
					setAdding(false);
				} }),
				!order && !adding && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "space-y-5",
					onSubmit: (event) => {
						event.preventDefault();
						create();
					},
					children: [
						!busy && !locations.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No confirmed restaurant is available in this workspace. Confirm its Maps identity and coordinates before ordering." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Restaurant" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: field,
								required: true,
								disabled: busy,
								value: locationId,
								onChange: (e) => setLocationId(e.target.value),
								children: locations.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: l.id,
									children: l.name
								}, l.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Search queries — one per line, up to 15" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								className: field,
								rows: 5,
								required: true,
								maxLength: 4500,
								disabled: busy,
								value: queries,
								onChange: (e) => setQueries(e.target.value),
								placeholder: "Greek restaurant Uluwatu"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Search language" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: field,
								disabled: busy,
								value: language,
								onChange: (e) => setLanguage(e.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "en",
									children: "English"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "ru",
									children: "Russian"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Measurement grid — 3 km radius" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: field,
								disabled: busy,
								value: size,
								onChange: (e) => setSize(Number(e.target.value)),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: 3,
									children: "3 × 3 — 9 points per query"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: 5,
									children: "5 × 5 — 25 points per query"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: button,
							disabled: busy || !locationId,
							type: "submit",
							children: "Review $49 test order"
						})
					]
				}),
				order && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-4",
					"aria-label": "Order review",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-xl font-semibold",
							children: [
								"Your order — $",
								order.snapshot.offer.priceAmount,
								" ",
								order.snapshot.offer.currency
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							order.snapshot.queries.length,
							" queries · ",
							order.snapshot.grid.size,
							" × ",
							order.snapshot.grid.size,
							" points ·",
							" ",
							order.snapshot.expectedSlots,
							" observations · ",
							order.snapshot.language
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "list-disc pl-5",
							children: order.snapshot.queries.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: q }, q))
						}),
						expired ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							role: "status",
							children: "This quote has expired. Create a new order to review the current terms."
						}) : order.status === "AWAITING_PAYMENT" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: button,
							disabled: busy,
							onClick: () => void pay(),
							type: "button",
							children: "Confirm test payment — no charge"
						}) : order.status === "PAID_REVIEW_REQUIRED" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							role: "status",
							children: "Test payment recorded. Execution has not started."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: button,
							type: "button",
							disabled: busy,
							onClick: () => void start(),
							children: "Run test — fixture data only"
						})] }) : !order.execution ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							role: "status",
							children: "This order is no longer awaiting payment. Check its execution status with your operator."
						}) : null,
						order.status === "AWAITING_PAYMENT" && !expired && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"Quote valid until ",
							new Date(order.expiresAt).toLocaleString(),
							"."
						] }),
						order.execution && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaLocalPublicationLinks, {
							orderId: order.id,
							status: order.execution.status
						}),
						order.execution && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "space-y-4",
							"aria-label": "Test execution results",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-xl font-semibold",
									children: order.execution.status === "READY" ? "Test report — fixture data" : "Test execution progress"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									role: "status",
									children: [
										order.execution.completed,
										" of ",
										order.execution.expected,
										" points completed."
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("progress", {
									className: "w-full",
									max: order.execution.expected,
									value: order.execution.completed,
									"aria-label": "Completed test points"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "These are generated test results. They are not Google Maps positions and must not be used to assess the restaurant." }),
								order.execution.status === "READY" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									className: "inline-flex min-h-11 items-center underline",
									href: `/api/v1/selena/local-orders/${order.id}/?download=csv`,
									children: "Download test report (CSV)"
								}),
								order.execution.status === "FAILED" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									role: "alert",
									children: "Test processing stopped. Completed points are saved."
								}), order.execution.failures < 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: button,
									disabled: busy,
									onClick: () => void start(true),
									children: "Resume test run"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Retry limit reached. Contact support with this order page." })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Result query" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										className: field,
										"aria-label": "Result query",
										value: selectedQuery,
										onChange: (e) => setSelectedQuery(Number(e.target.value)),
										children: order.snapshot.queries.map((q, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: i,
											children: q
										}, q))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid gap-2",
									style: { gridTemplateColumns: `repeat(${order.snapshot.grid.size},minmax(0,1fr))` },
									children: order.execution.tasks.filter((task) => task.queryIndex === selectedQuery).map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-xl border border-[#e6ddd1] bg-[#fffdf8] p-3 text-center",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["P", task.pointIndex + 1] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: task.status !== "DONE" ? "Pending" : task.result?.targetRank == null ? "Absent" : `#${task.result.targetRank}` })
										]
									}, task.pointIndex))
								})
							]
						}),
						(expired || [
							"CANCELLED",
							"READY",
							"COMPLETED"
						].includes(order.status)) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							className: button,
							onClick: newOrder,
							children: "Create a new order"
						})
					]
				})
			]
		})
	});
}
function LocalCheckoutRoute() {
	const workspaces = Route.useLoaderData();
	const [selected, setSelected] = (0, import_react.useState)(workspaces.activeOrganizationId ?? "");
	const [pending, setPending] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	async function selectWorkspace() {
		if (!selected || pending) return;
		setPending(true);
		setError("");
		try {
			await selectSelenaWorkspace({ data: { organizationId: selected } });
			window.location.reload();
		} catch {
			setError("Could not switch workspace. Please try again.");
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [workspaces.organizations.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		"aria-label": "Workspace selection",
		className: "bg-[#f7f2ea] px-4 pt-6 text-[#181614] sm:px-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-3xl flex-wrap items-end gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex min-w-0 max-w-full flex-col gap-2",
					htmlFor: "local-checkout-workspace",
					children: ["Workspace", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						id: "local-checkout-workspace",
						value: selected,
						onChange: (event) => setSelected(event.target.value),
						disabled: pending || workspaces.readOnly,
						className: "min-h-11 max-w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 focus-visible:outline-2 focus-visible:outline-offset-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							disabled: true,
							children: "Choose workspace"
						}), workspaces.organizations.map((workspace) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: workspace.id,
							children: workspace.name
						}, workspace.id))]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: !selected || pending || workspaces.readOnly,
					onClick: () => void selectWorkspace(),
					className: "min-h-11 rounded-xl border border-[#b9825b] px-4 py-2 font-semibold text-[#8f5c34] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60",
					children: pending ? "Switching…" : "Switch workspace"
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "alert",
					children: error
				})
			]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaLocalCheckout, {})] });
}
//#endregion
export { LocalCheckoutRoute as component };

//# sourceMappingURL=checkout-CAO-HiPh.mjs.map