/**
 * The cabinet's interface language. Pages keep the choice in localStorage so
 * it survives navigation, and fall back to the browser language so a visitor
 * arriving from the Russian site reads Russian before they touch the switch.
 */
export type WorkspaceLocale = "en" | "ru";

export const WORKSPACE_LOCALE_STORAGE_KEY = "selena-workspace-locale";

export function resolveWorkspaceLocale(
	saved: string | null | undefined,
	navigatorLanguage: string | null | undefined,
): WorkspaceLocale {
	if (saved === "ru" || saved === "en") return saved;
	return navigatorLanguage?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function tr(locale: WorkspaceLocale, english: string, russian: string): string {
	return locale === "ru" ? russian : english;
}
