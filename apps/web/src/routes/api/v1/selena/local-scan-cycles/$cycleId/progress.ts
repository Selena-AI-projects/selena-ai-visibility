import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalReadRouteHandlers } from "@/server/selena-local-read-api";

export const Route = createFileRoute("/api/v1/selena/local-scan-cycles/$cycleId/progress")({
	server: {
		handlers: {
			GET: ({ request, params }) => selenaLocalReadRouteHandlers.progress(request, params.cycleId),
		},
	},
});
