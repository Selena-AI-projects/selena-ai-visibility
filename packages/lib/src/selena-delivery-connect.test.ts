import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	deliveryConnectReply,
	hashDeliveryConnectToken,
	isDeliveryConnectToken,
	mintDeliveryConnectToken,
	readTelegramDeliveryConfig,
	redeemDeliveryConnectToken,
	telegramWebhookUrl,
} from "./selena-delivery-connect";

// Telegram's documented limit for a deep-link start payload.
const START_PAYLOAD = /^[A-Za-z0-9_-]{1,64}$/;

describe("connect token", () => {
	it("fits a Telegram deep-link start payload", () => {
		for (let index = 0; index < 50; index += 1) {
			const token = mintDeliveryConnectToken();
			expect(token).toMatch(START_PAYLOAD);
			expect(token).toHaveLength(43);
			expect(isDeliveryConnectToken(token)).toBe(true);
		}
	});

	it("is different every time", () => {
		const tokens = new Set(Array.from({ length: 100 }, mintDeliveryConnectToken));
		expect(tokens.size).toBe(100);
	});

	it("is stored as a sha256 hex digest the database accepts", () => {
		const token = mintDeliveryConnectToken();
		const hash = hashDeliveryConnectToken(token);
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
		expect(hash).toBe(hashDeliveryConnectToken(token));
		expect(hash).not.toContain(token);
	});

	it("rejects tokens this product never minted", () => {
		for (const foreign of [
			"",
			"short",
			`${mintDeliveryConnectToken()}x`,
			"v1.eyJ0ZW5hbnQiOiJ4In0.c2lnbmF0dXJl",
			`${"a".repeat(42)}=`,
			`${"a".repeat(42)}+`,
		])
			expect(isDeliveryConnectToken(foreign)).toBe(false);
	});
});

describe("redeeming a token", () => {
	function executor(outcome: unknown) {
		const statements: SQL[] = [];
		return {
			statements,
			execute: async (statement: SQL) => {
				statements.push(statement);
				return { rows: [{ outcome }] };
			},
		};
	}

	it("answers a foreign token as unknown without asking the database", async () => {
		const db = executor("BOUND");
		await expect(redeemDeliveryConnectToken(db, { token: "not-ours", chatIdCiphertext: "c" })).resolves.toBe("UNKNOWN");
		expect(db.statements).toHaveLength(0);
	});

	it.each(["BOUND", "UNKNOWN", "ALREADY_USED", "EXPIRED"])("passes the %s outcome through", async (outcome) => {
		const db = executor(outcome);
		await expect(
			redeemDeliveryConnectToken(db, { token: mintDeliveryConnectToken(), chatIdCiphertext: "c" }),
		).resolves.toBe(outcome);
		expect(db.statements).toHaveLength(1);
	});

	it("refuses an outcome the function never returns", async () => {
		await expect(
			redeemDeliveryConnectToken(executor("MAYBE"), { token: mintDeliveryConnectToken(), chatIdCiphertext: "c" }),
		).rejects.toThrow("DELIVERY_CONNECT_OUTCOME_UNEXPECTED");
	});
});

describe("bot reply", () => {
	it("tells the client what happened in both languages", () => {
		for (const outcome of ["BOUND", "UNKNOWN", "ALREADY_USED", "EXPIRED"] as const) {
			const reply = deliveryConnectReply(outcome);
			expect(reply).toMatch(/[А-Яа-я]/);
			expect(reply).toMatch(/[A-Za-z]{4}/);
		}
		expect(deliveryConnectReply("BOUND")).not.toBe(deliveryConnectReply("EXPIRED"));
	});
});

describe("delivery configuration", () => {
	const full = {
		SELENA_WEEKLY_DIGEST_ENABLED: "true",
		SELENA_TELEGRAM_BOT_TOKEN: "123:abc",
		SELENA_TELEGRAM_BOT_USERNAME: "@selena_bot",
		APP_URL: "https://app.example/",
	};

	it("is available only when switched on and fully configured", () => {
		expect(readTelegramDeliveryConfig(full)).toEqual({
			botToken: "123:abc",
			botUsername: "selena_bot",
			appUrl: "https://app.example/",
		});
		expect(readTelegramDeliveryConfig({ ...full, SELENA_WEEKLY_DIGEST_ENABLED: "1" })).toBeNull();
		expect(readTelegramDeliveryConfig({ ...full, SELENA_TELEGRAM_BOT_TOKEN: "" })).toBeNull();
		expect(readTelegramDeliveryConfig({ ...full, SELENA_TELEGRAM_BOT_USERNAME: undefined })).toBeNull();
		expect(readTelegramDeliveryConfig({ ...full, APP_URL: undefined })).toBeNull();
	});

	it("points the bot at the production webhook, not the staging one", () => {
		expect(telegramWebhookUrl("https://app.example/")).toBe("https://app.example/api/v1/selena/telegram/webhook");
	});
});
