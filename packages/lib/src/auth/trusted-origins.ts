function parseOrigin(value: string, index: number): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`AUTH_TRUSTED_ORIGINS entry ${index + 1} must be a valid URL origin`);
	}

	if (
		(url.protocol !== "https:" && url.protocol !== "http:") ||
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		url.hash
	) {
		throw new Error(`AUTH_TRUSTED_ORIGINS entry ${index + 1} must be an HTTP(S) origin without a path`);
	}

	return url.origin;
}

export function resolveAuthTrustedOrigins(
	appUrl: string,
	configuredOrigins: readonly string[],
	additionalOrigins: string | undefined,
): string[] {
	const origins = [...configuredOrigins];
	for (const origin of (additionalOrigins ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean)
		.map(parseOrigin)) {
		if (!origins.includes(origin)) origins.push(origin);
	}
	if (!origins.includes(appUrl)) origins.push(appUrl);
	return origins;
}
