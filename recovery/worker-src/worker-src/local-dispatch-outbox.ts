import { randomUUID } from "node:crypto";
import { isLocalProviderExecutionEnabled, LOCAL_MEASUREMENT_QUEUE } from "@workspace/lib/selena-local-execution";
import type { SelenaLocalMeasureData } from "./jobs/selena-local-measure";

export type LocalOutboxClaim = { id: string; claimToken: string; data: SelenaLocalMeasureData };
export type LocalOutboxPort = {
	claim(input: { token: string; limit: number }): Promise<LocalOutboxClaim[]>;
	canDispatch(claim: LocalOutboxClaim): Promise<boolean>;
	markEnqueued(claim: LocalOutboxClaim): Promise<void>;
};
export type LocalQueuePort = {
	send(
		name: string,
		data: SelenaLocalMeasureData,
		options: { singletonKey: string; retryLimit: number },
	): Promise<string | null>;
};

/** A failed/ambiguous send leaves the lease to expire. It never creates another attempt. */
export async function dispatchLocalOutboxOnce(input: {
	store: LocalOutboxPort;
	queue: LocalQueuePort;
	env: () => Record<string, string | undefined>;
}): Promise<{ claimed: number; enqueued: number }> {
	if (!isLocalProviderExecutionEnabled(input.env())) return { claimed: 0, enqueued: 0 };
	const claims = await input.store.claim({ token: randomUUID(), limit: 9 });
	let enqueued = 0;
	for (const claim of claims) {
		if (!isLocalProviderExecutionEnabled(input.env()) || !(await input.store.canDispatch(claim))) continue;
		await input.queue.send(LOCAL_MEASUREMENT_QUEUE, claim.data, {
			singletonKey: `local-maps-attempt:${claim.data.attemptId}`,
			retryLimit: 0,
		});
		// pg-boss returns null when this singleton already exists.
		await input.store.markEnqueued(claim);
		enqueued += 1;
	}
	return { claimed: claims.length, enqueued };
}

export function startLocalOutboxDispatcher(
	input: Parameters<typeof dispatchLocalOutboxOnce>[0] & {
		onError: (error: unknown) => void;
		intervalMs?: number;
	},
): () => Promise<void> {
	let stopped = false;
	let running: Promise<void> | undefined;
	const intervalMs = input.intervalMs ?? 5000;
	if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 60_000)
		throw new Error("LOCAL_OUTBOX_DISPATCH_INTERVAL_INVALID");
	const timer = setInterval(() => {
		if (stopped || running) return;
		running = dispatchLocalOutboxOnce(input)
			.then(() => undefined)
			.catch(input.onError)
			.finally(() => {
				running = undefined;
			});
	}, intervalMs);
	return async () => {
		stopped = true;
		clearInterval(timer);
		await running;
	};
}
