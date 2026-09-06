import {
	assertDigestIsShort,
	classifyTelegramResponse,
	type DeliveryOutcome,
} from "@workspace/selena-visibility-contracts";

/**
 * The only place this codebase talks to Telegram.
 *
 * It sends one short message to one chat and reports what happened in the
 * vocabulary the delivery rules understand. It holds no schedule, no retry
 * loop and no database handle: deciding whether to try again belongs to the
 * delivery policy, which is pure and testable, not to the transport.
 *
 * Architecture v1.4 §11.2 — Telegram never starts a measurement. Nothing in
 * this module can: it has no queue client and no measurement import, and the
 * only outbound request it can build is `sendMessage`.
 */

export type TelegramCredentials = {
	/** Read from the environment at the call site and never persisted or logged. */
	botToken: string;
};

export type TelegramSendRequest = {
	chatId: string;
	text: string;
};

export type TelegramSendResult = {
	outcome: DeliveryOutcome;
	httpStatus: number;
	/** Telegram's own message id, when it accepted the send. Safe to store. */
	messageId: number | null;
};

const TELEGRAM_API_ORIGIN = "https://api.telegram.org";

/**
 * Redacts a bot token wherever it might appear in an error string. Telegram
 * puts the token in the request path, so an unfiltered fetch error can carry
 * it into a log line; this is applied to every string that leaves the module.
 */
export function redactBotToken(value: string, botToken: string): string {
	if (!botToken) return value;
	return value.split(botToken).join("[redacted]");
}

function describeFailure(error: unknown, botToken: string): string {
	const raw = error instanceof Error ? error.message : String(error);
	return redactBotToken(raw, botToken).slice(0, 300);
}

/**
 * Posts one message. A transport error is a temporary failure rather than a
 * thrown exception, because the caller's job is to record an attempt either
 * way: an attempt that crashed the handler would leave no row behind.
 */
export async function sendTelegramMessage(
	credentials: TelegramCredentials,
	request: TelegramSendRequest,
	options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<TelegramSendResult> {
	if (!credentials.botToken) throw new Error("SELENA_TELEGRAM_BOT_TOKEN_MISSING");
	assertDigestIsShort(request.text);

	const fetchImpl = options.fetchImpl ?? globalThis.fetch;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
	try {
		const response = await fetchImpl(`${TELEGRAM_API_ORIGIN}/bot${credentials.botToken}/sendMessage`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				chat_id: request.chatId,
				text: request.text,
				disable_web_page_preview: true,
			}),
			signal: controller.signal,
		});
		let body: { ok?: boolean; description?: string; result?: { message_id?: number } } = {};
		try {
			body = (await response.json()) as typeof body;
		} catch {
			body = {};
		}
		return {
			outcome: classifyTelegramResponse({
				ok: body.ok === true,
				httpStatus: response.status,
				description: body.description,
			}),
			httpStatus: response.status,
			messageId: typeof body.result?.message_id === "number" ? body.result.message_id : null,
		};
	} catch (error) {
		return {
			outcome: { kind: "TEMPORARY_FAILURE", detail: describeFailure(error, credentials.botToken) },
			httpStatus: 0,
			messageId: null,
		};
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * The shape of the one Telegram update this product reads: a `/start` in a
 * private chat carrying a connect token. Anything else is ignored rather than
 * rejected, because a bot receives updates it did not ask for and an error
 * would only make Telegram redeliver them.
 */
export type TelegramStartUpdate = {
	chatId: string;
	token: string;
};

export function parseTelegramStartUpdate(update: unknown): TelegramStartUpdate | null {
	if (typeof update !== "object" || update === null) return null;
	const message = (update as { message?: unknown }).message;
	if (typeof message !== "object" || message === null) return null;
	const chat = (message as { chat?: unknown }).chat;
	const text = (message as { text?: unknown }).text;
	if (typeof chat !== "object" || chat === null || typeof text !== "string") return null;
	const chatId = (chat as { id?: unknown }).id;
	const chatType = (chat as { type?: unknown }).type;
	if (typeof chatId !== "number" && typeof chatId !== "string") return null;
	// A binding addresses one person's private chat. Accepting a group would
	// deliver a client's report to whoever else is in the room.
	if (chatType !== "private") return null;
	const match = /^\/start(?:@[A-Za-z0-9_]+)?\s+(\S+)$/.exec(text.trim());
	if (!match?.[1]) return null;
	return { chatId: String(chatId), token: match[1] };
}
