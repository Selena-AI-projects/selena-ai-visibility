import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalReportRouteHandlers } from "@/server/selena-local-report";

export const Route = createFileRoute("/api/v1/selena/admin/local-scan-cycles/$cycleId/report")({
	server: {
		handlers: {
			GET: ({ request, params }) => selenaLocalReportRouteHandlers().preview(request, params.cycleId),
			POST: ({ request, params }) => selenaLocalReportRouteHandlers().createReport(request, params.cycleId),
		},
	},
});
