import { MICRO_SLICE_FULL, MICRO_SLICE_PARTIAL, MICRO_SLICE_SHALLOW, MICRO_SLICE_TARGET } from "./micro-slice.js";

export const LOCAL_COVERAGE_FIXTURE_V1 = {
	formulaVersion: "local-coverage/1",
	targetEntityKey: MICRO_SLICE_TARGET,
	full: MICRO_SLICE_FULL,
	partial: MICRO_SLICE_PARTIAL,
	shallow: MICRO_SLICE_SHALLOW,
} as const;

export const LOCAL_COVERAGE_EXPECTED_V1 = {
	full: {
		top3: 1,
		top10: 1,
		top20: 1,
		outsideTop20: 0,
		averageRank: 2,
		foundShare: 1,
		shareOfLocalVoiceAt3: 1 / 3,
	},
	partial: {
		top3: 1,
		averageRank: 12 / 7,
		foundShare: 1,
	},
	shallow: {
		top3: 1 / 9,
		top10: 1,
		top20: 1,
		shareOfLocalVoiceAt3: 1 / 9,
		shareOfLocalVoiceAt10: null,
	},
} as const;
