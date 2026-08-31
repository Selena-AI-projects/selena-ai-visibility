import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalAdminRouteHandlers } from "@/server/selena-local-admin-api";

export const Route = createFileRoute("/api/v1/selena/admin/local-scan-cycles/$cycleId/preflight")({
	server: {
		handlers: { POST: ({ request, params }) => selenaLocalAdminRouteHandlers.preflight(request, params.cycleId) },
	},
});
