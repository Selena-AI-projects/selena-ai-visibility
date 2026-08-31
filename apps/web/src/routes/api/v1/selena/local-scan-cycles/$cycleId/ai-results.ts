import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalReadRouteHandlers } from "@/server/selena-local-read-api";

export const Route = createFileRoute("/api/v1/selena/local-scan-cycles/$cycleId/ai-results")({
	server: {
		handlers: {
			GET: ({ request, params }) => selenaLocalReadRouteHandlers.aiResults(request, params.cycleId),
		},
	},
});
