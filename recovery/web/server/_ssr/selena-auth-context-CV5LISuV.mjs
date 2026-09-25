import { r as __exportAll } from "./rolldown-runtime-BXiOSzN2.mjs";
import { L as sql, f as eq } from "../_libs/drizzle-orm.mjs";
import { c as organization, s as member } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as getRequestHeaders } from "./server-44w5PK5b.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-auth-context-CV5LISuV.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "84b401e5-20e7-4142-91e0-40edbc07b202", e._sentryDebugIdIdentifier = "sentry-dbid-84b401e5-20e7-4142-91e0-40edbc07b202");
	} catch (e) {}
})();
/**
* Resolves the tenant for an API key before tenant RLS context can exist.
* Database permissions restrict this call to the narrow SECURITY DEFINER
* function installed at the 0051 migration frontier.
*/
async function resolveSelenaApiKeyBootstrap(db, keyHash) {
	const row = (await db.execute(sql`
		SELECT api_key_id, organization_id, permissions
		FROM public.sv_resolve_api_key_context(${keyHash})
	`)).rows[0];
	return row ? {
		apiKeyId: row.api_key_id,
		organizationId: row.organization_id,
		permissions: row.permissions
	} : null;
}
var selena_auth_context_exports = /* @__PURE__ */ __exportAll({
	canWrite: () => canWrite,
	resolveApiKeyAuthContext: () => resolveApiKeyAuthContext,
	resolveLocalWriteAuthContext: () => resolveLocalWriteAuthContext,
	resolveSessionAuthContext: () => resolveSessionAuthContext
});
function normalizeRole(role) {
	if (role === "owner" || role === "admin") return "owner";
	if (role === "viewer") return "viewer";
	return "member";
}
function hashApiKey(value) {
	return createHash("sha256").update(value).digest();
}
async function resolveSessionAuthContext() {
	const { auth } = await import("./server-CDtmD6L-.mjs").then((n) => n.r).then((n) => n.n);
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (!session) throw new Error("Unauthorized: authenticated session required");
	const activeOrg = session.session.activeOrganizationId;
	const rows = await db.select({
		tenantId: member.organizationId,
		role: member.role
	}).from(member).innerJoin(organization, eq(member.organizationId, organization.id)).where(eq(member.userId, session.user.id));
	const membership = activeOrg ? rows.find((row) => row.tenantId === activeOrg) : rows[0];
	if (!membership) throw new Error("Forbidden: no organization membership");
	return {
		actorId: session.user.id,
		tenantId: membership.tenantId,
		role: normalizeRole(membership.role),
		authType: "session",
		permissions: ["client:read", "client:write"]
	};
}
async function resolveApiKeyAuthContext(request) {
	const raw = request.headers.get("authorization")?.replace(/^Bearer\s+/, "");
	if (!raw) throw new Error("Unauthorized: API key required");
	const digest = hashApiKey(raw);
	const key = await resolveSelenaApiKeyBootstrap(db, digest.toString("hex"));
	if (!key) throw new Error("Unauthorized: invalid or expired API key");
	return {
		actorId: `api-key:${key.apiKeyId}`,
		tenantId: key.organizationId,
		role: "owner",
		authType: "api_key",
		permissions: key.permissions
	};
}
function canWrite(context) {
	return (context.role === "owner" || context.role === "member") && (context.authType === "session" || context.permissions.includes("client:write"));
}
/** Client setup uses its current workspace; machine callers retain explicit API scopes. */
async function resolveLocalWriteAuthContext(request, dependencies = {
	session: resolveSessionAuthContext,
	apiKey: resolveApiKeyAuthContext
}) {
	if (request.headers.has("authorization")) return dependencies.apiKey(request);
	if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("Forbidden: same-origin session request required");
	const context = await dependencies.session();
	if (context.authType !== "session" || !canWrite(context)) throw new Error("Forbidden: workspace write access required");
	return {
		...context,
		permissions: [.../* @__PURE__ */ new Set([...context.permissions, "local:write"])]
	};
}
//#endregion
export { selena_auth_context_exports as i, resolveApiKeyAuthContext as n, resolveSessionAuthContext as r, canWrite as t };

//# sourceMappingURL=selena-auth-context-CV5LISuV.mjs.map