import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalAdminRouteHandlers } from "@/server/selena-local-admin-api";

export const Route = createFileRoute("/api/v1/selena/admin/local-ai-runs/$runId/retry")({
	server: { handlers: { POST: ({ request, params }) => selenaLocalAdminRouteHandlers.aiRetry(request, params.runId) } },
});
