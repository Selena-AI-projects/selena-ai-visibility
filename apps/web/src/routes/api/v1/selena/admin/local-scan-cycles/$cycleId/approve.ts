import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalAdminRouteHandlers } from "@/server/selena-local-admin-api";

export const Route = createFileRoute("/api/v1/selena/admin/local-scan-cycles/$cycleId/approve")({
	server: {
		handlers: { POST: ({ request, params }) => selenaLocalAdminRouteHandlers.approve(request, params.cycleId) },
	},
});
