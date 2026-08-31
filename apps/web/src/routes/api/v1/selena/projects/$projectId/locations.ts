import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalSetupRouteHandlers } from "@/server/selena-local-setup-api";

export const Route = createFileRoute("/api/v1/selena/projects/$projectId/locations")({
	server: {
		handlers: {
			POST: ({ request, params }) => selenaLocalSetupRouteHandlers.createLocation(request, params.projectId),
		},
	},
});
