import { describe, expect, it } from "vitest";
import { assessAttribution } from "./evidence-loop";
import {
	aggregateOutcomeLocations,
	buildOutcomeAttributionInput,
	compareOutcomeObservations,
	OUTCOME_EXPORT_SIGNATURE_VERSION,
	type OutcomeExportPayload,
	type OutcomeObservation,
	outcomeMetricDefinitionSchema,
	outcomeObservationSchema,
	outcomeSourceSchema,
	signOutcomeExport,
	verifyOutcomeExport,
} from "./outcome-layer";

const ids = {
	project: "11111111-1111-4111-8111-111111111111",
	locationA: "22222222-2222-4222-8222-222222222222",
	locationB: "33333333-3333-4333-8333-333333333333",
	source: "44444444-4444-4444-8444-444444444444",
	baseline: "55555555-5555-4555-8555-555555555555",
	verification: "66666666-6666-4666-8666-666666666666",
	cycle: "77777777-7777-4777-8777-777777777777",
	dataset: "88888888-8888-4888-8888-888888888888",
};

function observation(overrides: Partial<OutcomeObservation> = {}): OutcomeObservation {
	return {
		id: ids.baseline,
		organizationId: "tenant-a",
		projectId: ids.project,
		locationId: ids.locationA,
		sourceId: ids.source,
		sourceAccessClass: "UPLOADED",
		measurementCycleId: ids.cycle,
		datasetId: ids.dataset,
		metricKey: "qualified_leads",
		metricVersion: 1,
		value: 10,
		periodStart: "2026-08-01T00:00:00.000Z",
		periodEnd: "2026-09-01T00:00:00.000Z",
		evidenceIds: ["upload:baseline"],
		...overrides,
	};
}

function attributionContext() {
	return {
		baselineCycleId: "baseline-cycle",
		verificationCycleId: "verification-cycle",
		cyclesCompatible: true,
		chainComplete: true,
		changeEvents: [{ actionId: "action-1", changeType: "CONTENT", verification: "EVIDENCED" as const }],
		verificationCompleted: true,
		settled: true,
		minimumDetectableChange: 1,
		beforeSampleSize: 1,
		afterSampleSize: 1,
		minimumSampleSize: 1,
		externalFactors: [] as string[],
	};
}

