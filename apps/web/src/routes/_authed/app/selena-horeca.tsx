import { IconArrowLeft } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SelenaHorecaLocalFirst } from "@/components/selena-horeca-local-first";
import { SelenaWordmark } from "@/components/selena-wordmark";
import { buildHorecaLocalFirstPreview, type HorecaPreviewLocale } from "@/lib/selena-horeca-local-first";
import { getSelenaLocalVisibilityStateFn } from "@/server/selena-local-visibility";

export const Route = createFileRoute("/_authed/app/selena-horeca")({
	validateSearch: (search: Record<string, unknown>): { locale?: HorecaPreviewLocale } =>
		search.locale === "ru" || search.locale === "en" ? { locale: search.locale } : {},
	loader: async () => ({
		localVisibility: await getSelenaLocalVisibilityStateFn(),
		generatedAt: new Date().toISOString(),
	}),
	component: SelenaHorecaPage,
});

function SelenaHorecaPage() {
	const { localVisibility, generatedAt } = Route.useLoaderData();
	const { locale: requestedLocale } = Route.useSearch();
	const [locale, setLocale] = useState<HorecaPreviewLocale>(requestedLocale ?? "en");
	const model = buildHorecaLocalFirstPreview(localVisibility.enabled, generatedAt);

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
							search={{ locale: locale === "ru" ? "en" : "ru" }}
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
				<SelenaHorecaLocalFirst locale={locale} model={model} />
			</main>
		</div>
	);
}
