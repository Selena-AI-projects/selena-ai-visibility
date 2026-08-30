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

export const LOCAL_GRID_FORMULA_VERSION = "sv-grid-sphere-v1" as const;
export const LOCAL_GRID_EARTH_RADIUS_METERS = 6_371_008.8;
export const LOCAL_GRID_RADIUS_METERS = 3_000 as const;
const UUID_URL_NAMESPACE_HEX = "6ba7b8119dad11d180b400c04fd430c8";

export const sphericalGridSpecV1Schema = z.strictObject({
	formulaVersion: z.literal(LOCAL_GRID_FORMULA_VERSION),
	locationId: z.string().uuid(),
	centerLatitude: z.number().finite().min(-85).max(85),
	centerLongitude: z.number().finite().min(-180).max(180),
	radiusMeters: z.literal(LOCAL_GRID_RADIUS_METERS),
	size: z.union([z.literal(3), z.literal(5)]),
});
export type SphericalGridSpecV1 = z.infer<typeof sphericalGridSpecV1Schema>;

export type SphericalGridPointV1 = {
	id: string;
	pointIndex: number;
	row: number;
	column: number;
	latitude: string;
	longitude: string;
	distanceMeters: number;
	bearingDegrees: number;
	canonical: string;
};

export type SphericalGridV1 = {
	formulaVersion: typeof LOCAL_GRID_FORMULA_VERSION;
	locationId: string;
	centerLatitude: string;
	centerLongitude: string;
	radiusMeters: typeof LOCAL_GRID_RADIUS_METERS;
	size: 3 | 5;
	spacingMeters: number;
	points: SphericalGridPointV1[];
};

export const sphericalGridPointV1Schema = z.strictObject({
	id: z.string().uuid(),
	pointIndex: z.number().int().nonnegative(),
	row: z.number().int().nonnegative(),
	column: z.number().int().nonnegative(),
	latitude: z.string().regex(/^-?\d{1,2}\.\d{6}$/),
	longitude: z.string().regex(/^-?(?:\d{1,2}|1[0-7]\d|180)\.\d{6}$/),
	distanceMeters: z.number().finite().nonnegative(),
	bearingDegrees: z.number().finite().min(-180).lt(180),
	canonical: z.string().min(1),
});

export const sphericalGridV1Schema = z
	.strictObject({
		formulaVersion: z.literal(LOCAL_GRID_FORMULA_VERSION),
		locationId: z.string().uuid(),
		centerLatitude: z.string().regex(/^-?\d{1,2}\.\d{6}$/),
		centerLongitude: z
			.string()
			.regex(/^-?(?:\d{1,2}|1[0-7]\d|180)\.\d{6}$/)
			.refine((value) => Number(value) >= -180 && Number(value) < 180, "GRID_LONGITUDE_NOT_CANONICAL"),
		radiusMeters: z.literal(LOCAL_GRID_RADIUS_METERS),
		size: z.union([z.literal(3), z.literal(5)]),
		spacingMeters: z.number().finite().positive(),
		points: z.array(sphericalGridPointV1Schema),
	})
	.superRefine((grid, issues) => {
		let expected: SphericalGridV1;
		try {
			expected = sphericalGridPointsV1({
				formulaVersion: grid.formulaVersion,
				locationId: grid.locationId,
				centerLatitude: Number(grid.centerLatitude),
				centerLongitude: Number(grid.centerLongitude),
				radiusMeters: grid.radiusMeters,
				size: grid.size,
			});
		} catch {
			issues.addIssue({ code: "custom", message: "GRID_CANONICAL_REGENERATION_FAILED" });
			return;
		}
		if (JSON.stringify(grid) !== JSON.stringify(expected))
			issues.addIssue({ code: "custom", message: "GRID_ORDERED_POINTS_NOT_CANONICAL" });
	});

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;
const radiansToDegrees = (value: number): number => (value * 180) / Math.PI;

function normalizeLongitude(value: number): number {
	const normalized = ((((value + 180) % 360) + 360) % 360) - 180;
	return Object.is(normalized, -0) ? 0 : normalized;
}

// The database contract stores coordinates at numeric(9,6). Formatting all
// canonical coordinates to that scale prevents equivalent inputs from
// producing different point IDs because of lexical or floating-point noise.
function roundHalfUpCoordinate(value: number): string {
	const magnitude = Math.abs(value).toFixed(6);
	return value < 0 && magnitude !== "0.000000" ? `-${magnitude}` : magnitude;
}

function canonicalLongitude(value: number): string {
	const rounded = roundHalfUpCoordinate(normalizeLongitude(value));
	return rounded === "180.000000" ? "-180.000000" : rounded;
}

const rotateLeft = (value: number, bits: number): number => ((value << bits) | (value >>> (32 - bits))) >>> 0;

