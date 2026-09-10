import {
	type BrightDataVisitorSystem,
	brightDataVisitorSurface,
	createBrightDataAdapter,
} from "@workspace/lib/adapters/brightdata";
import type { SelenaExecutablePermit } from "@workspace/lib/selena-measurement";
import { assertMeasurementDeploymentApproved } from "./measurement-deployment-gate.js";

assertMeasurementDeploymentApproved(process.env);

const PRICE_PER_CALL_USD = 0.0015;
const CANARY_PROMPT = "What is the best food hall in Bali?";
const CANARY_SYSTEMS = ["chatgpt", "gemini"] as const satisfies readonly BrightDataVisitorSystem[];
const DATASET_IDS: Record<BrightDataVisitorSystem, string> = {
	chatgpt: "gd_m7aof0k82r803d5bjm",
	gemini: "gd_mbz66arm2mf9cu856y",
	perplexity: "gd_m7dhdot1vw9a7gc1n",
};

function requiredCredential(name: string): string {
	const value = process.env[name];
	if (!value || value.trim() === "") throw new Error(`${name}_REQUIRED`);
	return value;
}

function permitFor(system: BrightDataVisitorSystem): SelenaExecutablePermit {
	return {
		id: `brightdata-response-canary-${system}`,
		organizationId: "brightdata-response-canary",
		cycleId: "brightdata-response-canary",
		scenarioId: "bali-food-hall",
		systemId: brightDataVisitorSurface[system],
		channel: "VISITOR",
		dispatchKey: `brightdata-response-canary:${system}`,
		expiresAt: new Date(Date.now() + 30 * 60 * 1000),
		consumedAt: null,
	};
}

async function main(): Promise<number> {
	if (process.env.SELENA_BRIGHTDATA_RESPONSE_CANARY_ENABLED !== "true") {
		console.log("BRIGHTDATA_RESPONSE_CANARY_DISABLED");
		return 0;
	}

	const apiKey = requiredCredential("BRIGHTDATA_API_TOKEN");
	const maximumEstimatedCost = (CANARY_SYSTEMS.length * PRICE_PER_CALL_USD).toFixed(4);
	console.log(
		`BRIGHTDATA_RESPONSE_CANARY_START count=${CANARY_SYSTEMS.length} maximum_estimated_cost_usd=${maximumEstimatedCost}`,
	);

	const outcomes = await Promise.all(
		CANARY_SYSTEMS.map(async (system) => {
			const startedAt = Date.now();
			try {
				const adapter = createBrightDataAdapter({
					apiKey,
					endpoint: "https://api.brightdata.com/datasets/v3/scrape",
					datasetId: process.env[`SELENA_BRIGHTDATA_DATASET_${system.toUpperCase()}`]?.trim() || DATASET_IDS[system],
					system,
					fetchImpl: fetch,
					resolveScenarioText: () => CANARY_PROMPT,
				});
				const outcome = await adapter.execute(permitFor(system));
				const elapsedMs = Date.now() - startedAt;
				if (outcome.status === "SUCCEEDED") {
					console.log(
						`BRIGHTDATA_RESPONSE_CANARY_RESULT system=${brightDataVisitorSurface[system]} status=SUCCEEDED reason=NONE elapsed_ms=${elapsedMs} answer_characters=${outcome.answer?.text.length ?? 0} citation_count=${outcome.sources?.length ?? 0}`,
					);
					return true;
				}
				console.log(
					`BRIGHTDATA_RESPONSE_CANARY_RESULT system=${brightDataVisitorSurface[system]} status=${outcome.status} reason=${outcome.invalidReason ?? "UNKNOWN"} elapsed_ms=${elapsedMs}`,
				);
				return false;
			} catch {
				console.log(
					`BRIGHTDATA_RESPONSE_CANARY_RESULT system=${brightDataVisitorSurface[system]} status=FAILED reason=CANARY_EXECUTION_ERROR elapsed_ms=${Date.now() - startedAt}`,
				);
				return false;
			}
		}),
	);

	const succeeded = outcomes.filter(Boolean).length;
	console.log(
		`BRIGHTDATA_RESPONSE_CANARY_SUMMARY total=${CANARY_SYSTEMS.length} succeeded=${succeeded} failed=${CANARY_SYSTEMS.length - succeeded} maximum_estimated_cost_usd=${maximumEstimatedCost}`,
	);
	return succeeded === CANARY_SYSTEMS.length ? 0 : 1;
}

main()
	.then((exitCode) => {
		process.exitCode = exitCode;
	})
	.catch(() => {
		console.error("BRIGHTDATA_RESPONSE_CANARY_COMMAND_FAILED");
		process.exitCode = 1;
	});
