import { SimulationError } from "./selena-staging-simulation";

/**
 * Maps a simulation failure to a response.
 *
 * A disabled environment answers 404 rather than 403: an endpoint that says
 * "you are not allowed here" also says "here exists", and a production
 * deployment should not confirm that a test-payment trigger is part of the
 * build. The one exception is an explicit production refusal, which is worth
 * naming so an operator who misconfigured a staging service can see why.
 */
export function simulationErrorResponse(error: unknown): Response {
	if (error instanceof SimulationError) {
		if (error.httpStatus === 404) return new Response("Not Found", { status: 404 });
		return Response.json({ error: "Simulation Refused", code: error.code }, { status: error.httpStatus });
	}
	const message = error instanceof Error ? error.message : "";
	if (message.startsWith("Unauthorized:"))
		return Response.json({ error: "Unauthorized", message: "Valid API credentials are required" }, { status: 401 });
	if (message.startsWith("Forbidden:"))
		return Response.json({ error: "Forbidden", message: "API credentials do not permit this action" }, { status: 403 });
	if (message.startsWith("SELENA_"))
		return Response.json({ error: "Simulation Refused", code: message }, { status: 409 });
	return Response.json({ error: "Request Failed", message: "Simulation request failed" }, { status: 500 });
}
