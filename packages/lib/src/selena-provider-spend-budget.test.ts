import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	formatProviderSpendBudget,
	readProviderSpendBudget,
	setProviderSpendBudget,
} from "./selena-provider-spend-budget";

function executorAnswering(rows: unknown[]) {
	const statements: SQL[] = [];
	return {
		statements,
		execute: async (statement: SQL) => {
			statements.push(statement);
			return { rows };
		},
	};
}

describe("provider spend budget", () => {
	it("reports a funded scope's ceiling and what is committed against it", async () => {
		const executor = executorAnswering([{ cap_usd: 2, committed_usd: "0.35", open_reservations: "1" }]);
		const report = await readProviderSpendBudget(executor, "measure");
		expect(report).toEqual({ scope: "measure", capUsd: 2, committedUsd: 0.35, openReservations: 1 });
		expect(formatProviderSpendBudget(report)).toEqual([
			"scope: measure",
			"cap: 2",
			"committed: 0.35",
			"open reservations: 1",
		]);
	});

	it("reports an unfunded scope as not funded, never as zero", async () => {
		const report = await readProviderSpendBudget(
			executorAnswering([{ cap_usd: null, committed_usd: 0, open_reservations: 0 }]),
			"suggest",
		);
		expect(report.capUsd).toBeNull();
		expect(formatProviderSpendBudget(report)[1]).toBe("cap: not funded");
	});

	it("writes only a non-negative dollar amount", async () => {
		const executor = executorAnswering([]);
		await setProviderSpendBudget(executor, "measure", 20);
		expect(executor.statements).toHaveLength(1);
		await expect(setProviderSpendBudget(executor, "measure", -1)).rejects.toThrow("non-negative");
		await expect(setProviderSpendBudget(executor, "measure", Number.NaN)).rejects.toThrow("non-negative");
	});
});
