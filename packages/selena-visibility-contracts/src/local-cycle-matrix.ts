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

/** The catalog's `one_technical_invalid` policy, stated as a parameter. */
export const MATRIX_RETRY: LocalCycleRetry = { maxRetriesPerObservation: 1, retriesBillable: true };

export const MATRIX_BEGIN = "<!-- local-cycle-matrix:begin -->";
export const MATRIX_END = "<!-- local-cycle-matrix:end -->";

/**
 * The vendor's published list price, not a figure from an invoice. It lives
 * here rather than in the calculator on purpose: the calculator must stay
 * price-free (a test enforces that), while a document may quote a public price
 * as long as it says where the number came from and stays unverified until an
 * invoice says otherwise.
 */
export const PUBLISHED_DATAFORSEO_STANDARD_USD = 0.0006;
export const PUBLISHED_PRICE_CAVEAT = "опубликованный прайс, не сверено со счётом";

/** The account's real tariff is unknown until the first invoice is read. */
const ACTUAL_TARIFF_UNKNOWN = "—";

const money = (value: number): string => `$${value.toFixed(4)}`;

export function renderLocalCycleMatrix(): string {
	const rows: string[] = [
		`| Grid | Запросы | Повторы | Наблюдения | Вызовы плановые | Вызовы worst-case | DataForSEO Standard $${PUBLISHED_DATAFORSEO_STANDARD_USD}, план / worst-case | Фактический тариф аккаунта |`,
		"| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
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
				const published = localCycleCost(
					shape,
					{ currency: "USD", pricePerProviderCall: PUBLISHED_DATAFORSEO_STANDARD_USD },
					MATRIX_RETRY,
				);
				const observations = shape.gridPoints * shape.keywords * shape.repeats;
				rows.push(
					`| ${grid.label} | ${keywords} | ${repeats} | ${observations} | ${calls.planned} | ${calls.worstCase} | ${money(published.plannedCost)} / ${money(published.worstCaseCost)} | ${ACTUAL_TARIFF_UNKNOWN} |`,
				);
			}
		}
	}
	return rows.join("\n");
}
