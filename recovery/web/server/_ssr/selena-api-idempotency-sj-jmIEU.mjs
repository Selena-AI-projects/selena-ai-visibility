import { D as number, M as string, T as literal, j as strictObject } from "../_libs/zod.mjs";
import { J as localApiIdempotencyRecordSchema, q as localApiIdempotencyIdentitySchema } from "./src-BdeAuGX5.mjs";
import { L as sql, d as and, f as eq } from "../_libs/drizzle-orm.mjs";
import { g as svApiIdempotencyRecords } from "./schema-ejW7s7Gs.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-api-idempotency-sj-jmIEU.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7c32515a-da17-458a-9550-0faf5a03167f", e._sentryDebugIdIdentifier = "sentry-dbid-7c32515a-da17-458a-9550-0faf5a03167f");
	} catch (e) {}
})();
var localCustomerLocationSchema = strictObject({
	name: string().trim().min(1).max(160),
	countryCode: string().regex(/^[A-Z]{2}$/),
	mapsUrl: string().url().max(3e3),
	latitude: number().finite().min(-85).max(85).transform((v) => Math.round(v * 1e6) / 1e6),
	longitude: number().finite().min(-180).max(180).transform((v) => Math.round(v * 1e6) / 1e6),
	confirmed: literal(true)
});
/** Parse only an explicit stable reference; no redirect, search or provider lookup. */
function localIdentityFromMapsUrl(value) {
	const url = new URL(value);
	if (url.protocol !== "https:" || ![
		"google.com",
		"www.google.com",
		"maps.google.com"
	].includes(url.hostname) || url.username || url.password) throw new Error("LOCAL_MAPS_LINK_UNSUPPORTED");
	if (url.hostname !== "maps.google.com" && url.pathname !== "/maps" && !url.pathname.startsWith("/maps/")) throw new Error("LOCAL_MAPS_LINK_UNSUPPORTED");
	for (const key of [
		"cid",
		"query_place_id",
		"place_id"
	]) if (url.searchParams.getAll(key).length > 1) throw new Error("LOCAL_MAPS_LINK_CONFLICT");
	const cid = url.searchParams.get("cid");
	const queryPlaceId = url.searchParams.get("query_place_id"), directPlaceId = url.searchParams.get("place_id");
	if (queryPlaceId && directPlaceId && queryPlaceId !== directPlaceId) throw new Error("LOCAL_MAPS_LINK_CONFLICT");
	const placeId = queryPlaceId ?? directPlaceId;
	if (cid && (!/^[1-9]\d{0,19}$/.test(cid) || BigInt(cid) > BigInt("18446744073709551615"))) throw new Error("LOCAL_MAPS_LINK_UNSUPPORTED");
	if (placeId && !/^ChI[A-Za-z0-9_-]{10,250}$/.test(placeId)) throw new Error("LOCAL_MAPS_LINK_UNSUPPORTED");
	let path;
	try {
		path = decodeURIComponent(url.pathname + url.search);
	} catch {
		throw new Error("LOCAL_MAPS_LINK_UNSUPPORTED");
	}
	const cids = new Set(cid ? [cid] : []), places = new Set(placeId ? [placeId] : []);
	for (const feature of path.matchAll(/!1s0x[a-f0-9]+:0x([a-f0-9]{1,16})(?=!|\?|&|$)/gi)) {
		const value = BigInt(`0x${feature[1]}`);
		if (value <= BigInt(0)) throw new Error("LOCAL_MAPS_LINK_UNSUPPORTED");
		cids.add(value.toString());
	}
	for (const place of path.matchAll(/!1s(ChI[A-Za-z0-9_-]{10,250})(?=!|\?|&|$)/g)) places.add(place[1]);
	if (cids.size > 1 || places.size > 1) throw new Error("LOCAL_MAPS_LINK_CONFLICT");
	const resolvedCid = [...cids][0], resolvedPlaceId = [...places][0];
	if (resolvedCid || resolvedPlaceId) return {
		...resolvedCid ? { cid: resolvedCid } : {},
		...resolvedPlaceId ? { placeId: resolvedPlaceId } : {}
	};
	throw new Error("LOCAL_MAPS_FULL_PLACE_LINK_REQUIRED");
}
function toContractRecord(row) {
	return localApiIdempotencyRecordSchema.parse({
		schemaVersion: 1,
		tenantId: row.organizationId,
		operation: row.operation,
		resourceId: row.resourceId,
		idempotencyKey: row.idempotencyKey,
		bodyHash: row.bodyHash,
		responseStatus: row.responseStatus,
		responseBody: row.responseBody,
		createdAt: row.createdAt.toISOString(),
		expiresAt: row.expiresAt.toISOString()
	});
}
async function findRecord(tx, identity) {
	const [row] = await tx.select().from(svApiIdempotencyRecords).where(and(eq(svApiIdempotencyRecords.organizationId, identity.tenantId), eq(svApiIdempotencyRecords.operation, identity.operation), eq(svApiIdempotencyRecords.resourceId, identity.resourceId), eq(svApiIdempotencyRecords.idempotencyKey, identity.idempotencyKey))).limit(1);
	return row ? toContractRecord(row) : null;
}
/** Serialize and persist the response in the same tenant transaction as its writes. */
async function withSelenaApiMutation(input) {
	const identity = localApiIdempotencyIdentitySchema.parse(input.identity);
	return withOrganizationTransaction(input.db, identity.tenantId, async (tx) => {
		const key = JSON.stringify([
			identity.tenantId,
			identity.operation,
			identity.resourceId,
			identity.idempotencyKey
		]);
		await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
		await input.authorize?.(tx);
		const prior = await findRecord(tx, identity);
		if (prior) {
			if (prior.bodyHash !== identity.bodyHash) throw new Error("IDEMPOTENCY_BODY_CONFLICT");
			return prior.responseBody;
		}
		const body = await input.work(tx);
		await tx.insert(svApiIdempotencyRecords).values({
			organizationId: identity.tenantId,
			operation: identity.operation,
			resourceId: identity.resourceId,
			idempotencyKey: identity.idempotencyKey,
			bodyHash: identity.bodyHash,
			responseStatus: 201,
			responseBody: body,
			expiresAt: sql`now() + interval '7 days'`
		});
		return body;
	});
}
//#endregion
export { localIdentityFromMapsUrl as n, withSelenaApiMutation as r, localCustomerLocationSchema as t };

//# sourceMappingURL=selena-api-idempotency-sj-jmIEU.mjs.map