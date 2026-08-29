import { z } from "zod";
import { LOCAL_AI_DISCOVERY_POLICY } from "./local-discovery.js";

export const surfaceFamilies = ["AI", "LOCAL", "SEARCH", "REPUTATION"] as const;
export const surfaceCaptureMethods = ["PROVIDER_API", "VISITOR_SCRAPE", "MANUAL_OBSERVATION"] as const;
export const visibilitySurfaceIds = [
	"AI_ANSWER_ENGINE",
	"GOOGLE_ASK_MAPS",
	"GOOGLE_MAPS_LOCAL_PACK",
	"GOOGLE_ORGANIC",
	"GOOGLE_AI_OVERVIEWS",
	"REVIEW_PLATFORM",
] as const;

export const surfaceSpec = z.strictObject({
	surfaceId: z.enum(visibilitySurfaceIds),
	family: z.enum(surfaceFamilies),
	captureMethods: z.array(z.enum(surfaceCaptureMethods)).min(1),
	featureFlag: z.string().min(1),
	status: z.enum(["MEASURED", "ADD"]),
});
export type SurfaceSpec = z.infer<typeof surfaceSpec>;
export type VisibilitySurfaceId = (typeof visibilitySurfaceIds)[number];
export type SurfaceCaptureMethod = (typeof surfaceCaptureMethods)[number];

export const VISIBILITY_SURFACES = Object.freeze({
	AI_ANSWER_ENGINE: surfaceSpec.parse({
		surfaceId: "AI_ANSWER_ENGINE",
		family: "AI",
		captureMethods: ["PROVIDER_API", "VISITOR_SCRAPE"],
		featureFlag: "SELENA_MEASUREMENT_ENABLED",
		status: "MEASURED",
	}),
	GOOGLE_ASK_MAPS: surfaceSpec.parse({
		surfaceId: "GOOGLE_ASK_MAPS",
		family: "LOCAL",
		captureMethods: [LOCAL_AI_DISCOVERY_POLICY.captureMethod],
		featureFlag: "LOCAL_AI_DISCOVERY_ENABLED",
		status: "MEASURED",
	}),
	GOOGLE_MAPS_LOCAL_PACK: surfaceSpec.parse({
		surfaceId: "GOOGLE_MAPS_LOCAL_PACK",
		family: "LOCAL",
		captureMethods: ["PROVIDER_API", "MANUAL_OBSERVATION"],
		featureFlag: "SELENA_LOCAL_VISIBILITY_ENABLED",
		status: "ADD",
	}),
	GOOGLE_ORGANIC: surfaceSpec.parse({
		surfaceId: "GOOGLE_ORGANIC",
		family: "SEARCH",
		captureMethods: ["PROVIDER_API"],
		featureFlag: "SELENA_SEARCH_VISIBILITY_ENABLED",
		status: "ADD",
	}),
	GOOGLE_AI_OVERVIEWS: surfaceSpec.parse({
		surfaceId: "GOOGLE_AI_OVERVIEWS",
		family: "SEARCH",
		captureMethods: ["PROVIDER_API"],
		featureFlag: "SELENA_SEARCH_VISIBILITY_ENABLED",
		status: "ADD",
	}),
	REVIEW_PLATFORM: surfaceSpec.parse({
		surfaceId: "REVIEW_PLATFORM",
		family: "REPUTATION",
		captureMethods: ["PROVIDER_API", "MANUAL_OBSERVATION"],
		featureFlag: "SELENA_REPUTATION_ENABLED",
		status: "ADD",
	}),
} satisfies Record<VisibilitySurfaceId, SurfaceSpec>);

export function assertSurfaceCaptureAllowed(
	surfaceId: VisibilitySurfaceId,
	method: SurfaceCaptureMethod,
	env: Record<string, string | undefined>,
): void {
	const surface = VISIBILITY_SURFACES[surfaceId];
	if (env[surface.featureFlag] !== "true") throw new Error("VISIBILITY_SURFACE_DISABLED");
	if (surface.status !== "MEASURED") throw new Error("VISIBILITY_SURFACE_NOT_IMPLEMENTED");
	if (!surface.captureMethods.includes(method)) throw new Error("VISIBILITY_CAPTURE_METHOD_BLOCKED");
}

export const readinessDimensions = ["ACCESS", "ENTITY", "PROPOSITION", "ACTION"] as const;
export const readinessScoreSchema = z.strictObject({
	evidenceType: z.literal("READINESS_SNAPSHOT"),
	dimension: z.enum(readinessDimensions),
	score: z.number().min(0).max(100),
	evidenceIds: z.array(z.string().min(1)).min(1),
	measuredAt: z.iso.datetime(),
});

