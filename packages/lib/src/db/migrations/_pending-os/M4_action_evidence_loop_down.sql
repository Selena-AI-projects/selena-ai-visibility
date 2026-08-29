DROP TRIGGER IF EXISTS "sv_guard_attribution_assessment_trigger" ON "sv_attribution_assessments";
--> statement-breakpoint
DROP FUNCTION IF EXISTS "sv_guard_attribution_assessment"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sv_guard_action_status_transition_trigger" ON "sv_approved_actions";
--> statement-breakpoint
DROP FUNCTION IF EXISTS "sv_guard_action_status_transition"();
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_attribution_assessments";
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_verification_cycles";
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_change_event_assets";
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_change_events";
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_action_approvals";
--> statement-breakpoint
DROP TABLE IF EXISTS "sv_approved_actions";
--> statement-breakpoint
ALTER TABLE "sv_measurement_datasets"
	DROP CONSTRAINT IF EXISTS "sv_measurement_datasets_id_cycle_organization_unique";
--> statement-breakpoint
ALTER TABLE "sv_recommendations"
	DROP COLUMN IF EXISTS "location_id",
	DROP COLUMN IF EXISTS "domain_id";
--> statement-breakpoint
ALTER TABLE "sv_findings"
	DROP COLUMN IF EXISTS "location_id",
	DROP COLUMN IF EXISTS "domain_id";
--> statement-breakpoint
DROP TYPE IF EXISTS "sv_attribution_confidence";
--> statement-breakpoint
DROP TYPE IF EXISTS "sv_attribution_verdict";
--> statement-breakpoint
DROP TYPE IF EXISTS "sv_verification_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "sv_change_verification";
--> statement-breakpoint
DROP TYPE IF EXISTS "sv_action_status";
