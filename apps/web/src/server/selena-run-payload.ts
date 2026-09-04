/**
 * How a stored run row is read back into the shapes a reader shows.
 *
 * The browser explorer and the API read the same rows, and a difference
 * between them would be a difference in what the evidence says, so the
 * readers live here once rather than beside each caller.
 */

/** Null when never stored; a marker object when deleted by retention. */
export type RunAnswer =
	| { state: "present"; text: string }
	| { state: "deleted"; deletedAt: string }
	| { state: "absent" };
export type RunCitation = { url: string; domain: string };
/** What the Visitor View surface displayed, when the adapter carried it. */
export type RunSource = { url: string; domain: string; title?: string };

export function readAnswer(payload: unknown): RunAnswer {
	if (typeof payload !== "object" || payload === null) return { state: "absent" };
	const answer = (payload as Record<string, unknown>).answer;
	if (typeof answer !== "object" || answer === null) return { state: "absent" };
	const record = answer as Record<string, unknown>;
	if (typeof record.text === "string") return { state: "present", text: record.text };
	if (typeof record.textDeletedAt === "string") return { state: "deleted", deletedAt: record.textDeletedAt };
	return { state: "absent" };
}

export function readSources(payload: unknown): RunSource[] {
	if (typeof payload !== "object" || payload === null) return [];
	const sources = (payload as Record<string, unknown>).sources;
	if (!Array.isArray(sources)) return [];
	return sources.flatMap((item) => {
		if (typeof item !== "object" || item === null) return [];
		const record = item as Record<string, unknown>;
		if (typeof record.url !== "string" || typeof record.domain !== "string") return [];
		return [
			{
				url: record.url,
				domain: record.domain,
				...(typeof record.title === "string" ? { title: record.title } : {}),
			},
		];
	});
}

export function readCitations(value: unknown): RunCitation[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (typeof item !== "object" || item === null) return [];
		const record = item as Record<string, unknown>;
		return typeof record.url === "string" && typeof record.domain === "string"
			? [{ url: record.url, domain: record.domain }]
			: [];
	});
}
