import { brightDataVisitorSurface, createBrightDataAdapter } from "@workspace/lib/adapters/brightdata";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import {
	beginFreeAiVisibilityCheck,
	completeFreeAiVisibilityCheck,
	executeFreeAiVisibilityCheck,
	type FreeAiVisibilitySystem,
} from "@workspace/lib/selena-free-ai-visibility";
import type { SelenaExecutablePermit } from "@workspace/lib/selena-measurement";
import type { Job } from "pg-boss";

export interface FreeAiVisibilityJobData {
	checkId: string;
	organizationId: string;
}

const BRIGHTDATA_ENDPOINT = "https://api.brightdata.com/datasets/v3/scrape";
const BRIGHTDATA_DATASET_IDS: Record<FreeAiVisibilitySystem, string> = {
	chatgpt: "gd_m7aof0k82r803d5bjm",
	gemini: "gd_mbz66arm2mf9cu856y",
};

function datasetId(system: FreeAiVisibilitySystem): string {
	return process.env[`SELENA_BRIGHTDATA_DATASET_${system.toUpperCase()}`]?.trim() || BRIGHTDATA_DATASET_IDS[system];
}

function freeCheckPermit(input: {
	checkId: string;
	organizationId: string;
	system: FreeAiVisibilitySystem;
}): SelenaExecutablePermit {
	return {
		id: `free-ai-visibility:${input.checkId}:${input.system}`,
		organizationId: input.organizationId,
		cycleId: `free-ai-visibility:${input.checkId}`,
		scenarioId: `free-ai-visibility:${input.checkId}`,
		channel: "visitor_view",
		systemId: brightDataVisitorSurface[input.system],
		dispatchKey: `free-ai-visibility:${input.checkId}:${input.system}`,
		expiresAt: new Date(Date.now() + 30 * 60_000),
		consumedAt: null,
	};
}

/**
 * This is intentionally independent of paid measurement: the adapter receives
 * only an in-memory transport shape and no order, catalog entry, or stored run
 * permit is created or consumed.
 */
async function executeSystem(input: {
	checkId: string;
	organizationId: string;
	system: FreeAiVisibilitySystem;
	prompt: string;
}) {
	const adapter = createBrightDataAdapter({
		apiKey: process.env.BRIGHTDATA_API_TOKEN ?? "",
		endpoint: process.env.SELENA_BRIGHTDATA_ENDPOINT?.trim() || BRIGHTDATA_ENDPOINT,
		datasetId: datasetId(input.system),
		system: input.system,
		fetchImpl: fetch,
		resolveScenarioText: () => input.prompt,
	});
	return adapter.execute(freeCheckPermit(input));
}

export async function freeAiVisibilityJob(jobs: Job<FreeAiVisibilityJobData>[]): Promise<void> {
	for (const job of jobs) {
		const started = await withOrganizationTransaction(db, job.data.organizationId, (tx) =>
			beginFreeAiVisibilityCheck(tx, job.data),
		);
		if (started === null) continue;

		const report = await executeFreeAiVisibilityCheck({
			domain: started.domain,
			execute: (system, prompt) =>
				executeSystem({
					checkId: started.checkId,
					organizationId: job.data.organizationId,
					system,
					prompt,
				}),
		});

		// Completion and settlement share one transaction. A crash after the
		// durable pre-transport marker leaves the row UNCONFIRMED and its money
		// reserved, rather than inventing a result or permitting another call.
		await withOrganizationTransaction(db, job.data.organizationId, (tx) =>
			completeFreeAiVisibilityCheck(tx, {
				checkId: started.checkId,
				organizationId: job.data.organizationId,
				report,
			}),
		);
	}
}
