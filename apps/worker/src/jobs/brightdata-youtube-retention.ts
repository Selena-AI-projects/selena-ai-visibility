import * as Sentry from "@sentry/node";
import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Job } from "pg-boss";

const CANARY_DIRECTORY_PATTERN = /^selena-brightdata-youtube-canary-\d+$/;
const FIXTURE_RETENTION_MS = 24 * 60 * 60 * 1_000;

export interface BrightDataYouTubeRetentionData {
	source?: string;
}

export interface BrightDataYouTubeRetentionScheduler {
	schedule(name: string, cron: string, data: BrightDataYouTubeRetentionData, options: { tz: string }): Promise<unknown>;
	unschedule(name: string): Promise<unknown>;
}

export type BrightDataYouTubeRetentionFs = Readonly<{
	readDirectory: typeof readdir;
	stat: typeof stat;
	remove: typeof rm;
}>;

const defaultFs: BrightDataYouTubeRetentionFs = Object.freeze({
	readDirectory: readdir,
	stat,
	remove: rm,
});

export function isYouTubeRetentionEnabled(value: string | undefined): boolean {
	return value === "true";
}

function artifactRoot(value: string | undefined): string | null {
	const root = value?.trim();
	if (!root || root === "/" || root === "/tmp" || root.endsWith("/")) return null;
	return root;
}

/**
 * Remove only stale, name-matched canary directories below an explicit root.
 * This never removes the root itself and never traverses arbitrary children.
 */
export async function cleanupBrightDataYouTubeCanaryArtifacts(
	root: string,
	nowMs = Date.now(),
	fs: BrightDataYouTubeRetentionFs = defaultFs,
): Promise<number> {
	const safeRoot = artifactRoot(root);
	if (!safeRoot) throw new Error("BRIGHTDATA_YOUTUBE_RETENTION_ARTIFACT_ROOT_INVALID");
	const entries = await fs.readDirectory(safeRoot, { withFileTypes: true });
	let removed = 0;
	for (const entry of entries) {
		if (!entry.isDirectory() || !CANARY_DIRECTORY_PATTERN.test(entry.name)) continue;
		const directory = join(safeRoot, entry.name);
		const details = await fs.stat(directory);
		if (nowMs - details.mtimeMs < FIXTURE_RETENTION_MS) continue;
		await fs.remove(directory, { recursive: true, force: true });
		removed += 1;
	}
	return removed;
}

export async function reconcileBrightDataYouTubeRetentionSchedule(
	scheduler: BrightDataYouTubeRetentionScheduler,
	enabledValue: string | undefined,
	rootValue: string | undefined,
): Promise<void> {
	if (isYouTubeRetentionEnabled(enabledValue) && artifactRoot(rootValue)) {
		await scheduler.schedule(
			"brightdata-youtube-retention",
			"45 4 * * *",
			{ source: "scheduled" },
			{ tz: "UTC" },
		);
		return;
	}
	await scheduler.unschedule("brightdata-youtube-retention");
}

/**
 * Deletes temporary canary fixtures only. Durable metrics are intentionally
 * excluded until a dedicated tenant/project-scoped table exists.
 */
export async function brightDataYouTubeRetentionJob(jobs: Job<BrightDataYouTubeRetentionData>[]): Promise<void> {
	if (!isYouTubeRetentionEnabled(process.env.SELENA_YOUTUBE_RETENTION_ENABLED)) {
		console.log("[brightdata-youtube-retention] Skipped: feature flag is not true");
		return;
	}
	const root = artifactRoot(process.env.SELENA_BRIGHTDATA_CANARY_ARTIFACT_ROOT);
	if (!root) throw new Error("BRIGHTDATA_YOUTUBE_RETENTION_ARTIFACT_ROOT_REQUIRED");
	for (const job of jobs) {
		try {
			const removed = await cleanupBrightDataYouTubeCanaryArtifacts(root);
			console.log(
				`[brightdata-youtube-retention] Removed ${removed} expired canary fixture(s) (source: ${job.data?.source ?? "scheduled"})`,
			);
		} catch (error) {
			console.error("[brightdata-youtube-retention] Failed:", error);
			Sentry.captureException(error);
			throw error;
		}
	}
}
