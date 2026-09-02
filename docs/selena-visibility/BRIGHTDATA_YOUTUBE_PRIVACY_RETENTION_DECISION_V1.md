# YouTube Videos privacy and retention decision v1

**Status:** owner-approved policy; implementation gate remains open
**Dataset:** `YOUTUBE_VIDEOS` / `gd_lk56epmy2i5g7lzu0k`
**Decision scope:** the completed one-record schema-discovery canary and a possible future Content Visibility pilot. This is not permission to run another provider call.

**Owner confirmation:** 2026-09-02 — raw and signed URLs are not retained; comments/transcript are not retained; fixtures are limited to 24 hours; IDs/metrics/hashes are limited to a 90-day rolling window; title/description are not retained.

## Decision

The bounded canary is accepted as technical evidence, but the dataset is **not
approved for durable raw retention or customer-visible activation** yet.

The default policy is data minimization:

| Data class | Policy | Proposed retention |
|---|---|---:|
| Full Bright Data response | Do not put in the database, logs, commits or customer API | `0` durable days; ephemeral processing only |
| Signed or expiring media URLs (`video_url`, download URLs) | Never persist or expose; redact before fixture storage | `0` |
| Recommended-video/channel crawling fields | Out of scope for this pilot; discard | `0` |
| Comments and comment-like nested fields | Out of scope for this pilot; discard | `0` |
| Sanitized fixture | Internal evidence only, with URL and user-data redaction | Maximum `24h`, then owner-visible cleanup |
| Stable IDs, schema version, hashes, capture time and numeric metrics | Tenant-scoped evidence/provenance | Rolling `90d` recommendation |
| Title and description | Do not persist until text-retention approval; hash for evidence if needed | `0` by default |
| Transcript | Do not persist in the pilot; it can contain personal or third-party speech | `0` |

The exact durations are recommendations, not a claim that a deletion job is
already deployed. No retention setting or product surface is changed by this
document.

## Field classification from the canary

The response was classified as `public_user_data`. Public availability does not
make a field non-personal or safe for unrestricted retention.

- **Stable public identifiers:** `video_id`, `shortcode`, `youtuber_id`,
  `channel_handle`. Keep only when needed for deduplication and provenance;
  tenant-scope them.
- **Potentially personal text:** `title`, `description`, `transcript`, and any
  comment fields. Default is discard; transcript is explicitly excluded from
  the pilot.
- **Identity and profile fields:** `youtuber`, `channel_handle`,
  `channel_avatar`, `channel_url`. Treat as public personal data; do not expose
  them through a public API without a separate product decision.
- **Ephemeral assets:** `video_url`, thumbnail URLs, recommended-video URLs and
  signed media URLs. A signed URL is bearer-like access and must not survive
  the canary evidence window.
- **Operational evidence:** snapshot reference, schema version, lifecycle,
  latency, record count, cost and hashes. These are the preferred durable
  evidence fields and must not contain raw payload values.

## Implementation status and remaining pilot gate

The allowlist projection and nested redaction are now implemented in
`packages/lib/src/brightdata-social/privacy.ts`, and the canary script uses
them. The retention module prepares tenant-scoped expiry entries and a
non-mutating cleanup plan in `packages/lib/src/brightdata-social/retention.ts`.
The worker queue is wired behind an explicit feature flag and removes only
expired, name-matched temporary canary directories. Local tests cover the
projection and expiry planner without provider calls.

The durable persistence boundary is now implemented in
`packages/lib/src/brightdata-social/youtube-durable-persistence.ts` and migration
`0056_youtube_durable_projection`. It stores only tenant/project-scoped IDs,
numeric metrics, capture timestamps and hashes; RLS is forced, project identity
is composite-tenant fenced, updates are rejected (new snapshots are append-only),
and expiry is set to 90 days. The customer read route is
`/api/v1/selena/projects/:projectId/youtube/videos`; it returns only the safe
projection and fails closed unless both the feature flag and an approved
capability row are present. The flag remains off by default.

Before any durable pilot, the remaining work is:

1. Apply and verify migration `0056` in the approved staging maintenance
   window; it has not been applied to live staging by this change.
2. Seed and approve the tenant capability row through the owner-controlled
   provisioning path. No customer API exposure is enabled until that decision.
3. The temporary-fixture cleanup job is enabled only when both
   `SELENA_YOUTUBE_RETENTION_ENABLED=true` and an explicit, non-broad
   `SELENA_BRIGHTDATA_CANARY_ARTIFACT_ROOT` are present. It is not enabled by
   default. Durable metrics still require a dedicated tenant/project-scoped
   table and are not deleted by this job.
4. Re-run only a disposable redaction test fixture; do not call Bright Data as
   part of the redactor test.

## Incremental collection under this policy

If YouTube is later approved for a pilot, use a known video URL registry and
upsert by `video_id` (with `shortcode` as a secondary identity). Refresh numeric
engagement metrics only when needed. Do not use related-video discovery,
channel crawling, comments or transcript refreshes in the first pilot. A new
snapshot should replace the previous metric snapshot rather than accumulate raw
provider rows.

## Decision gates

- **Technical canary:** `PASS` — one URL, one record, one request, `$0.00`
  reconciled Usage cost.
- **Privacy/retention:** `APPROVED_POLICY / HOLD_FOR_PILOT` — the policy is
  approved; its technical enforcement must pass before durable storage or
  customer exposure.
- **Instagram Comments:** remains `NO-GO` for this sequence until a provider-
  enforced output cap and a separate high-volume user-data policy exist.
- **Product activation:** unchanged and not authorized by this document.

This decision keeps the shared `BrightDataClient`, dataset registry and
normalizers usable while preventing a successful technical canary from silently
becoming a data-retention or product-activation decision.

## Privacy-enforcement gate audit — 2026-09-02

The disposable redaction fixture passed `23/23` targeted tests and the lib
typecheck passed. The allowlist removes unknown fields, URLs, personal text,
transcripts, comments and media assets from the approved projection.

The code-level gate is now **`PASS_SOURCE_ONLY`**: the projection is enforced
by a tenant-scoped durable write/read boundary and a fail-closed customer API
guard in source and tests. The operational pilot gate remains
**`HOLD_FOR_PILOT`** because migration `0056`, capability approval and feature
flag enablement are intentionally not applied. No durable YouTube projection
was written, no public exposure was enabled, and no provider call was made
during this implementation.
