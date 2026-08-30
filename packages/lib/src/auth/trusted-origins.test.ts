import { describe, expect, it } from "vitest";
import { resolveAuthTrustedOrigins } from "./trusted-origins";

describe("auth trusted origins", () => {
	it("allows an additional staging origin without replacing the canonical app origin", () => {
		expect(resolveAuthTrustedOrigins("https://app.selenasystems.com", [], "https://staging.selenasystems.com")).toEqual(
			["https://staging.selenasystems.com", "https://app.selenasystems.com"],
		);
	});

	it("trims, normalizes, and deduplicates configured origins", () => {
		expect(
			resolveAuthTrustedOrigins(
				"https://app.example.com",
				["https://tenant.example.com"],
				" https://preview.example.com/, https://tenant.example.com ",
			),
		).toEqual(["https://tenant.example.com", "https://preview.example.com", "https://app.example.com"]);
	});

	it.each([
		"not-a-url",
		"ftp://staging.example.com",
		"https://user:password@staging.example.com",
		"https://staging.example.com/auth",
		"https://staging.example.com?source=auth",
		"https://staging.example.com#auth",
	])("rejects a value that is not an HTTP(S) origin: %s", (origin) => {
		expect(() => resolveAuthTrustedOrigins("https://app.example.com", [], origin)).toThrow(
			/AUTH_TRUSTED_ORIGINS entry 1/,
		);
	});
});
