import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/team-BEREAu2S.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "38dc98e1-5b7a-471e-b2c2-fbcbc83bc8ff", e._sentryDebugIdIdentifier = "sentry-dbid-38dc98e1-5b7a-471e-b2c2-fbcbc83bc8ff");
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
var listTeamFn = createServerFn({ method: "GET" }).validator(object({ brandId: string() })).handler(createSsrRpc("05e1bfe6a4b262b1b4eaa180fabf9c2961cfe2fb3869cc2aae5563aede24b276"));
var updateOrganizationFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	name: string().min(1).max(100)
})).handler(createSsrRpc("c326d95631b699605abf45f6124917ced31ba8f7b2e6866c4d5d03cf39acdbcc"));
var inviteTeamMemberFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	email: string().email(),
	role: _enum(["member", "admin"])
})).handler(createSsrRpc("b79eac70b106b934c9da4cb7ef309630a8dc85476133ad9aa4484a755fe8a10d"));
var cancelInvitationFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	invitationId: string()
})).handler(createSsrRpc("0734aa61216b1a162c314621465731129494eb640e8321c76ddbfbd55e7187b9"));
var removeTeamMemberFn = createServerFn({ method: "POST" }).validator(object({
	brandId: string(),
	memberId: string()
})).handler(createSsrRpc("6e4b5f8564f77980489530aed4556f682cc136879f2d249a5ef1eace16161c8f"));
var getInvitationFn = createServerFn({ method: "GET" }).validator(object({ invitationId: string() })).handler(createSsrRpc("bb04de5b360bfa00895e333b0133a84d4c3bcbdcea491eda19ff7cdc0dd47b0b"));
var acceptInvitationFn = createServerFn({ method: "POST" }).validator(object({ invitationId: string() })).handler(createSsrRpc("281d2b9c8a1282dedabb308e2e03dee58ada1e57a80e1d3083b55933d93ef099"));
//#endregion
export { listTeamFn as a, inviteTeamMemberFn as i, cancelInvitationFn as n, removeTeamMemberFn as o, getInvitationFn as r, updateOrganizationFn as s, acceptInvitationFn as t };

//# sourceMappingURL=team-BEREAu2S.mjs.map