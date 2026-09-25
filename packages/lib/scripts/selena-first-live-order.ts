#!/usr/bin/env tsx
/**
 * Builds the order a first live measurement needs, over the versioned API.
 *
 * The records before the admin desk — scenarios, configuration lock, quote,
 * order, recorded payment — each have an endpoint but no single screen, so
 * assembling them by hand means five requests with ids copied between them.
 * That is where a wrong scenario count or a mistyped project slips in.
 *
 * It runs in two phases because a question is reviewed between them. `propose`
 * creates the scenarios and stops; a reviewer approves them; `build` refuses
 * any scenario that is not APPROVED and then assembles the rest. Permit
 * creation trusts the ids frozen into the lock and never rechecks their status,
 * so a lock built from proposed questions would buy answers to questions nobody
 * agreed to ask.
 *
 * The desk keeps the last steps: preflight, approve, queue. Approving is what
 * issues run permits and queueing is what spends money, so neither is here.
 *
 * Usage:
 *   SELENA_API_BASE=https://staging.example.com SELENA_API_KEY=... \
 *   SELENA_PROJECT_ID=... SELENA_FAMILY_ID=... SELENA_ENGINE_SHA=... \
 *   pnpm -C packages/lib exec tsx scripts/selena-first-live-order.ts \
 *     propose --questions ./questions.txt --confirm
 *
 *   ... approve the questions in the workspace, then:
 *
 *   pnpm -C packages/lib exec tsx scripts/selena-first-live-order.ts \
 *     build --scenarios ./scenario-ids.txt --confirm
 *
 * Without --confirm either phase prints what it would do and writes nothing.
 */

import { readFileSync } from "node:fs";

/** The three Visitor View surfaces a `visibility-snapshot` measurement buys. */
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

export class FirstLiveOrderRefused extends Error {}

export interface MeasurementScopeBlock {
	scenarios: string[];
	systems: { systemId: string; channel: "VISITOR" }[];
	repeats: number;
}

/**
 * The count that decides the bill, checked before anything is created rather
 * than read off the preflight after the fact.
 */
export function assertWithinMaxRuns(count: number, maxRuns: number): number {
	if (count === 0) throw new FirstLiveOrderRefused("SELENA_FIRST_LIVE_NO_QUESTIONS");
	const expectedRuns = count * VISITOR_SURFACES.length * REPEATS;
	if (expectedRuns > maxRuns)
		throw new FirstLiveOrderRefused(
			`SELENA_FIRST_LIVE_OVER_MAX_RUNS: ${expectedRuns} planned answers exceed the ${maxRuns} allowed`,
		);
	return expectedRuns;
}

/**
 * The block the admin preflight reads. Without it `LOCK_SCOPE_PRESENT` is
 * false and the order can never be approved, so the lock is worthless without
 * this exact shape — `systemId`, not `id`.
 */
export function measurementScopeFor(scenarioIds: readonly string[]): MeasurementScopeBlock {
	return {
		scenarios: [...scenarioIds],
		systems: VISITOR_SURFACES.map((systemId) => ({ systemId, channel: "VISITOR" as const })),
		repeats: REPEATS,
	};
}

/**
 * The locks endpoint reads `version` as the expected next one and rejects
 * anything else, so a project that has ever been locked before needs its
 * current frontier rather than a constant.
 */
export function nextLockVersion(locks: readonly { version?: number | string }[]): number {
	const highest = locks.reduce((max, lock) => Math.max(max, Number(lock.version ?? 0) || 0), 0);
	return highest + 1;
}

/** Permit creation trusts these ids and never revisits their status. */
export function assertScenariosApproved(
	scenarios: readonly { id?: string; status?: string }[],
	wanted: readonly string[],
): void {
	const byId = new Map(scenarios.filter((row) => row.id).map((row) => [row.id as string, row.status]));
	const unusable = wanted.filter((id) => byId.get(id) !== "APPROVED");
	if (unusable.length > 0)
		throw new FirstLiveOrderRefused(
			`SELENA_FIRST_LIVE_SCENARIOS_NOT_APPROVED: ${unusable.join(", ")} — approve them before building the order`,
		);
}

export function readLines(path: string): string[] {
	return readFileSync(path, "utf8")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));
}

