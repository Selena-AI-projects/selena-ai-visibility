import assert from "node:assert/strict";
import test from "node:test";
import { assertMeasurementDeploymentApproved, measurementDeploymentDecision } from "./measurement-deployment-gate.js";

const commit = "a".repeat(40);

test("measurement deployment remains off without an exact release and environment approval", () => {
	assert.equal(measurementDeploymentDecision({}), "DISABLED");
	assert.equal(
		measurementDeploymentDecision({ SELENA_MEASUREMENT_ENABLED: "true" }),
		"DEPLOYMENT_NOT_APPROVED",
	);
	assert.equal(
		measurementDeploymentDecision({
			SELENA_MEASUREMENT_ENABLED: "true",
			SELENA_MEASUREMENT_APPROVED_COMMIT_SHA: commit,
			RAILWAY_GIT_COMMIT_SHA: "b".repeat(40),
			SELENA_MEASUREMENT_APPROVED_ENVIRONMENT: "staging",
			RAILWAY_ENVIRONMENT_NAME: "staging",
		}),
		"DEPLOYMENT_NOT_APPROVED",
	);
});

test("measurement deployment opens only for the exact approved commit and environment", () => {
	const env = {
		SELENA_MEASUREMENT_ENABLED: "true",
		SELENA_MEASUREMENT_APPROVED_COMMIT_SHA: commit,
		RAILWAY_GIT_COMMIT_SHA: commit,
		SELENA_MEASUREMENT_APPROVED_ENVIRONMENT: "staging",
		RAILWAY_ENVIRONMENT_NAME: "staging",
	};
	assert.equal(measurementDeploymentDecision(env), "APPROVED");
	assert.doesNotThrow(() => assertMeasurementDeploymentApproved(env));
	assert.throws(
		() => assertMeasurementDeploymentApproved({ ...env, RAILWAY_ENVIRONMENT_NAME: "production" }),
		/JOURNAL_MEASUREMENT_DEPLOYMENT_NOT_APPROVED/,
	);
});

test("the emergency stop wins over a complete deployment approval", () => {
	const env = {
		SELENA_EMERGENCY_STOP: " yes ",
		SELENA_MEASUREMENT_ENABLED: "true",
		SELENA_MEASUREMENT_APPROVED_COMMIT_SHA: commit,
		RAILWAY_GIT_COMMIT_SHA: commit,
		SELENA_MEASUREMENT_APPROVED_ENVIRONMENT: "staging",
		RAILWAY_ENVIRONMENT_NAME: "staging",
	};
	assert.equal(measurementDeploymentDecision(env), "EMERGENCY_STOP");
	assert.throws(() => assertMeasurementDeploymentApproved(env), /PROVIDER_CALLS_STOPPED/);
});
