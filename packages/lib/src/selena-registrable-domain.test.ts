import { describe, expect, it } from "vitest";
import { normalizeRegistrableDomain, RegistrableDomainError } from "./selena-registrable-domain";

describe("normalizeRegistrableDomain", () => {
	it("normalizes an HTTP(S) URL to its registrable domain", () => {
		expect(normalizeRegistrableDomain("https://WWW.Shop.Example.CO.UK/catalog")).toBe("example.co.uk");
	});

	it.each(["example.com", "ftp://example.com", "https://127.0.0.1", "https://localhost", "https://co.uk"])(
		"refuses non-public URL identifier %s",
		(value) => expect(() => normalizeRegistrableDomain(value)).toThrow(RegistrableDomainError),
	);
});
