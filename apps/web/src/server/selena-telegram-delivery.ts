import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { type OrganizationTransaction, withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svDeliveryConnectTokens, svDeliveryRecipients, svProjects } from "@workspace/lib/db/schema";
import { getKeyring } from "@workspace/lib/secrets";
import {
	createTelegramWebhookRegistrar,
	DELIVERY_CONNECT_TOKEN_TTL_MS,
	hashDeliveryConnectToken,
	mintDeliveryConnectToken,
	readTelegramDeliveryConfig,
	type TelegramDeliveryConfig,
} from "@workspace/lib/selena-delivery-connect";
import { getTelegramWebhookInfo, setTelegramWebhook } from "@workspace/lib/selena-telegram-adapter";
import { telegramDeepLink, telegramWebhookHeaderToken } from "@workspace/selena-visibility-contracts";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { canWrite, resolveSessionAuthContext } from "../lib/selena-auth-context";

const projectInput = z.object({ projectId: z.string().uuid() });

/**
 * Configured and able to store a chat. A missing or unusable encryption key
 * counts as unavailable: the webhook could not keep the chat id it receives.
 */
function deliveryConfig(): TelegramDeliveryConfig | null {
	const config = readTelegramDeliveryConfig(process.env);
	if (!config) return null;
	try {
		return getKeyring(process.env) ? config : null;
	} catch {
		return null;
	}
}

async function assertProjectInTenant(tx: OrganizationTransaction, tenantId: string, projectId: string) {
	const [project] = await tx
		.select({ id: svProjects.id })
		.from(svProjects)
		.where(and(eq(svProjects.id, projectId), eq(svProjects.organizationId, tenantId)))
		.limit(1);
	if (!project) throw new Error("Not found: project is outside AuthContext tenant");
}

const ensureWebhook = createTelegramWebhookRegistrar({
	getInfo: (botToken) => getTelegramWebhookInfo({ botToken }),
	setWebhook: async ({ botToken, url, dropPendingUpdates }) =>
		setTelegramWebhook(
			{ botToken },
			{ url, secretToken: await telegramWebhookHeaderToken(botToken), dropPendingUpdates },
		),
});

export type TelegramDeliveryState = {
	available: boolean;
	canWrite: boolean;
	bound: { boundAt: string; locale: "ru" | "en" } | null;
};

export const getTelegramDeliveryFn = createServerFn({ method: "GET" })
	.validator(projectInput)
	.handler(async ({ data }): Promise<TelegramDeliveryState> => {
		const context = await resolveSessionAuthContext();
		const available = deliveryConfig() !== null;
		const bound = await withOrganizationTransaction(db, context.tenantId, async (tx) => {
			await assertProjectInTenant(tx, context.tenantId, data.projectId);
			const [recipient] = await tx
				.select({ boundAt: svDeliveryRecipients.boundAt, locale: svDeliveryRecipients.locale })
				.from(svDeliveryRecipients)
				.where(
					and(
						eq(svDeliveryRecipients.organizationId, context.tenantId),
						eq(svDeliveryRecipients.projectId, data.projectId),
						eq(svDeliveryRecipients.channel, "telegram"),
						eq(svDeliveryRecipients.status, "BOUND"),
					),
				)
				.orderBy(desc(svDeliveryRecipients.boundAt))
				.limit(1);
			return recipient ?? null;
		});
		return {
			available,
			canWrite: canWrite(context),
			bound: bound ? { boundAt: bound.boundAt.toISOString(), locale: bound.locale === "en" ? "en" : "ru" } : null,
		};
	});

export const createTelegramConnectLinkFn = createServerFn({ method: "POST" })
	.validator(projectInput.extend({ locale: z.enum(["ru", "en"]) }))
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		if (!canWrite(context)) throw new Error("Forbidden: connecting Telegram requires write access");
		const config = deliveryConfig();
		if (!config) throw new Error("Not found: Telegram delivery is not available");

		const token = mintDeliveryConnectToken();
		const expiresAt = new Date(Date.now() + DELIVERY_CONNECT_TOKEN_TTL_MS);
		await withOrganizationTransaction(db, context.tenantId, async (tx) => {
			await assertProjectInTenant(tx, context.tenantId, data.projectId);
			await tx.insert(svDeliveryConnectTokens).values({
				organizationId: context.tenantId,
				projectId: data.projectId,
				userId: context.actorId,
				tokenHash: hashDeliveryConnectToken(token),
				locale: data.locale,
				expiresAt,
			});
		});
		// After the insert, so a project outside the tenant never reaches Telegram.
		await ensureWebhook(config);
		return {
			url: telegramDeepLink(config.botUsername, token),
			// Opening the link in a chat that already exists does not always show
			// Start again, so the command it would send is offered as a fallback.
			startCommand: `/start ${token}`,
			expiresAt: expiresAt.toISOString(),
		};
	});

export const disconnectTelegramFn = createServerFn({ method: "POST" })
	.validator(projectInput)
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		if (!canWrite(context)) throw new Error("Forbidden: disconnecting Telegram requires write access");
		const unbound = await withOrganizationTransaction(db, context.tenantId, async (tx) => {
			await assertProjectInTenant(tx, context.tenantId, data.projectId);
			return tx
				.update(svDeliveryRecipients)
				.set({ status: "UNBOUND", unboundAt: new Date(), unboundReason: "USER_DISCONNECTED" })
				.where(
					and(
						eq(svDeliveryRecipients.organizationId, context.tenantId),
						eq(svDeliveryRecipients.projectId, data.projectId),
						eq(svDeliveryRecipients.channel, "telegram"),
						eq(svDeliveryRecipients.status, "BOUND"),
					),
				)
				.returning({ id: svDeliveryRecipients.id });
		});
		return { disconnected: unbound.length > 0 };
	});
