import { describe, expect, it } from "vitest";
import {
	customerVisibleHorecaModules,
	HORECA_READ_MODEL_VERSION,
	horecaLocalFirstReadModelSchema,
	horecaModuleReadModelSchema,
} from "./horeca-read-model.js";

const unknownModule = {
	moduleId: "LOCAL_MAPS" as const,
	state: "UNKNOWN" as const,
	label: "Maps & local search",
	summary: {
		kind: "UNKNOWN" as const,
		numerator: null,
		denominator: null,
		invalidCount: 0,
		reason: "No accepted local dataset is available.",
	},
	evidenceIds: [],
	configurationLockReference: null,
	limitations: ["Readiness is not visibility."],
};

function readModel() {
	return {
		schemaVersion: HORECA_READ_MODEL_VERSION,
		generatedAt: "2026-08-31T05:00:00.000Z",
		project: { displayName: "Pilot restaurant", businessType: "RESTAURANT" as const, phase: "ACTIVE" as const },
		navigation: ["OVERVIEW", "VISIBILITY", "EVIDENCE", "COMPETITORS", "ACTIONS", "OUTCOMES"] as const,
		modules: [unknownModule],
		evidence: [
			{
				id: "evidence-1",
				domain: "ENTITY" as const,
				accessClass: "PUBLIC" as const,
				sourceLabel: "Official business page",
				capturedAt: "2026-08-31T04:00:00.000Z",
				sourceReference: "https://example.com/business",
				snapshotReference: "snapshot:evidence-1",
				acceptance: { status: "ACCEPTED" as const, acceptedAt: "2026-08-31T04:30:00.000Z" },
			},
		],
		findings: [
			{
				id: "finding-1",
				area: "EVIDENCE" as const,
				statement: "The official source was captured.",
				status: "OBSERVED" as const,
				evidenceIds: ["evidence-1"],
			},
		],
		competitors: [],
		actions: [
			{
				id: "action-1",
				findingIds: ["finding-1"],
				action: "Verify the location facts.",
				owner: "Business owner",
				priority: "NOW" as const,
				status: "PROPOSED" as const,
				evidenceIds: ["evidence-1"],
				verificationPlan: "Re-capture the official source after confirmation.",
			},
		],
		outcomes: [
			{
				id: "outcome-1",
				level: "READINESS" as const,
				statement: "Outcome data has not been connected.",
				status: "UNKNOWN" as const,
				evidenceIds: [],
				integrationProofReference: null,
			},
		],
	};
}

