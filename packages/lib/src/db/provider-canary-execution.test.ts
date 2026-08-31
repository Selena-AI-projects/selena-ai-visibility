import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";
import { googleAiModeDatasetAdapter } from "../adapters/google-dataset-adapters";
import { createBrightDataDatasetClient } from "../providers/brightdata-dataset-client";
import {
	GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
	type GoogleAiModeCanaryReceipt,
} from "../providers/google-ai-mode-one-shot-canary";
import { persistGoogleAiModeCanaryCapture, reserveGoogleAiModeCanaryExecution } from "./provider-canary-execution";
import * as schema from "./schema";

function databaseReturning(rows: { id: string }[]) {
	const returning = vi.fn(async () => rows);
	const onConflictDoNothing = vi.fn(() => ({ returning }));
	const values = vi.fn(() => ({ onConflictDoNothing }));
	const insert = vi.fn(() => ({ values }));
	const execute = vi.fn(async () => undefined);
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
			trigger: async () => ({ snapshotId: "private-snapshot-id" }),
			progress: async () => ({ status: "ready" }),
			download: async () => [{ privateAnswer: "never-print-this" }],
			cancel: async () => undefined,
		},
		nowIso: () => "2026-08-31T10:01:00.000Z",
	}).collect(prepared);
	if (collected.status !== "COMPLETE") throw new Error("TEST_CAPTURE_NOT_COMPLETE");
	return { prepared, capture: collected.capture };
}

function persistenceDatabase(options: { reservationId?: string; latestCapability?: Record<string, unknown> } = {}) {
	const reservationId = options.reservationId ?? "11111111-1111-4111-8111-111111111111";
	const inserted = new Map<unknown, unknown[]>();
	const execute = vi.fn(async () => undefined);
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
