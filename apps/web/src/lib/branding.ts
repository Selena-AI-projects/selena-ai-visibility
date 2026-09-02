import { DEFAULT_APP_ICON, DEFAULT_APP_NAME } from "@workspace/config/constants";
import type { ClientConfig } from "@workspace/config/types";

// Mirrors the test Logo applies before choosing the Selena wordmark; the two must agree,
// or the auth scene could appear under a customer's own logo.
export function isSelenaBranding(branding: ClientConfig["branding"] | undefined): boolean {
	return (
		!branding?.icon || !branding?.name || (branding.icon === DEFAULT_APP_ICON && branding.name === DEFAULT_APP_NAME)
	);
}
