import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { LOCAL_MEASUREMENT_QUEUE } from "@workspace/lib/selena-local-execution";
import type { PgBoss } from "pg-boss";
import { registerLocalHandlers } from "./local-handlers";
import { startLocalWorker } from "./local-index";

type FakeBoss = {
	createdQueues: Array<{ name: string; options: Record<string, unknown> | undefined }>;
	workers: Array<{ name: string; options: Record<string, unknown> }>;
	startCalls: number;
	on: () => FakeBoss;
	start: () => Promise<FakeBoss>;
	createQueue: (name: string, options?: Record<string, unknown>) => Promise<void>;
	work: (name: string, options: Record<string, unknown>, handler: unknown) => Promise<string>;
};

function fakeBoss(): FakeBoss {
	const boss: FakeBoss = {
		createdQueues: [],
		workers: [],
		startCalls: 0,
		on: () => boss,
		start: async () => {
			boss.startCalls += 1;
			return boss;
		},
		createQueue: async (name, options) => {
			boss.createdQueues.push({ name, options });
		},
		work: async (name, options) => {
			boss.workers.push({ name, options });
			return `worker:${name}`;
		},
	};
	return boss;
}

test("Local bootstrap creates and consumes only its owner-gated queue", async () => {
	const boss = fakeBoss();
	await startLocalWorker(boss as unknown as PgBoss);

	assert.equal(boss.startCalls, 1);
	assert.deepEqual(boss.createdQueues, [
		{ name: LOCAL_MEASUREMENT_QUEUE, options: { retryLimit: 0, expireInSeconds: 900 } },
	]);
	assert.deepEqual(boss.workers, [{ name: LOCAL_MEASUREMENT_QUEUE, options: { localConcurrency: 1 } }]);
});

test("Local bootstrap has no legacy provider or handler imports", () => {
	const source = readFileSync(resolve(__dirname, "local-index.ts"), "utf8");
	const handlerSource = readFileSync(resolve(__dirname, "local-handlers.ts"), "utf8");
	for (const forbidden of ["@workspace/lib/providers", "@workspace/lib/secrets", "./handlers", "selena-measure"]) {
		assert.equal(source.includes(forbidden) || handlerSource.includes(forbidden), false, forbidden);
	}
	const legacyBootstrap = readFileSync(resolve(__dirname, "index.ts"), "utf8");
	const legacyHandlers = readFileSync(resolve(__dirname, "handlers.ts"), "utf8");
	assert.equal(legacyBootstrap.includes("LOCAL_MEASUREMENT_QUEUE"), false);
	assert.equal(legacyHandlers.includes("LOCAL_MEASUREMENT_QUEUE"), false);
});

test("Local handler registration is separate from the legacy registry", async () => {
	const boss = fakeBoss();
	await registerLocalHandlers(boss as unknown as PgBoss);
	assert.deepEqual(boss.workers, [{ name: LOCAL_MEASUREMENT_QUEUE, options: { localConcurrency: 1 } }]);
});
