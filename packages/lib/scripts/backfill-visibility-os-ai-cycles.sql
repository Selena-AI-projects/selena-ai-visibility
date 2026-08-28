BEGIN;

INSERT INTO "sv_measurement_cycles" (
	"id",
	"organization_id",
	"domain_id",
	"domain_cycle_id",
	"configuration_lock_id",
	"status",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"organization_id",
	'AI',
	"id",
	"lock_id",
	"status"::text,
	"created_at",
	"updated_at"
FROM "sv_cycles"
ON CONFLICT ("domain_id", "domain_cycle_id") DO NOTHING;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "sv_cycles" AS "legacy_cycle"
		LEFT JOIN "sv_measurement_cycles" AS "registered_cycle"
			ON "registered_cycle"."domain_id" = 'AI'
			AND "registered_cycle"."domain_cycle_id" = "legacy_cycle"."id"
		WHERE "registered_cycle"."id" IS NULL
			OR "registered_cycle"."id" <> "legacy_cycle"."id"
			OR "registered_cycle"."organization_id" <> "legacy_cycle"."organization_id"
			OR "registered_cycle"."configuration_lock_id" <> "legacy_cycle"."lock_id"
	) THEN
		RAISE EXCEPTION 'VISIBILITY_OS_AI_CYCLE_BACKFILL_MISMATCH';
	END IF;
END $$;

COMMIT;
