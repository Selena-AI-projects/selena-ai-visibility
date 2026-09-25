import { createDataForSeoPerplexityAdapter } from "@workspace/lib/adapters/dataforseo-perplexity";
import type { SelenaExecutablePermit } from "@workspace/lib/selena-measurement";
import { assertMeasurementDeploymentApproved } from "./measurement-deployment-gate.js";

assertMeasurementDeploymentApproved(process.env);

const PRICE_PER_CALL_USD = 0.005;
const CANARY_PROMPTS = [
	{
		scenarioId: "bali-food-halls",
		text: "Where should I eat in Ubud, Bali?",
	},
	{
		scenarioId: "ubud-food-hall",
		text: "What is the best food hall in Ubud?",
	},
	{
		scenarioId: "bali-food-hall",
		text: "What is the best food hall in Bali?",
	},
] as const;
const scenarioTextById = new Map<string, string>(CANARY_PROMPTS.map(({ scenarioId, text }) => [scenarioId, text]));

function canaryCount(value: string | undefined): number | null {
	if (!value?.trim()) return null;
	const count = Number(value);
	return Number.isInteger(count) && count >= 1 && count <= CANARY_PROMPTS.length ? count : null;
}

function maximumEstimatedCost(count: number): string {
	return (count * PRICE_PER_CALL_USD).toFixed(3);
}

function permitFor(scenarioId: string, ordinal: number): SelenaExecutablePermit {
	return {
		id: `dataforseo-perplexity-canary-permit-${ordinal}`,
		organizationId: "dataforseo-perplexity-canary",
		cycleId: "dataforseo-perplexity-canary",
		scenarioId,
		systemId: "Perplexity",
		channel: "VISITOR",
		dispatchKey: `dataforseo-perplexity-canary:${scenarioId}:${ordinal}`,
		expiresAt: new Date(Date.now() + 5 * 60 * 1000),
		consumedAt: null,
	};
}

async function executeCanary(count: number): Promise<number> {
	const selectedPrompts = CANARY_PROMPTS.slice(0, count);
	const permits = selectedPrompts.map(({ scenarioId }, index) => permitFor(scenarioId, index + 1));
	const adapter = createDataForSeoPerplexityAdapter({
		resolveScenarioText: ({ scenarioId }) => {
			const text = scenarioTextById.get(scenarioId);
			if (!text) throw new Error("DATAFORSEO_PERPLEXITY_CANARY_SCENARIO_MISSING");
			return text;
		},
	});
	const cost = maximumEstimatedCost(count);
	console.log(`DATAFORSEO_PERPLEXITY_CANARY_START count=${count} maximum_estimated_cost_usd=${cost}`);

	let succeeded = 0;
	let failed = 0;
	let invalid = 0;
	for (const [index, permit] of permits.entries()) {
		const startedAt = Date.now();
		try {
			const outcome = await adapter.execute(permit);
			const elapsedMs = Date.now() - startedAt;
			if (outcome.status === "SUCCEEDED") {
				succeeded++;
				console.log(
					`DATAFORSEO_PERPLEXITY_CANARY_RESULT request=${index + 1} status=SUCCEEDED reason=NONE elapsed_ms=${elapsedMs} answer_characters=${outcome.answer?.text.length ?? 0} citation_count=${outcome.sources?.length ?? 0}`,
				);
			} else {
				if (outcome.status === "INVALID") invalid++;
				else failed++;
				console.log(
					`DATAFORSEO_PERPLEXITY_CANARY_RESULT request=${index + 1} status=${outcome.status} reason=${outcome.invalidReason ?? "UNKNOWN"} elapsed_ms=${elapsedMs}`,
				);
			}
		} catch {
			failed++;
			console.log(
				`DATAFORSEO_PERPLEXITY_CANARY_RESULT request=${index + 1} status=FAILED reason=CANARY_EXECUTION_ERROR elapsed_ms=${Date.now() - startedAt}`,
			);
		}
	}

	console.log(
		`DATAFORSEO_PERPLEXITY_CANARY_SUMMARY total=${count} succeeded=${succeeded} failed=${failed} invalid=${invalid} maximum_estimated_cost_usd=${cost}`,
	);
	return succeeded === count ? 0 : 1;
}

async function main(): Promise<number> {
	if (process.env.SELENA_DATAFORSEO_PERPLEXITY_CANARY_ENABLED !== "true") {
		console.log("DATAFORSEO_PERPLEXITY_CANARY_DISABLED");
		return 0;
	}

	const count = canaryCount(process.env.SELENA_DATAFORSEO_PERPLEXITY_CANARY_COUNT);
	if (count === null) {
		console.error("DATAFORSEO_PERPLEXITY_CANARY_COUNT_INVALID");
		return 1;
	}

	return executeCanary(count);
}

main()
	.then((exitCode) => {
		process.exitCode = exitCode;
	})
	.catch(() => {
		console.error("DATAFORSEO_PERPLEXITY_CANARY_COMMAND_FAILED");
		process.exitCode = 1;
	});
