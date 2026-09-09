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

const runMode = process.env.SELENA_MEASUREMENT_RUN_MODE;
if (runMode === undefined || runMode === "" || runMode === "journal") {
	import("./measure-journal.js").catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
} else if (runMode === "dataforseo-perplexity-canary") {
	import("./dataforseo-perplexity-canary.js").catch(() => {
		console.error("DATAFORSEO_PERPLEXITY_CANARY_COMMAND_FAILED");
		process.exitCode = 1;
	});
} else {
	console.log("JOURNAL_MEASUREMENT_RUN_MODE_INVALID");
	process.exit(0);
}
