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
		: readProviderCitationUrls(payload as Record<string, unknown>);
	return citedUrls ? { text, citedUrls } : { text };
}

// Adapters store the sources a surface reported next to the answer, in the
// run's measurement, not inside the answer text; without them an answer whose
// text carries no links would read as citing nothing.
function readProviderCitationUrls(payload: Record<string, unknown>): string[] | undefined {
	const measurement = payload.measurement;
	if (typeof measurement !== "object" || measurement === null) return undefined;
	const citations = (measurement as Record<string, unknown>).citations;
	if (!Array.isArray(citations)) return undefined;
	const urls = citations.flatMap((citation) => {
		if (typeof citation !== "object" || citation === null) return [];
		const url = (citation as Record<string, unknown>).url;
		return typeof url === "string" && url.trim() !== "" ? [url] : [];
	});
	return urls.length > 0 ? urls : undefined;
}

export function readStoredAnalysis(payload: unknown): AnswerAnalysis | null {
	if (typeof payload !== "object" || payload === null) return null;
	const analysis = (payload as Record<string, unknown>).analysis;
	if (typeof analysis !== "object" || analysis === null) return null;
	const record = analysis as Record<string, unknown>;
	if (typeof record.brandMentioned !== "boolean" || !Array.isArray(record.mentions)) return null;
	return record as unknown as AnswerAnalysis;
}
