import type {
	BrightDataDatasetNormalizer,
	BrightDataEntityProvenance,
	BrightDataNormalizationContext,
	BrightDataSocialDatasetKey,
	BrightDataSocialPlatform,
	EngagementSnapshot,
	MediaAsset,
	NormalizedSocialEntity,
	SocialActor,
	SocialComment,
	SocialContent,
} from "./types";

type Row = Record<string, unknown>;

function text(row: Row, ...fields: string[]): string | undefined {
	for (const field of fields) {
		const value = row[field];
		if ((typeof value === "string" || typeof value === "number") && String(value).trim() !== "")
			return String(value).trim();
	}
	return undefined;
}

function number(row: Row, ...fields: string[]): number | undefined {
	for (const field of fields) {
		const value = row[field];
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
	}
	return undefined;
}

function aliases(row: Row, primary: string, fields: readonly string[]): string[] {
	return [
		...new Set(
			fields.map((field) => text(row, field)).filter((value): value is string => !!value && value !== primary),
		),
	];
}

function provenance(
	context: BrightDataNormalizationContext,
	row: Row,
	fields: readonly string[],
): BrightDataEntityProvenance {
	return {
		...context,
		fields: fields.filter((field) => row[field] !== null && row[field] !== undefined),
	};
}

function actor(
	row: Row,
	context: BrightDataNormalizationContext,
	platform: BrightDataSocialPlatform,
	idFields: readonly string[],
	shape: {
		handle: readonly string[];
		displayName?: readonly string[];
		profileUrl?: readonly string[];
		biography?: readonly string[];
	},
): SocialActor | null {
	const platformId = text(row, ...idFields);
	if (!platformId) return null;
	const fields = [
		...idFields,
		...shape.handle,
		...(shape.displayName ?? []),
		...(shape.profileUrl ?? []),
		...(shape.biography ?? []),
	];
	return {
		entityType: "social_actor",
		platform,
		platformId,
		aliases: aliases(row, platformId, idFields.slice(1)),
		...(text(row, ...shape.handle) ? { handle: text(row, ...shape.handle) } : {}),
		...(shape.displayName && text(row, ...shape.displayName) ? { displayName: text(row, ...shape.displayName) } : {}),
		...(shape.profileUrl && text(row, ...shape.profileUrl) ? { profileUrl: text(row, ...shape.profileUrl) } : {}),
		...(shape.biography && text(row, ...shape.biography) ? { biography: text(row, ...shape.biography) } : {}),
		provenance: provenance(context, row, fields),
	};
}

function content(
	row: Row,
	context: BrightDataNormalizationContext,
	options: {
		platform: BrightDataSocialPlatform;
		contentType: SocialContent["contentType"];
		idFields: readonly string[];
		authorIdFields?: readonly string[];
		authorHandleFields?: readonly string[];
		titleFields?: readonly string[];
		textFields?: readonly string[];
		dateFields?: readonly string[];
	},
): SocialContent | null {
	const platformId = text(row, ...options.idFields);
	if (!platformId) return null;
	const fields = [
		...options.idFields,
		"url",
		...(options.authorIdFields ?? []),
		...(options.authorHandleFields ?? []),
		...(options.titleFields ?? []),
		...(options.textFields ?? []),
		...(options.dateFields ?? []),
	];
	return {
		entityType: "social_content",
		contentType: options.contentType,
		platform: options.platform,
		platformId,
		aliases: aliases(row, platformId, options.idFields.slice(1)),
		...(text(row, "url") ? { canonicalUrl: text(row, "url") } : {}),
		...(options.authorIdFields && text(row, ...options.authorIdFields)
			? { authorPlatformId: text(row, ...options.authorIdFields) }
			: {}),
		...(options.authorHandleFields && text(row, ...options.authorHandleFields)
			? { authorHandle: text(row, ...options.authorHandleFields) }
			: {}),
		...(options.titleFields && text(row, ...options.titleFields) ? { title: text(row, ...options.titleFields) } : {}),
		...(options.textFields && text(row, ...options.textFields) ? { text: text(row, ...options.textFields) } : {}),
		...(options.dateFields && text(row, ...options.dateFields)
			? { publishedAt: text(row, ...options.dateFields) }
			: {}),
		provenance: provenance(context, row, fields),
	};
}

