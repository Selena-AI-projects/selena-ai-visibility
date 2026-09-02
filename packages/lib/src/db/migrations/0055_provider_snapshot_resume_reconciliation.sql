CREATE OR REPLACE FUNCTION "sv_enforce_provider_dataset_snapshot_event_insert"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	latest_event "sv_provider_dataset_snapshot_events"%ROWTYPE;
BEGIN
	PERFORM pg_advisory_xact_lock(
		hashtextextended(
			NEW."organization_id" || ':' || NEW."project_id"::text || ':' || NEW."snapshot_id",
			0
		)
	);

	IF EXISTS (
		SELECT 1
		FROM "sv_provider_dataset_snapshot_events"
		WHERE "organization_id" = NEW."organization_id"
			AND "project_id" = NEW."project_id"
			AND "event_hash" = NEW."event_hash"
	) THEN
		RETURN NULL;
	END IF;

	SELECT * INTO latest_event
	FROM "sv_provider_dataset_snapshot_events"
	WHERE "organization_id" = NEW."organization_id"
		AND "project_id" = NEW."project_id"
		AND "snapshot_id" = NEW."snapshot_id"
	ORDER BY "observed_at" DESC, "created_at" DESC, "id" DESC
	LIMIT 1;

	IF NOT FOUND THEN
		IF NEW."phase" NOT IN ('TRIGGERED', 'RESUMED') THEN
			RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_INITIAL_PHASE_INVALID';
		END IF;
		RETURN NEW;
	END IF;

	IF latest_event."provider" <> NEW."provider"
		OR latest_event."source" <> NEW."source"
		OR latest_event."provider_dataset_id" <> NEW."provider_dataset_id" THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_IDENTITY_MISMATCH';
	END IF;
	IF NEW."observed_at" < latest_event."observed_at" THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_OBSERVED_AT_REGRESSION';
	END IF;
	IF latest_event."phase" IN ('DELIVERED', 'TIMEOUT', 'TERMINAL_FAILURE', 'INVALID') THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_TERMINAL';
	END IF;
	IF latest_event."phase" = 'INTERRUPTED' AND NEW."phase" <> 'RESUMED' THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_RESUME_REQUIRED';
	END IF;
	IF latest_event."phase" = 'READY'
		AND NEW."phase" NOT IN ('DELIVERED', 'TIMEOUT', 'INVALID', 'INTERRUPTED') THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_TRANSITION_INVALID';
	END IF;
	IF latest_event."phase" IN ('TRIGGERED', 'RESUMED', 'PENDING')
		AND NEW."phase" NOT IN (
			'PENDING', 'READY', 'TIMEOUT', 'TERMINAL_FAILURE', 'INVALID', 'INTERRUPTED'
		) THEN
		RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_TRANSITION_INVALID';
	END IF;
	RETURN NEW;
END;
$$;
