import * as Sentry from "@sentry/node";
import { getDeployment } from "@workspace/deployment";
import type { OnboardingSuggestion } from "@workspace/lib/onboarding";
import type { Job, PgBoss } from "pg-boss";
import { type AnalyzeBrandData, analyzeBrandJob } from "./jobs/analyze-brand";
import { type GenerateReportData, generateReportJob } from "./jobs/generate-report";
import { type ProcessPromptData, processPromptJob } from "./jobs/process-prompt";
import { type ScheduleMaintenanceData, scheduleMaintenanceJob } from "./jobs/schedule-maintenance";
import { type SelenaAnswerRetentionData, selenaAnswerRetentionJob } from "./jobs/selena-answer-retention";
import { type SelenaMeasureData, selenaMeasureJob } from "./jobs/selena-measure";
import { type SyncAuth0MembershipsData, syncAuth0MembershipsJob } from "./jobs/sync-auth0-memberships";
import {
	brightDataYouTubeRetentionJob,
	type BrightDataYouTubeRetentionData,
} from "./jobs/brightdata-youtube-retention";

/**
 * Wraps a pg-boss handler to report errors to Sentry before re-throwing.
 * Preserves the handler's return value (stored by pg-boss as the job output).
 */
function withSentry<T, R>(queueName: string, handler: (jobs: Job<T>[]) => Promise<R>): (jobs: Job<T>[]) => Promise<R> {
	return async (jobs) => {
		try {
			return await handler(jobs);
		} catch (error) {
			Sentry.withScope((scope) => {
				scope.setTag("queue", queueName);
				Sentry.captureException(error);
			});
			throw error;
		}
	};
}

/**
 * Register all job handlers with pg-boss.
 */
export async function registerHandlers(boss: PgBoss): Promise<void> {
	await boss.work<ProcessPromptData>(
		"process-prompt",
		{ localConcurrency: 10 },
		withSentry("process-prompt", processPromptJob),
	);
	console.log("Registered handler: process-prompt");

	if (getDeployment().features.reportGeneration) {
		await boss.work<GenerateReportData>(
			"generate-report",
			{ localConcurrency: 2 },
			withSentry("generate-report", generateReportJob),
		);
		console.log("Registered handler: generate-report");
	}

	// batchSize: 1 keeps the returned suggestion mapped 1:1 to a single job's
	// output, which the web app reads back via getJobById.
	await boss.work<AnalyzeBrandData, OnboardingSuggestion>(
		"analyze-brand",
		{ batchSize: 1, localConcurrency: 2 },
		withSentry("analyze-brand", analyzeBrandJob),
	);
	console.log("Registered handler: analyze-brand");

	await boss.work<ScheduleMaintenanceData>(
		"schedule-maintenance",
		{ localConcurrency: 1 },
		withSentry("schedule-maintenance", scheduleMaintenanceJob),
	);
	console.log("Registered handler: schedule-maintenance");

	await boss.work<SelenaAnswerRetentionData>(
		"selena-answer-retention",
		{ localConcurrency: 1 },
		withSentry("selena-answer-retention", selenaAnswerRetentionJob),
	);
	console.log("Registered handler: selena-answer-retention");

	await boss.work<BrightDataYouTubeRetentionData>(
		"brightdata-youtube-retention",
		{ localConcurrency: 1 },
		withSentry("brightdata-youtube-retention", brightDataYouTubeRetentionJob),
	);
	console.log("Registered handler: brightdata-youtube-retention");

	// localConcurrency 1: a commercial cycle's spend is bounded by its permits,
	// and serial execution keeps that bound easy to observe.
	await boss.work<SelenaMeasureData>(
		"selena-measure",
		{ localConcurrency: 1 },
		withSentry("selena-measure", selenaMeasureJob),
	);
	console.log("Registered handler: selena-measure");

	if (process.env.DEPLOYMENT_MODE === "whitelabel") {
		await boss.work<SyncAuth0MembershipsData>(
			"sync-auth0-memberships",
			{ localConcurrency: 1 },
			withSentry("sync-auth0-memberships", syncAuth0MembershipsJob),
		);
		console.log("Registered handler: sync-auth0-memberships");
	}
}
