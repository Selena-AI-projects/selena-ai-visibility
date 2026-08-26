import { type LocalCycleRetry, type LocalCycleShape, localCycleCalls } from "./local-cycle-cost.js";

// The scenario matrix in docs/selena-visibility/local-cycle-economics.md is
// rendered from here rather than typed by hand: a table of call counts is
// exactly the kind of thing that is wrong by one factor and believed for
// months. A test holds the document to this output.

export const MATRIX_GRIDS = [
	{ label: "3×3", gridPoints: 9 },
	{ label: "5×5", gridPoints: 25 },
	{ label: "7×7", gridPoints: 49 },
] as const;

export const MATRIX_KEYWORDS = [5, 10, 20] as const;
export const MATRIX_REPEATS = [1, 2] as const;

/** The catalog's `one_technical_invalid` policy, stated as a parameter. */
export const MATRIX_RETRY: LocalCycleRetry = { maxRetriesPerObservation: 1, retriesBillable: true };

export const MATRIX_BEGIN = "<!-- local-cycle-matrix:begin -->";
export const MATRIX_END = "<!-- local-cycle-matrix:end -->";

/** Placeholder left for the owner's tariff; never a number. */
const TARIFF_PLACEHOLDER = "`<tariff>`";

export function renderLocalCycleMatrix(): string {
	const rows: string[] = [
		"| Grid | Запросы | Повторы | Наблюдения | Вызовы плановые | Вызовы worst-case | Стоимость плановая | Стоимость worst-case |",
		"| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
	];
	for (const grid of MATRIX_GRIDS) {
		for (const keywords of MATRIX_KEYWORDS) {
			for (const repeats of MATRIX_REPEATS) {
				const shape: LocalCycleShape = {
					gridPoints: grid.gridPoints,
					keywords,
					repeats,
					providersPerObservation: 1,
				};
				const calls = localCycleCalls(shape, MATRIX_RETRY);
				const observations = shape.gridPoints * shape.keywords * shape.repeats;
				rows.push(
					`| ${grid.label} | ${keywords} | ${repeats} | ${observations} | ${calls.planned} | ${calls.worstCase} | ${TARIFF_PLACEHOLDER} | ${TARIFF_PLACEHOLDER} |`,
				);
			}
		}
	}
	return rows.join("\n");
}
