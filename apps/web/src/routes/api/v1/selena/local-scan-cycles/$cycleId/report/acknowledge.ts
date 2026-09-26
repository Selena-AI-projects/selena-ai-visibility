import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalReportRouteHandlers } from "@/server/selena-local-report";

export const Route = createFileRoute("/api/v1/selena/local-scan-cycles/$cycleId/report/acknowledge")({
	server: {
		handlers: {
			POST: ({ request, params }) => selenaLocalReportRouteHandlers().acknowledge(request, params.cycleId),
		},
	},
});