function comment(
	row: Row,
	context: BrightDataNormalizationContext,
	platform: BrightDataSocialPlatform,
	idFields: readonly string[],
): SocialComment | null {
	const platformId = text(row, ...idFields);
	if (!platformId) return null;
	const fields = [
		...idFields,
		"post_id",
		"parent_id",
		"user_id",
		"account_id",
		"comment_user",
		"user_posted",
		"comment_text",
		"text",
		"comment_date",
		"date_posted",
	];
	return {
		entityType: "social_comment",
		platform,
		platformId,
		...(text(row, "post_id", "parent_id") ? { parentPlatformId: text(row, "post_id", "parent_id") } : {}),
		...(text(row, "user_id", "account_id") ? { authorPlatformId: text(row, "user_id", "account_id") } : {}),
		...(text(row, "comment_user", "user_posted") ? { authorHandle: text(row, "comment_user", "user_posted") } : {}),
		...(text(row, "comment_text", "text") ? { text: text(row, "comment_text", "text") } : {}),
		...(text(row, "comment_date", "date_posted") ? { publishedAt: text(row, "comment_date", "date_posted") } : {}),
		provenance: provenance(context, row, fields),
	};
}

function engagement(
	row: Row,
	context: BrightDataNormalizationContext,
	platform: BrightDataSocialPlatform,
	subjectIdFields: readonly string[],
	metricFields: readonly string[],
): EngagementSnapshot | null {
	const subjectPlatformId = text(row, ...subjectIdFields);
	if (!subjectPlatformId) return null;
	const metrics = Object.fromEntries(
		metricFields.flatMap((field) => {
			const value = number(row, field);
			return value === undefined ? [] : [[field, value]];
		}),
	);
	if (Object.keys(metrics).length === 0) return null;
	return {
		entityType: "engagement_snapshot",
		platform,
		subjectPlatformId,
		metrics,
		provenance: provenance(context, row, [...subjectIdFields, ...metricFields]),
	};
}

function media(
	row: Row,
	context: BrightDataNormalizationContext,
	platform: BrightDataSocialPlatform,
	ownerIdFields: readonly string[],
	fields: Readonly<Record<string, MediaAsset["mediaType"]>>,
): MediaAsset[] {
	const ownerPlatformId = text(row, ...ownerIdFields);
	if (!ownerPlatformId) return [];
	const output: MediaAsset[] = [];
	const seen = new Set<string>();
	for (const [field, mediaType] of Object.entries(fields)) {
		const value = row[field];
		const candidates = Array.isArray(value) ? value : [value];
		for (const candidate of candidates) {
			const url =
				typeof candidate === "string"
					? candidate
					: candidate && typeof candidate === "object" && !Array.isArray(candidate)
						? text(candidate as Row, "url", "src")
						: undefined;
			if (!url || seen.has(url)) continue;
			seen.add(url);
			output.push({
				entityType: "media_asset",
				platform,
				ownerPlatformId,
				mediaType,
				url,
				provenance: provenance(context, row, [field, ...ownerIdFields]),
			});
		}
	}
	return output;
}

type DatasetEntity = Exclude<NormalizedSocialEntity, { entityType: "source_snapshot" }>;

function compact(entities: (DatasetEntity | null)[]): DatasetEntity[] {
	return entities.filter((entity): entity is DatasetEntity => entity !== null);
}

export const normalizeInstagramProfiles: BrightDataDatasetNormalizer = (rows, context) =>
	rows.flatMap((row) =>
		compact([
			actor(row, context, "instagram", ["id", "fbid", "partner_id"], {
				handle: ["account", "username"],
				displayName: ["full_name", "name"],
				profileUrl: ["url", "profile_url"],
				biography: ["biography"],
			}),
			engagement(row, context, "instagram", ["id", "fbid", "partner_id"], ["followers", "following", "posts_count"]),
		]),
	);

export const normalizeInstagramPosts: BrightDataDatasetNormalizer = (rows, context) =>
	rows.flatMap((row) => [
		...compact([
			content(row, context, {
				platform: "instagram",
				contentType: "post",
				idFields: ["post_id", "pk", "shortcode", "content_id"],
				authorIdFields: ["user_id", "owner_id"],
				authorHandleFields: ["user_posted", "username"],
				textFields: ["description", "caption"],
				dateFields: ["date_posted"],
			}),
			engagement(row, context, "instagram", ["post_id", "pk"], ["likes", "num_comments", "views", "video_play_count"]),
		]),
		...media(row, context, "instagram", ["post_id", "pk"], {
			video_url: "video",
			audio_url: "audio",
			display_url: "image",
			photos: "image",
		}),
	]);

