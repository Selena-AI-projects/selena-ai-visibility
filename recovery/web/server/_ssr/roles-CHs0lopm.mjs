//#region node_modules/.nitro/vite/services/ssr/assets/roles-CHs0lopm.js
/**
* Organization membership roles.
*
* Lives in config rather than beside either consumer because three surfaces ask
* the same question and must not drift: the billing settings page (browser),
* the Stripe plugin's subscription authorization, and the dunning email
* recipient list. Pure and dependency-free, so a client bundle can import it.
*/
/**
* Roles that may manage an organization — its plan, billing details, and
* members. "admin" is what our provisioning writes (provisionLocalOrg,
* provisionUmbrellaOrg); "owner" is what better-auth's own organization
* creation writes. Both are accepted; a plain "member" is not.
*/
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "1a46e888-1b9e-489e-9698-e33f0a117612", e._sentryDebugIdIdentifier = "sentry-dbid-1a46e888-1b9e-489e-9698-e33f0a117612");
	} catch (e) {}
})();
var ORG_ADMIN_ROLES = ["admin", "owner"];
function isOrgAdminRole(role) {
	return role != null && ORG_ADMIN_ROLES.includes(role);
}
//#endregion
export { isOrgAdminRole as n, ORG_ADMIN_ROLES as t };

//# sourceMappingURL=roles-CHs0lopm.mjs.map