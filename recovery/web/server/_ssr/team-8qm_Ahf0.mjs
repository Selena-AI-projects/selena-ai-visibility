import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { d as and, f as eq } from "../_libs/drizzle-orm.mjs";
import { Dt as user, c as organization, o as invitation, s as member } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as getRequestHeaders } from "./server-44w5PK5b.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { n as isOrgAdminRole } from "./roles-CHs0lopm.mjs";
import { t as getDeployment } from "./server-B0rVTxL5.mjs";
import { t as auth } from "./server-CDtmD6L-.mjs";
import { c as requireAuthSession, l as requireBrandAccess, u as requireBrandOrganization } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-8qm_Ahf0.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4a3477bb-d608-40b6-8f94-6008f370c2b9", e._sentryDebugIdIdentifier = "sentry-dbid-4a3477bb-d608-40b6-8f94-6008f370c2b9");
	} catch (e) {}
})();
/**
* Server functions for team membership and invitations (cloud only).
*
* Mutations go through better-auth's org plugin API in-process
* (auth.api.*), which enforces the caller's member role and triggers
* sendInvitationEmail — the org plugin's HTTP endpoints stay blocked
* for every mode (see lib/auth/policies.ts).
*/
function requireTeamInvites() {
	if (!getDeployment().features.teamInvites) throw new Error("Team invitations are not available in this deployment");
}
var listTeamFn_createServerFn_handler = createServerRpc({
	id: "05e1bfe6a4b262b1b4eaa180fabf9c2961cfe2fb3869cc2aae5563aede24b276",
	name: "listTeamFn",
	filename: "src/server/team.ts"
}, (opts) => listTeamFn.__executeServer(opts));
var listTeamFn = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(listTeamFn_createServerFn_handler, async ({ data }) => {
	requireTeamInvites();
	const session = await requireAuthSession();
	const org = await requireBrandOrganization(session.user.id, data.brandId);
	return {
		members: await db.select({
			id: member.id,
			role: member.role,
			userId: member.userId,
			name: user.name,
			email: user.email,
			createdAt: member.createdAt
		}).from(member).innerJoin(user, eq(member.userId, user.id)).where(eq(member.organizationId, org.id)),
		invitations: await db.select({
			id: invitation.id,
			email: invitation.email,
			role: invitation.role,
			expiresAt: invitation.expiresAt
		}).from(invitation).where(and(eq(invitation.organizationId, org.id), eq(invitation.status, "pending"))),
		currentUserId: session.user.id,
		organization: {
			id: org.id,
			name: org.name
		}
	};
});
var updateOrganizationFn_createServerFn_handler = createServerRpc({
	id: "c326d95631b699605abf45f6124917ced31ba8f7b2e6866c4d5d03cf39acdbcc",
	name: "updateOrganizationFn",
	filename: "src/server/team.ts"
}, (opts) => updateOrganizationFn.__executeServer(opts));
var updateOrganizationFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	name: string().min(1).max(100)
})).handler(updateOrganizationFn_createServerFn_handler, async ({ data }) => {
	requireTeamInvites();
	const session = await requireAuthSession();
	const org = await requireBrandOrganization(session.user.id, data.brandId);
	if (!isOrgAdminRole(org.role)) throw new Error("Only admins can rename the workspace");
	await db.update(organization).set({ name: data.name.trim() }).where(eq(organization.id, org.id));
	return { success: true };
});
var inviteTeamMemberFn_createServerFn_handler = createServerRpc({
	id: "b79eac70b106b934c9da4cb7ef309630a8dc85476133ad9aa4484a755fe8a10d",
	name: "inviteTeamMemberFn",
	filename: "src/server/team.ts"
}, (opts) => inviteTeamMemberFn.__executeServer(opts));
var inviteTeamMemberFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	email: string().email(),
	role: _enum(["member", "admin"])
})).handler(inviteTeamMemberFn_createServerFn_handler, async ({ data }) => {
	requireTeamInvites();
	const session = await requireAuthSession();
	const org = await requireBrandOrganization(session.user.id, data.brandId);
	await auth.api.createInvitation({
		body: {
			email: data.email,
			role: data.role,
			organizationId: org.id
		},
		headers: getRequestHeaders()
	});
	return { success: true };
});
var cancelInvitationFn_createServerFn_handler = createServerRpc({
	id: "0734aa61216b1a162c314621465731129494eb640e8321c76ddbfbd55e7187b9",
	name: "cancelInvitationFn",
	filename: "src/server/team.ts"
}, (opts) => cancelInvitationFn.__executeServer(opts));
var cancelInvitationFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	invitationId: string()
})).handler(cancelInvitationFn_createServerFn_handler, async ({ data }) => {
	requireTeamInvites();
	const session = await requireAuthSession();
	await requireBrandAccess(session.user.id, data.brandId);
	await auth.api.cancelInvitation({
		body: { invitationId: data.invitationId },
		headers: getRequestHeaders()
	});
	return { success: true };
});
var removeTeamMemberFn_createServerFn_handler = createServerRpc({
	id: "6e4b5f8564f77980489530aed4556f682cc136879f2d249a5ef1eace16161c8f",
	name: "removeTeamMemberFn",
	filename: "src/server/team.ts"
}, (opts) => removeTeamMemberFn.__executeServer(opts));
var removeTeamMemberFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	memberId: string()
})).handler(removeTeamMemberFn_createServerFn_handler, async ({ data }) => {
	requireTeamInvites();
	const session = await requireAuthSession();
	const org = await requireBrandOrganization(session.user.id, data.brandId);
	const [row] = await db.select({ userId: member.userId }).from(member).where(and(eq(member.id, data.memberId), eq(member.organizationId, org.id))).limit(1);
	if (row?.userId === session.user.id) throw new Error("You cannot remove yourself from the team");
	await auth.api.removeMember({
		body: {
			memberIdOrEmail: data.memberId,
			organizationId: org.id
		},
		headers: getRequestHeaders()
	});
	return { success: true };
});
var getInvitationFn_createServerFn_handler = createServerRpc({
	id: "bb04de5b360bfa00895e333b0133a84d4c3bcbdcea491eda19ff7cdc0dd47b0b",
	name: "getInvitationFn",
	filename: "src/server/team.ts"
}, (opts) => getInvitationFn.__executeServer(opts));
var getInvitationFn = createServerFn({ method: "GET" }).validator(object({ invitationId: string() })).handler(getInvitationFn_createServerFn_handler, async ({ data }) => {
	requireTeamInvites();
	await requireAuthSession();
	return auth.api.getInvitation({
		query: { id: data.invitationId },
		headers: getRequestHeaders()
	});
});
var acceptInvitationFn_createServerFn_handler = createServerRpc({
	id: "281d2b9c8a1282dedabb308e2e03dee58ada1e57a80e1d3083b55933d93ef099",
	name: "acceptInvitationFn",
	filename: "src/server/team.ts"
}, (opts) => acceptInvitationFn.__executeServer(opts));
var acceptInvitationFn = createServerFn({ method: "POST" }).validator(object({ invitationId: string() })).handler(acceptInvitationFn_createServerFn_handler, async ({ data }) => {
	requireTeamInvites();
	await requireAuthSession();
	return { orgId: (await auth.api.acceptInvitation({
		body: { invitationId: data.invitationId },
		headers: getRequestHeaders()
	})).invitation.organizationId };
});
//#endregion
export { acceptInvitationFn_createServerFn_handler, cancelInvitationFn_createServerFn_handler, getInvitationFn_createServerFn_handler, inviteTeamMemberFn_createServerFn_handler, listTeamFn_createServerFn_handler, removeTeamMemberFn_createServerFn_handler, updateOrganizationFn_createServerFn_handler };

//# sourceMappingURL=team-8qm_Ahf0.mjs.map