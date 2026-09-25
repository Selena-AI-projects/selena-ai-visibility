import { createHash } from "node:crypto";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { resolveSelenaApiKeyBootstrap } from "@workspace/lib/db/api-key-bootstrap";
import { db } from "@workspace/lib/db/db";
import { pickSessionMembership, resolveSessionMemberships } from "@workspace/lib/db/session-membership-bootstrap";

export type SelenaRole = "owner" | "member" | "viewer";
export type AuthContext = {
	actorId: string;
	tenantId: string;
	role: SelenaRole;
	authType: "session" | "api_key";
	permissions: string[];
};

function normalizeRole(role: string): SelenaRole {
	if (role === "owner" || role === "admin") return "owner";
	if (role === "viewer") return "viewer";
	return "member";
}

function hashApiKey(value: string): Buffer {
	return createHash("sha256").update(value).digest();
}

export async function resolveSessionAuthContext(): Promise<AuthContext> {
	const { auth } = await import("./auth/server");
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (!session) throw new Error("Unauthorized: authenticated session required");
	const activeOrg = (session.session as { activeOrganizationId?: string | null }).activeOrganizationId;
	const memberships = await resolveSessionMemberships(db, session.user.id);
	const membership = pickSessionMembership(memberships, activeOrg);
	if (!membership) throw new Error("Forbidden: no organization membership");
	return {
		actorId: session.user.id,
		tenantId: membership.organizationId,
		role: normalizeRole(membership.role),
		authType: "session",
		permissions: ["client:read", "client:write"],
	};
}

export async function resolveApiKeyAuthContext(request: Request): Promise<AuthContext> {
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
		permissions: key.permissions,
	};
}

export function assertTenantContext(context: AuthContext, requestedTenantId?: string): void {
	if (requestedTenantId && requestedTenantId !== context.tenantId)
		throw new Error("Forbidden: tenant_id is controlled by AuthContext");
}

export function canWrite(context: AuthContext): boolean {
	return (
		(context.role === "owner" || context.role === "member") &&
		(context.authType === "session" || context.permissions.includes("client:write"))
	);
}