// UUIDv5 uses SHA-1 by definition. Keeping this small digest implementation in
// the shared contract avoids importing node:crypto into browser bundles.
function sha1Bytes(input: Uint8Array): Uint8Array {
	const bitLength = input.length * 8;
	const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
	const padded = new Uint8Array(paddedLength);
	padded.set(input);
	padded[input.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
	view.setUint32(paddedLength - 4, bitLength >>> 0, false);

	let h0 = 0x67452301;
	let h1 = 0xefcdab89;
	let h2 = 0x98badcfe;
	let h3 = 0x10325476;
	let h4 = 0xc3d2e1f0;
	const words = new Uint32Array(80);

	for (let offset = 0; offset < paddedLength; offset += 64) {
		for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
		for (let index = 16; index < 80; index += 1) {
			words[index] = rotateLeft(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);
		}

		let a = h0;
		let b = h1;
		let c = h2;
		let d = h3;
		let e = h4;
		for (let index = 0; index < 80; index += 1) {
			let f: number;
			let k: number;
			if (index < 20) {
				f = (b & c) | (~b & d);
				k = 0x5a827999;
			} else if (index < 40) {
				f = b ^ c ^ d;
				k = 0x6ed9eba1;
			} else if (index < 60) {
				f = (b & c) | (b & d) | (c & d);
				k = 0x8f1bbcdc;
			} else {
				f = b ^ c ^ d;
				k = 0xca62c1d6;
			}
			const next = (rotateLeft(a, 5) + f + e + k + words[index]) >>> 0;
			e = d;
			d = c;
			c = rotateLeft(b, 30);
			b = a;
			a = next;
		}
		h0 = (h0 + a) >>> 0;
		h1 = (h1 + b) >>> 0;
		h2 = (h2 + c) >>> 0;
		h3 = (h3 + d) >>> 0;
		h4 = (h4 + e) >>> 0;
	}

	const digest = new Uint8Array(20);
	const digestView = new DataView(digest.buffer);
	for (const [index, value] of [h0, h1, h2, h3, h4].entries()) digestView.setUint32(index * 4, value, false);
	return digest;
}

function uuidV5Url(canonical: string): string {
	const namespaceBytes = UUID_URL_NAMESPACE_HEX.match(/../g);
	if (namespaceBytes === null) throw new Error("LOCAL_GRID_UUID_NAMESPACE_INVALID");
	const nameBytes = new TextEncoder().encode(canonical);
	const input = new Uint8Array(16 + nameBytes.length);
	input.set(namespaceBytes.map((value) => Number.parseInt(value, 16)));
	input.set(nameBytes, 16);
	const bytes = Array.from(sha1Bytes(input).slice(0, 16));
	bytes[6] = (bytes[6] & 0x0f) | 0x50;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.map((value) => value.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sphericalGridPointsV1(input: SphericalGridSpecV1): SphericalGridV1 {
	if (Number.isFinite(input.centerLatitude) && Math.abs(input.centerLatitude) > 85)
		throw new Error("GRID_POLAR_REGION_UNSUPPORTED");
	const spec = sphericalGridSpecV1Schema.parse(input);
	const locationId = spec.locationId.toLowerCase();
	const centerLatitude = roundHalfUpCoordinate(spec.centerLatitude);
	const normalizedCenterLongitude = normalizeLongitude(spec.centerLongitude);
	const centerLongitude = canonicalLongitude(normalizedCenterLongitude);
	const half = (spec.size - 1) / 2;
	const spacingMeters = spec.radiusMeters / (Math.SQRT2 * half);
	const latitude1 = degreesToRadians(spec.centerLatitude);
	const longitude1 = degreesToRadians(normalizedCenterLongitude);
	const points: SphericalGridPointV1[] = [];
	const coordinateKeys = new Set<string>();

	for (let row = 0; row < spec.size; row += 1) {
		for (let column = 0; column < spec.size; column += 1) {
			const north = (half - row) * spacingMeters;
			const east = (column - half) * spacingMeters;
			const distanceMeters = Math.hypot(north, east);
			const bearingRadians = Math.atan2(east, north);
			const angularDistance = distanceMeters / LOCAL_GRID_EARTH_RADIUS_METERS;
			const latitude2 = Math.asin(
				Math.sin(latitude1) * Math.cos(angularDistance) +
					Math.cos(latitude1) * Math.sin(angularDistance) * Math.cos(bearingRadians),
			);
			const longitude2 =
				longitude1 +
				Math.atan2(
					Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitude1),
					Math.cos(angularDistance) - Math.sin(latitude1) * Math.sin(latitude2),
				);
			const latitudeDegrees = radiansToDegrees(latitude2);
			if (Math.abs(latitudeDegrees) > 85) throw new Error("GRID_POLAR_REGION_UNSUPPORTED");
			const latitude = roundHalfUpCoordinate(latitudeDegrees);
			const longitude = canonicalLongitude(radiansToDegrees(longitude2));
			const coordinateKey = `${latitude}|${longitude}`;
			if (coordinateKeys.has(coordinateKey)) throw new Error("LOCAL_GRID_DUPLICATE_ROUNDED_COORDINATE");
			coordinateKeys.add(coordinateKey);
			const canonical = [
				spec.formulaVersion,
				locationId,
				centerLatitude,
				centerLongitude,
				String(spec.radiusMeters),
				String(spec.size),
				String(row),
				String(column),
				latitude,
				longitude,
			].join("|");
			points.push({
				id: uuidV5Url(canonical),
				pointIndex: row * spec.size + column,
				row,
				column,
				latitude,
				longitude,
				distanceMeters,
				bearingDegrees: normalizeLongitude(radiansToDegrees(bearingRadians)),
				canonical,
			});
		}
	}

	return {
		formulaVersion: spec.formulaVersion,
		locationId,
		centerLatitude,
		centerLongitude,
		radiusMeters: spec.radiusMeters,
		size: spec.size,
		spacingMeters,
		points,
	};
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
