import { createHash } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";
import { googleAiModeDatasetAdapter } from "../adapters/google-dataset-adapters";
import { createBrightDataDatasetClient } from "../providers/brightdata-dataset-client";
import {
	GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
	type GoogleAiModeCanaryReceipt,
} from "../providers/google-ai-mode-one-shot-canary";
import { providerDatasetContentHash } from "../providers/provider-dataset-authority";
import {
	GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY,
	persistGoogleAiModeCanaryCapture,
	reconcileHistoricalGoogleAiModeCapture,
	reserveGoogleAiModeCanaryExecution,
} from "./provider-canary-execution";
import * as schema from "./schema";

function databaseReturning(rows: { id: string }[]) {
	const returning = vi.fn(async () => rows);
	const onConflictDoNothing = vi.fn(() => ({ returning }));
	const values = vi.fn(() => ({ onConflictDoNothing }));
	const insert = vi.fn(() => ({ values }));
	const execute = vi.fn(async () => ({
		rows: [{ role: "selena_owner", session_role: "selena_owner", owner_role: "selena_owner" }],
	}));
	const transaction = vi.fn(
		async (work: (tx: { execute: typeof execute; insert: typeof insert }) => Promise<unknown>) =>
			work({ execute, insert }),
	);
	return {
		db: { transaction } as unknown as NodePgDatabase<typeof schema>,
		spies: { transaction, insert, values, onConflictDoNothing, returning },
	};
}

describe("reserveGoogleAiModeCanaryExecution", () => {
	it("commits the fixed one-shot contract and returns its reservation", async () => {
		const { db, spies } = databaseReturning([{ id: "reservation-1" }]);
		await expect(
			reserveGoogleAiModeCanaryExecution(db, {
				organizationId: "tenant-1",
				executionIdentity: "release-0e00df4f-google-ai-mode-owner-canary-1",
			}),
		).resolves.toEqual({
			status: "RESERVED",
			reservationId: "reservation-1",
			approvedCapUsd: 0.25,
			remainingAuthorizedUsd: 0.25,
		});
		expect(spies.transaction).toHaveBeenCalledTimes(1);
		expect(spies.values).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "tenant-1",
				source: "GOOGLE_AI_MODE",
				approvedCapUsd: "0.250000",
				recurring: false,
				automaticRetries: 0,
				costStatus: "UNKNOWN",
			}),
		);
		expect(spies.onConflictDoNothing).toHaveBeenCalledTimes(1);
	});

	it("fails closed when the execution identity was reserved before", async () => {
		const { db } = databaseReturning([]);
		await expect(
			reserveGoogleAiModeCanaryExecution(db, {
				organizationId: "tenant-1",
				executionIdentity: "release-0e00df4f-google-ai-mode-owner-canary-1",
			}),
		).resolves.toEqual({ status: "ALREADY_RESERVED" });
	});

	it("rejects malformed identities before opening a transaction", async () => {
		const { db, spies } = databaseReturning([]);
		await expect(
			reserveGoogleAiModeCanaryExecution(db, { organizationId: "tenant-1", executionIdentity: " short " }),
		).rejects.toThrow("PROVIDER_CANARY_EXECUTION_IDENTITY_INVALID");
		expect(spies.transaction).not.toHaveBeenCalled();
	});
});

const completeReceipt = (reservationId = "11111111-1111-4111-8111-111111111111") =>
	({
		schemaVersion: "google-ai-mode-canary-receipt-v1.3",
		terminal: true,
		source: "GOOGLE_AI_MODE",
		status: "COMPLETE",
		reason: null,
		providerCalls: 1,
		recurring: false,
		automaticRetries: 0,
		retryAllowed: false,
		reservationReference: `db:${reservationId}`,
		cost: {
			currency: "USD",
			status: "UNKNOWN",
			amountUsd: null,
			estimatedWorstCaseUsd: 0.1,
			approvedCapUsd: 0.25,
			reservedUsd: 0.25,
			basis: "PROVIDER_ACTUAL_UNAVAILABLE",
			reconciliation: "REQUIRED",
			acceptance: "HOLD",
			preflightEvidenceReference: "cost-preflight:fixture-12345678",
		},
		timing: {
			overallTimeoutMs: 1_440_000,
			triggerTimeoutMs: 25_000,
			progressTimeoutMs: 20_000,
			downloadTimeoutMs: 60_000,
			pollIntervalMs: 10_000,
			cancelTimeoutMs: 10_000,
		},
		snapshotReference: "brightdata:snapshot:private-snapshot-id",
		recordCount: 1,
		startedAt: "2026-08-31T10:00:00.000Z",
		finishedAt: "2026-08-31T10:01:00.000Z",
	}) satisfies GoogleAiModeCanaryReceipt;

