import type { RunOutcome } from "@workspace/selena-visibility-contracts";
import { sql } from "drizzle-orm";
import type { SqlExecutor } from "./selena-pilot-invites";

export const FREE_AI_VISIBILITY_SPEND_SCOPE = "free-ai-visibility-global";
export const FREE_AI_VISIBILITY_COST_USD = 0.003;
export const FREE_AI_VISIBILITY_PROMPT_VERSION = "free-ai-visibility-v1";
export const FREE_AI_VISIBILITY_QUEUE = "selena-free-ai-visibility";
export const freeAiVisibilitySystems = ["chatgpt", "gemini"] as const;
export type FreeAiVisibilitySystem = (typeof freeAiVisibilitySystems)[number];

export type FreeAiVisibilitySystemReport = {
	system: FreeAiVisibilitySystem;
	terminalStatus: "SUCCEEDED" | "FAILED";
	domainMentioned: boolean;
	citationCount: number;
};

export type FreeAiVisibilityReport = {
	schemaVersion: 1;
	promptVersion: typeof FREE_AI_VISIBILITY_PROMPT_VERSION;
	terminalStatus: "COMPLETED";
	costUsd: typeof FREE_AI_VISIBILITY_COST_USD;
	systems: FreeAiVisibilitySystemReport[];
};

export type FreeAiVisibilityStatus =
	| { checkId: string; domain: string; status: "QUEUED" | "UNCONFIRMED"; report: null }
	| { checkId: string; domain: string; status: "COMPLETED"; report: FreeAiVisibilityReport };

export type FreeAiVisibilityClaimResult =
	| { decision: "CLAIMED"; checkId: string; domain: string }
	| { decision: "ALREADY_CLAIMED" | "REFUSED_NO_BUDGET" | "REFUSED_OVER_CAP" };

export function freeAiVisibilityPrompt(domain: string): string {
	return [
		`AI Visibility Check (${FREE_AI_VISIBILITY_PROMPT_VERSION})`,
		"",
		`When answering the user's question, assess whether ${domain} is mentioned and whether it is cited as a source.`,
		`Use the normalized domain ${domain} exactly when identifying the website.`,
	].join("\n");
}

function safeSystemReport(
	system: FreeAiVisibilitySystem,
	outcome: RunOutcome | null,
	domain: string,
): FreeAiVisibilitySystemReport {
	if (outcome?.status !== "SUCCEEDED") {
		return { system, terminalStatus: "FAILED", domainMentioned: false, citationCount: 0 };
	}
	const answer = outcome.answer?.text.toLowerCase() ?? "";
	return {
		system,
		terminalStatus: "SUCCEEDED",
		domainMentioned: answer.includes(domain.toLowerCase()),
		citationCount: outcome.sources?.length ?? 0,
	};
}

/** Drops all provider handles, URLs, answer text and error detail at the boundary. */
export function serializeFreeAiVisibilityReport(input: {
	domain: string;
	outcomes: Partial<Record<FreeAiVisibilitySystem, RunOutcome | null>>;
}): FreeAiVisibilityReport {
	return {
		schemaVersion: 1,
		promptVersion: FREE_AI_VISIBILITY_PROMPT_VERSION,
		terminalStatus: "COMPLETED",
		costUsd: FREE_AI_VISIBILITY_COST_USD,
		systems: freeAiVisibilitySystems.map((system) =>
			safeSystemReport(system, input.outcomes[system] ?? null, input.domain),
		),
	};
}

/** Executes the fixed pair once each. A failed call cannot suppress the other system. */
export async function executeFreeAiVisibilityCheck(input: {
	domain: string;
	execute: (system: FreeAiVisibilitySystem, prompt: string) => Promise<RunOutcome>;
}): Promise<FreeAiVisibilityReport> {
	const prompt = freeAiVisibilityPrompt(input.domain);
	const outcomes: Partial<Record<FreeAiVisibilitySystem, RunOutcome | null>> = {};
	for (const system of freeAiVisibilitySystems) {
		try {
			outcomes[system] = await input.execute(system, prompt);
		} catch {
			outcomes[system] = null;
		}
	}
	return serializeFreeAiVisibilityReport({ domain: input.domain, outcomes });
}

function claimFrom(value: unknown): FreeAiVisibilityClaimResult {
	const receipt = (value ?? {}) as Record<string, unknown>;
	const decision = receipt.decision;
	if (decision === "CLAIMED" && typeof receipt.checkId === "string" && typeof receipt.domain === "string") {
		return { decision, checkId: receipt.checkId, domain: receipt.domain };
	}
	if (decision === "ALREADY_CLAIMED" || decision === "REFUSED_NO_BUDGET" || decision === "REFUSED_OVER_CAP") {
		return { decision };
	}
	throw new Error("FREE_AI_VISIBILITY_CLAIM_UNREADABLE");
}

