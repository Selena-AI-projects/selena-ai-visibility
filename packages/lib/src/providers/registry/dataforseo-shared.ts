import * as client from "dataforseo-client";
import { getCredential } from "../../secrets";

/**
 * Shared plumbing for the DataForSEO provider, which spans three products on
 * one set of account credentials: the SERP endpoints, AI Optimization "LLM
 * Scraper", and AI Optimization "LLM Responses".
 */

export const MAX_PROMPT_CHARS = 500;

// Country localization is intentionally not exposed via SCRAPE_TARGETS yet
// because support differs by DataForSEO surface and underlying model.
export const DFS_LOCATION_CODE = 2840;
export const DFS_LANGUAGE_CODE = "en";

export function isDataforseoConfigured(): boolean {
	return !!getCredential("DATAFORSEO_LOGIN") && !!getCredential("DATAFORSEO_PASSWORD");
}

export function sanitizeForJson(obj: unknown): unknown {
	return JSON.parse(JSON.stringify(obj));
}

export function authFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
	const username = getCredential("DATAFORSEO_LOGIN");
	const password = getCredential("DATAFORSEO_PASSWORD");
	if (!username || !password) {
		throw new Error("DataForSEO requires DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD");
	}
	const token = btoa(`${username}:${password}`);
	return fetch(url, {
		...init,
		headers: { ...init?.headers, Authorization: `Basic ${token}`, "Content-Type": "application/json" },
	});
}

export function createDfsSerpApi() {
	return new client.SerpApi("https://api.dataforseo.com", { fetch: authFetch });
}

export function createDfsAiApi() {
	return new client.AiOptimizationApi("https://api.dataforseo.com", { fetch: authFetch });
}

export function assertPromptLength(prompt: string) {
	const length = Array.from(prompt).length;
	if (length > MAX_PROMPT_CHARS) {
		throw new Error(`DataForSEO prompts must be ${MAX_PROMPT_CHARS} characters or fewer (${length} provided)`);
	}
}

/**
 * The charge DataForSEO reports on the task it just executed.
 *
 * Their per-call price depends on the endpoint, the queue, the requested depth
 * and whatever the account is actually on, so a list price hardcoded here would
 * be wrong for someone the day it is written. The response already carries the
 * real figure; read that instead. Anything missing or not a finite,
 * non-negative number is reported as unknown rather than guessed.
 */
export function taskCostUsd(task: unknown): number | undefined {
	const cost = (task as { cost?: unknown } | null | undefined)?.cost;
	if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) return undefined;
	return cost;
}