async function privateCaptureFixture() {
	const prepared = googleAiModeDatasetAdapter.prepareCanary(
		{
			mode: "CANARY",
			environment: "ISOLATED_CANARY",
			ownerApproved: true,
			schemaDiscoveryOnly: true,
			providerCalls: 1,
			recurring: false,
			worstCaseCostUsd: 0.1,
			approvedCostCapUsd: 0.25,
			redactionPolicyApproved: true,
		},
		{ SELENA_BRIGHTDATA_DATASET_GOOGLE_AI: "gd_fixture123" },
		{ query: "private fixture query" },
	);
	const collected = await createBrightDataDatasetClient({
		lifecycle: {
			timeoutMs: 1_000,
			pollIntervalMs: 10,
			cancelTimeoutMs: 100,
			readyStatuses: ["ready"],
			pendingStatuses: ["pending"],
			terminalFailureStatuses: ["failed"],
		},
		transport: {
			preflight: async () => undefined,
			trigger: async () => ({ snapshotId: "private-snapshot-id" }),
			progress: async () => ({ status: "ready" }),
			download: async () => [{ privateAnswer: "never-print-this" }],
			cancel: async () => undefined,
		},
		journal: { record: async () => undefined, claimResume: async () => false },
		nowIso: () => "2026-08-31T10:01:00.000Z",
	}).collect(prepared);
	if (collected.status !== "COMPLETE") throw new Error("TEST_CAPTURE_NOT_COMPLETE");
	return { prepared, capture: collected.capture };
}

function persistenceDatabase(options: { reservationId?: string; latestCapability?: Record<string, unknown> } = {}) {
	const reservationId = options.reservationId ?? "11111111-1111-4111-8111-111111111111";
	const inserted = new Map<unknown, unknown[]>();
	const execute = vi.fn(async () => ({
		rows: [{ role: "selena_owner", session_role: "selena_owner", owner_role: "selena_owner" }],
	}));
	const select = vi.fn(() => ({
		from: (table: unknown) => ({
			where: () => {
				const rows =
					table === schema.svProviderCanaryExecutions
						? [
								{
									id: reservationId,
									approvedCapUsd: "0.250000",
									recurring: false,
									automaticRetries: 0,
									costStatus: "UNKNOWN",
								},
							]
						: options.latestCapability
							? [options.latestCapability]
							: [];
				return {
					limit: async () => rows,
					orderBy: () => ({ limit: async () => rows }),
				};
			},
		}),
	}));
	const insert = vi.fn((table: unknown) => ({
		values: (value: unknown) => {
			inserted.set(table, [...(inserted.get(table) ?? []), value]);
			const id =
				table === schema.svProviderDatasetCapabilities
					? "22222222-2222-4222-8222-222222222222"
					: table === schema.svSourceSnapshots
						? "33333333-3333-4333-8333-333333333333"
						: "44444444-4444-4444-8444-444444444444";
			return { returning: async () => [{ id }] };
		},
	}));
	const transaction = vi.fn(
		async (work: (tx: { execute: typeof execute; select: typeof select; insert: typeof insert }) => Promise<unknown>) =>
			work({ execute, select, insert }),
	);
	return {
		db: { transaction } as unknown as NodePgDatabase<typeof schema>,
		inserted,
		spies: { transaction, execute, select, insert },
	};
}

