import { createHash } from "node:crypto";
import { z } from "zod";
import { extractLocalCompetitors } from "./selena-local-competitors";

const sha = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const coordinate = z
	.string()
	.regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,13$/)
	.refine((value) => {
		const [lat, lng] = value.split(",").map(Number);
		return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
	});
const usd = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
const request = z.object({
	api: z.literal("serp"),
	function: z.enum(["live", "task_get"]),
	se: z.literal("google"),
	se_type: z.literal("maps"),
	keyword: z.string().min(1),
	language_code: z.string().min(2),
	location_coordinate: coordinate,
	device: z.literal("mobile"),
	os: z.literal("android"),
	se_domain: z.literal("google.com"),
	depth: z.literal(20),
	search_this_area: z.literal(true),
});
const observation = z.strictObject({
	pointIndex: z.number().int().min(0).max(8),
	keyword: z.string().min(1),
	providerTaskId: z.string().min(1),
	rawSha256: sha,
	rawBody: z.string(),
	sourceRecordedAt: z.iso.datetime(),
	sourceTimeField: z.enum(["receivedAt", "capturedAt"]),
	providerReportedCostUsd: usd,
	targetRank: z.number().int().min(1).max(20).nullable(),
});
const inputSchema = z.strictObject({
	organizationId: z.string().uuid(),
	target: z.strictObject({ cid: z.string().min(1), placeId: z.string().min(1) }),
	language: z.string().min(2),
	coordinates: z.array(coordinate).length(9),
	batches: z
		.array(
			z.strictObject({
				auditId: z.string().min(1),
				summarySha256: sha,
				observations: z.array(observation).min(9),
			}),
		)
		.min(1),
});
const response = z.object({
	status_code: z.literal(20000),
	cost: z.number().nonnegative(),
	tasks: z
		.array(
			z.object({
				id: z.string(),
				status_code: z.literal(20000),
				cost: z.number().nonnegative(),
				path: z.array(z.string()),
				data: request,
				result: z
					.array(
						z.object({
							type: z.literal("maps"),
							keyword: z.string(),
							language_code: z.string(),
							se_domain: z.literal("google.com"),
							datetime: z.string(),
							items: z.array(z.object({ type: z.enum(["maps_search", "maps_paid_item"]) }).passthrough()),
						}),
					)
					.length(1),
			}),
		)
		.length(1),
});

export type ExternalLocalAuditInput = z.input<typeof inputSchema>;
export type ExternalLocalAuditContent = ReturnType<typeof prepareExternalLocalAudit>["content"];

function microUsd(value: string): bigint {
	const [whole, fraction = ""] = usd.parse(value).split(".");
	return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
}
function money(value: bigint): string {
	return `${value / BigInt(1_000_000)}.${(value % BigInt(1_000_000)).toString().padStart(6, "0")}`;
}
function hash(value: string): string {
	return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
function providerTime(value: string): string {
	if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+00:00$/.test(value))
		throw new Error("LOCAL_EXTERNAL_CAPTURE_TIME_INVALID");
	return z.iso.datetime().parse(value.replace(" ", "T").replace(" +00:00", "Z"));
}

