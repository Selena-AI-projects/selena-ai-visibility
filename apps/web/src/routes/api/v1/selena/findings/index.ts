import { createFileRoute } from "@tanstack/react-router";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svCycles, svFindings, svRecommendations } from "@workspace/lib/db/schema";
import { deriveFindings, deriveRecommendations } from "@workspace/lib/selena-findings";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { resolveApiKeyAuthContext } from "../../../../../lib/selena-auth-context";

const cycleIdSchema = z.string().uuid();
const metricsSchema = z.object({
	cycleId: cycleIdSchema,
	mentionRate: z.number().min(0).max(1),
	ownedCitationRate: z.number().min(0).max(1),
	invalidRate: z.number().min(0).max(1),
	visitorApiDivergence: z.number().min(0).max(1),
});

async function cycleFor(request: Request) {
	const auth = await resolveApiKeyAuthContext(request);
	const cycleId = new URL(request.url).searchParams.get("cycleId");
	if (!cycleId || !cycleIdSchema.safeParse(cycleId).success) throw new Error("cycleId query parameter is required");
	const [cycle] = await withOrganizationTransaction(db, auth.tenantId, (tx) =>
		tx
			.select({ id: svCycles.id })
			.from(svCycles)
			.where(and(eq(svCycles.id, cycleId), eq(svCycles.organizationId, auth.tenantId)))
			.limit(1),
	);
	if (!cycle) throw new Error("Cycle is outside AuthContext tenant");
	return { auth, cycle };
}

export const Route = createFileRoute("/api/v1/selena/findings/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const { auth, cycle } = await cycleFor(request);
					const [findings, recommendations] = await withOrganizationTransaction(db, auth.tenantId, (tx) =>
						Promise.all([
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
						]),
					);
					return Response.json({ cycleId: cycle.id, findings, recommendations });
				} catch (error) {
					return Response.json(
						{ error: "Request Failed", message: error instanceof Error ? error.message : "Unable to read findings" },
						{ status: 400 },
					);
				}
			},
			POST: async ({ request }) => {
				try {
					const auth = await resolveApiKeyAuthContext(request);
					if (!auth.permissions.includes("client:write"))
						return Response.json(
							{ error: "Forbidden", message: "API key lacks client:write permission" },
							{ status: 403 },
						);
					const parsed = metricsSchema.safeParse(await request.json());
					if (!parsed.success)
						return Response.json({ error: "Validation Error", message: parsed.error.message }, { status: 400 });
					const result = await withOrganizationTransaction(db, auth.tenantId, async (tx) => {
						const [cycle] = await tx
							.select({ id: svCycles.id })
							.from(svCycles)
							.where(and(eq(svCycles.id, parsed.data.cycleId), eq(svCycles.organizationId, auth.tenantId)))
							.limit(1);
						if (!cycle) return null;
						const findings = deriveFindings(parsed.data);
						const recommendations = deriveRecommendations(findings);
						const insertedFindings = findings.length
							? await tx
									.insert(svFindings)
									.values(
										findings.map((finding) => ({
											organizationId: auth.tenantId,
											cycleId: cycle.id,
											...finding,
											status: "OPEN" as const,
										})),
									)
									.returning()
							: [];
						const insertedRecommendations = recommendations.length
							? await tx
									.insert(svRecommendations)
									.values(
										recommendations.map((recommendation, index) => ({
											organizationId: auth.tenantId,
											cycleId: cycle.id,
											findingId: insertedFindings[index]?.id,
											...recommendation,
										})),
									)
									.returning()
							: [];
						return { cycle, insertedFindings, insertedRecommendations };
					});
					if (!result)
						return Response.json(
							{ error: "Not Found", message: "Cycle is outside AuthContext tenant" },
							{ status: 404 },
						);
					return Response.json(
						{
							cycleId: result.cycle.id,
							findings: result.insertedFindings,
							recommendations: result.insertedRecommendations,
						},
						{ status: 201 },
					);
				} catch (error) {
					return Response.json(
						{
							error: "Request Failed",
							message: error instanceof Error ? error.message : "Unable to generate findings",
						},
						{ status: 400 },
					);
				}
			},
		},
	},
});
