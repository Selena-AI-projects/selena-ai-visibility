import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalSetupRouteHandlers } from "@/server/selena-local-setup-api";

export const Route = createFileRoute("/api/v1/selena/locations/$locationId/keyword-sets")({
	server: {
		handlers: {
			POST: ({ request, params }) => selenaLocalSetupRouteHandlers.createKeywordSet(request, params.locationId),
		},
	},
});
