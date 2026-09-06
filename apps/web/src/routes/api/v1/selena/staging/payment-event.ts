import { createFileRoute } from "@tanstack/react-router";
import { resolveApiKeyAuthContext } from "../../../../../lib/selena-auth-context";
import { acceptSimulatedPaymentEvent } from "../../../../../server/selena-staging-simulation";
import { simulationErrorResponse } from "../../../../../server/selena-staging-simulation-http";

/**
 * The inbound seam a real payment webhook will use.
 *
 * Two independent credentials are required: the API key decides which
 * workspace the event may write into, and the HMAC signature decides whether
 * the event is authentic. Either alone would be enough for an attacker —
 * a stolen key could invent subscriptions, a replayed body could target any
 * tenant — so both are checked, and the signature is verified over the raw
 * bytes before the body is parsed.
 */
export const Route = createFileRoute("/api/v1/selena/staging/payment-event")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const auth = await resolveApiKeyAuthContext(request);
					if (!auth.permissions.includes("client:write"))
						return Response.json(
							{ error: "Forbidden", message: "API key lacks client:write permission" },
							{ status: 403 },
						);
					const rawBody = await request.text();
					const accepted = await acceptSimulatedPaymentEvent({
						rawBody,
						signature: request.headers.get("x-selena-signature") ?? "",
						tenantId: auth.tenantId,
						actorId: auth.actorId,
					});
					return Response.json(accepted, { status: accepted.replayed ? 200 : 201 });
				} catch (error) {
					return simulationErrorResponse(error);
				}
			},
		},
	},
});
