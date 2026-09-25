import { describe, expect, it } from "vitest";
import { pickSessionMembership } from "./session-membership-bootstrap";

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
