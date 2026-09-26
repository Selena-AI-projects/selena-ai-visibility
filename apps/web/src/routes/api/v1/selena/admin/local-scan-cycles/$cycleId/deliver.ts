import { createFileRoute } from "@tanstack/react-router";
import { selenaLocalReportRouteHandlers } from "@/server/selena-local-report";

export const Route = createFileRoute("/api/v1/selena/admin/local-scan-cycles/$cycleId/deliver")({
	server: {
		handlers: {
			POST: ({ request, params }) => selenaLocalReportRouteHandlers().deliver(request, params.cycleId),
		},
	},
});
