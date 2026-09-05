# Perplexity Visitor View completion log

**Status:** `SOURCE_READY / COLLECTOR_RUNTIME_AND_PROVIDER_GATE` (not
`VERIFIED_STAGING`)

Updated: 2026-09-06 WITA

## Separate Bright Data paths

Two provider entities exist and their results must not be merged:

| Path | Identity | API contract | Verified result |
|---|---|---|---|
| Existing custom Collector | `c_mtoi7ng2wyqxm8d61` | Scraper Studio `POST /dca/trigger?collector=...` then `GET /dca/dataset?id=<job>` | Code and v1 configuration read; job `j_mtoihujw1d3aop3xrf` inspected |
| Ready Dataset API path currently wired in Selena | `gd_m7dhdot1vw9a7gc1n` | `POST /datasets/v3/trigger?dataset_id=...` then progress/snapshot | Structured auth-wall/provider-error row previously observed |

The `gd_...` failure does not prove that `c_...` failed for the same reason.
The `c_...` job must be judged only by its own code, crawl and output.

## Collector `c_mtoi7ng2wyqxm8d61`

The code is now fully read and backed up in
`evidence/PERPLEXITY_COLLECTOR_C_MTOI7NG2WYQXM8D61_V1_BACKUP.md`.

Confirmed v1 defects:

1. The Collector only opens `input.url`; it does not submit a new question.
2. It calls `collect(parse())` immediately and has no completion wait.
3. The cookie branch waits for 500 ms but never clicks the button it claims to
   dismiss.
4. `login_wall_detected` becomes true for any `/login` or `/signin` link, even
   if an answer is visible.
5. The answer is read only from `.scrollable-container`.
6. Citations are read only from that container and are not restricted to
   external answer sources.
7. Although the UI currently shows `Take screenshots` enabled, the historical
   crawl inspector says `No attached files`; the required DOM/screenshot
   evidence for that job is absent.

An unpublished development draft was persisted and independently reloaded.
It narrows parser/login detection; it does not prove completion or fix the
Code-worker incompatibility. Exact code and rollback are in the backup.
The draft has not been promoted or accepted by a provider run.

## Known job `j_mtoihujw1d3aop3xrf`

- one existing URL input;
- one record, zero failed crawls, one page load;
- job time `42s627ms`;
- historical UI spend `$0`;
- `answer: null`, `cited_sources: []`;
- `login_wall_detected: true`;
- final URL equals input URL;
- no crawl error and no attached files.

This proves that the v1 parser produced no answer for that run. Because the
detector is over-broad and raw page evidence is missing, it does not prove a
real login wall.

## Selena connection

The local source now has a separate, opt-in Scraper Studio DCA transport for
this exact Collector; it does not substitute `c_*` into `dataset_id`. It:

- submits one top-level-array input to `/dca/trigger` with `version`,
  `queue_next=1` and `no_downloads=1`;
- accepts one `collection_id` with a `j_*` identity;
- polls only `/dca/log/<job>` and reads the dataset only after the documented
  exact `Status: "done"`;
- reads `/dca/dataset?id=<job>` once and never retriggers;
- requires exactly one output row, the exact current question URL in
  `input.url`, and an HTTPS Perplexity `/search/<id>` in `final_url` before an
  answer can be valid. URL shape alone is not proof of a freshly completed answer;
- deduplicates external citations and excludes internal Perplexity links;
- remains disabled unless
  `SELENA_BRIGHTDATA_PERPLEXITY_DCA_VERSION=dev|prod` is explicitly set. The
  Collector id remains pinned to `c_mtoi7ng2wyqxm8d61` in source.

This is source-only. It has not been pushed or deployed to the isolated staging
worker. A delegated implementation agent created local commit `c7260fa0`
without the required owner commit authorization; it was not pushed, and the
subsequent DCA contract and fresh-input corrections remain uncommitted. No
history was rewritten to hide that event.

The upstream source now produces `https://www.perplexity.ai/?q=<question>` and
will accept only a resulting new `/search/<id>`. Runtime proof is still absent.
The existing Collector step is a **Code** worker. Bright Data documents that a
Code worker performs HTTP-style requests and cannot execute the browser-only
wait/input/network functions needed for a dynamic Perplexity answer; the
historical job also has no attached screenshot. The same development step can
be changed to **Browser** in the current Collector UI, but that reversible
configuration change was not saved because the platform may immediately
restart Preview and create a provider event.