export interface Args {
	phase: "propose" | "build";
	inputPath: string;
	maxRuns: number;
	confirm: boolean;
}

export function parseArgs(argv: readonly string[]): Args {
	const phase = argv[0];
	if (phase !== "propose" && phase !== "build")
		throw new FirstLiveOrderRefused("first argument must be 'propose' or 'build'");
	const args: Args = { phase, inputPath: "", maxRuns: 30, confirm: false };
	for (let index = 1; index < argv.length; index += 1) {
		if (argv[index] === "--questions" || argv[index] === "--scenarios") args.inputPath = argv[++index] ?? "";
		else if (argv[index] === "--max-runs") args.maxRuns = Number(argv[++index]);
		else if (argv[index] === "--confirm") args.confirm = true;
	}
	if (!args.inputPath)
		throw new FirstLiveOrderRefused(
			phase === "propose" ? "--questions <file> is required" : "--scenarios <file> is required",
		);
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
	const input = readLines(args.inputPath);
	const expectedRuns = assertWithinMaxRuns(input.length, args.maxRuns);

	console.log(`${args.phase}: ${input.length} ${args.phase === "propose" ? "questions" : "scenarios"}`);
	console.log(`surfaces: ${VISITOR_SURFACES.join(", ")}`);
	console.log(`planned answers: ${expectedRuns}`);

	if (!args.confirm) {
		console.log("dry run: nothing was created. Re-run with --confirm.");
		return;
	}

	const base = required("SELENA_API_BASE").replace(/\/+$/, "");
	const apiKey = required("SELENA_API_KEY");
	const projectId = required("SELENA_PROJECT_ID");

	async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
		const response = await fetch(`${base}/api/v1/selena${path}`, {
			method,
			headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
		const text = await response.text();
		if (!response.ok) throw new FirstLiveOrderRefused(`${method} ${path} → ${response.status}: ${text}`);
		return JSON.parse(text) as T;
	}

	if (args.phase === "propose") {
		const familyId = required("SELENA_FAMILY_ID");
		for (const text of input) {
			const scenario = await call<{ id: string }>("POST", "/scenarios", { familyId, text, language: "en" });
			console.log(scenario.id);
		}
		console.log("next: approve these questions in the workspace, then run 'build' with their ids.");
		return;
	}

	const familyId = required("SELENA_FAMILY_ID");
	const engineSha = required("SELENA_ENGINE_SHA");
	const orderCap = Number(process.env.SELENA_ORDER_CAP_USD ?? "2");

	const { scenarios } = await call<{ scenarios: { id?: string; status?: string }[] }>(
		"GET",
		`/scenarios?familyId=${encodeURIComponent(familyId)}`,
	);
	assertScenariosApproved(scenarios, input);

	const { locks } = await call<{ locks: { version?: number | string }[] }>(
		"GET",
		`/locks?projectId=${encodeURIComponent(projectId)}`,
	);

	const lock = await call<{ id: string }>("POST", "/locks", {
		projectId,
		version: nextLockVersion(locks),
		snapshot: { measurementScope: measurementScopeFor(input) },
		engineSha,
		expectedRuns,
		budgetCap: orderCap,
	});

	const quote = await call<{ id: string; expectedRuns: number; priceAmount: string; currency: string }>(
		"POST",
		"/quotes",
		{
			projectId,
			lockId: lock.id,
			input: {
				scenarioIds: input,
				systems: VISITOR_SURFACES.map((id) => ({ id, channel: "VISITOR" as const })),
				repeats: REPEATS,
			},
			pricing: REHEARSAL_PRICING,
		},
	);

	// The server prices the quote itself, so this is the first point where its
	// arithmetic can be compared with ours rather than trusted.
	if (quote.expectedRuns !== expectedRuns)
		throw new FirstLiveOrderRefused(
			`SELENA_FIRST_LIVE_RUN_COUNT_MISMATCH: quote plans ${quote.expectedRuns}, we planned ${expectedRuns}`,
		);

	const order = await call<{ id: string }>("POST", "/orders", {
		projectId,
		quoteId: quote.id,
		lockId: lock.id,
		orderCap,
	});

	await call("POST", "/payments/test", {
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
