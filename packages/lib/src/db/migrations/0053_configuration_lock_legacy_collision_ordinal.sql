-- Two shapes of "sv_configuration_locks" exist in the wild: the one 0045
-- produced, unique on ("project_id", "version"), and the one staging holds,
-- which already carries "legacy_collision_ordinal" so that pre-hardening rows
-- may keep a shared version. Every statement here leaves the second shape as
-- it stands and brings the first up to it.
LOCK TABLE "sv_configuration_locks" IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint
ALTER TABLE "sv_configuration_locks"
	ADD COLUMN IF NOT EXISTS "legacy_collision_ordinal" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Ordinals run oldest-first within a version, so zero identifies the original
-- of any duplicate set and a re-run assigns what the previous run assigned.
-- Under either shape this matches no rows; the append-only trigger stands
-- down for it only so that a shape neither of them anticipated cannot wedge
-- the migration.
ALTER TABLE "sv_configuration_locks"
	DISABLE TRIGGER "sv_prevent_configuration_lock_mutation";
--> statement-breakpoint
WITH ranked_locks AS (
	SELECT
		"id",
		(row_number() OVER (
			PARTITION BY "project_id", "version"
			ORDER BY "created_at", "id"
		) - 1)::integer AS collision_ordinal
	FROM "sv_configuration_locks"
)
UPDATE "sv_configuration_locks" AS configuration_lock
SET "legacy_collision_ordinal" = ranked_locks.collision_ordinal
FROM ranked_locks
WHERE configuration_lock."id" = ranked_locks."id"
	AND configuration_lock."legacy_collision_ordinal" IS DISTINCT FROM ranked_locks.collision_ordinal;
--> statement-breakpoint
ALTER TABLE "sv_configuration_locks"
	ENABLE TRIGGER "sv_prevent_configuration_lock_mutation";
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "sv_configuration_locks"
		GROUP BY "project_id", "version"
		HAVING min("legacy_collision_ordinal") <> 0
			OR max("legacy_collision_ordinal") <> count(*) - 1
			OR count(DISTINCT "legacy_collision_ordinal") <> count(*)
	) THEN
		RAISE EXCEPTION 'CONFIGURATION_LOCK_0053_LEGACY_ORDINAL_POSTCONDITION_FAILED';
	END IF;
END;
$$;
--> statement-breakpoint
ALTER TABLE "sv_configuration_locks"
	DROP CONSTRAINT IF EXISTS "sv_configuration_locks_legacy_collision_ordinal_check";
--> statement-breakpoint
ALTER TABLE "sv_configuration_locks"
	ADD CONSTRAINT "sv_configuration_locks_legacy_collision_ordinal_check"
	CHECK ("legacy_collision_ordinal" >= 0) NOT VALID;
--> statement-breakpoint
ALTER TABLE "sv_configuration_locks"
	VALIDATE CONSTRAINT "sv_configuration_locks_legacy_collision_ordinal_check";
--> statement-breakpoint
-- New locks never carry an ordinal: the column exists only to describe rows
-- that predate the uniqueness hardening.
CREATE OR REPLACE FUNCTION "sv_guard_configuration_lock_insert"() RETURNS trigger AS $$
BEGIN
	IF NEW."legacy_collision_ordinal" <> 0 THEN
		RAISE EXCEPTION 'CONFIGURATION_LOCK_LEGACY_COLLISION_ORDINAL_RESERVED';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_guard_configuration_lock_insert" ON "sv_configuration_locks";
--> statement-breakpoint
CREATE TRIGGER "sv_guard_configuration_lock_insert"
	BEFORE INSERT ON "sv_configuration_locks"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_configuration_lock_insert"();
--> statement-breakpoint
-- The conflict target lock allocation names, and the reason for all the above.
DROP INDEX IF EXISTS "sv_locks_project_version_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_locks_project_version_unique"
	ON "sv_configuration_locks" ("project_id", "version", "legacy_collision_ordinal");
