LOCK TABLE
	"sv_projects",
	"sv_configuration_locks",
	"sv_entities",
	"sv_business_locations",
	"sv_measurement_domains",
	"sv_measurement_cycles",
	"sv_measurement_datasets",
	"sv_source_snapshots",
	"sv_local_scan_cycles",
	"sv_local_rank_observations",
	"sv_measurement_attempts",
	"sv_evidence_index",
	"sv_cost_events",
	"sv_findings",
	"sv_recommendations"
IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
CREATE FUNCTION "sv_prevent_configuration_lock_mutation"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'CONFIGURATION_LOCK_APPEND_ONLY';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_configuration_lock_mutation"
	BEFORE UPDATE OR DELETE ON "sv_configuration_locks"
	FOR EACH ROW EXECUTE FUNCTION "sv_prevent_configuration_lock_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_configuration_lock_truncate"
	BEFORE TRUNCATE ON "sv_configuration_locks"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_prevent_configuration_lock_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_cost_event_truncate"
	BEFORE TRUNCATE ON "sv_cost_events"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_prevent_cost_event_mutation"();
--> statement-breakpoint
DO $$
BEGIN
	IF (
		SELECT count(*)
		FROM "sv_measurement_domains"
		WHERE "domain_id" IN ('LOCAL', 'LOCAL_MAPS')
			AND "unit_of_measure" = 'location_keyword_coordinate_provider'
	) <> 2 THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_DOMAIN_REGISTRY_PREFLIGHT_FAILED';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_configuration_locks"
		WHERE "version" <= 0
	) THEN
		RAISE EXCEPTION 'CONFIGURATION_LOCK_0045_NONPOSITIVE_VERSION';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_configuration_locks" AS configuration_lock
		LEFT JOIN "sv_projects" AS project
			ON project."id" = configuration_lock."project_id"
		WHERE project."id" IS NULL
			OR project."organization_id" IS DISTINCT FROM configuration_lock."organization_id"
	) THEN
		RAISE EXCEPTION 'CONFIGURATION_LOCK_0045_PROJECT_ORGANIZATION_MISMATCH';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_measurement_cycles" AS measurement_cycle
		LEFT JOIN "sv_configuration_locks" AS configuration_lock
			ON configuration_lock."id" = measurement_cycle."configuration_lock_id"
		WHERE configuration_lock."id" IS NULL
			OR configuration_lock."organization_id" IS DISTINCT FROM measurement_cycle."organization_id"
	) THEN
		RAISE EXCEPTION 'MEASUREMENT_CYCLE_0045_CONFIGURATION_LOCK_SCOPE_MISMATCH';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_configuration_locks"
		GROUP BY "project_id", "version"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'CONFIGURATION_LOCK_0045_PROJECT_VERSION_COLLISION';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_measurement_cycles" AS legacy
		JOIN "sv_measurement_cycles" AS canonical
			ON canonical."domain_id" = 'LOCAL_MAPS'
			AND canonical."domain_cycle_id" = legacy."domain_cycle_id"
		WHERE legacy."domain_id" = 'LOCAL'
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_MEASUREMENT_CYCLE_COLLISION';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_evidence_index" AS legacy
		JOIN "sv_evidence_index" AS canonical
			ON canonical."domain_id" = 'LOCAL_MAPS'
			AND canonical."observation_ref" = legacy."observation_ref"
		WHERE legacy."domain_id" = 'LOCAL'
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_EVIDENCE_COLLISION';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_measurement_attempts"
		WHERE "domain_id" = 'LOCAL'
			OR "base_slot_key" LIKE 'LOCAL|%'
			OR "execution_key" LIKE 'LOCAL|%'
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_LEGACY_ATTEMPT_IDENTITY';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_local_scan_cycles" AS local_cycle
		LEFT JOIN "sv_measurement_cycles" AS measurement_cycle
			ON measurement_cycle."id" = local_cycle."measurement_cycle_id"
			AND measurement_cycle."domain_id" = local_cycle."domain_id"
		WHERE local_cycle."domain_id" IN ('LOCAL', 'LOCAL_MAPS')
			AND (
				measurement_cycle."id" IS NULL
				OR measurement_cycle."organization_id" IS DISTINCT FROM local_cycle."organization_id"
				OR measurement_cycle."configuration_lock_id" IS DISTINCT FROM local_cycle."configuration_lock_id"
			)
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_LOCAL_CYCLE_LOCK_SCOPE_MISMATCH';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_local_scan_cycles" AS local_cycle
		LEFT JOIN "sv_business_locations" AS location
			ON location."id" = local_cycle."location_id"
			AND location."organization_id" = local_cycle."organization_id"
		LEFT JOIN "sv_entities" AS entity
			ON entity."id" = location."entity_id"
			AND entity."organization_id" = local_cycle."organization_id"
		LEFT JOIN "sv_configuration_locks" AS configuration_lock
			ON configuration_lock."id" = local_cycle."configuration_lock_id"
			AND configuration_lock."organization_id" = local_cycle."organization_id"
		WHERE local_cycle."domain_id" IN ('LOCAL', 'LOCAL_MAPS')
			AND (
				location."id" IS NULL
				OR entity."id" IS NULL
				OR configuration_lock."id" IS NULL
				OR entity."project_id" IS DISTINCT FROM configuration_lock."project_id"
			)
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_LOCATION_LOCK_PROJECT_SCOPE_MISMATCH';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_cost_events" AS cost_event
		LEFT JOIN "sv_measurement_cycles" AS measurement_cycle
			ON measurement_cycle."id" = cost_event."measurement_cycle_id"
			AND measurement_cycle."domain_id" = cost_event."domain_id"
		WHERE cost_event."domain_id" IN ('LOCAL', 'LOCAL_MAPS')
			AND (
				measurement_cycle."id" IS NULL
				OR measurement_cycle."organization_id" IS DISTINCT FROM cost_event."organization_id"
			)
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_COST_SCOPE_MISMATCH';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_evidence_index" AS evidence
		LEFT JOIN "sv_measurement_cycles" AS measurement_cycle
			ON measurement_cycle."id" = evidence."cycle_id"
			AND measurement_cycle."domain_id" = evidence."domain_id"
		LEFT JOIN "sv_measurement_datasets" AS dataset
			ON dataset."id" = evidence."dataset_id"
		LEFT JOIN "sv_source_snapshots" AS source_snapshot
			ON source_snapshot."id" = evidence."source_snapshot_id"
		WHERE evidence."domain_id" IN ('LOCAL', 'LOCAL_MAPS')
			AND (
				measurement_cycle."id" IS NULL
				OR measurement_cycle."organization_id" IS DISTINCT FROM evidence."organization_id"
				OR dataset."organization_id" IS DISTINCT FROM evidence."organization_id"
				OR dataset."cycle_id" IS DISTINCT FROM evidence."cycle_id"
				OR (
					evidence."source_snapshot_id" IS NOT NULL
					AND source_snapshot."organization_id" IS DISTINCT FROM evidence."organization_id"
				)
			)
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_EVIDENCE_PROVENANCE_SCOPE_MISMATCH';
	END IF;

	-- Change existing FK timing before adding new FK triggers in this transaction.
	ALTER TABLE "sv_local_scan_cycles"
		ALTER CONSTRAINT "sv_local_scan_cycles_measurement_domain_fk"
		DEFERRABLE INITIALLY IMMEDIATE;
	ALTER TABLE "sv_evidence_index"
		ALTER CONSTRAINT "sv_evidence_index_cycle_domain_fk"
		DEFERRABLE INITIALLY IMMEDIATE;
	ALTER TABLE "sv_cost_events"
		ALTER CONSTRAINT "sv_cost_events_measurement_domain_fk"
		DEFERRABLE INITIALLY IMMEDIATE;

	ALTER TABLE "sv_configuration_locks"
		ADD CONSTRAINT "sv_configuration_locks_version_check"
		CHECK ("version" > 0) NOT VALID;
	ALTER TABLE "sv_configuration_locks"
		VALIDATE CONSTRAINT "sv_configuration_locks_version_check";
	CREATE UNIQUE INDEX "sv_locks_project_version_unique"
		ON "sv_configuration_locks" ("project_id", "version");
	DROP INDEX "sv_locks_project_version_idx";
	CREATE UNIQUE INDEX "sv_projects_id_organization_unique"
		ON "sv_projects" ("id", "organization_id");
	CREATE UNIQUE INDEX "sv_configuration_locks_id_organization_unique"
		ON "sv_configuration_locks" ("id", "organization_id");
	CREATE UNIQUE INDEX "sv_configuration_locks_id_project_org_unique"
		ON "sv_configuration_locks" ("id", "project_id", "organization_id");
	ALTER TABLE "sv_configuration_locks"
		ADD CONSTRAINT "sv_configuration_locks_project_organization_fk"
		FOREIGN KEY ("project_id", "organization_id")
		REFERENCES "sv_projects" ("id", "organization_id") NOT VALID;
	ALTER TABLE "sv_configuration_locks"
		VALIDATE CONSTRAINT "sv_configuration_locks_project_organization_fk";
	CREATE UNIQUE INDEX "sv_measurement_cycles_id_domain_org_lock_unique"
		ON "sv_measurement_cycles" (
			"id", "domain_id", "organization_id", "configuration_lock_id"
		);
	ALTER TABLE "sv_measurement_cycles"
		ADD CONSTRAINT "sv_measurement_cycles_configuration_lock_scope_fk"
		FOREIGN KEY ("configuration_lock_id", "organization_id")
		REFERENCES "sv_configuration_locks" ("id", "organization_id") NOT VALID;
	ALTER TABLE "sv_measurement_cycles"
		VALIDATE CONSTRAINT "sv_measurement_cycles_configuration_lock_scope_fk";
	CREATE UNIQUE INDEX "sv_source_snapshots_id_organization_unique"
		ON "sv_source_snapshots" ("id", "organization_id");

	SET CONSTRAINTS
		"sv_local_scan_cycles_measurement_domain_fk",
		"sv_evidence_index_cycle_domain_fk",
		"sv_cost_events_measurement_domain_fk"
	DEFERRED;

	ALTER TABLE "sv_cost_events"
		DISABLE TRIGGER "sv_prevent_cost_event_mutation";

	UPDATE "sv_measurement_cycles"
	SET "domain_id" = 'LOCAL_MAPS'
	WHERE "domain_id" = 'LOCAL';

	UPDATE "sv_local_scan_cycles"
	SET "domain_id" = 'LOCAL_MAPS'
	WHERE "domain_id" = 'LOCAL';

	UPDATE "sv_cost_events"
	SET "domain_id" = 'LOCAL_MAPS'
	WHERE "domain_id" = 'LOCAL';

	UPDATE "sv_evidence_index"
	SET "domain_id" = 'LOCAL_MAPS'
	WHERE "domain_id" = 'LOCAL';

	UPDATE "sv_findings"
	SET "domain_id" = 'LOCAL_MAPS'
	WHERE "domain_id" = 'LOCAL';

	UPDATE "sv_recommendations"
	SET "domain_id" = 'LOCAL_MAPS'
	WHERE "domain_id" = 'LOCAL';

	SET CONSTRAINTS
		"sv_local_scan_cycles_measurement_domain_fk",
		"sv_evidence_index_cycle_domain_fk",
		"sv_cost_events_measurement_domain_fk"
	IMMEDIATE;

	-- Re-enable the append-only trigger only after deferred FK events are drained.
	ALTER TABLE "sv_cost_events"
		ENABLE TRIGGER "sv_prevent_cost_event_mutation";

	ALTER TABLE "sv_local_scan_cycles"
		ALTER CONSTRAINT "sv_local_scan_cycles_measurement_domain_fk" NOT DEFERRABLE;
	ALTER TABLE "sv_evidence_index"
		ALTER CONSTRAINT "sv_evidence_index_cycle_domain_fk" NOT DEFERRABLE;
	ALTER TABLE "sv_cost_events"
		ALTER CONSTRAINT "sv_cost_events_measurement_domain_fk" NOT DEFERRABLE;

	ALTER TABLE "sv_local_scan_cycles"
		DROP CONSTRAINT "sv_local_scan_cycles_measurement_domain_fk";
	ALTER TABLE "sv_local_scan_cycles"
		ADD CONSTRAINT "sv_local_scan_cycles_measurement_domain_fk"
		FOREIGN KEY (
			"measurement_cycle_id", "domain_id", "organization_id", "configuration_lock_id"
		)
		REFERENCES "sv_measurement_cycles" (
			"id", "domain_id", "organization_id", "configuration_lock_id"
		) NOT VALID;
	ALTER TABLE "sv_local_scan_cycles"
		VALIDATE CONSTRAINT "sv_local_scan_cycles_measurement_domain_fk";

	ALTER TABLE "sv_evidence_index"
		DROP CONSTRAINT "sv_evidence_index_cycle_domain_fk";
	ALTER TABLE "sv_evidence_index"
		ADD CONSTRAINT "sv_evidence_index_cycle_domain_fk"
		FOREIGN KEY ("cycle_id", "domain_id", "organization_id")
		REFERENCES "sv_measurement_cycles" ("id", "domain_id", "organization_id") NOT VALID;
	ALTER TABLE "sv_evidence_index"
		VALIDATE CONSTRAINT "sv_evidence_index_cycle_domain_fk";
	ALTER TABLE "sv_evidence_index"
		ADD CONSTRAINT "sv_evidence_index_dataset_cycle_org_fk"
		FOREIGN KEY ("dataset_id", "cycle_id", "organization_id")
		REFERENCES "sv_measurement_datasets" ("id", "cycle_id", "organization_id") NOT VALID;
	ALTER TABLE "sv_evidence_index"
		VALIDATE CONSTRAINT "sv_evidence_index_dataset_cycle_org_fk";
	ALTER TABLE "sv_evidence_index"
		ADD CONSTRAINT "sv_evidence_index_source_snapshot_org_fk"
		FOREIGN KEY ("source_snapshot_id", "organization_id")
		REFERENCES "sv_source_snapshots" ("id", "organization_id") NOT VALID;
	ALTER TABLE "sv_evidence_index"
		VALIDATE CONSTRAINT "sv_evidence_index_source_snapshot_org_fk";

	ALTER TABLE "sv_cost_events"
		DROP CONSTRAINT "sv_cost_events_measurement_domain_fk";
	ALTER TABLE "sv_cost_events"
		ADD CONSTRAINT "sv_cost_events_measurement_domain_fk"
		FOREIGN KEY ("measurement_cycle_id", "domain_id", "organization_id")
		REFERENCES "sv_measurement_cycles" ("id", "domain_id", "organization_id") NOT VALID;
	ALTER TABLE "sv_cost_events"
		VALIDATE CONSTRAINT "sv_cost_events_measurement_domain_fk";

	ALTER TABLE "sv_local_scan_cycles"
		ADD CONSTRAINT "sv_local_scan_cycles_domain_check_strict"
		CHECK ("domain_id" = 'LOCAL_MAPS') NOT VALID;
	ALTER TABLE "sv_local_scan_cycles"
		VALIDATE CONSTRAINT "sv_local_scan_cycles_domain_check_strict";
	ALTER TABLE "sv_local_scan_cycles"
		DROP CONSTRAINT "sv_local_scan_cycles_domain_check";
	ALTER TABLE "sv_local_scan_cycles"
		RENAME CONSTRAINT "sv_local_scan_cycles_domain_check_strict"
		TO "sv_local_scan_cycles_domain_check";

	CREATE OR REPLACE VIEW "sv_visibility_map_points" WITH (security_invoker = true) AS
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
		AND evidence."domain_id" = local_cycle."domain_id"
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
		AND entity."organization_id" = observation."organization_id"
	WHERE local_cycle."domain_id" = 'LOCAL_MAPS';

	IF EXISTS (
		SELECT 1
		FROM "sv_measurement_domains"
		WHERE "domain_id" = 'LOCAL'
	) AND EXISTS (
		SELECT 1 FROM "sv_measurement_cycles" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_local_scan_cycles" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_cost_events" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_evidence_index" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_findings" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_recommendations" WHERE "domain_id" = 'LOCAL'
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_BACKFILL_INCOMPLETE';
	END IF;

	DELETE FROM "sv_measurement_domains"
	WHERE "domain_id" = 'LOCAL';

	IF EXISTS (
		SELECT 1 FROM "sv_measurement_domains" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_measurement_cycles" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_local_scan_cycles" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_cost_events" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_evidence_index" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_findings" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_recommendations" WHERE "domain_id" = 'LOCAL'
		UNION ALL
		SELECT 1 FROM "sv_measurement_attempts"
			WHERE "domain_id" = 'LOCAL'
				OR "base_slot_key" LIKE 'LOCAL|%'
				OR "execution_key" LIKE 'LOCAL|%'
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_POSTCONDITION_FAILED';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_local_scan_cycles" AS local_cycle
		LEFT JOIN "sv_measurement_cycles" AS measurement_cycle
			ON measurement_cycle."id" = local_cycle."measurement_cycle_id"
			AND measurement_cycle."domain_id" = 'LOCAL_MAPS'
		WHERE local_cycle."domain_id" <> 'LOCAL_MAPS'
			OR measurement_cycle."id" IS NULL
			OR measurement_cycle."organization_id" IS DISTINCT FROM local_cycle."organization_id"
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_LOCAL_CYCLE_POSTCONDITION_FAILED';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "sv_evidence_index" AS evidence
		JOIN "sv_local_scan_cycles" AS local_cycle
			ON local_cycle."measurement_cycle_id" = evidence."cycle_id"
			AND local_cycle."domain_id" = evidence."domain_id"
		LEFT JOIN "sv_measurement_datasets" AS dataset
			ON dataset."id" = evidence."dataset_id"
		WHERE evidence."domain_id" = 'LOCAL_MAPS'
			AND (
				dataset."organization_id" IS DISTINCT FROM evidence."organization_id"
				OR dataset."cycle_id" IS DISTINCT FROM evidence."cycle_id"
			)
	) THEN
		RAISE EXCEPTION 'LOCAL_MAPS_0045_DATASET_LINK_POSTCONDITION_FAILED';
	END IF;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "sv_guard_local_cycle_project_scope"() RETURNS trigger AS $$
DECLARE
	linked_entity_id uuid;
	linked_project_id uuid;
	lock_project_id uuid;
BEGIN
	SELECT location."entity_id"
	INTO linked_entity_id
	FROM "sv_business_locations" AS location
	WHERE location."id" = NEW."location_id"
		AND location."organization_id" = NEW."organization_id"
	FOR UPDATE OF location;
	IF linked_entity_id IS NOT NULL THEN
		SELECT entity."project_id"
		INTO linked_project_id
		FROM "sv_entities" AS entity
		WHERE entity."id" = linked_entity_id
			AND entity."organization_id" = NEW."organization_id"
		FOR UPDATE OF entity;
	END IF;
	SELECT configuration_lock."project_id"
	INTO lock_project_id
	FROM "sv_configuration_locks" AS configuration_lock
	WHERE configuration_lock."id" = NEW."configuration_lock_id"
		AND configuration_lock."organization_id" = NEW."organization_id";

	IF linked_entity_id IS NULL
		OR linked_project_id IS NULL
		OR lock_project_id IS NULL
		OR linked_project_id IS DISTINCT FROM lock_project_id
	THEN
		RAISE EXCEPTION 'LOCAL_MAPS_LOCATION_LOCK_PROJECT_SCOPE_MISMATCH';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_local_cycle_project_scope"
	BEFORE INSERT OR UPDATE OF "organization_id", "location_id", "configuration_lock_id"
	ON "sv_local_scan_cycles"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_local_cycle_project_scope"();
--> statement-breakpoint
CREATE FUNCTION "sv_guard_local_scope_parent_mutation"() RETURNS trigger AS $$
BEGIN
	IF TG_TABLE_NAME = 'sv_entities' THEN
		IF (
				OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
				OR OLD."project_id" IS DISTINCT FROM NEW."project_id"
			)
			AND EXISTS (
				SELECT 1
				FROM "sv_business_locations" AS location
				JOIN "sv_local_scan_cycles" AS local_cycle
					ON local_cycle."location_id" = location."id"
					AND local_cycle."organization_id" = location."organization_id"
				WHERE location."entity_id" = OLD."id"
					AND location."organization_id" = OLD."organization_id"
			)
		THEN
			RAISE EXCEPTION 'LOCAL_MAPS_ENTITY_SCOPE_MUTATION_BLOCKED';
		END IF;
	END IF;

	IF TG_TABLE_NAME = 'sv_business_locations' THEN
		IF (
				OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
				OR OLD."entity_id" IS DISTINCT FROM NEW."entity_id"
			)
			AND EXISTS (
				SELECT 1
				FROM "sv_local_scan_cycles" AS local_cycle
				WHERE local_cycle."location_id" = OLD."id"
					AND local_cycle."organization_id" = OLD."organization_id"
			)
		THEN
			RAISE EXCEPTION 'LOCAL_MAPS_LOCATION_SCOPE_MUTATION_BLOCKED';
		END IF;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_local_entity_scope_mutation"
	BEFORE UPDATE OF "organization_id", "project_id" ON "sv_entities"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_local_scope_parent_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_guard_local_location_scope_mutation"
	BEFORE UPDATE OF "organization_id", "entity_id" ON "sv_business_locations"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_local_scope_parent_mutation"();
