// M0 fixture: the smallest local cycle that still exercises the whole chain —
// one location, one keyword, a 3×3 grid, one repeat, nine observations.
//
// The coordinates are frozen constants, not generated. M2 will add the grid
// generator, and its test must reproduce exactly these nine points from the
// centre, spacing and rule below. Deriving the fixture from the generator would
// make it a mirror of the code instead of a check on it.
//
// Rule the generator must satisfy: latitude step = spacing / 111320; longitude
// step = spacing / (111320 × cos(centre latitude)); row-major from the
// south-west corner; both values rounded to six decimals (numeric(9,6)).
//
// The place is a test location, not product configuration: this module is
// deliberately not re-exported from index.ts.

export const MICRO_SLICE_GRID = {
	shape: "SQUARE",
	rows: 3,
	columns: 3,
	spacingMeters: 500,
	centerLatitude: -8.506854,
	centerLongitude: 115.262482,
	metresPerDegreeLatitude: 111320,
	coordinateDecimals: 6,
} as const;

export type MicroSliceGridPoint = { pointIndex: number; latitude: number; longitude: number };

export const MICRO_SLICE_GRID_POINTS: readonly MicroSliceGridPoint[] = [
	{ pointIndex: 0, latitude: -8.511346, longitude: 115.25794 },
	{ pointIndex: 1, latitude: -8.511346, longitude: 115.262482 },
	{ pointIndex: 2, latitude: -8.511346, longitude: 115.267024 },
	{ pointIndex: 3, latitude: -8.506854, longitude: 115.25794 },
	{ pointIndex: 4, latitude: -8.506854, longitude: 115.262482 },
	{ pointIndex: 5, latitude: -8.506854, longitude: 115.267024 },
	{ pointIndex: 6, latitude: -8.502362, longitude: 115.25794 },
	{ pointIndex: 7, latitude: -8.502362, longitude: 115.262482 },
	{ pointIndex: 8, latitude: -8.502362, longitude: 115.267024 },
] as const;

export const MICRO_SLICE_CYCLE = {
	locations: 1,
	keywords: 1,
	repeats: 1,
	providersPerObservation: 1,
	// Twenty because the coverage bands reach Top-20 and a shallower read cannot
	// answer "outside Top-20" at all. It is also what the cycle is billed for:
	// a provider metering in tens charges two units for this depth.
	captureDepth: 20,
	expectedObservations: 9,
} as const;

export const MICRO_SLICE_KEYWORD = "couples massage ubud";
export const MICRO_SLICE_TARGET = "target-entity";

// Inputs only. Expected coverage numbers belong to M2, where the formulas that
// produce them exist; writing them here would be guessing at an answer whose
// rule is not yet in the repository.
export type MicroSliceEntry = { rank: number; entityKey: string };
export type MicroSliceObservation = {
	pointIndex: number;
	validity: "VALID" | "INVALID" | "UNMEASURED";
	captureDepth: number;
	entries: readonly MicroSliceEntry[];
};

/** Every point valid and read deep; the target sits at different ranks. */
export const MICRO_SLICE_FULL: readonly MicroSliceObservation[] = MICRO_SLICE_GRID_POINTS.map((point) => ({
	pointIndex: point.pointIndex,
	validity: "VALID",
	captureDepth: 20,
	entries: [
		{ rank: 1, entityKey: point.pointIndex % 3 === 0 ? MICRO_SLICE_TARGET : "competitor-a" },
		{ rank: 2, entityKey: point.pointIndex % 3 === 1 ? MICRO_SLICE_TARGET : "competitor-b" },
		{ rank: 3, entityKey: point.pointIndex % 3 === 2 ? MICRO_SLICE_TARGET : "competitor-c" },
	],
}));

/** Two points carry no usable reading — they must not count as absence. */
export const MICRO_SLICE_PARTIAL: readonly MicroSliceObservation[] = MICRO_SLICE_FULL.map((observation) => {
	if (observation.pointIndex === 2) return { ...observation, validity: "INVALID", entries: [] };
	if (observation.pointIndex === 5) return { ...observation, validity: "UNMEASURED", entries: [] };
	return observation;
});

/** Valid points read shallower than the bands being asked about. */
export const MICRO_SLICE_SHALLOW: readonly MicroSliceObservation[] = MICRO_SLICE_GRID_POINTS.map((point) => ({
	pointIndex: point.pointIndex,
	validity: "VALID",
	captureDepth: 3,
	entries: point.pointIndex === 4 ? [{ rank: 2, entityKey: MICRO_SLICE_TARGET }] : [{ rank: 1, entityKey: "competitor-a" }],
}));
