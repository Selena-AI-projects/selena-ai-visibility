export type SelenaOrderRequestIdentity = {
	projectId: string;
	planId: string;
	scenarioIds: readonly string[];
};

export type FrozenSelenaOrderRequest = {
	schemaVersion: 1;
	projectId: string;
	planId: string;
	scenarioIds: string[];
};

export function freezeSelenaOrderRequest(input: SelenaOrderRequestIdentity): FrozenSelenaOrderRequest {
	return {
		schemaVersion: 1,
		projectId: input.projectId,
		planId: input.planId,
		scenarioIds: [...input.scenarioIds].sort(),
	};
}

export function matchesFrozenSelenaOrderRequest(value: unknown, input: SelenaOrderRequestIdentity): boolean {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<FrozenSelenaOrderRequest>;
	if (
		candidate.schemaVersion !== 1 ||
		candidate.projectId !== input.projectId ||
		candidate.planId !== input.planId ||
		!Array.isArray(candidate.scenarioIds) ||
		!candidate.scenarioIds.every((scenarioId) => typeof scenarioId === "string")
	)
		return false;
	return JSON.stringify([...candidate.scenarioIds].sort()) === JSON.stringify([...input.scenarioIds].sort());
}