describe("Visibility OS Outcome contracts", () => {
	it("accepts only connected or uploaded evidence and requires metric units", () => {
		const source = {
			id: ids.source,
			organizationId: "tenant-a",
			projectId: ids.project,
			locationId: ids.locationA,
			accessClass: "UPLOADED",
			sourceReference: "upload://qualified-leads.csv",
			evidenceIds: ["upload:manifest"],
		};
		expect(outcomeSourceSchema.safeParse(source).success).toBe(true);
		expect(outcomeSourceSchema.safeParse({ ...source, accessClass: "PUBLIC" }).success).toBe(false);
		expect(
			outcomeMetricDefinitionSchema.safeParse({
				metricKey: "qualified_leads",
				version: 1,
				unit: "",
				aggregation: "SUM",
			}).success,
		).toBe(false);
	});

	it("preserves null as UNKNOWN and never coerces it to zero", () => {
		const baseline = observation({ value: null });
		const verification = observation({
			id: ids.verification,
			value: 12,
			periodStart: "2026-09-01T00:00:00.000Z",
			periodEnd: "2026-10-01T00:00:00.000Z",
			evidenceIds: ["upload:verification"],
		});
		expect(outcomeObservationSchema.parse(baseline).value).toBeNull();
		expect(compareOutcomeObservations(baseline, verification)).toMatchObject({
			compatible: true,
			known: false,
			before: null,
			after: 12,
		});
		expect(assessAttribution(buildOutcomeAttributionInput(baseline, verification, attributionContext()))).toMatchObject(
			{ verdict: "NOT_MEASURED", confidence: "UNKNOWN", delta: null },
		);
	});

	it("feeds Outcome values into the existing non-causal rule order", () => {
		const verification = observation({
			id: ids.verification,
			value: 14,
			periodStart: "2026-09-01T00:00:00.000Z",
			periodEnd: "2026-10-01T00:00:00.000Z",
			evidenceIds: ["upload:verification"],
		});
		const input = buildOutcomeAttributionInput(observation(), verification, {
			...attributionContext(),
			evidenceIds: ["change:evidence"],
		});
		expect(assessAttribution(input)).toEqual({
			verdict: "POSITIVE_CORRELATION",
			confidence: "HIGH",
			reasonCodes: ["POSITIVE_DELTA"],
			evidenceIds: ["change:evidence", "upload:baseline", "upload:verification"],
			delta: 4,
		});
		expect(
			assessAttribution({
				...input,
				changeEvents: [...input.changeEvents, { actionId: null, changeType: "ADS", verification: "DECLARED" }],
			}).verdict,
		).toBe("CONFOUNDED");
	});

	it("rejects cross-location and overlapping pairs before attribution", () => {
		expect(
			compareOutcomeObservations(
				observation(),
				observation({
					id: ids.verification,
					locationId: ids.locationB,
					periodStart: "2026-08-15T00:00:00.000Z",
					periodEnd: "2026-09-15T00:00:00.000Z",
				}),
			),
		).toMatchObject({ compatible: false, reasons: ["LOCATION_MISMATCH", "PERIODS_OVERLAP"] });
	});

	it("reproduces an organization sum only from its exact permitted location set", () => {
		const base = {
			organizationId: "tenant-a",
			projectId: ids.project,
			metricKey: "qualified_leads",
			metricVersion: 1,
			unit: "lead",
			periodStart: "2026-09-01T00:00:00.000Z",
			periodEnd: "2026-10-01T00:00:00.000Z",
		};
		const rows = [
			{ ...base, locationId: ids.locationA, value: 4, evidenceIds: ["location:a"] },
			{ ...base, locationId: ids.locationB, value: 6, evidenceIds: ["location:b"] },
		];
		expect(aggregateOutcomeLocations(rows, [ids.locationA, ids.locationB])).toEqual({
			status: "MEASURED",
			value: 10,
			locationIds: [ids.locationA, ids.locationB],
			evidenceIds: ["location:a", "location:b"],
			reasons: [],
		});
		expect(aggregateOutcomeLocations(rows, [ids.locationA])).toMatchObject({
			status: "UNKNOWN",
			value: null,
			reasons: ["LOCATION_NOT_PERMITTED"],
		});
		expect(
			aggregateOutcomeLocations([{ ...rows[0], value: null }, rows[1]], [ids.locationA, ids.locationB]),
		).toMatchObject({
			status: "UNKNOWN",
			value: null,
			reasons: ["OUTCOME_VALUE_UNKNOWN"],
		});
	});

	it("binds the location ID into signed exports", async () => {
		const payload: OutcomeExportPayload = {
			signatureVersion: OUTCOME_EXPORT_SIGNATURE_VERSION,
			organizationId: "tenant-a",
			projectId: ids.project,
			locationId: ids.locationA,
			datasetId: ids.dataset,
			metricKey: "qualified_leads",
			metricVersion: 1,
			periodStart: "2026-09-01T00:00:00.000Z",
			periodEnd: "2026-10-01T00:00:00.000Z",
			observationIds: [ids.verification],
		};
		const scope = { organizationId: "tenant-a", projectId: ids.project, locationId: ids.locationA };
		const signature = await signOutcomeExport(payload, "repository-only-test-secret");
		expect(await verifyOutcomeExport(payload, signature, "repository-only-test-secret", scope)).toBe(true);
		expect(
			await verifyOutcomeExport({ ...payload, locationId: ids.locationB }, signature, "repository-only-test-secret", {
				...scope,
				locationId: ids.locationB,
			}),
		).toBe(false);
		expect(
			await verifyOutcomeExport(payload, signature, "repository-only-test-secret", {
				...scope,
				locationId: ids.locationB,
			}),
		).toBe(false);
	});
});
