import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { OrganizationTransaction } from "./organization-transaction";
import { svProviderDatasetSnapshotEvents } from "./schema";

const HISTORICAL_GOOGLE_AI_MODE_PHASES = ["TRIGGERED", "PENDING", "PENDING", "READY", "INTERRUPTED"] as const;
const RECONCILED_GOOGLE_AI_MODE_PHASES = [
	...HISTORICAL_GOOGLE_AI_MODE_PHASES,
	"RESUMED",
	"READY",
	"DELIVERED",
] as const;

export type HistoricalGoogleAiModeJournalBinding = Readonly<{
	organizationId: string;
	projectId: string;
	providerDatasetId: string;
	snapshotId: string;
	historicalReadyObservedAt: string;
	reconciledAt: string;
	recordCount: number;
}>;

export type HistoricalGoogleAiModeJournalRecovery = Readonly<{
	status: "RECOVERED" | "ALREADY_DELIVERED";
}>;

type JournalRow = Readonly<{
	provider: string;
	source: string;
	providerDatasetId: string;
	snapshotId: string;
	phase: string;
	providerStatus: string | null;
	recordCount: number | null;
	observedAt: Date;
}>;

function required(value: string, code: string): string {
	const normalized = value.trim();
	if (!normalized) throw new Error(code);
	return normalized;
}

function instant(value: string, code: string): Date {
	const parsed = new Date(value);
	if (!Number.isFinite(parsed.getTime())) throw new Error(code);
	return parsed;
}

