import { describe, expect, it, vi } from "vitest";
import { recoverHistoricalGoogleAiModeJournal } from "./brightdata-snapshot-journal";
import type { OrganizationTransaction } from "./organization-transaction";

const binding = {
	organizationId: "tenant-a",
	projectId: "11111111-1111-4111-8111-111111111111",
	providerDatasetId: "gd_history123",
	snapshotId: "historical-snapshot",
	historicalReadyObservedAt: "2026-09-01T08:55:17.108Z",
	reconciledAt: "2026-09-01T12:00:00.000Z",
	recordCount: 1,
} as const;

type JournalTestRow = {
	provider: string;
	source: string;
	providerDatasetId: string;
	snapshotId: string;
	phase: string;
	providerStatus: string | null;
	recordCount: number | null;
	observedAt: Date;
};

function originalRows(overrides: Partial<{ providerDatasetId: string }> = {}): JournalTestRow[] {
	return [
		["TRIGGERED", "2026-09-01T08:54:47.108Z", null],
		["PENDING", "2026-09-01T08:54:57.108Z", "running"],
		["PENDING", "2026-09-01T08:55:07.108Z", "running"],
		["READY", binding.historicalReadyObservedAt, "ready"],
		["INTERRUPTED", "2026-09-01T08:55:18.108Z", null],
	].map(([phase, observedAt, providerStatus]) => ({
		provider: "BRIGHT_DATA",
		source: "GOOGLE_AI_MODE",
		providerDatasetId: overrides.providerDatasetId ?? binding.providerDatasetId,
		snapshotId: binding.snapshotId,
		phase: phase as string,
		providerStatus: providerStatus as string | null,
		recordCount: null,
		observedAt: new Date(observedAt as string),
	}));
}

function transactionWithRows(seed = originalRows()) {
	const rows: JournalTestRow[] = [...seed];
	const execute = vi.fn(async () => undefined);
	const select = vi.fn(() => ({
		from: () => ({
			where: () => ({
				orderBy: async () => rows.map((row) => ({ ...row })),
			}),
		}),
	}));
	const insert = vi.fn(() => ({
		values: async (value: Record<string, unknown>) => {
			rows.push({
				provider: value.provider as string,
				source: value.source as string,
				providerDatasetId: value.providerDatasetId as string,
				snapshotId: value.snapshotId as string,
				phase: value.phase as string,
				providerStatus: (value.providerStatus as string | undefined) ?? null,
				recordCount: (value.recordCount as number | undefined) ?? null,
				observedAt: value.observedAt as Date,
			});
		},
	}));
	return { tx: { execute, select, insert } as unknown as OrganizationTransaction, execute, insert, rows };
}

describe("recoverHistoricalGoogleAiModeJournal", () => {
	it("appends only the deterministic recovery phases under the existing transaction lock", async () => {
		const state = transactionWithRows();

		await expect(recoverHistoricalGoogleAiModeJournal(state.tx, binding)).resolves.toEqual({ status: "RECOVERED" });

		expect(state.execute).toHaveBeenCalledTimes(1);
		expect(state.insert).toHaveBeenCalledTimes(3);
		expect(state.rows.slice(-3).map((row) => row.phase)).toEqual(["RESUMED", "READY", "DELIVERED"]);
		expect(state.rows.at(-1)).toMatchObject({ recordCount: 1 });
	});

	it("is deterministic after the exact lifecycle was delivered", async () => {
		const state = transactionWithRows();
		await recoverHistoricalGoogleAiModeJournal(state.tx, binding);
		state.insert.mockClear();

		await expect(recoverHistoricalGoogleAiModeJournal(state.tx, binding)).resolves.toEqual({
			status: "ALREADY_DELIVERED",
		});
		expect(state.insert).not.toHaveBeenCalled();
	});

	it("fails closed when the historical journal is bound to another dataset", async () => {
		const state = transactionWithRows(originalRows({ providerDatasetId: "gd_other123" }));

		await expect(recoverHistoricalGoogleAiModeJournal(state.tx, binding)).rejects.toThrow(
			"GOOGLE_AI_MODE_HISTORICAL_JOURNAL_BINDING_MISMATCH",
		);
		expect(state.insert).not.toHaveBeenCalled();
	});
});
