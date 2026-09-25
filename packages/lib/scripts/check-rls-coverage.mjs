// Fails when a tenant table in `public` can be read across tenants by a
// non-owner runtime role: a tenant-keyed table with RLS off, a table with RLS on
// but no policy, or a runtime role that owns tables or bypasses RLS. Intentional
// exceptions are table comments from a fixed vocabulary, so none can be added
// without a migration that states it.
//
//   DATABASE_URL=postgres://owner@host/db node packages/lib/scripts/check-rls-coverage.mjs
import pg from "pg";

const TENANT_COLUMNS = ["organization_id", "brand_id", "project_id"];
const RUNTIME_ROLES = ["selena_app", "selena_worker"];
const DENY_BY_DESIGN = "rls:deny-by-design";
const EXEMPT_PREFIX = "rls:exempt ";
const EXEMPT_REASONS = new Set(["better-auth", "staging-only"]);

export function findCoverageProblems(tables, roles) {
	const problems = [];
	for (const table of tables) {
		const marker = table.comment ?? "";
		const exempt = marker.startsWith(EXEMPT_PREFIX) && EXEMPT_REASONS.has(marker.slice(EXEMPT_PREFIX.length));
		if (marker.startsWith("rls:") && marker !== DENY_BY_DESIGN && !exempt)
			problems.push(`${table.name}: unknown RLS marker "${marker}"`);
		if (!table.rls) {
			if (table.tenantColumns.length > 0 && !exempt)
				problems.push(`${table.name}: has ${table.tenantColumns.join(", ")} but RLS is off`);
			continue;
		}
		if (table.policies === 0 && marker !== DENY_BY_DESIGN)
			problems.push(`${table.name}: RLS is on but no policy grants access (mark it ${DENY_BY_DESIGN} if intended)`);
	}
	for (const role of roles) {
		if (role.superuser || role.bypassRls) problems.push(`role ${role.name}: bypasses row-level security`);
		if (role.ownedTables > 0) problems.push(`role ${role.name}: owns ${role.ownedTables} table(s) in public`);
	}
	return problems;
}

async function readCatalog(client) {
	const tables = await client.query(
		`SELECT c.relname AS name, c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
			obj_description(c.oid, 'pg_class') AS comment,
			(SELECT count(*)::int FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies,
			COALESCE((SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
				WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped AND a.attname = ANY($1::text[])), '{}') AS "tenantColumns"
		FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
		ORDER BY c.relname`,
		[TENANT_COLUMNS],
	);
	const roles = await client.query(
		`SELECT r.rolname AS name, r.rolsuper AS superuser, r.rolbypassrls AS "bypassRls",
			(SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
				WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relowner = r.oid) AS "ownedTables"
		FROM pg_roles r WHERE r.rolname = ANY($1::text[])`,
		[RUNTIME_ROLES],
	);
	return { tables: tables.rows, roles: roles.rows };
}

async function main() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) throw new Error("DATABASE_URL_REQUIRED");
	const client = new pg.Client({ connectionString });
	await client.connect();
	try {
		const { tables, roles } = await readCatalog(client);
		const problems = findCoverageProblems(tables, roles);
		const unforced = tables.filter((table) => table.rls && !table.force).map((table) => table.name);
		console.log(`checked ${tables.length} tables and ${roles.length} runtime role(s)`);
		// FORCE is reported, not enforced, until the web no longer connects as owner.
		console.log(`RLS without FORCE (${unforced.length}): ${unforced.join(", ")}`);
		if (problems.length > 0) {
			for (const problem of problems) console.error(`RLS coverage: ${problem}`);
			process.exitCode = 1;
		}
	} finally {
		await client.end();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
