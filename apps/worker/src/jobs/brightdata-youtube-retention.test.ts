import assert from "node:assert/strict";
import test from "node:test";
import {
	cleanupBrightDataYouTubeCanaryArtifacts,
	reconcileBrightDataYouTubeRetentionSchedule,
	type BrightDataYouTubeRetentionFs,
} from "./brightdata-youtube-retention";

test("removes only stale canary directories below the explicit root", async () => {
	const removed: string[] = [];
	const fs = {
		readDirectory: async () =>
			[
				{ name: "selena-brightdata-youtube-canary-1", isDirectory: () => true },
				{ name: "selena-brightdata-youtube-canary-2", isDirectory: () => true },
				{ name: "unrelated", isDirectory: () => true },
			] as never,
		stat: async (path: string) => ({ mtimeMs: path.endsWith("-1") ? 0 : Date.now() }) as never,
		remove: async (path: string) => {
			removed.push(path);
		},
	} as unknown as BrightDataYouTubeRetentionFs;

	const count = await cleanupBrightDataYouTubeCanaryArtifacts("/var/tmp/selena-canaries", Date.now(), fs);
	assert.equal(count, 1);
	assert.deepEqual(removed, ["/var/tmp/selena-canaries/selena-brightdata-youtube-canary-1"]);
});

test("does not schedule without an explicit artifact root", async () => {
	const calls: string[] = [];
	const scheduler = {
		schedule: async () => calls.push("schedule"),
		unschedule: async () => calls.push("unschedule"),
	};

	await reconcileBrightDataYouTubeRetentionSchedule(scheduler, "true", "/tmp");
	assert.deepEqual(calls, ["unschedule"]);
});
