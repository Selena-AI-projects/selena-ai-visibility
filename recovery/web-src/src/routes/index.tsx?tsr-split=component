/**
 * Home page - / route
 *
 * Redirects authenticated users to /app.
 * In demo mode, auto-redirects unauthenticated users to /auth/login
 * (the login page pre-fills the demo credentials, so the bare home page
 * is just a redundant extra click).
 * On a fresh deployment that needs bootstrapping (registration is open
 * AND no users exist yet), redirects to /auth/register so the first
 * visitor sees the signup screen instead of an empty-database login form.
 * Shows sign-in for unauthenticated users in other modes.
 */
import { createFileRoute, redirect, useRouteContext } from "@tanstack/react-router";
import type { ClientConfig } from "@workspace/config/types";
import { Button } from "@workspace/ui/components/button";
import FullPageCard from "@/components/full-page-card";
import { getSession } from "@/lib/auth/session";

export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	beforeLoad: async ({ context, search }) => {
		const session = await getSession();

		if (session) {
			throw redirect({ to: "/app" });
		}

		if (context.clientConfig?.mode === "demo") {
			throw redirect({
				to: "/auth/login",
				search: search.redirect ? { returnTo: search.redirect } : {},
			});
		}

		if (context.clientConfig?.canRegister && !context.clientConfig?.hasUsers) {
			throw redirect({
				to: "/auth/register",
				search: search.redirect ? { returnTo: search.redirect } : {},
			});
		}

		return { session };
	},
	component: HomePage,
});

function HomePage() {
	const { redirect: redirectParam } = Route.useSearch();
	const context = useRouteContext({ strict: false }) as { clientConfig?: ClientConfig };
	const canRegister = context.clientConfig?.canRegister ?? false;

	const withReturnTo = (path: string) =>
		redirectParam ? `${path}?returnTo=${encodeURIComponent(redirectParam)}` : path;

	return (
		<FullPageCard className="">
			<div className="flex flex-col items-center gap-3 w-full">
				<Button asChild className="w-full">
					<a href={withReturnTo("/auth/login")}>Sign In</a>
				</Button>
				{/* Without this the bare Sign In button is the only thing a first-time
				    visitor sees, and nothing on the page says an account can be made. */}
				{canRegister && (
					<Button asChild variant="outline" className="w-full">
						<a href={withReturnTo("/auth/register")}>Create an account</a>
					</Button>
				)}
			</div>
		</FullPageCard>
	);
}