export const surfaceVisibilitySchema = z
	.strictObject({
		evidenceType: z.literal("MEASUREMENT_OBSERVATION"),
		surfaceId: z.enum(visibilitySurfaceIds),
		status: z.enum(["MEASURED", "NOT_MEASURED", "UNKNOWN"]),
		metrics: z.record(z.string(), z.number().nullable()).nullable(),
		evidenceIds: z.array(z.string().min(1)),
		measuredAt: z.iso.datetime().nullable(),
	})
	.superRefine((value, ctx) => {
		if (value.status === "MEASURED" && (value.metrics === null || value.evidenceIds.length === 0)) {
			ctx.addIssue({ code: "custom", message: "Measured visibility requires metrics and evidence" });
		}
	});

// This is a presentation contract, not a score calculator. Strict fields keep
// an overall score from being smuggled into the portfolio response.
export const visibilityPortfolio = z.strictObject({
	readiness: z.array(readinessScoreSchema),
	surfaces: z.array(surfaceVisibilitySchema),
});

export const DEFAULT_GRID_POINT_CEILING = 49;
const METRES_PER_DEGREE_LATITUDE = 111320;
const COORDINATE_SCALE = 1_000_000;

export const gridSpecSchema = z
	.strictObject({
		shape: z.literal("SQUARE"),
		rows: z.number().int().positive(),
		columns: z.number().int().positive(),
		spacingMeters: z.number().int().positive(),
		centerLatitude: z.number().min(-90).max(90),
		centerLongitude: z.number().min(-180).max(180),
		formulaVersion: z.string().min(1),
	})
	.refine((value) => value.rows === value.columns, "Square grids require equal rows and columns")
	.refine((value) => value.rows % 2 === 1, "Square grids require an odd side length");
export type GridSpec = z.infer<typeof gridSpecSchema>;
export type GridPoint = { pointIndex: number; latitude: number; longitude: number };

export function assertGridWithinCeiling(spec: GridSpec, ceiling = DEFAULT_GRID_POINT_CEILING): void {
	if (!Number.isInteger(ceiling) || ceiling <= 0) throw new Error("LOCAL_GRID_CEILING_INVALID");
	if (spec.rows * spec.columns > ceiling) throw new Error("LOCAL_GRID_CEILING_EXCEEDED");
}

const roundCoordinate = (value: number): number => Math.round(value * COORDINATE_SCALE) / COORDINATE_SCALE;

export function squareGridPoints(input: GridSpec): GridPoint[] {
	const spec = gridSpecSchema.parse(input);
	assertGridWithinCeiling(spec);
	const longitudeFactor = Math.cos((spec.centerLatitude * Math.PI) / 180);
	if (Math.abs(longitudeFactor) < 1e-6) throw new Error("LOCAL_GRID_LONGITUDE_DEGENERATE");
	const latitudeStep = spec.spacingMeters / METRES_PER_DEGREE_LATITUDE;
	const longitudeStep = spec.spacingMeters / (METRES_PER_DEGREE_LATITUDE * longitudeFactor);
	const offset = (spec.rows - 1) / 2;
	const points: GridPoint[] = [];
	for (let row = 0; row < spec.rows; row += 1) {
		for (let column = 0; column < spec.columns; column += 1) {
			points.push({
				pointIndex: row * spec.columns + column,
				latitude: roundCoordinate(spec.centerLatitude + (row - offset) * latitudeStep),
				longitude: roundCoordinate(spec.centerLongitude + (column - offset) * longitudeStep),
			});
		}
	}
	return points;
}

export type LocalObservationShape = {
	locations: number;
	keywords: number;
	gridPoints: number;
	repeats: number;
	providers: number;
};

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

export function expectedLocalObservations(shape: LocalObservationShape): number {
	const axes = [shape.locations, shape.keywords, shape.gridPoints, shape.repeats, shape.providers];
	if (!axes.every(isPositiveInteger)) throw new Error("LOCAL_OBSERVATION_SHAPE_INVALID");
	return axes.reduce((product, value) => product * value, 1);
}

export function assertLocalObservationCardinality(created: number, expected: number): void {
	if (!Number.isInteger(created) || !Number.isInteger(expected) || created < 0 || expected < 0)
		throw new Error("LOCAL_CARDINALITY_INVALID");
	if (created >= expected) throw new Error("LOCAL_CARDINALITY_BLOCKED");
}

export type LocalRankedEntry = { rank: number; entityKey: string };
export type LocalMetricObservation = {
	validity: "VALID" | "INVALID" | "UNMEASURED";
	captureDepth: number;
	entries: readonly LocalRankedEntry[];
};
export type RatioMetric = { value: number | null; numerator: number; denominator: number };

