-- Reproduce the exact catalog delta that is absent from the reviewed
-- d66be780... release-short 0051 migration. Used only in disposable tests.
DROP VIEW IF EXISTS "sv_evidence_read_model";
DROP FUNCTION IF EXISTS "sv_resolve_api_key_context"(text);
DROP TABLE IF EXISTS "sv_evidence_acceptance_receipts" CASCADE;
DROP INDEX IF EXISTS "sv_evidence_index_id_organization_unique";
ALTER TABLE "sv_source_snapshots" DROP COLUMN IF EXISTS "content_sha256_format_valid";
DROP TABLE IF EXISTS "sv_provider_canary_executions" CASCADE;
DROP FUNCTION IF EXISTS "sv_reject_provider_canary_execution_mutation"();
