import { useState } from "react";

const field =
	"min-h-11 w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 py-2 text-[#181614] focus-visible:outline-2 focus-visible:outline-offset-4";
export function SelenaLocalRestaurantForm({
	onRegistered,
}: {
	onRegistered: (location: { id: string; projectId: string; name: string }) => void;
}) {
	const [name, setName] = useState(""),
		[url, setUrl] = useState(""),
		[country, setCountry] = useState("ID"),
		[coordinates, setCoordinates] = useState(""),
		[confirmed, setConfirmed] = useState(false);
	const [busy, setBusy] = useState(false),
		[error, setError] = useState("");
	async function submit() {
		if (busy) return;
		setBusy(true);
		setError("");
		try {
			if (!/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(coordinates))
				throw new Error("Enter latitude and longitude separated by a comma.");
			const [latitude, longitude] = coordinates.split(",").map(Number);
			const body = JSON.stringify({ name, countryCode: country, mapsUrl: url, latitude, longitude, confirmed });
			const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body))))
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
			const storageKey = `selena-local-restaurant:${hash}`,
				key = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
			sessionStorage.setItem(storageKey, key);
			const response = await fetch("/api/v1/selena/local-orders/locations", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json", "Idempotency-Key": key },
				body,
			});
			if (!response.ok) {
				const result = await response.json().catch(() => null);
				throw new Error(
					result?.error?.code === "FULL_MAPS_PLACE_LINK_REQUIRED"
						? "Use the full Google Maps place link from your browser. Short sharing links and search-result links cannot confirm a restaurant."
						: "Could not save the restaurant. Check the link, coordinates and your workspace permissions.",
				);
			}
			onRegistered(await response.json());
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not save restaurant.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				void submit();
			}}
		>
			<h2 className="text-xl font-semibold">Add your restaurant</h2>
			<p>
				Open the correct place in Google Maps and copy its full browser link. Right-click the restaurant’s point to copy
				its coordinates. These coordinates will be the center of your measurement grid.
			</p>
			<label className="block space-y-2">
				<span>Restaurant name</span>
				<input
					className={field}
					required
					maxLength={160}
					disabled={busy}
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</label>
			<label className="block space-y-2">
				<span>Full Google Maps place link</span>
				<input
					type="url"
					className={field}
					required
					maxLength={3000}
					disabled={busy}
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="https://www.google.com/maps/place/…"
				/>
			</label>
			<label className="block space-y-2">
				<span>Country — two-letter code</span>
				<input
					className={field}
					required
					pattern="[A-Z]{2}"
					maxLength={2}
					disabled={busy}
					value={country}
					onChange={(e) => setCountry(e.target.value.toUpperCase())}
				/>
			</label>
			<label className="block space-y-2">
				<span>Restaurant coordinates — latitude, longitude</span>
				<input
					className={field}
					required
					disabled={busy}
					value={coordinates}
					onChange={(e) => setCoordinates(e.target.value)}
					placeholder="-8.81656, 115.09581"
				/>
			</label>
			<label className="flex min-h-11 items-center gap-3">
				<input
					type="checkbox"
					required
					disabled={busy}
					checked={confirmed}
					onChange={(e) => setConfirmed(e.target.checked)}
				/>
				<span>I checked that this is the correct restaurant and the correct point on the map.</span>
			</label>
			<p className="text-sm">Saving confirms your selection. It does not verify a ranking or start a measurement.</p>
			{error && <p role="alert">{error}</p>}
			<button
				className="min-h-11 rounded-xl bg-[#181614] px-5 py-3 font-semibold text-[#fffdf8] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4"
				type="submit"
				disabled={busy}
			>
				{busy ? "Saving…" : "Save restaurant"}
			</button>
		</form>
	);
}
