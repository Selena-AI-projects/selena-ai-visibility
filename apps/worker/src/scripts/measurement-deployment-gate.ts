type Environment = Readonly<Record<string, string | undefined>>;

export type MeasurementDeploymentDecision =
	| "EMERGENCY_STOP"
	| "DISABLED"
	| "DEPLOYMENT_NOT_APPROVED"
	| "APPROVED";

const commitSha = /^[0-9a-f]{40}$/;
const affirmativeValues = new Set(["1", "true", "yes"]);

function affirmative(value: string | undefined): boolean {
	return value !== undefined && affirmativeValues.has(value.trim());
}

export function measurementDeploymentDecision(env: Environment): MeasurementDeploymentDecision {
	if (affirmative(env.SELENA_EMERGENCY_STOP)) return "EMERGENCY_STOP";
	if (env.SELENA_MEASUREMENT_ENABLED !== "true") return "DISABLED";

	const approvedCommit = env.SELENA_MEASUREMENT_APPROVED_COMMIT_SHA?.trim();
	const deployedCommit = env.RAILWAY_GIT_COMMIT_SHA?.trim();
	const approvedEnvironment = env.SELENA_MEASUREMENT_APPROVED_ENVIRONMENT?.trim();
	const deployedEnvironment = env.RAILWAY_ENVIRONMENT_NAME?.trim();
	if (
		!approvedCommit ||
		!deployedCommit ||
		!commitSha.test(approvedCommit) ||
		!commitSha.test(deployedCommit) ||
		approvedCommit !== deployedCommit ||
		!approvedEnvironment ||
		!deployedEnvironment ||
		approvedEnvironment !== deployedEnvironment
	)
		return "DEPLOYMENT_NOT_APPROVED";
	return "APPROVED";
}

export function assertMeasurementDeploymentApproved(env: Environment): void {
	const decision = measurementDeploymentDecision(env);
	if (decision === "APPROVED") return;
	if (decision === "EMERGENCY_STOP") throw new Error("PROVIDER_CALLS_STOPPED");
	if (decision === "DISABLED") throw new Error("JOURNAL_MEASUREMENT_DISABLED");
	throw new Error("JOURNAL_MEASUREMENT_DEPLOYMENT_NOT_APPROVED");
}
