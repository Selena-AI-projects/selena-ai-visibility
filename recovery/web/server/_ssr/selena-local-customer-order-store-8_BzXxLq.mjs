import { M as string, O as object } from "../_libs/zod.mjs";
import { D as canonicalLocalMapsJson } from "./src-BdeAuGX5.mjs";
import { L as sql } from "../_libs/drizzle-orm.mjs";
import { S as svConfigurationLocks, T as svEntities, Z as svOrders, it as svQuotes, tt as svProjects, y as svBusinessLocations } from "./schema-ejW7s7Gs.mjs";
import { n as localIdentityFromMapsUrl, r as withSelenaApiMutation, t as localCustomerLocationSchema } from "./selena-api-idempotency-sj-jmIEU.mjs";
import { n as buildLocalCustomerOrder, r as localCustomerOrderRequestSchema } from "./selena-local-customer-order-CjadfhpK.mjs";
import { readLocalCustomerExecution } from "./selena-local-customer-execution-qErdOkU-.mjs";
import { createHash, randomUUID } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-local-customer-order-store-8_BzXxLq.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "cb035a5e-5f1e-4d28-b8e2-d809212ffeab", e._sentryDebugIdIdentifier = "sentry-dbid-cb035a5e-5f1e-4d28-b8e2-d809212ffeab");
	} catch (e) {}
})();
function createLocalCustomerOrderStore(db, policy, engineSha) {
	string().regex(/^[a-f0-9]{40}$/).parse(engineSha);
	return {
		async history(auth) {
			if (auth.authType !== "session") throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			return db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id',${auth.tenantId},true)`);
				if (!(await tx.execute(sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId}`)).rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				return (await tx.execute(sql`select o.id,o.status,o.created_at as "createdAt",coalesce(b.display_name,'Restaurant') as name,jsonb_array_length(l.snapshot->'queries') as "queryCount"
				 from sv_orders o join sv_configuration_locks l on l.id=o.lock_id and l.organization_id=o.organization_id
				 left join sv_business_locations b on b.id::text=l.snapshot->>'locationId' and b.organization_id=o.organization_id
				 where o.organization_id=${auth.tenantId} and l.snapshot->>'domainId'='LOCAL_MAPS_ORDER' order by o.created_at desc,o.id limit 50`)).rows;
			});
		},
		async registerLocation(auth, value, idempotencyKey) {
			if (auth.authType !== "session" || !auth.actorId) throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			const input = localCustomerLocationSchema.parse(value), identity = localIdentityFromMapsUrl(input.mapsUrl);
			const bodyHash = `sha256:${createHash("sha256").update(canonicalLocalMapsJson(input)).digest("hex")}`;
			return withSelenaApiMutation({
				db,
				identity: {
					tenantId: auth.tenantId,
					operation: "local-customer-location",
					resourceId: auth.tenantId,
					idempotencyKey,
					bodyHash
				},
				authorize: async (tx) => {
					if (!(await tx.execute(sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId} and role in ('owner','admin') for share`)).rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				},
				work: async (tx) => {
					await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`local-restaurant:${auth.tenantId}`},0))`);
					const existing = await tx.execute(sql`select l.id,e.project_id as "projectId",l.display_name as name,l.latitude,l.longitude,l.country_code as "countryCode",
					 l.local_profile as profile,(l.confirmation_status='CONFIRMED' and l.local_profile_confirmed_at is not null) as confirmed from sv_business_locations l
					 join sv_entities e on e.id=l.entity_id and e.organization_id=l.organization_id where l.organization_id=${auth.tenantId}
					 and ((${identity.cid ?? null}::text is not null and l.local_profile->>'cid'=${identity.cid ?? null}) or (${identity.placeId ?? null}::text is not null and l.local_profile->>'placeId'=${identity.placeId ?? null}))
					 limit 2 for update of l`);
					if (existing.rows.length > 1) throw new Error("LOCAL_LOCATION_IDENTITY_CONFLICT");
					if (existing.rows[0]) {
						const saved = existing.rows[0];
						if (!saved.confirmed) throw new Error("LOCAL_LOCATION_NOT_CONFIRMED");
						if (identity.cid && saved.profile.cid && identity.cid !== saved.profile.cid || identity.placeId && saved.profile.placeId && identity.placeId !== saved.profile.placeId) throw new Error("LOCAL_LOCATION_IDENTITY_CONFLICT");
						if (saved.name !== input.name || saved.countryCode !== input.countryCode || Number(saved.latitude) !== input.latitude || Number(saved.longitude) !== input.longitude) throw new Error("LOCAL_LOCATION_DETAILS_CONFLICT");
						if (identity.cid && !saved.profile.cid || identity.placeId && !saved.profile.placeId) await tx.execute(sql`update sv_business_locations set local_profile=${JSON.stringify({
							...saved.profile,
							...identity
						})}::jsonb where id=${saved.id} and organization_id=${auth.tenantId}`);
						return {
							id: saved.id,
							projectId: saved.projectId,
							name: saved.name,
							duplicate: true
						};
					}
					const projectId = randomUUID(), entityId = randomUUID(), locationId = randomUUID();
					await tx.insert(svProjects).values({
						id: projectId,
						organizationId: auth.tenantId,
						name: input.name,
						category: "restaurant",
						country: input.countryCode,
						languages: ["en"]
					});
					await tx.insert(svEntities).values({
						id: entityId,
						organizationId: auth.tenantId,
						projectId,
						name: input.name,
						entityKind: "LOCATION_BRAND",
						confirmationStatus: "CLIENT_CONFIRMED"
					});
					await tx.insert(svBusinessLocations).values({
						id: locationId,
						organizationId: auth.tenantId,
						entityId,
						displayName: input.name,
						countryCode: input.countryCode,
						latitude: String(input.latitude),
						longitude: String(input.longitude),
						geoPrecision: "COORDINATE",
						googleMapsUrlReference: input.mapsUrl,
						googlePlaceIdReference: identity.placeId,
						localProfile: {
							...identity,
							mapsUrl: input.mapsUrl,
							identitySource: "USER_CONFIRMED",
							matchPolicy: "PLACE_ID_OR_CID",
							matchStatus: "REVIEWED_MATCH",
							reviewed: true
						},
						localProfileConfirmedAt: sql`now()`,
						confirmationStatus: "CONFIRMED",
						referenceOrigin: "USER_PROVIDED"
					});
					return {
						id: locationId,
						projectId,
						name: input.name,
						duplicate: false
					};
				}
			});
		},
		async locations(auth) {
			if (auth.authType !== "session") throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			return db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id',${auth.tenantId},true)`);
				if (!(await tx.execute(sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId}`)).rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				return (await tx.execute(sql`select l.id,e.project_id as "projectId",l.display_name as name
				 from sv_business_locations l join sv_entities e on e.id=l.entity_id and e.organization_id=l.organization_id
				 where l.organization_id=${auth.tenantId} and l.confirmation_status='CONFIRMED' and l.local_profile_confirmed_at is not null
				 and l.latitude is not null and l.longitude is not null order by l.display_name,l.id`)).rows;
			});
		},
		async read(auth, orderId) {
			if (auth.authType !== "session" || !auth.actorId) throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			const id = string().uuid().parse(orderId);
			return db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id',${auth.tenantId},true)`);
				if (!(await tx.execute(sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId}`)).rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				const row = (await tx.execute(sql`
				 select o.id,o.status,l.snapshot,q.expires_at as "expiresAt" from sv_orders o
				 join sv_quotes q on q.id=o.quote_id and q.organization_id=o.organization_id
				 join sv_configuration_locks l on l.id=o.lock_id and l.id=q.lock_id and l.organization_id=o.organization_id
				 where o.id=${id} and o.organization_id=${auth.tenantId} and l.snapshot->>'domainId'='LOCAL_MAPS_ORDER'`)).rows[0];
				if (!row) return null;
				return {
					...row,
					execution: await readLocalCustomerExecution(tx, auth.tenantId, id),
					snapshotSha256: `sha256:${createHash("sha256").update(canonicalLocalMapsJson(row.snapshot)).digest("hex")}`
				};
			});
		},
		async create(auth, value, idempotencyKey) {
			if (auth.authType !== "session" || !auth.actorId) throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			const input = localCustomerOrderRequestSchema.parse(value);
			const bodyHash = `sha256:${createHash("sha256").update(canonicalLocalMapsJson(input)).digest("hex")}`;
			return withSelenaApiMutation({
				db,
				authorize: async (tx) => {
					if (!(await tx.execute(sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId} and role in ('owner','admin') for share`)).rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				},
				identity: {
					tenantId: auth.tenantId,
					operation: "local-customer-order",
					resourceId: input.projectId,
					idempotencyKey,
					bodyHash
				},
				work: async (tx) => {
					const location = (await tx.execute(sql`
					 select l.id,l.organization_id as "organizationId",e.project_id as "projectId",l.latitude,l.longitude,
					 l.local_profile as profile,(l.confirmation_status='CONFIRMED' and l.local_profile_confirmed_at is not null) as confirmed
					 from sv_business_locations l join sv_entities e on e.id=l.entity_id and e.organization_id=l.organization_id
					 where l.id=${input.locationId} and l.organization_id=${auth.tenantId} and e.project_id=${input.projectId}`)).rows[0];
					if (!location || location.latitude === null || location.longitude === null) throw new Error("LOCAL_ORDER_LOCATION_NOT_FOUND");
					const identity = object({
						placeId: string().trim().min(1).optional(),
						cid: string().trim().min(1).optional()
					}).refine((value) => !!value.placeId || !!value.cid, "LOCAL_ORDER_IDENTITY_NOT_CONFIRMED").parse(location.profile);
					const order = buildLocalCustomerOrder(input, {
						tenantId: auth.tenantId,
						providerPolicy: policy,
						location: {
							...location,
							...identity,
							latitude: Number(location.latitude),
							longitude: Number(location.longitude)
						}
					});
					await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`local-order-project:${input.projectId}`},0))`);
					const versions = await tx.execute(sql`select coalesce(max(version),0)+1 as version from sv_configuration_locks where project_id=${input.projectId} and organization_id=${auth.tenantId}`);
					const lockId = randomUUID(), quoteId = randomUUID(), orderId = randomUUID();
					const expiresAt = new Date(Date.now() + 864e5);
					await tx.insert(svConfigurationLocks).values({
						id: lockId,
						organizationId: auth.tenantId,
						projectId: input.projectId,
						version: versions.rows[0].version,
						snapshot: order.snapshot,
						engineSha,
						expectedRuns: order.snapshot.expectedSlots,
						budgetCap: order.snapshot.providerPolicy.orderCapUsd,
						createdBy: auth.actorId
					});
					await tx.insert(svQuotes).values({
						id: quoteId,
						organizationId: auth.tenantId,
						projectId: input.projectId,
						lockId,
						status: "ISSUED",
						priceAmount: order.snapshot.offer.priceAmount,
						currency: "USD",
						expectedRuns: order.snapshot.expectedSlots,
						expiresAt
					});
					await tx.insert(svOrders).values({
						id: orderId,
						organizationId: auth.tenantId,
						projectId: input.projectId,
						quoteId,
						lockId,
						status: "AWAITING_PAYMENT",
						orderCap: order.snapshot.providerPolicy.orderCapUsd
					});
					return {
						id: orderId,
						quoteId,
						configurationLockId: lockId,
						snapshotSha256: order.sha256,
						snapshot: order.snapshot,
						status: "AWAITING_PAYMENT",
						expiresAt: expiresAt.toISOString(),
						externalProviderCalls: 0
					};
				}
			});
		}
	};
}
//#endregion
export { createLocalCustomerOrderStore };

//# sourceMappingURL=selena-local-customer-order-store-8_BzXxLq.mjs.map