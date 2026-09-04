import { createFileRoute } from "@tanstack/react-router";
import { selenaOrderDeskRouteHandlers } from "@/server/selena-admin-orders-api";

export const Route = createFileRoute("/api/v1/selena/admin/orders/$orderId/approve")({
	server: {
		handlers: { POST: ({ request, params }) => selenaOrderDeskRouteHandlers.approve(request, params.orderId) },
	},
});
