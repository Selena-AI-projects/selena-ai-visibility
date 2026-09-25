import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { runtimeDatabaseConnection, runtimePgBossSchemaLifecycle } from "@workspace/lib/db/postgres-config";
import * as schema from "@workspace/lib/db/schema";
import { createLocalDispatchStore } from "@workspace/lib/selena-local-dispatch-store";
import { isLocalProviderExecutionEnabled, LOCAL_MEASUREMENT_QUEUE } from "@workspace/lib/selena-local-execution";
import {
	createLocalCanaryCycleInTransaction,
	localPilotBodyHash,
	requireLocalOperator,
	validateLocalPilotLock,
} from "@workspace/lib/selena-local-pilot-orchestrator";
import { and, eq, sql } from "drizzle-orm";
import { PgBoss } from "pg-boss";
import { dispatchLocalOutboxOnce } from "../local-dispatch-outbox";
import { ownerManagedPgBossRuntimeOptions } from "../runtime-boss-options";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function parseUuid(name: string): string {
	const value = required(name);
	if (!UUID.test(value)) throw new Error(`LOCAL_CANARY_${name}_INVALID`);
	return value;
}

type CanaryReceipt = {
	status: "CREATED_AND_DISPATCHED";
	cycleId: string;
	measurementCycleId: string;
	observations: number;
	attempts: number;
	outbox: number;
	claimed: number;
	enqueued: number;
	providerCalls: 0;
};

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`LOCAL_CANARY_${name}_REQUIRED`);
	return value;
}

function usdMicros(value: string): bigint {
	if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value)) throw new Error("LOCAL_CANARY_SPEND_CAP_INVALID");
	const [whole, fraction = ""] = value.split(".");
	return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

function validateOwnerInputs(): {
	organizationId: string;
	actorId: string;
	configurationLockId: string;
	gridDefinitionId: string;
	providerId: string;
	idempotencyKey: string;
} {
	const organizationId = parseUuid("SELENA_LOCAL_CANARY_ORGANIZATION_ID");
	const actorId = required("SELENA_LOCAL_CANARY_ACTOR_ID");
	const configurationLockId = parseUuid("SELENA_LOCAL_CANARY_CONFIGURATION_LOCK_ID");
	const gridDefinitionId = parseUuid("SELENA_LOCAL_CANARY_GRID_DEFINITION_ID");
	const selectedProvider = required("SELENA_LOCAL_MAPS_PROVIDER_ID");
	if (!/^\S+$/.test(selectedProvider)) throw new Error("LOCAL_CANARY_PROVIDER_ID_INVALID");
	const idempotencyKey = required("SELENA_LOCAL_CANARY_IDEMPOTENCY_KEY");
	const expectedKey = `local-maps-canary:${selectedProvider}:${configurationLockId}`;
	if (idempotencyKey !== expectedKey) throw new Error("LOCAL_CANARY_IDEMPOTENCY_KEY_INVALID");
	if (process.env.SELENA_LOCAL_CANARY_OWNER_APPROVED !== "true")
		throw new Error("LOCAL_CANARY_OWNER_APPROVAL_REQUIRED");
	if (process.env.SELENA_LOCAL_CANARY_MAX_CALLS !== "1") throw new Error("LOCAL_CANARY_CALL_LIMIT_MUST_BE_ONE");
	if (usdMicros(required("SELENA_LOCAL_CANARY_MAX_SPEND_USD")) > 2_000n)
		throw new Error("LOCAL_CANARY_SPEND_CAP_EXCEEDS_APPROVED_MAXIMUM");
	if (!isLocalProviderExecutionEnabled(process.env)) throw new Error("LOCAL_PROVIDER_EXECUTION_BLOCKED");
	return {
		organizationId,
		actorId,
		configurationLockId,
		gridDefinitionId,
		providerId: selectedProvider,
		idempotencyKey,
	};
}

/**
 * Creates and dispatches exactly one center-point canary. This command never
 * imports or invokes a provider adapter; the isolated Local worker consumes
 * the queue job later. Missing controls fail closed before any database work.
 */
