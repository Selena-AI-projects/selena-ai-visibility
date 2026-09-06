import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { resolveApiKeyAuthContext } from "../../../../../lib/selena-auth-context";
import {
	assertSimulationEnvironment,
	disconnectTelegramRecipient,
	issueTelegramConnectLink,
	prepareSampleReportDelivery,
	readSimulationEvidence,
	readTelegramBindingStatus,
	registerTelegramWebhook,
	runDeliveryAttempt,
} from "../../../../../server/selena-staging-simulation";
import { simulationErrorResponse } from "../../../../../server/selena-staging-simulation-http";

/**
 * The operator surface for one simulation run: mint a connect link, save the
 * sample report, run a delivery attempt, read the evidence, disconnect.
 *
 * These are separate steps rather than one button because the point of the
 * exercise is that each link of the chain can be observed on its own — and
 * because a step that refuses (a report that was never saved, a recipient that
 * was never bound) has to be visible as a refusal rather than as a silent
 * no-op inside a larger action.
 */
const bodySchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("connect-link"),
		projectRef: z.string().min(1).max(160),
		userId: z.string().min(1).max(160),
	}),
	z.object({ action: z.literal("binding-status"), projectRef: z.string().min(1).max(160) }),
	z.object({ action: z.literal("set-webhook") }),
	z.object({ action: z.literal("disconnect"), projectRef: z.string().min(1).max(160) }),
	z.object({
		action: z.literal("prepare-report"),
		projectRef: z.string().min(1).max(160),
		projectName: z.string().min(1).max(160),
		periodStart: z.iso.datetime(),
		periodEnd: z.iso.datetime(),
	}),
	z.object({
		action: z.literal("deliver"),
		deliveryId: z.string().uuid(),
		workspaceUrl: z.string().url().max(500),
	}),
	z.object({ action: z.literal("evidence"), deliveryId: z.string().uuid(), correlationId: z.string().min(8).max(64) }),
]);

export const Route = createFileRoute("/api/v1/selena/staging/simulation")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					assertSimulationEnvironment();
					const auth = await resolveApiKeyAuthContext(request);
					if (!auth.permissions.includes("client:write"))
						return Response.json(
							{ error: "Forbidden", message: "API key lacks client:write permission" },
							{ status: 403 },
						);
					const parsed = bodySchema.safeParse(await request.json());
					if (!parsed.success)
						return Response.json({ error: "Validation Error", message: parsed.error.message }, { status: 400 });
					const body = parsed.data;
					const identity = { tenantId: auth.tenantId, actorId: auth.actorId };

					if (body.action === "connect-link")
						return Response.json(
							await issueTelegramConnectLink({ ...identity, userId: body.userId, projectRef: body.projectRef }),
						);
					if (body.action === "set-webhook") return Response.json(await registerTelegramWebhook({}));
					if (body.action === "binding-status")
						return Response.json(await readTelegramBindingStatus({ ...identity, projectRef: body.projectRef }));
					if (body.action === "disconnect")
						return Response.json(await disconnectTelegramRecipient({ ...identity, projectRef: body.projectRef }));
					if (body.action === "prepare-report")
						return Response.json(
							await prepareSampleReportDelivery({
								...identity,
								projectRef: body.projectRef,
								projectName: body.projectName,
								periodStart: new Date(body.periodStart),
								periodEnd: new Date(body.periodEnd),
							}),
							{ status: 201 },
						);
					if (body.action === "deliver")
						return Response.json(
							await runDeliveryAttempt({
								...identity,
								deliveryId: body.deliveryId,
								workspaceUrl: body.workspaceUrl,
							}),
						);
					return Response.json(
						await readSimulationEvidence({
							...identity,
							deliveryId: body.deliveryId,
							correlationId: body.correlationId,
						}),
					);
				} catch (error) {
					return simulationErrorResponse(error);
				}
			},
		},
	},
});
