import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, j as strictObject } from "../_libs/zod.mjs";
import { n as getRequestHeaders, r as getRequestUrl } from "./server-44w5PK5b.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as getDeployment } from "./server-B0rVTxL5.mjs";
import { t as auth } from "./server-CDtmD6L-.mjs";
import { c as requireAuthSession, f as requireOrgAccess } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-workspaces-LGI2ntPP.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7b39fe3b-e4fb-4af9-9af3-da40fa6d0a5d", e._sentryDebugIdIdentifier = "sentry-dbid-7b39fe3b-e4fb-4af9-9af3-da40fa6d0a5d");
	} catch (e) {}
})();
var listSelenaWorkspaces_createServerFn_handler = createServerRpc({
	id: "ce5229649c556f69d14479b25522103412b1fccbd58d5f6f6f42909309649cb8",
	name: "listSelenaWorkspaces",
	filename: "src/server/selena-workspaces.ts"
}, (opts) => listSelenaWorkspaces.__executeServer(opts));
var listSelenaWorkspaces = createServerFn({ method: "GET" }).handler(listSelenaWorkspaces_createServerFn_handler, async () => {
	const session = await requireAuthSession();
	const organizations = await auth.api.listOrganizations({ headers: getRequestHeaders() });
	return {
		activeOrganizationId: session.session.activeOrganizationId ?? null,
		readOnly: getDeployment().features.readOnly,
		organizations: organizations.map(({ id, name }) => ({
			id,
			name
		}))
	};
});
var selectSelenaWorkspace_createServerFn_handler = createServerRpc({
	id: "5023f353975f30415133428000c413211a3781cbb69a8552d4d4276c61fb8056",
	name: "selectSelenaWorkspace",
	filename: "src/server/selena-workspaces.ts"
}, (opts) => selectSelenaWorkspace.__executeServer(opts));
var selectSelenaWorkspace = createServerFn({ method: "POST" }).validator(strictObject({ organizationId: string().trim().min(1).max(255) })).handler(selectSelenaWorkspace_createServerFn_handler, async ({ data }) => {
	if (getDeployment().features.readOnly) throw new Error("Workspace switching is disabled in demo mode");
	const headers = getRequestHeaders();
	if (headers.get("origin") !== getRequestUrl().origin) throw new Error("Forbidden: same-origin request required");
	const session = await requireAuthSession();
	await requireOrgAccess(session.user.id, data.organizationId);
	const selected = await auth.api.setActiveOrganization({
		headers,
		body: { organizationId: data.organizationId }
	});
	if (selected?.id !== data.organizationId) throw new Error("Workspace selection failed");
	return { organizationId: selected.id };
});
//#endregion
export { listSelenaWorkspaces_createServerFn_handler, selectSelenaWorkspace_createServerFn_handler };

//# sourceMappingURL=selena-workspaces-LGI2ntPP.mjs.map