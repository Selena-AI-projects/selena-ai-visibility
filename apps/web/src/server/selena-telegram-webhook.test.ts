import { mintDeliveryConnectToken } from "@workspace/lib/selena-delivery-connect";
import { telegramWebhookHeaderToken } from "@workspace/selena-visibility-contracts";
import { describe, expect, it, vi } from "vitest";
import { handleTelegramWebhook, type TelegramWebhookDeps } from "./selena-telegram-webhook";

const BOT_TOKEN = "1234567890:AAtest-token-value-never-real";
const ENV = {
	SELENA_WEEKLY_DIGEST_ENABLED: "true",
	SELENA_TELEGRAM_BOT_TOKEN: BOT_TOKEN,
	SELENA_TELEGRAM_BOT_USERNAME: "selena_test_bot",
	APP_URL: "https://app.example",
};

function deps(overrides: Partial<TelegramWebhookDeps> = {}) {
	const redeem = vi.fn<TelegramWebhookDeps["redeem"]>(async () => "BOUND");
	const reply = vi.fn<TelegramWebhookDeps["reply"]>(async () => undefined);
	return { env: ENV, redeem, reply, ...overrides };
}

async function request(body: unknown, secret?: string): Promise<Request> {
	return new Request("https://app.example/api/v1/selena/telegram/webhook", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-telegram-bot-api-secret-token": secret ?? (await telegramWebhookHeaderToken(BOT_TOKEN)),
		},
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

function start(text: string, chatType = "private") {
	return { update_id: 1, message: { message_id: 1, chat: { id: 987654321, type: chatType }, text } };
}

describe("Telegram webhook", () => {
	it("does not exist while the weekly digest is switched off", async () => {
		const d = deps({ env: { ...ENV, SELENA_WEEKLY_DIGEST_ENABLED: "false" } });
		const response = await handleTelegramWebhook(await request(start(`/start ${mintDeliveryConnectToken()}`)), d);
		expect(response.status).toBe(404);
		expect(d.redeem).not.toHaveBeenCalled();
	});

	it("does not exist without a bot token", async () => {
		const d = deps({ env: { ...ENV, SELENA_TELEGRAM_BOT_TOKEN: "" } });
		const response = await handleTelegramWebhook(await request(start(`/start ${mintDeliveryConnectToken()}`)), d);
		expect(response.status).toBe(404);
	});

	it("refuses an update that does not carry the secret derived from the bot token", async () => {
		const d = deps();
		for (const secret of ["", "guess", await telegramWebhookHeaderToken("another-bot-token")]) {
			const response = await handleTelegramWebhook(
				await request(start(`/start ${mintDeliveryConnectToken()}`), secret),
				d,
			);
			expect(response.status).toBe(404);
		}
		expect(d.redeem).not.toHaveBeenCalled();
		expect(d.reply).not.toHaveBeenCalled();
	});

	it("acknowledges updates it will not act on so Telegram does not redeliver them", async () => {
		const d = deps();
		for (const body of ["{not json", start("hello"), start(`/start ${mintDeliveryConnectToken()}`, "group"), {}]) {
			const response = await handleTelegramWebhook(await request(body), d);
			expect(response.status).toBe(200);
		}
		expect(d.redeem).not.toHaveBeenCalled();
		expect(d.reply).not.toHaveBeenCalled();
	});

	it("answers a token it never minted as unknown without touching the database", async () => {
		const d = deps();
		const response = await handleTelegramWebhook(await request(start("/start v1.payload.signature")), d);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ outcome: "UNKNOWN" });
		expect(d.redeem).not.toHaveBeenCalled();
		expect(d.reply).toHaveBeenCalledOnce();
	});

	it("binds the chat and confirms it without echoing the token or the chat id", async () => {
		const d = deps();
		const token = mintDeliveryConnectToken();
		const response = await handleTelegramWebhook(await request(start(`/start ${token}`)), d);
		expect(response.status).toBe(200);
		const body = JSON.stringify(await response.json());
		expect(d.redeem).toHaveBeenCalledWith({ token, chatId: "987654321" });
		const sent = d.reply.mock.calls[0]?.[0];
		expect(sent?.chatId).toBe("987654321");
		for (const text of [body, sent?.text ?? ""]) {
			expect(text).not.toContain(token);
			expect(text).not.toContain("987654321");
		}
	});

	it.each(["ALREADY_USED", "EXPIRED", "UNKNOWN"] as const)("tells the client when the link is %s", async (outcome) => {
		const d = deps({ redeem: vi.fn(async () => outcome) });
		const response = await handleTelegramWebhook(await request(start(`/start ${mintDeliveryConnectToken()}`)), d);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ outcome });
		expect(d.reply).toHaveBeenCalledOnce();
	});

	it("lets Telegram retry when the binding could not be attempted", async () => {
		const d = deps({
			redeem: vi.fn(async () => {
				throw new Error("connection refused");
			}),
		});
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const response = await handleTelegramWebhook(await request(start(`/start ${mintDeliveryConnectToken()}`)), d);
		expect(response.status).toBe(503);
		expect(d.reply).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it("keeps the binding when the confirmation cannot be sent", async () => {
		const d = deps({
			reply: vi.fn(async () => {
				throw new Error("telegram down");
			}),
		});
		const response = await handleTelegramWebhook(await request(start(`/start ${mintDeliveryConnectToken()}`)), d);
		expect(response.status).toBe(200);
	});
});
