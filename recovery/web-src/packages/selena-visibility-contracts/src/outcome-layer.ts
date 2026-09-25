import { z } from "zod";
import type { AttributionInput } from "./evidence-loop.js";

export const outcomeSourceAccessClasses = ["CONNECTED", "UPLOADED"] as const;
export type OutcomeSourceAccessClass = (typeof outcomeSourceAccessClasses)[number];

const outcomeScopeSchema = z.strictObject({
	organizationId: z.string().trim().min(1),
	projectId: z.string().uuid(),
	locationId: z.string().uuid(),
});

export const outcomeSourceSchema = outcomeScopeSchema.extend({
	id: z.string().uuid(),
	accessClass: z.enum(outcomeSourceAccessClasses),
	sourceReference: z.string().trim().min(1),
	evidenceIds: z.array(z.string().trim().min(1)).min(1),
});
export type OutcomeSource = z.infer<typeof outcomeSourceSchema>;

export const outcomeMetricDefinitionSchema = z.strictObject({
	metricKey: z.string().trim().min(1),
	version: z.number().int().positive(),
	unit: z.string().trim().min(1),
	aggregation: z.literal("SUM"),
});
export type OutcomeMetricDefinition = z.infer<typeof outcomeMetricDefinitionSchema>;

export const outcomeObservationSchema = outcomeScopeSchema
	.extend({
		id: z.string().uuid(),
		sourceId: z.string().uuid(),
		sourceAccessClass: z.enum(outcomeSourceAccessClasses),
		measurementCycleId: z.string().uuid(),
		datasetId: z.string().uuid(),
		metricKey: z.string().trim().min(1),
		metricVersion: z.number().int().positive(),
		value: z.number().finite().nullable(),
		periodStart: z.iso.datetime(),
		periodEnd: z.iso.datetime(),
		evidenceIds: z.array(z.string().trim().min(1)).min(1),
	})
	.refine((value) => Date.parse(value.periodEnd) > Date.parse(value.periodStart), {
		message: "OUTCOME_PERIOD_INVALID",
	});
export type OutcomeObservation = z.infer<typeof outcomeObservationSchema>;

export type OutcomePairComparison = {
	compatible: boolean;
	known: boolean;
	before: number | null;
	after: number | null;
	reasons: string[];
	evidenceIds: string[];
};

export function compareOutcomeObservations(
	baselineInput: OutcomeObservation,
	verificationInput: OutcomeObservation,
): OutcomePairComparison {
	const baseline = outcomeObservationSchema.parse(baselineInput);
	const verification = outcomeObservationSchema.parse(verificationInput);
	const reasons: string[] = [];
	const pairs: ReadonlyArray<readonly [string, unknown, unknown]> = [
		["ORGANIZATION_MISMATCH", baseline.organizationId, verification.organizationId],
		["PROJECT_MISMATCH", baseline.projectId, verification.projectId],
		["LOCATION_MISMATCH", baseline.locationId, verification.locationId],
		["SOURCE_MISMATCH", baseline.sourceId, verification.sourceId],
		["ACCESS_CLASS_MISMATCH", baseline.sourceAccessClass, verification.sourceAccessClass],
		["METRIC_MISMATCH", baseline.metricKey, verification.metricKey],
		["METRIC_VERSION_MISMATCH", baseline.metricVersion, verification.metricVersion],
	];
	for (const [reason, before, after] of pairs) if (before !== after) reasons.push(reason);
	if (baseline.id === verification.id) reasons.push("OBSERVATION_PAIR_IDENTICAL");
	if (Date.parse(baseline.periodEnd) > Date.parse(verification.periodStart)) reasons.push("PERIODS_OVERLAP");

	return {
		compatible: reasons.length === 0,
		known: baseline.value !== null && verification.value !== null,
		before: baseline.value,
		after: verification.value,
		reasons,
		evidenceIds: [...new Set([...baseline.evidenceIds, ...verification.evidenceIds])].sort(),
	};
}

export type OutcomeAttributionContext = Omit<
	AttributionInput,
	"beforeValues" | "afterValues" | "cyclesCompatible" | "evidenceIds"
> & {
	cyclesCompatible: boolean;
	evidenceIds?: readonly string[];
};

export function buildOutcomeAttributionInput(
	baseline: OutcomeObservation,
	verification: OutcomeObservation,
	context: OutcomeAttributionContext,
): AttributionInput {
	const pair = compareOutcomeObservations(baseline, verification);
	return {
		...context,
		beforeValues: [pair.before],
		afterValues: [pair.after],
		cyclesCompatible: context.cyclesCompatible && pair.compatible,
		evidenceIds: [...new Set([...pair.evidenceIds, ...(context.evidenceIds ?? [])])].sort(),
	};
}

const aggregateRowSchema = outcomeScopeSchema
	.extend({
		metricKey: z.string().trim().min(1),
		metricVersion: z.number().int().positive(),
		unit: z.string().trim().min(1),
		periodStart: z.iso.datetime(),
		periodEnd: z.iso.datetime(),
		value: z.number().finite().nullable(),
		evidenceIds: z.array(z.string().trim().min(1)).min(1),
	})
	.refine((value) => Date.parse(value.periodEnd) > Date.parse(value.periodStart), {
		message: "OUTCOME_PERIOD_INVALID",
	});
