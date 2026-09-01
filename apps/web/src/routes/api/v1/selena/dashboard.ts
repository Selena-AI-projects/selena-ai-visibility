import { createFileRoute } from "@tanstack/react-router";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svCycles, svFindings, svRecommendations } from "@workspace/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiKeyAuthContext } from "../../../../lib/selena-auth-context";

export const Route = createFileRoute("/api/v1/selena/dashboard")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const auth = await resolveApiKeyAuthContext(request);
					const cycleId = new URL(request.url).searchParams.get("cycleId");
					if (!cycleId || !z.string().uuid().safeParse(cycleId).success)
						return Response.json(
							{ error: "Validation Error", message: "cycleId query parameter is required" },
							{ status: 400 },
						);
					const result = await withOrganizationTransaction(db, auth.tenantId, async (tx) => {
						const [cycle] = await tx
							.select()
							.from(svCycles)
							.where(and(eq(svCycles.id, cycleId), eq(svCycles.organizationId, auth.tenantId)))
							.limit(1);
						if (!cycle) return null;
						const [findings, recommendations] = await Promise.all([
							tx
								.select()
								.from(svFindings)
								.where(and(eq(svFindings.cycleId, cycle.id), eq(svFindings.organizationId, auth.tenantId))),
							tx
								.select()
								.from(svRecommendations)
								.where(
									and(eq(svRecommendations.cycleId, cycle.id), eq(svRecommendations.organizationId, auth.tenantId)),
								),
						]);
						return { cycle, findings, recommendations };
					});
					if (!result)
						return Response.json(
							{ error: "Not Found", message: "Cycle is outside AuthContext tenant" },
							{ status: 404 },
						);
					return Response.json({
						cycle: result.cycle,
						findings: result.findings,
						recommendations: result.recommendations,
						channels: ["Visitor View", "API View"],
						reportExports: { csv: true, pdf: true, xlsx: true },
					});
				} catch (error) {
					return Response.json(
						{
							error: "Unauthorized",
							message: error instanceof Error ? error.message : "Valid scoped API key required",
						},
						{ status: 401 },
					);
				}
			},
		},
	},
});