export function targetRank(entries: readonly LocalRankedEntry[], targetEntityKey: string): number | null {
	const ranks = entries
		.filter((entry) => entry.entityKey === targetEntityKey && Number.isInteger(entry.rank) && entry.rank > 0)
		.map((entry) => entry.rank);
	return ranks.length === 0 ? null : Math.min(...ranks);
}

function ratio(numerator: number, denominator: number): RatioMetric {
	return { value: denominator === 0 ? null : numerator / denominator, numerator, denominator };
}

function coverageBand(
	observations: readonly LocalMetricObservation[],
	targetEntityKey: string,
	band: number,
): RatioMetric {
	let numerator = 0;
	let denominator = 0;
	for (const observation of observations) {
		if (observation.validity !== "VALID") continue;
		const rank = targetRank(observation.entries, targetEntityKey);
		if (observation.captureDepth >= band || (rank !== null && rank <= band)) denominator += 1;
		if (rank !== null && rank <= band) numerator += 1;
	}
	return ratio(numerator, denominator);
}

export function localCoverage(observations: readonly LocalMetricObservation[], targetEntityKey: string) {
	const top3 = coverageBand(observations, targetEntityKey, 3);
	const top10 = coverageBand(observations, targetEntityKey, 10);
	const top20 = coverageBand(observations, targetEntityKey, 20);
	const valid = observations.filter((observation) => observation.validity === "VALID");
	const ranks = valid
		.map((observation) => targetRank(observation.entries, targetEntityKey))
		.filter((rank): rank is number => rank !== null);
	return {
		top3,
		top10,
		top20,
		outsideTop20: {
			value: top20.value === null ? null : 1 - top20.value,
			numerator: top20.denominator - top20.numerator,
			denominator: top20.denominator,
		} satisfies RatioMetric,
		averageRank: ranks.length === 0 ? null : ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length,
		foundShare: ratio(ranks.length, valid.length),
	};
}

export function shareOfLocalVoice(
	observations: readonly LocalMetricObservation[],
	entityKey: string,
	captureDepth: number,
): RatioMetric {
	if (!isPositiveInteger(captureDepth)) throw new Error("LOCAL_CAPTURE_DEPTH_INVALID");
	let occupied = 0;
	let owned = 0;
	for (const observation of observations) {
		if (observation.validity !== "VALID" || observation.captureDepth < captureDepth) continue;
		const entities = new Set(
			observation.entries
				.filter((entry) => Number.isInteger(entry.rank) && entry.rank > 0 && entry.rank <= captureDepth)
				.map((entry) => entry.entityKey),
		);
		occupied += entities.size;
		if (entities.has(entityKey)) owned += 1;
	}
	return ratio(owned, occupied);
}

export function localVoiceComparison(
	observations: readonly LocalMetricObservation[],
	entityKeys: readonly string[],
	captureDepth: number,
): Record<string, number | null> {
	return Object.fromEntries(
		entityKeys.map((entityKey) => [entityKey, shareOfLocalVoice(observations, entityKey, captureDepth).value]),
	);
}

export type SearchObservationShape = {
	queries: number;
	engines: number;
	regions: number;
	devices: number;
	repeats: number;
};

export function expectedSearchObservations(shape: SearchObservationShape): number {
	const axes = [shape.queries, shape.engines, shape.regions, shape.devices, shape.repeats];
	if (!axes.every(isPositiveInteger)) throw new Error("SEARCH_OBSERVATION_SHAPE_INVALID");
	return axes.reduce((product, value) => product * value, 1);
}

export type ReputationSnapshotShape = {
	locations: number;
	sources: number;
	periods: number;
};

export function expectedReputationSnapshots(shape: ReputationSnapshotShape): number {
	const axes = [shape.locations, shape.sources, shape.periods];
	if (!axes.every(isPositiveInteger)) throw new Error("REPUTATION_SNAPSHOT_SHAPE_INVALID");
	return axes.reduce((product, value) => product * value, 1);
}

export type ReputationAnalysisInput = {
	topic: string | null;
	sentiment: string | null;
	analysisMethodVersion: string | null;
};

const hasText = (value: string | null): boolean => Boolean(value?.trim());

export function assertReputationAnalysis(input: ReputationAnalysisInput): void {
	if ((hasText(input.topic) || hasText(input.sentiment)) && !hasText(input.analysisMethodVersion)) {
		throw new Error("REPUTATION_ANALYSIS_METHOD_REQUIRED");
	}
}

export function reviewVelocityPer30Days(newReviews: number | null, periodDays: number): number | null {
	if (!Number.isFinite(periodDays) || periodDays <= 0) throw new Error("REPUTATION_PERIOD_INVALID");
	if (newReviews === null) return null;
	if (!Number.isInteger(newReviews) || newReviews < 0) throw new Error("REPUTATION_REVIEW_COUNT_INVALID");
	return (newReviews * 30) / periodDays;
}
