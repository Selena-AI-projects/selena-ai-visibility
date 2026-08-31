import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalReadRouteHandlers } from "@/server/selena-local-read-api";

export const Route = createFileRoute("/api/v1/selena/local-scan-cycles/$cycleId/evidence")({
	server: {
		handlers: {
			GET: ({ request, params }) => selenaLocalReadRouteHandlers.evidence(request, params.cycleId),
		},
	},
});
