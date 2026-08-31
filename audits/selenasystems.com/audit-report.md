# Audit: selenasystems.com · 31 Aug 2026 · 0 pages (site unreachable this session)

**Scope:** full 13-layer audit requested. **Capability matrix for this run** (per THE CAPABILITY RULE):

| Layer | Bucket this run |
|---|---|
| 1. Search Console | REQUIRES OWNER DATA - not supplied |
| 2. Semrush | UNAVAILABLE WITHOUT CONNECTOR - none present |
| 3. Competitor benchmark | UNAVAILABLE WITHOUT CONNECTOR / REQUIRES OWNER DATA - no live fetch, no Semrush |
| 4. Backlinks & authority | UNAVAILABLE WITHOUT CONNECTOR |
| 5. On-page (80 checks) | BLOCKED - site unreachable this session (normally FULLY AUTOMATED) |
| 6. Technical (Lighthouse) | BLOCKED - site unreachable this session |
| 7. AI surfaces / GEO | BLOCKED (paper grade, site unreachable) + REQUIRES OWNER DATA (live citation test, 3 checks) |
| 8. Index hygiene | BLOCKED - site unreachable this session |
| 9. Framework traps | BLOCKED - site unreachable this session |
| 10. Hidden content | BLOCKED - site unreachable this session |
| 11. Local / GBP | SKIPPED - non-local SaaS business, stated per Layer 11's own rule |
| 12. Keyword reality check | REQUIRES OWNER DATA / UNAVAILABLE WITHOUT CONNECTOR |
| 13. Thin & doorway content | BLOCKED - site unreachable this session |
| Site-level reads | BLOCKED / REQUIRES OWNER DATA |

None of the above is a crash or a silent skip - every layer resolved to a stated reason, per THE CAPABILITY RULE.

### [ ] 1. Grant this environment (or a future session) live access to selenasystems.com · unblocks 8 of 13 layers

`selenasystems.com` and `www.selenasystems.com` both return `EGRESS_BLOCKED` (session network policy denial, confirmed via `WebFetch` on 31 Aug 2026, matching the same result from the prior audit run). No page, `robots.txt`, `sitemap.xml`, or `llms.txt` could be fetched.

**Who:** you (grant egress, or run `/audit` from a session without this restriction) or paste the homepage source / `robots.txt` / `sitemap.xml` directly into the conversation
**Time:** depends on your environment's policy config
**Changes:** none to the site.

### [ ] 2. Connect a Semrush MCP connector, or paste a Site Audit / Organic Research export · unlocks Layers 2, 3, 4, 12

No Semrush connector is present in this session (checked via tool search).

**Who:** you
**Time:** ~2 min to connect, longer if a Site Audit project doesn't exist yet
**Changes:** none to the site.

### [ ] 3. Export your four Search Console reports · 2 min, and it's yours only

Performance, Pages, Core Web Vitals, Manual actions. Not supplied this run.

**Who:** you, in Search Console
**Time:** 2 min
**Changes:** none to the site.

### [ ] 4. Run the live AI-surface citation test manually · closes the last 3 of 38 GEO checks

Ask ChatGPT, Perplexity, and Google AI Mode "who is Selena Systems" plus 3-5 real buyer questions; log who gets cited. This session has no interactive, authenticated access to those three products, so it was not run and not simulated, per THE CAPABILITY RULE.

**Who:** you (a human with logged-in access to the three products)
**Time:** ~15 min
**Changes:** none to the site.

---

## What this audit did NOT measure - 31 Aug 2026

- **On-page (80 checks), Technical (Lighthouse), GEO paper grade (31 of 38 checks), index hygiene, framework traps, hidden content, thin/doorway, structure** - not measured, `selenasystems.com` and `www.selenasystems.com` blocked by this session's network egress policy. Closes with item 1 above.
- **Semrush (Site Health, keywords, backlinks, competitor traffic/referring-domain columns)** - not measured, no connector. Closes with item 2 above.
- **Search Console (positions, indexed count, Core Web Vitals field data, manual actions)** - not measured, exports not supplied. Closes with item 3 above.
- **Live AI-surface citation test (3 of 38 GEO checks)** - not measured, no interactive AI-chat access in this session. Closes with item 4 above.
- **Local / Google Business Profile (Layer 11)** - skipped by design, not silently dropped. Selena Systems is a SaaS/software product (per this repo's `PRODUCT.md`, it serves local businesses, hospitality teams, agencies etc. as *customers*), not itself a storefront with a physical local service area.
- **Competitor benchmark, backlink gap, keyword reality check, cannibalization** - not measured, all depend on Search Console and/or Semrush data.

## AI-surface baseline

Not yet established - the live citation test (item 4) has never been run for this domain. Once it runs, this section becomes the dated baseline future runs compare against.

## Score

Not computed. Zero of ~150+ checks across 13 layers were measured this run. A number here would be invented. This is a **smoke test of the `/audit` skill itself** (confirming it runs, degrades gracefully, and produces both deliverables without any companion command or paid connector) - not a claim about the site's actual SEO/AEO state. Re-run once item 1 (site access) is in place for a real first score.
