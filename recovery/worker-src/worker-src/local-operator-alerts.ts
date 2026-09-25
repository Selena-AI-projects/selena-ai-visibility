import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { sendEmailWithReceipt } from "@workspace/cloud/email";
import type { PgBoss } from "pg-boss";

export const LOCAL_OPERATOR_ALERT_QUEUE = "selena-local-operator-alert";
export type LocalOperatorAlertCode =
	| "FIXTURE_QUERY_FAILED"
	| "FIXTURE_WORKER_PAUSED"
	| "RAW_RETENTION_OVERDUE"
	| "NOTIFICATION_TEST";
type Alert = { code: LocalOperatorAlertCode; occurredAt: string };
function operatorRecipient(env: NodeJS.ProcessEnv) {
	const email = env.SELENA_LOCAL_OPERATOR_EMAIL?.trim() ?? "";
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
const messages: Record<LocalOperatorAlertCode, string> = {
	NOTIFICATION_TEST:
		"This is a test of Local operator notifications. No current incident or new measurement is implied.",
	FIXTURE_QUERY_FAILED:
		"Test processing stopped. Completed points are preserved. Inspect the failed order before using its bounded resume action.",
	FIXTURE_WORKER_PAUSED:
		"The Local test worker paused after a database operation failed. Inspect connectivity and permissions before restarting the Local worker.",
	RAW_RETENTION_OVERDUE:
		"Private source responses exceeded their retention deadline. Inspect the Local retention worker and verify cleanup.",
};

export function localOperatorAlertContent(alert: Alert) {
	if (!Object.hasOwn(messages, alert.code) || !Number.isFinite(Date.parse(alert.occurredAt)))
		throw new Error("LOCAL_OPERATOR_ALERT_INVALID");
	const time = new Date(alert.occurredAt).toISOString();
	const url = "https://staging.selenasystems.com/selena/local/checkout";
	const subject = `[Selena staging] Local Visibility: ${alert.code}`;
	const text = `${subject}\nUTC: ${time}\n${messages[alert.code]}\n${url}\nThis is staging. Do not enable paid provider execution to resolve this alert.`;
	return {
		subject,
		text,
		html: `<p>${messages[alert.code]}</p><p>UTC: ${time}</p><p><a href="${url}">Open staging</a></p><p>Paid provider execution remains disabled.</p>`,
	};
}

export async function registerLocalOperatorAlerts(
	boss: PgBoss,
	env: NodeJS.ProcessEnv = process.env,
	send = sendEmailWithReceipt,
) {
	const recipient = operatorRecipient(env);
	if (env.RAILWAY_ENVIRONMENT_ID !== "90f3bf7f-5e53-4de3-a3f7-56052b706f24" || !recipient) return undefined;
	let queueReady = false;
	try {
		await boss.createQueue(LOCAL_OPERATOR_ALERT_QUEUE, { retryLimit: 2, retryDelay: 60, expireInSeconds: 120 });
		await boss.work<Alert>(LOCAL_OPERATOR_ALERT_QUEUE, async (jobs) => {
			for (const job of jobs) {
				try {
					const receipt = await send(recipient, localOperatorAlertContent(job.data), `local-alert-${job.id}`);
					console.log(JSON.stringify({ event: "LOCAL_OPERATOR_EMAIL_ACCEPTED", jobId: job.id, receipt }));
				} catch {
					throw new Error("LOCAL_OPERATOR_EMAIL_SEND_FAILED");
				}
			}
		});
		queueReady = true;
	} catch {
		console.error("LOCAL_OPERATOR_ALERT_QUEUE_UNAVAILABLE: using bounded direct email fallback");
	}
	const lastDirect = new Map<LocalOperatorAlertCode, number>();
	return async (code: LocalOperatorAlertCode) => {
		const id = randomUUID();
		const alert = { code, occurredAt: new Date().toISOString() };
		if (queueReady) {
			try {
				await boss.send(LOCAL_OPERATOR_ALERT_QUEUE, alert, { id, singletonKey: code, singletonSeconds: 60 });
				return;
			} catch {
				console.error("LOCAL_OPERATOR_ALERT_ENQUEUE_FAILED: using bounded direct email fallback");
			}
		}
		const now = Date.now();
		if (now - (lastDirect.get(code) ?? -Infinity) < 60_000) return;
		lastDirect.set(code, now);
		// Reuse the planned queue job ID even if the database committed before its connection failed.
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				const receipt = await send(recipient, localOperatorAlertContent(alert), `local-alert-${id}`);
				console.log(JSON.stringify({ event: "LOCAL_OPERATOR_EMAIL_ACCEPTED", jobId: id, receipt, fallback: true }));
				return;
			} catch {
				if (attempt === 2) throw new Error("LOCAL_OPERATOR_EMAIL_SEND_FAILED");
				await delay(1000 * (attempt + 1));
			}
		}
	};
}
