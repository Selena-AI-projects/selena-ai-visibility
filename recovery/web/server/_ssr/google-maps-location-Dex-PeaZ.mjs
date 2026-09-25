//#region node_modules/.nitro/vite/services/ssr/assets/google-maps-location-Dex-PeaZ.js
/**
* Parse an owner-pasted Google Maps link into a stored snapshot without any
* network call: the catalog lock keeps Google Places out of the MVP, so the
* link itself is the input and everything we keep must be readable from it.
* The snapshot pins the exact listing (name, pin coordinates, CID) so mention
* analysis can tell this business apart from same-named ones and scenario
* suggestions can be scoped to the real location.
*
* Share links (maps.app.goo.gl, goo.gl/maps) are accepted as-is: they cannot
* be expanded offline, so their snapshot carries only the URL.
*/
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f45197dd-8fc1-4311-a589-c04b6763abdd", e._sentryDebugIdIdentifier = "sentry-dbid-f45197dd-8fc1-4311-a589-c04b6763abdd");
	} catch (e) {}
})();
function parseGoogleMapsLocation(input) {
	const trimmed = input.trim();
	if (!trimmed) return {
		isValid: false,
		error: "Google Maps link is required"
	};
	const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	let url;
	try {
		url = new URL(candidate);
	} catch {
		return {
			isValid: false,
			error: "Please enter a valid Google Maps link"
		};
	}
	url.username = "";
	url.password = "";
	const hostname = url.hostname.toLowerCase();
	if (hostname === "maps.app.goo.gl" || hostname === "goo.gl" && url.pathname.startsWith("/maps")) {
		if (url.pathname === "/" || url.pathname === "/maps" || url.pathname === "/maps/") return {
			isValid: false,
			error: "The share link is missing its place code"
		};
		return {
			isValid: true,
			location: {
				url: url.toString(),
				placeName: null,
				latitude: null,
				longitude: null,
				cid: null
			}
		};
	}
	if (!isGoogleMapsHostAndPath(url)) return {
		isValid: false,
		error: "The link does not look like a Google Maps place link"
	};
	return {
		isValid: true,
		location: {
			url: url.toString(),
			placeName: extractPlaceName(url.pathname),
			...extractCoordinates(url),
			cid: extractCid(url)
		}
	};
}
function isGoogleMapsHostAndPath(url) {
	const hostname = url.hostname.toLowerCase();
	if (!/^(?:www\.|maps\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(hostname)) return false;
	const isMapsPath = url.pathname === "/maps" || url.pathname.startsWith("/maps/");
	const hasCid = /^\d+$/.test(url.searchParams.get("cid") ?? "");
	return isMapsPath || hostname.startsWith("maps.") || hasCid;
}
/** Whether an absolute URL points at a Google Maps listing or share link. */
function isGoogleMapsLink(href) {
	let url;
	try {
		url = new URL(href);
	} catch {
		return false;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return false;
	const hostname = url.hostname.toLowerCase();
	if (hostname === "maps.app.goo.gl") return url.pathname !== "/";
	if (hostname === "goo.gl") return url.pathname.startsWith("/maps");
	return isGoogleMapsHostAndPath(url);
}
/** Narrow a stored jsonb value back into the snapshot shape, field by field. */
function readStoredGoogleMapsLocation(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const row = value;
	if (typeof row.url !== "string" || !row.url) return null;
	return {
		url: row.url,
		placeName: typeof row.placeName === "string" ? row.placeName : null,
		latitude: typeof row.latitude === "number" && Number.isFinite(row.latitude) ? row.latitude : null,
		longitude: typeof row.longitude === "number" && Number.isFinite(row.longitude) ? row.longitude : null,
		cid: typeof row.cid === "string" ? row.cid : null
	};
}
function extractPlaceName(pathname) {
	const segment = pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
	if (!segment) return null;
	const spaced = segment.replace(/\+/g, " ");
	try {
		return decodeURIComponent(spaced) || null;
	} catch {
		return spaced || null;
	}
}
function extractCoordinates(url) {
	const pin = [...url.href.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)].at(-1) ?? url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
	if (!pin) return {
		latitude: null,
		longitude: null
	};
	const latitude = Number.parseFloat(pin[1] ?? "");
	const longitude = Number.parseFloat(pin[2] ?? "");
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return {
		latitude: null,
		longitude: null
	};
	return {
		latitude,
		longitude
	};
}
function extractCid(url) {
	const direct = url.searchParams.get("cid");
	if (direct && /^\d+$/.test(direct)) return direct;
	const hex = (url.searchParams.get("ftid") ?? url.href).match(/0x[0-9a-f]+:0x([0-9a-f]+)/i)?.[1];
	if (!hex) return null;
	try {
		const cid = BigInt(`0x${hex}`);
		return cid > BigInt(0) ? cid.toString() : null;
	} catch {
		return null;
	}
}
//#endregion
export { parseGoogleMapsLocation as n, readStoredGoogleMapsLocation as r, isGoogleMapsLink as t };

//# sourceMappingURL=google-maps-location-Dex-PeaZ.mjs.map