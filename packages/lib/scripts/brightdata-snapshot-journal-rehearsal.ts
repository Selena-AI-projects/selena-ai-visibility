import { and, asc, eq, sql } from "drizzle-orm";
import { createPostgresBrightDataSnapshotJournal } from "../src/adapters/brightdata-snapshot-journal";
import { db } from "../src/db/db";
import * as schema from "../src/db/schema";

const organizationId = "gate12-release";
const snapshotId = "brightdata-journal-adapter-snapshot";

async function main(): Promise<void> {
	const [project] = await db
		.select({ id: schema.svProjects.id })
		.from(schema.svProjects)
		.where(and(eq(schema.svProjects.organizationId, organizationId), eq(schema.svProjects.name, "Gate 12 Project")))
		.limit(1);
	if (!project) throw new Error("BRIGHTDATA_SNAPSHOT_JOURNAL_REHEARSAL_PROJECT_MISSING");

	const journal = createPostgresBrightDataSnapshotJournal({ db, organizationId, projectId: project.id });
	await journal.record({
		source: "YOUTUBE_VIDEOS",
		datasetId: "gd_youtube_rehearsal",
		snapshotId,
		phase: "TRIGGERED",
		observedAt: "2026-09-01T00:00:00.000Z",
	});
	await journal.record({
		source: "YOUTUBE_VIDEOS",
		datasetId: "gd_youtube_rehearsal",
		snapshotId,
		phase: "PENDING",
		providerStatus: "running",
		observedAt: "2026-09-01T00:00:01.000Z",
	});
	await journal.record({
		source: "YOUTUBE_VIDEOS",
		datasetId: "gd_youtube_rehearsal",
		snapshotId,
		phase: "READY",
		providerStatus: "ready",
		observedAt: "2026-09-01T00:00:02.000Z",
	});
	const delivered = {
		source: "YOUTUBE_VIDEOS" as const,
		datasetId: "gd_youtube_rehearsal",
		snapshotId,
		phase: "DELIVERED" as const,
		recordCount: 1,
		observedAt: "2026-09-01T00:00:03.000Z",
	};
	await journal.record(delivered);
	await journal.record(delivered);

	const events = await db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.organization_id', ${organizationId}, true)`);
		return tx
			.select({ phase: schema.svProviderDatasetSnapshotEvents.phase })
			.from(schema.svProviderDatasetSnapshotEvents)
			.where(
				and(
					eq(schema.svProviderDatasetSnapshotEvents.organizationId, organizationId),
					eq(schema.svProviderDatasetSnapshotEvents.projectId, project.id),
					eq(schema.svProviderDatasetSnapshotEvents.snapshotId, snapshotId),
				),
			)
			.orderBy(asc(schema.svProviderDatasetSnapshotEvents.observedAt));
	});
	const phases = events.map((event) => event.phase);
	if (JSON.stringify(phases) !== JSON.stringify(["TRIGGERED", "PENDING", "READY", "DELIVERED"]))
		throw new Error(`BRIGHTDATA_SNAPSHOT_JOURNAL_REHEARSAL_PHASES:${phases.join(",")}`);

	console.log(`BRIGHTDATA_SNAPSHOT_JOURNAL_ADAPTER_PASS project=${project.id} events=${events.length}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
