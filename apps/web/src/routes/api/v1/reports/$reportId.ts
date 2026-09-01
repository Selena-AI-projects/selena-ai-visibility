/**
 * /api/v1/reports/:reportId - External API endpoint for report status/data
 * Protected by both the deployment admin-key gate and tenant API-key registry.
 * The same bearer must pass both so report IDs never become a tenant bootstrap.
 *
 * GET: Poll report status. When completed, returns per-prompt snapshot data
 *      (mentions with top-K competitors).
 *      Consumers are responsible for computing SoV and other derived metrics.
 */
import { createFileRoute } from "@tanstack/react-router";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { reports } from "@workspace/lib/db/schema";
import { computeReportUnstableStats } from "@workspace/lib/report-metrics";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, createApiHandler } from "@/lib/api/handler";
import { resolveApiKeyAuthContext } from "@/lib/selena-auth-context";

function mapReportApiError(error: unknown): ApiError | undefined {
	if (error instanceof Error && error.message.startsWith("Unauthorized:")) {
		return new ApiError(401, "Unauthorized", "Valid API credentials are required");
	}
}

export const Route = createFileRoute("/api/v1/reports/$reportId")({
	server: {
		handlers: {
			GET: createApiHandler({
				params: z.object({ reportId: z.guid("Invalid report ID format") }),
				mapError: mapReportApiError,
				handle: async ({ params, request }) => {
					const { reportId } = params;
					const auth = await resolveApiKeyAuthContext(request);

					const result = await withOrganizationTransaction(db, auth.tenantId, (tx) =>
						tx
							.select()
							.from(reports)
							.where(and(eq(reports.id, reportId), eq(reports.organizationId, auth.tenantId)))
							.limit(1),
					);
					if (result.length === 0) {
						throw new ApiError(404, "Not Found", `Report with ID '${reportId}' not found`);
					}

					const report = result[0];

					// For non-completed reports, return status with progress
					if (report.status !== "completed" || !report.rawOutput) {
						return {
							reportId: report.id,
							status: report.status,
							progress: report.progress,
							brandName: report.brandName,
							brandWebsite: report.brandWebsite,
							createdAt: report.createdAt,
							completedAt: report.completedAt,
						};
					}

					const { searchParams } = new URL(request.url);

					// Top-K params applied to each prompt's snapshot
					const kMentionsParam = Number.parseInt(searchParams.get("kMentions") || "5", 10);
					const kMentions = Number.isNaN(kMentionsParam) ? 5 : Math.max(1, Math.min(50, kMentionsParam));

					// Parse raw output
					const rawOutput = report.rawOutput as {
						competitors: Array<{ name: string; domain: string }>;
						prompts: Array<{ value: string }>;
						promptRuns: Array<{
							promptValue: string;
							runs: Array<{
								model: string;
								brandMentioned: boolean;
								competitorsMentioned: string[];
							}>;
						}>;
					};

					// Build per-prompt snapshot data
					const allPromptSnapshots = rawOutput.promptRuns.map((pr) => {
						const totalRuns = pr.runs.length;
						let brandMentionsTotal = 0;
						let competitorMentionsTotal = 0;
						const competitorCounts: Record<string, number> = {};

						for (const run of pr.runs) {
							if (run.brandMentioned) brandMentionsTotal++;
							for (const comp of run.competitorsMentioned) {
								competitorCounts[comp] = (competitorCounts[comp] || 0) + 1;
								competitorMentionsTotal++;
							}
						}

						// Sort competitors by count descending, take top K
						const mentionsTopK = Object.entries(competitorCounts)
							.map(([entity, count]) => ({ entity, count }))
							.sort((a, b) => b.count - a.count)
							.slice(0, kMentions);

						return {
							promptValue: pr.promptValue,
							totalRuns,
							mentions: {
								mentionsTotal: brandMentionsTotal + competitorMentionsTotal,
								brandMentionsTotal,
								competitorMentionsTotal,
								mentionsTopK,
							},
						};
					});

					// Compute unstable derived stats
					const unstable = computeReportUnstableStats(rawOutput);

					return {
						reportId: report.id,
						status: report.status,
						brandName: report.brandName,
						brandWebsite: report.brandWebsite,
						createdAt: report.createdAt,
						completedAt: report.completedAt,
						prompts: allPromptSnapshots,
						unstable,
					};
				},
			}),
		},
	},
});
