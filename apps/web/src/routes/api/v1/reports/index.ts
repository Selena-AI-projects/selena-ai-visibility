/**
 * /api/v1/reports - External API endpoint for report generation
 * Protected by both the deployment admin-key gate and tenant API-key registry.
 * The same bearer must pass both so legacy automation remains explicitly
 * allowlisted without bypassing tenant attribution or RLS.
 *
 * POST: Create a new report and queue generation.
 * GET: List reports with pagination.
 */
import { createFileRoute } from "@tanstack/react-router";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { type NewReport, reports } from "@workspace/lib/db/schema";
import { cleanOnboardingUrl } from "@workspace/lib/onboarding";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, createApiHandler } from "@/lib/api/handler";
import { sendReportJob } from "@/lib/job-scheduler";
import { canWrite, resolveApiKeyAuthContext } from "@/lib/selena-auth-context";

const createReportBody = z.object({
	brandName: z
		.string("brandName is required and must be a non-empty string")
		.trim()
		.min(1, "brandName is required and must be a non-empty string"),
	// The report worker fetches this page, so reject anything it can't fetch
	// (non-http(s) schemes) before the row exists and the job is queued.
	brandWebsite: z
		.string("brandWebsite is required and must be a non-empty string")
		.trim()
		.min(1, "brandWebsite is required and must be a non-empty string")
		.refine((website) => cleanOnboardingUrl(website) !== "", "brandWebsite must be a valid domain or http(s) URL"),
	manualPrompts: z.array(z.string()).optional(),
});

function mapReportApiError(error: unknown): ApiError | undefined {
	if (error instanceof Error && error.message.startsWith("Unauthorized:")) {
		return new ApiError(401, "Unauthorized", "Valid API credentials are required");
	}
}

export const Route = createFileRoute("/api/v1/reports/")({
	server: {
		handlers: {
			POST: createApiHandler({
				body: createReportBody,
				status: 201,
				mapError: mapReportApiError,
				handle: async ({ body, request }) => {
					const auth = await resolveApiKeyAuthContext(request);
					if (!canWrite(auth)) {
						throw new ApiError(403, "Forbidden", "API credentials do not permit report creation");
					}
					const filteredPrompts = (body.manualPrompts ?? []).map((p) => p.trim()).filter((p) => p.length > 0);
					const parsedManualPrompts = filteredPrompts.length > 0 ? filteredPrompts : undefined;

					const newReport: NewReport = {
						brandName: body.brandName,
						// Full path is kept — it's what the analysis reads — but credentials
						// are stripped before the URL is stored or handed to any fetcher.
						brandWebsite: cleanOnboardingUrl(body.brandWebsite),
						organizationId: auth.tenantId,
						status: "pending",
					};

					const result = await withOrganizationTransaction(db, auth.tenantId, (tx) =>
						tx.insert(reports).values(newReport).returning(),
					);
					const createdReport = result[0];
					if (!createdReport) {
						throw new ApiError(500, "Internal Server Error", "Failed to create report");
					}

					const success = await sendReportJob(
						createdReport.id,
						createdReport.brandName,
						createdReport.brandWebsite,
						parsedManualPrompts,
					);

					if (!success) {
						await withOrganizationTransaction(db, auth.tenantId, async (tx) => {
							await tx
								.update(reports)
								.set({ status: "failed", updatedAt: new Date() })
								.where(and(eq(reports.id, createdReport.id), eq(reports.organizationId, auth.tenantId)));
						});
						throw new ApiError(500, "Internal Server Error", "Failed to queue report generation");
					}

					return {
						reportId: createdReport.id,
						status: createdReport.status,
						brandName: createdReport.brandName,
						brandWebsite: createdReport.brandWebsite,
						createdAt: createdReport.createdAt,
					};
				},
			}),

			GET: createApiHandler({
				mapError: mapReportApiError,
				handle: async ({ request }) => {
					const auth = await resolveApiKeyAuthContext(request);
					const { searchParams } = new URL(request.url);
					const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
					const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
					const offset = (page - 1) * limit;

					const { totalCount, reportsList } = await withOrganizationTransaction(db, auth.tenantId, async (tx) => {
						const [totalCountResult] = await tx
							.select({ count: count() })
							.from(reports)
							.where(eq(reports.organizationId, auth.tenantId));
						const reportsList = await tx
							.select({
								id: reports.id,
								brandName: reports.brandName,
								brandWebsite: reports.brandWebsite,
								status: reports.status,
								createdAt: reports.createdAt,
								completedAt: reports.completedAt,
							})
							.from(reports)
							.where(eq(reports.organizationId, auth.tenantId))
							.orderBy(desc(reports.createdAt))
							.limit(limit)
							.offset(offset);
						return { totalCount: totalCountResult?.count || 0, reportsList };
					});
					const totalPages = Math.ceil(totalCount / limit);

					return {
						reports: reportsList,
						pagination: { page, limit, total: totalCount, totalPages },
					};
				},
			}),
		},
	},
});
