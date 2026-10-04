import { sql } from "drizzle-orm";
import type { SqlExecutor } from "./selena-pilot-invites";

/**
 * Granting the platform operator role to one existing account, as the owner.
 *
 * The role that opens the operator desk is a column on the user row. No screen
 * sets it, the runtime role may not write it, and on a hosted environment the
 * owner has no query window either, so the grant runs where owner rights
 * already live: the one-shot owner service. The address is matched without
 * regard to case, which is the one way two rows can answer to one address;
 * when that happens nothing is granted, because an operator role handed to a
 * row the owner did not mean is not something a log line can take back.
 * The log carries a masked address only.
 */

export interface PlatformAdminGrant {
	maskedEmail: string;
	updated: number;
}

/** First character, then the domain: enough to recognise the account, not to address it. */
export function maskEmail(email: string): string {
	const at = email.indexOf("@");
	if (at <= 0) return "***";
	return `${email[0]}***${email.slice(at)}`;
}

function count(value: unknown): number {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

export async function grantPlatformAdmin(executor: SqlExecutor, email: string): Promise<PlatformAdminGrant> {
	const address = email.trim();
	if (address === "" || !address.includes("@")) throw new Error("SELENA_OWNER_ADMIN_EMAIL_INVALID");
	// One statement: the update only fires when exactly one row matches, so an
	// ambiguous address grants nobody rather than everybody.
	const result = await executor.execute(sql`
		WITH matched AS (
			SELECT "id" FROM "user" WHERE lower("email") = lower(${address}::text)
		),
		granted AS (
			UPDATE "user" SET "role" = 'admin', "updated_at" = now()
			WHERE "id" IN (SELECT "id" FROM matched) AND (SELECT count(*) FROM matched) = 1
			RETURNING "id"
		)
		SELECT
			(SELECT count(*) FROM matched)::int AS matched,
			(SELECT count(*) FROM granted)::int AS granted
	`);
	const row = (result.rows?.[0] ?? {}) as Record<string, unknown>;
	const matched = count(row.matched);
	const maskedEmail = maskEmail(address);
	if (matched === 0) throw new Error(`SELENA_OWNER_ADMIN_NOT_FOUND (${maskedEmail})`);
	if (matched > 1) throw new Error(`SELENA_OWNER_ADMIN_AMBIGUOUS (${matched} users match ${maskedEmail})`);
	return { maskedEmail, updated: count(row.granted) };
}

export function formatPlatformAdminGrant(grant: PlatformAdminGrant): string[] {
	return [`grant-platform-admin: updated ${grant.updated} user (${grant.maskedEmail})`];
}
