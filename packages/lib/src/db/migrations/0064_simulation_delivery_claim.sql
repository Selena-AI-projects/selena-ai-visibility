-- Hardening found by review of the staging verification simulation.
--
-- Four changes, all of them about a boundary the first cut left open.
--
-- The provider event id was unique across the whole table. A provider's event
-- id is unique per provider, not per workspace, but the code that recovers
-- from a losing insert reads the row back by that key alone — so a collision
-- across two workspaces would have handed one of them the other's
-- subscription. Scoping the key to the workspace makes the recovery read
-- provably its own row.
--
-- Row-level security was enabled but not forced, so the table owner — the role
-- migrations and several maintenance paths run as — still saw every workspace.
-- The rest of the schema forces it; these tables now do too.
--
-- The recipient's chat id hash is dropped rather than kept: nothing read it,
-- and a plain digest of a numeric Telegram chat id is recoverable by anyone
-- holding a database copy, which is exactly what storing the id as ciphertext
-- was meant to prevent.
--
-- The rig's bootstrap signature was replayable: it covered a constant body, so
-- anyone who ever saw one valid call could repeat it forever — taking a fresh
-- runner credential and revoking the live one on every replay. A signature now
-- covers a nonce, and this ledger is what makes the nonce single-use. The rows
-- are meaningless outside the few minutes a signature stays fresh, so each call
-- sweeps the expired ones; the table holds no tenant data and no secret, which
-- is why it carries no organization and no row-level policy.
--
-- A delivery now records the moment it was claimed, and 'SENDING' becomes a
-- status of its own. Locking the row was not enough to stop a redelivered job
-- from sending twice: the lock ends when the claiming transaction commits, and
-- the send happens after that, so a second claim could read the same untouched
-- row. Marking the row in flight inside the claim is what actually makes the
-- second claim refuse. The claim time bounds it: a worker that dies mid-send
-- would otherwise leave the delivery unclaimable forever.

DROP INDEX IF EXISTS "sv_simulation_subscriptions_event_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "sv_simulation_subscriptions_event_unique" ON "sv_simulation_subscriptions" USING btree ("organization_id","provider","provider_event_id");
--> statement-breakpoint
ALTER TABLE "sv_simulation_recipients" DROP COLUMN IF EXISTS "chat_id_hash";
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" ADD COLUMN IF NOT EXISTS "claimed_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" DROP CONSTRAINT IF EXISTS "sv_simulation_deliveries_status_check";
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" ADD CONSTRAINT "sv_simulation_deliveries_status_check" CHECK ("status" IN ('PENDING', 'SENDING', 'DELIVERED', 'RETRY_SCHEDULED', 'FAILED', 'UNBOUND'));
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" ADD CONSTRAINT "sv_simulation_deliveries_claimed_check" CHECK ("status" <> 'SENDING' OR "claimed_at" IS NOT NULL);
--> statement-breakpoint
ALTER TABLE "sv_simulation_subscriptions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_connect_tokens" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_recipients" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_reports" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_deliveries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sv_simulation_delivery_attempts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "sv_simulation_bootstrap_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"used_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sv_simulation_bootstrap_nonces_shape_check" CHECK ("nonce" ~ '^[a-f0-9]{32,128}$')
);
--> statement-breakpoint
CREATE INDEX "sv_simulation_bootstrap_nonces_used_idx" ON "sv_simulation_bootstrap_nonces" USING btree ("used_at");