describe("persistGoogleAiModeCanaryCapture", () => {
	it("stores one validated raw-private capture and keeps measurement evidence and cost acceptance on HOLD", async () => {
		const fixture = await privateCaptureFixture();
		const { db, inserted, spies } = persistenceDatabase();

		const persistence = await persistGoogleAiModeCanaryCapture(db, {
			organizationId: "tenant-1",
			executionIdentity: GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
			prepared: fixture.prepared,
			capture: fixture.capture,
			receipt: completeReceipt(),
		});

		expect(persistence).toEqual({
			schemaVersion: "google-ai-mode-canary-persistence-receipt-v1.3",
			status: "PERSISTED_PRIVATE",
			source: "GOOGLE_AI_MODE",
			capabilityStatus: "CANARY_ONLY",
			outputSchemaVersion: null,
			evidenceIndexStatus: "NOT_ELIGIBLE",
			recordCount: 1,
			costStatus: "UNKNOWN",
			acceptance: "HOLD",
			reason: "COST_RECONCILIATION_REQUIRED",
		});
		expect(spies.transaction).toHaveBeenCalledTimes(1);
		expect(inserted.has(schema.svEvidenceIndex)).toBe(false);
		expect(inserted.has(schema.svCostEvents)).toBe(false);
		expect(inserted.get(schema.svProviderDatasetCapabilities)?.[0]).toMatchObject({
			organizationId: "tenant-1",
			source: "GOOGLE_AI_MODE",
			capabilityStatus: "CANARY_ONLY",
			outputSchemaVersion: null,
			version: 1,
			immutable: true,
		});
		const sourceSnapshot = inserted.get(schema.svSourceSnapshots)?.[0];
		expect(sourceSnapshot).toMatchObject({
			organizationId: "tenant-1",
			sourceType: "GOOGLE_AI_MODE",
			providerDatasetRef: "gd_fixture123",
			environment: "ISOLATED_CANARY",
			rawReference: "brightdata:snapshot:private-snapshot-id",
			outputSchemaVersion: null,
			immutable: true,
			snapshot: { rawPayload: [{ privateAnswer: "never-print-this" }], normalized: false },
		});
		expect(sourceSnapshot).toHaveProperty("contentSha256", expect.stringMatching(/^sha256:[a-f0-9]{64}$/));
		const audit = inserted.get(schema.svAuditEvents)?.[0];
		expect(audit).toMatchObject({
			event: "GOOGLE_AI_MODE_CANARY_CAPTURE_PERSISTED",
			details: {
				evidenceIndexStatus: "NOT_ELIGIBLE",
				costStatus: "UNKNOWN",
				acceptance: "HOLD",
			},
		});
		expect(JSON.stringify({ persistence, audit })).not.toContain("never-print-this");
		expect(JSON.stringify({ persistence, audit })).not.toContain("private-snapshot-id");
		expect(JSON.stringify({ persistence, audit })).not.toContain("gd_fixture123");
	});

	it("rejects a receipt not bound to the tenant reservation before writing private evidence", async () => {
		const fixture = await privateCaptureFixture();
		const { db, inserted } = persistenceDatabase();

		await expect(
			persistGoogleAiModeCanaryCapture(db, {
				organizationId: "tenant-1",
				executionIdentity: GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
				prepared: fixture.prepared,
				capture: fixture.capture,
				receipt: completeReceipt("99999999-9999-4999-8999-999999999999"),
			}),
		).rejects.toThrow("GOOGLE_AI_MODE_CANARY_RESERVATION_MISMATCH");
		expect(inserted.size).toBe(0);
	});
});

