import { createFileRoute } from "@tanstack/react-router";
import { bootstrapSimulationTenant } from "../../../../../server/selena-staging-bootstrap";
import { simulationErrorResponse } from "../../../../../server/selena-staging-simulation-http";

/**
 * The rig's first credential. Unauthenticated by necessity — there is no key
 * yet — and therefore signed: the HMAC over the raw body is the whole of its
 * protection, alongside the same environment gate the rest of the simulation
 * uses.
 */
export const Route = createFileRoute("/api/v1/selena/staging/bootstrap")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const rawBody = await request.text();
					const result = await bootstrapSimulationTenant({
						rawBody,
						signature: request.headers.get("x-selena-signature") ?? "",
					});
					return Response.json(result, { status: result.created ? 201 : 200 });
				} catch (error) {
					return simulationErrorResponse(error);
				}
			},
		},
	},
});
