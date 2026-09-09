import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svResponseMentions, svRuns, svScenarios } from "@workspace/lib/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";
import {
	type RunAnswer,
	type RunCitation,
	type RunSource,
	readAnswer,
	readCitations,
	readSources,
} from "./selena-run-payload";

export type RunListItem = {
	id: string;
	scenarioId: string;
	scenarioText: string | null;
	system: string | null;
	channel: string;
	status: string;
	validity: string | null;
	invalidReason: string | null;
	captureMode: string | null;
	finishedAt: string | null;
};

export type RunDetail = RunListItem & {
	language: string | null;
	answer: RunAnswer;
	mentions: { entityType: string; name: string; ordinalPosition: number | null }[];
	citations: RunCitation[];
	sources: RunSource[];
};

/**
 * Addendum §7, the customer-facing half: every number on the measurement step
 * must be walkable back to the answers it came from. Reads are tenant-scoped
 * at the SQL level; a foreign run id resolves to "not found", never to data.
 */
export const listSelenaRunsFn = createServerFn({ method: "GET" })
	.validator(z.object({ cycleId: z.string().uuid() }))
	.handler(async ({ data }): Promise<{ runs: RunListItem[] }> => {
		const context = await resolveSessionAuthContext();
		const rows = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			tx
				.select({
					id: svRuns.id,
					scenarioId: svRuns.scenarioId,
					scenarioText: svScenarios.text,
					system: svRuns.system,
					systemId: svRuns.systemId,
					channel: svRuns.channel,
					status: svRuns.status,
					validity: svRuns.validity,
					invalidReason: svRuns.invalidReason,
					captureMode: svRuns.captureMode,
					finishedAt: svRuns.finishedAt,
				})
				.from(svRuns)
				.leftJoin(
					svScenarios,
					and(eq(svRuns.scenarioId, svScenarios.id), eq(svScenarios.organizationId, context.tenantId)),
				)
				.where(and(eq(svRuns.cycleId, data.cycleId), eq(svRuns.organizationId, context.tenantId)))
				.orderBy(desc(svRuns.finishedAt))
				.limit(100),
		);
		return {
			runs: rows.map((row) => ({
				id: row.id,
				scenarioId: row.scenarioId,
				scenarioText: row.scenarioText,
				system: row.system ?? row.systemId,
				channel: row.channel,
				status: row.status,
				validity: row.validity,
				invalidReason: row.invalidReason,
				captureMode: row.captureMode,
				finishedAt: row.finishedAt?.toISOString() ?? null,
			})),
		};
	});

export const getSelenaRunDetailFn = createServerFn({ method: "GET" })
	.validator(z.object({ runId: z.string().uuid() }))
	.handler(async ({ data }): Promise<RunDetail> => {
		const context = await resolveSessionAuthContext();
		return withOrganizationTransaction(db, context.tenantId, async (tx) => {
			const [run] = await tx
				.select()
				.from(svRuns)
				.where(and(eq(svRuns.id, data.runId), eq(svRuns.organizationId, context.tenantId)))
				.limit(1);
			if (!run) throw new Error("Not found: run is outside AuthContext tenant");
			const [mentions, [scenario]] = await Promise.all([
				tx
					.select({
						entityType: svResponseMentions.entityType,
						name: svResponseMentions.name,
						ordinalPosition: svResponseMentions.ordinalPosition,
					})
					.from(svResponseMentions)
					.where(and(eq(svResponseMentions.runId, run.id), eq(svResponseMentions.organizationId, context.tenantId)))
					.orderBy(asc(svResponseMentions.ordinalPosition)),
				tx
					.select({ text: svScenarios.text })
					.from(svScenarios)
					.where(and(eq(svScenarios.id, run.scenarioId), eq(svScenarios.organizationId, context.tenantId)))
					.limit(1),
			]);
			return {
				id: run.id,
				scenarioId: run.scenarioId,
				scenarioText: scenario?.text ?? null,
				system: run.system ?? run.systemId,
				channel: run.channel,
				status: run.status,
				validity: run.validity,
				invalidReason: run.invalidReason,
				captureMode: run.captureMode,
				finishedAt: run.finishedAt?.toISOString() ?? null,
				language: run.language,
				answer: readAnswer(run.canonicalPayload),
				mentions,
				citations: readCitations(run.citations),
				sources: readSources(run.canonicalPayload),
			};
		});
	});
