import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svCycles, svFindings, svRecommendations } from "@workspace/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";

export const getSelenaDashboardFn = createServerFn({ method: "GET" })
	.validator(z.object({ cycleId: z.string().uuid() }))
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		return withOrganizationTransaction(db, context.tenantId, async (tx) => {
			const [cycle] = await tx
				.select()
				.from(svCycles)
				.where(and(eq(svCycles.id, data.cycleId), eq(svCycles.organizationId, context.tenantId)))
				.limit(1);
			if (!cycle) return null;
			const [findings, recommendations] = await Promise.all([
				tx
					.select()
					.from(svFindings)
					.where(and(eq(svFindings.cycleId, cycle.id), eq(svFindings.organizationId, context.tenantId))),
				tx
					.select()
					.from(svRecommendations)
					.where(and(eq(svRecommendations.cycleId, cycle.id), eq(svRecommendations.organizationId, context.tenantId))),
			]);
			return {
				cycle,
				findings,
				recommendations,
				channels: ["Visitor View", "API View"] as const,
				reportExports: { csv: true, pdf: true, xlsx: true, renderer: "tools/selena_export.py" },
			};
		});
	});
