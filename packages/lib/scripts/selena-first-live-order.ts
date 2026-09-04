#!/usr/bin/env tsx
/**
 * Builds the order a first live measurement needs, over the versioned API.
 *
 * The five steps before the admin desk — scenarios, configuration lock, quote,
 * order, recorded payment — each have an endpoint but no single screen, so
 * assembling them by hand means five requests with ids copied between them.
 * That is where a wrong scenario count or a mistyped project slips in.
 *
 * The desk keeps the last two steps: preflight, approve, queue. Approving is
 * what issues run permits and queueing is what spends money, so neither is
 * automated here.
 *
 * Usage:
 *   SELENA_API_BASE=https://staging.example.com \
 *   SELENA_API_KEY=... SELENA_PROJECT_ID=... SELENA_FAMILY_ID=... \
 *   pnpm -C packages/lib exec tsx scripts/selena-first-live-order.ts \
 *     --questions ./questions.txt --confirm
 *
 * Without --confirm it prints the plan and writes nothing.
 */

import { readFileSync } from "node:fs";

/** The three Visitor View surfaces a `visitor-local` measurement buys. */
const VISITOR_SURFACES = ["ChatGPT", "Gemini", "Perplexity"] as const;

/**
 * One answer per question per surface. A repeat multiplies the bill without
 * telling us anything new on a first run, so it stays at one.
 */
const REPEATS = 1;

/**
 * Priced at zero on purpose. The test payment has to match the quote exactly,
 * and a technical rehearsal should not leave a payment record that reads like
 * revenue.
 */
const REHEARSAL_PRICING = {
	baseAmount: 0,
	perRunAmount: 0,
	qcAmount: 0,
	marginRate: 0,
	currency: "USD",
} as const;

export interface FirstLiveOrderPlan {
	questions: readonly string[];
	surfaces: readonly string[];
	repeats: number;
	expectedRuns: number;
}

export class FirstLiveOrderRefused extends Error {}

/**
 * The count that decides the bill, checked before anything is created rather
 * than read off the preflight after the fact.
 */
export function planFirstLiveOrder(questions: readonly string[], maxRuns: number): FirstLiveOrderPlan {
	if (questions.length === 0) throw new FirstLiveOrderRefused("SELENA_FIRST_LIVE_NO_QUESTIONS");
	const expectedRuns = questions.length * VISITOR_SURFACES.length * REPEATS;
	if (expectedRuns > maxRuns)
		throw new FirstLiveOrderRefused(
			`SELENA_FIRST_LIVE_OVER_MAX_RUNS: ${expectedRuns} planned answers exceed the ${maxRuns} allowed`,
		);
	return { questions, surfaces: VISITOR_SURFACES, repeats: REPEATS, expectedRuns };
}

export function readQuestions(path: string): string[] {
	return readFileSync(path, "utf8")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));
}

interface Args {
	questionsPath: string;
	maxRuns: number;
	confirm: boolean;
}

export function parseArgs(argv: readonly string[]): Args {
	const args: Args = { questionsPath: "", maxRuns: 30, confirm: false };
	for (let index = 0; index < argv.length; index += 1) {
		if (argv[index] === "--questions") args.questionsPath = argv[++index] ?? "";
		else if (argv[index] === "--max-runs") args.maxRuns = Number(argv[++index]);
		else if (argv[index] === "--confirm") args.confirm = true;
	}
	if (!args.questionsPath) throw new FirstLiveOrderRefused("--questions <file> is required");
	if (!Number.isInteger(args.maxRuns) || args.maxRuns <= 0)
		throw new FirstLiveOrderRefused("--max-runs must be a positive integer");
	return args;
}

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new FirstLiveOrderRefused(`${name} is required`);
	return value;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const plan = planFirstLiveOrder(readQuestions(args.questionsPath), args.maxRuns);

	console.log(`questions: ${plan.questions.length}`);
	console.log(`surfaces: ${plan.surfaces.join(", ")}`);
	console.log(`planned answers: ${plan.expectedRuns}`);

	if (!args.confirm) {
		console.log("dry run: nothing was created. Re-run with --confirm to build the order.");
		return;
	}

	const base = required("SELENA_API_BASE").replace(/\/+$/, "");
	const apiKey = required("SELENA_API_KEY");
	const projectId = required("SELENA_PROJECT_ID");
	const familyId = required("SELENA_FAMILY_ID");
	const engineSha = required("SELENA_ENGINE_SHA");
	const orderCap = Number(process.env.SELENA_ORDER_CAP_USD ?? "2");

	async function post<T>(path: string, body: unknown): Promise<T> {
		const response = await fetch(`${base}/api/v1/selena${path}`, {
			method: "POST",
			headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		const text = await response.text();
		if (!response.ok) throw new FirstLiveOrderRefused(`POST ${path} → ${response.status}: ${text}`);
		return JSON.parse(text) as T;
	}

	const scenarioIds: string[] = [];
	for (const text of plan.questions) {
		const scenario = await post<{ id: string }>("/scenarios", { familyId, text, language: "en" });
		scenarioIds.push(scenario.id);
	}
	console.log(`scenarios created: ${scenarioIds.length}`);

	const lock = await post<{ id: string }>("/locks", {
		projectId,
		version: 1,
		snapshot: { surfaces: plan.surfaces, repeats: plan.repeats, questions: plan.questions.length },
		engineSha,
		expectedRuns: plan.expectedRuns,
		budgetCap: orderCap,
	});

	const quote = await post<{ id: string; expectedRuns: number; priceAmount: string; currency: string }>("/quotes", {
		projectId,
		lockId: lock.id,
		input: {
			scenarioIds,
			systems: plan.surfaces.map((id) => ({ id, channel: "VISITOR" as const })),
			repeats: plan.repeats,
		},
		pricing: REHEARSAL_PRICING,
	});

	// The server prices the quote itself, so this is the first point where its
	// arithmetic can be compared with ours rather than trusted.
	if (quote.expectedRuns !== plan.expectedRuns)
		throw new FirstLiveOrderRefused(
			`SELENA_FIRST_LIVE_RUN_COUNT_MISMATCH: quote plans ${quote.expectedRuns}, we planned ${plan.expectedRuns}`,
		);

	const order = await post<{ id: string }>("/orders", { projectId, quoteId: quote.id, lockId: lock.id, orderCap });

	await post("/payments/test", {
		orderId: order.id,
		amount: Number(quote.priceAmount),
		currency: quote.currency,
		providerEventId: `first-live-${order.id}`,
	});

	console.log(`order ready: ${order.id}`);
	console.log(`planned answers: ${quote.expectedRuns}`);
	console.log("next: open the admin desk, select this order, check preflight, then approve and queue.");
}

if (process.argv[1]?.endsWith("selena-first-live-order.ts")) {
	main().then(
		() => process.exit(0),
		(error: unknown) => {
			console.error(error instanceof Error ? error.message : String(error));
			process.exit(1);
		},
	);
}
