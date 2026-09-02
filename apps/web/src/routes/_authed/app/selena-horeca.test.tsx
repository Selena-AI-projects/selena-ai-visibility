import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const projectIds = {
	avli: "11111111-1111-4111-8111-111111111111",
	kora: "22222222-2222-4222-8222-222222222222",
};

const routerHarness = vi.hoisted(() => ({
	loaderData: {
		localVisibility: { enabled: false },
		workspace: {
			projects: [
				{ id: "11111111-1111-4111-8111-111111111111", name: "AVLI" },
				{ id: "22222222-2222-4222-8222-222222222222", name: "KORA" },
			],
			selectedProjectId: "11111111-1111-4111-8111-111111111111",
			model: null,
			evidenceDetail: null,
			fallbackReason: "NO_ACCEPTED_LINKED_DATA",
		},
		generatedAt: "2026-09-01T00:00:00.000Z",
	},
	search: { locale: "en" as const, project: "11111111-1111-4111-8111-111111111111" },
}));

vi.mock("@tanstack/react-router", () => {
	const toHref = (to: string, search?: Record<string, string | undefined>) => {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(search ?? {})) {
			if (value) params.set(key, value);
		}
		const query = params.toString();
		return query ? `${to}?${query}` : to;
	};

	return {
		createFileRoute: () => (options: unknown) => ({
			options,
			useLoaderData: () => routerHarness.loaderData,
			useSearch: () => routerHarness.search,
		}),
		Link: ({
			to,
			search,
			children,
			...props
		}: {
			to: string;
			search?: Record<string, string | undefined>;
			children: ReactNode;
		}) => createElement("a", { ...props, href: toHref(to, search) }, children),
	};
});

vi.mock("@/server/selena-horeca", () => ({ getSelenaHorecaWorkspaceFn: vi.fn() }));
vi.mock("@/server/selena-local-visibility", () => ({ getSelenaLocalVisibilityStateFn: vi.fn() }));

import { Route } from "./selena-horeca";

function projectLinkAttributes(html: string, projectName: string): string {
	const link = [...html.matchAll(/<a\s+([^>]*)>([\s\S]*?)<\/a>/g)].find((match) => match[2].includes(projectName));
	if (!link) throw new Error(`Missing project link for ${projectName}`);
	return link[1];
}

describe("HoReCa project rail", () => {
	it("keeps project selection in a distinct landmark and preserves it in navigation", () => {
		const component = (Route as unknown as { options: { component: () => ReactNode } }).options.component;
		const html = renderToStaticMarkup(createElement(component));
		const avli = projectLinkAttributes(html, "AVLI");
		const kora = projectLinkAttributes(html, "KORA");

		expect(html).toContain('aria-label="HoReCa projects"');
		expect(html).toContain('aria-label="Workspace tools"');
		expect(avli).toContain(`href="/app/selena-horeca?locale=en&amp;project=${projectIds.avli}"`);
		expect(avli).toContain('aria-current="page"');
		expect(kora).toContain(`href="/app/selena-horeca?locale=en&amp;project=${projectIds.kora}"`);
		expect(kora).not.toContain("aria-current");
	});
});
