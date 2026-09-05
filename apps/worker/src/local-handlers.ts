import { LOCAL_MEASUREMENT_QUEUE } from "@workspace/lib/selena-local-execution";
import type { PgBoss } from "pg-boss";
import {
	type SelenaLocalMeasureData,
	type SelenaLocalMeasureExecutor,
	selenaLocalMeasureJob,
} from "./jobs/selena-local-measure";

/**
 * Register only the Local Visibility consumer. Keeping this module separate
 * from the legacy handler registry makes the process boundary inspectable: a
 * Local worker does not import provider, credential-refresh or scrape-target
 * code before it starts consuming its own queue.
 */
export async function registerLocalHandlers(boss: PgBoss, executor?: SelenaLocalMeasureExecutor): Promise<void> {
	const handler = executor
		? (jobs: Parameters<typeof selenaLocalMeasureJob>[0]) => selenaLocalMeasureJob(jobs, executor)
		: selenaLocalMeasureJob;
	await boss.work<SelenaLocalMeasureData>(LOCAL_MEASUREMENT_QUEUE, { localConcurrency: 1 }, handler);
}
