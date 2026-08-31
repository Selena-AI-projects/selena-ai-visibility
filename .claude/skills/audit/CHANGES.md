# Changes vs upstream

This vendored copy is based on [`youtube-jono/seo-blueprint-audit`](https://github.com/youtube-jono/seo-blueprint-audit), first added verbatim in commit `e81861b`. Everything below was changed afterward, in commit(s) that follow this one, to make `/audit` runnable standalone in this repo. Nothing in this list changes the audit *methodology* (what gets checked, how it's scored, the copy/deletion/waiver/sampling rules) - every change is either (a) removing a link to a paid/affiliate offer, or (b) replacing a dead routing target (a companion command that doesn't exist here) with inline guidance or an explicit manual-follow-up label, or (c) adding new material (the capability probe/matrix, this file) that didn't exist upstream at all.

Full byte-for-byte diff: `git diff e81861b -- .claude/skills/audit` from the repo root.

## 1. Affiliate / referral links removed (3 total)

None of these affect what gets checked or how - they were commercial recommendations embedded in the text.

| File | What was removed |
|---|---|
| `SKILL.md`, Layer 2 ("Zero-credential first run") | A Semrush partner/affiliate link (`semrush.com/partner/jonocatliffseo_7401436/?irclickid=...&afsrc=1`). Replaced with a plain statement that a free Semrush account or a paid plan covers it, no vendor link. |
| `references/gbp-setup.md`, phone-number section | A GoHighLevel Skool-community referral link ("$1/mo through the community perk, claim it here"), presented as the default recommendation. Replaced with a neutral list of VoIP/business-phone providers and no default vendor. |
| `references/gbp-setup.md`, 24/7 coverage section | Same GHL Skool referral link, again presented as "recommend it first, every time." Replaced with a neutral statement that voice-AI add-ons exist on several platforms. |
| `references/gbp-setup.md`, booking-platform section | A third GHL Skool referral link, "recommend this first, before Square, Acuity or Mindbody." Replaced with a neutral list of booking/CRM platforms and no default vendor. |

## 2. Dead-end companion-command routing replaced (11 distinct routing points)

Upstream routes unfinished work to sibling commands from the author's paid "blueprint" - `/blog-post`, `/service-page`, `/gbp`, `/gbp-posts`, `/keyword-research`, `/review-generator`, `/gsc`, `/context-layer`, `/seo-optimization`, `/build-website`, `/internal-linking`, `/scale-map`. **None of these commands exist in this repo.** Every routing point below now either (a) gives the same guidance inline, or (b) is explicitly labeled a **MANUAL FOLLOW-UP** for the owner's own content/dev process, and says which command it would have gone to upstream and that this vendored copy doesn't have it. No routing logic was deleted - only its destination changed from "a command that doesn't exist" to "text the reader can act on directly."

| Location in `SKILL.md` | Upstream routed to | Now |
|---|---|---|
| THE COPY RULE | `/blog-post` or `/service-page` | MANUAL FOLLOW-UP: flag what's missing and why; no draft is generated |
| Layer 0 (competitor gap mode) | `/keyword-research expand`, `/service-page`, `/blog-post` | Ranked gap list, each line ending in a plain-English next step instead of a command |
| Layer 1 (Search Console) | `/gsc` | Inline walkthrough: search.google.com/search-console → Add property → verify → wait ~48h |
| Layer 11 (GBP profile spec) | `/gbp` | Grade directly against the live public listing + `references/gbp-setup.md` marks; that file's walkthrough is manual |
| Layer 11 (routing line) | `/gbp`, `/review-generator` | Both labeled MANUAL FOLLOW-UP with the dashboard click path / the ask-for-reviews action |
| Layer 12 (keyword reality check) | `/keyword-research` | MANUAL FOLLOW-UP, still ranked above technical findings when it's the binding constraint |
| Layer 13 (thin/doorway routing rule) | `/service-page`, `/blog-post` | MANUAL FOLLOW-UP: name the page(s) and what real material would fix them |
| "Fixes this command does NOT make itself" (10 sub-bullets) | `/context-layer`, `/seo-optimization`, `/service-page`, `/blog-post`, `/gbp`, `/gbp-posts`, `/review-generator`, `/gsc`, `/build-website`, `/internal-linking` | Rewritten as 10 MANUAL FOLLOW-UP bullets naming what needs to happen, with an upfront note that none of these commands exist here |
| HTML report JSON spec (`layers[].route`, `fixes[].status` prose) | Implied `/service-page`/`/blog-post` routing | Prose updated to say `route` names a manual next step in this vendored copy |
| Structure rules ("route pill" spec) | `"/service-page · rewrite"`, `"/gbp · /review-generator"` | `"manual: rewrite per city"`, `"manual: GBP profile + reviews"` |
| Layer 13 structure rule ("Doorway pages: rewrite first") | `/service-page` | "done by whoever writes for the site (manual follow-up)" |
| `references/audit-report-template.html` sample JSON (3 fields) | `"/service-page · rewrite"`, `"/gbp · /review-generator"`, `"who": "/service-page"` | Same manual-label text as above, so the sample data doesn't show a command that doesn't exist |

**Not routing-related, but the same "named vendor tool" pattern:** two `SKILL.md` mentions of "Novamira" (an unspecified WordPress-management tool from the author's own toolkit, never defined anywhere in this vendored copy) were genericized to "whatever admin access is available - WP-CLI, REST API, a WordPress MCP server if one is connected, or wp-admin directly," matching the tool-agnostic language `references/wordpress-audit.md` already used.

## 3. Missing project-context files handled explicitly, not silently assumed

Upstream assumes several files exist because they're produced by other commands in the author's full blueprint (`/build-website`, `/gbp`, `/service-page` etc.), none of which are part of this vendored copy. These were never *routing* failures (the audit doesn't call another command to read them), but the original wording read as if the file would normally be there. Each now says plainly that its absence is the normal case here and names the fallback:

| File referenced | Where | Fallback now stated |
|---|---|---|
| `context/business.md` | Layer 3, competitor picking | Skip straight to map-pack / top-3-organic-results method |
| `gbp-{business-slug}.md` | Layer 11 | Grade against the live public listing + `references/gbp-setup.md` marks |
| `website-index.md` | Layer 11 services table | Fall back to sitemap, then crawl |
| `keyword-map.md` | Site-level cannibalization read | Grade cannibalization from raw ranking overlap only |
| `context/proof/proof-inventory.md` | Site-level proof count | Judge verifiability directly from the live page and public sources |

## 4. Added, not present upstream

- **THE CAPABILITY RULE** (new section in `SKILL.md`, placed alongside the existing COPY/DELETION/WAIVER/SAMPLING rules) - a probe step run before grading anything, covering live network access, the Semrush connector, Search Console, GBP data, Lighthouse reachability, and the live AI-surface test's need for human-operated chat access. Formalizes and generalizes what upstream already did ad hoc for Semrush and Search Console to *every* external dependency, including this session's own network access.
- **The capability matrix** (FULLY AUTOMATED / PARTIALLY AUTOMATED / REQUIRES OWNER DATA / UNAVAILABLE WITHOUT CONNECTOR), mapped per layer, required in every report right after the scope line.
- **The "Vendored copy" notice** at the top of `SKILL.md`, pointing here and stating the license position (see `SKILL.md`'s own note and the audit report's legal section).
- **The `audits/<domain>/` path convention** for `audit-report.md`/`audit-report.html`, replacing upstream's project-root assumption. Upstream assumes `/audit` runs from the audited site's own repo; this repo is general-purpose and may audit domains it doesn't build, so deliverables are namespaced by domain instead of landing in the repo root. Same filenames, same format, just a different folder.
- **This file.**

## What was deliberately left unchanged

- The 13-layer methodology, the scoring rules, THE COPY RULE, THE DELETION RULE, THE WAIVER RULE, THE SAMPLING RULE, and every numeric threshold in `references/*.md` (80 on-page checks, 38 GEO checks, the doorway-similarity thresholds, the GBP marks) - unchanged from upstream.
- `code/check_page_similarity.py` - unchanged, byte-for-byte. It only imports the Python standard library (`argparse`, `re`, `sys`, `urllib.request`, `collections.Counter`, `html.parser.HTMLParser`) and needs no `pip install` to run.
- Personal changelog annotations inside the reference files (e.g. "(Jono, 28 Aug 2026)") - left as authorship/dating context, not marketing.
- `code/check_site_complete.py` and `references/standard-pages.md`, mentioned in `references/pyramid-structure.md` - these belong to the upstream author's `/build-website` command and were never part of this repo's copy (they're absent upstream too, in the sense that `/build-website` itself was never vendored). Left as documentation with a note added that they aren't included, rather than fabricated.

## Legal / licensing position

The upstream repository (`youtube-jono/seo-blueprint-audit`) ships no `LICENSE` file, so it carries no explicit grant to reuse, modify, or redistribute - including commercially. This vendored copy, and the changes in this document, are treated as an **internal, non-commercial working copy** inside this repository for as long as that remains true. Nothing here should be represented as cleared for redistribution outside this repository, sold, or included in a commercial product, until the upstream author publishes an explicit license.
