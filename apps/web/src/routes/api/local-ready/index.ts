import { createFileRoute } from "@tanstack/react-router";

export function localReadyResponse(): Response {
	return Response.json({ status: "ok" });
}

export const Route = createFileRoute("/api/local-ready/")({
	server: {
		handlers: {
			GET: localReadyResponse,
		},
	},
});
