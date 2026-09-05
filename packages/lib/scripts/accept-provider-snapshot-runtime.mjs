// Grants the staging runtime role access to the append-only 0052 journal and
// proves that no broader privilege was introduced. This runs as a one-shot
// owner job after the bounded migration; it never reads provider credentials.

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const MIGRATION_0052_HASH = "3123968f0dce8cf6f8ec2054fd20922b5671afbe7ac56c3f082ed0c5016bfcca";
export const MIGRATION_0052_CREATED_AT = "1787940014000";

const JOURNAL_SQL = `
	select count(*)::int as row_count,
		max(created_at)::text as frontier,
		count(*) filter (where created_at = $1 and hash = $2)::int as exact_0052
	from drizzle.__drizzle_migrations
`;

const SECURITY_SQL = `
	select
		c.relrowsecurity as rls_enabled,
		c.relforcerowsecurity as rls_forced,
		(select count(*)::int from pg_policy
			where polrelid = 'public.sv_provider_dataset_snapshot_events'::regclass
				and polname = 'tenant_isolation') as tenant_policy_count,
		has_table_privilege('selena_app', 'public.sv_provider_dataset_snapshot_events', 'SELECT') as can_select,
		has_table_privilege('selena_app', 'public.sv_provider_dataset_snapshot_events', 'INSERT') as can_insert,
		has_table_privilege('selena_app', 'public.sv_provider_dataset_snapshot_events', 'UPDATE') as can_update,
		has_table_privilege('selena_app', 'public.sv_provider_dataset_snapshot_events', 'DELETE') as can_delete,
		has_table_privilege('selena_app', 'public.sv_provider_dataset_snapshot_events', 'TRUNCATE') as can_truncate,
		(select count(*)::int from public.sv_provider_dataset_snapshot_events) as event_count,
		r.rolsuper as role_super,
		r.rolbypassrls as role_bypass_rls,
		r.rolcreatedb as role_create_db,
		r.rolcreaterole as role_create_role
	from pg_class c
	join pg_roles r on r.rolname = 'selena_app'
	where c.oid = 'public.sv_provider_dataset_snapshot_events'::regclass
`;

export function assertProviderSnapshotRuntimeReceipt(journal, security) {
	if (journal?.row_count !== 53 || journal.frontier !== MIGRATION_0052_CREATED_AT || journal.exact_0052 !== 1)
		throw new Error("SELENA_0052_JOURNAL_POSTCONDITION_FAILED");
	if (
		security?.rls_enabled !== true ||
		security.rls_forced !== true ||
		security.tenant_policy_count !== 1 ||
		security.can_select !== true ||
		security.can_insert !== true ||
		security.can_update !== false ||
		security.can_delete !== false ||
		security.can_truncate !== false ||
		security.event_count !== 0 ||
		security.role_super !== false ||
		security.role_bypass_rls !== false ||
		security.role_create_db !== false ||
		security.role_create_role !== false
	)
		throw new Error("SELENA_0052_RUNTIME_SECURITY_POSTCONDITION_FAILED");
	return Object.freeze({
		migrationFrontier: 52,
		journalRows: journal.row_count,
		forcedRls: true,
		tenantPolicy: true,
		runtimePrivileges: Object.freeze(["SELECT", "INSERT"]),
		initialEventCount: 0,
	});
}

export async function acceptProviderSnapshotRuntime(client) {
	await client.query("begin");
	try {
		const journal = await client.query(JOURNAL_SQL, [MIGRATION_0052_CREATED_AT, MIGRATION_0052_HASH]);
		if (journal.rows[0]?.row_count !== 53 || journal.rows[0].exact_0052 !== 1)
			throw new Error("SELENA_0052_JOURNAL_POSTCONDITION_FAILED");
		await client.query("revoke all privileges on public.sv_provider_dataset_snapshot_events from selena_app");
		await client.query("grant select, insert on public.sv_provider_dataset_snapshot_events to selena_app");
		const security = await client.query(SECURITY_SQL);
		const receipt = assertProviderSnapshotRuntimeReceipt(journal.rows[0], security.rows[0]);
		await client.query("commit");
		return receipt;
	} catch (error) {
		await client.query("rollback").catch(() => {});
		throw error;
	}
}

export async function main() {
	const { runtimeDatabaseConnection } = await import("../src/db/postgres-config.ts");
	const connection = runtimeDatabaseConnection();
	const pool = new pg.Pool({
		connectionString: connection.connectionString,
		ssl: connection.ssl,
		max: 1,
		options: "-c lock_timeout=5000 -c statement_timeout=30000",
	});
	let client;
	try {
		client = await pool.connect();
		const receipt = await acceptProviderSnapshotRuntime(client);
		process.stdout.write(`${JSON.stringify(receipt)}\n`);
	} finally {
		client?.release(true);
		await pool.end().catch(() => {});
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		process.stderr.write(`${String(error?.message ?? error).split("\n")[0]}\n`);
		process.exitCode = 1;
	});
}
