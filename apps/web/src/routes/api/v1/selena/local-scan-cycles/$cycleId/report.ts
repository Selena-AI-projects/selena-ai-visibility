import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalReportRouteHandlers } from "@/server/selena-local-report";

export const Route = createFileRoute("/api/v1/selena/local-scan-cycles/$cycleId/report")({
	server: {
		handlers: {
			GET: ({ request, params }) => selenaLocalReportRouteHandlers().report(request, params.cycleId),
		},
	},
});
