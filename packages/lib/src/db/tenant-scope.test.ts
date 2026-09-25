import { afterEach, describe, expect, it } from "vitest";
import type { OrganizationDatabase } from "./organization-transaction";
import { installScopedDatabaseResolver, tenantAwareDatabase } from "./tenant-scope";

function fakeDatabase(name: string) {
	const database = {
		execute(query: string) {
			return `${name}:${query}`;
		},
	};
	return database as unknown as OrganizationDatabase;
}

afterEach(() => installScopedDatabaseResolver(() => undefined));

describe("tenantAwareDatabase", () => {
	it("uses the pool when no request has a tenant scope", () => {
		const db = tenantAwareDatabase(fakeDatabase("pool"));
		expect(db.execute("select 1" as never)).toBe("pool:select 1");
	});

	it("routes every query to the scoped connection while one is active", () => {
		const scoped = fakeDatabase("tenant-a");
		let active: OrganizationDatabase | undefined = scoped;
		installScopedDatabaseResolver(() => active);
		const db = tenantAwareDatabase(fakeDatabase("pool"));

		expect(db.execute("select 1" as never)).toBe("tenant-a:select 1");
		active = undefined;
		expect(db.execute("select 1" as never)).toBe("pool:select 1");
	});
});
