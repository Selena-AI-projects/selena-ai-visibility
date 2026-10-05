import { describe, expect, it } from "vitest";
import { resolveWorkspaceLocale, tr } from "./selena-locale";

describe("workspace locale", () => {
	it("keeps the language the visitor chose, whatever the browser says", () => {
		expect(resolveWorkspaceLocale("ru", "en-US")).toBe("ru");
		expect(resolveWorkspaceLocale("en", "ru-RU")).toBe("en");
	});

	it("reads Russian off the browser for a visitor who has not chosen yet", () => {
		expect(resolveWorkspaceLocale(null, "ru-RU")).toBe("ru");
		expect(resolveWorkspaceLocale(undefined, "RU")).toBe("ru");
		expect(resolveWorkspaceLocale("something-else", "ru")).toBe("ru");
	});

	it("falls back to English everywhere else", () => {
		expect(resolveWorkspaceLocale(null, "en-GB")).toBe("en");
		expect(resolveWorkspaceLocale(null, "de")).toBe("en");
		expect(resolveWorkspaceLocale(null, undefined)).toBe("en");
	});

	it("picks the side of the pair the locale asks for", () => {
		expect(tr("en", "Open the cabinet", "Перейти в кабинет")).toBe("Open the cabinet");
		expect(tr("ru", "Open the cabinet", "Перейти в кабинет")).toBe("Перейти в кабинет");
	});
});
