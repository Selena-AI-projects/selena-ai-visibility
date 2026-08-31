import { IconArrowLeft } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SelenaHorecaLocalFirst } from "@/components/selena-horeca-local-first";
import { SelenaWordmark } from "@/components/selena-wordmark";
import { buildHorecaLocalFirstPreview, type HorecaPreviewLocale } from "@/lib/selena-horeca-local-first";
import { getSelenaHorecaWorkspaceFn } from "@/server/selena-horeca";
import { getSelenaLocalVisibilityStateFn } from "@/server/selena-local-visibility";

export const Route = createFileRoute("/_authed/app/selena-horeca")({
	validateSearch: z.object({
		locale: z.enum(["ru", "en"]).optional(),
		project: z.string().uuid().optional(),
		evidence: z.string().uuid().optional(),
	}),
	loaderDeps: ({ search }) => ({ project: search.project, evidence: search.evidence }),
	loader: async ({ deps }) => {
		const [localVisibility, workspace] = await Promise.all([
			getSelenaLocalVisibilityStateFn(),
			getSelenaHorecaWorkspaceFn({ data: { projectId: deps.project, evidenceId: deps.evidence } }),
		]);
		return { localVisibility, workspace, generatedAt: new Date().toISOString() };
	},
	component: SelenaHorecaPage,
});

function SelenaHorecaPage() {
	const { localVisibility, workspace, generatedAt } = Route.useLoaderData();
	const search = Route.useSearch();
	const requestedLocale = search.locale;
	const [locale, setLocale] = useState<HorecaPreviewLocale>(requestedLocale ?? "en");
	const selectedProject = workspace.projects.find((project) => project.id === workspace.selectedProjectId);
	const preview = buildHorecaLocalFirstPreview(localVisibility.enabled, generatedAt);
	const model =
		workspace.model ??
		(selectedProject ? { ...preview, project: { ...preview.project, displayName: selectedProject.name } } : preview);
	const evidenceDetailHref = (evidenceId: string) => {
		const params = new URLSearchParams();
		params.set("locale", locale);
		if (workspace.selectedProjectId) params.set("project", workspace.selectedProjectId);
		params.set("evidence", evidenceId);
		return `/app/selena-horeca?${params.toString()}#evidence`;
	};

	useEffect(() => {
		const savedLocale = window.localStorage.getItem("selena-workspace-locale");
		const nextLocale = requestedLocale ?? (savedLocale === "ru" ? "ru" : "en");
		setLocale(nextLocale);
		document.documentElement.lang = nextLocale;
		if (requestedLocale) window.localStorage.setItem("selena-workspace-locale", requestedLocale);
	}, [requestedLocale]);

	return (
		<div className="selena-app min-h-screen bg-[#f7f2ea] pb-16 text-[#181614]">
			<header className="selena-app-header">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
					<SelenaWordmark />
					<div className="flex items-center gap-1">
						<Link
							to="/app/selena-horeca"
							search={{ ...search, locale: locale === "ru" ? "en" : "ru" }}
							className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold text-[#181614] outline-none hover:bg-[#eee5da] focus-visible:ring-2 focus-visible:ring-[#8f5c34]"
							aria-label={locale === "ru" ? "Switch to English" : "Переключить на русский"}
						>
							{locale === "ru" ? "EN" : "RU"}
						</Link>
						<Link
							to="/app/selena"
							className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#181614] outline-none hover:bg-[#eee5da] focus-visible:ring-2 focus-visible:ring-[#8f5c34]"
						>
							<IconArrowLeft className="size-4" aria-hidden="true" />
							{locale === "ru" ? "Проекты" : "Projects"}
						</Link>
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
				{workspace.projects.length > 0 && (
					<nav className="mb-5" aria-label={locale === "ru" ? "Проекты HoReCa" : "HoReCa projects"}>
						<p className="mb-2 text-xs font-bold tracking-[0.08em] text-[#6e6258]">
							{locale === "ru" ? "ВЫБЕРИТЕ ПРОЕКТ" : "SELECT PROJECT"}
						</p>
						<ul className="flex flex-wrap gap-2">
							{workspace.projects.map((project) => (
								<li key={project.id}>
									<Link
										to="/app/selena-horeca"
										search={{ locale, project: project.id }}
										className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#8f5c34] ${
											project.id === workspace.selectedProjectId
												? "border-[#8f5c34] bg-[#181614] text-[#fffdf8]"
												: "border-[#d9cfc2] bg-[#fffdf8] text-[#181614] hover:border-[#b9825b]"
										}`}
									>
										{project.name}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				)}
				<SelenaHorecaLocalFirst
					locale={locale}
					model={model}
					sourceOnlyPreview={workspace.model === null}
					evidenceDetail={workspace.evidenceDetail}
					evidenceDetailHref={workspace.model ? evidenceDetailHref : undefined}
				/>
			</main>
		</div>
	);
}
