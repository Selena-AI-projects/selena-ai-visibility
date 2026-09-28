import type { AnswerAnalysis } from "./selena-answer-analysis";

export function readRetainedAnswer(payload: unknown): { text: string; citedUrls?: string[] } | null {
	if (typeof payload !== "object" || payload === null) return null;
	const answer = (payload as Record<string, unknown>).answer;
	if (typeof answer !== "object" || answer === null) return null;
	const record = answer as Record<string, unknown>;
	const text = typeof record.text === "string" ? record.text : "";
	if (text.trim() === "") return null;
	const citedUrls = Array.isArray(record.citedUrls)
		? record.citedUrls.filter((url): url is string => typeof url === "string")
		: undefined;
	return citedUrls ? { text, citedUrls } : { text };
}

export function readStoredAnalysis(payload: unknown): AnswerAnalysis | null {
	if (typeof payload !== "object" || payload === null) return null;
	const analysis = (payload as Record<string, unknown>).analysis;
	if (typeof analysis !== "object" || analysis === null) return null;
	const record = analysis as Record<string, unknown>;
	if (typeof record.brandMentioned !== "boolean" || !Array.isArray(record.mentions)) return null;
	return record as unknown as AnswerAnalysis;
}
