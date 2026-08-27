// M0: what one local measurement cycle costs, before any schema exists.
//
// A grid multiplies every keyword and every repeat, so the ceiling that
// protects the AI domain is not enough here — the number this module produces
// is what the owner chooses the grid ceiling from, and that ceiling is written
// into the M2 table constraints.
//
// The price is always a parameter. This module contains no tariff, no currency
// amount and no fractional literal at all: a number that looks like a price and
// lives in the repository will eventually be believed by someone.
//
// The billing unit is a parameter for the same reason. Providers meter in
// blocks of results rather than per call — DataForSEO in tens — so a model that
// prices calls silently halves the cost of a cycle that reads twenty deep.

export type LocalCycleShape = {
	gridPoints: number;
	keywords: number;
	repeats: number;
	/** Usually one. A second provider over the same grid doubles the calls. */
	providersPerObservation: number;
	/**
	 * How many ranked results each observation reads. It belongs in the shape
	 * rather than in a default because it is a methodology choice with a price:
	 * "outside Top-20" is unanswerable below depth 20, and providers that meter
	 * in blocks of results charge twice for reading twice as deep.
	 */
	captureDepth: number;
};

export type LocalCycleTariff = {
	currency: "USD";
	/**
	 * Price of one billable unit — not of one call. A provider that meters in
	 * blocks of results bills a deep read as several units, so pricing per call
	 * would understate a deep cycle by exactly the block multiple.
	 */
	pricePerBillableUnit: number;
	/** Results covered by one billable unit. DataForSEO meters in tens. */
	resultsPerBillableUnit: number;
	/** Some providers bill a floor per request; absent means no floor. */
	minimumBillableUnits?: number;
};

export type LocalCycleRetry = {
	maxRetriesPerObservation: number;
	retriesBillable: boolean;
};

export type LocalCycleCalls = { planned: number; worstCase: number };

export type LocalCycleCost = {
	currency: "USD";
	plannedCalls: number;
	worstCaseCalls: number;
	/** Billable units one call consumes at this capture depth. */
	unitsPerCall: number;
	plannedUnits: number;
	worstCaseUnits: number;
	/** What the provider bills after any floor is applied. */
	billedPlannedUnits: number;
	billedWorstCaseUnits: number;
	plannedCost: number;
	worstCaseCost: number;
	breakdown: {
		gridPoints: number;
		keywords: number;
		repeats: number;
		providersPerObservation: number;
		captureDepth: number;
		maxRetriesPerObservation: number;
		retriesBillable: boolean;
		pricePerBillableUnit: number;
		resultsPerBillableUnit: number;
		minimumBillableUnits: number | null;
	};
};

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;
const isNonNegativeInteger = (value: number): boolean => Number.isInteger(value) && value >= 0;

// Money is compared and stored at the precision the cost ledger already uses
// (numeric(12,6)), so rounding happens once, here, rather than differently in
// every caller.
const COST_SCALE = 1000000;
const roundCost = (value: number): number => Math.round(value * COST_SCALE) / COST_SCALE;

function assertShape(shape: LocalCycleShape): void {
	const axes = [shape.gridPoints, shape.keywords, shape.repeats, shape.providersPerObservation, shape.captureDepth];
	if (!axes.every(isPositiveInteger)) throw new Error("LOCAL_CYCLE_SHAPE_INVALID");
}

function assertTariff(tariff: LocalCycleTariff): void {
	if (tariff.currency !== "USD") throw new Error("LOCAL_CYCLE_TARIFF_INVALID");
	if (!Number.isFinite(tariff.pricePerBillableUnit) || tariff.pricePerBillableUnit < 0)
		throw new Error("LOCAL_CYCLE_TARIFF_INVALID");
	if (!isPositiveInteger(tariff.resultsPerBillableUnit)) throw new Error("LOCAL_CYCLE_TARIFF_INVALID");
	if (tariff.minimumBillableUnits !== undefined && !isNonNegativeInteger(tariff.minimumBillableUnits))
		throw new Error("LOCAL_CYCLE_TARIFF_INVALID");
}

function assertRetry(retry: LocalCycleRetry): void {
	if (!isNonNegativeInteger(retry.maxRetriesPerObservation)) throw new Error("LOCAL_CYCLE_RETRY_INVALID");
}

/**
 * Planned and worst-case provider calls.
 *
 * The retry policy is a parameter rather than an assumption: "worst case" is
 * undefined without knowing whether a technical retry is billed, and the
 * catalog's `one_technical_invalid` policy is a product decision that can
 * change without this module changing.
 */
export function localCycleCalls(shape: LocalCycleShape, retry: LocalCycleRetry): LocalCycleCalls {
	assertShape(shape);
	assertRetry(retry);
	const planned = shape.gridPoints * shape.keywords * shape.repeats * shape.providersPerObservation;
	const worstCase = retry.retriesBillable ? planned * (1 + retry.maxRetriesPerObservation) : planned;
	return { planned, worstCase };
}

export function localCycleCost(
	shape: LocalCycleShape,
	tariff: LocalCycleTariff,
	retry: LocalCycleRetry,
): LocalCycleCost {
	assertTariff(tariff);
	const calls = localCycleCalls(shape, retry);
	// A partial block still costs a whole one: reading 11 results where the unit
	// covers 10 is two units, not 1.1.
	const unitsPerCall = Math.ceil(shape.captureDepth / tariff.resultsPerBillableUnit);
	const plannedUnits = calls.planned * unitsPerCall;
	const worstCaseUnits = calls.worstCase * unitsPerCall;
	// A billing floor raises the invoice, never the measurement: planned calls
	// stay what the cycle actually performs, so a cycle cannot be reported as
	// larger than the matrix it was authorized for.
	const floor = tariff.minimumBillableUnits ?? 0;
	const billedPlannedUnits = Math.max(plannedUnits, floor);
	const billedWorstCaseUnits = Math.max(worstCaseUnits, floor);
	return {
		currency: tariff.currency,
		plannedCalls: calls.planned,
		worstCaseCalls: calls.worstCase,
		unitsPerCall,
		plannedUnits,
		worstCaseUnits,
		billedPlannedUnits,
		billedWorstCaseUnits,
		plannedCost: roundCost(billedPlannedUnits * tariff.pricePerBillableUnit),
		worstCaseCost: roundCost(billedWorstCaseUnits * tariff.pricePerBillableUnit),
		breakdown: {
			gridPoints: shape.gridPoints,
			keywords: shape.keywords,
			repeats: shape.repeats,
			providersPerObservation: shape.providersPerObservation,
			captureDepth: shape.captureDepth,
			maxRetriesPerObservation: retry.maxRetriesPerObservation,
			retriesBillable: retry.retriesBillable,
			pricePerBillableUnit: tariff.pricePerBillableUnit,
			resultsPerBillableUnit: tariff.resultsPerBillableUnit,
			minimumBillableUnits: tariff.minimumBillableUnits ?? null,
		},
	};
}

/**
 * The budget gate compares the worst case, not the plan. A cap that only the
 * happy path respects is not a cap.
 */
export function assertCycleWithinBudget(cost: LocalCycleCost, capUsd: number): void {
	if (!Number.isFinite(capUsd) || capUsd < 0) throw new Error("LOCAL_CYCLE_BUDGET_INVALID");
	if (cost.worstCaseCost > capUsd) throw new Error("LOCAL_CYCLE_BUDGET_EXCEEDED");
}
