import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalWriteRouteHandlers } from "@/server/selena-local-write-api";

export const Route = createFileRoute("/api/v1/selena/locations/$locationId/local-scan-cycles")({
	server: {
		handlers: {
			POST: ({ request, params }) => selenaLocalWriteRouteHandlers.createCycle(request, params.locationId),
		},
	},
});
