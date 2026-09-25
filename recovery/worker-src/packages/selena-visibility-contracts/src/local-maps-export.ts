import { z } from "zod";
import { type LocalApiMapResult, localApiCollectionStatuses, localApiMapResultSchema } from "./local-api.js";

/**
 * The source-only Local Maps export is intentionally a pure projection of the
 * public read contract. It does not read a database, call a provider, resolve
 * object storage, or create a REST response. The web read route pages the
 * existing read API and passes the resulting rows here; runtime stores, signed
 * evidence access, and provider execution remain separate gates from this pure
 * projection.
 */
export const LOCAL_MAPS_CSV_MAX_ROWS = 10_000 as const;

export const localMapsCsvColumns = [
	"cycle_id",
	"dataset_id",
	"surface",
	"collection_status",
	"observation_id",
	"grid_point_id",
	"point_index",
	"latitude",
	"longitude",
	"keyword_id",
	"keyword",
	"provider",
	"repeat_index",
	"status",
	"target_rank",
	"reason_code",
	"captured_at",
	"evidence_ids",
] as const;

export type LocalMapsCsvColumn = (typeof localMapsCsvColumns)[number];

/**
 * Export input deliberately contains only fields already exposed by the
 * Local Maps read contract. In particular, private source URLs, raw response
 * references, object-storage keys, and access tokens cannot enter this
 * serializer's output shape.
 */
export type LocalMapsCsvInput = {
	cycleId: string;
	datasetId: string | null;
	surface: "LOCAL_MAPS";
	status: (typeof localApiCollectionStatuses)[number];
	items: LocalApiMapResult[];
};

const localMapsCsvInputSchema = z
	.strictObject({
		cycleId: z.string().uuid(),
		datasetId: z.string().uuid().nullable(),
		surface: z.literal("LOCAL_MAPS"),
		status: z.enum(localApiCollectionStatuses),
		items: z.array(localApiMapResultSchema).max(LOCAL_MAPS_CSV_MAX_ROWS),
	})
	.superRefine((input, context) => {
		if (input.status === "NOT_INCLUDED" && (input.datasetId !== null || input.items.length !== 0)) {
			context.addIssue({ code: "custom", message: "LOCAL_MAPS_CSV_NOT_INCLUDED_DATA_FORBIDDEN" });
		}
		if ((input.status === "READY" || input.status === "PARTIAL") && input.datasetId === null) {
			context.addIssue({ code: "custom", message: "LOCAL_MAPS_CSV_DATASET_REQUIRED" });
		}
	});

const privateReferencePattern = /^(?:https?|file|s3|gs|private):\/\//i;

function assertNoPrivateReferences(items: readonly LocalApiMapResult[]): void {
	if (items.some((item) => item.evidenceIds.some((evidenceId) => privateReferencePattern.test(evidenceId)))) {
		throw new Error("LOCAL_MAPS_CSV_PRIVATE_REFERENCE_FORBIDDEN");
	}
}

/**
 * CSV uses an empty cell for a null value. Unknown outcomes remain explicit in
 * the `status`, `collection_status`, and `reason_code` columns; this avoids
 * turning an absent rank or timestamp into a measured value.
 */
function csvCell(value: string | number | null | readonly string[]): string {
	const text = Array.isArray(value) ? JSON.stringify(value) : value === null ? "" : String(value);
	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowCells(
	input: LocalMapsCsvInput,
	item: LocalApiMapResult,
): readonly (string | number | null | readonly string[])[] {
	return [
		input.cycleId,
		input.datasetId,
		input.surface,
		input.status,
		item.observationId,
		item.gridPointId,
		item.pointIndex,
		item.latitude,
		item.longitude,
		item.keywordId,
		item.keyword,
		item.provider,
		item.repeatIndex,
		item.status,
		item.targetRank,
		item.reasonCode,
		item.capturedAt,
		item.evidenceIds,
	];
}

/**
 * Serialize a bounded Local Maps read-model collection in a stable, canonical
 * column order. The caller owns pagination and must provide rows in the read
 * API's stable order; this function never performs an unbounded read or sorts
 * by data that is not part of the public contract.
 */
export function serializeLocalMapsCsv(input: LocalMapsCsvInput): string {
	const parsed = localMapsCsvInputSchema.parse(input);
	assertNoPrivateReferences(parsed.items);
	const lines = [localMapsCsvColumns.join(",")];
	for (const item of parsed.items) lines.push(rowCells(parsed, item).map(csvCell).join(","));
	return `${lines.join("\n")}\n`;
}

/** Stable alias for callers that name the operation after its result shape. */
export const localMapsResultsToCsv = serializeLocalMapsCsv;
