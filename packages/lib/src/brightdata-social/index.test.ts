import { describe, expect, it, vi } from "vitest";
import {
	type BrightDataSnapshotJournalEntry,
	createBrightDataDatasetClient,
} from "../providers/brightdata-dataset-client";
import type { ProviderDatasetAccessRequest, ProviderDatasetEnvKey } from "../providers/dataset-registry";
import {
	BrightDataSocialPolicyError,
	BrightDataSocialTransportError,
	brightDataSocialDatasetKeys,
	brightDataSocialDatasetRegistry,
	brightDataSocialNormalizers,
	createBrightDataSocialCollector,
	createBrightDataSocialTransport,
	proposedBrightDataSocialWorkflowMapping,
} from "./index";

function json(value: unknown, status = 200): Response {
	return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

const access: ProviderDatasetAccessRequest = {
	mode: "CANARY",
	environment: "ISOLATED_CANARY",
	ownerApproved: true,
	schemaDiscoveryOnly: true,
	providerCalls: 1,
	recurring: false,
	worstCaseCostUsd: 0.01,
	approvedCostCapUsd: 0.01,
	redactionPolicyApproved: true,
	privacyReviewApproved: true,
	retentionReviewApproved: true,
};

const datasetEnvironment = Object.freeze(
	Object.fromEntries(
		Object.values(brightDataSocialDatasetRegistry).map((dataset) => [dataset.envKey, dataset.datasetId]),
	) as Partial<Record<ProviderDatasetEnvKey, string>>,
);

function createHarness(fetchImpl: typeof fetch) {
	let nowMs = Date.parse("2026-08-31T00:00:00.000Z");
	const entries: BrightDataSnapshotJournalEntry[] = [];
	const sleep = async (milliseconds: number) => {
		nowMs += milliseconds;
	};
	const transport = createBrightDataSocialTransport({
		apiToken: "test-token-that-must-not-leak",
		fetchImpl,
		retryDelayMs: 10,
		sleep,
		now: () => nowMs,
	});
	const client = createBrightDataDatasetClient({
		transport,
		journal: { record: async (entry) => void entries.push(entry) },
		lifecycle: {
			timeoutMs: 1_000,
			pollIntervalMs: 10,
			cancelTimeoutMs: 100,
			readyStatuses: ["ready"],
			pendingStatuses: ["triggered", "starting", "running"],
			terminalFailureStatuses: ["failed", "canceled", "cancelled", "error"],
		},
		now: () => nowMs,
		nowIso: () => new Date(nowMs).toISOString(),
		sleep,
	});
	return { client, entries, transport };
}

describe("Bright Data social registry", () => {
	it("pins eight discovered contracts without enabling a project", () => {
		expect(brightDataSocialDatasetKeys).toHaveLength(8);
		expect(Object.keys(brightDataSocialDatasetRegistry)).toEqual(brightDataSocialDatasetKeys);
		expect(brightDataSocialDatasetRegistry.instagram_reels).toMatchObject({
			datasetId: "gd_lyclm20il4r5helnj",
			triggerQuery: { type: "discover_new", discover_by: "url" },
			rawRetention: "disabled",
		});
		expect(brightDataSocialDatasetRegistry.instagram_comments).toMatchObject({
			datasetId: "gd_ltppn085pokosxh13",
			runtimeStatus: "blocked_cost_and_pii",
			expectedMaxOutputRecords: 0,
		});
		expect(brightDataSocialDatasetRegistry.youtube_videos.collectionMode).toBe("sync_scrape");
		expect(proposedBrightDataSocialWorkflowMapping).toEqual({
			SOCIAL_INTELLIGENCE: ["instagram_profiles", "tiktok_profiles"],
			REPUTATION: ["reddit_posts"],
			CONTENT_VISIBILITY: ["instagram_posts", "instagram_reels", "tiktok_posts", "youtube_videos"],
		});
	});
});

describe("Bright Data social policy boundary", () => {
	it("is default-off and refuses before any provider request", async () => {
		const fetchImpl = vi.fn<typeof fetch>();
		const harness = createHarness(fetchImpl);
		const collector = createBrightDataSocialCollector({ client: harness.client, datasetEnvironment });

		await expect(
			collector.collect({
				projectId: "project-a",
				workflow: "SOCIAL_INTELLIGENCE",
				datasetKey: "tiktok_profiles",
				input: { url: "https://www.tiktok.com/@tiktok" },
				access,
			}),
		).rejects.toMatchObject({ code: "BRIGHTDATA_SOCIAL_PROJECT_NOT_ALLOWED" });
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("blocks Instagram Comments even if a project policy names it", async () => {
		const fetchImpl = vi.fn<typeof fetch>();
		const harness = createHarness(fetchImpl);
		const collector = createBrightDataSocialCollector({
			client: harness.client,
			datasetEnvironment,
			policy: { projectA: { REPUTATION: ["instagram_comments"] } },
		});

		await expect(
			collector.collect({
				projectId: "projectA",
				workflow: "REPUTATION",
				datasetKey: "instagram_comments",
				input: { url: "https://www.instagram.com/reel/example/" },
				access,
			}),
		).rejects.toMatchObject({ code: "BRIGHTDATA_SOCIAL_DATASET_BLOCKED_COST_AND_PII" });
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("requires the validated Reels cardinality and explicit cost ceiling", async () => {
		const fetchImpl = vi.fn<typeof fetch>();
		const harness = createHarness(fetchImpl);
		const collector = createBrightDataSocialCollector({
			client: harness.client,
			datasetEnvironment,
			policy: { projectA: { CONTENT_VISIBILITY: ["instagram_reels"] } },
		});

		await expect(
			collector.collect({
				projectId: "projectA",
				workflow: "CONTENT_VISIBILITY",
				datasetKey: "instagram_reels",
				input: { url: "https://www.instagram.com/instagram/", num_of_posts: 2 },
				access,
			}),
		).rejects.toMatchObject({ code: "BRIGHTDATA_SOCIAL_REELS_LIMIT_REQUIRED" });
		await expect(
			collector.collect({
				projectId: "projectA",
				workflow: "CONTENT_VISIBILITY",
				datasetKey: "instagram_reels",
				input: { url: "https://www.instagram.com/instagram/", num_of_posts: 1 },
				access: { ...access, approvedCostCapUsd: 0 },
			}),
		).rejects.toMatchObject({ code: "BRIGHTDATA_SOCIAL_COST_LIMIT_EXCEEDED" });
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});

describe("shared client with the social transport", () => {
	it("uses synchronous scrape for YouTube and never calls the async trigger", async () => {
		const calls: { url: string; init?: RequestInit }[] = [];
		const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
			const url = String(input);
			calls.push({ url, init });
			if (url.endsWith("/datasets/gd_lk56epmy2i5g7lzu0k/metadata"))
				return json({ id: "gd_lk56epmy2i5g7lzu0k", fields: { video_id: {}, youtuber_id: {}, url: {} } });
			if (url.includes("/datasets/v3/scrape?"))
				return json([
					{
						video_id: "dQw4w9WgXcQ",
						youtuber_id: "UC-1",
						url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
						title: "Fixture video",
						views: 1,
					},
				]);
			throw new Error(`unexpected test request: ${url}`);
		});
		const harness = createHarness(fetchImpl);
		const collector = createBrightDataSocialCollector({
			client: harness.client,
			datasetEnvironment,
			policy: { projectA: { CONTENT_VISIBILITY: ["youtube_videos"] } },
		});

		const result = await collector.collect({
			projectId: "projectA",
			workflow: "CONTENT_VISIBILITY",
			datasetKey: "youtube_videos",
			input: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
			access,
		});

		expect(calls.filter((call) => call.url.includes("/datasets/v3/scrape?")).length).toBe(1);
		expect(calls.some((call) => call.url.includes("/datasets/v3/trigger?"))).toBe(false);
		expect(JSON.parse(String(calls.find((call) => call.url.includes("/scrape?"))?.init?.body))).toEqual([
			{ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
		]);
		expect(harness.entries.map((entry) => entry.phase)).toEqual(["TRIGGERED", "DELIVERED"]);
		expect(result).toMatchObject({ status: "COMPLETE", estimatedCostUsd: 0.0015 });
		if (result.status !== "COMPLETE") throw new Error("expected complete fixture");
		expect(result.snapshotId).toMatch(/^sync_[0-9a-f]{64}$/);
	});

	it("preflights, records snapshot authority, triggers once and returns no raw payload", async () => {
		let progressCalls = 0;
		let downloadCalls = 0;
		const calls: { url: string; init?: RequestInit }[] = [];
		let entries: BrightDataSnapshotJournalEntry[] = [];
		const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
			const url = String(input);
			calls.push({ url, init });
			if (url.endsWith("/datasets/gd_lu702nij2f790tmv9h/metadata"))
				return json({ id: "gd_lu702nij2f790tmv9h", fields: { post_id: {}, account_id: {}, url: {} } });
			if (url.includes("/datasets/v3/trigger?")) return json({ snapshot_id: "sd_test_1" });
			if (url.endsWith("/datasets/v3/progress/sd_test_1")) {
				expect(entries.some((entry) => entry.phase === "TRIGGERED")).toBe(true);
				progressCalls += 1;
				return json({ status: progressCalls === 1 ? "running" : "ready" });
			}
			if (url.includes("/datasets/v3/snapshot/sd_test_1?")) {
				downloadCalls += 1;
				if (downloadCalls === 1) return json({ status: "building" }, 202);
				return json([
					{
						post_id: "6718335390845095173",
						account_id: "actor-1",
						url: "https://www.tiktok.com/@example/video/6718335390845095173",
						description: "visible text",
						likes: 42,
						provider_private_field: "raw-only-value",
					},
				]);
			}
			throw new Error(`unexpected test request: ${url}`);
		});
		const harness = createHarness(fetchImpl);
		entries = harness.entries;
		const collector = createBrightDataSocialCollector({
			client: harness.client,
			datasetEnvironment,
			policy: { projectA: { CONTENT_VISIBILITY: ["tiktok_posts"] } },
		});

		const result = await collector.collect({
			projectId: "projectA",
			workflow: "CONTENT_VISIBILITY",
			datasetKey: "tiktok_posts",
			input: { url: "https://www.tiktok.com/@example/video/6718335390845095173" },
			access,
		});

		expect(calls.filter((call) => call.url.includes("/trigger?"))).toHaveLength(1);
		const trigger = calls.find((call) => call.url.includes("/trigger?"));
		expect(trigger?.url).toContain("dataset_id=gd_lu702nij2f790tmv9h");
		expect(JSON.parse(String(trigger?.init?.body))).toEqual([
			{ url: "https://www.tiktok.com/@example/video/6718335390845095173" },
		]);
		expect(entries.map((entry) => entry.phase)).toEqual(["TRIGGERED", "PENDING", "READY", "DELIVERED"]);
		expect(result).toMatchObject({ status: "COMPLETE", snapshotId: "sd_test_1", estimatedCostUsd: 0.0015 });
		if (result.status !== "COMPLETE") throw new Error("expected complete fixture");
		expect(result.entities.some((entity) => entity.entityType === "social_content")).toBe(true);
		expect(result.entities.some((entity) => entity.entityType === "source_snapshot")).toBe(true);
		expect(JSON.stringify(result)).not.toContain("raw-only-value");
	});

	it("rejects a swapped metadata signature before a paid trigger", async () => {
		const fetchImpl = vi.fn<typeof fetch>(async () =>
			json({ id: "gd_lyclm20il4r5helnj", fields: { comment_id: {}, comment_text: {}, comment_date: {} } }),
		);
		const transport = createBrightDataSocialTransport({ apiToken: "fixture", fetchImpl });
		await expect(
			transport.preflight(
				{
					source: "INSTAGRAM_REELS",
					datasetId: "gd_lyclm20il4r5helnj",
					input: {
						schemaVersion: "schema-discovery-input-v1",
						provider: "BRIGHT_DATA",
						source: "INSTAGRAM_REELS",
						records: [{ url: "https://www.instagram.com/instagram/", num_of_posts: 1 }],
					},
				},
				new AbortController().signal,
			),
		).rejects.toMatchObject({ code: "BRIGHTDATA_METADATA_SIGNATURE_MISMATCH" });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it("keeps provider bodies and credentials out of errors and does not retry trigger", async () => {
		let calls = 0;
		const fetchImpl = vi.fn<typeof fetch>(async () => {
			calls += 1;
			if (calls === 1) return json({ id: "gd_l1villgoiiidt09ci", fields: { account_id: {}, secu_id: {}, url: {} } });
			return new Response("token=test-token-that-must-not-leak https://private.example/user", { status: 400 });
		});
		const harness = createHarness(fetchImpl);
		const collector = createBrightDataSocialCollector({
			client: harness.client,
			datasetEnvironment,
			policy: { projectA: { SOCIAL_INTELLIGENCE: ["tiktok_profiles"] } },
		});

		let error: unknown;
		try {
			await collector.collect({
				projectId: "projectA",
				workflow: "SOCIAL_INTELLIGENCE",
				datasetKey: "tiktok_profiles",
				input: { url: "https://www.tiktok.com/@tiktok" },
				access,
			});
		} catch (caught) {
			error = caught;
		}
		expect(String(error)).toContain("BRIGHTDATA_DATASET_TRIGGER_FAILED");
		expect(String(error)).not.toContain("test-token-that-must-not-leak");
		expect(String(error)).not.toContain("private.example");
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it("resumes a recorded snapshot without another trigger", async () => {
		const urls: string[] = [];
		const fetchImpl = vi.fn<typeof fetch>(async (input) => {
			const url = String(input);
			urls.push(url);
			if (url.endsWith("/datasets/gd_lvz8ah06191smkebj4/metadata"))
				return json({ id: "gd_lvz8ah06191smkebj4", fields: { post_id: {}, community_name: {}, url: {} } });
			if (url.endsWith("/datasets/v3/progress/sd_reddit_resume")) return json({ status: "ready" });
			if (url.includes("/datasets/v3/snapshot/sd_reddit_resume?"))
				return json([{ post_id: "reddit-post", title: "Recovered", num_upvotes: 1 }]);
			throw new Error(`unexpected test request: ${url}`);
		});
		const harness = createHarness(fetchImpl);
		const collector = createBrightDataSocialCollector({
			client: harness.client,
			datasetEnvironment,
			policy: { projectA: { REPUTATION: ["reddit_posts"] } },
		});

		const result = await collector.resume({
			projectId: "projectA",
			workflow: "REPUTATION",
			datasetKey: "reddit_posts",
			input: { url: "https://www.reddit.com/r/example/comments/post" },
			access,
			snapshotId: "sd_reddit_resume",
		});

		expect(urls.some((url) => url.includes("/trigger"))).toBe(false);
		expect(result.snapshotId).toBe("sd_reddit_resume");
		expect(harness.entries.map((entry) => entry.phase)).toEqual(["RESUMED", "READY", "DELIVERED"]);
	});

	it("exposes redacted machine-readable transport errors", () => {
		const error = new BrightDataSocialTransportError("CODE", 400);
		expect(error).toMatchObject({ code: "CODE", status: 400, message: "CODE:400" });
	});
});

describe("dataset response normalizers", () => {
	const context = {
		datasetKey: "instagram_profiles" as const,
		snapshotId: "sd_normalizer",
		capturedAt: "2026-08-31T00:00:00.000Z",
	};

	it.each([
		["instagram_profiles", { id: "ig-actor", account: "instagram", followers: 1 }, "ig-actor"],
		["instagram_posts", { post_id: "ig-post", user_id: "ig-actor", likes: 1 }, "ig-post"],
		["instagram_reels", { post_id: "ig-reel", shortcode: "short", views: 1 }, "ig-reel"],
		["instagram_comments", { comment_id: "ig-comment", comment_text: "text" }, "ig-comment"],
		["tiktok_profiles", { account_id: "tt-actor", nickname: "Name", followers: 1 }, "tt-actor"],
		["tiktok_posts", { post_id: "tt-post", account_id: "tt-actor", views: 1 }, "tt-post"],
		["reddit_posts", { post_id: "reddit-post", title: "Title", num_upvotes: 1 }, "reddit-post"],
		["youtube_videos", { video_id: "yt-video", youtuber_id: "yt-actor", views: 1 }, "yt-video"],
	] as const)("%s preserves its stable provider id with provenance", (key, row, stableId) => {
		const entities = brightDataSocialNormalizers[key]([row], { ...context, datasetKey: key });
		expect(
			entities.some(
				(entity) =>
					("platformId" in entity && entity.platformId === stableId) ||
					("subjectPlatformId" in entity && entity.subjectPlatformId === stableId) ||
					("ownerPlatformId" in entity && entity.ownerPlatformId === stableId),
			),
		).toBe(true);
		expect(
			entities.every(
				(entity) => entity.entityType !== "source_snapshot" && entity.provenance.snapshotId === "sd_normalizer",
			),
		).toBe(true);
	});

	it("does not invent ids or publication dates", () => {
		expect(
			brightDataSocialNormalizers.reddit_posts([{ title: "No provider id" }], {
				...context,
				datasetKey: "reddit_posts",
			}),
		).toEqual([]);
		const entities = brightDataSocialNormalizers.instagram_posts(
			[{ post_id: "ig-post", timestamp: "2026-08-31T00:00:00.000Z" }],
			{ ...context, datasetKey: "instagram_posts" },
		);
		expect(entities.find((entity) => entity.entityType === "social_content")).not.toHaveProperty("publishedAt");
	});
});

describe("policy errors", () => {
	it("remain machine-readable", () => {
		const error = new BrightDataSocialPolicyError("CODE");
		expect(error.code).toBe("CODE");
	});
});