export type OutcomeAggregateRow = z.infer<typeof aggregateRowSchema>;

export type OutcomeOrganizationAggregate =
	| { status: "MEASURED"; value: number; locationIds: string[]; evidenceIds: string[]; reasons: [] }
	| { status: "UNKNOWN"; value: null; locationIds: string[]; evidenceIds: string[]; reasons: string[] };

export function aggregateOutcomeLocations(
	rowInputs: readonly OutcomeAggregateRow[],
	permittedLocationIds: readonly string[],
): OutcomeOrganizationAggregate {
	const rows = rowInputs.map((row) => aggregateRowSchema.parse(row));
	const permitted = [...new Set(permittedLocationIds)].sort();
	const reasons: string[] = [];
	if (permitted.length === 0 || rows.length === 0) reasons.push("LOCATION_SET_EMPTY");
	const locationIds = rows.map((row) => row.locationId).sort();
	if (new Set(locationIds).size !== locationIds.length) reasons.push("LOCATION_DUPLICATED");
	if (locationIds.some((id) => !permitted.includes(id))) reasons.push("LOCATION_NOT_PERMITTED");
	if (permitted.some((id) => !locationIds.includes(id))) reasons.push("LOCATION_SET_INCOMPLETE");

	const first = rows[0];
	for (const row of rows.slice(1)) {
		if (row.organizationId !== first?.organizationId) reasons.push("ORGANIZATION_MISMATCH");
		if (row.projectId !== first?.projectId) reasons.push("PROJECT_MISMATCH");
		if (row.metricKey !== first?.metricKey) reasons.push("METRIC_MISMATCH");
		if (row.metricVersion !== first?.metricVersion) reasons.push("METRIC_VERSION_MISMATCH");
		if (row.unit !== first?.unit) reasons.push("UNIT_MISMATCH");
		if (row.periodStart !== first?.periodStart || row.periodEnd !== first?.periodEnd) reasons.push("PERIOD_MISMATCH");
	}
	if (rows.some((row) => row.value === null)) reasons.push("OUTCOME_VALUE_UNKNOWN");
	const evidenceIds = [...new Set(rows.flatMap((row) => row.evidenceIds))].sort();
	const distinctReasons = [...new Set(reasons)];
	if (distinctReasons.length > 0) {
		return { status: "UNKNOWN", value: null, locationIds, evidenceIds, reasons: distinctReasons };
	}
	return {
		status: "MEASURED",
		value: rows.reduce((sum, row) => sum + (row.value ?? 0), 0),
		locationIds,
		evidenceIds,
		reasons: [],
	};
}

export const OUTCOME_EXPORT_SIGNATURE_VERSION = "outcome-export/1" as const;
export const outcomeExportPayloadSchema = outcomeScopeSchema.extend({
	signatureVersion: z.literal(OUTCOME_EXPORT_SIGNATURE_VERSION),
	datasetId: z.string().uuid(),
	metricKey: z.string().trim().min(1),
	metricVersion: z.number().int().positive(),
	periodStart: z.iso.datetime(),
	periodEnd: z.iso.datetime(),
	observationIds: z.array(z.string().uuid()).min(1),
});
export type OutcomeExportPayload = z.infer<typeof outcomeExportPayloadSchema>;

function canonicalOutcomeExport(payloadInput: OutcomeExportPayload): string {
	const payload = outcomeExportPayloadSchema.parse(payloadInput);
	return JSON.stringify({
		signatureVersion: payload.signatureVersion,
		organizationId: payload.organizationId,
		projectId: payload.projectId,
		locationId: payload.locationId,
		datasetId: payload.datasetId,
		metricKey: payload.metricKey,
		metricVersion: payload.metricVersion,
		periodStart: payload.periodStart,
		periodEnd: payload.periodEnd,
		observationIds: [...payload.observationIds].sort(),
	});
}

async function outcomeExportDigest(payload: OutcomeExportPayload, secret: string): Promise<string> {
	if (!secret) throw new Error("OUTCOME_EXPORT_SECRET_REQUIRED");
	const key = await globalThis.crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const digest = new Uint8Array(
		await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalOutcomeExport(payload))),
	);
	return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signOutcomeExport(payload: OutcomeExportPayload, secret: string): Promise<string> {
	return `sha256=${await outcomeExportDigest(payload, secret)}`;
}

export async function verifyOutcomeExport(
	payload: OutcomeExportPayload,
	signature: string,
	secret: string,
	expectedScope: Pick<OutcomeExportPayload, "organizationId" | "projectId" | "locationId">,
): Promise<boolean> {
	if (!signature || !secret) return false;
	const parsed = outcomeExportPayloadSchema.safeParse(payload);
	if (!parsed.success) return false;
	if (
		parsed.data.organizationId !== expectedScope.organizationId ||
		parsed.data.projectId !== expectedScope.projectId ||
		parsed.data.locationId !== expectedScope.locationId
	)
		return false;
	const actual = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
	const expected = await outcomeExportDigest(parsed.data, secret);
	if (actual.length !== expected.length) return false;
	let difference = 0;
	for (let index = 0; index < expected.length; index += 1) {
		difference |= expected.charCodeAt(index) ^ (actual.charCodeAt(index) || 0);
	}
	return difference === 0;
}
