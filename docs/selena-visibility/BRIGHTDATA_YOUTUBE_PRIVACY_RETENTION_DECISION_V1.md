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

The staging `worker` environment now has the two non-secret feature variables
set, with deployment intentionally skipped. They will take effect on the next
worker deployment; no provider call or restart was triggered by setting them.

Before any durable pilot, the remaining work is:

1. Store only the approved projection plus provenance and hashes. Keep raw
   retention disabled in the registry.
2. Enforce tenant-scoped access and prevent public/customer API exposure of the
   evidence projection until product approval.
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

The gate is nevertheless **`HOLD_FOR_PILOT`**, not `PASS`: the projection is
currently exercised by the manual canary and tests, but is not yet the enforced
boundary of a durable provider-evidence persistence path or a customer API
route. No durable YouTube projection was written, no public exposure was
enabled, and no provider call was made during this audit. Pilot activation must
first add and verify that tenant-scoped persistence/API boundary under a
separate owner-approved change.
