import { sql } from "drizzle-orm";
import { internalDatabase } from "./internal-db";
import type { OrganizationDatabase } from "./organization-transaction";

export type OperatorActorKind = "platform_admin" | "admin_api_key";

export type OperatorAccess = {
	actorId: string;
	actorKind: OperatorActorKind;
	method: string;
	path: string;
};

// Only presence is cached: a database migrated while the process runs starts
// recording on the next operator request.
let tablePresent = false;

/**
 * Records one entry into operator scope. A database from before 0073 has
 * nowhere to write, so it is skipped rather than locking operators out; once
 * the table exists a failed write fails the request.
 */
export async function recordOperatorAccess(
	access: OperatorAccess,
	dbc: Pick<OrganizationDatabase, "execute"> = internalDatabase(),
): Promise<void> {
	if (!tablePresent) {
		const probe = await dbc.execute(sql`select to_regclass('public.sv_operator_access_events') is not null as present`);
		if ((probe.rows[0] as { present?: boolean } | undefined)?.present !== true) return;
		tablePresent = true;
	}
	await dbc.execute(sql`
		insert into sv_operator_access_events (actor_id, actor_kind, method, path)
		values (${access.actorId}, ${access.actorKind}, ${access.method}, ${access.path})
	`);
}
