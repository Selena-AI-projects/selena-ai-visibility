import { createFileRoute } from "@tanstack/react-router";
import { providerCapabilitiesRouteHandlers } from "@/server/selena-provider-capabilities-api";

export const Route = createFileRoute("/api/v1/selena/admin/providers/$providerId/capabilities")({
	server: {
		handlers: {
			GET: ({ request, params }) => providerCapabilitiesRouteHandlers.capabilities(request, params.providerId),
		},
	},
});
