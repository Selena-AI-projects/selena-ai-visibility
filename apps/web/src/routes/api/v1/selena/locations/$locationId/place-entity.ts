import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalSetupRouteHandlers } from "@/server/selena-local-setup-api";

export const Route = createFileRoute("/api/v1/selena/locations/$locationId/place-entity")({
	server: {
		handlers: {
			PUT: ({ request, params }) => selenaLocalSetupRouteHandlers.confirmPlaceEntity(request, params.locationId),
		},
	},
});