describe("HoReCa local-first read model", () => {
	it("keeps unavailable visibility UNKNOWN without a zero denominator", () => {
		const parsed = horecaModuleReadModelSchema.parse(unknownModule);
		expect(parsed.summary).toEqual(expect.objectContaining({ kind: "UNKNOWN", numerator: null, denominator: null }));
	});

	it("rejects CONFIGURED_ONLY and composite scores from the customer contract", () => {
		expect(() => horecaModuleReadModelSchema.parse({ ...unknownModule, state: "CONFIGURED_ONLY" })).toThrow();
		expect(() => horecaLocalFirstReadModelSchema.parse({ ...readModel(), compositeScore: 72 })).toThrow();
	});

	it("requires every published finding and action to resolve to evidence", () => {
		expect(() =>
			horecaLocalFirstReadModelSchema.parse({
				...readModel(),
				actions: [{ ...readModel().actions[0], evidenceIds: ["missing-evidence"] }],
			}),
		).toThrow("HORECA_EVIDENCE_REFERENCE_MISSING");
	});

	it("requires integration proof before an outcome can be labelled attributed", () => {
		expect(() =>
			horecaLocalFirstReadModelSchema.parse({
				...readModel(),
				outcomes: [
					{
						...readModel().outcomes[0],
						level: "ATTRIBUTED",
						status: "MEASURED",
						evidenceIds: ["evidence-1"],
					},
				],
			}),
		).toThrow("HORECA_ATTRIBUTED_OUTCOME_REQUIRES_INTEGRATION_PROOF");
	});

	it("requires evidence and a Configuration Lock for measured module shares", () => {
		expect(() =>
			horecaModuleReadModelSchema.parse({
				...unknownModule,
				state: "ACTIVE",
				summary: {
					kind: "MEASURED_SHARE",
					sampleBasis: "ACCEPTED_ONLY",
					numerator: 3,
					denominator: 5,
					invalidCount: 1,
					capturedAt: "2026-08-31T05:00:00.000Z",
					datasetVersion: "dataset-v1",
				},
			}),
		).toThrow("HORECA_MEASURED_MODULE_REQUIRES_EVIDENCE_AND_LOCK");
	});

	it("requires accepted-only sample semantics and accepted evidence receipts", () => {
		expect(() =>
			horecaModuleReadModelSchema.parse({
				...unknownModule,
				state: "ACTIVE",
				evidenceIds: ["evidence-1"],
				configurationLockReference: "lock-1",
				summary: {
					kind: "MEASURED_SHARE",
					numerator: 1,
					denominator: 2,
					invalidCount: 0,
					capturedAt: "2026-08-31T05:00:00.000Z",
					datasetVersion: "dataset-v1",
				},
			}),
		).toThrow();
		const evidenceWithoutAcceptance = {
			...readModel(),
			evidence: [{ ...readModel().evidence[0], acceptance: undefined }],
		};
		expect(() => horecaLocalFirstReadModelSchema.parse(evidenceWithoutAcceptance)).toThrow();
		expect(() =>
			horecaLocalFirstReadModelSchema.parse({
				...readModel(),
				evidence: [
					{
						...readModel().evidence[0],
						acceptance: { status: "ACCEPTED", acceptedAt: "2026-08-31T03:59:59.000Z" },
					},
				],
			}),
		).toThrow("HORECA_EVIDENCE_ACCEPTANCE_PRECEDES_CAPTURE");
	});

	it("rejects post-opening visibility measurements for a pre-opening project", () => {
		for (const state of ["ACTIVE", "PILOT"] as const) {
			expect(() =>
				horecaLocalFirstReadModelSchema.parse({
					...readModel(),
					project: { ...readModel().project, phase: "PRE_OPENING" },
					modules: [
						{
							...unknownModule,
							state,
							evidenceIds: ["evidence-1"],
							configurationLockReference: "lock-1",
							summary: {
								kind: "MEASURED_SHARE",
								sampleBasis: "ACCEPTED_ONLY",
								numerator: 1,
								denominator: 2,
								invalidCount: 0,
								capturedAt: "2026-08-31T05:00:00.000Z",
								datasetVersion: "dataset-v1",
							},
						},
					],
				}),
			).toThrow("HORECA_PRE_OPENING_MEASUREMENT_FORBIDDEN");
		}
	});

	it("hides modules explicitly marked HIDDEN without upgrading other states", () => {
		const visible = customerVisibleHorecaModules([
			unknownModule,
			{ ...unknownModule, moduleId: "TRAVEL", state: "HIDDEN" },
		]);
		expect(visible).toEqual([unknownModule]);
	});

	it("rejects Social or Travel records while their customer modules are hidden", () => {
		expect(() =>
			horecaLocalFirstReadModelSchema.parse({
				...readModel(),
				modules: [...readModel().modules, { ...unknownModule, moduleId: "SOCIAL", state: "HIDDEN" }],
				evidence: [{ ...readModel().evidence[0], domain: "SOCIAL" }],
			}),
		).toThrow("HORECA_HIDDEN_MODULE_DATA_FORBIDDEN");
		expect(() =>
			horecaLocalFirstReadModelSchema.parse({
				...readModel(),
				modules: [...readModel().modules, { ...unknownModule, moduleId: "TRAVEL", state: "HIDDEN" }],
				competitors: [
					{
						id: "competitor-travel",
						competitorLabel: "Travel fixture",
						surface: "TRAVEL",
						reason: "Fixture only.",
						evidenceIds: ["evidence-1"],
					},
				],
			}),
		).toThrow("HORECA_HIDDEN_MODULE_DATA_FORBIDDEN");
	});
});
