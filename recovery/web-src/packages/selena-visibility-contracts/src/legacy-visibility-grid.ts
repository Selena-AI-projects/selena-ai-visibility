import { z } from "zod";

/**
 * Compatibility-only planar grid retained for the historical Visibility OS
 * micro-slice. It is not the Selena v1.2.1 Local Maps generator; production
 * Local Maps callers must use `sphericalGridPointsV1` from `visibility-os.ts`.
 */
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

/** @deprecated Use `sphericalGridPointsV1` for all Selena Local Maps work. */
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
