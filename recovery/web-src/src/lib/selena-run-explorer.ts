export type GroupableRun = {
	id: string;
	scenarioId: string;
	scenarioText: string | null;
	status: string;
	validity: string | null;
	invalidReason: string | null;
};

export type RunSummary = {
	total: number;
	available: number;
	unavailable: number;
};

export type RunQuestionGroup<T extends GroupableRun = GroupableRun> = RunSummary & {
	scenarioId: string;
	scenarioText: string | null;
	runs: T[];
};

export function isRunAvailable(run: Pick<GroupableRun, "status" | "validity" | "invalidReason">): boolean {
	const validity = run.validity?.toUpperCase();
	if (run.invalidReason || validity === "INVALID") return false;
	if (validity === "VALID") return true;
	return ["COMPLETED", "SUCCEEDED"].includes(run.status.toUpperCase());
}

export function summarizeRuns(runs: readonly GroupableRun[]): RunSummary {
	const available = runs.filter(isRunAvailable).length;
	return { total: runs.length, available, unavailable: runs.length - available };
}

export function groupRunsByQuestion<T extends GroupableRun>(runs: readonly T[]): RunQuestionGroup<T>[] {
	const groups = new Map<string, { scenarioId: string; scenarioText: string | null; runs: T[] }>();
	for (const run of runs) {
		const group = groups.get(run.scenarioId);
		if (group) group.runs.push(run);
		else groups.set(run.scenarioId, { scenarioId: run.scenarioId, scenarioText: run.scenarioText, runs: [run] });
	}
	return [...groups.values()].map((group) => ({ ...group, ...summarizeRuns(group.runs) }));
}
