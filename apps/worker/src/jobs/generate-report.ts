import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { reports } from "@workspace/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { Job } from "pg-boss";
import { processReportJob, type ReportJobData, resolveReportOrganizationId } from "../report-worker";

export type GenerateReportData = ReportJobData;

/**
 * Generate a report - runs website analysis, competitor research, and prompt testing.
 * This is a pg-boss job handler.
 */
export async function generateReportJob(jobs: Job<GenerateReportData>[]): Promise<void> {
	// pg-boss v12 passes an array of jobs - process each one
	for (const job of jobs) {
		const { reportId, brandName, brandWebsite, manualPrompts } = job.data;
		const organizationId = await resolveReportOrganizationId(reportId);

		console.log(`Generating report ${reportId} for ${brandName}`);

		const log = (message: string) => console.log(`[Report ${reportId}] ${message}`);
		const updateProgress = async (progress: number) => {
			console.log(`[Report ${reportId}] Progress: ${progress}%`);
			try {
				await withOrganizationTransaction(db, organizationId, async (tx) => {
					await tx
						.update(reports)
						.set({ progress: Math.round(progress) })
						.where(and(eq(reports.id, reportId), eq(reports.organizationId, organizationId)));
				});
			} catch (err) {
				console.error(`[Report ${reportId}] Failed to persist progress:`, err);
			}
		};

		await processReportJob({
			data: {
				reportId,
				organizationId,
				brandName,
				brandWebsite,
				manualPrompts,
			},
			log,
			updateProgress,
		});

		console.log(`Report ${reportId} completed successfully`);
	}
}
