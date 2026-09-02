import { describe, expect, it } from "vitest";
import { projectYouTubeDurableEntities, sanitizeYouTubePrivacyFixture } from "./privacy";
import { createYouTubeRetentionEntry, planYouTubeRetentionCleanup } from "./retention";

describe("YouTube privacy projection", () => {
	it("keeps only the approved ID and metric allowlist", () => {
		expect(
			sanitizeYouTubePrivacyFixture([
				{
					video_id: "video-1",
					shortcode: "short-1",
					youtuber_id: "channel-1",
					views: 42,
					title: "private text must not persist",
					transcript: "speaker data",
					video_url: "https://signed.example/video?expires=123&signature=secret",
					nested: { url: "https://signed.example/nested" },
				},
			]),
		).toEqual([
			{
				video_id: "video-1",
				shortcode: "short-1",
				youtuber_id: "channel-1",
				views: 42,
				title: "[REDACTED_UNALLOWLISTED_FIELD]",
				transcript: "[REDACTED_UNALLOWLISTED_FIELD]",
				video_url: "[REDACTED_UNALLOWLISTED_FIELD]",
				nested: "[REDACTED_UNALLOWLISTED_FIELD]",
			},
		]);
	});

	it("drops media and personal text from normalized durable entities", () => {
		const provenance = {
			datasetKey: "youtube_videos" as const,
			snapshotId: "sync_fixture",
			capturedAt: "2026-09-02T00:00:00.000Z",
			fields: ["video_id", "title", "video_url", "views"],
		};
		const projected = projectYouTubeDurableEntities([
			{
				entityType: "social_actor",
				platform: "youtube",
				platformId: "channel-1",
				aliases: ["public-handle"],
				displayName: "Channel name",
				provenance,
			},
			{
				entityType: "social_content",
				contentType: "video",
				platform: "youtube",
				platformId: "video-1",
				aliases: ["short-1"],
				title: "Title",
				text: "Description",
				canonicalUrl: "https://youtube.com/watch?v=video-1",
				provenance,
			},
			{
				entityType: "engagement_snapshot",
				platform: "youtube",
				subjectPlatformId: "video-1",
				metrics: { views: 42, likes: 3, unknown_metric: 99 },
				provenance,
			},
			{
				entityType: "media_asset",
				platform: "youtube",
				ownerPlatformId: "video-1",
				mediaType: "video",
				url: "https://signed.example/video",
				provenance,
			},
		]);

		expect(projected).toEqual([
			{
				entityType: "social_actor",
				platform: "youtube",
				platformId: "channel-1",
				aliases: [],
				provenance: { ...provenance, fields: ["video_id", "views"] },
			},
			{
				entityType: "social_content",
				contentType: "video",
				platform: "youtube",
				platformId: "video-1",
				aliases: ["short-1"],
				provenance: { ...provenance, fields: ["video_id", "views"] },
			},
			{
				entityType: "engagement_snapshot",
				platform: "youtube",
				subjectPlatformId: "video-1",
				metrics: { views: 42, likes: 3 },
				provenance: { ...provenance, fields: ["video_id", "views"] },
			},
		]);
	});
});

describe("YouTube retention cleanup planner", () => {
	it("creates bounded expiry entries and plans only same-tenant cleanup", () => {
		const fixture = createYouTubeRetentionEntry({
			id: "fixture-1",
			organizationId: "org-1",
			projectId: "project-1",
			kind: "sanitized_fixture",
			createdAt: "2026-09-02T00:00:00.000Z",
		});
		const metrics = createYouTubeRetentionEntry({
			id: "metrics-1",
			organizationId: "org-1",
			projectId: "project-1",
			kind: "durable_metrics",
			createdAt: "2026-09-02T00:00:00.000Z",
		});
		const otherTenant = createYouTubeRetentionEntry({
			id: "fixture-other",
			organizationId: "org-2",
			projectId: "project-1",
			kind: "sanitized_fixture",
			createdAt: "2026-09-02T00:00:00.000Z",
		});

		expect(fixture.expiresAt).toBe("2026-09-03T00:00:00.000Z");
		expect(metrics.expiresAt).toBe("2026-12-01T00:00:00.000Z");
		expect(
			planYouTubeRetentionCleanup(
				[fixture, metrics, otherTenant],
				{ organizationId: "org-1", projectId: "project-1" },
				"2026-09-03T00:00:00.000Z",
			),
		).toEqual([{ id: "fixture-1", kind: "sanitized_fixture", expiresAt: fixture.expiresAt, reason: "EXPIRED" }]);
	});
});
