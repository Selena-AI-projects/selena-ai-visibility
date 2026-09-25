import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { join, sep } from "node:path";
import { z } from "zod";
import { prepareExternalLocalAudit } from "../src/selena-local-external-audit";

// Explicit local inputs only; the script has no database or provider client.
const summarySchema = z.object({
	auditId: z.string(),
	status: z.literal("COMPLETE"),
	unknownCost: z.literal(false),
	requestsSent: z.number().int().positive(),
	responsesSaved: z.number().int().positive(),
	knownCostUsd: z.number().nonnegative(),
	results: z.array(
		z.object({
			pointIndex: z.number().int().min(0).max(8),
			keyword: z.string().optional(),
			coordinate: z.string().optional(),
			request: z.object({ keyword: z.string(), location_coordinate: z.string() }).optional(),
			providerTaskId: z.string(),
			rawFile: z.string().regex(/^raw\/[a-zA-Z0-9._-]+\.json$/),
			rawSha256: z.string(),
			costUsd: z.number().nonnegative(),
			capturedAt: z.iso.datetime().optional(),
			receivedAt: z.iso.datetime().optional(),
			target: z.object({ rankGroup: z.number().int() }).nullable(),
			valid: z.literal(true),
		}),
	),
});
export async function loadLocalExternalAuditSources(directories: readonly string[]) {
	const coordinates: string[] = [];
	const batches = [];
	for (const directory of directories) {
		const root = await realpath(directory);
		const summaryPath = await realpath(join(root, "summary.json"));
		if (summaryPath !== join(root, "summary.json")) throw new Error("LOCAL_EXTERNAL_SOURCE_PATH_INVALID");
		const summaryBody = await readFile(summaryPath, "utf8");
		const summary = summarySchema.parse(JSON.parse(summaryBody));
		if (
			summary.results.length !== summary.requestsSent ||
			summary.results.length !== summary.responsesSaved ||
			Math.round(summary.results.reduce((sum, row) => sum + row.costUsd, 0) * 1_000_000) !==
				Math.round(summary.knownCostUsd * 1_000_000)
		)
			throw new Error("LOCAL_EXTERNAL_SUMMARY_TOTAL_MISMATCH");
		const observations = [];
		for (const row of summary.results) {
			const keyword = row.keyword ?? row.request?.keyword;
			const coordinate = row.coordinate ?? row.request?.location_coordinate;
			const receivedAt = row.receivedAt ?? row.capturedAt;
			if (!keyword || !coordinate || !receivedAt) throw new Error("LOCAL_EXTERNAL_SUMMARY_INCOMPLETE");
			if (coordinates[row.pointIndex] && coordinates[row.pointIndex] !== coordinate)
				throw new Error("LOCAL_EXTERNAL_GRID_MISMATCH");
			coordinates[row.pointIndex] = coordinate;
			const rawPath = await realpath(join(root, row.rawFile));
			if (!rawPath.startsWith(`${root}${sep}raw${sep}`) || rawPath !== join(root, row.rawFile))
				throw new Error("LOCAL_EXTERNAL_SOURCE_PATH_INVALID");
			observations.push({
				pointIndex: row.pointIndex,
				keyword,
				providerTaskId: row.providerTaskId,
				rawBody: await readFile(rawPath, "utf8"),
				rawSha256: row.rawSha256,
				sourceRecordedAt: receivedAt,
				sourceTimeField: row.receivedAt ? ("receivedAt" as const) : ("capturedAt" as const),
				providerReportedCostUsd: String(row.costUsd),
				targetRank: row.target?.rankGroup ?? null,
			});
		}
		batches.push({
			auditId: summary.auditId,
			summarySha256: `sha256:${createHash("sha256").update(summaryBody).digest("hex")}`,
			observations,
		});
	}
	return { coordinates, batches };
}
async function main() {
	const [organizationId, cid, placeId, ...directories] = process.argv.slice(2);
	if (!organizationId || !cid || !placeId || !directories.length) throw new Error("LOCAL_EXTERNAL_ARGUMENTS_REQUIRED");
	const { coordinates, batches } = await loadLocalExternalAuditSources(directories);
	process.stdout.write(
		`${JSON.stringify(
			prepareExternalLocalAudit({ organizationId, target: { cid, placeId }, language: "en", coordinates, batches }),
			null,
			2,
		)}\n`,
	);
}
if (/prepare-local-external-audit\.(ts|js)$/.test(process.argv[1] ?? ""))
	main().catch((error: unknown) => {
		const reason =
			error instanceof z.ZodError
				? error.issues.map((issue) => `${issue.path.join(".")}:${issue.code}`).join(",")
				: error instanceof Error && /^LOCAL_[A-Z_]+$/.test(error.message)
					? error.message
					: "SOURCE_READ_OR_PARSE_FAILED";
		process.stderr.write(`LOCAL_EXTERNAL_PREPARATION_FAILED: ${reason}; no import performed\n`);
		process.exitCode = 1;
	});
