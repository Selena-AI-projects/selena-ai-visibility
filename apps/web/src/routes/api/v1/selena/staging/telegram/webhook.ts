import { createFileRoute } from "@tanstack/react-router";
import { parseTelegramStartUpdate } from "@workspace/lib/selena-telegram-adapter";
import { constantTimeEquals } from "@workspace/selena-visibility-contracts";
import {
	assertSimulationEnvironment,
	redeemTelegramConnectToken,
} from "../../../../../../server/selena-staging-simulation";
import { simulationErrorResponse } from "../../../../../../server/selena-staging-simulation-http";

/**
 * Where Telegram delivers updates for the staging bot.
 *
 * Telegram cannot present a credential of ours, so the endpoint is protected
 * by the secret it echoes back in a header — the mechanism Telegram provides
 * for exactly this. Everything that decides what an update may do comes from
 * the signed token inside it, not from the request.
 *
 * The handler answers 200 to anything it will not act on. Telegram retries a
 * non-2xx update, and retrying an update we have already decided to ignore
 * would only produce the same decision more often.
 */
export const Route = createFileRoute("/api/v1/selena/staging/telegram/webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					assertSimulationEnvironment();
					const expected = process.env.SELENA_TELEGRAM_WEBHOOK_SECRET ?? "";
					const presented = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
					if (!expected || !constantTimeEquals(expected, presented)) return new Response("Not Found", { status: 404 });

					let update: unknown;
					try {
						update = await request.json();
					} catch {
						return Response.json({ ok: true, ignored: "unparsable" });
					}
					const start = parseTelegramStartUpdate(update);
					if (!start) return Response.json({ ok: true, ignored: "not-a-start-command" });

					const result = await redeemTelegramConnectToken({ token: start.token, chatId: start.chatId });
					// The outcome is reported without the chat id or the token, so the
					// response body stays safe to copy into an incident note.
					return Response.json({ ok: true, bound: result.bound, code: result.code ?? null });
				} catch (error) {
					return simulationErrorResponse(error);
				}
			},
		},
	},
});
