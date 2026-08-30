import { describe, expect, it } from "vitest";
import { localMapsCsvColumns, serializeLocalMapsCsv } from "./local-maps-export.js";

const ids = {
	cycle: "00000000-0000-4000-8000-000000000001",
	dataset: "00000000-0000-4000-8000-000000000002",
	point: "00000000-0000-4000-8000-000000000003",
	keyword: "00000000-0000-4000-8000-000000000004",
	observation: "00000000-0000-4000-8000-000000000005",
};

const validItem = {
	observationId: ids.observation,
	gridPointId: ids.point,
	pointIndex: 0,
	latitude: -8.5069,
	longitude: 115.2625,
	keywordId: ids.keyword,
	keyword: "restaurant, ubud",
	provider: "maps-serp",
	repeatIndex: 0,
	status: "FOUND" as const,
	targetRank: 2,
	reasonCode: null,
	capturedAt: "2026-08-30T00:00:00.000Z",
	evidenceIds: ["evidence:maps:1", "evidence:maps:2"],
};

describe("source-only Local Maps CSV export", () => {
	it("uses the stable canonical column order", () => {
		const csv = serializeLocalMapsCsv({
			cycleId: ids.cycle,
			datasetId: ids.dataset,
			surface: "LOCAL_MAPS",
			status: "READY",
			items: [validItem],
		});
		expect(csv.split("\n")[0]).toBe(localMapsCsvColumns.join(","));
		expect(localMapsCsvColumns).toEqual([
			"cycle_id",
			"dataset_id",
			"surface",
			"collection_status",
			"observation_id",
			"grid_point_id",
			"point_index",
			"latitude",
			"longitude",
			"keyword_id",
			"keyword",
			"provider",
			"repeat_index",
			"status",
			"target_rank",
			"reason_code",
			"captured_at",
			"evidence_ids",
		]);
	});

	it("quotes commas, quotes, and newlines without changing cell meaning", () => {
		const csv = serializeLocalMapsCsv({
			cycleId: ids.cycle,
			datasetId: ids.dataset,
			surface: "LOCAL_MAPS",
			status: "PARTIAL",
			items: [{ ...validItem, keyword: 'A "special", place\nnear Ubud' }],
		});
		expect(csv).toContain('"A ""special"", place\nnear Ubud"');
		expect(csv).toContain('"[""evidence:maps:1"",""evidence:maps:2""]"');
	});

	it("preserves UNKNOWN outcomes and emits empty cells for null fields", () => {
		const csv = serializeLocalMapsCsv({
			cycleId: ids.cycle,
			datasetId: null,
			surface: "LOCAL_MAPS",
			status: "UNKNOWN",
			items: [
				{
					...validItem,
					observationId: null,
					targetRank: null,
					reasonCode: "SOURCE_PROVENANCE_UNKNOWN",
					capturedAt: null,
					status: "UNKNOWN",
					evidenceIds: [],
				},
			],
		});
		const row = csv.split("\n")[1];
		expect(row).toContain(",,LOCAL_MAPS,UNKNOWN,,");
		expect(row).toContain(",UNKNOWN,,SOURCE_PROVENANCE_UNKNOWN,,[]");
	});

	it("does not export private source references or raw response fields", () => {
		const csv = serializeLocalMapsCsv({
			cycleId: ids.cycle,
			datasetId: ids.dataset,
			surface: "LOCAL_MAPS",
			status: "READY",
			items: [validItem],
		});
		expect(csv).not.toContain("sourceRef");
		expect(csv).not.toContain("rawResponseReference");
		expect(csv).not.toContain("private://");
		expect(csv).not.toContain("https://");
	});

	it("fails closed when an evidence identifier is a private source reference", () => {
		expect(() =>
			serializeLocalMapsCsv({
				cycleId: ids.cycle,
				datasetId: ids.dataset,
				surface: "LOCAL_MAPS",
				status: "READY",
				items: [{ ...validItem, evidenceIds: ["private://object-storage/raw-response"] }],
			}),
		).toThrow("LOCAL_MAPS_CSV_PRIVATE_REFERENCE_FORBIDDEN");
	});

	it("rejects an unbounded collection", () => {
		expect(() =>
			serializeLocalMapsCsv({
				cycleId: ids.cycle,
				datasetId: ids.dataset,
				surface: "LOCAL_MAPS",
				status: "READY",
				items: Array.from({ length: 10_001 }, (_, index) => ({ ...validItem, pointIndex: index })),
			}),
		).toThrow();
	});
});