## Source fixes already completed

- Structured provider error rows are stored as `PROVIDER_ERROR_ROW`, not zero
  visibility; response evidence is hash-only and error text is not persisted.
- A visible login control with an available answer remains a successful answer
  in adapter regression coverage.
- Global emergency stop is checked before spend reservation and permit claim;
  a stopped cycle releases its reservation without invoking a provider.

Latest checks: DCA/Visitor adapter 46/46; adapter + executor + repository
103/103; worker 36/36; lib and worker typechecks; targeted Biome and
`git diff --check`. Node is 22.23.0 and reports the repository's expected
Node-24 engine warning. These are source tests, not a live Collector receipt.

Independent source review first rejected the early-ready status handling. The
correction now waits only for exact `Status: "done"`, enforces one-row
cardinality and safe citation handling; the independent re-review returned
`PASS` for the DCA source contract. Live acceptance remains open.

## Remaining acceptance gate

Before a live run, the remaining external work is:

1. save the same Collector's development step as Browser worker and persist
   the browser-safe interaction in the already-backed-up unpublished draft;
2. commit/push the reviewed source and redeploy only the isolated staging
   worker with DCA version `dev`; do not change the shared worker or production;
3. execute the bounded provider package below.

Provider package:

1. exactly one development diagnostic, one input/page load, no retry:
   `What is the capital of Indonesia?`;
2. only if its JSON, screenshot/DOM, `Status: "done"`, new `/search/<id>` and
   full answer are usable, exactly three one-shot questions through Selena
   staging:
   - `What is the best Greek restaurant in Uluwatu?`
   - `Where can I eat modern Greek food in Uluwatu, Bali?`
   - `Which Greek restaurant near Uluwatu has sunset views?`
3. stop immediately on the first failed prerequisite or result; do not spend
   the unused remainder;
4. tenant-scoped persistence and UI read-back, then independent review of the
   live evidence and restoration of fail-closed runtime state.

Public Scraper Studio pay-as-you-go pricing is `$1.50 / 1,000` page loads. At
one page load per input, the exact planned four-run provider estimate is
`$0.006`. The account currently shows free credits, but they are not treated as
a guaranteed `$0` charge. Selena's conservative Bright Data ledger estimate is
`$0.01` per dispatched job, so the four-job owner cap and reservation envelope
must be `$0.04`. Historical free-credit or `$0` receipts are not represented
as a guarantee.

No new Collector, Dataset, provider, credential change, schedule, production
change or migration `0052` is part of this work.

## 2026-09-06 authorized execution checkpoint

Owner explicitly authorized development-only Code-to-Browser change and save,
one automatic Preview diagnostic, then three serial staging questions only on
success; maximum four single-page runs, no retry, aggregate hard USD 0.04.
Commit/push current branch and isolated staging-worker redeploy with DCA `dev`
are authorized. These permissions no longer require renewed approval.

Live read-only recheck found Error mode Fail and Auto-fix parser code checked
but disabled. Self-Healing opens a manual refactor dialog; it was closed without
submitting. No documented hard-dollar/automatic-retry control for Preview was
found. The 0.006 page-load estimate and 0.04 Selena estimate reservation are
not a verified provider-enforced ceiling. Provider execution remains HOLD for
this concrete budget/no-retry precondition, not missing owner permission.

The authorized question URL and Browser interaction are prepared in the open
editor only; Save to development/Preview were not clicked in this execution
window, and worker type remains Code. New Bright Data runs: 0/4. No new Bright
Data charge was initiated. A previous save did navigate during Preview and
failed with Code-worker click unsupported; its billing remains unverified,
not a claim that the historical Preview made no provider request.

Isolated worker verified by name and ID:
`gate1-worker-0051-20260905` / `1117e147-6769-46d1-8b2e-fa8d6928ea50`,
staging `90f3bf7f-5e53-4de3-a3f7-56052b706f24`.
Token name present; secret value never read. Shared worker settings were only
read: release/selena-visibility-mvp, auto-deploy disabled. Current push target
is codex/selena-v1-4-orchestration, not that release branch.

Independent source review requested full body deadlines, provider deadline,
HTTPS final URL, terminal DCA failure (no legacy fallback), failure job-ID
preservation, and selected-only parsing of the Perplexity setting. Corrections
pass independent re-review. Adapter tests: 59/59; lib/worker typechecks PASS.
Only the Perplexity worker hunks are staged; unrelated role/auth edits excluded.
