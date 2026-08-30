import { assertLocalObservationCardinality } from "@workspace/selena-visibility-contracts";

export const LOCAL_MEASUREMENT_DOMAIN = "LOCAL_MAPS" as const;
export const LOCAL_MEASUREMENT_QUEUE = "selena-local-measure" as const;

export type LocalCycleExecutionState = {
	status: string;
	emergencyStoppedAt: Date | string | null;
	createdObservations: number;
	expectedObservations: number;
};

export type LocalObservationState = {
	id: string;
	validity: "VALID" | "INVALID" | "UNMEASURED";
};

export type LocalExecutionIncident = "CARDINALITY_INCIDENT" | "LOCAL_EMERGENCY_STOP";

type LocalExecutionGate = {
	env: Record<string, string | undefined>;
	cycle: LocalCycleExecutionState;
	recordIncident: (kind: LocalExecutionIncident) => Promise<void>;
};

type LocalObservationReservation = { observationId: string };

export type LocalObservationExecutionDependencies<TResult> = {
	reserveObservation: () => Promise<LocalObservationReservation | null>;
	callProvider: (observationId: string) => Promise<TResult>;
	completeObservation: (observationId: string, result: TResult) => Promise<void>;
};

export type LocalObservationRetryDependencies<TResult> = {
	prepareRetry: (observationId: string) => Promise<boolean>;
	callProvider: (observationId: string) => Promise<TResult>;
	completeObservation: (observationId: string, result: TResult) => Promise<void>;
};

export function isLocalVisibilityEnabled(env: Record<string, string | undefined>): boolean {
	return env.SELENA_LOCAL_VISIBILITY_ENABLED === "true";
}

async function assertDispatchAllowed(gate: LocalExecutionGate, checkCardinality: boolean): Promise<void> {
	if (!isLocalVisibilityEnabled(gate.env)) throw new Error("LOCAL_VISIBILITY_DISABLED");
	if (gate.cycle.emergencyStoppedAt !== null) {
		await gate.recordIncident("LOCAL_EMERGENCY_STOP");
		throw new Error("LOCAL_EMERGENCY_STOP");
	}
	if (gate.cycle.status !== "RUNNING") throw new Error("LOCAL_CYCLE_NOT_RUNNING");
	if (!checkCardinality) return;
	try {
		assertLocalObservationCardinality(gate.cycle.createdObservations, gate.cycle.expectedObservations);
	} catch (error) {
		if (error instanceof Error && error.message === "LOCAL_CARDINALITY_BLOCKED") {
			await gate.recordIncident("CARDINALITY_INCIDENT");
		}
		throw error;
	}
}

/**
 * Reserves the exact matrix row before invoking a provider. The database
 * reservation is the concurrency boundary; a null reservation means its
 * trigger blocked the call and recorded the incident.
 */
export async function executeLocalObservation<TResult>(
	gate: LocalExecutionGate,
	dependencies: LocalObservationExecutionDependencies<TResult>,
): Promise<TResult> {
	await assertDispatchAllowed(gate, true);
	const reservation = await dependencies.reserveObservation();
	if (reservation === null) throw new Error("LOCAL_OBSERVATION_RESERVATION_BLOCKED");
	const result = await dependencies.callProvider(reservation.observationId);
	await dependencies.completeObservation(reservation.observationId, result);
	return result;
}

/** A retry reuses one invalid matrix row and therefore never reserves a new one. */
export async function retryLocalObservation<TResult>(
	gate: LocalExecutionGate,
	observation: LocalObservationState,
	dependencies: LocalObservationRetryDependencies<TResult>,
): Promise<TResult> {
	await assertDispatchAllowed(gate, false);
	if (observation.validity === "VALID") throw new Error("LOCAL_RETRY_VALID_OBSERVATION");
	if (!(await dependencies.prepareRetry(observation.id))) throw new Error("LOCAL_RETRY_NOT_PREPARED");
	const result = await dependencies.callProvider(observation.id);
	await dependencies.completeObservation(observation.id, result);
	return result;
}
