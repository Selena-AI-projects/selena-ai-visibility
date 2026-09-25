import { timingSafeEqual } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/policies-CGhErjzS.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "05a98d2f-4087-4bd6-9c7b-f0028cbb3479", e._sentryDebugIdIdentifier = "sentry-dbid-05a98d2f-4087-4bd6-9c7b-f0028cbb3479");
	} catch (e) {}
})();
/**
* Pure policy evaluation functions for access control.
*
* These are framework-agnostic, side-effect-free functions that encode
* the access control rules for each deployment mode. They are called
* by the TanStack middleware / route guards and tested independently.
*
* The goal: every access-control decision in the app should be traceable
* to one of these functions, making it trivial to write regression tests.
*/
/** HTTP methods that mutate state */
var WRITE_METHODS = /* @__PURE__ */ new Set([
	"POST",
	"PUT",
	"PATCH",
	"DELETE"
]);
/**
* Exact better-auth endpoints that remain writable in read-only mode.
*
* Whitelist rather than blacklist: every other `/api/auth/**` write is
* rejected in demo, so new better-auth endpoints (from plugins we add or
* library upgrades) are blocked by default instead of silently becoming
* reachable. Only sign-in and sign-out need to work for a demo visitor
* — everything else (change-password, change-email, update-user,
* delete-user, forget-password, admin plugin endpoints, etc.) has no
* business mutating the shared demo account.
*/
var DEMO_AUTH_WRITE_ALLOWLIST = /* @__PURE__ */ new Set([
	"/api/auth/sign-in/email",
	"/api/auth/sign-in/email/",
	"/api/auth/sign-out",
	"/api/auth/sign-out/"
]);
/**
* Evaluate request-level deployment access policy.
*
* Encodes the logic from `deploymentMiddleware` as a pure function:
* 1. Read-only mode blocks API + server-function writes (except analytics events)
* 2. Admin access control (disabled / readonly / full)
* 3. OpenAPI spec serving
* 4. API v1 key authentication
*/
function evaluateDeploymentPolicy(features, request, options) {
	const { pathname, method, authorizationHeader } = request;
	const isWriteMethod = WRITE_METHODS.has(method);
	const isPlausibleEventRoute = pathname === "/api/plausible/event" || pathname === "/api/plausible/event/";
	const isApiRoute = pathname.startsWith("/api/");
	const isServerFunctionRoute = pathname.startsWith("/_server");
	const isAllowedAuthWrite = DEMO_AUTH_WRITE_ALLOWLIST.has(pathname);
	if (pathname.startsWith("/api/auth/organization/") && isWriteMethod) return {
		action: "block",
		status: 403,
		error: "Forbidden",
		message: "Organization mutations are not available via the API"
	};
	if (features.readOnly && isWriteMethod) {
		if ((isApiRoute || isServerFunctionRoute) && !isPlausibleEventRoute && !isAllowedAuthWrite) return {
			action: "block",
			status: 403,
			error: "Demo Mode",
			message: "Write operations are disabled in demo mode"
		};
	}
	const isOpenApi = pathname === "/api/v1/openapi.json" || pathname === "/api/v1/openapi.json/";
	if (isOpenApi && method === "GET") return { action: "serve-openapi" };
	const isPublicApiV1 = pathname.startsWith("/api/v1/");
	const isPublicApiV1Doc = pathname === "/api/v1/docs" || pathname === "/api/v1/docs/";
	const isSelenaTenantApi = pathname.startsWith("/api/v1/selena/");
	if (isPublicApiV1 && !isPublicApiV1Doc && !isOpenApi && !isSelenaTenantApi) {
		const keyResult = evaluateApiKeyAuth(authorizationHeader, options?.adminApiKeys ?? []);
		if (keyResult !== "allow") return {
			action: "block",
			status: 401,
			error: keyResult.error,
			message: keyResult.message
		};
	}
	return { action: "allow" };
}
/**
* Constant-time string comparison to prevent timing attacks on API keys.
* Returns true if the strings are equal, false otherwise.
*/
function timingSafeStringEqual(a, b) {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) {
		timingSafeEqual(bufA, bufA);
		return false;
	}
	return timingSafeEqual(bufA, bufB);
}
/**
* Evaluate Bearer token API key authentication.
* Returns "allow" or an object with error details.
* Uses timing-safe comparison to prevent timing attacks.
*/
function evaluateApiKeyAuth(authorizationHeader, adminApiKeys) {
	if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) return {
		error: "Unauthorized",
		message: "Valid API key required as Bearer token in Authorization header"
	};
	const token = authorizationHeader.substring(7);
	if (adminApiKeys.length === 0 || !adminApiKeys.some((key) => timingSafeStringEqual(key, token))) return {
		error: "Unauthorized",
		message: "Invalid API key"
	};
	return "allow";
}
/**
* Parse comma-separated ADMIN_API_KEYS env var into a trimmed, non-empty array.
* Single source of truth — use this everywhere instead of inline parsing.
*/
function getAdminApiKeys() {
	return (process.env.ADMIN_API_KEYS || "").split(",").map((key) => key.trim()).filter(Boolean);
}
/**
* Validate a Bearer API key from a request.
* Convenience wrapper for use in API route handlers.
*/
function validateApiKeyFromRequest(request) {
	return evaluateApiKeyAuth(request.headers.get("Authorization"), getAdminApiKeys()) === "allow";
}
/**
* Evaluate admin access requirement.
* Used by `requireAdminMiddleware`.
*/
function evaluateRequireAdmin(isAdmin) {
	return isAdmin ? "allow" : "deny";
}
function resolveBrandOrganization(memberOrgIds, requestedOrgId) {
	if (memberOrgIds.length === 0) return {
		ok: false,
		reason: "no-organization"
	};
	if (requestedOrgId) return memberOrgIds.includes(requestedOrgId) ? {
		ok: true,
		organizationId: requestedOrgId
	} : {
		ok: false,
		reason: "forbidden"
	};
	if (memberOrgIds.length === 1) return {
		ok: true,
		organizationId: memberOrgIds[0]
	};
	return {
		ok: false,
		reason: "ambiguous"
	};
}
/**
* Evaluate read-only mode enforcement.
* Used by `readOnlyMiddleware` for server functions.
*/
function evaluateReadOnly(readOnly) {
	return readOnly ? "deny" : "allow";
}
/**
* Evaluate whether the deployment allows the user to create brands from the UI.
* Used by the create-brand server function. Local mode is the only mode that
* allows it — whitelabel orgs come from Auth0, demo is read-only.
*/
function evaluateRequireCanCreateBrands(canCreateBrands) {
	return canCreateBrands ? "allow" : "deny";
}
//#endregion
export { evaluateRequireCanCreateBrands as a, validateApiKeyFromRequest as c, evaluateRequireAdmin as i, evaluateDeploymentPolicy as n, getAdminApiKeys as o, evaluateReadOnly as r, resolveBrandOrganization as s, evaluateApiKeyAuth as t };

//# sourceMappingURL=policies-CGhErjzS.mjs.map