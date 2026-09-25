import { createHash } from "node:crypto";
import { z } from "zod";

const rank = z.number().int().positive();
const itemSchema = z
	.object({
		type: z.string(),
		item_type: z.string().optional(),
		kind: z.string().optional(),
		title: z.string().min(1),
		rank_group: rank,
		rank_absolute: rank.nullish(),
		place_id: z.string().nullish(),
		cid: z.union([z.string(), z.number().int().refine(Number.isSafeInteger)]).nullish(),
	})
	.superRefine((item, context) => {
		if (
			![item.type, item.item_type, item.kind].some((value) => value?.toLowerCase() === "maps_paid_item") &&
			!String(item.cid ?? "").trim() &&
			!item.place_id?.trim()
		)
			context.addIssue({ code: "custom", message: "LOCAL_COMPETITOR_ITEM_IDENTITY_REQUIRED" });
	});
const responseSchema = z.object({
	status_code: z.literal(20000),
	tasks: z
		.array(
			z.object({
				id: z.string(),
				status_code: z.literal(20000),
				data: z.object({ keyword: z.string(), language_code: z.string(), location_coordinate: z.string() }),
				result: z.array(z.object({ items: z.array(z.unknown()) })).length(1),
			}),
		)
		.length(1),
});

export type LocalCompetitor = {
	sourceItemIndex: number;
	name: string;
	cid: string | null;
	placeId: string | null;
	kind: "ORGANIC" | "AD";
	groupRank: number;
	absoluteRank: number | null;
};

/** Derive competitors only from the exact retained response behind a validated observation. */
export function extractLocalCompetitors(input: {
	rawBody: string;
	rawSha256: string;
	providerTaskId: string;
	evidenceId: string;
	keyword: string;
	language: string;
	locationCoordinate: string;
	target: { cid?: string | null; placeId?: string | null };
	targetRank: number | null;
	captureDepth: number;
}): {
	evidenceId: string;
	target: LocalCompetitor | null;
	aboveTarget: LocalCompetitor[];
	ads: LocalCompetitor[];
	returnedOrganic?: LocalCompetitor[];
} {
	const digest = `sha256:${createHash("sha256").update(input.rawBody).digest("hex")}`;
	if (digest !== input.rawSha256) throw new Error("LOCAL_COMPETITOR_HASH_MISMATCH");
	if (!input.evidenceId || (!input.target.cid && !input.target.placeId))
		throw new Error("LOCAL_COMPETITOR_IDENTITY_REQUIRED");
	if (!Number.isInteger(input.captureDepth) || input.captureDepth < 1)
		throw new Error("LOCAL_COMPETITOR_DEPTH_INVALID");
	const raw = responseSchema.parse(JSON.parse(input.rawBody));
	const task = raw.tasks[0];
	if (
		task.id !== input.providerTaskId ||
		task.data.keyword !== input.keyword ||
		task.data.language_code !== input.language ||
		task.data.location_coordinate !== input.locationCoordinate
	)
		throw new Error("LOCAL_COMPETITOR_REQUEST_MISMATCH");
	const items: LocalCompetitor[] = [];
	for (const [sourceItemIndex, value] of task.result[0].items.entries()) {
		if (
			!value ||
			typeof value !== "object" ||
			!("type" in value) ||
			!["maps_search", "maps_paid_item"].includes(String(value.type))
		)
			continue;
		const item = itemSchema.parse(value);
		if (item.rank_group > input.captureDepth) continue;
		items.push({
			sourceItemIndex,
			name: item.title,
			cid: item.cid == null ? null : String(item.cid),
			placeId: item.place_id ?? null,
			kind: [item.type, item.item_type, item.kind].some((value) => value?.toLowerCase() === "maps_paid_item")
				? "AD"
				: "ORGANIC",
			groupRank: item.rank_group,
			absoluteRank: item.rank_absolute ?? null,
		});
	}
	const organic = items.filter((item) => item.kind === "ORGANIC");
	if (new Set(organic.map((item) => item.groupRank)).size !== organic.length)
		throw new Error("LOCAL_COMPETITOR_RANK_AMBIGUOUS");
	const matches = organic.filter(
		(item) =>
			(input.target.cid && item.cid === input.target.cid) ||
			(input.target.placeId && item.placeId === input.target.placeId),
	);
	if (matches.length > 1 || (matches[0]?.groupRank ?? null) !== input.targetRank)
		throw new Error("LOCAL_COMPETITOR_TARGET_MISMATCH");
	const target = matches[0] ?? null;
	if (target && organic.filter((item) => item.groupRank < target.groupRank).length !== target.groupRank - 1)
		throw new Error("LOCAL_COMPETITOR_COVERAGE_INCOMPLETE");
	return {
		evidenceId: input.evidenceId,
		target,
		aboveTarget: target
			? organic.filter((item) => item.groupRank < target.groupRank).sort((a, b) => a.groupRank - b.groupRank)
			: [],
		ads: items.filter((item) => item.kind === "AD").sort((a, b) => a.groupRank - b.groupRank),
		returnedOrganic: organic.sort((a, b) => a.groupRank - b.groupRank),
	};
}

export type LocalReportCompetition =
	| ({ status: "AVAILABLE"; rawRetentionExpiresAt?: string } & ReturnType<typeof extractLocalCompetitors>)
	| { status: "UNAVAILABLE"; reason: "RAW_NOT_RETAINED" | "PROVIDER_NOT_SUPPORTED" };
