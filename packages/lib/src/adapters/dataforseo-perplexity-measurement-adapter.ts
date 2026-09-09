import { createHash } from "node:crypto";
import {
	answerRetainUntil,
	type RunOutcome,
	runMeasurementSchema,
	runOutcomeSchema,
} from "@workspace/selena-visibility-contracts";
import { dataforseo } from "../providers/registry/dataforseo";
import type { Provider, ScrapeResult } from "../providers/types";
import { type ExtractionContext, extractMeasurement } from "../selena-answer-extraction";
import type { SelenaExecutablePermit, SelenaMeasurementAdapter, SelenaMeasurementPermit } from "../selena-measurement";
import { estimateRunCostUsd } from "../usage/cost";

const PERPLEXITY_MODEL = "perplexity";
const DATAFORSEO_PROVIDER = "dataforseo";

export type DataForSeoPerplexityAdapterDeps = {
	/** Injected in tests; production uses the configured DataForSEO provider. */
	run?: Provider["run"];
	resolveScenarioText: (permit: SelenaExecutablePermit) => Promise<string> | string;
	resolveExtractionContext?: (permit: SelenaExecutablePermit) => Promise<ExtractionContext> | ExtractionContext;
	now?: () => Date;
};

function rawResponseReference(rawOutput: unknown): string {
	const serialized = JSON.stringify(rawOutput) ?? String(rawOutput);
	return `dataforseo:sha256:${createHash("sha256").update(serialized).digest("hex")}`;
}

function costFields() {
	const costUsd = estimateRunCostUsd(DATAFORSEO_PROVIDER, true);
	return costUsd === null ? {} : { costUsd, costBasis: "estimated" as const, provider: DATAFORSEO_PROVIDER };
}

function invalidOutcome(permit: SelenaExecutablePermit, reason: string, fields: Partial<RunOutcome> = {}): RunOutcome {
	return { dispatchKey: permit.dispatchKey, status: "INVALID", validity: "INVALID", invalidReason: reason, ...fields };
}

function failedOutcome(permit: SelenaExecutablePermit, reason: string): RunOutcome {
	return {
		dispatchKey: permit.dispatchKey,
		status: "FAILED",
		validity: "INVALID",
		invalidReason: reason,
		...costFields(),
	};
}

function providerFailureReason(error: unknown): string {
	if (typeof error === "object" && error !== null) {
		for (const field of ["status", "statusCode"] as const) {
			const value = (error as Record<string, unknown>)[field];
			const status =
				typeof value === "number"
					? value
					: typeof value === "string" && /^\d+$/.test(value.trim())
						? Number(value)
						: Number.NaN;
			if (Number.isInteger(status) && status >= 400 && status <= 599) return `PROVIDER_HTTP_${status}`;
		}
	}

	const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
	const status = /(?:HTTP[_ ]|status(?: code)?[:= ]|\b)(4\d\d|5\d\d)\b/i.exec(message)?.[1];
	if (status) return `PROVIDER_HTTP_${status}`;
	if (message === "DataForSEO API Error: No response or tasks.") return "PROVIDER_RESPONSE_MISSING";
	const taskCode = /^DataForSEO API Error:.*?\b(\d{5})\b/s.exec(message)?.[1];
	return taskCode ? `PROVIDER_TASK_${taskCode}` : "TRANSPORT_ERROR";
}

/**
 * Perplexity Visitor View fallback through DataForSEO's live Sonar response.
 * It remains a visitor-surface adapter because web search is enabled and the
 * permit is still authorized for the Perplexity surface.
 */
export function createDataForSeoPerplexityAdapter(deps: DataForSeoPerplexityAdapterDeps): SelenaMeasurementAdapter {
	if (!deps.run && !dataforseo.isConfigured()) throw new Error("DATAFORSEO_CREDENTIALS_MISSING");
	const run = deps.run ?? dataforseo.run.bind(dataforseo);
	const now = deps.now ?? (() => new Date());

	async function execute(permit: SelenaExecutablePermit): Promise<RunOutcome> {
		let scenarioText: string;
		try {
			scenarioText = (await deps.resolveScenarioText(permit)).trim();
		} catch {
			return failedOutcome(permit, "SCENARIO_TEXT_UNAVAILABLE");
		}
		if (scenarioText === "") return failedOutcome(permit, "SCENARIO_TEXT_UNAVAILABLE");

		let result: ScrapeResult;
		try {
			result = await run(PERPLEXITY_MODEL, scenarioText, { webSearch: true, version: "sonar" });
		} catch (error) {
			return failedOutcome(permit, providerFailureReason(error));
		}

		const responseReference = rawResponseReference(result.rawOutput);
		const content = result.textContent.trim();
		if (content === "" || content.startsWith("No text content found"))
			return invalidOutcome(permit, "EMPTY_RESPONSE", { ...costFields(), rawResponseReference: responseReference });

		let measurement: ReturnType<typeof extractMeasurement> | null = null;
		if (deps.resolveExtractionContext) {
			try {
				const extracted = extractMeasurement({
					answerText: content,
					sources: result.citations.map(({ url, domain }) => ({ url, domain })),
					system: "Perplexity",
					model: result.modelVersion,
					captureMode: "live_search",
					context: await deps.resolveExtractionContext(permit),
				});
				measurement = runMeasurementSchema.safeParse(extracted).success ? extracted : null;
			} catch {
				measurement = null;
			}
		}

		return {
			dispatchKey: permit.dispatchKey,
			status: "SUCCEEDED",
			validity: "VALID",
			rawResponseReference: responseReference,
			answer: { text: content, retainUntil: answerRetainUntil(now()) },
			sources: result.citations.map(({ url, domain, title }) => ({ url, domain, ...(title ? { title } : {}) })),
			...costFields(),
			...(measurement === null ? {} : { measurement }),
		};
	}

	return {
		channel: "visitor_view",
		async measure(permit: SelenaMeasurementPermit) {
			if (permit.channel !== "visitor_view") throw new Error("MEASUREMENT_CHANNEL_MISMATCH");
			return { dispatchKey: permit.dispatchKey, status: "queued" as const };
		},
		async execute(permit: SelenaExecutablePermit) {
			return runOutcomeSchema.parse(await execute(permit));
		},
	};
}
