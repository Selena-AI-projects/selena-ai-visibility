import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrganizationDatabase } from "./organization-transaction";

function fakeDatabase(name: string) {
	return { execute: (query: string) => `${name}:${query}` } as unknown as OrganizationDatabase;
}

vi.mock("./internal-db", () => ({ internalDatabase: () => fakeDatabase("internal") }));

const RESOLVER_KEY = Symbol.for("selena.scopedDatabaseResolver");

afterEach(() => {
	delete (globalThis as Record<symbol, unknown>)[RESOLVER_KEY];
	vi.resetModules();
});

describe("runOnInternalDatabase", () => {
	it("sends the shared handle to the operator connection only inside the job", async () => {
		const { runOnInternalDatabase } = await import("./internal-job-scope");
		const { tenantAwareDatabase } = await import("./tenant-scope");
		const db = tenantAwareDatabase(fakeDatabase("pool"));

		const inside = await runOnInternalDatabase(async () => db.execute("select 1" as never));
		expect(inside).toBe("internal:select 1");
		expect(db.execute("select 1" as never)).toBe("pool:select 1");
	});

	it("refuses to take over a resolver another scope already owns", async () => {
		const { installScopedDatabaseResolver } = await import("./tenant-scope");
		installScopedDatabaseResolver(() => undefined);
		const { runOnInternalDatabase } = await import("./internal-job-scope");

		expect(() => runOnInternalDatabase(async () => undefined)).toThrow("SCOPED_DATABASE_RESOLVER_TAKEN");
	});
});
