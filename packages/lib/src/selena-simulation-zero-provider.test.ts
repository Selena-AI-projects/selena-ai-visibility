import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The simulation's central claim is that it spends nothing: no measurement
 * provider is called and no payment is taken. That claim is worth only as much
 * as the guard behind it, so it is checked the way this repository checks its
 * other zero-spend surfaces — by reading the sources and refusing the imports
 * that would make spending possible.
 */

const LIB = import.meta.dirname;
const WEB = join(LIB, "../../../apps/web/src");
const CONTRACTS = join(LIB, "../../selena-visibility-contracts/src");

const SIMULATION_SOURCES = [
	join(CONTRACTS, "staging-simulation.ts"),
	join(LIB, "selena-simulation-repositories.ts"),
	join(LIB, "selena-telegram-adapter.ts"),
	join(WEB, "server/selena-staging-simulation.ts"),
];

const PROVIDER_MARKERS = [
	"openrouter",
	"brightdata",
	"dataforseo",
	"oxylabs",
	"cloro",
	"olostep",
	"anthropic",
	"openai",
	"selena-run-executor",
	"selena-measurement",
	"executePermit",
	"sv_run_permits",
	"svRunPermits",
	"sv_cost_events",
	"svCostEvents",
	"reserveProviderSpend",
];

// Identifiers, not prose: these modules describe what they refuse to do, so a
// bare word like "charge" appears in a comment that promises the opposite.
const PAYMENT_MARKERS = [
	"stripe",
	"checkout.session",
	"paymentintent",
	"createcharge",
	"sv_payments",
	"svpayments",
	"@better-auth/stripe",
];

describe("the simulation cannot call a measurement provider", () => {
	for (const source of SIMULATION_SOURCES) {
		it(`${source.split("/").slice(-1)[0]} imports no provider or spend surface`, () => {
			const text = readFileSync(source, "utf8").toLowerCase();
			for (const marker of PROVIDER_MARKERS) expect(text).not.toContain(marker.toLowerCase());
		});
	}
});

describe("the simulation cannot take a real payment", () => {
	for (const source of SIMULATION_SOURCES) {
		it(`${source.split("/").slice(-1)[0]} touches no live billing surface`, () => {
			const text = readFileSync(source, "utf8").toLowerCase();
			for (const marker of PAYMENT_MARKERS) expect(text).not.toContain(marker.toLowerCase());
		});
	}
});

describe("the simulation cannot start a measurement from a delivery", () => {
	it("neither the adapter nor the repositories can enqueue work", () => {
		// Architecture v1.4 §11.2: Telegram never starts a measurement. The
		// modules that handle a delivery hold no queue client, so a redelivered
		// or retried job has nothing it could enqueue.
		for (const source of [join(LIB, "selena-telegram-adapter.ts"), join(LIB, "selena-simulation-repositories.ts")]) {
			const text = readFileSync(source, "utf8");
			expect(text).not.toMatch(/\bboss\b/i);
			expect(text).not.toContain("pg-boss");
		}
	});
});

describe("the simulation writes only marked rows", () => {
	it("pins environment, mode, source status and not-a-measurement in the migration", () => {
		const migration = readFileSync(join(LIB, "db/migrations/0063_staging_verification_simulation.sql"), "utf8");
		for (const constraint of [
			`CHECK ("environment" = 'staging')`,
			`CHECK ("mode" = 'test')`,
			`CHECK ("source_status" = 'sample')`,
			`CHECK ("not_a_measurement" = true)`,
			`CHECK ("provider_calls" = 0)`,
		])
			expect(migration).toContain(constraint);
	});

	it("caps delivery attempts in the database, not only in code", () => {
		const migration = readFileSync(join(LIB, "db/migrations/0063_staging_verification_simulation.sql"), "utf8");
		expect(migration).toContain(`CHECK ("attempts_made" BETWEEN 0 AND 5)`);
		expect(migration).toContain(`CHECK ("attempt" BETWEEN 1 AND 5)`);
	});

	it("stores a connect token only as a digest", () => {
		const migration = readFileSync(join(LIB, "db/migrations/0063_staging_verification_simulation.sql"), "utf8");
		expect(migration).toContain(`CHECK ("token_hash" ~ '^[a-f0-9]{64}$')`);
		expect(migration).not.toMatch(/"token"\s+text/);
		expect(migration).not.toMatch(/"chat_id"\s+text/);
	});
});
