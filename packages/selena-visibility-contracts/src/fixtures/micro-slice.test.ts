import { describe, expect, it } from "vitest";
import {
	MICRO_SLICE_CYCLE,
	MICRO_SLICE_FULL,
	MICRO_SLICE_GRID,
	MICRO_SLICE_GRID_POINTS,
	MICRO_SLICE_PARTIAL,
	MICRO_SLICE_SHALLOW,
} from "./micro-slice.js";

describe("micro-slice fixture", () => {
	it("is nine points, indexed row-major from zero", () => {
		expect(MICRO_SLICE_GRID_POINTS).toHaveLength(MICRO_SLICE_CYCLE.expectedObservations);
		expect(MICRO_SLICE_GRID_POINTS.map((point) => point.pointIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
	});

	it("centres on the declared coordinate", () => {
		expect(MICRO_SLICE_GRID_POINTS[4]).toEqual({
			pointIndex: 4,
			latitude: MICRO_SLICE_GRID.centerLatitude,
			longitude: MICRO_SLICE_GRID.centerLongitude,
		});
	});

	// M2 will generate these from the centre and spacing. Restating the rule as
	// a test here means the generator is checked against the fixture rather than
	// the fixture regenerated to match whatever the generator does.
	it("matches the spacing rule the M2 generator must satisfy", () => {
		const latitudeStep = MICRO_SLICE_GRID.spacingMeters / MICRO_SLICE_GRID.metresPerDegreeLatitude;
		const longitudeStep =
			MICRO_SLICE_GRID.spacingMeters /
			(MICRO_SLICE_GRID.metresPerDegreeLatitude * Math.cos((MICRO_SLICE_GRID.centerLatitude * Math.PI) / 180));
		const round = (value: number): number => Math.round(value * 1000000) / 1000000;
		for (const point of MICRO_SLICE_GRID_POINTS) {
			const row = Math.floor(point.pointIndex / MICRO_SLICE_GRID.columns);
			const column = point.pointIndex % MICRO_SLICE_GRID.columns;
			expect(point.latitude).toBe(round(MICRO_SLICE_GRID.centerLatitude + (row - 1) * latitudeStep));
			expect(point.longitude).toBe(round(MICRO_SLICE_GRID.centerLongitude + (column - 1) * longitudeStep));
		}
	});

	it("keeps every coordinate inside six decimals", () => {
		for (const point of MICRO_SLICE_GRID_POINTS) {
			for (const value of [point.latitude, point.longitude]) {
				expect(Number(value.toFixed(6))).toBe(value);
			}
		}
	});

	it("offers a full, a partial and a shallow reading of the same grid", () => {
		expect(MICRO_SLICE_FULL.every((observation) => observation.validity === "VALID")).toBe(true);
		expect(MICRO_SLICE_PARTIAL.filter((observation) => observation.validity !== "VALID")).toHaveLength(2);
		expect(MICRO_SLICE_SHALLOW.every((observation) => observation.captureDepth === 3)).toBe(true);
		for (const set of [MICRO_SLICE_FULL, MICRO_SLICE_PARTIAL, MICRO_SLICE_SHALLOW]) {
			expect(set.map((observation) => observation.pointIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
		}
	});
});
