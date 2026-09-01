import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";
import type * as schema from "../db/schema";
import type { BrightDataSnapshotJournalEntry } from "../providers/brightdata-dataset-client";
import { createPostgresBrightDataSnapshotJournal } from "./brightdata-snapshot-journal";

function createDatabase() {
	const values: Array<Record<string, unknown>> = [];
	const execute = vi.fn(async (): Promise<unknown> => undefined);
	const onConflictDoNothing = vi.fn(async () => undefined);
	const insert = vi.fn(() => ({
		values: vi.fn((value: Record<string, unknown>) => {
			values.push(value);
			return { onConflictDoNothing };
		}),
	}));
	const transaction = vi.fn(
		async (callback: (tx: { execute: typeof execute; insert: typeof insert }) => Promise<void>) =>
			callback({ execute, insert }),
	);
	return {
		db: { transaction } as unknown as NodePgDatabase<typeof schema>,
		execute,
		onConflictDoNothing,
		transaction,
		values,
	};
}

const delivered: BrightDataSnapshotJournalEntry = {
	source: "YOUTUBE_VIDEOS",
	datasetId: "gd_youtube",
	snapshotId: "snapshot-1",
	phase: "DELIVERED",
	observedAt: "2026-09-01T00:00:00.000Z",
	recordCount: 1,
};

describe("Postgres Bright Data snapshot journal adapter", () => {
	it("binds every append to immutable tenant scope and a deterministic event hash", async () => {
		const state = createDatabase();
		const journal = createPostgresBrightDataSnapshotJournal({
			db: state.db,
			organizationId: "tenant-a",
			projectId: "d827d967-41c1-43d3-b729-61ddd4eafad8",
		});

		await journal.record(delivered);
		await journal.record(delivered);

		expect(state.transaction).toHaveBeenCalledTimes(2);
		expect(state.execute).toHaveBeenCalledTimes(2);
		expect(state.onConflictDoNothing).toHaveBeenCalledTimes(2);
		expect(state.values).toHaveLength(2);
		expect(state.values[0]).toMatchObject({
			organizationId: "tenant-a",
			projectId: "d827d967-41c1-43d3-b729-61ddd4eafad8",
			provider: "BRIGHT_DATA",
			source: "YOUTUBE_VIDEOS",
			providerDatasetId: "gd_youtube",
			snapshotId: "snapshot-1",
			phase: "DELIVERED",
			recordCount: 1,
			observedAt: new Date("2026-09-01T00:00:00.000Z"),
		});
		expect(state.values[0]?.eventHash).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(state.values[1]?.eventHash).toBe(state.values[0]?.eventHash);
		expect(state.values[0]).not.toHaveProperty("rawPayload");
		expect(state.values[0]).not.toHaveProperty("url");
	});

	it("normalizes equivalent timestamps before deriving idempotency identity", async () => {
		const state = createDatabase();
		const journal = createPostgresBrightDataSnapshotJournal({
			db: state.db,
			organizationId: "tenant-a",
			projectId: "d827d967-41c1-43d3-b729-61ddd4eafad8",
		});

		await journal.record(delivered);
		await journal.record({ ...delivered, observedAt: "2026-09-01T08:00:00+08:00" });

		expect(state.values[1]?.eventHash).toBe(state.values[0]?.eventHash);
	});

	it("claims resume only after a same-scope interrupted snapshot is found", async () => {
		const state = createDatabase();
		state.execute
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({
				rows: [{ authorized: true }],
			});
		const journal = createPostgresBrightDataSnapshotJournal({
			db: state.db,
			organizationId: "tenant-a",
			projectId: "d827d967-41c1-43d3-b729-61ddd4eafad8",
		});

		await expect(journal.claimResume({ ...delivered, phase: "RESUMED", recordCount: undefined })).resolves.toBe(true);
		expect(state.execute).toHaveBeenCalledTimes(3);
		expect(state.values.at(-1)).toMatchObject({ phase: "RESUMED", snapshotId: "snapshot-1" });
	});

	it("rejects an unowned resume without inserting an event", async () => {
		const state = createDatabase();
		state.execute
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({
				rows: [{ authorized: false }],
			});
		const journal = createPostgresBrightDataSnapshotJournal({
			db: state.db,
			organizationId: "tenant-b",
			projectId: "d827d967-41c1-43d3-b729-61ddd4eafad8",
		});

		await expect(journal.claimResume({ ...delivered, phase: "RESUMED", recordCount: undefined })).resolves.toBe(false);
		expect(state.values).toHaveLength(0);
	});

	it("rejects malformed scope and lifecycle metadata before opening a transaction", async () => {
		const state = createDatabase();
		expect(() =>
			createPostgresBrightDataSnapshotJournal({ db: state.db, organizationId: " ", projectId: "project-a" }),
		).toThrow("BRIGHTDATA_SNAPSHOT_JOURNAL_ORGANIZATION_ID_REQUIRED");
		const journal = createPostgresBrightDataSnapshotJournal({
			db: state.db,
			organizationId: "tenant-a",
			projectId: "project-a",
		});

		await expect(journal.record({ ...delivered, observedAt: "not-a-date" })).rejects.toThrow(
			"BRIGHTDATA_SNAPSHOT_JOURNAL_OBSERVED_AT_INVALID",
		);
		await expect(journal.record({ ...delivered, recordCount: -1 })).rejects.toThrow(
			"BRIGHTDATA_SNAPSHOT_JOURNAL_RECORD_COUNT_INVALID",
		);
		expect(state.transaction).not.toHaveBeenCalled();
	});
});
