import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { resolveApiKeyAuthContext } from "../../../../../../lib/selena-auth-context";
import { readCycleRuns } from "../../../../../../server/selena-cycle-runs-api";
import { parseCycleRunsOptions } from "../../../../../../server/selena-cycle-runs-view";

export const Route = createFileRoute("/api/v1/selena/cycles/$cycleId/runs")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				let auth: Awaited<ReturnType<typeof resolveApiKeyAuthContext>>;
				try {
					auth = await resolveApiKeyAuthContext(request);
				} catch (error) {
					return Response.json(
						{
							error: "Unauthorized",
							message: error instanceof Error ? error.message : "Valid scoped API key required",
						},
						{ status: 401 },
					);
				}
				if (!auth.permissions.includes("client:read"))
					return Response.json(
						{ error: "Forbidden", message: "API key lacks client:read permission" },
						{ status: 403 },
					);
				if (!z.string().uuid().safeParse(params.cycleId).success)
					return Response.json({ error: "Validation Error", message: "cycleId must be a UUID" }, { status: 400 });
				const result = await readCycleRuns(auth, params.cycleId, parseCycleRunsOptions(new URL(request.url)));
				if (!result)
					return Response.json({ error: "Not Found", message: "Cycle is outside AuthContext tenant" }, { status: 404 });
				return Response.json(result);
			},
		},
	},
});
