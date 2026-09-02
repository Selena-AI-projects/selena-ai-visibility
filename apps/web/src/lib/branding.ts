import { DEFAULT_APP_ICON, DEFAULT_APP_NAME } from "@workspace/config/constants";
import type { ClientConfig } from "@workspace/config/types";

/**
 * True when the deployment presents the Selena Systems identity rather than a
 * white-label brand: no custom icon/name, or the built-in defaults.
 */
export function isSelenaBranding(branding: ClientConfig["branding"] | undefined): boolean {
	return (
		!branding?.icon || !branding?.name || (branding.icon === DEFAULT_APP_ICON && branding.name === DEFAULT_APP_NAME)
	);
}
