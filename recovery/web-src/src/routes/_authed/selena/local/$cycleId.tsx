import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SelenaLocalReportPage } from "@/components/selena-local-report-page";
import { listSelenaWorkspaces, selectSelenaWorkspace } from "@/server/selena-workspaces";

// Manual no-charge pilots use session + tenant authorization, independently of subscription checkout.
export const Route = createFileRoute("/_authed/selena/local/$cycleId")({
	loader: () => listSelenaWorkspaces(),
	component: LocalReportRoute,
});
function LocalReportRoute() {
	const { cycleId } = Route.useParams();
	const workspaces = Route.useLoaderData();
	const [selected, setSelected] = useState(workspaces.activeOrganizationId ?? "");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	async function selectWorkspace() {
		if (!selected || pending) return;
		setPending(true);
		setError("");
		try {
			await selectSelenaWorkspace({ data: { organizationId: selected } });
			// Reload all tenant-scoped state after the auth plugin updates the session cookie.
			window.location.reload();
		} catch {
			setError("Could not switch workspace. Please try again.");
			setPending(false);
		}
	}
	return (
		<>
			{workspaces.organizations.length > 1 && (
				<section aria-label="Workspace selection" className="bg-[#f7f2ea] px-4 pt-6 text-[#181614] sm:px-8">
					<div className="mx-auto flex max-w-5xl flex-wrap items-end gap-3">
						<label className="flex min-w-0 max-w-full flex-col gap-2" htmlFor="local-report-workspace">
							Workspace
							<select
								id="local-report-workspace"
								value={selected}
								onChange={(event) => setSelected(event.target.value)}
								disabled={pending || workspaces.readOnly}
								className="min-h-11 max-w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 focus-visible:outline-2 focus-visible:outline-offset-4"
							>
								<option value="" disabled>
									Choose workspace
								</option>
								{workspaces.organizations.map((workspace) => (
									<option key={workspace.id} value={workspace.id}>
										{workspace.name}
									</option>
								))}
							</select>
						</label>
						<button
							type="button"
							disabled={!selected || pending || workspaces.readOnly}
							onClick={() => void selectWorkspace()}
							className="min-h-11 rounded-xl border border-[#b9825b] px-4 py-2 font-semibold text-[#8f5c34] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60"
						>
							{pending ? "Switching…" : "Switch workspace"}
						</button>
						{error && <p role="alert">{error}</p>}
					</div>
				</section>
			)}
			<SelenaLocalReportPage cycleId={cycleId} />
		</>
	);
}
