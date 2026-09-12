import { parse } from "tldts";

export class RegistrableDomainError extends Error {
	constructor() {
		super("SELENA_REGISTRABLE_DOMAIN_INVALID");
		this.name = "RegistrableDomainError";
	}
}

/**
 * Accepts only public HTTP(S) URLs and returns the effective registrable
 * domain. Paths, credentials, local hosts, IP addresses and bare suffixes are
 * deliberately not identifiers for a free check.
 */
export function normalizeRegistrableDomain(value: string): string {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new RegistrableDomainError();
	}
	if (
		(url.protocol !== "http:" && url.protocol !== "https:") ||
		url.username !== "" ||
		url.password !== "" ||
		url.hostname === ""
	) {
		throw new RegistrableDomainError();
	}

	const parsed = parse(url.hostname, { allowPrivateDomains: true });
	if (parsed.isIp || parsed.domain === null || parsed.publicSuffix === null) throw new RegistrableDomainError();
	return parsed.domain.toLowerCase();
}
