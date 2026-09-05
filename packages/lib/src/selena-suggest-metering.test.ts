import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { ProviderSpendRefused } from "./selena-provider-spend";
import {
	bookSuggestCostEvent,
	releaseSuggestSpend,
	reserveSuggestSpend,
	settleSuggestSpend,
	SUGGEST_ESTIMATED_COST_USD,
	SUGGEST_SPEND_SCOPE,
} from "./selena-suggest-metering";

function executorReturning(receipt: Record<string, unknown>) {
	const execute = vi.fn(async (_statement: SQL) => ({ rows: [{ receipt }] }));
	return { db: { execute } as never, execute };
}

/** Everything the statement carries to the driver, parameters included. */
function sent(execute: ReturnType<typeof vi.fn>): string {
	return JSON.stringify(execute.mock.calls[0][0]);
}

const request = { organizationId: "org-1", requestKey: "project-1" };

describe("holding budget before a suggestion", () => {
	it("passes the estimate and the scope the ceiling is kept under", async () => {
		const { db, execute } = executorReturning({ decision: "RESERVED", capUsd: 50, committedUsd: 0.05 });
		await reserveSuggestSpend(db, request);
		const statement = sent(execute);
		expect(statement).toContain(SUGGEST_SPEND_SCOPE);
		expect(statement).toContain("org-1");
		expect(statement).toContain("project-1");
		expect(statement).toContain(String(SUGGEST_ESTIMATED_COST_USD));
	});

	it("lets a retry ride on the reservation it already made", async () => {
		const { db } = executorReturning({ decision: "ALREADY_RESERVED", capUsd: 50, committedUsd: 0.05 });
		await expect(reserveSuggestSpend(db, request)).resolves.toMatchObject({ decision: "ALREADY_RESERVED" });
	});

	it("stops the work when the ceiling would be crossed", async () => {
		const { db } = executorReturning({ decision: "REFUSED_OVER_CAP", capUsd: 50, committedUsd: 50 });
		await expect(reserveSuggestSpend(db, request)).rejects.toBeInstanceOf(ProviderSpendRefused);
	});

	// An unfunded scope is not an unlimited one. This is the case the old
	// env-based ceiling got wrong: unset meant "no ceiling".
	it("stops the work when nobody has funded the scope", async () => {
		const { db } = executorReturning({ decision: "REFUSED_NO_BUDGET", capUsd: null, committedUsd: 0 });
		await expect(reserveSuggestSpend(db, request)).rejects.toThrow("PROVIDER_SPEND_REFUSED_NO_BUDGET");
	});
});

describe("closing a suggestion out", () => {
	it("settles with what the call cost", async () => {
		const { db, execute } = executorReturning({ decision: "SETTLED", capUsd: 50, committedUsd: 0.05, actualUsd: 0.05 });
		await expect(settleSuggestSpend(db, request, 0.05)).resolves.toMatchObject({ decision: "SETTLED", actualUsd: 0.05 });
		expect(sent(execute)).toContain("0.05");
	});

	it("gives the budget back when the call produced nothing", async () => {
		const { db } = executorReturning({ decision: "RELEASED", capUsd: 50, committedUsd: 0 });
		await expect(releaseSuggestSpend(db, request)).resolves.toMatchObject({ decision: "RELEASED", committedUsd: 0 });
	});

	it("books the ledger row the cost reports read", async () => {
		const execute = vi.fn(async (_statement: SQL) => ({ rows: [] }));
		await bookSuggestCostEvent({ execute } as never, { organizationId: "org-1", provider: "onboarding-llm" });
		const statement = JSON.stringify(execute.mock.calls[0][0]);
		expect(statement).toContain("sv_cost_events");
		expect(statement).toContain("onboarding-llm");
		expect(statement).toContain("estimated");
	});
});