function historicalReconciliationDatabase() {
	const reservationId = "11111111-1111-4111-8111-111111111111";
	const journalRows = [
		["TRIGGERED", "2026-09-01T08:54:47.108Z", null],
		["PENDING", "2026-09-01T08:54:57.108Z", "running"],
		["PENDING", "2026-09-01T08:55:07.108Z", "running"],
		["READY", "2026-09-01T08:55:17.108Z", "ready"],
		["INTERRUPTED", "2026-09-01T08:55:18.108Z", null],
	].map(([phase, observedAt, providerStatus]) => ({
		provider: "BRIGHT_DATA",
		source: "GOOGLE_AI_MODE",
		providerDatasetId: "gd_history123",
		snapshotId: "historical-snapshot",
		phase,
		providerStatus,
		recordCount: null as number | null,
		observedAt: new Date(observedAt as string),
	}));
	const committed: Array<{ table: unknown; value: Record<string, unknown> }> = [];
	const attempted: Array<{ table: unknown; value: Record<string, unknown> }> = [];
	const rollbacks = { count: 0 };
	let storedCapability: Record<string, unknown> | undefined;
	let storedSnapshot: Record<string, unknown> | undefined;
	let storedAudit: Record<string, unknown> | undefined;
	const execute = vi.fn(async () => ({
		rows: [{ role: "selena_owner", session_role: "selena_owner", owner_role: "selena_owner" }],
	}));
	const transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => {
		const staged: Array<{ table: unknown; value: Record<string, unknown> }> = [];
		const stagedJournal = journalRows.map((row) => ({ ...row }));
		const select = vi.fn(() => ({
			from: (table: unknown) => ({
				where: () => ({
					limit: async () => {
						if (table === schema.svProviderCanaryExecutions)
							return [
								{
									id: reservationId,
									approvedCapUsd: "0.250000",
									recurring: false,
									automaticRetries: 0,
									costStatus: "UNKNOWN",
								},
							];
						if (table === schema.svSourceSnapshots) return storedSnapshot ? [storedSnapshot] : [];
						if (table === schema.svAuditEvents) return storedAudit ? [{ details: storedAudit.details }] : [];
						if (table === schema.svProviderDatasetCapabilities) return storedCapability ? [storedCapability] : [];
						return [];
					},
					orderBy: () =>
						table === schema.svProviderDatasetSnapshotEvents
							? Promise.resolve(stagedJournal.map((row) => ({ ...row })))
							: { limit: async () => (storedCapability ? [storedCapability] : []) },
				}),
			}),
		}));
		const insert = vi.fn((table: unknown) => ({
			values: (value: Record<string, unknown>) => {
				attempted.push({ table, value });
				staged.push({ table, value });
				if (table === schema.svProviderDatasetSnapshotEvents) {
					stagedJournal.push({
						provider: value.provider as string,
						source: value.source as string,
						providerDatasetId: value.providerDatasetId as string,
						snapshotId: value.snapshotId as string,
						phase: value.phase as string,
						providerStatus: (value.providerStatus as string | undefined) ?? null,
						recordCount: (value.recordCount as number | undefined) ?? null,
						observedAt: value.observedAt as Date,
					});
					return Promise.resolve(undefined);
				}
				const id =
					table === schema.svProviderDatasetCapabilities
						? "22222222-2222-4222-8222-222222222222"
						: table === schema.svSourceSnapshots
							? "33333333-3333-4333-8333-333333333333"
							: "44444444-4444-4444-8444-444444444444";
				return { returning: async () => [{ id }] };
			},
		}));
		let result: unknown;
		try {
			result = await work({ execute, select, insert });
		} catch (error) {
			rollbacks.count += 1;
			throw error;
		}
		journalRows.splice(0, journalRows.length, ...stagedJournal);
		for (const item of staged) {
			if (item.table === schema.svProviderDatasetCapabilities)
				storedCapability = { id: "22222222-2222-4222-8222-222222222222", ...item.value };
			if (item.table === schema.svSourceSnapshots)
				storedSnapshot = { id: "33333333-3333-4333-8333-333333333333", ...item.value };
			if (item.table === schema.svAuditEvents)
				storedAudit = { id: "44444444-4444-4444-8444-444444444444", ...item.value };
		}
		committed.push(...staged);
		return result;
	});
	return {
		db: { transaction } as unknown as NodePgDatabase<typeof schema>,
		attempted,
		committed,
		rollbacks,
		transaction,
		execute,
		corruptSnapshot(patch: Record<string, unknown>) {
			if (!storedSnapshot) throw new Error("TEST_SNAPSHOT_MISSING");
			storedSnapshot = { ...storedSnapshot, ...patch };
		},
		corruptSnapshotPayload() {
			if (!storedSnapshot || typeof storedSnapshot.snapshot !== "object" || storedSnapshot.snapshot === null)
				throw new Error("TEST_SNAPSHOT_MISSING");
			storedSnapshot = {
				...storedSnapshot,
				snapshot: { ...(storedSnapshot.snapshot as Record<string, unknown>), rawPayload: [{ answer: "corrupt" }] },
			};
		},
		corruptAuditDetails(patch: Record<string, unknown>) {
			if (!storedAudit || typeof storedAudit.details !== "object" || storedAudit.details === null)
				throw new Error("TEST_AUDIT_MISSING");
			storedAudit = { ...storedAudit, details: { ...(storedAudit.details as Record<string, unknown>), ...patch } };
		},
		corruptCapability(patch: Record<string, unknown>) {
			if (!storedCapability) throw new Error("TEST_CAPABILITY_MISSING");
			storedCapability = { ...storedCapability, ...patch };
		},
	};
}

function historicalReconciliationInput(dryRun = false) {
	const rawFileBytes = Buffer.from(JSON.stringify([{ answer: "private historical payload" }]));
	return {
		organizationId: "tenant-a",
		projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		executionIdentity: GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY,
		providerDatasetId: "gd_history123",
		snapshotId: "historical-snapshot",
		capturedAt: "2026-09-01T08:54:46.000Z",
		historicalReadyObservedAt: "2026-09-01T08:55:17.108Z",
		reconciledAt: "2026-09-01T12:00:00.000Z",
		providerInput: { query: "historical query" },
		rawFileBytes,
		expectedFileSha256: `sha256:${createHash("sha256").update(rawFileBytes).digest("hex")}`,
		expectedCanonicalHash: providerDatasetContentHash(JSON.parse(rawFileBytes.toString("utf8")) as unknown),
		estimatedWorstCaseUsd: 0.0015,
		dryRun,
	} as const;
}

