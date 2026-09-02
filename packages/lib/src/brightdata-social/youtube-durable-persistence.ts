import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";
import { projectYouTubeDurableEntities } from "./privacy";
import { createYouTubeRetentionEntry } from "./retention";
import type { NormalizedSocialEntity } from "./types";

type Db = NodePgDatabase<typeof schema>;

const MAX_PAGE_SIZE = 100;
const APPROVED_CAPABILITY_STATUSES = new Set(["PILOT_ONLY", "ALLOWED"]);

export type YouTubeDurablePersistenceContext = Readonly<{
	organizationId: string;
	projectId: string;
	featureEnabled: boolean;
	capabilityStatus: string | null;
}>;

export type YouTubeDurableProjectionInput = Readonly<{
	snapshotId: string;
	capturedAt: string;
	contentSha256: `sha256:${string}`;
	schemaVersion: string;
	entities: readonly NormalizedSocialEntity[];
}>;

export type YouTubeCustomerVideo = Readonly<{
	videoId: string;
	shortcode: string | null;
	youtuberId: string | null;
	views: number | null;
	likes: number | null;
	commentsCount: number | null;
	capturedAt: string;
}>;

export class YouTubePersistenceGuardError extends Error {
	constructor(public readonly code: "YOUTUBE_CUSTOMER_API_DISABLED" | "YOUTUBE_DATASET_NOT_APPROVED") {
		super(code);
		this.name = "YouTubePersistenceGuardError";
	}
}

/**
 * The durable write path is opt-in twice: an explicit feature flag and an
 * approved capability row. Missing approval is fail-closed.
 */
export function assertYouTubeDurablePersistenceAccess(context: YouTubeDurablePersistenceContext): void {
	if (!context.featureEnabled) throw new YouTubePersistenceGuardError("YOUTUBE_CUSTOMER_API_DISABLED");
	if (!APPROVED_CAPABILITY_STATUSES.has(context.capabilityStatus ?? ""))
		throw new YouTubePersistenceGuardError("YOUTUBE_DATASET_NOT_APPROVED");
}

function required(value: string, code: string): string {
	const normalized = value.trim();
	if (!normalized) throw new Error(code);
	return normalized;
}

function optionalId(value: string | undefined): string | null {
	const normalized = value?.trim();
	return normalized || null;
}

function metricValue(value: number | undefined): number | null {
	if (value === undefined) return null;
	if (!Number.isSafeInteger(value) || value < 0) throw new Error("YOUTUBE_METRIC_INVALID");
	return value;
}

export function buildYouTubeDurableMetric(input: YouTubeDurableProjectionInput) {
	if (!/^sha256:[a-f0-9]{64}$/.test(input.contentSha256)) throw new Error("YOUTUBE_CONTENT_HASH_INVALID");
	const capturedAt = new Date(input.capturedAt);
	if (!Number.isFinite(capturedAt.getTime()) || capturedAt.toISOString() !== input.capturedAt)
		throw new Error("YOUTUBE_CAPTURED_AT_INVALID");
	const snapshotId = required(input.snapshotId, "YOUTUBE_SNAPSHOT_ID_REQUIRED");
	const schemaVersion = required(input.schemaVersion, "YOUTUBE_SCHEMA_VERSION_REQUIRED");
	const projected = projectYouTubeDurableEntities(input.entities);
	const content = projected.find(
		(entity): entity is Extract<NormalizedSocialEntity, { entityType: "social_content" }> =>
			entity.entityType === "social_content" && entity.platform === "youtube" && entity.contentType === "video",
	);
	if (!content) throw new Error("YOUTUBE_VIDEO_CONTENT_REQUIRED");
	const actor = projected.find(
		(entity): entity is Extract<NormalizedSocialEntity, { entityType: "social_actor" }> =>
			entity.entityType === "social_actor" && entity.platform === "youtube",
	);
	const engagement = projected.find(
		(entity): entity is Extract<NormalizedSocialEntity, { entityType: "engagement_snapshot" }> =>
			entity.entityType === "engagement_snapshot" && entity.platform === "youtube",
	);
	const metrics = engagement?.metrics ?? {};
	return {
		snapshotId,
		videoId: required(content.platformId, "YOUTUBE_VIDEO_ID_REQUIRED"),
		shortcode: optionalId(content.aliases[0]),
		youtuberId: optionalId(actor?.platformId),
		views: metricValue(metrics.views),
		likes: metricValue(metrics.likes),
		commentsCount: metricValue(metrics.comments_count ?? metrics.num_comments),
		contentSha256: input.contentSha256,
		schemaVersion,
		capturedAt: input.capturedAt,
	};
}

function toCustomerVideo(row: {
	videoId: string;
	shortcode: string | null;
	youtuberId: string | null;
	views: number | null;
	likes: number | null;
	commentsCount: number | null;
	capturedAt: Date;
}): YouTubeCustomerVideo {
	return {
		videoId: row.videoId,
		shortcode: row.shortcode,
		youtuberId: row.youtuberId,
		views: row.views,
		likes: row.likes,
		commentsCount: row.commentsCount,
		capturedAt: row.capturedAt.toISOString(),
	};
}

