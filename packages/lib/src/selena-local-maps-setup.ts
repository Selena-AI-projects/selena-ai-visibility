import { createHash } from "node:crypto";
import {
	canonicalLocalMapsJson,
	LOCAL_GRID_FORMULA_VERSION,
	LOCAL_GRID_RADIUS_METERS,
	localBusinessLocationCreateRequestSchema,
	localKeywordSetCreateRequestSchema,
	localPlaceEntityConfirmRequestSchema,
	localProviderContractDigest,
	MAX_ATTEMPTS_PER_SLOT,
	type MapsLockV1,
	maximumProviderAttempts,
	sphericalGridPointsV1,
} from "@workspace/selena-visibility-contracts";
import { and, asc, eq, sql } from "drizzle-orm";
import { type OrganizationDatabase, withOrganizationTransaction } from "./db/organization-transaction";
import * as schema from "./db/schema";
import { requireLocalOperator, validateLocalPilotLock } from "./selena-local-pilot-orchestrator";

/**
 * One business location prepared for a Local Maps canary and pilot, as the
 * owner states it. Nothing here is looked up: the Place ID / CID and the
 * coordinates are the client's confirmed facts, never resolved through a
 * Google or provider call.
 */
export type LocalMapsSetupInput = {
	organizationId: string;
	actorId: string;
	displayName: string;
	countryCode: string;
	adminArea?: string;
	locality?: string;
	timezone: string;
	latitude: number;
	longitude: number;
	placeId?: string;
	cid?: string;
	mapsUrl?: string;
	keywords: string[];
	language: string;
	seDomain: string;
	timestampWindow: { startsAt: string; endsAt: string };
	provider: { id: string; endpoint: string; version: string };
	perAttemptWorstCaseUsd: string;
	leaseDurationMs: number;
	priceSnapshotVersion: string;
	engineSha: string;
};

export type LocalMapsSetupKeywordResult = {
	keywordId: string;
	text: string;
	configurationLockId: string;
	lockVersion: number;
	created: boolean;
	idempotencyKey: string;
};

export type LocalMapsSetupResult = {
	organizationId: string;
	actorId: string;
	projectId: string;
	locationId: string;
	gridDefinitionId: string;
	providerId: string;
	created: string[];
	keywords: LocalMapsSetupKeywordResult[];
};

const PILOT_GRID_SIZE = 3 as const;
const PILOT_ZOOM = 13 as const;
const PILOT_DEPTH = 20 as const;
export const LOCAL_MAPS_SETUP_MAX_KEYWORDS = 5;

const MICROS = BigInt(1_000_000);

function usdMicros(value: string): bigint {
	if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value)) throw new Error("LOCAL_SETUP_USD_INVALID");
	const [whole, fraction = ""] = value.split(".");
	return BigInt(whole) * MICROS + BigInt(fraction.padEnd(6, "0"));
}

function usdFromMicros(micros: bigint): string {
	return `${micros / MICROS}.${(micros % MICROS).toString().padStart(6, "0")}`;
}

