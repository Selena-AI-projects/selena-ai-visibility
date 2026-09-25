/**
 * Client-safe RPC facade for the Selena order desk.
 *
 * Keep database-backed implementations in selena-order-desk-core.ts. A client
 * component imports this module, so regular exports or top-level database work
 * here would pull pg into the browser bundle and fail before hydration.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SelenaRepositoryContext } from "@workspace/lib/selena-visibility-repositories";
import { planIds } from "@workspace/selena-visibility-contracts";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/helpers";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";
import {
	createSelenaOrderDraft,
	decideSelenaScenarios,
	getSelenaOrderDesk,
	prepareSelenaScenarios,
	startSelenaMeasurement,
} from "./selena-order-desk-core";

async function requireAdminContext(): Promise<SelenaRepositoryContext> {
	await requireAdmin();
	return resolveSessionAuthContext();
}

const projectIdSchema = z.object({ projectId: z.string().uuid() });
const orderDraftSchema = projectIdSchema.extend({
	planId: z.enum(planIds),
	scenarioIds: z.array(z.string().uuid()).min(1).max(200),
	idempotencyKey: z.string().min(1).max(200),
});

export const getSelenaOrderDeskFn = createServerFn({ method: "GET" }).handler(async () =>
	getSelenaOrderDesk(await requireAdminContext()),
);

export const prepareSelenaScenariosFn = createServerFn({ method: "POST" })
	.validator(projectIdSchema)
	.handler(async ({ data }) => prepareSelenaScenarios(await resolveSessionAuthContext(), data.projectId));

export const decideSelenaScenariosFn = createServerFn({ method: "POST" })
	.validator(
		projectIdSchema.extend({
			scenarioIds: z.array(z.string().uuid()).min(1).max(200),
			decision: z.enum(["APPROVED", "REJECTED", "PROPOSED"]),
		}),
	)
	.handler(async ({ data }) => decideSelenaScenarios(await resolveSessionAuthContext(), data));

export const createSelenaOrderDraftFn = createServerFn({ method: "POST" })
	.validator(orderDraftSchema)
	.handler(async ({ data }) => createSelenaOrderDraft(await requireAdminContext(), data));

export const startSelenaMeasurementFn = createServerFn({ method: "POST" })
	.validator(orderDraftSchema)
	.handler(async ({ data }) => startSelenaMeasurement(await requireAdminContext(), data));
