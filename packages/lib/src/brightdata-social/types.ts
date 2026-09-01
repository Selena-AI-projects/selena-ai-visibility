export const brightDataSocialDatasetKeys = [
	"instagram_profiles",
	"instagram_posts",
	"instagram_reels",
	"instagram_comments",
	"tiktok_profiles",
	"tiktok_posts",
	"reddit_posts",
	"youtube_videos",
] as const;

export type BrightDataSocialDatasetKey = (typeof brightDataSocialDatasetKeys)[number];
export type BrightDataSocialPlatform = "instagram" | "tiktok" | "reddit" | "youtube";
export type BrightDataSocialWorkflow = "SOCIAL_INTELLIGENCE" | "REPUTATION" | "CONTENT_VISIBILITY";

export type BrightDataDatasetInputContract = {
	required: readonly string[];
	optional: readonly string[];
	maxInputsPerRun: number;
};

export type BrightDataSocialDatasetConfig = {
	key: BrightDataSocialDatasetKey;
	platform: BrightDataSocialPlatform;
	envKey: string;
	mode: "collect_by_url" | "discover_by_profile_url";
	inputContract: BrightDataDatasetInputContract;
	triggerQuery: Readonly<Record<string, string>>;
	metadataSignature: readonly string[];
	stableIdFields: readonly string[];
	pagination: "none" | "bounded_num_of_posts";
	providerOutputCap: "none" | "num_of_posts" | "unproven";
	expectedMaxOutputRecords: number;
	unitCostUsd: number;
	collectionTimeoutMs: number;
	downloadTimeoutMs: number;
	maxResponseBytes: number;
	runtimeStatus: "eligible_after_project_assignment" | "blocked_cost_and_pii";
	rawRetention: "disabled";
	personalDataClassification: "public_user_data" | "high_volume_public_user_data";
	incrementalStrategy: string;
	personalDataFields: readonly string[];
};

export type BrightDataEntityProvenance = {
	datasetKey: BrightDataSocialDatasetKey;
	snapshotId: string;
	capturedAt: string;
	fields: readonly string[];
};

export type SocialActor = {
	entityType: "social_actor";
	platform: BrightDataSocialPlatform;
	platformId: string;
	aliases: readonly string[];
	handle?: string;
	displayName?: string;
	profileUrl?: string;
	biography?: string;
	provenance: BrightDataEntityProvenance;
};

export type SocialContent = {
	entityType: "social_content";
	contentType: "post" | "reel" | "video" | "community_post";
	platform: BrightDataSocialPlatform;
	platformId: string;
	aliases: readonly string[];
	canonicalUrl?: string;
	authorPlatformId?: string;
	authorHandle?: string;
	title?: string;
	text?: string;
	publishedAt?: string;
	provenance: BrightDataEntityProvenance;
};

export type SocialComment = {
	entityType: "social_comment";
	platform: BrightDataSocialPlatform;
	platformId: string;
	parentPlatformId?: string;
	authorPlatformId?: string;
	authorHandle?: string;
	text?: string;
	publishedAt?: string;
	provenance: BrightDataEntityProvenance;
};

export type MediaAsset = {
	entityType: "media_asset";
	platform: BrightDataSocialPlatform;
	ownerPlatformId: string;
	mediaType: "image" | "video" | "audio" | "transcript";
	url: string;
	provenance: BrightDataEntityProvenance;
};

export type EngagementSnapshot = {
	entityType: "engagement_snapshot";
	platform: BrightDataSocialPlatform;
	subjectPlatformId: string;
	metrics: Readonly<Record<string, number>>;
	provenance: BrightDataEntityProvenance;
};

export type SourceSnapshot = {
	entityType: "source_snapshot";
	datasetKey: BrightDataSocialDatasetKey;
	datasetId: string;
	snapshotId: string;
	capturedAt: string;
	rowCount: number;
	rawRetained: false;
};

export type NormalizedSocialEntity =
	| SocialActor
	| SocialContent
	| SocialComment
	| MediaAsset
	| EngagementSnapshot
	| SourceSnapshot;

export type BrightDataNormalizationContext = {
	datasetKey: BrightDataSocialDatasetKey;
	snapshotId: string;
	capturedAt: string;
};

export type BrightDataDatasetNormalizer = (
	rows: readonly Record<string, unknown>[],
	context: BrightDataNormalizationContext,
) => readonly NormalizedSocialEntity[];

export type BrightDataProjectPolicy = Readonly<
	Record<string, Partial<Record<BrightDataSocialWorkflow, readonly BrightDataSocialDatasetKey[]>>>
>;
