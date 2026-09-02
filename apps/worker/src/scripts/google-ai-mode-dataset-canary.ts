/**
 * One-shot GOOGLE_AI_MODE schema-discovery command. It has no scheduler and no
 * retry path. The only stdout payload is the redacted terminal receipt.
 *
 * Runtime input is injected as SELENA_GOOGLE_AI_MODE_CANARY_INPUT_JSON because
 * the provider dataset's concrete record schema must be verified externally;
 * this command deliberately does not guess it.
 */

import { createPostgresBrightDataSnapshotJournal } from "@workspace/lib/adapters/brightdata-snapshot-journal";
import { db } from "@workspace/lib/db/db";
import {
	type GoogleAiModeCanaryCapturePersistenceReceipt,
	persistGoogleAiModeCanaryCapture,
	reserveGoogleAiModeCanaryExecution,
} from "@workspace/lib/db/provider-canary-execution";
import type { ProviderDatasetAccessRequest } from "@workspace/lib/providers/dataset-registry";
import {
	createBrightDataGoogleAiModeTransport,
	GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
	type GoogleAiModeCanaryReceipt,
	type GoogleAiModeCostPreflightEvidence,
	runGoogleAiModeOneShotCanary,
} from "@workspace/lib/providers/google-ai-mode-one-shot-canary";
import { getCredential } from "@workspace/lib/secrets";

function providerInput(value: string | undefined): unknown {
	if (!value?.trim()) return {};
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return {};
	}
}

function costPreflightEvidence(value: string | undefined): GoogleAiModeCostPreflightEvidence | undefined {
	if (!value?.trim()) return undefined;
	try {
		const parsed = JSON.parse(value) as unknown;
		return typeof parsed === "object" && parsed !== null ? (parsed as GoogleAiModeCostPreflightEvidence) : undefined;
	} catch {
		return undefined;
	}
}

export function redactedGoogleAiModeCanaryTerminalReceipt(
	receipt: GoogleAiModeCanaryReceipt,
	persistence?: GoogleAiModeCanaryCapturePersistenceReceipt,
): Record<string, unknown> {
	return persistence ? { ...receipt, snapshotReference: null, persistence } : { ...receipt, snapshotReference: null };
}

export function failedGoogleAiModeCanaryPersistenceReceipt(
	receipt: GoogleAiModeCanaryReceipt,
	reason: "CAPTURE_PERSISTENCE_INPUT_MISSING" | "CAPTURE_PERSISTENCE_FAILED",
): Record<string, unknown> {
	return {
		...receipt,
		status: "OUTCOME_UNKNOWN",
		reason,
		snapshotReference: null,
		persistence: { status: "FAILED", acceptance: "HOLD" },
	};
}

export async function executeGoogleAiModeDatasetCanaryCommand(): Promise<number> {
	const costPreflight = costPreflightEvidence(process.env.SELENA_GOOGLE_AI_MODE_CANARY_COST_PREFLIGHT_JSON);
	const access: ProviderDatasetAccessRequest = {
		mode: "CANARY",
		environment: "ISOLATED_CANARY",
		ownerApproved: process.env.SELENA_GOOGLE_AI_MODE_CANARY_OWNER_APPROVED === "true",
		schemaDiscoveryOnly: true,
		providerCalls: 1,
		recurring: false,
		worstCaseCostUsd:
			typeof costPreflight?.verifiedWorstCaseUsd === "number" ? costPreflight.verifiedWorstCaseUsd : null,
		approvedCostCapUsd: 0.25,
		redactionPolicyApproved: process.env.SELENA_GOOGLE_AI_MODE_CANARY_REDACTION_APPROVED === "true",
	};
	const apiKey = getCredential("BRIGHTDATA_API_TOKEN")?.trim();
	const organizationId = process.env.SELENA_GOOGLE_AI_MODE_CANARY_ORGANIZATION_ID?.trim();
	const projectId = process.env.SELENA_GOOGLE_AI_MODE_CANARY_PROJECT_ID?.trim();
	const result = await runGoogleAiModeOneShotCanary({
		access,
		environment: {
			SELENA_BRIGHTDATA_DATASET_GOOGLE_AI: process.env.SELENA_BRIGHTDATA_DATASET_GOOGLE_AI,
		},
		providerInput: providerInput(process.env.SELENA_GOOGLE_AI_MODE_CANARY_INPUT_JSON),
		transport: apiKey ? createBrightDataGoogleAiModeTransport({ apiKey }) : undefined,
		journal:
			organizationId && projectId
				? createPostgresBrightDataSnapshotJournal({ db, organizationId, projectId })
				: undefined,
		costPreflight,
		reserveOnce:
			organizationId && projectId
				? async () => {
						const reservation = await reserveGoogleAiModeCanaryExecution(db, {
							organizationId,
							projectId,
							executionIdentity: GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
						});
						return reservation.status === "ALREADY_RESERVED"
							? reservation
							: {
									status: "RESERVED" as const,
									reservationReference: `db:${reservation.reservationId}`,
									approvedCapUsd: reservation.approvedCapUsd,
									remainingAuthorizedUsd: reservation.remainingAuthorizedUsd,
								};
					}
				: undefined,
	});
	if (result.receipt.status === "COMPLETE") {
		if (!organizationId || !projectId || !result.capture || !result.prepared) {
			process.stdout.write(
				`${JSON.stringify(
					failedGoogleAiModeCanaryPersistenceReceipt(result.receipt, "CAPTURE_PERSISTENCE_INPUT_MISSING"),
				)}\n`,
			);
			return 1;
		}
		try {
			const persistence = await persistGoogleAiModeCanaryCapture(db, {
				organizationId,
				projectId,
				executionIdentity: GOOGLE_AI_MODE_CANARY_EXECUTION_IDENTITY,
				prepared: result.prepared,
				capture: result.capture,
				receipt: result.receipt,
			});
			process.stdout.write(
				`${JSON.stringify(redactedGoogleAiModeCanaryTerminalReceipt(result.receipt, persistence))}\n`,
			);
			return 0;
		} catch {
			process.stdout.write(
				`${JSON.stringify(failedGoogleAiModeCanaryPersistenceReceipt(result.receipt, "CAPTURE_PERSISTENCE_FAILED"))}\n`,
			);
			return 1;
		}
	}
	process.stdout.write(`${JSON.stringify(redactedGoogleAiModeCanaryTerminalReceipt(result.receipt))}\n`);
	return 1;
}

const isDirectRun = process.argv[1]?.endsWith("/google-ai-mode-dataset-canary.ts");
if (isDirectRun) {
	executeGoogleAiModeDatasetCanaryCommand()
		.then((exitCode) => {
			process.exitCode = exitCode;
		})
		.catch(() => {
			console.error("GOOGLE_AI_MODE_CANARY_COMMAND_FAILED");
			process.exitCode = 1;
		});
}
