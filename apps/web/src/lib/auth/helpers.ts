/**
 * Server-side auth helpers backed by better-auth.
 */
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "@workspace/lib/db/db";
import { prompts } from "@workspace/lib/db/schema";
import {
	resolveBrandMembership,
	resolvePromptMembership,
	resolveSessionMemberships,
	resolveUserOrganizations,
} from "@workspace/lib/db/session-membership-bootstrap";
import { eq } from "drizzle-orm";
import { getDeployment } from "@/lib/config/server";
import { enterInternalScope, enterOrganizationScope } from "@/lib/tenant-scope";
import { auth } from "./server";

type SessionLike = { user: { id: string; [key: string]: unknown }; session?: unknown };

export async function getAuthSession() {
	const headers = getRequestHeaders();
	return auth.api.getSession({ headers });
}

export async function requireAuthSession() {
	const session = await getAuthSession();
	if (!session) throw new Error("Unauthorized: Authentication required");
	return session;
}

export function isAdmin(session: SessionLike): boolean {
	return session.user.role === "admin";
}

/** Passing switches the request to the operator connection; see `enterInternalScope`. */
export async function requireAdmin() {
	const session = await requireAuthSession();
	if (!isAdmin(session)) throw new Error("Unauthorized: Admin access required");
	await enterInternalScope({ id: session.user.id, kind: "platform_admin" }, getRequest());
	return session;
}

export function hasReportAccess(session: SessionLike): boolean {
	// Report generation is disabled entirely in deployments that don't support
	// it (cloud), so the per-user flag is ignored there.
	if (!getDeployment().features.reportGeneration) return false;
	return session.user.hasReportGeneratorAccess === true;
}

/**
 * Whether the user belongs to the organization. A passing check pins the
 * request to it, so the caller's queries that follow run in its tenant scope.
 */
export async function checkOrgAccess(userId: string, orgId: string): Promise<boolean> {
	const memberships = await resolveSessionMemberships(db, userId);
	if (!memberships.some((row) => row.organizationId === orgId)) return false;
	await enterOrganizationScope(orgId, userId);
	return true;
}

export async function requireOrgAccess(userId: string, orgId: string): Promise<void> {
	if (!(await checkOrgAccess(userId, orgId))) {
		throw new Error("Forbidden: No access to this organization");
	}
}

export async function requireBrandAccess(userId: string, brandId: string): Promise<void> {
	await requireBrandOrganization(userId, brandId);
}

/**
 * The brand's owning org plus the caller's membership in it. Passing pins the
 * request to that org, so the caller's queries that follow run in its tenant
 * scope.
 *
 * A missing brand and a brand in someone else's org are deliberately the same
 * error: the caller has no business distinguishing them.
 */
export async function requireBrandOrganization(
	userId: string,
	brandId: string,
): Promise<{ id: string; name: string; role: string }> {
	const membership = await resolveBrandMembership(db, userId, brandId);
	if (!membership) throw new Error("Forbidden: No access to this brand");
	await enterOrganizationScope(membership.organizationId, userId);
	return { id: membership.organizationId, name: membership.organizationName, role: membership.role };
}

/**
 * DS-P1-10: mutations state the roles they accept. Built on the same single
 * query as requireBrandOrganization, so the role check costs nothing extra.
 * Reads keep requireBrandAccess.
 */
export async function requireBrandRole(userId: string, brandId: string, allowed: string[]): Promise<void> {
	const { role } = await requireBrandOrganization(userId, brandId);
	if (!allowed.includes(role)) throw new Error("Forbidden: insufficient role for this action");
}

/** Every role that may change data; a viewer reads. */
export const BRAND_WRITER_ROLES = ["owner", "admin", "member"];

/**
 * DS-P1-28: the one scoped prompt read. Membership is resolved before the
 * prompt is read, and the read runs in the prompt's tenant scope; "no such
 * prompt" and "not yours" are deliberately the same undefined.
 */
export async function promptForUser(userId: string, promptId: string) {
	const membership = await resolvePromptMembership(db, userId, promptId);
	if (!membership) return undefined;
	await enterOrganizationScope(membership.organizationId, userId);
	return db.query.prompts.findFirst({ where: eq(prompts.id, promptId) });
}

/**
 * Oldest membership first, so a user's own workspace precedes any they were
 * invited into. `organization.id` breaks ties, which a batch Auth0 sync
 * produces by stamping every membership it creates with the same timestamp.
 */
export async function listUserOrganizations(userId: string): Promise<{ id: string; name: string; role: string }[]> {
	return resolveUserOrganizations(db, userId);
}
