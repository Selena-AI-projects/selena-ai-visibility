import { createFileRoute } from "@tanstack/react-router";
import { selenaOrderDeskRouteHandlers } from "@/server/selena-admin-orders-api";

export const Route = createFileRoute("/api/v1/selena/admin/orders/$orderId/enqueue")({
	server: {
		handlers: { POST: ({ request, params }) => selenaOrderDeskRouteHandlers.enqueue(request, params.orderId) },
	},
});