export async function executeLocalMapsOneShot(): Promise<CanaryReceipt> {
	const input = validateOwnerInputs();
	const bodyHash = localPilotBodyHash({
		organizationId: input.organizationId,
		configurationLockId: input.configurationLockId,
		gridDefinitionId: input.gridDefinitionId,
		providerId: input.providerId,
	});
	const receipt = await withOrganizationTransaction(db, input.organizationId, async (tx) => {
		await requireLocalOperator(tx, input.organizationId, input.actorId);
		const [lockRow] = await tx
			.select({ snapshot: schema.svConfigurationLocks.snapshot })
			.from(schema.svConfigurationLocks)
			.where(
				and(
					eq(schema.svConfigurationLocks.organizationId, input.organizationId),
					eq(schema.svConfigurationLocks.id, input.configurationLockId),
				),
			)
			.limit(1);
		if (!lockRow) throw new Error("LOCAL_LOCK_NOT_FOUND");
		const lock = validateLocalPilotLock(lockRow.snapshot);
		if (usdMicros(lock.pilot.perAttemptWorstCaseUsd) > usdMicros(required("SELENA_LOCAL_CANARY_MAX_SPEND_USD")))
			throw new Error("LOCAL_CANARY_LOCK_COST_EXCEEDS_APPROVED_MAXIMUM");
		const [prior] = await tx
			.select({
				bodyHash: schema.svApiIdempotencyRecords.bodyHash,
				responseBody: schema.svApiIdempotencyRecords.responseBody,
			})
			.from(schema.svApiIdempotencyRecords)
			.where(
				and(
					eq(schema.svApiIdempotencyRecords.organizationId, input.organizationId),
					eq(schema.svApiIdempotencyRecords.operation, "local-canary"),
					eq(schema.svApiIdempotencyRecords.resourceId, input.configurationLockId),
					eq(schema.svApiIdempotencyRecords.idempotencyKey, input.idempotencyKey),
				),
			)
			.limit(1);
		if (prior) {
			if (prior.bodyHash !== bodyHash) throw new Error("IDEMPOTENCY_BODY_CONFLICT");
			return prior.responseBody as CanaryReceipt;
		}
		const materialized = await createLocalCanaryCycleInTransaction({
			tx,
			organizationId: input.organizationId,
			configurationLockId: input.configurationLockId,
			gridDefinitionId: input.gridDefinitionId,
			env: process.env,
		});
		const response: CanaryReceipt = {
			status: "CREATED_AND_DISPATCHED",
			...materialized,
			claimed: 0,
			enqueued: 0,
			providerCalls: 0,
		};
		await tx.insert(schema.svApiIdempotencyRecords).values({
			organizationId: input.organizationId,
			operation: "local-canary",
			resourceId: input.configurationLockId,
			idempotencyKey: input.idempotencyKey,
			bodyHash,
			responseStatus: 201,
			responseBody: response,
			expiresAt: sql`now() + interval '7 days'`,
		});
		return response;
	});

	const schemaLifecycle = runtimePgBossSchemaLifecycle();
	const boss = new PgBoss({
		...runtimeDatabaseConnection(),
		schema: "pgboss",
		...schemaLifecycle,
		...ownerManagedPgBossRuntimeOptions(schemaLifecycle),
		schedule: false,
	});
	try {
		await boss.start();
		await boss.createQueue(LOCAL_MEASUREMENT_QUEUE, { retryLimit: 0, expireInSeconds: 60 * 15 });
		const dispatched = await dispatchLocalOutboxOnce({
			store: createLocalDispatchStore(db, input.organizationId, 60_000),
			queue: boss,
			env: () => process.env,
		});
		return { ...receipt, ...dispatched };
	} finally {
		await boss.stop({ graceful: true, timeout: 10_000 }).catch(() => undefined);
	}
}

const isDirectRun =
	process.argv[1]?.endsWith("/local-maps-one-shot.ts") || process.argv[1]?.endsWith("/local-maps-one-shot.js");
if (isDirectRun) {
	executeLocalMapsOneShot()
		.then((receipt) => {
			process.stdout.write(`${JSON.stringify(receipt)}\n`);
		})
		.catch((error) => {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		});
}
