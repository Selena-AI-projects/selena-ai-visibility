import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalWriteRouteHandlers } from "@/server/selena-local-write-api";

export const Route = createFileRoute("/api/v1/selena/locations/$locationId/local-scan/quote")({
	server: {
		handlers: {
			POST: ({ request, params }) => selenaLocalWriteRouteHandlers.quote(request, params.locationId),
		},
	},
});
