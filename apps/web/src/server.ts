import "../instrument.server.mjs";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { reportUnknownSelenaEnv } from "@workspace/config/env";
import { startCredentialRefresh } from "@workspace/lib/secrets";
import { callerKey, createRateLimiter, policyForRequest, tooManyRequests } from "@/lib/rate-limit";

// A gate nobody reads is a gate nobody has: a misspelled flag name is not a
// broken ceiling, it is no ceiling, and every gate here fails closed on the
// exact string. Say which variables are set and unread before serving.
reportUnknownSelenaEnv();

// Not awaited: the app has to serve sign-in and settings whether or not the
// credential store is reachable.
void startCredentialRefresh();

// HSTS asserts HTTPS-only for the host that served the response. Whitelabel
// deployments run on customer-controlled custom domains, where `includeSubDomains`
// would wrongly assert HTTPS across subdomains we don't own — so that directive
// is scoped to our own deployments. Browsers ignore HSTS received over plain
// HTTP, so it stays inert on localhost.
const strictTransportSecurity =
	process.env.DEPLOYMENT_MODE === "whitelabel" ? "max-age=63072000" : "max-age=63072000; includeSubDomains";

const SECURITY_HEADERS: Record<string, string> = {
	"Content-Security-Policy": [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://*.clarity.ms https://var.elmohq.com",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: https: https://c.bing.com",
		"font-src 'self' data:",
		"connect-src 'self' https://var.elmohq.com https://*.sentry.io https://*.clarity.ms https://c.bing.com",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	].join("; "),
	"Strict-Transport-Security": strictTransportSecurity,
	"X-Frame-Options": "DENY",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	// same-origin-allow-popups (not same-origin) keeps OAuth/SSO popups that rely on
	// window.opener working while still isolating us from cross-origin openers.
	"Cross-Origin-Opener-Policy": "same-origin-allow-popups",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
};

function addSecurityHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		headers.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

const rateLimiter = createRateLimiter();

export default createServerEntry(
	wrapFetchWithSentry({
		async fetch(request: Request) {
			const policy = policyForRequest(request);
			if (policy) {
				const decision = rateLimiter.check(callerKey(request), policy);
				// Refused before the handler runs: the point is to not do the work,
				// not to do it and discard the answer.
				if (!decision.allowed) return addSecurityHeaders(tooManyRequests(decision.retryAfterSeconds));
			}
			const response = await handler.fetch(request);
			return addSecurityHeaders(response);
		},
	}),
);