export const normalizeInstagramReels: BrightDataDatasetNormalizer = (rows, context) =>
	rows.flatMap((row) => [
		...compact([
			content(row, context, {
				platform: "instagram",
				contentType: "reel",
				idFields: ["post_id", "shortcode", "content_id"],
				authorIdFields: ["user_id", "owner_id"],
				authorHandleFields: ["user_posted"],
				textFields: ["description"],
				dateFields: ["date_posted"],
			}),
			engagement(row, context, "instagram", ["post_id"], ["likes", "num_comments", "views", "video_play_count"]),
		]),
		...media(row, context, "instagram", ["post_id"], {
			video_url: "video",
			audio_url: "audio",
			thumbnail: "image",
		}),
	]);

export const normalizeInstagramComments: BrightDataDatasetNormalizer = (rows, context) =>
	rows.flatMap((row) => compact([comment(row, context, "instagram", ["comment_id"])]));

export const normalizeTikTokProfiles: BrightDataDatasetNormalizer = (rows, context) =>
	rows.flatMap((row) =>
		compact([
			actor(row, context, "tiktok", ["account_id", "id", "secu_id"], {
				handle: ["account", "unique_id", "username"],
				displayName: ["nickname"],
				profileUrl: ["url"],
				biography: ["biography", "signature"],
			}),
			engagement(
				row,
				context,
				"tiktok",
				["account_id", "id"],
				["followers", "following", "likes", "like_count", "videos_count"],
			),
		]),
	);

export const normalizeTikTokPosts: BrightDataDatasetNormalizer = (rows, context) =>
	rows.flatMap((row) => [
		...compact([
			actor(row, context, "tiktok", ["account_id", "profile_id", "secu_id"], {
				handle: ["user_posted", "account", "username"],
				profileUrl: ["profile_url"],
				biography: ["biography"],
			}),
			content(row, context, {
				platform: "tiktok",
				contentType: "video",
				idFields: ["post_id", "shortcode"],
				authorIdFields: ["account_id", "profile_id", "secu_id"],
				authorHandleFields: ["user_posted", "account"],
				textFields: ["description", "caption"],
				dateFields: ["date_posted", "create_time"],
			}),
			engagement(
				row,
				context,
				"tiktok",
				["post_id", "shortcode"],
				["likes", "num_comments", "shares", "views", "play_count"],
			),
		]),
		...media(row, context, "tiktok", ["post_id", "shortcode"], {
			video_url: "video",
			music_url: "audio",
			thumbnail: "image",
		}),
	]);

export const normalizeRedditPosts: BrightDataDatasetNormalizer = (rows, context) =>
	rows.flatMap((row) => [
		...compact([
			actor(row, context, "reddit", ["user_id"], {
				handle: ["user_posted"],
				biography: ["bio_description"],
			}),
			content(row, context, {
				platform: "reddit",
				contentType: "community_post",
				idFields: ["post_id"],
				authorIdFields: ["user_id"],
				authorHandleFields: ["user_posted"],
				titleFields: ["title"],
				textFields: ["description_markdown", "description"],
				dateFields: ["date_posted"],
			}),
			engagement(row, context, "reddit", ["post_id"], ["num_comments", "num_upvotes"]),
		]),
	]);

export const normalizeYouTubeVideos: BrightDataDatasetNormalizer = (rows, context) =>
	rows.flatMap((row) => [
		...compact([
			actor(row, context, "youtube", ["youtuber_id", "channel_id"], {
				handle: ["channel_handle", "youtuber"],
				displayName: ["youtuber"],
				profileUrl: ["channel_url"],
			}),
			content(row, context, {
				platform: "youtube",
				contentType: "video",
				idFields: ["video_id", "shortcode"],
				authorIdFields: ["youtuber_id", "channel_id"],
				authorHandleFields: ["channel_handle", "youtuber"],
				titleFields: ["title"],
				textFields: ["description"],
				dateFields: ["date_posted", "published_date"],
			}),
			engagement(
				row,
				context,
				"youtube",
				["video_id", "shortcode"],
				["views", "likes", "num_comments", "comments_count"],
			),
		]),
		...media(row, context, "youtube", ["video_id", "shortcode"], {
			video_url: "video",
			thumbnail: "image",
			thumbnail_url: "image",
		}),
	]);

export const brightDataSocialNormalizers = {
	instagram_profiles: normalizeInstagramProfiles,
	instagram_posts: normalizeInstagramPosts,
	instagram_reels: normalizeInstagramReels,
	instagram_comments: normalizeInstagramComments,
	tiktok_profiles: normalizeTikTokProfiles,
	tiktok_posts: normalizeTikTokPosts,
	reddit_posts: normalizeRedditPosts,
	youtube_videos: normalizeYouTubeVideos,
} satisfies Record<BrightDataSocialDatasetKey, BrightDataDatasetNormalizer>;