export function createYouTubeDurableProjectionStore(db: Db) {
	return {
		async insert(
			context: YouTubeDurablePersistenceContext,
			input: YouTubeDurableProjectionInput,
		): Promise<YouTubeCustomerVideo> {
			assertYouTubeDurablePersistenceAccess(context);
			const value = buildYouTubeDurableMetric(input);
			const expiry = createYouTubeRetentionEntry({
				id: `youtube-metrics:${context.organizationId}:${context.projectId}:${value.snapshotId}`,
				organizationId: context.organizationId,
				projectId: context.projectId,
				kind: "durable_metrics",
				createdAt: value.capturedAt,
			});
			const rows = await db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id', ${context.organizationId}, true)`);
				const [project] = await tx
					.select({ id: schema.svProjects.id })
					.from(schema.svProjects)
					.where(
						and(
							eq(schema.svProjects.id, context.projectId),
							eq(schema.svProjects.organizationId, context.organizationId),
						),
					)
					.limit(1);
				if (!project) throw new Error("YOUTUBE_PROJECT_OUTSIDE_TENANT");
				const inserted = await tx
					.insert(schema.svYouTubeVideoMetrics)
					.values({
						organizationId: context.organizationId,
						projectId: context.projectId,
						snapshotId: value.snapshotId,
						videoId: value.videoId,
						shortcode: value.shortcode,
						youtuberId: value.youtuberId,
						views: value.views,
						likes: value.likes,
						commentsCount: value.commentsCount,
						contentSha256: value.contentSha256,
						schemaVersion: value.schemaVersion,
						capturedAt: capturedDate(value.capturedAt),
						expiresAt: capturedDate(expiry.expiresAt),
					})
					.onConflictDoNothing({
						target: [
							schema.svYouTubeVideoMetrics.organizationId,
							schema.svYouTubeVideoMetrics.projectId,
							schema.svYouTubeVideoMetrics.videoId,
							schema.svYouTubeVideoMetrics.snapshotId,
						],
					})
					.returning({
						videoId: schema.svYouTubeVideoMetrics.videoId,
						shortcode: schema.svYouTubeVideoMetrics.shortcode,
						youtuberId: schema.svYouTubeVideoMetrics.youtuberId,
						views: schema.svYouTubeVideoMetrics.views,
						likes: schema.svYouTubeVideoMetrics.likes,
						commentsCount: schema.svYouTubeVideoMetrics.commentsCount,
						capturedAt: schema.svYouTubeVideoMetrics.capturedAt,
					});
				if (inserted[0]) return inserted[0];
				const [existing] = await tx
					.select({
						videoId: schema.svYouTubeVideoMetrics.videoId,
						shortcode: schema.svYouTubeVideoMetrics.shortcode,
						youtuberId: schema.svYouTubeVideoMetrics.youtuberId,
						views: schema.svYouTubeVideoMetrics.views,
						likes: schema.svYouTubeVideoMetrics.likes,
						commentsCount: schema.svYouTubeVideoMetrics.commentsCount,
						capturedAt: schema.svYouTubeVideoMetrics.capturedAt,
					})
					.from(schema.svYouTubeVideoMetrics)
					.where(
						and(
							eq(schema.svYouTubeVideoMetrics.organizationId, context.organizationId),
							eq(schema.svYouTubeVideoMetrics.projectId, context.projectId),
							eq(schema.svYouTubeVideoMetrics.videoId, value.videoId),
							eq(schema.svYouTubeVideoMetrics.snapshotId, value.snapshotId),
						),
					)
					.limit(1);
				if (!existing) throw new Error("YOUTUBE_METRICS_INSERT_NOT_VISIBLE");
				return existing;
			});
			return toCustomerVideo(rows);
		},

		async list(
			context: YouTubeDurablePersistenceContext,
			input: { projectId: string; limit?: number },
		): Promise<readonly YouTubeCustomerVideo[]> {
			assertYouTubeDurablePersistenceAccess(context);
			if (input.projectId !== context.projectId) throw new Error("YOUTUBE_PROJECT_OUTSIDE_TENANT");
			const limit = input.limit ?? 50;
			if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) throw new Error("YOUTUBE_PAGE_SIZE_INVALID");
			const rows = await db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id', ${context.organizationId}, true)`);
				return tx
					.select({
						videoId: schema.svYouTubeVideoMetrics.videoId,
						shortcode: schema.svYouTubeVideoMetrics.shortcode,
						youtuberId: schema.svYouTubeVideoMetrics.youtuberId,
						views: schema.svYouTubeVideoMetrics.views,
						likes: schema.svYouTubeVideoMetrics.likes,
						commentsCount: schema.svYouTubeVideoMetrics.commentsCount,
						capturedAt: schema.svYouTubeVideoMetrics.capturedAt,
					})
					.from(schema.svYouTubeVideoMetrics)
					.where(
						and(
							eq(schema.svYouTubeVideoMetrics.organizationId, context.organizationId),
							eq(schema.svYouTubeVideoMetrics.projectId, input.projectId),
						),
					)
					.orderBy(desc(schema.svYouTubeVideoMetrics.capturedAt), desc(schema.svYouTubeVideoMetrics.id))
					.limit(limit);
			});
			return rows.map(toCustomerVideo);
		},

		async removeExpired(organizationId: string, now: Date): Promise<number> {
			const result = await db.transaction(async (tx) => {
				await tx.execute(sql`select set_config('app.organization_id', ${organizationId}, true)`);
				const deleted = await tx
					.delete(schema.svYouTubeVideoMetrics)
					.where(
						and(
							eq(schema.svYouTubeVideoMetrics.organizationId, organizationId),
							lte(schema.svYouTubeVideoMetrics.expiresAt, now),
						),
					)
					.returning({ id: schema.svYouTubeVideoMetrics.id });
				return deleted.length;
			});
			return result;
		},
	};
}

function capturedDate(value: string): Date {
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) throw new Error("YOUTUBE_CAPTURED_AT_INVALID");
	return date;
}
