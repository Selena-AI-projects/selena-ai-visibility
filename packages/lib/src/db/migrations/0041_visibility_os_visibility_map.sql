CREATE VIEW "sv_visibility_map_points" WITH (security_invoker = true) AS
SELECT
	observation."organization_id",
	entity."project_id",
	observation."location_id",
	min(observation."captured_at") OVER (
		PARTITION BY evidence."dataset_id", observation."location_id"
	) AS "period_start",
	max(observation."captured_at") OVER (
		PARTITION BY evidence."dataset_id", observation."location_id"
	) AS "period_end",
	evidence."dataset_id",
	local_cycle."measurement_cycle_id",
	local_cycle."id" AS "local_cycle_id",
	local_cycle."status"::text AS "dataset_status",
	observation."grid_definition_id",
	grid."version" AS "grid_definition_version",
	observation."grid_point_id",
	point."point_index",
	point."latitude",
	point."longitude",
	observation."id" AS "observation_id",
	observation."captured_at",
	observation."provider",
	observation."keyword_id",
	keyword."text" AS "keyword",
	keyword."language" AS "locale",
	observation."capture_mode" AS "device_context",
	grid."formula_version",
	observation."repeat_index",
	observation."validity"::text AS "source_validity",
	observation."invalid_reason",
	observation."target_rank",
	CASE
		WHEN observation."validity" = 'VALID' AND observation."target_rank" IS NOT NULL THEN 'MEASURED'
		WHEN observation."validity" = 'VALID' THEN 'MISSING'
		WHEN observation."validity" = 'INVALID' THEN 'INVALID'
		ELSE 'UNKNOWN'
	END AS "display_status",
	false AS "interpolated",
	'LIVE_VIEW'::text AS "materialization_kind",
	NULL::timestamptz AS "refreshed_at",
	false AS "is_stale"
FROM "sv_local_rank_observations" AS observation
JOIN "sv_local_scan_cycles" AS local_cycle
	ON local_cycle."id" = observation."cycle_id"
	AND local_cycle."organization_id" = observation."organization_id"
JOIN "sv_evidence_index" AS evidence
	ON evidence."organization_id" = observation."organization_id"
	AND evidence."domain_id" = 'LOCAL'
	AND evidence."cycle_id" = local_cycle."measurement_cycle_id"
	AND evidence."observation_ref" = observation."id"::text
JOIN "sv_measurement_datasets" AS dataset
	ON dataset."id" = evidence."dataset_id"
	AND dataset."organization_id" = observation."organization_id"
	AND dataset."cycle_id" = local_cycle."measurement_cycle_id"
	AND dataset."immutable" = true
JOIN "sv_grid_definitions" AS grid
	ON grid."id" = observation."grid_definition_id"
	AND grid."organization_id" = observation."organization_id"
JOIN "sv_grid_points" AS point
	ON point."id" = observation."grid_point_id"
	AND point."grid_id" = observation."grid_definition_id"
	AND point."organization_id" = observation."organization_id"
JOIN "sv_local_keywords" AS keyword
	ON keyword."id" = observation."keyword_id"
	AND keyword."location_id" = observation."location_id"
	AND keyword."organization_id" = observation."organization_id"
JOIN "sv_business_locations" AS location
	ON location."id" = observation."location_id"
	AND location."organization_id" = observation."organization_id"
JOIN "sv_entities" AS entity
	ON entity."id" = location."entity_id"
	AND entity."organization_id" = observation."organization_id";
--> statement-breakpoint
CREATE VIEW "sv_visibility_map_datasets" WITH (security_invoker = true) AS
SELECT
	point."organization_id",
	point."project_id",
	point."location_id",
	point."dataset_id",
	point."measurement_cycle_id",
	point."local_cycle_id",
	min(point."captured_at") AS "period_start",
	max(point."captured_at") AS "period_end",
	array_agg(DISTINCT point."keyword_id" ORDER BY point."keyword_id") AS "keyword_ids",
	point."grid_definition_id",
	point."grid_definition_version",
	array_agg(DISTINCT point."provider" ORDER BY point."provider") AS "providers",
	array_agg(DISTINCT point."locale" ORDER BY point."locale") AS "locales",
	array_agg(DISTINCT point."device_context" ORDER BY point."device_context") AS "device_contexts",
	array_agg(DISTINCT point."formula_version" ORDER BY point."formula_version") AS "formula_versions",
	point."dataset_status",
	count(*)::integer AS "observation_count",
	'LIVE_VIEW'::text AS "materialization_kind",
	NULL::timestamptz AS "refreshed_at",
	false AS "is_stale"
FROM "sv_visibility_map_points" AS point
GROUP BY
	point."organization_id",
	point."project_id",
	point."location_id",
	point."dataset_id",
	point."measurement_cycle_id",
	point."local_cycle_id",
	point."grid_definition_id",
	point."grid_definition_version",
	point."dataset_status";
