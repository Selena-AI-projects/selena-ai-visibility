-- Weekly digest delivery for real client projects. The staging simulation
-- (0063/0064) proved the chain on fixture rows it pins to 'staging'/'test';
-- these tables carry the same shape without those markers.
--
-- Every reference between them, and to the project and cycle, goes through
-- (id, organization_id), so a row can never point at another workspace's
-- project, cycle, digest or recipient even if a caller passes a foreign id.
--
-- A digest is saved before anything is sent and never changes afterwards, and
-- its content hash is checked here, so what a client received can always be
-- shown exactly. The attempt log is append-only and capped at five, as in the
-- simulation. The chat id is kept only as ciphertext (see 0064 for why there is
-- no hash column).
CREATE UNIQUE INDEX IF NOT EXISTS "sv_cycles_id_organization_unique" ON "sv_cycles" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE TABLE "sv_delivery_connect_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"consumed_at" timestamptz,
	"expires_at" timestamptz NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_delivery_connect_tokens_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "sv_projects"("id","organization_id"),
	CONSTRAINT "sv_delivery_connect_tokens_hash_check" CHECK ("token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "sv_delivery_connect_tokens_expiry_check" CHECK ("expires_at" > "created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_delivery_connect_tokens_hash_unique" ON "sv_delivery_connect_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE TABLE "sv_delivery_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"chat_id_ciphertext" text NOT NULL,
	"locale" text DEFAULT 'ru' NOT NULL,
	"status" text DEFAULT 'BOUND' NOT NULL,
	"bound_by" text NOT NULL,
	"bound_at" timestamptz DEFAULT now() NOT NULL,
	"unbound_at" timestamptz,
	"unbound_reason" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_delivery_recipients_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "sv_projects"("id","organization_id"),
	CONSTRAINT "sv_delivery_recipients_channel_check" CHECK ("channel" = 'telegram'),
	CONSTRAINT "sv_delivery_recipients_locale_check" CHECK ("locale" IN ('ru', 'en')),
	CONSTRAINT "sv_delivery_recipients_status_check" CHECK ("status" IN ('BOUND', 'UNBOUND')),
	CONSTRAINT "sv_delivery_recipients_unbound_check" CHECK (("status" = 'UNBOUND') = ("unbound_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_delivery_recipients_id_organization_unique" ON "sv_delivery_recipients" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_delivery_recipients_active_unique" ON "sv_delivery_recipients" USING btree ("organization_id","project_id","channel") WHERE "status" = 'BOUND';
--> statement-breakpoint
CREATE TABLE "sv_weekly_digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"project_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"previous_cycle_id" uuid,
	"period_start" timestamptz NOT NULL,
	"period_end" timestamptz NOT NULL,
	"content_json" jsonb NOT NULL,
	"content_canonical" text NOT NULL,
	"content_sha256" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_weekly_digests_project_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "sv_projects"("id","organization_id"),
	CONSTRAINT "sv_weekly_digests_cycle_fk" FOREIGN KEY ("cycle_id","organization_id") REFERENCES "sv_cycles"("id","organization_id"),
	CONSTRAINT "sv_weekly_digests_previous_cycle_fk" FOREIGN KEY ("previous_cycle_id","organization_id") REFERENCES "sv_cycles"("id","organization_id"),
	CONSTRAINT "sv_weekly_digests_period_check" CHECK ("period_end" > "period_start"),
	CONSTRAINT "sv_weekly_digests_cycles_check" CHECK ("previous_cycle_id" IS DISTINCT FROM "cycle_id"),
	CONSTRAINT "sv_weekly_digests_content_check" CHECK (
		"content_json" = "content_canonical"::jsonb
		AND "content_sha256" = 'sha256:' || encode(sha256(convert_to("content_canonical", 'UTF8')), 'hex')
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_weekly_digests_id_organization_unique" ON "sv_weekly_digests" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_weekly_digests_period_unique" ON "sv_weekly_digests" USING btree ("organization_id","project_id","period_start");
--> statement-breakpoint
CREATE TABLE "sv_digest_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"digest_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts_made" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamptz,
	"claimed_at" timestamptz,
	"delivered_at" timestamptz,
	"last_error" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_digest_deliveries_digest_fk" FOREIGN KEY ("digest_id","organization_id") REFERENCES "sv_weekly_digests"("id","organization_id"),
	CONSTRAINT "sv_digest_deliveries_recipient_fk" FOREIGN KEY ("recipient_id","organization_id") REFERENCES "sv_delivery_recipients"("id","organization_id"),
	CONSTRAINT "sv_digest_deliveries_status_check" CHECK ("status" IN ('PENDING', 'SENDING', 'DELIVERED', 'RETRY_SCHEDULED', 'FAILED', 'UNBOUND')),
	CONSTRAINT "sv_digest_deliveries_attempt_cap_check" CHECK ("attempts_made" BETWEEN 0 AND 5),
	CONSTRAINT "sv_digest_deliveries_delivered_check" CHECK (("status" = 'DELIVERED') = ("delivered_at" IS NOT NULL)),
	CONSTRAINT "sv_digest_deliveries_claimed_check" CHECK ("status" <> 'SENDING' OR "claimed_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_digest_deliveries_id_organization_unique" ON "sv_digest_deliveries" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_digest_deliveries_digest_recipient_unique" ON "sv_digest_deliveries" USING btree ("digest_id","recipient_id");
--> statement-breakpoint
CREATE INDEX "sv_digest_deliveries_due_idx" ON "sv_digest_deliveries" USING btree ("status","next_attempt_at");
--> statement-breakpoint
CREATE TABLE "sv_digest_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"delivery_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"outcome" text NOT NULL,
	"detail" text,
	"attempted_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_digest_delivery_attempts_delivery_fk" FOREIGN KEY ("delivery_id","organization_id") REFERENCES "sv_digest_deliveries"("id","organization_id"),
	CONSTRAINT "sv_digest_delivery_attempts_range_check" CHECK ("attempt" BETWEEN 1 AND 5),
	CONSTRAINT "sv_digest_delivery_attempts_outcome_check" CHECK ("outcome" IN ('SUCCESS', 'TEMPORARY_FAILURE', 'RECIPIENT_GONE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_digest_delivery_attempts_unique" ON "sv_digest_delivery_attempts" USING btree ("delivery_id","attempt");
--> statement-breakpoint
CREATE FUNCTION "sv_digest_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'DIGEST_APPEND_ONLY'; END; $$;
--> statement-breakpoint
CREATE TRIGGER "sv_weekly_digests_immutable" BEFORE UPDATE OR DELETE ON "sv_weekly_digests" FOR EACH ROW EXECUTE FUNCTION "sv_digest_append_only"();
--> statement-breakpoint
CREATE TRIGGER "sv_digest_delivery_attempts_immutable" BEFORE UPDATE OR DELETE ON "sv_digest_delivery_attempts" FOR EACH ROW EXECUTE FUNCTION "sv_digest_append_only"();
--> statement-breakpoint
DO $rls$
DECLARE t text;
BEGIN
	FOREACH t IN ARRAY ARRAY['sv_delivery_connect_tokens','sv_delivery_recipients','sv_weekly_digests','sv_digest_deliveries','sv_digest_delivery_attempts'] LOOP
		EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
		EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
		EXECUTE format($p$CREATE POLICY "tenant_isolation" ON %I
			USING ("organization_id" = current_setting('app.organization_id', true))
			WITH CHECK ("organization_id" = current_setting('app.organization_id', true))$p$, t);
	END LOOP;
END; $rls$;
