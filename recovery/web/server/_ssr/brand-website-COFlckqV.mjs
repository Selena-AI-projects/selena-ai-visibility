import { s as cleanAndValidateDomain } from "./domain-categories-IivSiXtp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/brand-website-COFlckqV.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "9b38ebb1-9988-4bad-83c9-6272826abb8e", e._sentryDebugIdIdentifier = "sentry-dbid-9b38ebb1-9988-4bad-83c9-6272826abb8e");
	} catch (e) {}
})();
/**
* Validate a user-entered brand website. Accepts either a bare domain
* (`example.com`) or a full URL, and keeps the path, query, and hash: pointing
* a brand at `https://www.nike.com/golf` is how a sub-brand gets analyzed from
* its own section of a larger site. Everything that tracks mentions and
* citations reduces this to its hostname, so the tracked domain is unchanged
* either way.
*
* Credentials are dropped — this value is handed to the page fetcher.
*/
function validateWebsiteUrl(input) {
	if (!input || input.trim() === "") return {
		isValid: false,
		error: "Website URL is required"
	};
	let candidate = input.trim();
	if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) candidate = `https://${candidate}`;
	let urlObj;
	try {
		urlObj = new URL(candidate);
	} catch {
		return {
			isValid: false,
			error: "Please enter a valid website URL or domain"
		};
	}
	if (!cleanAndValidateDomain(urlObj.hostname)) return {
		isValid: false,
		error: "Website URL must have a valid domain name"
	};
	urlObj.username = "";
	urlObj.password = "";
	return {
		isValid: true,
		formattedUrl: urlObj.toString()
	};
}
//#endregion
export { validateWebsiteUrl as t };

//# sourceMappingURL=brand-website-COFlckqV.mjs.map