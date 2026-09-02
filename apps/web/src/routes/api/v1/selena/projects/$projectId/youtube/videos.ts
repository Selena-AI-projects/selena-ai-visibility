import { createFileRoute } from "@tanstack/react-router";
import {
	assertYouTubeDurablePersistenceAccess,
	createYouTubeDurableProjectionStore,
	YouTubePersistenceGuardError,
} from "@workspace/lib/brightdata-social";
import { db } from "@workspace/lib/db/db";
import { svProviderDatasetCapabilities } from "@workspace/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { resolveApiKeyAuthContext } from "@/lib/selena-auth-context";

const store = createYouTubeDurableProjectionStore(db);
const projectIdSchema = z.string().uuid();

/**
 * Customer read boundary for the approved YouTube projection. It is invisible
 * while the feature flag is absent and requires a tenant-approved capability
 * row even when the flag is enabled.
 */
export const Route = createFileRoute("/api/v1/selena/projects/$projectId/youtube/videos")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				try {
					const enabled = process.env.SELENA_YOUTUBE_CUSTOMER_API_ENABLED === "true";
					if (!enabled)
						return Response.json({ error: "Not Found", message: "YouTube visibility is not enabled" }, { status: 404 });
					const auth = await resolveApiKeyAuthContext(request);
					if (!auth.permissions.includes("client:read"))
						return Response.json(
							{ error: "Forbidden", message: "API key lacks client:read permission" },
							{ status: 403 },
						);
					const projectId = projectIdSchema.safeParse(params.projectId);
					if (!projectId.success)
						return Response.json({ error: "Validation Error", message: "projectId must be a UUID" }, { status: 400 });
					const [capability] = await db.transaction(async (tx) => {
						await tx.execute(sql`select set_config('app.organization_id', ${auth.tenantId}, true)`);
						return tx
							.select({ capabilityStatus: svProviderDatasetCapabilities.capabilityStatus })
							.from(svProviderDatasetCapabilities)
							.where(
								and(
									eq(svProviderDatasetCapabilities.organizationId, auth.tenantId),
									eq(svProviderDatasetCapabilities.source, "YOUTUBE_VIDEOS"),
								),
							)
							.orderBy(desc(svProviderDatasetCapabilities.version))
							.limit(1);
					});
					const context = {
						organizationId: auth.tenantId,
						projectId: projectId.data,
						featureEnabled: enabled,
						capabilityStatus: capability?.capabilityStatus ?? null,
					};
					assertYouTubeDurablePersistenceAccess(context);
					return Response.json({ videos: await store.list(context, { projectId: projectId.data }) });
				} catch (error) {
					if (error instanceof YouTubePersistenceGuardError) {
						const status = error.code === "YOUTUBE_CUSTOMER_API_DISABLED" ? 404 : 403;
						return Response.json(
							{ error: status === 404 ? "Not Found" : "Forbidden", message: error.code },
							{ status },
						);
					}
					const message = error instanceof Error ? error.message : "Request failed";
					const status = message.startsWith("Unauthorized") ? 401 : message.includes("OUTSIDE_TENANT") ? 404 : 400;
					return Response.json({ error: status === 401 ? "Unauthorized" : "Request Failed", message }, { status });
				}
			},
		},
	},
});
