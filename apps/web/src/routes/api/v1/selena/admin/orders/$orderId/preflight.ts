import { createFileRoute } from "@tanstack/react-router";
import { selenaOrderDeskRouteHandlers } from "@/server/selena-admin-orders-api";

export const Route = createFileRoute("/api/v1/selena/admin/orders/$orderId/preflight")({
	server: {
		handlers: { GET: ({ request, params }) => selenaOrderDeskRouteHandlers.preflight(request, params.orderId) },
	},
});
