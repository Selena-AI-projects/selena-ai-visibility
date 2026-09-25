import { useEffect, useRef, useState } from "react";
import { SelenaLocalPublicationLinks } from "./selena-local-publication-links";
import { SelenaLocalRestaurantForm } from "./selena-local-restaurant-form";

type Location = { id: string; projectId: string; name: string };
type HistoryItem = { id: string; status: string; createdAt: string; name: string; queryCount: number };
type Order = {
	id: string;
	status: string;
	expiresAt: string;
	snapshotSha256: string;
	execution?: {
		status: string;
		expected: number;
		completed: number;
		failures: number;
		source: "FIXTURE_NOT_GOOGLE";
		tasks: Array<{
			queryIndex: number;
			pointIndex: number;
			keyword: string;
			status: string;
			result: { targetRank?: number | null; outcome?: string; source?: string; generatedAt?: string } | null;
		}>;
	} | null;
	snapshot: {
		offer: { priceAmount: string; currency: string };
		queries: string[];
		language: string;
		expectedSlots: number;
		paymentMode: "TEST";
		grid: { size: number };
	};
};
const field =
	"min-h-11 w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 py-2 text-[#181614] focus-visible:outline-2 focus-visible:outline-offset-4";
const button =
	"min-h-11 rounded-xl bg-[#181614] px-5 py-3 font-semibold text-[#fffdf8] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60";
