import { describe, expect, it } from "vitest";
import { groupRunsByQuestion } from "@/lib/selena-run-explorer";

describe("groupRunsByQuestion", () => {
	it("turns system runs into question rows with availability counts", () => {
		const groups = groupRunsByQuestion([
			{
				id: "run-1",
				scenarioId: "question-1",
				scenarioText: "Where should I get breakfast?",
				status: "SUCCEEDED",
				validity: "VALID",
				invalidReason: null,
			},
			{
				id: "run-2",
				scenarioId: "question-1",
				scenarioText: "Where should I get breakfast?",
				status: "INVALID",
				validity: "INVALID",
				invalidReason: "RESPONSE_TOO_LARGE",
			},
			{
				id: "run-3",
				scenarioId: "question-2",
				scenarioText: "Which bakery is open early?",
				status: "COMPLETED",
				validity: null,
				invalidReason: null,
			},
		]);

		expect(groups).toHaveLength(2);
		expect(groups[0]).toMatchObject({
			scenarioId: "question-1",
			scenarioText: "Where should I get breakfast?",
			total: 2,
			available: 1,
			unavailable: 1,
		});
		expect(groups[0].runs.map((run) => run.id)).toEqual(["run-1", "run-2"]);
		expect(groups[1]).toMatchObject({ total: 1, available: 1, unavailable: 0 });
	});

	it("treats validity values consistently regardless of case", () => {
		const [group] = groupRunsByQuestion([
			{
				id: "run-1",
				scenarioId: "question-1",
				scenarioText: "Where should I get breakfast?",
				status: "SUCCEEDED",
				validity: "invalid",
				invalidReason: null,
			},
		]);

		expect(group).toMatchObject({ total: 1, available: 0, unavailable: 1 });
	});
});
