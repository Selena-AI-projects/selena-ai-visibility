-- The retention sweep deletes expired answer text across every tenant, which a
-- non-owner worker cannot see. It does exactly what the policy requires and
-- nothing more: the text goes, only once its own retainUntil has passed, and
-- every cleaned run gets an audit row.
CREATE FUNCTION "sv_expire_answer_texts"(p_now timestamptz)
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
	WITH "expired" AS (
		UPDATE "public"."sv_runs"
		SET "canonical_payload" = jsonb_set(
			"canonical_payload",
			'{answer}',
			("canonical_payload" -> 'answer') - 'text' || jsonb_build_object('textDeletedAt', to_char($1 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
		)
		WHERE "canonical_payload" -> 'answer' ? 'text'
			AND ("canonical_payload" -> 'answer' ->> 'retainUntil')::timestamptz < $1
		RETURNING "id", "organization_id"
	), "audited" AS (
		INSERT INTO "public"."sv_audit_events" ("organization_id", "actor_id", "event", "subject_kind", "subject_id", "details")
		SELECT "organization_id", 'system:answer-retention', 'ANSWER_TEXT_EXPIRED', 'sv_runs', "id"::text,
			jsonb_build_object('deletedAt', to_char($1 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
		FROM "expired"
		RETURNING "id"
	)
	SELECT count(*)::integer FROM "audited"
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "sv_expire_answer_texts"(timestamptz) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'selena_app') THEN
		GRANT EXECUTE ON FUNCTION "sv_expire_answer_texts"(timestamptz) TO selena_app;
	END IF;
END;
$$;
