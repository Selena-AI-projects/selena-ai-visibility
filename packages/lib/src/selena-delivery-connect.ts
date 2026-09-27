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
			// A double tap or a redelivered update lands here after the chat was
			// bound, so this must not read as a failure to someone already connected.
			return "Эта ссылка уже использована. Если вы только что подключились — всё готово, статус виден в кабинете Selena.\nThis link has already been used. If you just connected, you are all set: the status is in your Selena workspace.";
		case "EXPIRED":
			return "Срок действия ссылки истёк. Создайте новую в кабинете Selena.\nThis link has expired. Create a new one in your Selena workspace.";
		case "UNKNOWN":
			return "Ссылка не распознана. Создайте новую в кабинете Selena.\nThis link is not recognised. Create a new one in your Selena workspace.";
	}
}

/** The reply to a `/start` that arrived without a link's payload. */
export function deliveryConnectHint(): string {
	return "Чтобы подключить отчёт, откройте ссылку из кабинета Selena.\nTo connect your report, open the link from your Selena workspace.";
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
	// The same rule telegramDeepLink enforces, checked here so a bad name hides
	// the feature instead of failing every link after its token was stored.
	if (!/^[A-Za-z0-9_]{5,32}$/.test(botUsername)) return null;
	// Telegram only delivers webhooks over HTTPS.
	if (!/^https:\/\/[^/]/i.test(appUrl)) return null;
	return { botToken, botUsername, appUrl };
}

export const STAGING_SIMULATION_WEBHOOK_PATH = "/api/v1/selena/staging/telegram/webhook";

export type TelegramWebhookInfo = { ok: boolean; url: string | null; lastErrorMessage: string | null };

export type TelegramWebhookRegistrarDeps = {
	getInfo: (botToken: string) => Promise<TelegramWebhookInfo>;
	setWebhook: (input: { botToken: string; url: string; dropPendingUpdates: boolean }) => Promise<{ ok: boolean }>;
};

/**
 * Makes sure the bot delivers to this deployment's webhook before a link is
 * handed out, touching Telegram as little as possible: once per process and
 * bot token when the webhook is already in place.
 *
 * It never drops pending updates, because those can be other clients'
 * `/start` commands that Telegram is still retrying.
 */
export function createTelegramWebhookRegistrar(deps: TelegramWebhookRegistrarDeps) {
	let readyFor: string | null = null;
	return async function ensureTelegramWebhook(config: TelegramDeliveryConfig): Promise<void> {
		const url = telegramWebhookUrl(config.appUrl);
		const cacheKey = createHash("sha256").update(`${config.botToken}\n${url}`).digest("hex");
		if (readyFor === cacheKey) return;

		const info = await deps.getInfo(config.botToken);
		// Without knowing where the bot points, registering could take it away
		// from whatever it serves now.
		if (!info.ok) throw new Error("TELEGRAM_WEBHOOK_UNAVAILABLE");
		// The staging simulation registers its own secret; repointing a shared
		// bot would break that rig and flip back the next time it is set up.
		if (info.url?.endsWith(STAGING_SIMULATION_WEBHOOK_PATH)) throw new Error("TELEGRAM_BOT_USED_BY_SIMULATION");
		// A 401/403/404 from our own URL means Telegram presents a secret derived
		// from an older bot token; a 5xx is ours and needs no re-registration.
		const staleSecret = info.url === url && /\b40[134]\b/.test(info.lastErrorMessage ?? "");
		if (info.url !== url || staleSecret) {
			const set = await deps.setWebhook({ botToken: config.botToken, url, dropPendingUpdates: false });
			if (!set.ok) throw new Error("TELEGRAM_WEBHOOK_UNAVAILABLE");
		}
		readyFor = cacheKey;
	};
}
