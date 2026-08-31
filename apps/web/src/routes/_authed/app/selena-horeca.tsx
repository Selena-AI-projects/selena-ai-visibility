import { IconArrowLeft } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SelenaHorecaLocalFirst } from "@/components/selena-horeca-local-first";
import { SelenaWordmark } from "@/components/selena-wordmark";
import { buildHorecaLocalFirstPreview } from "@/lib/selena-horeca-local-first";
import { getSelenaLocalVisibilityStateFn } from "@/server/selena-local-visibility";

export const Route = createFileRoute("/_authed/app/selena-horeca")({
	loader: async () => ({
		localVisibility: await getSelenaLocalVisibilityStateFn(),
		generatedAt: new Date().toISOString(),
	}),
	component: SelenaHorecaPage,
});

function SelenaHorecaPage() {
	const { localVisibility, generatedAt } = Route.useLoaderData();
	const model = buildHorecaLocalFirstPreview(localVisibility.enabled, generatedAt);

	return (
		<div className="selena-app min-h-screen bg-[#f7f2ea] pb-16 text-[#181614]">
			<header className="selena-app-header">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
					<SelenaWordmark />
					<Link
						to="/app/selena"
						className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#181614] outline-none hover:bg-[#eee5da] focus-visible:ring-2 focus-visible:ring-[#8f5c34]"
					>
						<IconArrowLeft className="size-4" aria-hidden="true" />
						Projects
					</Link>
				</div>
			</header>

			<main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
				<SelenaHorecaLocalFirst locale="en" model={model} />
			</main>
		</div>
	);
}
