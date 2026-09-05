import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svCycles, svFindings, svRecommendations } from "@workspace/lib/db/schema";
import { deriveFindings, deriveRecommendations } from "@workspace/lib/selena-findings";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";

const metricsSchema = z.object({
	cycleId: z.string().uuid(),
	mentionRate: z.number().min(0).max(1),
	ownedCitationRate: z.number().min(0).max(1),
	invalidRate: z.number().min(0).max(1),
	visitorApiDivergence: z.number().min(0).max(1),
});

export const generateSelenaFindingsFn = createServerFn({ method: "POST" })
	.validator(metricsSchema)
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		return withOrganizationTransaction(db, context.tenantId, async (tx) => {
			const [cycle] = await tx
				.select({ id: svCycles.id })
				.from(svCycles)
				.where(and(eq(svCycles.id, data.cycleId), eq(svCycles.organizationId, context.tenantId)))
				.limit(1);
			if (!cycle) throw new Error("Not found: cycle is outside AuthContext tenant");
			const findings = deriveFindings(data);
			const recommendations = deriveRecommendations(findings);
			const insertedFindings = findings.length
				? await tx
						.insert(svFindings)
						.values(
							findings.map((finding) => ({
								organizationId: context.tenantId,
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
								organizationId: context.tenantId,
								cycleId: cycle.id,
								findingId: insertedFindings[index]?.id,
								...recommendation,
							})),
						)
						.returning()
				: [];
			return { cycleId: cycle.id, findings: insertedFindings, recommendations: insertedRecommendations };
		});
	});
