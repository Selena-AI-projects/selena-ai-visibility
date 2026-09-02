import { describe, expect, it } from "vitest";
import {
	assertYouTubeDurablePersistenceAccess,
	buildYouTubeDurableMetric,
	YouTubePersistenceGuardError,
} from "./youtube-durable-persistence";

const provenance = {
	datasetKey: "youtube_videos" as const,
	snapshotId: "sync_fixture",
	capturedAt: "2026-09-02T00:00:00.000Z",
	fields: ["video_id", "shortcode", "youtuber_id", "views", "likes", "comments_count"],
};

const entities = [
	{
		entityType: "social_content" as const,
		contentType: "video" as const,
		platform: "youtube" as const,
		platformId: "video-1",
		aliases: ["short-1"],
		canonicalUrl: "https://youtube.com/watch?v=video-1",
		title: "must not persist",
		provenance,
	},
	{
		entityType: "social_actor" as const,
		platform: "youtube" as const,
		platformId: "channel-1",
		aliases: ["channel-handle"],
		displayName: "must not persist",
		provenance,
	},
	{
		entityType: "engagement_snapshot" as const,
		platform: "youtube" as const,
		subjectPlatformId: "video-1",
		metrics: { views: 42, likes: 3, comments_count: 1, unknown_metric: 99 },
		provenance,
	},
	{
		entityType: "media_asset" as const,
		platform: "youtube" as const,
		ownerPlatformId: "video-1",
		mediaType: "video" as const,
		url: "https://signed.example/video",
		provenance,
	},
];

describe("YouTube durable persistence guard", () => {
	it("requires both feature flag and approved capability", () => {
		expect(() =>
			assertYouTubeDurablePersistenceAccess({
				organizationId: "org-1",
				projectId: "project-1",
				featureEnabled: false,
				capabilityStatus: "ALLOWED",
			}),
		).toThrowError(new YouTubePersistenceGuardError("YOUTUBE_CUSTOMER_API_DISABLED"));
		expect(() =>
			assertYouTubeDurablePersistenceAccess({
				organizationId: "org-1",
				projectId: "project-1",
				featureEnabled: true,
				capabilityStatus: "CANARY_ONLY",
			}),
		).toThrowError(new YouTubePersistenceGuardError("YOUTUBE_DATASET_NOT_APPROVED"));
		expect(() =>
			assertYouTubeDurablePersistenceAccess({
				organizationId: "org-1",
				projectId: "project-1",
				featureEnabled: true,
				capabilityStatus: "PILOT_ONLY",
			}),
		).not.toThrow();
	});

	it("builds only the tenant-safe ID and metric projection", () => {
		expect(
			buildYouTubeDurableMetric({
				snapshotId: "sync_fixture",
				capturedAt: "2026-09-02T00:00:00.000Z",
				contentSha256: `sha256:${"a".repeat(64)}`,
				schemaVersion: "brightdata-youtube-canary-report-v1",
				entities,
			}),
		).toEqual({
			snapshotId: "sync_fixture",
			videoId: "video-1",
			shortcode: "short-1",
			youtuberId: "channel-1",
			views: 42,
			likes: 3,
			commentsCount: 1,
			contentSha256: `sha256:${"a".repeat(64)}`,
			schemaVersion: "brightdata-youtube-canary-report-v1",
			capturedAt: "2026-09-02T00:00:00.000Z",
		});
	});
});
