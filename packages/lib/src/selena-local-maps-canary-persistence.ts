import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { mapsLockV1Schema, type MapsLockV1 } from "@workspace/selena-visibility-contracts";
import * as schema from "./db/schema";
import type { LocalMapsCanaryPlan } from "./selena-local-maps-canary";

type Db = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const CANARY_CAP_USD = "5.000000";
const RESERVATION_USD = "0.004500";

export type PersistLocalMapsCanaryInput = Readonly<{
	db: Db;
	plan: LocalMapsCanaryPlan;
	projectId: string;
	actorId: string;
	engineSha: string;
	setTenantContext(tx: Tx, organizationId: string): Promise<void>;
	now?: () => Date;
	leaseDurationMs?: number;
}>;

export type PersistedLocalMapsCanary = Readonly<{
	configurationLockId: string;
	measurementCycleId: string;
	localCycleId: string;
	attemptId: string;
	reservationId: string;
	providerCallAuthorized: false;
	budgetCapUsd: typeof CANARY_CAP_USD;
}>;

function required(value: string, name: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${name}_REQUIRED`);
	return trimmed;
}

function assertStagingCanary(plan: LocalMapsCanaryPlan): MapsLockV1 {
	const lock = mapsLockV1Schema.parse(plan.lock);
	if (plan.providerCallAuthorized !== false) throw new Error("LOCAL_MAPS_CANARY_PROVIDER_AUTHORIZATION_INVALID");
	if (plan.budgetCapUsd !== CANARY_CAP_USD || lock.budget.surfaceCapUsd !== CANARY_CAP_USD)
		throw new Error("LOCAL_MAPS_CANARY_CAP_INVALID");
	if (lock.provider.id !== "bright_data-google_maps-serp" && lock.provider.id !== "brightdata-google-maps-serp")
		throw new Error("LOCAL_MAPS_CANARY_PROVIDER_INVALID");
	return lock;
}

/**
 * Persists the owner-approved, one-slot canary preflight in one tenant
 * transaction. This function only writes durable planning rows; it never
 * calls a provider or authorizes transport. The caller must invoke the runner
 * separately after reviewing the returned ids.
 */
export async function persistLocalMapsCanaryPlan(input: PersistLocalMapsCanaryInput): Promise<PersistedLocalMapsCanary> {
	const plan = input.plan;
	const lock = assertStagingCanary(plan);
	const organizationId = required(plan.dispatch.organizationId, "LOCAL_MAPS_CANARY_ORGANIZATION");
	const projectId = required(input.projectId, "LOCAL_MAPS_CANARY_PROJECT");
	const actorId = required(input.actorId, "LOCAL_MAPS_CANARY_ACTOR");
	const engineSha = required(input.engineSha, "LOCAL_MAPS_CANARY_ENGINE");
	const now = input.now ?? (() => new Date());
	const leaseDurationMs = input.leaseDurationMs ?? 15 * 60 * 1000;
	if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs <= 0) throw new Error("LOCAL_MAPS_CANARY_LEASE_INVALID");

	return input.db.transaction(async (tx) => {
		await input.setTenantContext(tx, organizationId);
		const [project] = await tx
			.select({ id: schema.svProjects.id })
			.from(schema.svProjects)
			.where(and(eq(schema.svProjects.id, projectId), eq(schema.svProjects.organizationId, organizationId)))
			.limit(1);
		if (!project) throw new Error("LOCAL_MAPS_CANARY_PROJECT_NOT_FOUND");
		const [location] = await tx
			.select({ id: schema.svBusinessLocations.id })
			.from(schema.svBusinessLocations)
			.where(and(eq(schema.svBusinessLocations.id, lock.locationId), eq(schema.svBusinessLocations.organizationId, organizationId)))
			.limit(1);
		if (!location) throw new Error("LOCAL_MAPS_CANARY_LOCATION_NOT_FOUND");

		const configurationLockId = randomUUID();
		const measurementCycleId = plan.dispatch.measurementCycleId;
		const localCycleId = plan.dispatch.localCycleId;
		const attemptId = plan.dispatch.attemptId;
		const reservationId = randomUUID();
		const createdAt = now();
		if (!Number.isFinite(createdAt.getTime())) throw new Error("LOCAL_MAPS_CANARY_TIME_INVALID");
		const leaseExpiresAt = new Date(createdAt.getTime() + leaseDurationMs);
		const slot = plan.slot;

		await tx.insert(schema.svConfigurationLocks).values({
			id: configurationLockId,
			organizationId,
			projectId,
			version: 1,
			legacyCollisionOrdinal: 0,
			snapshot: lock,
			engineSha,
			expectedRuns: 1,
			budgetCap: CANARY_CAP_USD,
			createdBy: actorId,
		});
		await tx.insert(schema.svMeasurementCycles).values({
			id: measurementCycleId,
			organizationId,
			domainId: "LOCAL_MAPS",
			domainCycleId: measurementCycleId,
			configurationLockId,
			status: "CREATED",
		});
		const gridDefinitionId = randomUUID();
		await tx.insert(schema.svGridDefinitions).values({
			id: gridDefinitionId,
			organizationId,
			locationId: lock.locationId,
			version: 1,
			pointCount: lock.grid.points.length,
			spacingMeters: Math.max(1, Math.round(lock.grid.spacingMeters)),
			shape: "SQUARE",
			rows: lock.grid.size,
			columns: lock.grid.size,
			centerLatitude: lock.grid.centerLatitude,
			centerLongitude: lock.grid.centerLongitude,
			formulaVersion: lock.grid.formulaVersion,
			immutable: true,
		});
		await tx.insert(schema.svGridPoints).values(lock.grid.points.map((point) => ({
			id: point.id,
			organizationId,
			gridId: gridDefinitionId,
			pointIndex: point.pointIndex,
			latitude: point.latitude,
			longitude: point.longitude,
		})));
		await tx.insert(schema.svLocalKeywords).values({
			id: plan.request.keyword.id,
			organizationId,
			locationId: lock.locationId,
			text: plan.request.keyword.text,
			normalizedText: plan.request.keyword.text.toLocaleLowerCase("en-US"),
			language: lock.request.language,
			status: "APPROVED",
		});
		await tx.insert(schema.svLocalScanCycles).values({
			id: localCycleId,
			organizationId,
			measurementCycleId,
			domainId: "LOCAL_MAPS",
			configurationLockId,
			locationId: lock.locationId,
			gridDefinitionId,
			provider: lock.provider.id,
			repeats: lock.repeats,
			captureDepth: lock.request.depth,
			expectedObservations: lock.expectedSlots,
			worstCaseCostUsd: lock.budget.worstCaseCostUsd,
			costSnapshot: lock.budget,
			status: "CREATED",
		});
		await tx.insert(schema.svMeasurementAttempts).values({
			id: attemptId,
			reservationId,
			organizationId,
			measurementCycleId,
			domainId: "LOCAL_MAPS",
			observationRef: `local-maps-canary:${attemptId}`,
			pointId: slot.pointId,
			itemId: plan.request.keyword.id,
			executorId: lock.provider.id,
			repeatIndex: lock.repeats === 1 ? 0 : slot.repeatIndex,
			baseSlotKey: slot.baseSlotKey,
			attemptIndex: 1,
			executionKey: slot.executionKey,
			status: "CLAIMED",
			budgetState: "RESERVED",
			reservedCostUsd: RESERVATION_USD,
			currency: "USD",
			surfaceCapUsd: CANARY_CAP_USD,
			monthlyCapUsd: CANARY_CAP_USD,
			priceSnapshotVersion: lock.budget.priceSnapshotVersion,
			claimedAt: createdAt,
			leaseExpiresAt,
		});
		return { configurationLockId, measurementCycleId, localCycleId, attemptId, reservationId, providerCallAuthorized: false, budgetCapUsd: CANARY_CAP_USD };
	});
}
