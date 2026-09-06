import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTelegramStartUpdate, redactBotToken, sendTelegramMessage } from "./selena-telegram-adapter";

const BOT_TOKEN = "1234567890:AAtest-token-value-never-real";
const DIGEST = "[TEST] Selena weekly digest — sample data, not a measurement";

function response(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("sending a digest", () => {
	it("posts one message to the chat and reports success", async () => {
		const calls: { url: string; body: unknown }[] = [];
		const result = await sendTelegramMessage(
			{ botToken: BOT_TOKEN },
			{ chatId: "555", text: DIGEST },
			{
				fetchImpl: (async (url: string, init: RequestInit) => {
					calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
					return response({ ok: true, result: { message_id: 42 } }, 200);
				}) as unknown as typeof fetch,
			},
		);
		expect(result.outcome).toEqual({ kind: "SUCCESS" });
		expect(result.messageId).toBe(42);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`);
		expect(calls[0]?.body).toMatchObject({ chat_id: "555", text: DIGEST });
	});

	it("reads a blocked or missing chat as a recipient that is gone", async () => {
		for (const [status, description] of [
			[403, "Forbidden: bot was blocked by the user"],
			[400, "Bad Request: chat not found"],
		] as const) {
			const result = await sendTelegramMessage(
				{ botToken: BOT_TOKEN },
				{ chatId: "555", text: DIGEST },
				{ fetchImpl: (async () => response({ ok: false, description }, status)) as unknown as typeof fetch },
			);
			expect(result.outcome.kind).toBe("RECIPIENT_GONE");
		}
	});

	it("reads a server error as temporary", async () => {
		const result = await sendTelegramMessage(
			{ botToken: BOT_TOKEN },
			{ chatId: "555", text: DIGEST },
			{ fetchImpl: (async () => response({ ok: false, description: "Bad Gateway" }, 502)) as unknown as typeof fetch },
		);
		expect(result.outcome.kind).toBe("TEMPORARY_FAILURE");
	});

	it("turns a transport failure into a temporary outcome instead of throwing", async () => {
		// A thrown error would skip the caller's attempt bookkeeping, and an
		// attempt nobody recorded is the one gap the evidence cannot tolerate.
		const result = await sendTelegramMessage(
			{ botToken: BOT_TOKEN },
			{ chatId: "555", text: DIGEST },
			{
				fetchImpl: (async () => {
					throw new Error("connect ECONNREFUSED");
				}) as unknown as typeof fetch,
			},
		);
		expect(result.outcome.kind).toBe("TEMPORARY_FAILURE");
		expect(result.httpStatus).toBe(0);
	});

	it("never lets the bot token reach the reported detail", async () => {
		const result = await sendTelegramMessage(
			{ botToken: BOT_TOKEN },
			{ chatId: "555", text: DIGEST },
			{
				fetchImpl: (async () => {
					throw new Error(`request to https://api.telegram.org/bot${BOT_TOKEN}/sendMessage failed`);
				}) as unknown as typeof fetch,
			},
		);
		expect(result.outcome.kind).toBe("TEMPORARY_FAILURE");
		if (result.outcome.kind === "SUCCESS") throw new Error("unreachable");
		expect(result.outcome.detail).not.toContain(BOT_TOKEN);
		expect(result.outcome.detail).toContain("[redacted]");
	});

	it("refuses to send without a credential, and refuses an unmarked message", async () => {
		await expect(sendTelegramMessage({ botToken: "" }, { chatId: "1", text: DIGEST })).rejects.toThrow(
			"SELENA_TELEGRAM_BOT_TOKEN_MISSING",
		);
		await expect(
			sendTelegramMessage({ botToken: BOT_TOKEN }, { chatId: "1", text: "a plain message" }),
		).rejects.toThrow("SELENA_DIGEST_TEST_MARKER_MISSING");
	});

	it("redacts a token anywhere it appears", () => {
		expect(redactBotToken(`a ${BOT_TOKEN} b ${BOT_TOKEN}`, BOT_TOKEN)).toBe("a [redacted] b [redacted]");
	});
});

describe("reading a start command", () => {
	function update(overrides: Record<string, unknown> = {}) {
		return { message: { chat: { id: 555, type: "private" }, text: "/start abc.def.ghi", ...overrides } };
	}

	it("reads the token out of a private start command", () => {
		expect(parseTelegramStartUpdate(update())).toEqual({ chatId: "555", token: "abc.def.ghi" });
	});

	it("accepts the form Telegram uses when the bot is addressed by name", () => {
		expect(parseTelegramStartUpdate(update({ text: "/start@selena_staging_bot abc.def.ghi" }))).toEqual({
			chatId: "555",
			token: "abc.def.ghi",
		});
	});

	it("ignores a group chat", () => {
		// A binding addresses one person. Accepting a group would deliver a
		// client's digest to everyone else in the room.
		expect(parseTelegramStartUpdate({ message: { chat: { id: -100, type: "group" }, text: "/start abc" } })).toBeNull();
	});

	it("ignores anything that is not a start command carrying a token", () => {
		for (const value of [null, {}, { message: {} }, update({ text: "/start" }), update({ text: "hello" })])
			expect(parseTelegramStartUpdate(value)).toBeNull();
	});
});

describe("zero provider surface invariant", () => {
	it("cannot reach a measurement provider or a queue", () => {
		// The same structural guard the dispatch and manual-pilot modules use: a
		// module that must not spend proves it by what it is unable to import.
		const source = readFileSync(join(import.meta.dirname, "selena-telegram-adapter.ts"), "utf8");
		for (const forbidden of [
			"boss",
			"job-scheduler",
			"openrouter",
			"brightdata",
			"dataforseo",
			"selena-run-executor",
			"selena-measurement",
			"cost-events",
		])
			expect(source.toLowerCase()).not.toContain(forbidden);
	});

	it("can only build a sendMessage request", () => {
		const source = readFileSync(join(import.meta.dirname, "selena-telegram-adapter.ts"), "utf8");
		const urls = source.match(/https?:\/\/[^\s"'`]+/g) ?? [];
		expect(urls).toEqual(["https://api.telegram.org"]);
		expect(source).toContain("/sendMessage");
	});
});
