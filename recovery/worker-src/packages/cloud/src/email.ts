/**
 * The only module that talks to Resend.
 *
 * The client is constructed lazily so importing this module (e.g. from the
 * mode smoke test, which builds cloud auth options with dummy env) never
 * requires a real API key.
 */
import { Resend } from "resend";
import type { EmailContent } from "./email-templates";

let client: Resend | null = null;

function getResendClient(): Resend {
	if (!client) client = new Resend(process.env.RESEND_API_KEY);
	return client;
}

export async function sendEmail(to: string, content: EmailContent): Promise<void> {
	await sendEmailWithReceipt(to, content);
}

export async function sendEmailWithReceipt(
	to: string,
	content: EmailContent,
	idempotencyKey?: string,
): Promise<string> {
	const from = process.env.RESEND_FROM_EMAIL;
	if (!from) throw new Error("RESEND_FROM_EMAIL is not set");
	const { data, error } = await getResendClient().emails.send({ from, to, ...content }, { idempotencyKey });
	if (error) throw new Error(`Resend send failed: ${error.message}`);
	if (!data?.id) throw new Error("Resend send returned no receipt");
	return data.id;
}

/** Return delivery state only, without recipient, body or transport credentials. */
export async function readEmailDeliveryStatus(id: string): Promise<string> {
	const { data, error } = await getResendClient().emails.get(id);
	if (error || !data) throw new Error("EMAIL_DELIVERY_STATUS_UNAVAILABLE");
	return data.last_event;
}
