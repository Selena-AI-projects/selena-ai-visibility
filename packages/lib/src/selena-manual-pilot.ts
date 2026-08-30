import { createHash } from "node:crypto";
import {
	assertObservationCardinality,
	contextHash,
	type LocalAiDiscoveryLockBlock,
	localAiDiscoveryLockBlockSchema,
	type ObserverContext,
} from "@workspace/selena-visibility-contracts";

// RC7 Phase E planning is pure: a lock block goes in, a finite task matrix
// comes out. Nothing here (or in anything this module imports) can enqueue a
// job, spend budget, or reach an external surface — capture is a human act.
export type PlannedCaptureTask = {
	scenarioId: string;
	contextHash: string;
	contextSnapshot: ObserverContext;
	repeatIndex: number;
	queryTextSnapshot: string;
	targetEntityIdsSnapshot: string[];
	dedupeKey: string;
};

export function captureTaskDedupeKey(scenarioId: string, hash: string, repeatIndex: number): string {
	return `${scenarioId}:${hash}:${repeatIndex}`;
}

export function planCaptureTasks(block: LocalAiDiscoveryLockBlock): PlannedCaptureTask[] {
	const parsed = localAiDiscoveryLockBlockSchema.parse(block);
	const tasks: PlannedCaptureTask[] = [];
	const seenDedupeKeys = new Set<string>();
	for (const scenario of parsed.scenarios) {
		for (const context of parsed.observerContexts) {
			const hash = contextHash(context);
			for (let repeatIndex = 0; repeatIndex < parsed.repeats; repeatIndex++) {
				// Belt-and-suspenders: the schema already pins expectedObservations to
				// the matrix product, so planning task expected+1 must be impossible
				// even if a caller bypasses parse.
				assertObservationCardinality(tasks.length, parsed.expectedObservations);
				const dedupeKey = captureTaskDedupeKey(scenario.scenarioId, hash, repeatIndex);
				if (seenDedupeKeys.has(dedupeKey)) throw new Error("CAPTURE_TASK_DEDUPE_KEY_DUPLICATE");
				seenDedupeKeys.add(dedupeKey);
				tasks.push({
					scenarioId: scenario.scenarioId,
					contextHash: hash,
					contextSnapshot: context,
					repeatIndex,
					queryTextSnapshot: scenario.queryText,
					targetEntityIdsSnapshot: [...scenario.targetEntityIds],
					dedupeKey,
				});
			}
		}
	}
	return tasks;
}

// Transcript hash for the immutable observation record; corrections supersede
// rather than rewrite, so the original digest stays verifiable.
export function observationContentSha256(transcript: string): string {
	return createHash("sha256").update(transcript).digest("hex");
}
