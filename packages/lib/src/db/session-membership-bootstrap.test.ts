import { describe, expect, it } from "vitest";
import type { OrganizationDatabase } from "./organization-transaction";
import { pickSessionMembership, resolveSessionMemberships } from "./session-membership-bootstrap";

const memberships = [
	{ organizationId: "org-oldest", role: "owner" },
	{ organizationId: "org-invited", role: "viewer" },
];

describe("pickSessionMembership", () => {
	it("uses the active organization when the user still belongs to it", () => {
		expect(pickSessionMembership(memberships, "org-invited")).toEqual(memberships[1]);
	});

	it("falls back to the oldest membership when no organization is active", () => {
		expect(pickSessionMembership(memberships, null)).toEqual(memberships[0]);
	});

	it("refuses an active organization the user has left", () => {
		expect(pickSessionMembership(memberships, "org-left")).toBeUndefined();
	});
});

describe("resolveSessionMemberships", () => {
	it("reads memberships directly on a database that predates the bootstrap function", async () => {
		const queries: string[] = [];
		const db = {
			async execute(query: { queryChunks: unknown[] }) {
				const text = JSON.stringify(query.queryChunks);
				queries.push(text);
				if (text.includes("to_regprocedure")) return { rows: [{ present: false }] };
				if (text.includes("sv_resolve_session_memberships")) throw new Error("function does not exist");
				return { rows: [{ organization_id: "org-oldest", role: "owner" }] };
			},
		} as unknown as OrganizationDatabase;

		await expect(resolveSessionMemberships(db, "user-1")).resolves.toEqual([
			{ organizationId: "org-oldest", role: "owner" },
		]);
		expect(queries).toHaveLength(2);
	});

	it("does not mask other database errors", async () => {
		const db = {
			async execute() {
				throw Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
			},
		} as unknown as OrganizationDatabase;

		await expect(resolveSessionMemberships(db, "user-1")).rejects.toThrow("connection refused");
	});
});
