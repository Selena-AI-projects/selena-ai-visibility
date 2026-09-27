import {
	type DeliveryConnectOutcome,
	deliveryConnectHint,
	deliveryConnectReply,
	isDeliveryConnectToken,
	readTelegramDeliveryConfig,
} from "@workspace/lib/selena-delivery-connect";
import { parseTelegramBareStart, parseTelegramStartUpdate } from "@workspace/lib/selena-telegram-adapter";
import { constantTimeEquals, telegramWebhookHeaderToken } from "@workspace/selena-visibility-contracts";

export type TelegramWebhookDeps = {
	env: Record<string, string | undefined>;
	/** Encrypts the chat and redeems the token; never sees the workspace. */
	redeem: (input: { token: string; chatId: string }) => Promise<DeliveryConnectOutcome>;
	reply: (input: { botToken: string; chatId: string; text: string }) => Promise<void>;
};

/**
 * Where Telegram delivers updates for the weekly digest bot.
 *
 * Telegram cannot present a credential of ours, so the request is trusted only
 * when it echoes the secret registered with the webhook. That secret is
 * derived from the bot token: there is nothing extra to configure, and
 * rotating the token rotates it.
 *
 * Every update it will not act on is answered 200, because Telegram
 * redelivers anything else and the redelivery would meet the same decision.
 * The token and the chat id stay out of responses and logs.
 */
export async function handleTelegramWebhook(request: Request, deps: TelegramWebhookDeps): Promise<Response> {
	const config = readTelegramDeliveryConfig(deps.env);
	if (!config) return new Response("Not Found", { status: 404 });
	const presented = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
	if (!constantTimeEquals(await telegramWebhookHeaderToken(config.botToken), presented))
		return new Response("Not Found", { status: 404 });

	let update: unknown;
	try {
		update = await request.json();
	} catch {
		return Response.json({ ok: true, ignored: "unparsable" });
	}
	const start = parseTelegramStartUpdate(update);
	if (!start) {
		const bareChatId = parseTelegramBareStart(update);
		if (bareChatId) {
			try {
				await deps.reply({ botToken: config.botToken, chatId: bareChatId, text: deliveryConnectHint() });
			} catch {
				// A lost hint is not worth a redelivery.
			}
			return Response.json({ ok: true, ignored: "start-without-link" });
		}
		return Response.json({ ok: true, ignored: "not-a-start-command" });
	}

	let outcome: DeliveryConnectOutcome;
	if (isDeliveryConnectToken(start.token)) {
		try {
			outcome = await deps.redeem(start);
		} catch (error) {
			// Usually nothing was bound, and a redelivery gives a passing outage a
			// second chance. If the commit landed before the error surfaced, the
			// redelivery only meets ALREADY_USED, whose reply allows for that.
			console.error("selena telegram webhook: redemption failed", error instanceof Error ? error.name : "unknown");
			return Response.json({ ok: false }, { status: 503 });
		}
	} else {
		outcome = "UNKNOWN";
	}

	try {
		await deps.reply({ botToken: config.botToken, chatId: start.chatId, text: deliveryConnectReply(outcome) });
	} catch {
		// The binding already stands; a lost confirmation is not worth a redelivery.
	}
	return Response.json({ ok: true, outcome });
}
