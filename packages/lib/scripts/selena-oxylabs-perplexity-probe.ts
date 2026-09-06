#!/usr/bin/env tsx
/**
 * One live Oxylabs call against the Perplexity source, to learn whether that
 * collector returns a visitor answer where the Bright Data one returns the
 * sign-up wall (BRIGHTDATA_PERPLEXITY_AUTH_WALL.md). It goes through the
 * provider the registry already ships, so what is probed is what would be
 * wired.
 *
 * Run it where the credential lives — a CI secret, or a shell that holds it:
 *
 *   SELENA_OXYLABS_PROBE=yes \
 *   OXYLABS_USERNAME=... OXYLABS_PASSWORD=... \
 *   pnpm exec tsx scripts/selena-oxylabs-perplexity-probe.ts
 *
 * Exactly one job, no retries beyond the provider's own polling. The raw
 * payload goes to a fixture, not the log: the log carries shape and size, and
 * enough of the text to tell a wall from an answer.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { oxylabs } from "../src/providers/registry/oxylabs";

// A question the Bright Data collector answered with MALFORMED_RESPONSE on
// 2026-09-04, so the two collectors are compared on the same input.
const DEFAULT_PROMPT = "What are the best food halls in Ubud, Bali?";
const EXCERPT_CHARS = 160;
const WALL_PATTERN = /sign up|sign in|log in|create a free account|continue with google|verify you are human/i;

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value || value.trim() === "") {
		console.error(`Missing ${name}. This probe never invents defaults for a paid call.`);
		process.exit(1);
	}
	return value.trim();
}

function keysOf(value: unknown): string {
	return value && typeof value === "object" && !Array.isArray(value)
		? Object.keys(value as Record<string, unknown>)
				.slice(0, 30)
				.join(",")
		: typeof value;
}

async function main(): Promise<void> {
	if (process.env.SELENA_OXYLABS_PROBE !== "yes") {
		console.error("Refusing: set SELENA_OXYLABS_PROBE=yes to confirm the one owner-approved live call.");
		process.exit(1);
	}
	requireEnv("OXYLABS_USERNAME");
	requireEnv("OXYLABS_PASSWORD");
	const prompt = process.env.OXYLABS_PROBE_PROMPT?.trim() || DEFAULT_PROMPT;

	console.log(`source: perplexity (provider "${oxylabs.id}", access "${oxylabs.access}")`);
	console.log(`prompt: ${prompt}`);
	const startedAt = Date.now();

	const result = await oxylabs.run("perplexity", prompt, { webSearch: true });
	const elapsedS = Math.round((Date.now() - startedAt) / 1000);

	const scriptDir = dirname(fileURLToPath(import.meta.url));
	const fixtureDir = join(scriptDir, "..", "src", "adapters", "__fixtures__");
	mkdirSync(fixtureDir, { recursive: true });
	const fixturePath = join(fixtureDir, "oxylabs-perplexity-live-probe.json");
	writeFileSync(
		fixturePath,
		JSON.stringify({ capturedAt: new Date().toISOString(), prompt, elapsedS, rawOutput: result.rawOutput }, null, "\t"),
	);

	const payload = result.rawOutput as { results?: Array<{ content?: Record<string, unknown> }> };
	const content = payload.results?.[0]?.content ?? {};
	const text = result.textContent ?? "";
	const wall = text.length < 600 && WALL_PATTERN.test(text);

	console.log(`job finished in ${elapsedS}s`);
	console.log(`content keys: ${keysOf(content)}`);
	console.log(`llm_model: ${String(content.llm_model ?? content.model ?? "-")}`);
	console.log(`answer: ${text.length} chars, ${result.citations.length} citations, ${result.webQueries.length} web queries`);
	console.log(`excerpt: ${JSON.stringify(text.slice(0, EXCERPT_CHARS))}`);
	console.log(`fixture written: ${fixturePath}`);

	if (text.trim() === "") {
		console.error("VERDICT: empty answer — the source returned no visitor text.");
		process.exit(2);
	}
	if (wall) {
		console.error("VERDICT: auth wall — same failure as the Bright Data collector, on a different provider.");
		process.exit(2);
	}
	console.log(
		result.citations.length === 0
			? "VERDICT: text but no citations — compare the excerpt against a real perplexity.ai answer before trusting it."
			: "VERDICT: a visitor answer with sources — the shape an adapter can be built on.",
	);
}

main().catch((error) => {
	// The message can quote request internals; the credential travels only in
	// the Authorization header the provider builds and is never interpolated.
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
