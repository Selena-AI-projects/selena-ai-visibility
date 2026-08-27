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
 * Top-20, and "outside Top-20" is unanswerable from a shallower read. It costs
 * real money — two billable units per call at DataForSEO's block of ten — so the
 * table shows it rather than hiding it in a default.
 */
export const MATRIX_CAPTURE_DEPTH = 20;

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
/**
 * Verified against the account's own exported rate card, not a published list
 * price: `serp / task_post` bills $0.0006 per request on the normal queue with
 * no per-result component, so depth does not multiply the charge.
 */
export const ACCOUNT_METERING = { kind: "request" } as const;
export const PRICE_SOURCE = "прайс-лист аккаунта, экспорт из кабинета";

/** Owner decision recorded in local-cycle-economics.md. */
export const CYCLE_BUDGET_CAP_USD = 3;

const money = (value: number): string => `$${value.toFixed(4)}`;

export function renderLocalCycleMatrix(): string {
	const rows: string[] = [
		`| Grid | Запросы | Повторы | Глубина | Наблюдения | Вызовы план / worst-case | Единиц на вызов | DataForSEO Standard $${PUBLISHED_DATAFORSEO_STANDARD_USD}/запрос, план / worst-case | В капе $${CYCLE_BUDGET_CAP_USD} |`,
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
						pricePerBillableUnit: PUBLISHED_DATAFORSEO_STANDARD_USD,
						metering: ACCOUNT_METERING,
					},
					MATRIX_RETRY,
				);
				const observations = shape.gridPoints * shape.keywords * shape.repeats;
				const withinCap = published.worstCaseCost <= CYCLE_BUDGET_CAP_USD ? "да" : "**нет**";
				rows.push(
					`| ${grid.label} | ${keywords} | ${repeats} | ${MATRIX_CAPTURE_DEPTH} | ${observations} | ${calls.planned} / ${calls.worstCase} | ${published.unitsPerCall} | ${money(published.plannedCost)} / ${money(published.worstCaseCost)} | ${withinCap} |`,
				);
			}
		}
	}
	return rows.join("\n");
}
