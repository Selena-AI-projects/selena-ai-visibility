import assert from "node:assert/strict";
import { test } from "node:test";
import { LOCAL_MEASUREMENT_QUEUE } from "@workspace/lib/selena-local-execution";
import type { PgBoss } from "pg-boss";
import type { SelenaLocalMeasureData } from "./jobs/selena-local-measure";
import { dispatchLocalOutboxOnce, type LocalOutboxClaim } from "./local-dispatch-outbox";
import { localOperatorAlertContent, registerLocalOperatorAlerts } from "./local-operator-alerts";
import { startLocalRawRetentionScheduler } from "./local-raw-retention-scheduler";

const open = {
	SELENA_LOCAL_VISIBILITY_ENABLED: "true",
	SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED: "true",
	SELENA_LOCAL_EMERGENCY_STOP: "false",
};

function claim(attemptId: string): LocalOutboxClaim {
	const data: SelenaLocalMeasureData = {
		organizationId: "org-a",
		measurementCycleId: "cycle-m",
		localCycleId: "cycle-l",
		observationId: `observation-${attemptId}`,
		attemptId,
	};
	return { id: `outbox-${attemptId}`, claimToken: "token", data };
}

function outbox(claims: LocalOutboxClaim[], dispatchable: (claim: LocalOutboxClaim) => boolean = () => true) {
	const enqueued: string[] = [];
	const sent: Array<{ name: string; singletonKey: string; retryLimit: number }> = [];
	let claimCalls = 0;
	return {
		enqueued,
		sent,
		claimCalls: () => claimCalls,
		store: {
			claim: async () => {
				claimCalls += 1;
				return claims;
			},
			canDispatch: async (item: LocalOutboxClaim) => dispatchable(item),
			markEnqueued: async (item: LocalOutboxClaim) => {
				enqueued.push(item.data.attemptId);
			},
		},
		queue: {
			send: async (
				name: string,
				_data: SelenaLocalMeasureData,
				options: { singletonKey: string; retryLimit: number },
			) => {
				sent.push({ name, ...options });
				return "job";
			},
		},
	};
}

test("the outbox claims nothing while provider execution is closed", async () => {
	for (const env of [{}, { ...open, SELENA_LOCAL_EMERGENCY_STOP: "true" }]) {
		const fake = outbox([claim("a1")]);
		assert.deepEqual(await dispatchLocalOutboxOnce({ ...fake, env: () => env }), { claimed: 0, enqueued: 0 });
		assert.equal(fake.claimCalls(), 0);
		assert.deepEqual(fake.sent, []);
	}
});

test("the outbox queues each attempt once and never retries it through the queue", async () => {
	const fake = outbox([claim("a1"), claim("a2")], (item) => item.data.attemptId !== "a2");
	assert.deepEqual(await dispatchLocalOutboxOnce({ ...fake, env: () => open }), { claimed: 2, enqueued: 1 });
	assert.deepEqual(fake.sent, [
		{ name: LOCAL_MEASUREMENT_QUEUE, singletonKey: "local-maps-attempt:a1", retryLimit: 0 },
	]);
	assert.deepEqual(fake.enqueued, ["a1"]);
});

test("the outbox stops mid-batch when the emergency stop closes", async () => {
	let env: Record<string, string> = open;
	const fake = outbox([claim("a1"), claim("a2")]);
	fake.store.markEnqueued = async (item) => {
		fake.enqueued.push(item.data.attemptId);
		env = { ...open, SELENA_LOCAL_EMERGENCY_STOP: "true" };
	};
	await dispatchLocalOutboxOnce({ ...fake, env: () => env });
	assert.deepEqual(fake.enqueued, ["a1"]);
});

function bossRecorder() {
	const queues: string[] = [];
	const boss = {
		createQueue: async (name: string) => {
			queues.push(name);
		},
		work: async () => "worker",
		send: async () => "job",
	};
	return { queues, boss };
}

test("operator alerts stay off unless explicitly enabled with a recipient and app URL", async () => {
	const base = { SELENA_LOCAL_OPERATOR_EMAIL: "ops@example.invalid", APP_URL: "https://app.example.invalid" };
	for (const env of [
		base,
		{ ...base, SELENA_LOCAL_OPERATOR_ALERTS_ENABLED: "1" },
		{ ...base, SELENA_LOCAL_OPERATOR_ALERTS_ENABLED: "true", SELENA_LOCAL_OPERATOR_EMAIL: "not-an-address" },
		{ ...base, SELENA_LOCAL_OPERATOR_ALERTS_ENABLED: "true", APP_URL: "" },
	]) {
		const { queues, boss } = bossRecorder();
		assert.equal(await registerLocalOperatorAlerts(boss as unknown as PgBoss, env), undefined);
		assert.deepEqual(queues, []);
	}
});

test("an operator alert links only to the app origin and refuses unknown codes", () => {
	const content = localOperatorAlertContent(
		{ code: "RAW_RETENTION_OVERDUE", occurredAt: "2026-09-26T00:00:00.000Z" },
		"https://app.example.invalid/some/path?token=secret",
	);
	assert.match(content.text, /https:\/\/app\.example\.invalid\n/);
	assert.doesNotMatch(content.text + content.html, /token=secret/);
	assert.throws(
		() =>
			localOperatorAlertContent(
				{ code: "FIXTURE_QUERY_FAILED" as never, occurredAt: "2026-09-26T00:00:00.000Z" },
				"https://app.example.invalid",
			),
		/LOCAL_OPERATOR_ALERT_INVALID/,
	);
});

test("the retention sweep does not start without owner approval", async () => {
	const { queues, boss } = bossRecorder();
	const stop = await startLocalRawRetentionScheduler({ boss, env: {}, handler: async () => {}, onError: () => {} });
	assert.equal(stop, undefined);
	assert.deepEqual(queues, []);
});

test("the retention sweep refuses a job for another organization", async () => {
	let worker: ((jobs: { data: { organizationId: string } }[]) => Promise<void>) | undefined;
	let handled = 0;
	const { boss } = bossRecorder();
	const stop = await startLocalRawRetentionScheduler({
		boss: {
			...boss,
			work: (async (_name: string, _options: unknown, fn: typeof worker) => {
				worker = fn;
				return "worker";
			}) as never,
		},
		env: { SELENA_LOCAL_RAW_RETENTION_OWNER_APPROVED: "true", SELENA_LOCAL_RAW_RETENTION_ORGANIZATION_ID: "org-a" },
		handler: async () => {
			handled += 1;
		},
		onError: () => {},
	});
	try {
		await assert.rejects(worker?.([{ data: { organizationId: "org-b" } }]) ?? Promise.resolve(), /TENANT_MISMATCH/);
		assert.equal(handled, 0);
		await worker?.([{ data: { organizationId: "org-a" } }]);
		assert.equal(handled, 1);
	} finally {
		await stop?.();
	}
});
