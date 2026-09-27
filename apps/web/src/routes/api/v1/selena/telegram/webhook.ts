import { createFileRoute } from "@tanstack/react-router";
import { db } from "@workspace/lib/db/db";
import { encryptSecret, getKeyring } from "@workspace/lib/secrets";
import { DELIVERY_RECIPIENT_CHAT_AAD, redeemDeliveryConnectToken } from "@workspace/lib/selena-delivery-connect";
import { sendTelegramText } from "@workspace/lib/selena-telegram-adapter";
import { handleTelegramWebhook } from "../../../../../server/selena-telegram-webhook";

export const Route = createFileRoute("/api/v1/selena/telegram/webhook")({
	server: {
		handlers: {
			POST: ({ request }) =>
				handleTelegramWebhook(request, {
					env: process.env,
					redeem: async ({ token, chatId }) => {
						const keyring = getKeyring(process.env);
						if (!keyring) throw new Error("SELENA_DELIVERY_ENCRYPTION_KEY_MISSING");
						const chatIdCiphertext = await encryptSecret(chatId, {
							key: keyring.primary,
							aad: DELIVERY_RECIPIENT_CHAT_AAD,
						});
						// No tenant context on purpose: the definer function is the one
						// path that may find a link before its workspace is known.
						return redeemDeliveryConnectToken(db, { token, chatIdCiphertext });
					},
					reply: async ({ botToken, chatId, text }) => {
						await sendTelegramText({ botToken }, { chatId, text });
					},
				}),
		},
	},
});
