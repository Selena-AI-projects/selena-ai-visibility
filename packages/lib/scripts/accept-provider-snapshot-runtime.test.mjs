import { describe, expect, it } from "vitest";
import {
	acceptProviderSnapshotRuntime,
	assertProviderSnapshotRuntimeReceipt,
} from "./accept-provider-snapshot-runtime.mjs";

const journal = { row_count: 53, frontier: "1787940014000", exact_0052: 1 };
const security = {
	rls_enabled: true,
	rls_forced: true,
	tenant_policy_count: 1,
	can_select: true,
	can_insert: true,
	can_update: false,
	can_delete: false,
	can_truncate: false,
	event_count: 0,
	role_super: false,
	role_bypass_rls: false,
	role_create_db: false,
	role_create_role: false,
};

describe("0052 staging runtime acceptance", () => {
	it("accepts only the exact migration, forced RLS and least-privilege grant", () => {
		expect(assertProviderSnapshotRuntimeReceipt(journal, security)).toEqual({
			migrationFrontier: 52,
			journalRows: 53,
			forcedRls: true,
			tenantPolicy: true,
			runtimePrivileges: ["SELECT", "INSERT"],
			initialEventCount: 0,
		});
		expect(() => assertProviderSnapshotRuntimeReceipt(journal, { ...security, can_update: true })).toThrow(
			"SELENA_0052_RUNTIME_SECURITY_POSTCONDITION_FAILED",
		);
	});

	it("rolls back the privilege transaction when a postcondition fails", async () => {
		const statements = [];
		const client = {
			async query(statement) {
				statements.push(statement);
				if (statement.includes("drizzle.__drizzle_migrations")) return { rows: [journal] };
				if (statement.includes("from pg_class")) return { rows: [{ ...security, can_delete: true }] };
				return { rows: [] };
			},
		};
		await expect(acceptProviderSnapshotRuntime(client)).rejects.toThrow(
			"SELENA_0052_RUNTIME_SECURITY_POSTCONDITION_FAILED",
		);
		expect(statements.at(-1)).toBe("rollback");
	});
});
