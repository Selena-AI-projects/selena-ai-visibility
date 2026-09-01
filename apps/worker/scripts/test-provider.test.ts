import assert from "node:assert/strict";
import { test } from "node:test";
import type { Provider } from "@workspace/lib/providers";
import { authorizeProviderTestRun, runProviderTargetOnce } from "./test-provider";

const authorizedEnvironment = {
	SELENA_MEASUREMENT_ENABLED: "true",
	SELENA_EMERGENCY_STOP: "false",
};

test("provider test has no implicit target set and rejects fanout", () => {
	assert.throws(() => authorizeProviderTestRun([]), /PROVIDER_TEST_EXACTLY_ONE_TARGET_REQUIRED/);
	assert.throws(
		() => authorizeProviderTestRun(["--target", "chatgpt:stub,gemini:stub"]),
		/PROVIDER_TEST_EXACTLY_ONE_TARGET_REQUIRED/,
	);
	assert.equal(authorizeProviderTestRun(["--target", "chatgpt:stub"]).target, "chatgpt:stub");
});

test("provider test rejects every live target before provider resolution", async () => {
	for (const target of ["chatgpt:olostep:online", "chatgpt:brightdata:online", "chatgpt:openai-api:gpt-5-mini"]) {
		assert.throws(() => authorizeProviderTestRun(["--target", target]), /PROVIDER_TEST_LIVE_TARGET_FORBIDDEN/);
		let resolutions = 0;
		await assert.rejects(
			runProviderTargetOnce(
				target,
				undefined,
				() => {
					resolutions += 1;
					throw new Error("PROVIDER_RESOLUTION_REACHED");
				},
				{},
			),
			/PROVIDER_TEST_LIVE_TARGET_FORBIDDEN/,
		);
		assert.equal(resolutions, 0);
	}
});

test("provider stub execution remains behind the master runtime gates", async () => {
	let calls = 0;
	const provider: Pick<Provider, "run"> = {
		async run() {
			calls += 1;
			throw new Error("PROVIDER_RUN_REACHED");
		},
	};

	for (const environment of [
		{},
		{ SELENA_MEASUREMENT_ENABLED: "false", SELENA_EMERGENCY_STOP: "false" },
		{ SELENA_MEASUREMENT_ENABLED: "true", SELENA_EMERGENCY_STOP: "true" },
	]) {
		await assert.rejects(
			runProviderTargetOnce("chatgpt:stub", undefined, () => provider, environment),
			/PROVIDER_TEST_(MEASUREMENT_GATE_REQUIRED|EMERGENCY_STOP_MUST_BE_FALSE)/,
		);
	}
	assert.equal(calls, 0);
});

test("provider test can execute one non-network stub", async () => {
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

	const { result } = await runProviderTargetOnce("chatgpt:stub", undefined, () => provider, authorizedEnvironment);
	assert.equal(calls, 1);
	assert.equal(result.retries, 0);
});