/** Name-based (v5-shaped) id so the same location and keyword always freeze the same keyword set. */
function stableUuid(name: string): string {
	const bytes = createHash("sha1").update(`selena-local-maps-setup:${name}`, "utf8").digest().subarray(0, 16);
	bytes[6] = (bytes[6] & 0x0f) | 0x50;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.toString("hex");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function normalizeLocalKeyword(text: string): string {
	return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function localMapsCanaryIdempotencyKey(providerId: string, configurationLockId: string): string {
	return `local-maps-canary:${providerId}:${configurationLockId}`;
}

function targetIdentity(input: LocalMapsSetupInput) {
	const mapsUrl =
		input.mapsUrl ??
		(input.placeId
			? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(input.placeId)}`
			: `https://maps.google.com/?cid=${encodeURIComponent(input.cid ?? "")}`);
	const confirmed = localPlaceEntityConfirmRequestSchema.parse({
		...(input.placeId ? { placeId: input.placeId } : {}),
		...(input.cid ? { cid: input.cid } : {}),
		matchedName: input.displayName,
		mapsUrl,
		identitySource: "USER_CONFIRMED",
		matchPolicy: "PLACE_ID_OR_CID",
	});
	if (!confirmed.placeId && !confirmed.cid) throw new Error("LOCAL_SETUP_PLACE_ID_OR_CID_REQUIRED");
	return {
		...(confirmed.placeId ? { placeId: confirmed.placeId } : {}),
		...(confirmed.cid ? { cid: confirmed.cid } : {}),
		matchedName: confirmed.matchedName,
		mapsUrl: confirmed.mapsUrl,
		identitySource: "USER_CONFIRMED" as const,
		matchPolicy: "PLACE_ID_OR_CID" as const,
	};
}

/**
 * The executable 3×3 pilot lock for one keyword. Every value the database
 * triggers and `validateLocalPilotLock` check is derived here from the owner's
 * inputs, so the canary and its pilot measure exactly what was set up.
 */
export function buildLocalMapsPilotLock(input: {
	setup: LocalMapsSetupInput;
	locationId: string;
	keyword: { id: string; text: string };
	lockVersion: number;
}) {
	const { setup } = input;
	const grid = sphericalGridPointsV1({
		formulaVersion: LOCAL_GRID_FORMULA_VERSION,
		locationId: input.locationId,
		centerLatitude: setup.latitude,
		centerLongitude: setup.longitude,
		radiusMeters: LOCAL_GRID_RADIUS_METERS,
		size: PILOT_GRID_SIZE,
	});
	const request = {
		device: "MOBILE" as const,
		os: "android",
		language: setup.language,
		seDomain: setup.seDomain,
		zoom: PILOT_ZOOM,
		depth: PILOT_DEPTH,
		searchThisArea: true as const,
	};
	const provider = {
		id: setup.provider.id,
		endpoint: setup.provider.endpoint,
		version: setup.provider.version,
		rankEvidenceSource: "MAPS_SERP_PROVIDER" as const,
		placesApiUsed: false as const,
	};
	const billingUnit = "REQUEST";
	const expectedSlots = grid.points.length;
	const maxProviderAttempts = maximumProviderAttempts(expectedSlots);
	const worstCaseCostUsd = usdFromMicros(usdMicros(setup.perAttemptWorstCaseUsd) * BigInt(maxProviderAttempts));
	const providerContractDigest = localProviderContractDigest({
		schemaVersion: 1,
		provider,
		capability: {
			coordinateProof: "EXACT_REQUEST_ECHO_REQUIRED",
			rawEvidenceReference: "REQUIRED",
			supportsAbsentWithinDepth: true,
			maxDepth: PILOT_DEPTH,
		},
		requestProtocol: { ...request, os: "android", zoom: PILOT_ZOOM },
		price: {
			billingUnit,
			currency: "USD",
			perAttemptWorstCaseUsd: setup.perAttemptWorstCaseUsd,
			priceSnapshotVersion: setup.priceSnapshotVersion,
		},
	});
	const lock: MapsLockV1 = {
		schemaVersion: 1,
		domainId: "LOCAL_MAPS",
		pilot: {
			providerContractDigest,
			billingUnit,
			perAttemptWorstCaseUsd: setup.perAttemptWorstCaseUsd,
			leaseDurationMs: setup.leaseDurationMs,
			commercialPriceUsd: "0.00",
			commercialReason: "PILOT_NO_CHARGE",
		},
		lockVersion: input.lockVersion,
		locationId: input.locationId,
		targetIdentity: targetIdentity(setup),
		grid,
		keywordSet: {
			id: stableUuid(`${input.locationId}:${input.keyword.id}`),
			version: 1,
			keywordIds: [input.keyword.id],
			keywords: [{ id: input.keyword.id, text: input.keyword.text, language: setup.language }],
		},
		provider,
		request,
		timestampWindow: setup.timestampWindow,
		repeats: 1,
		expectedSlots,
		maxProviderAttempts,
		retryPolicy: { maxAttemptsPerSlot: MAX_ATTEMPTS_PER_SLOT, genericQueueRetryLimit: 0 },
		budget: {
			currency: "USD",
			surfaceCapUsd: worstCaseCostUsd,
			monthlyCapUsd: worstCaseCostUsd,
			worstCaseCostUsd,
			priceSnapshotVersion: setup.priceSnapshotVersion,
		},
	};
	return validateLocalPilotLock(lock);
}

function withoutVersion(lock: unknown): string {
	const { lockVersion: _version, ...rest } = lock as Record<string, unknown>;
	return canonicalLocalMapsJson(rest);
}

function sameCoordinate(stored: string | null, canonical: string): boolean {
	return stored !== null && Number(stored) === Number(canonical);
}

/**
 * Creates — or finds, when it already exists — everything the Local Maps
 * one-shot canary needs for one location: a dedicated project, the confirmed
 * location, its keywords, the canonical 3×3 grid and one configuration lock
 * per keyword. It runs in one tenant transaction as an owner or admin of the
 * organization, and every row goes through the same triggers and RLS as any
 * other write. A re-run with the same inputs finds every row and writes none.
 */
export async function applyLocalMapsSetup(
	db: OrganizationDatabase,
	input: LocalMapsSetupInput,
): Promise<LocalMapsSetupResult> {
	if (input.keywords.length < 1 || input.keywords.length > LOCAL_MAPS_SETUP_MAX_KEYWORDS)
		throw new Error("LOCAL_SETUP_KEYWORD_COUNT_INVALID");
	const keywordSet = localKeywordSetCreateRequestSchema.parse({
		language: input.language,
		keywords: input.keywords.map((text) => ({ text, intent: "local-maps-pilot", branded: false })),
	});
	if (new Set(keywordSet.keywords.map((item) => normalizeLocalKeyword(item.text))).size !== keywordSet.keywords.length)
		throw new Error("LOCAL_SETUP_KEYWORD_DUPLICATED");
	if (new Date(input.timestampWindow.endsAt) <= new Date(input.timestampWindow.startsAt))
		throw new Error("LOCAL_SETUP_WINDOW_INVALID");

	return withOrganizationTransaction(db, input.organizationId, async (tx) => {
		await requireLocalOperator(tx, input.organizationId, input.actorId);
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended(${`selena-local-maps-setup:${input.organizationId}`}, 0))`,
		);
		const clock = await tx.execute(sql`select now() as utc_now`);
		const now = new Date((clock.rows[0] as { utc_now: Date | string }).utc_now);
		if (new Date(input.timestampWindow.endsAt) <= now) throw new Error("LOCAL_SETUP_WINDOW_CLOSED");
		const created: string[] = [];
		const org = input.organizationId;

		const projectName = `${input.displayName} · Local Maps`;
		let [project] = await tx
			.select({ id: schema.svProjects.id })
			.from(schema.svProjects)
			.where(and(eq(schema.svProjects.organizationId, org), eq(schema.svProjects.name, projectName)))
			.limit(1);
		if (!project) {
			[project] = await tx
				.insert(schema.svProjects)
				.values({
					organizationId: org,
					name: projectName,
					category: "local-maps",
					country: input.countryCode,
					region: input.adminArea ?? null,
					languages: [input.language],
				})
				.returning({ id: schema.svProjects.id });
			if (!project) throw new Error("LOCAL_SETUP_PROJECT_INSERT_FAILED");
			created.push(`project ${project.id}`);
		}

		let [entity] = await tx
			.select({ id: schema.svEntities.id })
			.from(schema.svEntities)
			.where(
				and(
					eq(schema.svEntities.organizationId, org),
					eq(schema.svEntities.projectId, project.id),
					eq(schema.svEntities.entityKind, "LOCATION_BRAND"),
					eq(schema.svEntities.name, input.displayName),
				),
			)
			.orderBy(asc(schema.svEntities.createdAt))
			.limit(1);
		if (!entity) {
			[entity] = await tx
				.insert(schema.svEntities)
				.values({
					organizationId: org,
					projectId: project.id,
					entityKind: "LOCATION_BRAND",
					confirmationStatus: "CLIENT_CONFIRMED",
					name: input.displayName,
				})
				.returning({ id: schema.svEntities.id });
			if (!entity) throw new Error("LOCAL_SETUP_ENTITY_INSERT_FAILED");
			created.push(`entity ${entity.id}`);
		}

		const identity = targetIdentity(input);
		// The grid's canonical center is the location's stored coordinate, so the
		// numeric(9,6) column and the frozen grid can never round differently.
		const probeCenter = sphericalGridPointsV1({
			formulaVersion: LOCAL_GRID_FORMULA_VERSION,
			locationId: "00000000-0000-4000-8000-000000000000",
			centerLatitude: input.latitude,
			centerLongitude: input.longitude,
			radiusMeters: LOCAL_GRID_RADIUS_METERS,
			size: PILOT_GRID_SIZE,
		});
		let [location] = await tx
			.select()
			.from(schema.svBusinessLocations)
			.where(
				and(eq(schema.svBusinessLocations.organizationId, org), eq(schema.svBusinessLocations.entityId, entity.id)),
			)
			.orderBy(asc(schema.svBusinessLocations.createdAt))
			.limit(1);
		if (location) {
			if (
				!sameCoordinate(location.latitude, probeCenter.centerLatitude) ||
				!sameCoordinate(location.longitude, probeCenter.centerLongitude) ||
				location.countryCode !== input.countryCode ||
				(location.googlePlaceIdReference ?? undefined) !== identity.placeId
			)
				throw new Error("LOCAL_SETUP_LOCATION_CONFLICT");
		} else {
			const request = localBusinessLocationCreateRequestSchema.parse({
				entityId: entity.id,
				displayName: input.displayName,
				countryCode: input.countryCode,
				...(input.adminArea ? { adminArea: input.adminArea } : {}),
				...(input.locality ? { locality: input.locality } : {}),
				timezone: input.timezone,
				latitude: Number(probeCenter.centerLatitude),
				longitude: Number(probeCenter.centerLongitude),
				geoPrecision: "COORDINATE",
				googleMapsUrlReference: identity.mapsUrl,
				...(identity.placeId ? { googlePlaceIdReference: identity.placeId } : {}),
				referenceOrigin: "USER_PROVIDED",
				locationRole: "PRIMARY",
			});
			[location] = await tx
				.insert(schema.svBusinessLocations)
				.values({
					organizationId: org,
					entityId: entity.id,
					displayName: request.displayName,
					countryCode: request.countryCode,
					adminArea: request.adminArea ?? null,
					locality: request.locality ?? null,
					timezone: request.timezone ?? null,
					latitude: probeCenter.centerLatitude,
					longitude: probeCenter.centerLongitude,
					geoPrecision: request.geoPrecision,
					googleMapsUrlReference: request.googleMapsUrlReference ?? null,
					googlePlaceIdReference: request.googlePlaceIdReference ?? null,
					referenceOrigin: request.referenceOrigin,
					locationRole: request.locationRole,
					confirmationStatus: "CONFIRMED",
				})
				.returning();
			if (!location) throw new Error("LOCAL_SETUP_LOCATION_INSERT_FAILED");
			created.push(`location ${location.id}`);
		}

		const grid = sphericalGridPointsV1({
			formulaVersion: LOCAL_GRID_FORMULA_VERSION,
			locationId: location.id,
			centerLatitude: input.latitude,
			centerLongitude: input.longitude,
			radiusMeters: LOCAL_GRID_RADIUS_METERS,
			size: PILOT_GRID_SIZE,
		});
		const candidates = await tx
			.select({ id: schema.svGridDefinitions.id })
			.from(schema.svGridDefinitions)
			.where(
				and(
					eq(schema.svGridDefinitions.organizationId, org),
					eq(schema.svGridDefinitions.locationId, location.id),
					eq(schema.svGridDefinitions.formulaVersion, LOCAL_GRID_FORMULA_VERSION),
					eq(schema.svGridDefinitions.pointCount, grid.points.length),
					eq(schema.svGridDefinitions.centerLatitude, grid.centerLatitude),
					eq(schema.svGridDefinitions.centerLongitude, grid.centerLongitude),
				),
			)
			.orderBy(asc(schema.svGridDefinitions.version));
		let gridDefinitionId: string | undefined;
		for (const candidate of candidates) {
			const points = await tx
				.select({
					id: schema.svGridPoints.id,
					pointIndex: schema.svGridPoints.pointIndex,
					latitude: schema.svGridPoints.latitude,
					longitude: schema.svGridPoints.longitude,
				})
				.from(schema.svGridPoints)
				.where(and(eq(schema.svGridPoints.organizationId, org), eq(schema.svGridPoints.gridId, candidate.id)))
				.orderBy(asc(schema.svGridPoints.pointIndex));
			const matches =
				points.length === grid.points.length &&
				grid.points.every((point, index) => {
					const row = points[index];
					return (
						row?.id === point.id &&
						row.pointIndex === point.pointIndex &&
						sameCoordinate(row.latitude, point.latitude) &&
						sameCoordinate(row.longitude, point.longitude)
					);
				});
			if (matches) {
				gridDefinitionId = candidate.id;
				break;
			}
		}
		if (!gridDefinitionId) {
			const [latest] = await tx
				.select({ version: sql<number>`coalesce(max(${schema.svGridDefinitions.version}), 0)::int` })
				.from(schema.svGridDefinitions)
				.where(
					and(eq(schema.svGridDefinitions.organizationId, org), eq(schema.svGridDefinitions.locationId, location.id)),
				);
			const [definition] = await tx
				.insert(schema.svGridDefinitions)
				.values({
					organizationId: org,
					locationId: location.id,
					version: Number(latest?.version ?? 0) + 1,
					pointCount: grid.points.length,
					spacingMeters: Math.round(grid.spacingMeters),
					shape: "SQUARE",
					rows: grid.size,
					columns: grid.size,
					centerLatitude: grid.centerLatitude,
					centerLongitude: grid.centerLongitude,
					formulaVersion: LOCAL_GRID_FORMULA_VERSION,
				})
				.returning({ id: schema.svGridDefinitions.id });
			if (!definition) throw new Error("LOCAL_SETUP_GRID_INSERT_FAILED");
			// Point ids are the lock's canonical ids: observations reference the
			// planned slot's point id, which must exist in this grid.
			await tx.insert(schema.svGridPoints).values(
				grid.points.map((point) => ({
					id: point.id,
					organizationId: org,
					gridId: definition.id,
					pointIndex: point.pointIndex,
					latitude: point.latitude,
					longitude: point.longitude,
				})),
			);
			gridDefinitionId = definition.id;
			created.push(`grid ${definition.id}`);
		}

		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended(${`selena-configuration-lock:${project.id}`}, 0))`,
		);
		const existingLocks = await tx
			.select({
				id: schema.svConfigurationLocks.id,
				version: schema.svConfigurationLocks.version,
				snapshot: schema.svConfigurationLocks.snapshot,
			})
			.from(schema.svConfigurationLocks)
			.where(
				and(eq(schema.svConfigurationLocks.organizationId, org), eq(schema.svConfigurationLocks.projectId, project.id)),
			)
			.orderBy(asc(schema.svConfigurationLocks.version));
		let nextVersion = existingLocks.reduce((max, row) => Math.max(max, row.version), 0) + 1;

		const keywords: LocalMapsSetupKeywordResult[] = [];
		for (const item of keywordSet.keywords) {
			const normalizedText = normalizeLocalKeyword(item.text);
			let [keyword] = await tx
				.select({ id: schema.svLocalKeywords.id, text: schema.svLocalKeywords.text })
				.from(schema.svLocalKeywords)
				.where(
					and(
						eq(schema.svLocalKeywords.organizationId, org),
						eq(schema.svLocalKeywords.locationId, location.id),
						eq(schema.svLocalKeywords.normalizedText, normalizedText),
						eq(schema.svLocalKeywords.language, input.language),
					),
				)
				.limit(1);
			if (keyword && keyword.text !== item.text) throw new Error("LOCAL_SETUP_KEYWORD_TEXT_CONFLICT");
			if (!keyword) {
				[keyword] = await tx
					.insert(schema.svLocalKeywords)
					.values({
						organizationId: org,
						locationId: location.id,
						text: item.text,
						normalizedText,
						language: input.language,
						status: "APPROVED",
					})
					.returning({ id: schema.svLocalKeywords.id, text: schema.svLocalKeywords.text });
				if (!keyword) throw new Error("LOCAL_SETUP_KEYWORD_INSERT_FAILED");
				created.push(`keyword ${keyword.id}`);
			}

			const desired = buildLocalMapsPilotLock({
				setup: input,
				locationId: location.id,
				keyword: { id: keyword.id, text: keyword.text },
				lockVersion: 1,
			});
			const desiredIdentity = withoutVersion(desired);
			const reused = existingLocks.find((row) => {
				try {
					return withoutVersion(validateLocalPilotLock(row.snapshot)) === desiredIdentity;
				} catch {
					return false;
				}
			});
			if (reused) {
				keywords.push({
					keywordId: keyword.id,
					text: keyword.text,
					configurationLockId: reused.id,
					lockVersion: reused.version,
					created: false,
					idempotencyKey: localMapsCanaryIdempotencyKey(input.provider.id, reused.id),
				});
				continue;
			}
			const lockVersion = nextVersion;
			nextVersion += 1;
			const lock = buildLocalMapsPilotLock({
				setup: input,
				locationId: location.id,
				keyword: { id: keyword.id, text: keyword.text },
				lockVersion,
			});
			const [row] = await tx
				.insert(schema.svConfigurationLocks)
				.values({
					organizationId: org,
					projectId: project.id,
					version: lockVersion,
					legacyCollisionOrdinal: 0,
					snapshot: lock,
					engineSha: input.engineSha,
					expectedRuns: lock.expectedSlots,
					budgetCap: lock.budget.worstCaseCostUsd,
					createdBy: input.actorId,
				})
				.returning({ id: schema.svConfigurationLocks.id });
			if (!row) throw new Error("LOCAL_SETUP_LOCK_INSERT_FAILED");
			created.push(`configuration lock ${row.id}`);
			keywords.push({
				keywordId: keyword.id,
				text: keyword.text,
				configurationLockId: row.id,
				lockVersion,
				created: true,
				idempotencyKey: localMapsCanaryIdempotencyKey(input.provider.id, row.id),
			});
		}

		if (created.length > 0)
			await tx.insert(schema.svAuditEvents).values({
				organizationId: org,
				actorId: input.actorId,
				event: "LOCAL_MAPS_SETUP",
				subjectKind: "business_location",
				subjectId: location.id,
				details: {
					created,
					gridDefinitionId,
					configurationLockIds: keywords.map((item) => item.configurationLockId),
					providerCalls: 0,
				},
			});

		return {
			organizationId: org,
			actorId: input.actorId,
			projectId: project.id,
			locationId: location.id,
			gridDefinitionId,
			providerId: input.provider.id,
			created,
			keywords,
		};
	});
}

/** Lines ready to paste into the owner service's canary variables, one block per keyword. */
export function formatLocalMapsSetup(result: LocalMapsSetupResult): string[] {
	const lines = [
		`local-maps-setup: ${result.created.length === 0 ? "nothing new, every row already existed" : `created ${result.created.join(", ")}`}`,
		`project ${result.projectId}, location ${result.locationId}`,
	];
	for (const keyword of result.keywords) {
		lines.push(
			`keyword "${keyword.text}" (${keyword.keywordId}), lock v${keyword.lockVersion}${keyword.created ? " created" : " existing"}:`,
			`  SELENA_LOCAL_CANARY_ORGANIZATION_ID=${result.organizationId}`,
			`  SELENA_LOCAL_CANARY_ACTOR_ID=${result.actorId}`,
			`  SELENA_LOCAL_CANARY_CONFIGURATION_LOCK_ID=${keyword.configurationLockId}`,
			`  SELENA_LOCAL_CANARY_GRID_DEFINITION_ID=${result.gridDefinitionId}`,
			`  SELENA_LOCAL_CANARY_IDEMPOTENCY_KEY=${keyword.idempotencyKey}`,
		);
	}
	return lines;
}
