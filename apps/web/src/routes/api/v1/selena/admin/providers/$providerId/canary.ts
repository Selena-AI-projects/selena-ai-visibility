import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalAdminRouteHandlers } from "@/server/selena-local-admin-api";

export const Route = createFileRoute("/api/v1/selena/admin/providers/$providerId/canary")({
	server: {
		handlers: {
			POST: ({ request, params }) => selenaLocalAdminRouteHandlers.providerCanary(request, params.providerId),
		},
	},
});
