export const YOUTUBE_PRIVACY_RETENTION_POLICY = Object.freeze({
	version: "youtube-privacy-retention-v1",
	rawDurableRetentionDays: 0,
	signedUrlRetentionDays: 0,
	commentsAndTranscriptRetentionDays: 0,
	sanitizedFixtureMaxHours: 24,
	stableIdsMetricsHashesRollingDays: 90,
	titleDescriptionRetentionDays: 0,
});

export type YouTubeRetentionKind = "sanitized_fixture" | "durable_metrics";

export type YouTubeRetentionEntry = Readonly<{
	id: string;
	organizationId: string;
	projectId: string;
	kind: YouTubeRetentionKind;
	createdAt: string;
	expiresAt: string;
}>;

export type YouTubeRetentionCleanupAction = Readonly<{
	id: string;
	kind: YouTubeRetentionKind;
	expiresAt: string;
	reason: "EXPIRED";
}>;

function required(value: string, code: string): string {
	const normalized = value.trim();
	if (!normalized) throw new Error(code);
	return normalized;
}

function validDate(value: string, code: string): string {
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) throw new Error(code);
	return date.toISOString();
}

export function createYouTubeRetentionEntry(input: {
	id: string;
	organizationId: string;
	projectId: string;
	kind: YouTubeRetentionKind;
	createdAt: string;
}): YouTubeRetentionEntry {
	const createdAt = validDate(input.createdAt, "YOUTUBE_RETENTION_CREATED_AT_INVALID");
	const retentionMs =
		input.kind === "sanitized_fixture"
			? YOUTUBE_PRIVACY_RETENTION_POLICY.sanitizedFixtureMaxHours * 60 * 60 * 1_000
			: YOUTUBE_PRIVACY_RETENTION_POLICY.stableIdsMetricsHashesRollingDays * 24 * 60 * 60 * 1_000;
	return Object.freeze({
		id: required(input.id, "YOUTUBE_RETENTION_ID_REQUIRED"),
		organizationId: required(input.organizationId, "YOUTUBE_RETENTION_ORGANIZATION_ID_REQUIRED"),
		projectId: required(input.projectId, "YOUTUBE_RETENTION_PROJECT_ID_REQUIRED"),
		kind: input.kind,
		createdAt,
		expiresAt: new Date(new Date(createdAt).getTime() + retentionMs).toISOString(),
	});
}

/**
 * Return cleanup actions without mutating storage. The scope check is
 * mandatory so a caller cannot accidentally plan deletion across tenants.
 */
export function planYouTubeRetentionCleanup(
	entries: readonly YouTubeRetentionEntry[],
	scope: Readonly<{ organizationId: string; projectId: string }>,
	now: string,
): readonly YouTubeRetentionCleanupAction[] {
	const organizationId = required(scope.organizationId, "YOUTUBE_RETENTION_ORGANIZATION_ID_REQUIRED");
	const projectId = required(scope.projectId, "YOUTUBE_RETENTION_PROJECT_ID_REQUIRED");
	const nowMs = new Date(validDate(now, "YOUTUBE_RETENTION_NOW_INVALID")).getTime();
	return entries
		.filter(
			(entry) =>
				entry.organizationId === organizationId &&
				entry.projectId === projectId &&
				new Date(validDate(entry.expiresAt, "YOUTUBE_RETENTION_EXPIRY_INVALID")).getTime() <= nowMs,
		)
		.map((entry) =>
			Object.freeze({ id: entry.id, kind: entry.kind, expiresAt: entry.expiresAt, reason: "EXPIRED" as const }),
		);
}
