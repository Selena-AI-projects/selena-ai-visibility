import type { PgBoss } from "pg-boss";
import type { SelenaLocalRawRetentionData } from "./jobs/selena-local-raw-retention";

export const LOCAL_RAW_RETENTION_QUEUE = "selena-local-raw-retention";
export const LOCAL_RAW_RETENTION_INTERVAL_MS = 60_000;

/** Durable delivery, with a startup sweep to recover deadlines missed during downtime. */
export async function startLocalRawRetentionScheduler(input: {
	boss: Pick<PgBoss, "createQueue" | "send" | "work">;
	env: Record<string, string | undefined>;
	handler: (jobs: { data: SelenaLocalRawRetentionData }[]) => Promise<void>;
	onError: (error: unknown) => void;
}): Promise<(() => Promise<void>) | undefined> {
	if (input.env.SELENA_LOCAL_RAW_RETENTION_OWNER_APPROVED !== "true") return;
	const organizationId = input.env.SELENA_LOCAL_RAW_RETENTION_ORGANIZATION_ID?.trim();
	if (!organizationId) throw new Error("LOCAL_RAW_RETENTION_ORGANIZATION_REQUIRED");
	await input.boss.createQueue(LOCAL_RAW_RETENTION_QUEUE, {
		retryLimit: 30,
		retryDelay: 60,
		expireInSeconds: 300,
	});
	await input.boss.work<SelenaLocalRawRetentionData>(
		LOCAL_RAW_RETENTION_QUEUE,
		{ localConcurrency: 1 },
		async (jobs) => {
			for (const job of jobs) {
				if (job.data.organizationId !== organizationId) throw new Error("LOCAL_RAW_RETENTION_TENANT_MISMATCH");
			}
			await input.handler(jobs);
		},
	);
	const send = async () => {
		await input.boss.send(
			LOCAL_RAW_RETENTION_QUEUE,
			{ organizationId },
			{
				singletonKey: organizationId,
				singletonSeconds: 60,
			},
		);
	};
	await send();
	let pending: Promise<void> | undefined;
	const timer = setInterval(() => {
		if (!pending)
			pending = send()
				.catch(input.onError)
				.finally(() => {
					pending = undefined;
				});
	}, LOCAL_RAW_RETENTION_INTERVAL_MS);
	timer.unref();
	return async () => {
		clearInterval(timer);
		await pending;
	};
}
