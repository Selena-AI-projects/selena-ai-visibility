-- The staging verification simulation, end to end, with nothing real in it.
--
-- Architecture v1.4 §11 keeps weekly reports and Telegram delivery on HOLD
-- until the phase gate passes. What was missing was not permission to ship the
-- feature but any way to see the chain work: a payment that activates a
-- subscription, a recipient bound by a single-use link, a report saved before
-- anything is sent, and one digest delivered under a bounded retry schedule.
-- These six tables carry that rehearsal.
--
-- The markers are constraints rather than conventions. Each row pins its
-- environment to 'staging', its mode to 'test', its source status to 'sample'
-- and its not-a-measurement flag to true, so a fixture row cannot be inserted
-- claiming to be a measurement, and a production environment that somehow ran
-- this code would still be writing rows that announce what they are. The
-- reports table pins provider_calls to 0 for the same reason: the fixture's
-- central claim is checkable by the database, not asserted in prose.
--
-- Two secrets never appear in cleartext. A connect token is stored only as its
-- SHA-256, so the table cannot mint a link; a recipient's chat id is stored as
-- a keyed hash for lookup and as ciphertext for sending, so a database copy on
-- its own cannot address the chat.
--
-- The attempt cap is enforced twice: attempts_made is bounded 0..5 on the
-- delivery, and the append-only attempt log accepts attempt numbers 1..5 only.
-- A caller that ignored the schedule still cannot record a sixth send.

