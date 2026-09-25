import { o as parseModelFilter } from "./model-filter-DGVUY-LA.mjs";
import { L as sql, t as drizzle } from "../_libs/drizzle-orm.mjs";
import { t as runtimeDatabaseConnection } from "./postgres-config-IAJOu_38.mjs";
import { a as getAllProviders } from "./providers-kvP4SquB.mjs";
import { t as UNAVAILABLE_SENTINEL } from "./fanout-analysis-Bt4WW_et.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/postgres-read-BdoLn4e5.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "29adfa26-fcb9-4880-8de6-af80621b36bc", e._sentryDebugIdIdentifier = "sentry-dbid-29adfa26-fcb9-4880-8de6-af80621b36bc");
	} catch (e) {}
})();
/**
* Whether a timezone sticks to whole-hour UTC offsets across the queried
* range. The hourly rollup can assemble local days only when local midnight
* falls on an hour boundary; fractional-offset zones (India +5:30, Nepal
* +5:45, Lord Howe's half-hour DST) must fall back to scanning prompt_runs.
*/
function offsetMinutesAt(timeZone, at) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	}).formatToParts(at);
	const get = (type) => Number(parts.find((p) => p.type === type)?.value);
	const hour = get("hour") === 24 ? 0 : get("hour");
	const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
	return Math.round((asUtc - at.getTime()) / 6e4);
}
function usesWholeHourOffsets(timeZone, fromDate, toDate) {
	const to = toDate ? /* @__PURE__ */ new Date(`${toDate}T00:00:00Z`) : /* @__PURE__ */ new Date();
	const from = fromDate ? /* @__PURE__ */ new Date(`${fromDate}T00:00:00Z`) : /* @__PURE__ */ new Date(to.getTime() - 3456e7);
	const mid = /* @__PURE__ */ new Date((from.getTime() + to.getTime()) / 2);
	try {
		return [
			from,
			mid,
			to
		].every((d) => offsetMinutesAt(timeZone, d) % 60 === 0);
	} catch {
		return false;
	}
}
/**
* Postgres analytics read layer.
*
* All analytics queries run against PostgreSQL with covering indices
* on prompt_runs and citations tables.
*/
var db = drizzle({ connection: runtimeDatabaseConnection() });
async function queryPg(query) {
	return (await db.execute(query)).rows;
}
function dateFilter(fromDate, toDate, timezone) {
	if (!fromDate || !toDate) return sql``;
	return sql`AND created_at >= (${fromDate}::date AT TIME ZONE ${timezone}) AND created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})`;
}
function hourBucketDateFilter(fromDate, toDate, timezone) {
	if (!fromDate || !toDate) return sql``;
	return sql`AND hour_bucket >= (${fromDate}::date AT TIME ZONE ${timezone}) AND hour_bucket < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})`;
}
function uuidList(ids) {
	return sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `);
}
function promptIdFilter(enabledPromptIds) {
	if (!enabledPromptIds?.length) return sql``;
	return sql`AND prompt_id IN (${uuidList(enabledPromptIds)})`;
}
/**
* Provider ids that reach a model by calling it directly. Combined with
* `web_search_enabled`, this is what separates a grounded API answer from the
* same model scraped off its consumer product — `prompt_runs` records the
* provider, and both rows carry `model = 'chatgpt'` with web search on.
*
* Caveat: a provider that picks its route per target (DataForSEO scrapes by
* default and calls the API when a target pins a version) is classified by its
* default here, since the row doesn't record which route ran.
*/
var API_PROVIDER_IDS = getAllProviders().filter((provider) => provider.access === "api").map((provider) => provider.id);
/**
* Narrow to one target. A bare model id means the standard platform; the
* `::premium` variant means the grounded API call sold from the premium pool.
*
* The provider list is bound one parameter per id rather than as an array:
* drizzle flattens a JS array into a single text parameter, which `ANY(...)`
* then can't compare element-wise.
*/
function modelFilter(model, opts) {
	const target = model ? parseModelFilter(model) : null;
	if (!target) return sql``;
	const prefix = opts?.alias ? sql.raw(`${opts.alias}.`) : sql``;
	if (API_PROVIDER_IDS.length === 0) return target.premium ? sql`AND FALSE` : sql`AND ${prefix}model = ${target.model}`;
	const providers = sql.join(API_PROVIDER_IDS.map((id) => sql`${id}`), sql`, `);
	const grounded = opts?.source === "citations" ? sql`EXISTS (
					SELECT 1 FROM prompt_runs AS mf_run
					WHERE mf_run.id = ${prefix}prompt_run_id
						AND mf_run.web_search_enabled
						AND mf_run.provider IN (${providers})
				)` : sql`(${prefix}web_search_enabled AND ${prefix}provider IN (${providers}))`;
	return sql`AND ${prefix}model = ${target.model} AND ${target.premium ? grounded : sql`NOT ${grounded}`}`;
}
function webSearchFilter(webSearchEnabled) {
	if (webSearchEnabled === void 0) return sql``;
	return sql`AND web_search_enabled = ${webSearchEnabled}`;
}
async function getDashboardSummary(brandId, fromDate, toDate, timezone, enabledPromptIds) {
	return await queryPg(sql`
		SELECT
			count(*)::int AS total_runs,
			to_char(max(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' AS last_updated
		FROM prompt_runs
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
	`);
}
async function getPerPromptVisibilityTimeSeries(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	if (usesWholeHourOffsets(timezone, fromDate, toDate)) return queryPg(sql`
			SELECT
				prompt_id,
				(hour_bucket AT TIME ZONE ${timezone})::date AS date,
				sum(total_runs)::int AS total_runs,
				sum(brand_mentioned_count)::int AS brand_mentioned_count
			FROM prompt_run_hourly_aggregates
			WHERE brand_id = ${brandId}
				${hourBucketDateFilter(fromDate, toDate, timezone)}
				${promptIdFilter(enabledPromptIds)}
				${modelFilter(model)}
			GROUP BY prompt_id, date
			ORDER BY prompt_id, date
		`);
	return await queryPg(sql`
		SELECT
			prompt_id,
			(created_at AT TIME ZONE ${timezone})::date AS date,
			count(*)::int AS total_runs,
			count(*) FILTER (WHERE brand_mentioned)::int AS brand_mentioned_count
		FROM prompt_runs
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model)}
		GROUP BY prompt_id, date
		ORDER BY prompt_id, date
	`);
}
/**
* Single-query replacement for `getPerPromptVisibilityTimeSeries` + JS
* `applyPerPromptLVCF`.
*
* Builds a (prompt × date) grid in-database, left-joins raw daily observations,
* and uses the `count(non_null) OVER (PARTITION BY prompt ORDER BY date)`
* "grouper" trick to carry the last observation forward. Leading-null dates
* (before a prompt's first observation) are back-seeded with the prompt's
* earliest value to mirror the existing JS behavior. The result is already
* aggregated by day and bucketed by branded / non-branded.
*
* Returns one row per date in [fromDate, toDate], which is O(days) transfer
* rather than O(prompts × days), and drops the JS LVCF pass entirely.
*/
async function getVisibilityDailyAggregate(brandId, fromDate, toDate, timezone, enabledPromptIds, brandedPromptIds, model) {
	if (enabledPromptIds.length === 0) return [];
	const brandedIdsRelation = brandedPromptIds.length ? sql`(SELECT unnest(ARRAY[${sql.join(brandedPromptIds.map((id) => sql`${id}::uuid`), sql`, `)}]::uuid[]) AS bid)` : sql`(SELECT NULL::uuid AS bid WHERE FALSE)`;
	const observationsSource = usesWholeHourOffsets(timezone, fromDate, toDate) ? sql`SELECT
					prompt_id,
					(hour_bucket AT TIME ZONE ${timezone})::date AS obs_date,
					sum(total_runs)::int AS total_runs,
					sum(brand_mentioned_count)::int AS brand_mentioned_count
				FROM prompt_run_hourly_aggregates
				WHERE brand_id = ${brandId}
					AND prompt_id IN (${uuidList(enabledPromptIds)})
					AND hour_bucket >= (${fromDate}::date AT TIME ZONE ${timezone})
					AND hour_bucket < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
					${modelFilter(model)}
				GROUP BY prompt_id, obs_date` : sql`SELECT
					prompt_id,
					(created_at AT TIME ZONE ${timezone})::date AS obs_date,
					count(*)::int AS total_runs,
					count(*) FILTER (WHERE brand_mentioned)::int AS brand_mentioned_count
				FROM prompt_runs
				WHERE brand_id = ${brandId}
					AND prompt_id IN (${uuidList(enabledPromptIds)})
					AND created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
					AND created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
					${modelFilter(model)}
				GROUP BY prompt_id, obs_date`;
	return await queryPg(sql`
		WITH
			date_range AS (
				SELECT series::date AS day
				FROM generate_series(${fromDate}::date, ${toDate}::date, interval '1 day') AS g(series)
			),
			prompts_list AS (
				SELECT
					p.pid AS prompt_id,
					bp.bid IS NOT NULL AS is_branded
				FROM unnest(ARRAY[${sql.join(enabledPromptIds.map((id) => sql`${id}::uuid`), sql`, `)}]::uuid[]) AS p(pid)
				LEFT JOIN ${brandedIdsRelation} bp ON bp.bid = p.pid
			),
			observations AS (
				${observationsSource}
			),
			first_obs AS (
				SELECT DISTINCT ON (prompt_id)
					prompt_id,
					total_runs AS first_runs,
					brand_mentioned_count AS first_mentioned
				FROM observations
				ORDER BY prompt_id, obs_date
			),
			grid AS (
				SELECT
					pl.prompt_id,
					pl.is_branded,
					dr.day AS date,
					obs.total_runs AS actual_runs,
					obs.brand_mentioned_count AS actual_mentioned,
					count(obs.total_runs) OVER (PARTITION BY pl.prompt_id ORDER BY dr.day) AS fwd_grp
				FROM prompts_list pl
				CROSS JOIN date_range dr
				LEFT JOIN observations obs
					ON obs.prompt_id = pl.prompt_id AND obs.obs_date = dr.day
			),
			lvcf AS (
				SELECT
					g.prompt_id,
					g.is_branded,
					g.date,
					g.actual_runs,
					g.actual_mentioned,
					coalesce(
						max(g.actual_runs) OVER (PARTITION BY g.prompt_id, g.fwd_grp),
						fo.first_runs
					) AS lvcf_runs,
					coalesce(
						max(g.actual_mentioned) OVER (PARTITION BY g.prompt_id, g.fwd_grp),
						fo.first_mentioned
					) AS lvcf_mentioned
				FROM grid g
				LEFT JOIN first_obs fo ON fo.prompt_id = g.prompt_id
			)
		SELECT
			to_char(date, 'YYYY-MM-DD') AS date,
			coalesce(sum(actual_runs) FILTER (WHERE is_branded), 0)::int AS actual_branded_runs,
			coalesce(sum(actual_mentioned) FILTER (WHERE is_branded), 0)::int AS actual_branded_mentioned,
			coalesce(sum(actual_runs) FILTER (WHERE NOT is_branded), 0)::int AS actual_nonbranded_runs,
			coalesce(sum(actual_mentioned) FILTER (WHERE NOT is_branded), 0)::int AS actual_nonbranded_mentioned,
			coalesce(sum(lvcf_runs) FILTER (WHERE is_branded), 0)::int AS lvcf_branded_runs,
			coalesce(sum(lvcf_mentioned) FILTER (WHERE is_branded), 0)::int AS lvcf_branded_mentioned,
			coalesce(sum(lvcf_runs) FILTER (WHERE NOT is_branded), 0)::int AS lvcf_nonbranded_runs,
			coalesce(sum(lvcf_mentioned) FILTER (WHERE NOT is_branded), 0)::int AS lvcf_nonbranded_mentioned
		FROM lvcf
		GROUP BY date
		ORDER BY date
	`);
}
/**
* Plain count of citations for the filter window. Used by the visibility bar,
* which only needs the scalar total — the old `getDailyCitationStats` call
* there returned one row per (date × domain) and we reduced to a single
* number client-side, which is wasteful on large tables.
*/
async function getCitationsTotalCount(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (enabledPromptIds && enabledPromptIds.length === 0) return 0;
	const rows = await queryPg(sql`
		SELECT count(*)::int AS total
		FROM citations
		WHERE brand_id = ${brandId}
			AND created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model, { source: "citations" })}
	`);
	return Number(rows[0]?.total ?? 0);
}
async function getPromptsFirstEvaluatedAt(brandId, promptIds) {
	if (promptIds.length === 0) return [];
	return await queryPg(sql`
		SELECT
			prompt_id,
			min(created_at) AT TIME ZONE 'UTC' AS first_evaluated_at
		FROM prompt_runs
		WHERE brand_id = ${brandId}
			AND prompt_id IN (${uuidList(promptIds)})
		GROUP BY prompt_id
	`);
}
async function getPromptsSummary(brandId, fromDate, toDate, timezone, webSearchEnabled, model, enabledPromptIds) {
	return await queryPg(sql`
		SELECT
			prompt_id,
			count(*)::int AS total_runs,
			round(count(*) FILTER (WHERE brand_mentioned) * 100.0 / NULLIF(count(*), 0), 0)::int AS brand_mention_rate,
			round(count(*) FILTER (WHERE array_length(competitors_mentioned, 1) > 0) * 100.0 / NULLIF(count(*), 0), 0)::int AS competitor_mention_rate,
			(count(*) FILTER (WHERE brand_mentioned) * 2 + COALESCE(sum(array_length(competitors_mentioned, 1)), 0))::int AS total_weighted_mentions,
			max((created_at AT TIME ZONE ${timezone})::date) AS last_run_date
		FROM prompt_runs
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${webSearchFilter(webSearchEnabled)}
			${modelFilter(model)}
			${promptIdFilter(enabledPromptIds)}
		GROUP BY prompt_id
		ORDER BY total_runs DESC
	`);
}
async function getPromptDailyStats(promptId, fromDate, toDate, timezone, webSearchEnabled, model) {
	return await queryPg(sql`
		SELECT
			(created_at AT TIME ZONE ${timezone})::date AS date,
			count(*)::int AS total_runs,
			count(*) FILTER (WHERE brand_mentioned)::int AS brand_mentioned_count
		FROM prompt_runs
		WHERE prompt_id = ${promptId}
			${dateFilter(fromDate, toDate, timezone)}
			${webSearchFilter(webSearchEnabled)}
			${modelFilter(model)}
		GROUP BY date
		ORDER BY date
	`);
}
async function getPromptCompetitorDailyStats(promptId, fromDate, toDate, timezone, webSearchEnabled, model) {
	return await queryPg(sql`
		SELECT
			(created_at AT TIME ZONE ${timezone})::date AS date,
			competitor_name,
			count(*)::int AS mention_count
		FROM prompt_runs, unnest(competitors_mentioned) AS competitor_name
		WHERE prompt_id = ${promptId}
			${dateFilter(fromDate, toDate, timezone)}
			${webSearchFilter(webSearchEnabled)}
			${modelFilter(model)}
		GROUP BY date, competitor_name
		ORDER BY date, competitor_name
	`);
}
async function getPromptWebQueriesForMapping(promptId, fromDate, toDate, timezone) {
	return await queryPg(sql`
		SELECT
			model,
			web_query,
			to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' AS created_at_iso
		FROM prompt_runs, unnest(web_queries) AS web_query
		WHERE prompt_id = ${promptId}
			AND array_length(web_queries, 1) > 0
			${dateFilter(fromDate, toDate, timezone)}
		ORDER BY created_at ASC
	`);
}
async function getPromptWebQueryCounts(promptId, fromDate, toDate, timezone, model) {
	return await queryPg(sql`
		SELECT
			model,
			web_query,
			count(*)::int AS query_count
		FROM prompt_runs, unnest(web_queries) AS web_query
		WHERE prompt_id = ${promptId}
			AND array_length(web_queries, 1) > 0
			AND lower(btrim(web_query)) <> ${UNAVAILABLE_SENTINEL}
			${dateFilter(fromDate, toDate, timezone)}
			${modelFilter(model)}
		GROUP BY model, web_query
		ORDER BY model, query_count DESC
	`);
}
async function getCitationUrlStats(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	return await queryPg(sql`
		SELECT
			url,
			domain,
			(array_agg(title ORDER BY created_at DESC) FILTER (WHERE title IS NOT NULL))[1] AS title,
			count(*)::int AS count,
			round(avg(citation_index)::numeric, 1)::float AS avg_position,
			count(DISTINCT prompt_id)::int AS prompt_count
		FROM citations
		WHERE brand_id = ${brandId}
			AND created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model, { source: "citations" })}
		GROUP BY url, domain
		ORDER BY count DESC
	`);
}
async function getPromptCitationUrlStats(promptId, fromDate, toDate, timezone) {
	return await queryPg(sql`
		SELECT
			url,
			domain,
			(array_agg(title ORDER BY created_at DESC) FILTER (WHERE title IS NOT NULL))[1] AS title,
			count(*)::int AS count,
			round(avg(citation_index)::numeric, 1)::float AS avg_position,
			count(DISTINCT prompt_id)::int AS prompt_count
		FROM citations
		WHERE prompt_id = ${promptId}
			AND created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
		GROUP BY url, domain
		ORDER BY count DESC
	`);
}
async function getPromptMentionSummary(promptId, fromDate, toDate, timezone) {
	return (await queryPg(sql`
		SELECT
			count(*)::int AS total_runs,
			count(*) FILTER (WHERE brand_mentioned)::int AS brand_mentioned_count,
			COALESCE(sum(array_length(competitors_mentioned, 1)), 0)::int AS competitor_mentioned_count
		FROM prompt_runs
		WHERE prompt_id = ${promptId}
			AND created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
	`))[0] || {
		total_runs: 0,
		brand_mentioned_count: 0,
		competitor_mentioned_count: 0
	};
}
async function getPromptTopCompetitorMentions(promptId, fromDate, toDate, timezone, limit) {
	return await queryPg(sql`
		SELECT
			competitor_name,
			count(DISTINCT pr.id)::int AS mention_count
		FROM prompt_runs pr, unnest(pr.competitors_mentioned) AS competitor_name
		WHERE pr.prompt_id = ${promptId}
			AND pr.created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND pr.created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
		GROUP BY competitor_name
		ORDER BY mention_count DESC
		LIMIT ${limit}
	`);
}
async function getPerPromptDailyCitationStats(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	return await queryPg(sql`
		SELECT
			prompt_id,
			(created_at AT TIME ZONE ${timezone})::date AS date,
			domain,
			count(*)::int AS count
		FROM citations
		WHERE brand_id = ${brandId}
			AND created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model, { source: "citations" })}
		GROUP BY prompt_id, date, domain
		ORDER BY prompt_id, date
	`);
}
async function getPerPromptRunStats(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	return await queryPg(sql`
		SELECT
			prompt_id,
			count(*)::int AS runs,
			count(DISTINCT (created_at AT TIME ZONE ${timezone})::date)::int AS run_days,
			round(avg(CASE WHEN brand_mentioned THEN 1 ELSE 0 END)::numeric, 4)::float AS brand_mention_rate,
			round(avg(CASE WHEN cardinality(competitors_mentioned) > 0 THEN 1 ELSE 0 END)::numeric, 4)::float AS competitor_mention_rate
		FROM prompt_runs
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model)}
		GROUP BY prompt_id
	`);
}
async function getBrandMentionTotals(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	return (await queryPg(sql`
		SELECT
			count(*)::int AS total_runs,
			count(*) FILTER (WHERE brand_mentioned)::int AS brand_mentioned_runs,
			count(DISTINCT prompt_id) FILTER (WHERE brand_mentioned)::int AS brand_mentioned_prompts
		FROM prompt_runs
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model)}
	`))[0] ?? {
		total_runs: 0,
		brand_mentioned_runs: 0,
		brand_mentioned_prompts: 0
	};
}
/** Per-prompt, per-day brand and competitor mention counts — feeds LVCF-smoothed share of voice. */
async function getPerPromptDailyMentions(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	return await queryPg(sql`
		SELECT
			prompt_id,
			(created_at AT TIME ZONE ${timezone})::date::text AS date,
			count(*) FILTER (WHERE brand_mentioned)::int AS brand_mentions,
			COALESCE(sum(cardinality(competitors_mentioned)), 0)::int AS competitor_mentions
		FROM prompt_runs
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model)}
		GROUP BY prompt_id, date
		ORDER BY prompt_id, date
	`);
}
/**
* Per-prompt, per-day, per-competitor mention counts. Feeds the LVCF "current
* standings" leaderboard so the headline number, donut, and table all reflect
* the same last-day state as the share-of-voice trend (rather than a whole-window
* aggregate that wouldn't match the line's end).
*/
async function getPerPromptDailyCompetitorMentions(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	return await queryPg(sql`
		SELECT
			prompt_id,
			(created_at AT TIME ZONE ${timezone})::date::text AS date,
			competitor,
			count(*)::int AS mentions
		FROM prompt_runs, unnest(competitors_mentioned) AS competitor
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model)}
		GROUP BY prompt_id, date, competitor
		ORDER BY prompt_id, date
	`);
}
/** Per prompt, citations at the page (URL) level: one row per prompt+URL with a
* representative title and its domain, ordered by count. Aggregate to domains in
* JS for the landscape digest; use the URLs for the citation drill-downs. */
async function getPerPromptCitationPages(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	return await queryPg(sql`
		SELECT
			prompt_id,
			url,
			domain,
			(array_agg(title ORDER BY created_at DESC) FILTER (WHERE title IS NOT NULL))[1] AS title,
			count(*)::int AS count
		FROM citations
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model, { source: "citations" })}
		GROUP BY prompt_id, url, domain
		ORDER BY prompt_id, count DESC
	`);
}
/** Per prompt + day + URL: citation counts with a representative title. Powers the
*  category and page-type time-series, which are classified in JS from url + title. */
async function getPerPromptDailyCitationPages(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	return await queryPg(sql`
		SELECT
			prompt_id,
			(created_at AT TIME ZONE ${timezone})::date AS date,
			url,
			domain,
			(array_agg(title ORDER BY created_at DESC) FILTER (WHERE title IS NOT NULL))[1] AS title,
			count(*)::int AS count
		FROM citations
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
			${modelFilter(model, { source: "citations" })}
		GROUP BY prompt_id, date, url, domain
		ORDER BY prompt_id, date
	`);
}
/** Brand mention rate grouped by model, over a window — how the brand is doing
* on each tracked platform. */
async function getBrandMentionRateByModel(brandId, fromDate, toDate, timezone, enabledPromptIds) {
	if (!enabledPromptIds?.length) return [];
	return await queryPg(sql`
		SELECT
			model,
			count(*)::int AS runs,
			count(*) FILTER (WHERE brand_mentioned)::int AS brand_mentioned_count
		FROM prompt_runs
		WHERE brand_id = ${brandId}
			${dateFilter(fromDate, toDate, timezone)}
			${promptIdFilter(enabledPromptIds)}
		GROUP BY model
		ORDER BY runs DESC
	`);
}
async function getBatchChartData(brandId, promptIds, fromDate, toDate, timezone, webSearchEnabled, model) {
	if (promptIds.length === 0) return [];
	const [brandData, competitorData] = await Promise.all([queryPg(sql`
			SELECT
				prompt_id,
				(created_at AT TIME ZONE ${timezone})::date AS date,
				count(*)::int AS total_runs,
				count(*) FILTER (WHERE brand_mentioned)::int AS brand_mentioned_count
			FROM prompt_runs
			WHERE brand_id = ${brandId}
				AND prompt_id IN (${uuidList(promptIds)})
				${dateFilter(fromDate, toDate, timezone)}
				${webSearchFilter(webSearchEnabled)}
				${modelFilter(model)}
			GROUP BY prompt_id, date
			ORDER BY prompt_id, date
		`), queryPg(sql`
			SELECT
				prompt_id,
				(created_at AT TIME ZONE ${timezone})::date AS date,
				competitor_name,
				count(*)::int AS mention_count
			FROM prompt_runs, unnest(competitors_mentioned) AS competitor_name
			WHERE brand_id = ${brandId}
				AND prompt_id IN (${uuidList(promptIds)})
				${dateFilter(fromDate, toDate, timezone)}
				${webSearchFilter(webSearchEnabled)}
				${modelFilter(model)}
			GROUP BY prompt_id, date, competitor_name
			ORDER BY prompt_id, date, competitor_name
		`)]);
	const competitorMap = /* @__PURE__ */ new Map();
	for (const row of competitorData) {
		const dateKey = String(row.date);
		if (!competitorMap.has(row.prompt_id)) competitorMap.set(row.prompt_id, /* @__PURE__ */ new Map());
		const promptData = competitorMap.get(row.prompt_id);
		if (!promptData.has(dateKey)) promptData.set(dateKey, {});
		promptData.get(dateKey)[row.competitor_name] = Number(row.mention_count);
	}
	return brandData.map((row) => ({
		prompt_id: row.prompt_id,
		date: row.date,
		total_runs: row.total_runs,
		brand_mentioned_count: row.brand_mentioned_count,
		competitor_counts: competitorMap.get(row.prompt_id)?.get(String(row.date)) || {}
	}));
}
async function getAdminRunsOverTime() {
	return await queryPg(sql`
		SELECT
			(created_at AT TIME ZONE 'UTC')::date AS date,
			count(*)::int AS count
		FROM prompt_runs
		WHERE created_at >= now() - interval '30 days'
		GROUP BY date
		ORDER BY date
	`);
}
async function getAdminBrandRunStats() {
	return await queryPg(sql`
		SELECT
			brand_id,
			count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS runs_7d,
			count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS runs_30d,
			to_char(max(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || '.000Z' AS last_run_at
		FROM prompt_runs
		GROUP BY brand_id
	`);
}
async function getAdminActiveBrandsOverTime() {
	return await queryPg(sql`
		SELECT
			target_date AS date,
			count(DISTINCT brand_id)::int AS count
		FROM (
			SELECT
				brand_id,
				(created_at AT TIME ZONE 'UTC')::date + d AS target_date
			FROM prompt_runs,
				generate_series(0, 29) AS d
			WHERE created_at >= now() - interval '60 days'
		) expanded
		WHERE target_date >= current_date - 30
			AND target_date <= current_date
		GROUP BY target_date
		ORDER BY target_date
	`);
}
/**
* Predicate selecting genuine fan-out queries: non-empty, not the `unavailable`
* sentinel (OpenRouter and DataForSEO always; BrightData/Olostep on extraction
* failure), and not the prompt repeated verbatim. Shared by the breakdown, model
* totals, and per-prompt totals so all three count the same set. Requires a
* `wq` unnest alias plus the `pr` prompt_runs and `p` prompts rows in scope.
*
* The verbatim-repeat exclusion is a display rule, not data cleaning: engines
* genuinely search the prompt verbatim sometimes, and those entries stay in
* `web_queries` — but a repeat says nothing about how the prompt was rewritten,
* so it isn't fan-out. The comparison uses the prompt's CURRENT text, so after
* a prompt edit, searches of the old wording start surfacing as queries: for
* honest providers those are real searches; only pre-2026-06 DataForSEO rows
* (which fabricated `[prompt]` as their query field; the provider now writes
* the sentinel) would surface something that never ran, and those age out of
* the lookback windows.
*/
function genuineFanoutWq() {
	return sql`length(btrim(wq)) > 0 AND lower(btrim(wq)) <> ${UNAVAILABLE_SENTINEL} AND lower(btrim(wq)) <> lower(btrim(p.value))`;
}
/**
* (prompt × model × query) fan-out counts with how often the brand was mentioned.
* The LATERAL emits each run's DISTINCT normalized queries, so a run that lists
* the same query twice contributes one instance (`count` = runs that searched it,
* keeping `brand_mentions <= count` and the count >= 2 Invisible/Won gate
* meaning "ran in 2+ runs"). Normalizing here (lowercase + trim) merges case
* variants exactly like the aggregator's `norm`.
*/
async function getFanoutBreakdown(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	return queryPg(sql`
		SELECT
			pr.prompt_id,
			pr.model,
			fq.query,
			count(*)::int AS count,
			count(*) FILTER (WHERE pr.brand_mentioned)::int AS brand_mentions
		FROM prompt_runs pr
		JOIN prompts p ON p.id = pr.prompt_id
		CROSS JOIN LATERAL (
			SELECT DISTINCT lower(btrim(wq)) AS query FROM unnest(pr.web_queries) AS wq WHERE ${genuineFanoutWq()}
		) fq
		WHERE pr.brand_id = ${brandId}
			AND pr.created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND pr.created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
			AND pr.prompt_id IN (${uuidList(enabledPromptIds)})
			${modelFilter(model, { alias: "pr" })}
		GROUP BY pr.prompt_id, pr.model, fq.query
	`);
}
/** Per-model run counts and fan-out totals (the denominators for fan-outs-per-execution). */
async function getFanoutModelTotals(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	return queryPg(sql`
		SELECT
			pr.model,
			count(*) FILTER (WHERE pr.web_search_enabled)::int AS runs,
			count(*) FILTER (WHERE fq.cnt > 0)::int AS fanout_runs,
			COALESCE(sum(fq.cnt), 0)::int AS total_queries
		FROM prompt_runs pr
		JOIN prompts p ON p.id = pr.prompt_id
		CROSS JOIN LATERAL (
			SELECT count(DISTINCT lower(btrim(wq)))::int AS cnt FROM unnest(pr.web_queries) AS wq WHERE ${genuineFanoutWq()}
		) fq
		WHERE pr.brand_id = ${brandId}
			AND pr.created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND pr.created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
			AND pr.prompt_id IN (${uuidList(enabledPromptIds)})
			${modelFilter(model, { alias: "pr" })}
		GROUP BY pr.model
		ORDER BY total_queries DESC
	`);
}
/**
* Per-prompt count of runs that produced ≥1 genuine fan-out query — the
* denominator for avg fan-out per run. Uses the same `genuineFanoutWq` filter as
* the breakdown, so echoes/sentinels don't inflate it.
*/
async function getFanoutPromptTotals(brandId, fromDate, toDate, timezone, enabledPromptIds, model) {
	if (!enabledPromptIds?.length) return [];
	return queryPg(sql`
		SELECT
			pr.prompt_id,
			count(*) FILTER (WHERE fq.cnt > 0)::int AS runs
		FROM prompt_runs pr
		JOIN prompts p ON p.id = pr.prompt_id
		CROSS JOIN LATERAL (
			SELECT count(DISTINCT lower(btrim(wq)))::int AS cnt FROM unnest(pr.web_queries) AS wq WHERE ${genuineFanoutWq()}
		) fq
		WHERE pr.brand_id = ${brandId}
			AND pr.created_at >= (${fromDate}::date AT TIME ZONE ${timezone})
			AND pr.created_at < ((${toDate}::date + interval '1 day') AT TIME ZONE ${timezone})
			AND pr.prompt_id IN (${uuidList(enabledPromptIds)})
			${modelFilter(model, { alias: "pr" })}
		GROUP BY pr.prompt_id
	`);
}
//#endregion
export { getPromptMentionSummary as C, getPromptsFirstEvaluatedAt as D, getPromptWebQueryCounts as E, getPromptsSummary as O, getPromptDailyStats as S, getPromptWebQueriesForMapping as T, getPerPromptDailyMentions as _, getBrandMentionRateByModel as a, getPromptCitationUrlStats as b, getCitationsTotalCount as c, getFanoutModelTotals as d, getFanoutPromptTotals as f, getPerPromptDailyCompetitorMentions as g, getPerPromptDailyCitationStats as h, getBatchChartData as i, getVisibilityDailyAggregate as k, getDashboardSummary as l, getPerPromptDailyCitationPages as m, getAdminBrandRunStats as n, getBrandMentionTotals as o, getPerPromptCitationPages as p, getAdminRunsOverTime as r, getCitationUrlStats as s, getAdminActiveBrandsOverTime as t, getFanoutBreakdown as u, getPerPromptRunStats as v, getPromptTopCompetitorMentions as w, getPromptCompetitorDailyStats as x, getPerPromptVisibilityTimeSeries as y };

//# sourceMappingURL=postgres-read-BdoLn4e5.mjs.map