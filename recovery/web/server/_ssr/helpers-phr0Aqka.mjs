import { d as and, f as eq } from "../_libs/drizzle-orm.mjs";
import { c as organization, d as prompts, r as brands, s as member } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as getRequestHeaders } from "./server-44w5PK5b.mjs";
import { t as getDeployment } from "./server-B0rVTxL5.mjs";
import { t as auth } from "./server-CDtmD6L-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/helpers-phr0Aqka.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "252dd262-a8c2-4282-9247-22ce7e596ede", e._sentryDebugIdIdentifier = "sentry-dbid-252dd262-a8c2-4282-9247-22ce7e596ede");
	} catch (e) {}
})();
/**
* Server-side auth helpers backed by better-auth.
*/
async function getAuthSession() {
	const headers = getRequestHeaders();
	return auth.api.getSession({ headers });
}
async function requireAuthSession() {
	const session = await getAuthSession();
	if (!session) throw new Error("Unauthorized: Authentication required");
	return session;
}
function isAdmin(session) {
	return session.user.role === "admin";
}
async function requireAdmin() {
	const session = await requireAuthSession();
	if (!isAdmin(session)) throw new Error("Unauthorized: Admin access required");
	return session;
}
function hasReportAccess(session) {
	if (!getDeployment().features.reportGeneration) return false;
	return session.user.hasReportGeneratorAccess === true;
}
async function checkOrgAccess(userId, orgId) {
	const [row] = await db.select({ id: member.id }).from(member).where(and(eq(member.userId, userId), eq(member.organizationId, orgId))).limit(1);
	return !!row;
}
async function requireOrgAccess(userId, orgId) {
	if (!await checkOrgAccess(userId, orgId)) throw new Error("Forbidden: No access to this organization");
}
/**
* Whether the user may access a brand, resolved through the brand's owning org
* (`brands.organizationId`) — the umbrella-org access rule. A single joined
* query: brand → its org → a membership row for this user.
*/
async function checkBrandAccess(userId, brandId) {
	const [row] = await db.select({ id: member.id }).from(brands).innerJoin(member, and(eq(member.organizationId, brands.organizationId), eq(member.userId, userId))).where(eq(brands.id, brandId)).limit(1);
	return !!row;
}
async function requireBrandAccess(userId, brandId) {
	if (!await checkBrandAccess(userId, brandId)) throw new Error("Forbidden: No access to this brand");
}
/**
* The brand's owning org plus the caller's membership in it — for callers that
* need the org itself, not just an access verdict. Resolves both in the one
* query that `requireBrandAccess` would have spent on the check alone.
*
* A missing brand and a brand in someone else's org are deliberately the same
* error: the caller has no business distinguishing them.
*/
async function requireBrandOrganization(userId, brandId) {
	const [row] = await db.select({
		id: organization.id,
		name: organization.name,
		role: member.role
	}).from(brands).innerJoin(member, and(eq(member.organizationId, brands.organizationId), eq(member.userId, userId))).innerJoin(organization, eq(organization.id, brands.organizationId)).where(eq(brands.id, brandId)).limit(1);
	if (!row) throw new Error("Forbidden: No access to this brand");
	return row;
}
/**
* DS-P1-10: mutations state the roles they accept. Built on the same single
* query as requireBrandOrganization, so the role check costs nothing extra.
* Reads keep requireBrandAccess.
*/
async function requireBrandRole(userId, brandId, allowed) {
	const { role } = await requireBrandOrganization(userId, brandId);
	if (!allowed.includes(role)) throw new Error("Forbidden: insufficient role for this action");
}
/** Every role that may change data; a viewer reads. */
var BRAND_WRITER_ROLES = [
	"owner",
	"admin",
	"member"
];
/**
* DS-P1-28: the one scoped prompt read. Joins prompt → brand → membership so
* authorization happens inside the query, not after it; "no such prompt" and
* "not yours" are deliberately the same undefined.
*/
async function promptForUser(userId, promptId) {
	const [row] = await db.select({ prompt: prompts }).from(prompts).innerJoin(brands, eq(prompts.brandId, brands.id)).innerJoin(member, and(eq(member.organizationId, brands.organizationId), eq(member.userId, userId))).where(eq(prompts.id, promptId)).limit(1);
	return row?.prompt;
}
/**
* Oldest membership first, so a user's own workspace precedes any they were
* invited into. `organization.id` breaks ties, which a batch Auth0 sync
* produces by stamping every membership it creates with the same timestamp.
*/
async function listUserOrganizations(userId) {
	return db.select({
		id: organization.id,
		name: organization.name,
		role: member.role
	}).from(member).innerJoin(organization, eq(member.organizationId, organization.id)).where(eq(member.userId, userId)).orderBy(member.createdAt, organization.id);
}
//#endregion
export { listUserOrganizations as a, requireAuthSession as c, requireBrandRole as d, requireOrgAccess as f, isAdmin as i, requireBrandAccess as l, checkOrgAccess as n, promptForUser as o, hasReportAccess as r, requireAdmin as s, BRAND_WRITER_ROLES as t, requireBrandOrganization as u };

//# sourceMappingURL=helpers-phr0Aqka.mjs.map