describe("reconcileHistoricalGoogleAiModeCapture", () => {
	it("executes the full private recovery path and rolls every write back in dry-run mode", async () => {
		const rawFileBytes = Buffer.from(JSON.stringify([{ answer: "private historical payload" }]));
		const rawPayload = JSON.parse(rawFileBytes.toString("utf8")) as unknown;
		const state = historicalReconciliationDatabase();

		const receipt = await reconcileHistoricalGoogleAiModeCapture(state.db, {
			organizationId: "tenant-a",
			projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			executionIdentity: GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY,
			providerDatasetId: "gd_history123",
			snapshotId: "historical-snapshot",
			capturedAt: "2026-09-01T08:54:46.000Z",
			historicalReadyObservedAt: "2026-09-01T08:55:17.108Z",
			reconciledAt: "2026-09-01T12:00:00.000Z",
			providerInput: { query: "historical query" },
			rawFileBytes,
			expectedFileSha256: `sha256:${createHash("sha256").update(rawFileBytes).digest("hex")}`,
			expectedCanonicalHash: providerDatasetContentHash(rawPayload),
			estimatedWorstCaseUsd: 0.0015,
			dryRun: true,
		});

		expect(receipt).toMatchObject({
			status: "DRY_RUN_ROLLED_BACK",
			providerCalls: 0,
			evidenceIndexStatus: "NOT_CREATED",
			costEventStatus: "NOT_CREATED",
			acceptanceReceiptStatus: "NOT_CREATED",
			humanAccepted: false,
			acceptance: "HOLD",
		});
		expect(state.transaction).toHaveBeenCalledTimes(1);
		expect(state.attempted.filter((item) => item.table === schema.svProviderDatasetSnapshotEvents)).toHaveLength(3);
		expect(state.attempted.some((item) => item.table === schema.svSourceSnapshots)).toBe(true);
		expect(state.attempted.some((item) => item.table === schema.svAuditEvents)).toBe(true);
		expect(state.attempted.some((item) => item.table === schema.svEvidenceIndex)).toBe(false);
		expect(state.attempted.some((item) => item.table === schema.svCostEvents)).toBe(false);
		expect(state.committed).toHaveLength(0);
		expect(state.rollbacks.count).toBe(1);
		expect(JSON.stringify(receipt)).not.toContain("historical-snapshot");
		expect(JSON.stringify(receipt)).not.toContain("gd_history123");
		expect(JSON.stringify(receipt)).not.toContain("private historical payload");
	});

	it("fails closed before private reads for the least-privilege selena_app role", async () => {
		const state = historicalReconciliationDatabase();
		state.execute.mockResolvedValue({
			rows: [{ role: "selena_app", session_role: "selena_owner", owner_role: "selena_owner" }],
		});

		await expect(reconcileHistoricalGoogleAiModeCapture(state.db, historicalReconciliationInput(true))).rejects.toThrow(
			"GOOGLE_AI_MODE_HISTORICAL_OWNER_SCOPE_REQUIRED",
		);
		expect(state.attempted).toHaveLength(0);
	});

	it("rejects a mismatched supplied file hash before opening a transaction", async () => {
		const rawFileBytes = Buffer.from("[]");
		const state = historicalReconciliationDatabase();

		await expect(
			reconcileHistoricalGoogleAiModeCapture(state.db, {
				organizationId: "tenant-a",
				projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				executionIdentity: GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY,
				providerDatasetId: "gd_history123",
				snapshotId: "historical-snapshot",
				capturedAt: "2026-09-01T08:54:46.000Z",
				historicalReadyObservedAt: "2026-09-01T08:55:17.108Z",
				reconciledAt: "2026-09-01T12:00:00.000Z",
				providerInput: { query: "historical query" },
				rawFileBytes,
				expectedFileSha256: `sha256:${"0".repeat(64)}`,
				expectedCanonicalHash: providerDatasetContentHash([]),
				estimatedWorstCaseUsd: 0.0015,
				dryRun: true,
			}),
		).rejects.toThrow("GOOGLE_AI_MODE_HISTORICAL_FILE_HASH_MISMATCH");
		expect(state.transaction).not.toHaveBeenCalled();
	});

	it("returns the same redacted outcome without new writes after an exact committed reconciliation", async () => {
		const input = historicalReconciliationInput();
		const state = historicalReconciliationDatabase();

		await expect(reconcileHistoricalGoogleAiModeCapture(state.db, input)).resolves.toMatchObject({
			status: "PERSISTED_PRIVATE",
			providerCalls: 0,
			acceptance: "HOLD",
		});
		const committedAfterFirstRun = state.committed.length;
		const attemptedAfterFirstRun = state.attempted.length;
		expect(state.committed.filter((item) => item.table === schema.svSourceSnapshots)).toHaveLength(1);
		expect(state.committed.filter((item) => item.table === schema.svAuditEvents)).toHaveLength(1);
		expect(state.committed.filter((item) => item.table === schema.svEvidenceIndex)).toHaveLength(0);
		expect(state.committed.filter((item) => item.table === schema.svCostEvents)).toHaveLength(0);
		await expect(reconcileHistoricalGoogleAiModeCapture(state.db, input)).resolves.toMatchObject({
			status: "ALREADY_RECONCILED",
			providerCalls: 0,
			acceptance: "HOLD",
		});
		expect(state.committed).toHaveLength(committedAfterFirstRun);
		expect(state.attempted).toHaveLength(attemptedAfterFirstRun);
		await expect(reconcileHistoricalGoogleAiModeCapture(state.db, { ...input, dryRun: true })).resolves.toMatchObject({
			status: "DRY_RUN_ROLLED_BACK",
			providerCalls: 0,
			acceptance: "HOLD",
		});
		expect(state.committed).toHaveLength(committedAfterFirstRun);
		expect(state.attempted).toHaveLength(attemptedAfterFirstRun);
		expect(state.rollbacks.count).toBe(1);
	});

	it.each([
		[
			"canonical snapshot payload",
			(state: ReturnType<typeof historicalReconciliationDatabase>) => state.corruptSnapshotPayload(),
		],
		[
			"snapshot input schema",
			(state: ReturnType<typeof historicalReconciliationDatabase>) =>
				state.corruptSnapshot({ inputSchemaVersion: "corrupt" }),
		],
		[
			"capability contract",
			(state: ReturnType<typeof historicalReconciliationDatabase>) =>
				state.corruptCapability({ capabilityStatus: "ACTIVE" }),
		],
		[
			"audit receipt",
			(state: ReturnType<typeof historicalReconciliationDatabase>) =>
				state.corruptAuditDetails({ costEventStatus: "CREATED" }),
		],
	])("fails closed for corrupt existing %s", async (_label, corrupt) => {
		const input = historicalReconciliationInput();
		const state = historicalReconciliationDatabase();
		await reconcileHistoricalGoogleAiModeCapture(state.db, input);
		corrupt(state);

		await expect(reconcileHistoricalGoogleAiModeCapture(state.db, input)).rejects.toThrow(
			"GOOGLE_AI_MODE_HISTORICAL_IDEMPOTENCY_MISMATCH",
		);
	});

	it("rejects a file above the fixed 4 MiB ceiling before hashing or opening a transaction", async () => {
		const state = historicalReconciliationDatabase();

		await expect(
			reconcileHistoricalGoogleAiModeCapture(state.db, {
				organizationId: "tenant-a",
				projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				executionIdentity: GOOGLE_AI_MODE_HISTORICAL_CANARY_EXECUTION_IDENTITY,
				providerDatasetId: "gd_history123",
				snapshotId: "historical-snapshot",
				capturedAt: "2026-09-01T08:54:46.000Z",
				historicalReadyObservedAt: "2026-09-01T08:55:17.108Z",
				reconciledAt: "2026-09-01T12:00:00.000Z",
				providerInput: { query: "historical query" },
				rawFileBytes: Buffer.alloc(4 * 1024 * 1024 + 1),
				expectedFileSha256: `sha256:${"0".repeat(64)}`,
				expectedCanonicalHash: providerDatasetContentHash([]),
				estimatedWorstCaseUsd: 0.0015,
				dryRun: true,
			}),
		).rejects.toThrow("GOOGLE_AI_MODE_HISTORICAL_FILE_SIZE_INVALID");
		expect(state.transaction).not.toHaveBeenCalled();
	});
});
