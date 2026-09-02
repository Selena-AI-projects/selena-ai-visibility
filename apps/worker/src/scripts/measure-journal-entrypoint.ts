import { measurementDeploymentDecision } from "./measurement-deployment-gate.js";

const decision = measurementDeploymentDecision(process.env);
if (decision !== "APPROVED") {
	const message = decision === "EMERGENCY_STOP" ? "PROVIDER_CALLS_STOPPED" : `JOURNAL_MEASUREMENT_${decision}`;
	if (decision === "EMERGENCY_STOP") {
		console.error(message);
		process.exit(1);
	}
	console.log(message);
	process.exit(0);
}

import("./measure-journal.js").catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
