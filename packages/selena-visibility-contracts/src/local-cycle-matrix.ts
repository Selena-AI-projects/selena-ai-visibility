import { type LocalCycleRetry, type LocalCycleShape, localCycleCalls, localCycleCost } from "./local-cycle-cost.js";

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

/**
 * Twenty is the methodology's floor, not a preference: the coverage bands go to
 * Top-20, and "outside Top-20" is unanswerable from a shallower read. The table
 * shows it rather than hiding a methodology choice in a default.
 */
export const MATRIX_CAPTURE_DEPTH = 20;

/** The catalog's `one_technical_invalid` policy, stated as a parameter. */
export const MATRIX_RETRY: LocalCycleRetry = { maxRetriesPerObservation: 1, retriesBillable: true };

export const MATRIX_BEGIN = "<!-- local-cycle-matrix:begin -->";
export const MATRIX_END = "<!-- local-cycle-matrix:end -->";

export type LocalCycleMatrixInput = {
	tariffUsdPerCall: number;
	decisionDate: string;
	cycleBudgetCapUsd: number;
};

const money = (value: number): string => `$${value.toFixed(4)}`;
const tariff = (value: number): string => `$${value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}`;

function assertMatrixInput(input: LocalCycleMatrixInput): void {
	if (!Number.isFinite(input.tariffUsdPerCall) || input.tariffUsdPerCall < 0)
		throw new Error("LOCAL_CYCLE_MATRIX_TARIFF_INVALID");
	if (!Number.isFinite(input.cycleBudgetCapUsd) || input.cycleBudgetCapUsd < 0)
		throw new Error("LOCAL_CYCLE_MATRIX_CAP_INVALID");
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.decisionDate))
		throw new Error("LOCAL_CYCLE_MATRIX_DECISION_DATE_INVALID");
}

export function renderLocalCycleMatrix(input: LocalCycleMatrixInput): string {
	assertMatrixInput(input);
	const rows: string[] = [
		`Тариф расчёта: DataForSEO Standard ${tariff(input.tariffUsdPerCall)} за вызов. Решение владельца: ${input.decisionDate}.`,
		"",
		`| Grid | Запросы | Повторы | Глубина | Наблюдения | Вызовы план / worst-case | Единиц на вызов | Стоимость план / worst-case | В капе ${money(input.cycleBudgetCapUsd)} |`,
		"| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |",
	];
	for (const grid of MATRIX_GRIDS) {
		for (const keywords of MATRIX_KEYWORDS) {
			for (const repeats of MATRIX_REPEATS) {
				const shape: LocalCycleShape = {
					gridPoints: grid.gridPoints,
					keywords,
					repeats,
					providersPerObservation: 1,
					captureDepth: MATRIX_CAPTURE_DEPTH,
				};
				const calls = localCycleCalls(shape, MATRIX_RETRY);
				const published = localCycleCost(
					shape,
					{
						currency: "USD",
						pricePerBillableUnit: input.tariffUsdPerCall,
						metering: { kind: "request" },
					},
					MATRIX_RETRY,
				);
				const observations = shape.gridPoints * shape.keywords * shape.repeats;
				const withinCap = published.worstCaseCost <= input.cycleBudgetCapUsd ? "да" : "**нет**";
				rows.push(
					`| ${grid.label} | ${keywords} | ${repeats} | ${MATRIX_CAPTURE_DEPTH} | ${observations} | ${calls.planned} / ${calls.worstCase} | ${published.unitsPerCall} | ${money(published.plannedCost)} / ${money(published.worstCaseCost)} | ${withinCap} |`,
				);
			}
		}
	}
	return rows.join("\n");
}
