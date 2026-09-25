import { L as sql } from "../_libs/drizzle-orm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/organization-transaction-CKHq9ko_.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4a9dde6c-1d27-402d-a960-1b974d6662cd", e._sentryDebugIdIdentifier = "sentry-dbid-4a9dde6c-1d27-402d-a960-1b974d6662cd");
	} catch (e) {}
})();
/**
* Runs tenant work with a transaction-local RLS identity.
*
* The callback receives only the transaction handle so tenant queries cannot
* accidentally escape onto the pool connection where the setting is absent.
*/
async function withOrganizationTransaction(db, organizationId, work) {
	if (organizationId.trim().length === 0) throw new Error("ORGANIZATION_TRANSACTION_ID_REQUIRED");
	return db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.organization_id', ${organizationId}, true)`);
		return work(tx);
	});
}
//#endregion
export { withOrganizationTransaction as t };

//# sourceMappingURL=organization-transaction-CKHq9ko_.mjs.map