import { createHash, randomUUID } from "node:crypto";
import { canonicalLocalMapsJson } from "@workspace/selena-visibility-contracts";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { OrganizationDatabase } from "./db/organization-transaction";
import * as schema from "./db/schema";
import { withSelenaApiMutation } from "./selena-api-idempotency";
import { readLocalCustomerExecution } from "./selena-local-customer-execution";
import {
	type LocalCustomerLocationInput,
	localCustomerLocationSchema,
	localIdentityFromMapsUrl,
} from "./selena-local-customer-location";
import {
	buildLocalCustomerOrder,
	type LocalCustomerOrderRequest,
	localCustomerOrderRequestSchema,
} from "./selena-local-customer-order";

type CustomerAuth = { tenantId: string; actorId: string; authType: "session" };
type ProviderPolicy = Parameters<typeof buildLocalCustomerOrder>[1]["providerPolicy"];

export function createLocalCustomerOrderStore(db: OrganizationDatabase, policy: ProviderPolicy, engineSha: string) {
	z.string()
		.regex(/^[a-f0-9]{40}$/)
		.parse(engineSha);
	return {
		async history(auth: CustomerAuth) {
			if (auth.authType !== "session") throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			return db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id',${auth.tenantId},true)`);
				const membership = await tx.execute(
					sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId}`,
				);
				if (!membership.rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				return (
					await tx.execute<{
						id: string;
						status: string;
						createdAt: Date;
						name: string;
						queryCount: number;
					}>(sql`select o.id,o.status,o.created_at as "createdAt",coalesce(b.display_name,'Restaurant') as name,jsonb_array_length(l.snapshot->'queries') as "queryCount"
				 from sv_orders o join sv_configuration_locks l on l.id=o.lock_id and l.organization_id=o.organization_id
				 left join sv_business_locations b on b.id::text=l.snapshot->>'locationId' and b.organization_id=o.organization_id
				 where o.organization_id=${auth.tenantId} and l.snapshot->>'domainId'='LOCAL_MAPS_ORDER' order by o.created_at desc,o.id limit 50`)
				).rows;
			});
		},
		async registerLocation(auth: CustomerAuth, value: LocalCustomerLocationInput, idempotencyKey: string) {
			if (auth.authType !== "session" || !auth.actorId) throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			const input = localCustomerLocationSchema.parse(value),
				identity = localIdentityFromMapsUrl(input.mapsUrl);
			const bodyHash = `sha256:${createHash("sha256").update(canonicalLocalMapsJson(input)).digest("hex")}`;
			return withSelenaApiMutation({
				db,
				identity: {
					tenantId: auth.tenantId,
					operation: "local-customer-location",
					resourceId: auth.tenantId,
					idempotencyKey,
					bodyHash,
				},
				authorize: async (tx) => {
					const member = await tx.execute(
						sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId} and role in ('owner','admin') for share`,
					);
					if (!member.rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				},
				work: async (tx) => {
					await tx.execute(
						sql`select pg_advisory_xact_lock(hashtextextended(${`local-restaurant:${auth.tenantId}`},0))`,
					);
					const existing = await tx.execute<{
						id: string;
						projectId: string;
						name: string;
						latitude: string;
						longitude: string;
						countryCode: string;
						confirmed: boolean;
						profile: Record<string, unknown>;
					}>(sql`select l.id,e.project_id as "projectId",l.display_name as name,l.latitude,l.longitude,l.country_code as "countryCode",
					 l.local_profile as profile,(l.confirmation_status='CONFIRMED' and l.local_profile_confirmed_at is not null) as confirmed from sv_business_locations l
					 join sv_entities e on e.id=l.entity_id and e.organization_id=l.organization_id where l.organization_id=${auth.tenantId}
					 and ((${identity.cid ?? null}::text is not null and l.local_profile->>'cid'=${identity.cid ?? null}) or (${identity.placeId ?? null}::text is not null and l.local_profile->>'placeId'=${identity.placeId ?? null}))
					 limit 2 for update of l`);
					if (existing.rows.length > 1) throw new Error("LOCAL_LOCATION_IDENTITY_CONFLICT");
					if (existing.rows[0]) {
						const saved = existing.rows[0];
						if (!saved.confirmed) throw new Error("LOCAL_LOCATION_NOT_CONFIRMED");
						if (
							(identity.cid && saved.profile.cid && identity.cid !== saved.profile.cid) ||
							(identity.placeId && saved.profile.placeId && identity.placeId !== saved.profile.placeId)
						)
							throw new Error("LOCAL_LOCATION_IDENTITY_CONFLICT");
						if (
							saved.name !== input.name ||
							saved.countryCode !== input.countryCode ||
							Number(saved.latitude) !== input.latitude ||
							Number(saved.longitude) !== input.longitude
						)
							throw new Error("LOCAL_LOCATION_DETAILS_CONFLICT");
						if ((identity.cid && !saved.profile.cid) || (identity.placeId && !saved.profile.placeId))
							await tx.execute(
								sql`update sv_business_locations set local_profile=${JSON.stringify({ ...saved.profile, ...identity })}::jsonb where id=${saved.id} and organization_id=${auth.tenantId}`,
							);
						return { id: saved.id, projectId: saved.projectId, name: saved.name, duplicate: true };
					}
					const projectId = randomUUID(),
						entityId = randomUUID(),
						locationId = randomUUID();
					await tx.insert(schema.svProjects).values({
						id: projectId,
						organizationId: auth.tenantId,
						name: input.name,
						category: "restaurant",
						country: input.countryCode,
						languages: ["en"],
					});
					await tx.insert(schema.svEntities).values({
						id: entityId,
						organizationId: auth.tenantId,
						projectId,
						name: input.name,
						entityKind: "LOCATION_BRAND",
						confirmationStatus: "CLIENT_CONFIRMED",
					});
					await tx.insert(schema.svBusinessLocations).values({
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
							reviewed: true,
						},
						localProfileConfirmedAt: sql`now()`,
						confirmationStatus: "CONFIRMED",
						referenceOrigin: "USER_PROVIDED",
					});
					return { id: locationId, projectId, name: input.name, duplicate: false };
				},
			});
		},
		async locations(auth: CustomerAuth) {
			if (auth.authType !== "session") throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			return db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id',${auth.tenantId},true)`);
				const member = await tx.execute(
					sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId}`,
				);
				if (!member.rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				const result = await tx.execute<{
					id: string;
					projectId: string;
					name: string;
				}>(sql`select l.id,e.project_id as "projectId",l.display_name as name
				 from sv_business_locations l join sv_entities e on e.id=l.entity_id and e.organization_id=l.organization_id
				 where l.organization_id=${auth.tenantId} and l.confirmation_status='CONFIRMED' and l.local_profile_confirmed_at is not null
				 and l.latitude is not null and l.longitude is not null order by l.display_name,l.id`);
				return result.rows;
			});
		},
		async read(auth: CustomerAuth, orderId: string) {
			if (auth.authType !== "session" || !auth.actorId) throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			const id = z.string().uuid().parse(orderId);
			return db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id',${auth.tenantId},true)`);
				const membership = await tx.execute(
					sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId}`,
				);
				if (!membership.rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				const result = await tx.execute<{
					id: string;
					status: string;
					snapshot: ReturnType<typeof buildLocalCustomerOrder>["snapshot"];
					expiresAt: Date;
				}>(sql`
				 select o.id,o.status,l.snapshot,q.expires_at as "expiresAt" from sv_orders o
				 join sv_quotes q on q.id=o.quote_id and q.organization_id=o.organization_id
				 join sv_configuration_locks l on l.id=o.lock_id and l.id=q.lock_id and l.organization_id=o.organization_id
				 where o.id=${id} and o.organization_id=${auth.tenantId} and l.snapshot->>'domainId'='LOCAL_MAPS_ORDER'`);
				const row = result.rows[0];
				if (!row) return null;
				return {
					...row,
					execution: await readLocalCustomerExecution(tx, auth.tenantId, id),
					snapshotSha256: `sha256:${createHash("sha256").update(canonicalLocalMapsJson(row.snapshot)).digest("hex")}`,
				};
			});
		},
		async create(auth: CustomerAuth, value: LocalCustomerOrderRequest, idempotencyKey: string) {
			if (auth.authType !== "session" || !auth.actorId) throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
			const input = localCustomerOrderRequestSchema.parse(value);
			const bodyHash = `sha256:${createHash("sha256").update(canonicalLocalMapsJson(input)).digest("hex")}`;
			return withSelenaApiMutation({
				db,
				authorize: async (tx) => {
					const member = await tx.execute(
						sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId} and role in ('owner','admin') for share`,
					);
					if (!member.rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
				},
				identity: {
					tenantId: auth.tenantId,
					operation: "local-customer-order",
					resourceId: input.projectId,
					idempotencyKey,
					bodyHash,
				},
				work: async (tx) => {
					const locations = await tx.execute<{
						id: string;
						organizationId: string;
						projectId: string;
						latitude: string | null;
						longitude: string | null;
						profile: unknown;
						confirmed: boolean;
					}>(sql`
					 select l.id,l.organization_id as "organizationId",e.project_id as "projectId",l.latitude,l.longitude,
					 l.local_profile as profile,(l.confirmation_status='CONFIRMED' and l.local_profile_confirmed_at is not null) as confirmed
					 from sv_business_locations l join sv_entities e on e.id=l.entity_id and e.organization_id=l.organization_id
					 where l.id=${input.locationId} and l.organization_id=${auth.tenantId} and e.project_id=${input.projectId}`);
					const location = locations.rows[0];
					if (!location || location.latitude === null || location.longitude === null)
						throw new Error("LOCAL_ORDER_LOCATION_NOT_FOUND");
					const identity = z
						.object({ placeId: z.string().trim().min(1).optional(), cid: z.string().trim().min(1).optional() })
						.refine((value) => !!value.placeId || !!value.cid, "LOCAL_ORDER_IDENTITY_NOT_CONFIRMED")
						.parse(location.profile);
					const order = buildLocalCustomerOrder(input, {
						tenantId: auth.tenantId,
						providerPolicy: policy,
						location: {
							...location,
							...identity,
							latitude: Number(location.latitude),
							longitude: Number(location.longitude),
						},
					});
					await tx.execute(
						sql`select pg_advisory_xact_lock(hashtextextended(${`local-order-project:${input.projectId}`},0))`,
					);
					const versions = await tx.execute<{ version: number }>(
						sql`select coalesce(max(version),0)+1 as version from sv_configuration_locks where project_id=${input.projectId} and organization_id=${auth.tenantId}`,
					);
					const lockId = randomUUID(),
						quoteId = randomUUID(),
						orderId = randomUUID();
					const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
					await tx.insert(schema.svConfigurationLocks).values({
						id: lockId,
						organizationId: auth.tenantId,
						projectId: input.projectId,
						version: versions.rows[0].version,
						snapshot: order.snapshot,
						engineSha,
						expectedRuns: order.snapshot.expectedSlots,
						budgetCap: order.snapshot.providerPolicy.orderCapUsd,
						createdBy: auth.actorId,
					});
					await tx.insert(schema.svQuotes).values({
						id: quoteId,
						organizationId: auth.tenantId,
						projectId: input.projectId,
						lockId,
						status: "ISSUED",
						priceAmount: order.snapshot.offer.priceAmount,
						currency: "USD",
						expectedRuns: order.snapshot.expectedSlots,
						expiresAt,
					});
					await tx.insert(schema.svOrders).values({
						id: orderId,
						organizationId: auth.tenantId,
						projectId: input.projectId,
						quoteId,
						lockId,
						status: "AWAITING_PAYMENT",
						orderCap: order.snapshot.providerPolicy.orderCapUsd,
					});
					return {
						id: orderId,
						quoteId,
						configurationLockId: lockId,
						snapshotSha256: order.sha256,
						snapshot: order.snapshot,
						status: "AWAITING_PAYMENT",
						expiresAt: expiresAt.toISOString(),
						externalProviderCalls: 0,
					};
				},
			});
		},
	};
}
