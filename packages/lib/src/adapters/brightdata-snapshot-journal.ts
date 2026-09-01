import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";
import type { BrightDataSnapshotJournal, BrightDataSnapshotJournalEntry } from "../providers/brightdata-dataset-client";
import { providerDatasetSourceIds } from "../providers/dataset-registry";

type Db = NodePgDatabase<typeof schema>;

export type BrightDataSnapshotJournalScope = Readonly<{
	organizationId: string;
	projectId: string;
}>;

export type PostgresBrightDataSnapshotJournalOptions = BrightDataSnapshotJournalScope &
	Readonly<{
		db: Db;
	}>;

function requiredScopeValue(value: string, code: string): string {
	const normalized = value.trim();
	if (!normalized) throw new Error(code);
	return normalized;
}

function normalizeEntry(entry: BrightDataSnapshotJournalEntry) {
	if (!providerDatasetSourceIds.includes(entry.source)) throw new Error("BRIGHTDATA_SNAPSHOT_JOURNAL_SOURCE_INVALID");
	const datasetId = requiredScopeValue(entry.datasetId, "BRIGHTDATA_SNAPSHOT_JOURNAL_DATASET_ID_REQUIRED");
	const snapshotId = requiredScopeValue(entry.snapshotId, "BRIGHTDATA_SNAPSHOT_JOURNAL_SNAPSHOT_ID_REQUIRED");
	const observedAt = new Date(entry.observedAt);
	if (!Number.isFinite(observedAt.getTime())) throw new Error("BRIGHTDATA_SNAPSHOT_JOURNAL_OBSERVED_AT_INVALID");
	const providerStatus = entry.providerStatus?.trim();
	if (entry.providerStatus !== undefined && !providerStatus)
		throw new Error("BRIGHTDATA_SNAPSHOT_JOURNAL_PROVIDER_STATUS_INVALID");
	if (entry.recordCount !== undefined && (!Number.isSafeInteger(entry.recordCount) || entry.recordCount < 0))
		throw new Error("BRIGHTDATA_SNAPSHOT_JOURNAL_RECORD_COUNT_INVALID");
	return Object.freeze({
		source: entry.source,
		datasetId,
		snapshotId,
		phase: entry.phase,
		observedAt,
		providerStatus,
		recordCount: entry.recordCount,
	});
}

function eventHash(scope: BrightDataSnapshotJournalScope, entry: ReturnType<typeof normalizeEntry>): string {
	const canonical = JSON.stringify([
		scope.organizationId,
		scope.projectId,
		"BRIGHT_DATA",
		entry.source,
		entry.datasetId,
		entry.snapshotId,
		entry.phase,
		entry.observedAt.toISOString(),
		entry.providerStatus ?? null,
		entry.recordCount ?? null,
	]);
	return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function createPostgresBrightDataSnapshotJournal(
	options: PostgresBrightDataSnapshotJournalOptions,
): BrightDataSnapshotJournal {
	const scope = Object.freeze({
		organizationId: requiredScopeValue(options.organizationId, "BRIGHTDATA_SNAPSHOT_JOURNAL_ORGANIZATION_ID_REQUIRED"),
		projectId: requiredScopeValue(options.projectId, "BRIGHTDATA_SNAPSHOT_JOURNAL_PROJECT_ID_REQUIRED"),
	});

	return Object.freeze({
		async record(entry: BrightDataSnapshotJournalEntry): Promise<void> {
			const normalized = normalizeEntry(entry);
			await options.db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id', ${scope.organizationId}, true)`);
				await tx
					.insert(schema.svProviderDatasetSnapshotEvents)
					.values({
						organizationId: scope.organizationId,
						projectId: scope.projectId,
						provider: "BRIGHT_DATA",
						source: normalized.source,
						providerDatasetId: normalized.datasetId,
						snapshotId: normalized.snapshotId,
						phase: normalized.phase,
						providerStatus: normalized.providerStatus,
						recordCount: normalized.recordCount,
						observedAt: normalized.observedAt,
						eventHash: eventHash(scope, normalized),
					})
					.onConflictDoNothing({
						target: [
							schema.svProviderDatasetSnapshotEvents.organizationId,
							schema.svProviderDatasetSnapshotEvents.projectId,
							schema.svProviderDatasetSnapshotEvents.eventHash,
						],
					});
			});
		},

		async claimResume(entry: BrightDataSnapshotJournalEntry & Readonly<{ phase: "RESUMED" }>): Promise<boolean> {
			const normalized = normalizeEntry(entry);
			if (normalized.phase !== "RESUMED") throw new Error("BRIGHTDATA_SNAPSHOT_RESUME_PHASE_REQUIRED");
			return options.db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id', ${scope.organizationId}, true)`);
				await tx.execute(
					sql`select pg_advisory_xact_lock(hashtextextended(${`${scope.organizationId}:${scope.projectId}:${normalized.snapshotId}`}, 0))`,
				);
				const result = await tx.execute(sql`
					select exists (
						select 1
						from ${schema.svProviderDatasetSnapshotEvents}
						where organization_id = ${scope.organizationId}
							and project_id = ${scope.projectId}
							and source = ${normalized.source}
							and provider_dataset_id = ${normalized.datasetId}
							and snapshot_id = ${normalized.snapshotId}
							and phase = 'INTERRUPTED'
					) as authorized
				`);
				const authorized = (result.rows[0] as { authorized?: boolean } | undefined)?.authorized === true;
				if (!authorized) return false;
				await tx
					.insert(schema.svProviderDatasetSnapshotEvents)
					.values({
						organizationId: scope.organizationId,
						projectId: scope.projectId,
						provider: "BRIGHT_DATA",
						source: normalized.source,
						providerDatasetId: normalized.datasetId,
						snapshotId: normalized.snapshotId,
						phase: normalized.phase,
						observedAt: normalized.observedAt,
						eventHash: eventHash(scope, normalized),
					})
					.onConflictDoNothing({
						target: [
							schema.svProviderDatasetSnapshotEvents.organizationId,
							schema.svProviderDatasetSnapshotEvents.projectId,
							schema.svProviderDatasetSnapshotEvents.eventHash,
						],
					});
				return true;
			});
		},
	});
}
