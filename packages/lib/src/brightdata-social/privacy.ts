import type { NormalizedSocialEntity } from "./types";

const REDACTED_UNALLOWLISTED_FIELD = "[REDACTED_UNALLOWLISTED_FIELD]";

// This is intentionally an allowlist. A newly appearing provider field must
// not become durable evidence merely because it was not known to the redactor.
const YOUTUBE_DURABLE_FIELDS = new Set([
	"video_id",
	"shortcode",
	"youtuber_id",
	"channel_id",
	"views",
	"likes",
	"num_comments",
	"comments_count",
]);

function safePrimitive(value: unknown): string | number | boolean | null {
	if (value === null || typeof value === "boolean") return value;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") return value;
	return REDACTED_UNALLOWLISTED_FIELD;
}

/**
 * Produce a fixture that contains only the approved YouTube durable fields.
 * Unknown fields, nested objects and all URLs are redacted rather than copied.
 */
export function sanitizeYouTubePrivacyFixture(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sanitizeYouTubePrivacyFixture);
	if (value === null || typeof value !== "object") return REDACTED_UNALLOWLISTED_FIELD;
	const object = value as Record<string, unknown>;
	return Object.fromEntries(
		Object.entries(object).map(([key, nested]) => [
			key,
			YOUTUBE_DURABLE_FIELDS.has(key.toLowerCase()) ? safePrimitive(nested) : REDACTED_UNALLOWLISTED_FIELD,
		]),
	);
}

function safeProvenance(entity: Extract<NormalizedSocialEntity, { provenance: unknown }>) {
	return {
		...entity.provenance,
		fields: entity.provenance.fields.filter((field) => YOUTUBE_DURABLE_FIELDS.has(field.toLowerCase())),
	};
}

/**
 * Remove personal text, identity labels, media URLs and comments from
 * normalized entities before a future durable write. Numeric metrics and
 * stable IDs remain available for tenant-scoped evidence.
 */
export function projectYouTubeDurableEntities(
	entities: readonly NormalizedSocialEntity[],
): readonly NormalizedSocialEntity[] {
	return entities.flatMap<NormalizedSocialEntity>((entity) => {
		switch (entity.entityType) {
			case "source_snapshot":
				return [entity];
			case "social_actor":
				return [
					{
						entityType: "social_actor",
						platform: entity.platform,
						platformId: entity.platformId,
						aliases: [],
						provenance: safeProvenance(entity),
					},
				];
			case "social_content":
				return [
					{
						entityType: "social_content",
						contentType: entity.contentType,
						platform: entity.platform,
						platformId: entity.platformId,
						// Normalizers use aliases for stable platform IDs such as
						// YouTube shortcode. Keep those identifiers; text and URLs
						// remain excluded by the projection shape.
						aliases: [...entity.aliases],
						provenance: safeProvenance(entity),
					},
				];
			case "engagement_snapshot":
				return [
					{
						entityType: "engagement_snapshot",
						platform: entity.platform,
						subjectPlatformId: entity.subjectPlatformId,
						metrics: Object.fromEntries(
							Object.entries(entity.metrics).filter(
								([field, value]) => YOUTUBE_DURABLE_FIELDS.has(field.toLowerCase()) && Number.isFinite(value),
							),
						),
						provenance: safeProvenance(entity),
					},
				];
			case "media_asset":
			case "social_comment":
				return [];
			default:
				return [];
		}
	});
}
