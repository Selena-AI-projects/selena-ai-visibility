ALTER TABLE "sv_attribution_assessments"
	DROP CONSTRAINT IF EXISTS "sv_attribution_assessments_outcome_window_fk",
	DROP COLUMN IF EXISTS "outcome_window_id";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_validate_outcome_window_scope_trigger" ON "sv_outcome_attribution_windows";
--> statement-breakpoint
DROP FUNCTION IF EXISTS "sv_validate_outcome_window_scope"();
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_outcome_attribution_windows";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_guard_outcome_observation_immutable_trigger" ON "sv_outcome_observations";
--> statement-breakpoint
DROP FUNCTION IF EXISTS "sv_guard_outcome_observation_immutable"();
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_outcome_observations";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_validate_outcome_source_scope_trigger" ON "sv_outcome_sources";
--> statement-breakpoint
DROP FUNCTION IF EXISTS "sv_validate_outcome_source_scope"();
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_outcome_sources";
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_outcome_metric_definitions";
