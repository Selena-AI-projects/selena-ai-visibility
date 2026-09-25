import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
//#region node_modules/.nitro/vite/services/ssr/assets/website-security-Cz8PLhxo.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "cd7d2b9b-9f2b-4f59-8303-3764db2b1c27", e._sentryDebugIdIdentifier = "sentry-dbid-cd7d2b9b-9f2b-4f59-8303-3764db2b1c27");
	} catch (e) {}
})();
var WEBSITE_ALLOWED_MIME = /* @__PURE__ */ new Set([
	"text/html",
	"application/xhtml+xml",
	"text/plain",
	"application/xml",
	"text/xml"
]);
function isBlockedWebsiteIp(value) {
	const ip = value.replace(/^\[|\]$/g, "").toLowerCase();
	if (isIP(ip) === 4) {
		const [a, b] = ip.split(".").map(Number);
		return a === 0 || a === 10 || a === 100 && b >= 64 && b <= 127 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 192 && b === 0 || a === 198 && (b === 18 || b === 19 || b === 51) || a === 203 && b === 0 || a >= 224;
	}
	if (isIP(ip) === 6) return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb") || ip.startsWith("2001:db8") || ip.startsWith("ff");
	return false;
}
function assertWebsiteUrl(value) {
	const url = new URL(value);
	if (!/^https?:$/.test(url.protocol) || url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal") || isBlockedWebsiteIp(url.hostname) || url.username !== "" || url.password !== "" || url.port === "0") throw new Error("WEBSITE_PRIVATE_OR_INVALID_URL");
	return url;
}
/**
* The same boundary plus the hygiene a crawler needs before it compares URLs:
* a fragment never reaches the server, and a host differing only in case is
* the same host — leaving either in place makes a redirect loop look like
* progress.
*/
function normalizeWebsiteUrl(value) {
	const url = assertWebsiteUrl(value);
	url.hash = "";
	url.hostname = url.hostname.toLowerCase();
	return url;
}
function assertResolvedWebsiteHost(value, addresses) {
	const url = assertWebsiteUrl(value);
	if (addresses.some(isBlockedWebsiteIp)) throw new Error("WEBSITE_PRIVATE_OR_INVALID_URL");
	return url;
}
function assertWebsiteMime(contentType) {
	const mime = contentType?.split(";", 1)[0]?.trim().toLowerCase();
	if (mime && !WEBSITE_ALLOWED_MIME.has(mime)) throw new Error("WEBSITE_MIME_NOT_ALLOWED");
}
function assertRedirectBudget(chain) {
	if (chain.length - 1 > 3) throw new Error("WEBSITE_REDIRECT_LIMIT");
}
function assertResponseSize(body) {
	if (new TextEncoder().encode(body).byteLength > 1e6) throw new Error("WEBSITE_RESPONSE_TOO_LARGE");
}
/**
* Resolve a caller-supplied address and refuse anything that is not a public
* host. Both checks matter: the literal can be a private IP, and a public
* hostname can resolve to one.
*
* The resolved addresses are returned so a caller that follows redirects can
* revalidate every hop instead of trusting the first one.
*/
async function assertPublicWebsiteTarget(value) {
	const url = assertWebsiteUrl(value);
	const resolved = await lookup(url.hostname, {
		all: true,
		verbatim: true
	}).catch(() => []);
	if (!resolved.length) throw new Error("WEBSITE_DNS_FAILED");
	const addresses = resolved.map(({ address }) => address);
	assertResolvedWebsiteHost(url.href, addresses);
	return {
		url,
		addresses
	};
}
/**
* Fetch a public page with every boundary a caller-supplied URL needs:
* redirects are followed by hand so each hop is revalidated, the response type
* is checked before the body is read, and the body is capped while streaming
* rather than after it is already in memory.
*/
async function fetchPublicWebsite(value, init) {
	let currentHref = value;
	await assertPublicWebsiteTarget(currentHref);
	const chain = [currentHref];
	for (let hop = 0; hop <= 3; hop++) {
		const response = await fetch(currentHref, {
			redirect: "manual",
			headers: init.headers ?? {},
			signal: AbortSignal.timeout(init.timeoutMs)
		});
		if (response.status < 300 || response.status >= 400) {
			assertWebsiteMime(response.headers.get("content-type"));
			const body = await readCappedBody(response);
			return {
				status: response.status,
				body,
				finalUrl: currentHref
			};
		}
		const location = response.headers.get("location");
		if (!location) return null;
		assertRedirectBudget(chain);
		currentHref = new URL(location, currentHref).href;
		await assertPublicWebsiteTarget(currentHref);
		if (chain.includes(currentHref)) throw new Error("WEBSITE_REDIRECT_LOOP");
		chain.push(currentHref);
	}
	throw new Error("WEBSITE_REDIRECT_LIMIT");
}
/**
* Read at most the cap, so an endless response cannot be buffered whole.
* Streams when the runtime exposes a body reader, and falls back to text()
* (still size-checked) for responses that don't — e.g. test doubles.
*/
async function readCappedBody(response) {
	if (Number(response.headers.get("content-length") ?? "0") > 1e6) throw new Error("WEBSITE_RESPONSE_TOO_LARGE");
	const reader = response.body?.getReader?.();
	if (!reader) {
		const text = await response.text();
		assertResponseSize(text);
		return text;
	}
	const decoder = new TextDecoder();
	let received = 0;
	let text = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		received += value.byteLength;
		if (received > 1e6) {
			await reader.cancel();
			throw new Error("WEBSITE_RESPONSE_TOO_LARGE");
		}
		text += decoder.decode(value, { stream: true });
	}
	return text + decoder.decode();
}
//#endregion
export { normalizeWebsiteUrl as i, assertWebsiteUrl as n, fetchPublicWebsite as r, assertPublicWebsiteTarget as t };

//# sourceMappingURL=website-security-Cz8PLhxo.mjs.map