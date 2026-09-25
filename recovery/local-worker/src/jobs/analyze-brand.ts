import { db } from "@workspace/lib/db/db";
import { svProjects } from "@workspace/lib/db/schema";
import { analyzeBrand, type OnboardingSuggestion, type QuestionStyle } from "@workspace/lib/onboarding";
import { assertSuggestSpendAllowed } from "@workspace/lib/run-policy";
import {
	bookSuggestCostEvent,
	releaseSuggestSpend,
	reserveSuggestSpend,
	settleSuggestSpend,
} from "@workspace/lib/selena-suggest-metering";
import { eq } from "drizzle-orm";
import type { Job } from "pg-boss";

export interface AnalyzeBrandData {
	/** Id the web app reads the result back by. */
	requestKey: string;
	website: string;
	brandName?: string;
	/** Free-text place context; scopes competitors and prompts to the area. */
	locationHint?: string;
	maxCompetitors?: number;
	maxPrompts?: number;
	/** How suggested questions are phrased; the analyzer's default when unset. */
	questionStyle?: QuestionStyle;
}

/**
 * Run brand analysis as a background job.
 *
 * The onboarding wizard used to call analyzeBrand() synchronously inside the
 * HTTP request. That call is an LLM + web-search round trip that routinely
 * takes ~1 minute, so it gets killed by reverse-proxy read timeouts (the user
 * sees a 504 even though the work finishes). Running it here lets the request
 * return immediately; the web app polls the job's `output` via getJobById.
 *
 * The queue is registered with batchSize: 1, so `jobs` always holds exactly
 * one job and the returned suggestion becomes that job's output.
 */
export async function analyzeBrandJob(jobs: Job<AnalyzeBrandData>[]): Promise<OnboardingSuggestion> {
	const [job] = jobs;
	if (!job) {
		throw new Error("analyze-brand handler received an empty batch");
	}

	const { requestKey, website, brandName, locationHint, maxCompetitors, maxPrompts, questionStyle } = job.data;
	// A job already on the queue when the gate closed must not spend either:
	// the request key carries which product asked, and the Selena suggestion is
	// the one whose spending is budget-classed.
	const selenaProjectId = requestKey.startsWith("selena:") ? requestKey.slice("selena:".length) : null;
	// Attribution follows the project the request key names, and it has to be
	// known before the call: budget is held against an organization, and a
	// suggestion whose project has gone is one nobody can be charged for.
	const [meteredProject] = selenaProjectId
		? await db
				.select({ organizationId: svProjects.organizationId })
				.from(svProjects)
				.where(eq(svProjects.id, selenaProjectId))
				.limit(1)
		: [];

	if (selenaProjectId) {
		assertSuggestSpendAllowed();
		if (!meteredProject) throw new Error("SUGGEST_PROJECT_NOT_FOUND");
		// Second refusal frontier; the first is at enqueue time in the web app.
		// Same request key, so a job queued before the ceiling was reached rides
		// on the reservation it already holds instead of taking another.
		await reserveSuggestSpend(db, { organizationId: meteredProject.organizationId, requestKey: selenaProjectId });
	}

	let suggestion: Awaited<ReturnType<typeof analyzeBrand>>;
	try {
		suggestion = await analyzeBrand({
			website,
			brandName,
			locationHint,
			maxCompetitors,
			maxPrompts,
			questionStyle,
		});
	} catch (error) {
		// The call never produced anything, so its budget goes back rather than
		// staying held against a suggestion that does not exist.
		if (selenaProjectId && meteredProject) {
			await releaseSuggestSpend(db, {
				organizationId: meteredProject.organizationId,
				requestKey: selenaProjectId,
			}).catch((releaseError) => console.error("[analyze-brand] suggest reservation not released:", releaseError));
		}
		throw error;
	}

	if (selenaProjectId && meteredProject) {
		const metered = { organizationId: meteredProject.organizationId, requestKey: selenaProjectId };
		await settleSuggestSpend(db, metered);
		// The ledger row the cost reports read. Settling already moved the
		// meter, so a bookkeeping failure here never voids the suggestion.
		try {
			await bookSuggestCostEvent(db, {
				organizationId: meteredProject.organizationId,
				provider: "onboarding-llm",
			});
		} catch (error) {
			console.error("[analyze-brand] suggest cost row not written:", error);
		}
	}
	return suggestion;
}