function eventHash(
	binding: HistoricalGoogleAiModeJournalBinding,
	event: Readonly<{
		phase: "RESUMED" | "READY" | "DELIVERED";
		observedAt: Date;
		providerStatus?: string;
		recordCount?: number;
	}>,
): string {
	const canonical = JSON.stringify([
		binding.organizationId,
		binding.projectId,
		"BRIGHT_DATA",
		"GOOGLE_AI_MODE",
		binding.providerDatasetId,
		binding.snapshotId,
		event.phase,
		event.observedAt.toISOString(),
		event.providerStatus ?? null,
		event.recordCount ?? null,
	]);
	return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function phasesMatch(rows: readonly JournalRow[], expected: readonly string[]): boolean {
	return rows.length === expected.length && rows.every((row, index) => row.phase === expected[index]);
}

function assertExactBinding(rows: readonly JournalRow[], binding: HistoricalGoogleAiModeJournalBinding): void {
	if (
		rows.some(
			(row) =>
				row.provider !== "BRIGHT_DATA" ||
				row.source !== "GOOGLE_AI_MODE" ||
				row.providerDatasetId !== binding.providerDatasetId ||
				row.snapshotId !== binding.snapshotId,
		)
	)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_JOURNAL_BINDING_MISMATCH");
	const originalReady = rows[3];
	if (originalReady?.phase !== "READY" || originalReady.observedAt.toISOString() !== binding.historicalReadyObservedAt)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_CAPTURE_TIME_MISMATCH");
}

async function loadRows(
	tx: OrganizationTransaction,
	binding: HistoricalGoogleAiModeJournalBinding,
): Promise<JournalRow[]> {
	return tx
		.select({
			provider: svProviderDatasetSnapshotEvents.provider,
			source: svProviderDatasetSnapshotEvents.source,
			providerDatasetId: svProviderDatasetSnapshotEvents.providerDatasetId,
			snapshotId: svProviderDatasetSnapshotEvents.snapshotId,
			phase: svProviderDatasetSnapshotEvents.phase,
			providerStatus: svProviderDatasetSnapshotEvents.providerStatus,
			recordCount: svProviderDatasetSnapshotEvents.recordCount,
			observedAt: svProviderDatasetSnapshotEvents.observedAt,
		})
		.from(svProviderDatasetSnapshotEvents)
		.where(
			and(
				eq(svProviderDatasetSnapshotEvents.organizationId, binding.organizationId),
				eq(svProviderDatasetSnapshotEvents.projectId, binding.projectId),
				eq(svProviderDatasetSnapshotEvents.snapshotId, binding.snapshotId),
			),
		)
		.orderBy(
			asc(svProviderDatasetSnapshotEvents.observedAt),
			asc(svProviderDatasetSnapshotEvents.createdAt),
			asc(svProviderDatasetSnapshotEvents.id),
		);
}

/**
 * Appends the bounded recovery lifecycle on the caller's existing transaction.
 * The same transaction must also persist the private capture and audit row.
 */
export async function recoverHistoricalGoogleAiModeJournal(
	tx: OrganizationTransaction,
	input: HistoricalGoogleAiModeJournalBinding,
): Promise<HistoricalGoogleAiModeJournalRecovery> {
	const binding = Object.freeze({
		...input,
		organizationId: required(input.organizationId, "GOOGLE_AI_MODE_HISTORICAL_ORGANIZATION_REQUIRED"),
		projectId: required(input.projectId, "GOOGLE_AI_MODE_HISTORICAL_PROJECT_REQUIRED"),
		providerDatasetId: required(input.providerDatasetId, "GOOGLE_AI_MODE_HISTORICAL_DATASET_REQUIRED"),
		snapshotId: required(input.snapshotId, "GOOGLE_AI_MODE_HISTORICAL_SNAPSHOT_REQUIRED"),
	});
	if (!Number.isSafeInteger(binding.recordCount) || binding.recordCount < 0)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_RECORD_COUNT_INVALID");
	const historicalReadyObservedAt = instant(
		binding.historicalReadyObservedAt,
		"GOOGLE_AI_MODE_HISTORICAL_READY_TIME_INVALID",
	);
	const resumedAt = instant(binding.reconciledAt, "GOOGLE_AI_MODE_HISTORICAL_RECONCILIATION_TIME_INVALID");

	await tx.execute(
		sql`select pg_advisory_xact_lock(hashtextextended(${`${binding.organizationId}:${binding.projectId}:${binding.snapshotId}`}, 0))`,
	);
	const rows = await loadRows(tx, binding);
	assertExactBinding(rows, { ...binding, historicalReadyObservedAt: historicalReadyObservedAt.toISOString() });
	if (phasesMatch(rows, RECONCILED_GOOGLE_AI_MODE_PHASES)) {
		const delivered = rows.at(-1);
		if (delivered?.recordCount !== binding.recordCount) throw new Error("GOOGLE_AI_MODE_HISTORICAL_DELIVERY_MISMATCH");
		return Object.freeze({ status: "ALREADY_DELIVERED" as const });
	}
	if (!phasesMatch(rows, HISTORICAL_GOOGLE_AI_MODE_PHASES))
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_JOURNAL_STATE_INVALID");
	const interruptedAt = rows.at(-1)?.observedAt;
	if (!interruptedAt || resumedAt.getTime() <= interruptedAt.getTime())
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_RECONCILIATION_TIME_INVALID");

	const events = [
		{ phase: "RESUMED" as const, observedAt: resumedAt },
		{ phase: "READY" as const, observedAt: new Date(resumedAt.getTime() + 1), providerStatus: "ready" },
		{ phase: "DELIVERED" as const, observedAt: new Date(resumedAt.getTime() + 2), recordCount: binding.recordCount },
	] as const;
	for (const event of events) {
		await tx.insert(svProviderDatasetSnapshotEvents).values({
			organizationId: binding.organizationId,
			projectId: binding.projectId,
			provider: "BRIGHT_DATA",
			source: "GOOGLE_AI_MODE",
			providerDatasetId: binding.providerDatasetId,
			snapshotId: binding.snapshotId,
			phase: event.phase,
			providerStatus: "providerStatus" in event ? event.providerStatus : undefined,
			recordCount: "recordCount" in event ? event.recordCount : undefined,
			observedAt: event.observedAt,
			eventHash: eventHash(binding, event),
		});
	}

	const recoveredRows = await loadRows(tx, binding);
	assertExactBinding(recoveredRows, {
		...binding,
		historicalReadyObservedAt: historicalReadyObservedAt.toISOString(),
	});
	if (!phasesMatch(recoveredRows, RECONCILED_GOOGLE_AI_MODE_PHASES))
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_JOURNAL_POSTCONDITION_FAILED");
	if (recoveredRows.at(-1)?.recordCount !== binding.recordCount)
		throw new Error("GOOGLE_AI_MODE_HISTORICAL_DELIVERY_MISMATCH");
	return Object.freeze({ status: "RECOVERED" as const });
}
