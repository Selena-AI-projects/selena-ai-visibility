CREATE TABLE "sv_provider_dataset_snapshot_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL,
	"provider" text DEFAULT 'BRIGHT_DATA' NOT NULL,
	"source" text NOT NULL,
	"provider_dataset_id" text NOT NULL,
	"snapshot_id" text NOT NULL,
	"phase" text NOT NULL,
	"provider_status" text,
	"record_count" integer,
	"observed_at" timestamptz NOT NULL,
	"event_hash" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_provider_dataset_snapshot_events_project_org_fk"
		FOREIGN KEY ("project_id", "organization_id")
		REFERENCES "sv_projects"("id", "organization_id"),
	CONSTRAINT "sv_provider_dataset_snapshot_events_shape_check" CHECK (
		"provider" = btrim("provider") AND length("provider") > 0
		AND "source" = btrim("source") AND length("source") > 0
		AND "provider_dataset_id" = btrim("provider_dataset_id") AND length("provider_dataset_id") > 0
		AND "snapshot_id" = btrim("snapshot_id") AND length("snapshot_id") > 0
		AND (
			"provider_status" IS NULL
			OR ("provider_status" = btrim("provider_status") AND length("provider_status") > 0)
		)
	),
	CONSTRAINT "sv_provider_dataset_snapshot_events_phase_check" CHECK (
		"phase" IN (
			'TRIGGERED', 'RESUMED', 'PENDING', 'READY', 'DELIVERED',
			'TIMEOUT', 'TERMINAL_FAILURE', 'INVALID', 'INTERRUPTED'
		)
	),
	CONSTRAINT "sv_provider_dataset_snapshot_events_record_count_check" CHECK (
		("phase" = 'DELIVERED' AND "record_count" IS NOT NULL AND "record_count" >= 0)
		OR ("phase" <> 'DELIVERED' AND "record_count" IS NULL)
	),
	CONSTRAINT "sv_provider_dataset_snapshot_events_provider_status_check" CHECK (
		"phase" NOT IN ('PENDING', 'READY', 'TERMINAL_FAILURE') OR "provider_status" IS NOT NULL
	),
	CONSTRAINT "sv_provider_dataset_snapshot_events_event_hash_check" CHECK (
		"event_hash" ~ '^sha256:[a-f0-9]{64}$'
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_provider_dataset_snapshot_events_event_hash_unique"
	ON "sv_provider_dataset_snapshot_events" ("organization_id", "project_id", "event_hash");
--> statement-breakpoint
CREATE INDEX "sv_provider_dataset_snapshot_events_snapshot_observed_idx"
	ON "sv_provider_dataset_snapshot_events" ("organization_id", "project_id", "snapshot_id", "observed_at");
--> statement-breakpoint
CREATE INDEX "sv_provider_dataset_snapshot_events_phase_observed_idx"
	ON "sv_provider_dataset_snapshot_events" ("organization_id", "project_id", "phase", "observed_at");
--> statement-breakpoint
ALTER TABLE "sv_provider_dataset_snapshot_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_provider_dataset_snapshot_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_provider_dataset_snapshot_events"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE FUNCTION "sv_enforce_provider_dataset_snapshot_event_insert"() RETURNS trigger
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
--> statement-breakpoint
CREATE TRIGGER "sv_provider_dataset_snapshot_events_insert_guard"
	BEFORE INSERT ON "sv_provider_dataset_snapshot_events"
	FOR EACH ROW EXECUTE FUNCTION "sv_enforce_provider_dataset_snapshot_event_insert"();
--> statement-breakpoint
CREATE FUNCTION "sv_reject_provider_dataset_snapshot_event_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'PROVIDER_DATASET_SNAPSHOT_EVENT_IMMUTABLE';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sv_provider_dataset_snapshot_events_immutable_guard"
	BEFORE UPDATE OR DELETE ON "sv_provider_dataset_snapshot_events"
	FOR EACH ROW EXECUTE FUNCTION "sv_reject_provider_dataset_snapshot_event_mutation"();
--> statement-breakpoint
CREATE TRIGGER "sv_provider_dataset_snapshot_events_truncate_guard"
	BEFORE TRUNCATE ON "sv_provider_dataset_snapshot_events"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_reject_provider_dataset_snapshot_event_mutation"();
--> statement-breakpoint
COMMENT ON TABLE "sv_provider_dataset_snapshot_events" IS
	'Append-only tenant lifecycle metadata for provider dataset snapshots. Raw provider payloads and social user data are forbidden.';