/** Build import content only; no worker attempts, cost events or paid requests are created. */
export function prepareExternalLocalAudit(value: ExternalLocalAuditInput) {
	const input = inputSchema.parse(value);
	if (new Set(input.coordinates.map((c) => c.split(",").map(Number).join(","))).size !== 9)
		throw new Error("LOCAL_EXTERNAL_GRID_DUPLICATE");
	const tasks = new Set<string>();
	const auditIds = new Set<string>();
	const queries = new Set<string>();
	let total = BigInt(0);
	const batches = input.batches
		.map((batch) => {
			if (auditIds.has(batch.auditId)) throw new Error("LOCAL_EXTERNAL_AUDIT_DUPLICATE");
			auditIds.add(batch.auditId);
			const slots = new Map<string, Set<number>>();
			const rows = batch.observations
				.map((row) => {
					if (tasks.has(row.providerTaskId)) throw new Error("LOCAL_EXTERNAL_TASK_DUPLICATE");
					tasks.add(row.providerTaskId);
					const points = slots.get(row.keyword) ?? new Set<number>();
					if (points.has(row.pointIndex)) throw new Error("LOCAL_EXTERNAL_SLOT_DUPLICATE");
					points.add(row.pointIndex);
					slots.set(row.keyword, points);
					if (hash(row.rawBody) !== row.rawSha256) throw new Error("LOCAL_EXTERNAL_HASH_MISMATCH");
					const raw = response.parse(JSON.parse(row.rawBody));
					const task = raw.tasks[0];
					const expectedPath =
						task.data.function === "live"
							? ["v3", "serp", "google", "maps", "live", "advanced"]
							: ["v3", "serp", "google", "maps", "task_get", "advanced", task.id];
					if (JSON.stringify(task.path) !== JSON.stringify(expectedPath))
						throw new Error("LOCAL_EXTERNAL_PROTOCOL_MISMATCH");
					const result = task.result[0];
					if (
						task.id !== row.providerTaskId ||
						task.data.keyword !== row.keyword ||
						task.data.language_code !== input.language ||
						task.data.location_coordinate !== input.coordinates[row.pointIndex] ||
						result.keyword !== row.keyword ||
						result.language_code !== input.language
					)
						throw new Error("LOCAL_EXTERNAL_REQUEST_MISMATCH");
					const cost = microUsd(row.providerReportedCostUsd);
					if (microUsd(String(raw.cost)) !== cost || microUsd(String(task.cost)) !== cost)
						throw new Error("LOCAL_EXTERNAL_COST_MISMATCH");
					const capturedAt = providerTime(result.datetime);
					const clockOffsetMs = Date.parse(capturedAt) - Date.parse(row.sourceRecordedAt);
					// Provider timestamps have second precision; retain sub-second disagreement explicitly.
					if (clockOffsetMs > 1000) throw new Error("LOCAL_EXTERNAL_TIME_ORDER_INVALID");
					const competition = extractLocalCompetitors({
						rawBody: row.rawBody,
						rawSha256: row.rawSha256,
						providerTaskId: task.id,
						evidenceId: `external:${task.id}`,
						keyword: row.keyword,
						language: input.language,
						locationCoordinate: task.data.location_coordinate,
						target: input.target,
						targetRank: row.targetRank,
						captureDepth: 20,
					});
					if (
						competition.target &&
						(competition.target.cid !== input.target.cid || competition.target.placeId !== input.target.placeId)
					)
						throw new Error("LOCAL_EXTERNAL_TARGET_IDENTITY_MISMATCH");
					total += cost;
					return {
						pointIndex: row.pointIndex,
						keyword: row.keyword,
						providerTaskId: task.id,
						rawSha256: row.rawSha256,
						capturedAt,
						sourceRecordedAt: row.sourceRecordedAt,
						sourceTimeField: row.sourceTimeField,
						providerClockAheadMs: Math.max(0, clockOffsetMs),
						request: task.data,
						targetRank: row.targetRank,
						competition,
						providerReportedCostUsd: money(cost),
					};
				})
				.sort((a, b) => (a.keyword < b.keyword ? -1 : a.keyword > b.keyword ? 1 : a.pointIndex - b.pointIndex));
			for (const [keyword, points] of slots) {
				if (points.size !== 9) throw new Error("LOCAL_EXTERNAL_GRID_INCOMPLETE");
				if (queries.has(keyword)) throw new Error("LOCAL_EXTERNAL_QUERY_REPEATED_ACROSS_BATCHES");
				queries.add(keyword);
			}
			return { auditId: batch.auditId, summarySha256: batch.summarySha256, observations: rows };
		})
		.sort((a, b) => (a.auditId < b.auditId ? -1 : a.auditId > b.auditId ? 1 : 0));
	const content = {
		schemaVersion: 1,
		provenance: "EXTERNAL_RETAINED_RESPONSE" as const,
		organizationId: input.organizationId,
		target: input.target,
		billingReconciliation: "NOT_VERIFIED" as const,
		applicationLedgerImport: "NOT_APPLIED" as const,
		queryCount: queries.size,
		observationCount: tasks.size,
		providerReportedCostUsd: money(total),
		batches,
	};
	return { content, contentSha256: hash(JSON.stringify(content)) };
}