async function json<T>(url: string, options?: RequestInit): Promise<T> {
	const r = await fetch(url, { ...options, credentials: "same-origin" });
	if (!r.ok)
		throw new Error(
			r.status === 503
				? "Test checkout is not enabled yet."
				: r.status === 409
					? "The order changed or expired. Please reload and review it."
					: "The request could not be completed. Check your workspace and try again.",
		);
	return r.json();
}
export function SelenaLocalCheckout() {
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [historyError, setHistoryError] = useState(false);
	const [locations, setLocations] = useState<Location[]>([]),
		[locationId, setLocationId] = useState("");
	const [adding, setAdding] = useState(false);
	const [selectedQuery, setSelectedQuery] = useState(0);
	const [queries, setQueries] = useState(""),
		[language, setLanguage] = useState("en"),
		[size, setSize] = useState(3);
	const [order, setOrder] = useState<Order | null>(null),
		[busy, setBusy] = useState(true),
		[error, setError] = useState("");
	const key = useRef({ body: "", key: "" }),
		paymentEvent = useRef("");
	useEffect(() => {
		let active = true;
		const id = new URLSearchParams(window.location.search).get("order");
		void json<HistoryItem[]>("/api/v1/selena/local-orders/")
			.then((past) => {
				if (active) setHistory(past);
			})
			.catch(() => {
				if (active) setHistoryError(true);
			});
		void Promise.all([
			json<Location[]>("/api/v1/selena/local-orders/options"),
			id ? json<Order>(`/api/v1/selena/local-orders/${encodeURIComponent(id)}/`) : Promise.resolve(null),
		])
			.then(([rows, existing]) => {
				if (active) {
					setLocations(rows);
					setLocationId(rows[0]?.id ?? "");
					setOrder(existing);
				}
			})
			.catch((e) => {
				if (active) setError(e.message);
			})
			.finally(() => {
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
				queries: queries
					.split("\n")
					.map((q) => q.trim())
					.filter(Boolean),
				language,
				gridSize: size,
			});
			if (key.current.body !== body) {
				const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body))))
					.map((byte) => byte.toString(16).padStart(2, "0"))
					.join("");
				const draft = sessionStorage.getItem("selena-local-order-draft") ?? "initial";
				const storageKey = `selena-local-order:${draft}:${digest}`;
				key.current = { body, key: sessionStorage.getItem(storageKey) ?? crypto.randomUUID() };
				sessionStorage.setItem(storageKey, key.current.key);
			}
			const created = await json<Order>("/api/v1/selena/local-orders/", {
				method: "POST",
				headers: { "Content-Type": "application/json", "Idempotency-Key": key.current.key },
				body,
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
				body: JSON.stringify({ snapshotSha256: order.snapshotSha256, eventId: paymentEvent.current }),
			});
			setOrder(await json<Order>(`/api/v1/selena/local-orders/${order.id}/`));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not record test payment.");
		} finally {
			setBusy(false);
		}
	}
	const pollingOrderId = order?.id,
		pollingStatus = order?.execution?.status;
	useEffect(() => {
		if (!pollingOrderId || !["QUEUED", "RUNNING"].includes(pollingStatus ?? "")) return;
		let active = true;
		let pending = false;
		const timer = setInterval(() => {
			if (pending) return;
			pending = true;
			void json<Order>(`/api/v1/selena/local-orders/${pollingOrderId}/`)
				.then((next) => {
					if (active) setOrder(next);
				})
				.catch(() => {
					if (active) setError("Progress could not be refreshed. Your saved order is safe; reload to reconnect.");
				})
				.finally(() => {
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
				body: JSON.stringify({ snapshotSha256: order.snapshotSha256, retry }),
			});
			setOrder(await json<Order>(`/api/v1/selena/local-orders/${order.id}/`));
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
	return (
		<main className="min-h-screen bg-[#f7f2ea] px-4 py-8 text-[#181614]">
			<div className="mx-auto max-w-3xl space-y-6">
				<a className="inline-flex min-h-11 items-center underline" href="/app/selena">
					Back to workspace
				</a>
				<h1 className="font-serif text-3xl">Local Visibility — $49 once</h1>
				<p className="font-semibold">
					Test checkout. No money is charged. Test execution uses fixture data, not new Google Maps measurements.
				</p>
				{error && <p role="alert">{error}</p>}
				{historyError && <p role="status">Recent history is temporarily unavailable. You can still use this order.</p>}
				{history.length > 0 && (
					<details>
						<summary className="min-h-11 cursor-pointer py-3 font-semibold">Recent test orders</summary>
						<ul className="space-y-2">
							{history.map((item) => (
								<li key={item.id}>
									<a
										className="inline-flex min-h-11 items-center underline"
										href={`/selena/local/checkout?order=${item.id}`}
									>
										{item.name} · {item.queryCount} queries · {new Date(item.createdAt).toLocaleDateString()} ·{" "}
										{item.status === "READY"
											? "Test report ready"
											: item.status === "AWAITING_PAYMENT"
												? "Awaiting test payment"
												: "Open order"}
									</a>
								</li>
							))}
						</ul>
						<p>Latest 50 orders in this workspace. Test results are separate from real Google Maps measurements.</p>
					</details>
				)}
				{busy && <p role="status">Loading…</p>}
				{!order && !busy && (
					<button type="button" className={button} onClick={() => setAdding(!adding)}>
						{adding ? "Close restaurant form" : "Add a restaurant"}
					</button>
				)}
				{!order && adding && (
					<SelenaLocalRestaurantForm
						onRegistered={(location) => {
							setLocations((rows) => [...rows.filter((r) => r.id !== location.id), location]);
							setLocationId(location.id);
							setAdding(false);
						}}
					/>
				)}
				{!order && !adding && (
					<form
						className="space-y-5"
						onSubmit={(event) => {
							event.preventDefault();
							void create();
						}}
					>
						{!busy && !locations.length && (
							<p>
								No confirmed restaurant is available in this workspace. Confirm its Maps identity and coordinates before
								ordering.
							</p>
						)}
						<label className="block space-y-2">
							<span>Restaurant</span>
							<select
								className={field}
								required
								disabled={busy}
								value={locationId}
								onChange={(e) => setLocationId(e.target.value)}
							>
								{locations.map((l) => (
									<option key={l.id} value={l.id}>
										{l.name}
									</option>
								))}
							</select>
						</label>
						<label className="block space-y-2">
							<span>Search queries — one per line, up to 15</span>
							<textarea
								className={field}
								rows={5}
								required
								maxLength={4500}
								disabled={busy}
								value={queries}
								onChange={(e) => setQueries(e.target.value)}
								placeholder="Greek restaurant Uluwatu"
							/>
						</label>
						<label className="block space-y-2">
							<span>Search language</span>
							<select className={field} disabled={busy} value={language} onChange={(e) => setLanguage(e.target.value)}>
								<option value="en">English</option>
								<option value="ru">Russian</option>
							</select>
						</label>
						<label className="block space-y-2">
							<span>Measurement grid — 3 km radius</span>
							<select className={field} disabled={busy} value={size} onChange={(e) => setSize(Number(e.target.value))}>
								<option value={3}>3 × 3 — 9 points per query</option>
								<option value={5}>5 × 5 — 25 points per query</option>
							</select>
						</label>
						<button className={button} disabled={busy || !locationId} type="submit">
							Review $49 test order
						</button>
					</form>
				)}
				{order && (
					<section className="space-y-4" aria-label="Order review">
						<h2 className="text-xl font-semibold">
							Your order — ${order.snapshot.offer.priceAmount} {order.snapshot.offer.currency}
						</h2>
						<p>
							{order.snapshot.queries.length} queries · {order.snapshot.grid.size} × {order.snapshot.grid.size} points ·{" "}
							{order.snapshot.expectedSlots} observations · {order.snapshot.language}
						</p>
						<ul className="list-disc pl-5">
							{order.snapshot.queries.map((q) => (
								<li key={q}>{q}</li>
							))}
						</ul>
						{expired ? (
							<p role="status">This quote has expired. Create a new order to review the current terms.</p>
						) : order.status === "AWAITING_PAYMENT" ? (
							<button className={button} disabled={busy} onClick={() => void pay()} type="button">
								Confirm test payment — no charge
							</button>
						) : order.status === "PAID_REVIEW_REQUIRED" ? (
							<>
								<p role="status">Test payment recorded. Execution has not started.</p>
								<button className={button} type="button" disabled={busy} onClick={() => void start()}>
									Run test — fixture data only
								</button>
							</>
						) : !order.execution ? (
							<p role="status">
								This order is no longer awaiting payment. Check its execution status with your operator.
							</p>
						) : null}
						{order.status === "AWAITING_PAYMENT" && !expired && (
							<p>Quote valid until {new Date(order.expiresAt).toLocaleString()}.</p>
						)}
						{order.execution && <SelenaLocalPublicationLinks orderId={order.id} status={order.execution.status} />}
						{order.execution && (
							<section className="space-y-4" aria-label="Test execution results">
								<h2 className="text-xl font-semibold">
									{order.execution.status === "READY" ? "Test report — fixture data" : "Test execution progress"}
								</h2>
								<p role="status">
									{order.execution.completed} of {order.execution.expected} points completed.
								</p>
								<progress
									className="w-full"
									max={order.execution.expected}
									value={order.execution.completed}
									aria-label="Completed test points"
								/>
								<p>
									These are generated test results. They are not Google Maps positions and must not be used to assess
									the restaurant.
								</p>
								{order.execution.status === "READY" && (
									<a
										className="inline-flex min-h-11 items-center underline"
										href={`/api/v1/selena/local-orders/${order.id}/?download=csv`}
									>
										Download test report (CSV)
									</a>
								)}
								{order.execution.status === "FAILED" && (
									<>
										<p role="alert">Test processing stopped. Completed points are saved.</p>
										{order.execution.failures < 3 ? (
											<button type="button" className={button} disabled={busy} onClick={() => void start(true)}>
												Resume test run
											</button>
										) : (
											<p>Retry limit reached. Contact support with this order page.</p>
										)}
									</>
								)}
								<label className="block space-y-2">
									<span>Result query</span>
									<select
										className={field}
										aria-label="Result query"
										value={selectedQuery}
										onChange={(e) => setSelectedQuery(Number(e.target.value))}
									>
										{order.snapshot.queries.map((q, i) => (
											<option key={q} value={i}>
												{q}
											</option>
										))}
									</select>
								</label>
								<div
									className="grid gap-2"
									style={{ gridTemplateColumns: `repeat(${order.snapshot.grid.size},minmax(0,1fr))` }}
								>
									{order.execution.tasks
										.filter((task) => task.queryIndex === selectedQuery)
										.map((task) => (
											<div
												key={task.pointIndex}
												className="rounded-xl border border-[#e6ddd1] bg-[#fffdf8] p-3 text-center"
											>
												<span>P{task.pointIndex + 1}</span>
												<br />
												<span>
													{task.status !== "DONE"
														? "Pending"
														: task.result?.targetRank == null
															? "Absent"
															: `#${task.result.targetRank}`}
												</span>
											</div>
										))}
								</div>
							</section>
						)}
						{(expired || ["CANCELLED", "READY", "COMPLETED"].includes(order.status)) && (
							<button type="button" disabled={busy} className={button} onClick={newOrder}>
								Create a new order
							</button>
						)}
					</section>
				)}
			</div>
		</main>
	);
}
