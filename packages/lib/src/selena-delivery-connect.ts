import { createHash, randomBytes } from "node:crypto";
import { type SQL, sql } from "drizzle-orm";

/**
 * Connecting a Telegram chat to a project's weekly digest.
 *
 * The workspace mints a one-time link; the client opens it in Telegram, which
 * sends `/start <token>` to the bot; the webhook hands the token and the chat
 * to `sv_redeem_delivery_connect_token`. Only the token's hash is stored, so a
 * database read cannot be turned back into a working link.
 */

export const DELIVERY_CONNECT_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * Additional data bound into every stored chat id. The weekly digest worker
 * decrypts with the same value; a staging simulation ciphertext cannot be
 * passed off as a production recipient because its AAD differs.
 */
export const DELIVERY_RECIPIENT_CHAT_AAD = "selena-delivery-recipient-chat";

export const TELEGRAM_WEBHOOK_PATH = "/api/v1/selena/telegram/webhook";

export type DeliveryLocale = "ru" | "en";

// 32 random bytes in base64url without padding. Telegram accepts at most 64
// characters of [A-Za-z0-9_-] as a deep-link start payload, which rules out
// anything signed or dotted.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function mintDeliveryConnectToken(): string {
	return randomBytes(32).toString("base64url");
}

export function hashDeliveryConnectToken(token: string): string {
	return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isDeliveryConnectToken(value: string): boolean {
	return TOKEN_PATTERN.test(value);
}

export function telegramWebhookUrl(appUrl: string): string {
	return `${appUrl.replace(/\/+$/, "")}${TELEGRAM_WEBHOOK_PATH}`;
}

export const DELIVERY_CONNECT_OUTCOMES = ["BOUND", "UNKNOWN", "ALREADY_USED", "EXPIRED"] as const;
export type DeliveryConnectOutcome = (typeof DELIVERY_CONNECT_OUTCOMES)[number];

export function parseDeliveryConnectOutcome(value: unknown): DeliveryConnectOutcome {
	if (typeof value === "string" && (DELIVERY_CONNECT_OUTCOMES as readonly string[]).includes(value))
		return value as DeliveryConnectOutcome;
	throw new Error("DELIVERY_CONNECT_OUTCOME_UNEXPECTED");
}

export type SqlExecutor = {
	execute(statement: SQL): Promise<{ rows?: unknown[] }>;
};

/**
 * Redeems a token presented in a Telegram `/start`. A token of any other
 * shape was never minted here, so it is answered without a database round
 * trip.
 */
export async function redeemDeliveryConnectToken(
	executor: SqlExecutor,
	input: { token: string; chatIdCiphertext: string },
): Promise<DeliveryConnectOutcome> {
	if (!isDeliveryConnectToken(input.token)) return "UNKNOWN";
	const result = await executor.execute(
		sql`SELECT public.sv_redeem_delivery_connect_token(
			${hashDeliveryConnectToken(input.token)}::text,
			${input.chatIdCiphertext}::text
		) AS outcome`,
	);
	return parseDeliveryConnectOutcome((result.rows?.[0] as { outcome?: unknown } | undefined)?.outcome);
}

/**
 * The one message the bot sends back. The chat's language is unknown until a
 * link is redeemed, so every reply carries both.
 */
export function deliveryConnectReply(outcome: DeliveryConnectOutcome): string {
	switch (outcome) {
		case "BOUND":
			return "Готово: сюда будет приходить еженедельный отчёт Selena.\nDone: your weekly Selena report will arrive here.";
		case "ALREADY_USED":
			return "Эта ссылка уже использована. Создайте новую в кабинете Selena.\nThis link has already been used. Create a new one in your Selena workspace.";
		case "EXPIRED":
			return "Срок действия ссылки истёк. Создайте новую в кабинете Selena.\nThis link has expired. Create a new one in your Selena workspace.";
		case "UNKNOWN":
			return "Ссылка не распознана. Создайте новую в кабинете Selena.\nThis link is not recognised. Create a new one in your Selena workspace.";
	}
}

export type TelegramDeliveryConfig = {
	botToken: string;
	botUsername: string;
	appUrl: string;
};

/**
 * Null unless the weekly digest is switched on and the bot is fully
 * configured. Anything less leaves a client holding a link no one answers.
 */
export function readTelegramDeliveryConfig(env: Record<string, string | undefined>): TelegramDeliveryConfig | null {
	if (env.SELENA_WEEKLY_DIGEST_ENABLED !== "true") return null;
	const botToken = env.SELENA_TELEGRAM_BOT_TOKEN?.trim();
	const botUsername = env.SELENA_TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
	const appUrl = env.APP_URL?.trim();
	if (!botToken || !botUsername || !appUrl) return null;
	return { botToken, botUsername, appUrl };
}