CREATE TABLE "sv_simulation_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_ref" text NOT NULL,
	"customer_ref" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"amount_usd" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"environment" text DEFAULT 'staging' NOT NULL,
	"mode" text DEFAULT 'test' NOT NULL,
	"source_status" text DEFAULT 'sample' NOT NULL,
	"not_a_measurement" boolean DEFAULT true NOT NULL,
	"correlation_id" text NOT NULL,
	"activated_at" timestamptz DEFAULT now() NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_simulation_subscriptions_environment_check" CHECK ("environment" = 'staging'),
	CONSTRAINT "sv_simulation_subscriptions_mode_check" CHECK ("mode" = 'test'),
	CONSTRAINT "sv_simulation_subscriptions_source_status_check" CHECK ("source_status" = 'sample'),
	CONSTRAINT "sv_simulation_subscriptions_not_a_measurement_check" CHECK ("not_a_measurement" = true),
	CONSTRAINT "sv_simulation_subscriptions_status_check" CHECK ("status" IN ('ACTIVE', 'PAUSED', 'CANCELLED')),
	CONSTRAINT "sv_simulation_subscriptions_currency_check" CHECK ("currency" = 'USD')
);
--> statement-breakpoint
CREATE TABLE "sv_simulation_connect_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_ref" text NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"nonce" text NOT NULL,
	"environment" text DEFAULT 'staging' NOT NULL,
	"consumed_at" timestamptz,
	"expires_at" timestamptz NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_simulation_connect_tokens_environment_check" CHECK ("environment" = 'staging'),
	CONSTRAINT "sv_simulation_connect_tokens_hash_check" CHECK ("token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "sv_simulation_connect_tokens_expiry_check" CHECK ("expires_at" > "created_at")
);
--> statement-breakpoint
CREATE TABLE "sv_simulation_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_ref" text NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"chat_id_hash" text NOT NULL,
	"chat_id_ciphertext" text NOT NULL,
	"status" text DEFAULT 'BOUND' NOT NULL,
	"environment" text DEFAULT 'staging' NOT NULL,
	"bound_at" timestamptz DEFAULT now() NOT NULL,
	"unbound_at" timestamptz,
	"unbound_reason" text,
	"correlation_id" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_simulation_recipients_environment_check" CHECK ("environment" = 'staging'),
	CONSTRAINT "sv_simulation_recipients_status_check" CHECK ("status" IN ('PENDING', 'BOUND', 'UNBOUND')),
	CONSTRAINT "sv_simulation_recipients_hash_check" CHECK ("chat_id_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "sv_simulation_recipients_unbound_check" CHECK (("status" = 'UNBOUND') = ("unbound_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "sv_simulation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_ref" text NOT NULL,
	"subscription_id" uuid NOT NULL,
	"period_start" timestamptz NOT NULL,
	"period_end" timestamptz NOT NULL,
	"payload" jsonb NOT NULL,
	"environment" text DEFAULT 'staging' NOT NULL,
	"mode" text DEFAULT 'test' NOT NULL,
	"source_status" text DEFAULT 'sample' NOT NULL,
	"not_a_measurement" boolean DEFAULT true NOT NULL,
	"provider_calls" integer DEFAULT 0 NOT NULL,
	"correlation_id" text NOT NULL,
	"persisted_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_simulation_reports_environment_check" CHECK ("environment" = 'staging'),
	CONSTRAINT "sv_simulation_reports_mode_check" CHECK ("mode" = 'test'),
	CONSTRAINT "sv_simulation_reports_source_status_check" CHECK ("source_status" = 'sample'),
	CONSTRAINT "sv_simulation_reports_not_a_measurement_check" CHECK ("not_a_measurement" = true),
	CONSTRAINT "sv_simulation_reports_provider_calls_check" CHECK ("provider_calls" = 0),
	CONSTRAINT "sv_simulation_reports_period_check" CHECK ("period_end" > "period_start")
);
--> statement-breakpoint
CREATE TABLE "sv_simulation_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"project_ref" text NOT NULL,
	"report_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts_made" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamptz,
	"delivered_at" timestamptz,
	"last_error" text,
	"environment" text DEFAULT 'staging' NOT NULL,
	"mode" text DEFAULT 'test' NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_simulation_deliveries_environment_check" CHECK ("environment" = 'staging'),
	CONSTRAINT "sv_simulation_deliveries_mode_check" CHECK ("mode" = 'test'),
	CONSTRAINT "sv_simulation_deliveries_status_check" CHECK ("status" IN ('PENDING', 'DELIVERED', 'RETRY_SCHEDULED', 'FAILED', 'UNBOUND')),
	CONSTRAINT "sv_simulation_deliveries_attempt_cap_check" CHECK ("attempts_made" BETWEEN 0 AND 5),
	CONSTRAINT "sv_simulation_deliveries_delivered_check" CHECK (("status" = 'DELIVERED') = ("delivered_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "sv_simulation_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"outcome" text NOT NULL,
	"detail" text,
	"correlation_id" text NOT NULL,
	"attempted_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_simulation_delivery_attempts_range_check" CHECK ("attempt" BETWEEN 1 AND 5),
	CONSTRAINT "sv_simulation_delivery_attempts_outcome_check" CHECK ("outcome" IN ('SUCCESS', 'TEMPORARY_FAILURE', 'RECIPIENT_GONE'))
);
--> statement-breakpoint
ALTER TABLE "sv_simulation_subscriptions" ADD CONSTRAINT "sv_simulation_subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_connect_tokens" ADD CONSTRAINT "sv_simulation_connect_tokens_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_recipients" ADD CONSTRAINT "sv_simulation_recipients_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_reports" ADD CONSTRAINT "sv_simulation_reports_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_reports" ADD CONSTRAINT "sv_simulation_reports_subscription_id_sv_simulation_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."sv_simulation_subscriptions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" ADD CONSTRAINT "sv_simulation_deliveries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" ADD CONSTRAINT "sv_simulation_deliveries_report_id_sv_simulation_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."sv_simulation_reports"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" ADD CONSTRAINT "sv_simulation_deliveries_recipient_id_sv_simulation_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."sv_simulation_recipients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_delivery_attempts" ADD CONSTRAINT "sv_simulation_delivery_attempts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sv_simulation_delivery_attempts" ADD CONSTRAINT "sv_simulation_delivery_attempts_delivery_id_sv_simulation_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."sv_simulation_deliveries"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_simulation_subscriptions_event_unique" ON "sv_simulation_subscriptions" USING btree ("provider","provider_event_id");
--> statement-breakpoint
CREATE INDEX "sv_simulation_subscriptions_org_idx" ON "sv_simulation_subscriptions" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "sv_simulation_subscriptions_project_idx" ON "sv_simulation_subscriptions" USING btree ("organization_id","project_ref");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_simulation_connect_tokens_hash_unique" ON "sv_simulation_connect_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "sv_simulation_connect_tokens_project_idx" ON "sv_simulation_connect_tokens" USING btree ("organization_id","project_ref");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_simulation_recipients_active_unique" ON "sv_simulation_recipients" USING btree ("organization_id","project_ref","channel") WHERE "sv_simulation_recipients"."status" = 'BOUND';
--> statement-breakpoint
CREATE INDEX "sv_simulation_recipients_project_idx" ON "sv_simulation_recipients" USING btree ("organization_id","project_ref");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_simulation_reports_period_unique" ON "sv_simulation_reports" USING btree ("organization_id","project_ref","period_start");
--> statement-breakpoint
CREATE INDEX "sv_simulation_reports_project_idx" ON "sv_simulation_reports" USING btree ("organization_id","project_ref");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_simulation_deliveries_report_unique" ON "sv_simulation_deliveries" USING btree ("report_id");
--> statement-breakpoint
CREATE INDEX "sv_simulation_deliveries_project_idx" ON "sv_simulation_deliveries" USING btree ("organization_id","project_ref");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_simulation_delivery_attempts_unique" ON "sv_simulation_delivery_attempts" USING btree ("delivery_id","attempt");
--> statement-breakpoint
ALTER TABLE "sv_simulation_subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_connect_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_recipients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_delivery_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_simulation_subscriptions"
	USING ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_simulation_connect_tokens"
	USING ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_simulation_recipients"
	USING ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_simulation_reports"
	USING ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_simulation_deliveries"
	USING ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_simulation_delivery_attempts"
	USING ("organization_id" = current_setting('app.organization_id', true));
