CREATE TABLE "sv_api_idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id"),
	"operation" text NOT NULL,
	"resource_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"body_hash" text NOT NULL,
	"response_status" smallint NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"expires_at" timestamptz NOT NULL,
	CONSTRAINT "sv_api_idempotency_operation_check" CHECK ("operation" ~ '^[a-z][a-z0-9-]{1,63}$'),
	CONSTRAINT "sv_api_idempotency_body_hash_check" CHECK ("body_hash" ~ '^sha256:[a-f0-9]{64}$'),
	CONSTRAINT "sv_api_idempotency_key_length_check" CHECK (length("idempotency_key") BETWEEN 8 AND 128 AND "idempotency_key" = btrim("idempotency_key")),
	CONSTRAINT "sv_api_idempotency_response_status_check" CHECK ("response_status" BETWEEN 200 AND 299),
	CONSTRAINT "sv_api_idempotency_expiry_check" CHECK ("expires_at" > "created_at" AND "expires_at" <= "created_at" + interval '7 days')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_api_idempotency_identity_unique"
	ON "sv_api_idempotency_records" ("organization_id", "operation", "resource_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX "sv_api_idempotency_expires_idx"
	ON "sv_api_idempotency_records" ("organization_id", "expires_at");
--> statement-breakpoint
ALTER TABLE "sv_api_idempotency_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sv_api_idempotency_records"
	USING ("organization_id" = current_setting('app.organization_id', true))
	WITH CHECK ("organization_id" = current_setting('app.organization_id', true));
--> statement-breakpoint
CREATE FUNCTION "sv_guard_api_idempotency_mutation"() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		IF OLD."expires_at" > now() THEN
			RAISE EXCEPTION 'API_IDEMPOTENCY_ACTIVE_DELETE_BLOCKED';
		END IF;
		RETURN OLD;
	END IF;
	IF TG_OP = 'UPDATE' THEN
		RAISE EXCEPTION 'API_IDEMPOTENCY_UPDATE_BLOCKED';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_guard_api_idempotency_mutation"
	BEFORE UPDATE OR DELETE ON "sv_api_idempotency_records"
	FOR EACH ROW EXECUTE FUNCTION "sv_guard_api_idempotency_mutation"();
--> statement-breakpoint
CREATE FUNCTION "sv_prevent_api_idempotency_truncate"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'API_IDEMPOTENCY_TRUNCATE_BLOCKED';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "sv_prevent_api_idempotency_truncate"
	BEFORE TRUNCATE ON "sv_api_idempotency_records"
	FOR EACH STATEMENT EXECUTE FUNCTION "sv_prevent_api_idempotency_truncate"();
