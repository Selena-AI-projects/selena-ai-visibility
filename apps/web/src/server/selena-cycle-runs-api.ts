/**
 * The measurement ledger over the versioned API.
 *
 * A cycle's runs were readable only from the browser explorer, so the only
 * witness to what a paid measurement produced was a person looking at a
 * screen. That is enough to satisfy curiosity and not enough to verify an
 * order: an operator closing a cycle has to read the same rows the charge was
 * made against, and a client integrating the API has to be able to collect its
 * own results.
 *
 * Reads are tenant-scoped at the SQL level, so a foreign cycle id resolves to
 * "not found" rather than to another tenant's answers.
 */
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svCostEvents, svCycles, svResponseMentions, svRuns, svScenarios } from "@workspace/lib/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { AuthContext } from "../lib/selena-auth-context";
import { type CycleRunsOptions, presentAnswer, summariseLedger } from "./selena-cycle-runs-view";
import { readAnswer, readCitations, readSources } from "./selena-run-payload";

function stringList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function readCycleRuns(context: AuthContext, cycleId: string, options: CycleRunsOptions) {
	return withOrganizationTransaction(db, context.tenantId, async (tx) => {
		const [cycle] = await tx
			.select()
			.from(svCycles)
			.where(and(eq(svCycles.id, cycleId), eq(svCycles.organizationId, context.tenantId)))
			.limit(1);
		if (!cycle) return null;

		const rows = await tx
			.select()
			.from(svRuns)
			.where(and(eq(svRuns.cycleId, cycle.id), eq(svRuns.organizationId, context.tenantId)))
			.orderBy(asc(svRuns.scenarioId), asc(svRuns.systemId), desc(svRuns.finishedAt))
			.limit(options.limit);

		const runIds = rows.map((row) => row.id);
		const scenarioIds = [...new Set(rows.map((row) => row.scenarioId))];
		const [mentionRows, scenarioRows, costEvents] = await Promise.all([
			runIds.length
				? tx
						.select({
							runId: svResponseMentions.runId,
							entityType: svResponseMentions.entityType,
							name: svResponseMentions.name,
							ordinalPosition: svResponseMentions.ordinalPosition,
						})
						.from(svResponseMentions)
						.where(
							and(inArray(svResponseMentions.runId, runIds), eq(svResponseMentions.organizationId, context.tenantId)),
						)
						.orderBy(asc(svResponseMentions.ordinalPosition))
				: Promise.resolve([]),
			scenarioIds.length
				? tx
						.select({ id: svScenarios.id, text: svScenarios.text })
						.from(svScenarios)
						.where(and(inArray(svScenarios.id, scenarioIds), eq(svScenarios.organizationId, context.tenantId)))
				: Promise.resolve([]),
			tx
				.select({ amountUsd: svCostEvents.amountUsd, basis: svCostEvents.basis, provider: svCostEvents.provider })
				.from(svCostEvents)
				.where(and(eq(svCostEvents.cycleId, cycle.id), eq(svCostEvents.organizationId, context.tenantId))),
		]);

		const scenarioText = new Map(scenarioRows.map((row) => [row.id, row.text]));
		const mentionsByRun = new Map<string, { entityType: string; name: string; ordinalPosition: number | null }[]>();
		for (const row of mentionRows) {
			const list = mentionsByRun.get(row.runId) ?? [];
			list.push({ entityType: row.entityType, name: row.name, ordinalPosition: row.ordinalPosition });
			mentionsByRun.set(row.runId, list);
		}

		return {
			cycleId: cycle.id,
			cycle: {
				status: cycle.status,
				expectedRuns: cycle.expectedRuns,
				createdRuns: cycle.createdRuns,
				completedRuns: cycle.completedRuns,
			},
			ledger: summariseLedger(costEvents),
			runs: rows.map((row) => ({
				id: row.id,
				system: row.system ?? row.systemId,
				channel: row.channel,
				scenarioId: row.scenarioId,
				scenarioText: scenarioText.get(row.scenarioId) ?? null,
				status: row.status,
				validity: row.validity,
				invalidReason: row.invalidReason,
				captureMode: row.captureMode,
				language: row.language,
				model: row.model,
				mention: row.mention,
				position: row.position,
				ownedCitation: row.ownedCitation,
				costUsd: row.costUsd,
				costBasis: row.costBasis,
				tokenInput: row.tokenInput,
				tokenOutput: row.tokenOutput,
				finishedAt: row.finishedAt?.toISOString() ?? null,
				answer: presentAnswer(readAnswer(row.canonicalPayload), options.includeAnswers),
				mentions: mentionsByRun.get(row.id) ?? [],
				citations: readCitations(row.citations),
				sources: readSources(row.canonicalPayload),
				competitors: stringList(row.competitors),
				factualErrors: stringList(row.factualErrors),
			})),
		};
	});
}