export async function claimFreeAiVisibilityCheck(
	executor: SqlExecutor,
	input: { userId: string; organizationId: string; domain: string },
): Promise<FreeAiVisibilityClaimResult> {
	const result = await executor.execute(sql`SELECT public.sv_claim_free_ai_visibility(
		${input.userId}::text,
		${input.organizationId}::text,
		${input.domain}::text
	) AS receipt`);
	return claimFrom((result.rows?.[0] as { receipt?: unknown } | undefined)?.receipt);
}

export async function beginFreeAiVisibilityCheck(
	executor: SqlExecutor,
	input: { checkId: string; organizationId: string },
): Promise<{ checkId: string; domain: string } | null> {
	const result = await executor.execute(sql`SELECT public.sv_begin_free_ai_visibility_check(
		${input.checkId}::uuid,
		${input.organizationId}::text
	) AS check`);
	const check = (result.rows?.[0] as { check?: unknown } | undefined)?.check;
	if (check === null || check === undefined) return null;
	const record = check as Record<string, unknown>;
	if (typeof record.checkId !== "string" || typeof record.domain !== "string")
		throw new Error("FREE_AI_VISIBILITY_EXECUTION_UNREADABLE");
	return { checkId: record.checkId, domain: record.domain };
}

export async function completeFreeAiVisibilityCheck(
	executor: SqlExecutor,
	input: { checkId: string; organizationId: string; report: FreeAiVisibilityReport },
): Promise<void> {
	const result = await executor.execute(sql`SELECT public.sv_complete_free_ai_visibility_check(
		${input.checkId}::uuid,
		${input.organizationId}::text,
		${JSON.stringify(input.report)}::jsonb
	) AS completed`);
	if ((result.rows?.[0] as { completed?: unknown } | undefined)?.completed !== true)
		throw new Error("FREE_AI_VISIBILITY_COMPLETION_REFUSED");
}

function parseSafeReport(value: unknown): FreeAiVisibilityReport | null {
	const report = value as Partial<FreeAiVisibilityReport> | null;
	if (
		report?.schemaVersion !== 1 ||
		report.promptVersion !== FREE_AI_VISIBILITY_PROMPT_VERSION ||
		report.terminalStatus !== "COMPLETED" ||
		report.costUsd !== FREE_AI_VISIBILITY_COST_USD ||
		!Array.isArray(report.systems) ||
		report.systems.length !== freeAiVisibilitySystems.length
	) {
		return null;
	}
	const systems = freeAiVisibilitySystems.map((system) => {
		const row = report.systems?.find((candidate) => candidate?.system === system);
		if (
			!row ||
			(row.terminalStatus !== "SUCCEEDED" && row.terminalStatus !== "FAILED") ||
			typeof row.domainMentioned !== "boolean" ||
			!Number.isSafeInteger(row.citationCount) ||
			row.citationCount < 0
		) {
			return null;
		}
		return {
			system,
			terminalStatus: row.terminalStatus,
			domainMentioned: row.domainMentioned,
			citationCount: row.citationCount,
		};
	});
	if (systems.some((system) => system === null)) return null;
	return { ...report, systems: systems as FreeAiVisibilitySystemReport[] } as FreeAiVisibilityReport;
}

export async function readFreeAiVisibilityStatus(
	executor: SqlExecutor,
	input: { userId: string; organizationId: string },
): Promise<FreeAiVisibilityStatus | null> {
	const result = await executor.execute(sql`
		SELECT "id", "registrable_domain", "status", "report"
		FROM "sv_free_ai_visibility_checks"
		WHERE "user_id" = ${input.userId} AND "organization_id" = ${input.organizationId}
		LIMIT 1
	`);
	const row = result.rows?.[0] as Record<string, unknown> | undefined;
	if (!row || typeof row.id !== "string" || typeof row.registrable_domain !== "string") return null;
	if (row.status === "QUEUED" || row.status === "UNCONFIRMED") {
		return { checkId: row.id, domain: row.registrable_domain, status: row.status, report: null };
	}
	if (row.status !== "COMPLETED") return null;
	const report = parseSafeReport(row.report);
	return report === null
		? { checkId: row.id, domain: row.registrable_domain, status: "UNCONFIRMED", report: null }
		: { checkId: row.id, domain: row.registrable_domain, status: "COMPLETED", report };
}
