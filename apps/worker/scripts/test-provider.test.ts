import assert from "node:assert/strict";
import { test } from "node:test";
import type { Provider } from "@workspace/lib/providers";
import { authorizeProviderTestRun, runProviderTargetOnce } from "./test-provider";

const authorizedEnvironment = {
	SELENA_PROVIDER_TEST_SPEND_AUTHORIZED: "true",
	SELENA_MEASUREMENT_ENABLED: "true",
	SELENA_EMERGENCY_STOP: "false",
};

test("provider test requires an explicit one-target spend authorization", () => {
	for (const environment of [
		{},
		{ ...authorizedEnvironment, SELENA_PROVIDER_TEST_SPEND_AUTHORIZED: "false" },
		{ ...authorizedEnvironment, SELENA_MEASUREMENT_ENABLED: "false" },
		{ ...authorizedEnvironment, SELENA_EMERGENCY_STOP: "true" },
		{ ...authorizedEnvironment, SELENA_EMERGENCY_STOP: undefined },
	]) {
		assert.throws(
			() => authorizeProviderTestRun(["--target", "chatgpt:stub"], environment),
			/PROVIDER_TEST_(SPEND_AUTHORIZATION_REQUIRED|MEASUREMENT_GATE_REQUIRED|EMERGENCY_STOP_MUST_BE_FALSE)/,
		);
	}
});

test("provider test has no implicit target set and rejects fanout", () => {
	assert.throws(() => authorizeProviderTestRun([], authorizedEnvironment), /PROVIDER_TEST_EXACTLY_ONE_TARGET_REQUIRED/);
	assert.throws(
		() => authorizeProviderTestRun(["--target", "chatgpt:stub,gemini:stub"], authorizedEnvironment),
		/PROVIDER_TEST_EXACTLY_ONE_TARGET_REQUIRED/,
	);
	assert.equal(authorizeProviderTestRun(["--target", "chatgpt:stub"], authorizedEnvironment).target, "chatgpt:stub");
});

test("provider test performs exactly one provider attempt", async () => {
	let calls = 0;
	const provider: Pick<Provider, "run"> = {
		async run() {
			calls += 1;
			return {
				textContent: "A deterministic provider response long enough for the validation boundary.",
				rawOutput: {},
				webQueries: [],
				citations: [],
				modelVersion: "test",
			};
		},
	};

	await assert.rejects(
		runProviderTargetOnce("chatgpt:stub", undefined, () => provider, {}),
		/PROVIDER_TEST_SPEND_AUTHORIZATION_REQUIRED/,
	);
	assert.equal(calls, 0);

	const { result } = await runProviderTargetOnce("chatgpt:stub", undefined, () => provider, authorizedEnvironment);
	assert.equal(calls, 1);
	assert.equal(result.retries, 0);
});
