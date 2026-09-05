import {
	assertAdapterAllowed,
	inertMeasurementAdapters,
	type RunOutcome,
	runOutcomeSchema,
	visitorSurfaces,
} from "@workspace/selena-visibility-contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ControlledCycleState } from "../run-policy";
import type { SelenaExecutablePermit } from "../selena-measurement";
import { executePermit } from "../selena-run-executor";
import { estimateRunCostUsd } from "../usage/cost";
import {
	type BrightDataVisitorSystem,
	brightDataVisitorSurface,
	buildBrightDataRequestBody,
	createBrightDataAdapter,
	extractBrightDataSources,
	PERPLEXITY_MEASUREMENT_DEADLINE_MS,
	PERPLEXITY_QUEUE_LEASE_SECONDS,
	parseBrightDataAnswer,
	resolveBrightDataCost,
} from "./brightdata-measurement-adapter";

const API_KEY = "brd-secret-owner-token";
const ENDPOINT = "https://api.brightdata.com/datasets/v3/scrape";
const DATASET_ID = "gd_m7aof0k82r803d5bjm";
/** The URL the adapter actually calls: the collector is chosen in the query. */
const CALLED_URL = `${ENDPOINT}?dataset_id=${DATASET_ID}&notify=false`;
const SCENARIO_TEXT = "Which spa in Canggu is best for a deep tissue massage?";

function permitFor(overrides: Partial<SelenaExecutablePermit> = {}): SelenaExecutablePermit {
	return {
		id: "permit-1",
		organizationId: "org-1",
		cycleId: "cycle-1",
		scenarioId: "scenario-1",
		// The catalog's name for the surface, which is what a real permit carries.
		systemId: "ChatGPT",
		channel: "VISITOR",
		dispatchKey: "order-1:scenario-1:ChatGPT:0:1",
		expiresAt: new Date("2026-08-19T11:00:00.000Z"),
		consumedAt: null,
		...overrides,
	};
}

const now = () => new Date("2026-08-19T10:00:00.000Z");

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

function respondWith(response: Response | (() => Response)) {
	const fixed =
		typeof response === "function"
			? null
			: {
					body: response.text(),
					status: response.status,
					statusText: response.statusText,
					headers: new Headers(response.headers),
				};
	return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
		if (typeof response === "function") return response();
		// Materialize the fixture once and build an independent stream per
		// attempt. Response.clone() tees the body; cancelling one branch can
		// otherwise wait forever for the unused branch in size/error tests.
		return new Response(await fixed?.body, fixed ?? undefined);
	});
}

function adapterWith(fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}) {
	return createBrightDataAdapter({
		apiKey: API_KEY,
		endpoint: ENDPOINT,
		datasetId: DATASET_ID,
		system: "chatgpt",
		fetchImpl,
		resolveScenarioText: () => SCENARIO_TEXT,
		now,
		...overrides,
	});
}

function dcaAdapterWith(fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}) {
	return createBrightDataAdapter({
		apiKey: API_KEY,
		endpoint: "https://api.brightdata.com/datasets/v3/scrape",
		datasetId: DATASET_ID,
		system: "perplexity",
		fetchImpl,
		resolveScenarioText: () => SCENARIO_TEXT,
		now,
		perplexityDca: { collectorId: "c_mtoi7ng2wyqxm8d61", version: "dev", pollMs: 0 },
		...overrides,
	});
}

function successPayload(overrides: Record<string, unknown> = {}) {
	return {
		snapshot_id: "s_01HZY",
		answer_text_markdown: "Answer text mentioning two studios.",
		citations: [{ url: "https://example.test/spa", title: "Spa guide" }],
		...overrides,
	};
}

function expectCostUsd(outcome: RunOutcome, expected: number) {
	if (typeof outcome.costUsd !== "number") throw new Error("Expected the provider attempt to record a numeric cost");
	expect(outcome.costUsd).toBeCloseTo(expected);
}

function expectedBrightDataCost(attempts: number) {
	const cost = estimateRunCostUsd("brightdata", true);
	if (cost === null) throw new Error("Expected Bright Data to have a configured cost estimate");
	return attempts * cost;
}

// Nothing in these tests may reach a network: the global is replaced with a
// throwing stub so an accidental use of ambient fetch fails loudly instead of
// quietly billing the owner's Bright Data account.
let globalFetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
	globalFetch = vi.fn(() => {
		throw new Error("NETWORK_FORBIDDEN_IN_TESTS");
	});
	vi.stubGlobal("fetch", globalFetch);
});
afterEach(() => {
	vi.unstubAllGlobals();
});

describe("Bright Data measurement adapter", () => {
	it("uses the published Perplexity collector input shape", () => {
		expect(buildBrightDataRequestBody({ system: "perplexity", prompt: SCENARIO_TEXT })).toEqual({
			input: [
				{
					url: "https://www.perplexity.ai",
					prompt: SCENARIO_TEXT,
					country: "",
					index: 1,
					additional_prompt: "",
				},
			],
		});
		expect(globalFetch).not.toHaveBeenCalled();
	});

	it("triggers the opted-in DCA collector once with the encoded question URL", async () => {
		const responses = [
			jsonResponse({ collection_id: "j_dca123" }),
			jsonResponse({ status: "completed" }),
			jsonResponse({ answer: "AVLI is recommended.", cited_sources: [], final_url: "https://www.perplexity.ai/search/dca" }),
		];
		const fetchMock = vi.fn(async () => responses.shift() as Response) as unknown as typeof fetch;
		const outcome = await dcaAdapterWith(fetchMock).execute(permitFor({ systemId: "Perplexity" }));
		const trigger = String((fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
		expect(trigger).toContain("/dca/trigger?collector=c_mtoi7ng2wyqxm8d61&version=dev");
		expect((fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
		expect(JSON.parse(String((fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body))).toEqual({
			input: [{ url: `https://www.perplexity.ai/?q=${encodeURIComponent(SCENARIO_TEXT)}` }],
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(outcome).toMatchObject({ status: "SUCCEEDED", answer: { text: "AVLI is recommended." }, rawResponseReference: "brightdata:j_dca123" });
	});

	it("accepts DCA cited_sources and keeps a login flag with an answer successful", async () => {
		const responses = [
			jsonResponse({ collection_id: "j_dca124" }),
			jsonResponse({ status: "ready" }),
			jsonResponse({
				answer: "AVLI is recommended.",
				login_wall_detected: true,
				cited_sources: [{ source_url: "https://avlibali.com/", source_title: "AVLI" }],
			}),
		];
		const fetchMock = vi.fn(async () => responses.shift() as Response) as unknown as typeof fetch;
		const outcome = await dcaAdapterWith(fetchMock).execute(permitFor({ systemId: "Perplexity" }));
		expect(outcome).toMatchObject({ status: "SUCCEEDED", sources: [{ url: "https://avlibali.com/", title: "AVLI" }] });
	});

	it("classifies a DCA login wall without an answer as provider auth failure", async () => {
		const responses = [jsonResponse({ collection_id: "j_dca125" }), jsonResponse({ status: "completed" }), jsonResponse({ login_wall_detected: true, answer: "" })];
		const fetchMock = vi.fn(async () => responses.shift() as Response) as unknown as typeof fetch;
		const outcome = await dcaAdapterWith(fetchMock).execute(permitFor({ systemId: "Perplexity" }));
		expect(outcome).toMatchObject({ status: "INVALID", validity: "INVALID", invalidReason: "PROVIDER_AUTH_FAILURE", rawResponseReference: "brightdata:j_dca125" });
	});

	it("bounds DCA polling without retriggering", async () => {
		const responses = [jsonResponse({ collection_id: "j_dca126" }), jsonResponse({ status: "running" })];
		const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => responses.shift() as Response);
		const outcome = await dcaAdapterWith(fetchMock as unknown as typeof fetch, { snapshotTimeoutMs: 5, perplexityDca: { collectorId: "c_mtoi7ng2wyqxm8d61", version: "prod", pollMs: 0 } }).execute(permitFor({ systemId: "Perplexity" }));
		expect(outcome.invalidReason).toBe("TIMEOUT");
		expect(fetchMock.mock.calls.filter((call) => String(call[0]).includes("/dca/trigger")).length).toBe(1);
	});

	it("classifies malformed DCA dataset output without inventing an answer", async () => {
		const responses = [jsonResponse({ collection_id: "j_dca127" }), jsonResponse({ status: "complete" }), jsonResponse({ final_url: "https://www.perplexity.ai/search/dca" })];
		const fetchMock = vi.fn(async () => responses.shift() as Response) as unknown as typeof fetch;
		const outcome = await dcaAdapterWith(fetchMock).execute(permitFor({ systemId: "Perplexity" }));
		expect(outcome.invalidReason).toBe("MALFORMED_RESPONSE");
		expect(outcome.answer).toBeUndefined();
	});

	it("runs Perplexity through trigger, poll and fetch, then reads its HTML answer", async () => {
		const responses = [
			jsonResponse({ snapshot_id: "s_perplexity" }),
			jsonResponse({ status: "ready" }),
			jsonResponse([
				{
					answer_html: "<p>AVLI Bali is mentioned.</p><p>Sources are shown below.</p><script>hidden()</script>",
					citations: [{ url: "https://example.test/avli", title: "AVLI guide" }],
				},
			]),
		];
		const seen: Array<{ url: string; init?: RequestInit }> = [];
		const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			seen.push({ url: String(input), init });
			const response = responses.shift();
			if (!response) throw new Error("TEST_SEQUENCE_EXHAUSTED");
			return response;
		}) as unknown as typeof fetch;

		const outcome = await adapterWith(fetchImpl, {
			system: "perplexity",
			snapshotPollMs: 0,
		}).execute(permitFor({ systemId: "Perplexity" }));

		const triggerUrl = new URL(seen[0]?.url ?? "");
		expect(triggerUrl.pathname).toBe("/datasets/v3/trigger");
		expect(triggerUrl.searchParams.get("dataset_id")).toBe(DATASET_ID);
		expect(triggerUrl.searchParams.get("include_errors")).toBe("true");
		expect(JSON.parse(String(seen[0]?.init?.body))).toEqual([
			{
				url: "https://www.perplexity.ai",
				prompt: SCENARIO_TEXT,
				country: "",
				index: 1,
				additional_prompt: "",
			},
		]);
		expect(seen[1]?.url).toContain("/progress/s_perplexity");
		expect(seen[2]?.url).toContain("/snapshot/s_perplexity");
		expect(outcome).toMatchObject({
			status: "SUCCEEDED",
			validity: "VALID",
			answer: { text: "AVLI Bali is mentioned.\nSources are shown below." },
			sources: [{ url: "https://example.test/avli", domain: "example.test", title: "AVLI guide" }],
		});
		expect(globalFetch).not.toHaveBeenCalled();
	});

	it("keeps Perplexity on trigger when a caller requests scrape", async () => {
		const responses = [
			jsonResponse({ snapshot_id: "s_normalized" }),
			jsonResponse({ status: "ready" }),
			jsonResponse([
				{
					answer_text: "AVLI is recommended for Greek dining.",
					citations: [{ url: "https://avlibali.com/", title: "AVLI" }],
				},
			]),
		];
		const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
			const response = responses.shift();
			if (!response) throw new Error("TEST_SEQUENCE_EXHAUSTED");
			return response;
		});
		const fetchImpl = fetchMock as unknown as typeof fetch;
		const outcome = await adapterWith(fetchImpl, {
			system: "perplexity",
			collectionMode: "scrape",
			snapshotPollMs: 0,
		}).execute(permitFor({ systemId: "Perplexity" }));

		expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/datasets/v3/trigger");
		expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual([
			{
				url: "https://www.perplexity.ai",
				prompt: SCENARIO_TEXT,
				country: "",
				index: 1,
				additional_prompt: "",
			},
		]);
		expect(outcome).toMatchObject({
			status: "SUCCEEDED",
			validity: "VALID",
			answer: { text: "AVLI is recommended for Greek dining." },
		});
	});

	it("bounds a stalled snapshot status request", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
		const fetchSpy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			if (String(input).includes("/trigger")) return Promise.resolve(jsonResponse({ snapshot_id: "s_stalled" }));
			if (String(input).endsWith("/cancel")) return Promise.resolve(new Response(null, { status: 204 }));
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					const error = new Error("aborted");
					error.name = "AbortError";
					reject(error);
				});
			});
		});
		const fetchImpl = fetchSpy as unknown as typeof fetch;

		try {
			const outcomePromise = adapterWith(fetchImpl, {
				system: "perplexity",
				collectionMode: "trigger",
				snapshotTimeoutMs: 10,
				snapshotPollMs: 0,
			}).execute(permitFor({ systemId: "Perplexity" }));
			await vi.advanceTimersByTimeAsync(10);
			const outcome = await outcomePromise;

			expect(outcome).toMatchObject({
				status: "INVALID",
				invalidReason: "SNAPSHOT_NOT_READY",
				rawResponseReference: "brightdata:s_stalled",
			});
			expect(fetchImpl).toHaveBeenCalledTimes(3);
			expect(String(fetchSpy.mock.calls[2]?.[0])).toContain("/snapshot/s_stalled/cancel");
		} finally {
			vi.useRealTimers();
		}
	});

	it("uses one overall deadline for the request and its snapshot cleanup", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
		const startedAt = Date.now();
		let cancelledAt: number | null = null;
		const fetchSpy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.includes("/trigger"))
				return new Promise<Response>((resolve) => {
					setTimeout(() => resolve(jsonResponse({ snapshot_id: "s_deadline" })), 8);
				});
			if (url.endsWith("/cancel")) {
				cancelledAt = Date.now();
				return Promise.resolve(new Response(null, { status: 204 }));
			}
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					const error = new Error("aborted");
					error.name = "AbortError";
					reject(error);
				});
			});
		});

		try {
			const outcomePromise = adapterWith(fetchSpy, {
				system: "perplexity",
				collectionMode: "trigger",
				snapshotTimeoutMs: 10,
				snapshotPollMs: 0,
			}).execute(permitFor({ systemId: "Perplexity" }));
			await vi.advanceTimersByTimeAsync(20);
			const outcome = await outcomePromise;

			expect(outcome).toMatchObject({ status: "INVALID", invalidReason: "SNAPSHOT_NOT_READY" });
			expect(cancelledAt === null ? null : cancelledAt - startedAt).toBe(10);
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not dispatch after scenario resolution exhausts the overall deadline", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
		const fetchImpl = respondWith(jsonResponse(successPayload()));

		try {
			const outcomePromise = adapterWith(fetchImpl, {
				system: "perplexity",
				snapshotTimeoutMs: 10,
				resolveScenarioText: () => new Promise<string>((resolve) => setTimeout(() => resolve(SCENARIO_TEXT), 11)),
			}).execute(permitFor({ systemId: "Perplexity" }));
			await vi.advanceTimersByTimeAsync(12);
			const outcome = await outcomePromise;

			expect(fetchImpl).not.toHaveBeenCalled();
			expect(outcome).toMatchObject({ status: "INVALID", invalidReason: "TIMEOUT" });
			expect(outcome.costUsd).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it("keeps the queue lease beyond the Perplexity deadline and cleanup reserve", () => {
		expect(PERPLEXITY_MEASUREMENT_DEADLINE_MS).toBe(25 * 60_000);
		expect(PERPLEXITY_QUEUE_LEASE_SECONDS * 1_000).toBeGreaterThan(PERPLEXITY_MEASUREMENT_DEADLINE_MS + 5 * 60_000);
	});

	it("keeps polling a Perplexity snapshot beyond the observed sixteen-minute collection", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
		const readyAt = Date.now() + 16 * 60_000;
		const fetchSpy = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
			const url = String(input);
			if (url.includes("/trigger")) return jsonResponse({ snapshot_id: "s_slow_perplexity" });
			if (url.includes("/progress/")) return jsonResponse({ status: Date.now() >= readyAt ? "ready" : "running" });
			if (url.includes("/snapshot/"))
				return jsonResponse([{ answer_html: "<p>AVLI is recommended after the long collection.</p>" }]);
			throw new Error(`UNEXPECTED_TEST_URL:${url}`);
		});
		const fetchImpl = fetchSpy as unknown as typeof fetch;

		try {
			const outcomePromise = adapterWith(fetchImpl, {
				system: "perplexity",
				collectionMode: "trigger",
			}).execute(permitFor({ systemId: "Perplexity" }));
			await vi.advanceTimersByTimeAsync(16 * 60_000);
			const outcome = await outcomePromise;

			expect(outcome).toMatchObject({
				status: "SUCCEEDED",
				validity: "VALID",
				answer: { text: "AVLI is recommended after the long collection." },
			});
			expect(fetchSpy.mock.calls.some(([url]) => String(url).endsWith("/cancel"))).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("accepts a downloadable snapshot while progress still says running", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
		let progressCalls = 0;
		let snapshotCalls = 0;
		const fetchSpy = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
			const url = String(input);
			if (url.includes("/trigger")) return jsonResponse({ snapshot_id: "s_eventually_downloadable" });
			if (url.includes("/progress/")) {
				progressCalls += 1;
				return jsonResponse({ status: "running" });
			}
			if (url.includes("/snapshot/")) {
				snapshotCalls += 1;
				return jsonResponse([{ answer_text: "AVLI is visible.", citations: [{ url: "https://avlibali.com/" }] }]);
			}
			throw new Error(`UNEXPECTED_TEST_URL:${url}`);
		});

		try {
			const outcomePromise = adapterWith(fetchSpy, {
				system: "perplexity",
				collectionMode: "trigger",
				snapshotPollMs: 1_000,
			}).execute(permitFor({ systemId: "Perplexity" }));
			await vi.advanceTimersByTimeAsync(6_000);
			const outcome = await outcomePromise;

			expect(progressCalls).toBe(6);
			expect(snapshotCalls).toBe(1);
			expect(outcome).toMatchObject({
				status: "SUCCEEDED",
				validity: "VALID",
				answer: { text: "AVLI is visible." },
				sources: [{ url: "https://avlibali.com/", domain: "avlibali.com" }],
			});
		} finally {
			vi.useRealTimers();
		}
	});

	it("sends one Visitor View request to the collector, carrying the question", async () => {
		const fetchImpl = respondWith(jsonResponse(successPayload()));
		const permit = permitFor();

		const outcome = await adapterWith(fetchImpl).execute(permit);

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(globalFetch).not.toHaveBeenCalled();
		const [url, init] = fetchImpl.mock.calls[0];
		expect(url).toBe(CALLED_URL);
		expect(init?.method).toBe("POST");
		const headers = init?.headers as Record<string, string>;
		expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
		expect(headers["Content-Type"]).toBe("application/json");

		const rawBody = String(init?.body);
		const body = JSON.parse(rawBody);
		// The collector takes an input list, not a flat body — confirmed against
		// the account's own code example.
		expect(body.input).toHaveLength(1);
		expect(body.input[0].url).toBe("https://chatgpt.com/");
		expect(body.input[0].prompt).toBe(SCENARIO_TEXT);
		// Visitor View is the search-backed surface a person sees; that is the
		// whole difference from API View.
		expect(body.input[0].web_search).toBe(true);
		// The credential belongs in the header and nowhere else.
		expect(rawBody).not.toContain(API_KEY);

		expect(outcome).toEqual({
			dispatchKey: permit.dispatchKey,
			status: "SUCCEEDED",
			validity: "VALID",
			rawResponseReference: "brightdata:s_01HZY",
			answer: { text: "Answer text mentioning two studios.", retainUntil: expect.any(Date) },
			sources: [{ url: "https://example.test/spa", domain: "example.test", title: "Spa guide" }],
			costUsd: estimateRunCostUsd("brightdata", true),
			costBasis: "estimated",
			provider: "brightdata",
		});
		// A scraped surface reports no token accounting, so none is claimed.
		expect(outcome.tokenUsage).toBeUndefined();
		expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
	});

	it("prefers a provider-reported cost and falls back to the local estimate", async () => {
		const reported = await adapterWith(respondWith(jsonResponse(successPayload({ cost: 0.12 })))).execute(permitFor());
		expect(reported.costUsd).toBe(0.12);

		const estimated = await adapterWith(respondWith(jsonResponse(successPayload()))).execute(permitFor());
		expect(estimated.costUsd).toBe(estimateRunCostUsd("brightdata", true));

		expect(resolveBrightDataCost(0.12)).toEqual({ costUsd: 0.12, basis: "provider_reported" });
		expect(resolveBrightDataCost(undefined).basis).toBe("estimated");
		expect(resolveBrightDataCost(-1).basis).toBe("estimated");
	});

	it("references the response instead of storing it, and digests it when there is no request id", async () => {
		const outcome = await adapterWith(respondWith(jsonResponse(successPayload({ snapshot_id: null })))).execute(
			permitFor(),
		);

		expect(outcome.rawResponseReference).toMatch(/^brightdata:sha256:[0-9a-f]{64}$/);
		expect(outcome.rawResponseReference).not.toContain("Answer text");
		expect(outcome.rawResponseReference).not.toContain("example.test");
	});

	it("records an answered-nothing response as empty and an unrecognized one as malformed", async () => {
		for (const payload of [{ answer_text: "   " }, { answer: "" }]) {
			const outcome = await adapterWith(respondWith(jsonResponse(payload))).execute(permitFor());
			expect(outcome).toMatchObject({ status: "INVALID", validity: "INVALID", invalidReason: "EMPTY_RESPONSE" });
			expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
		}

		// A shape with no answer field, an empty snapshot array, and a body that
		// is not JSON at all are all "not understood" — never an empty answer,
		// and never stringified into one.
		for (const response of [
			jsonResponse({ status: "unexpected shape" }),
			jsonResponse([]),
			new Response("<html>gateway error page</html>", { status: 200 }),
		]) {
			const outcome = await adapterWith(respondWith(response)).execute(permitFor());
			expect(outcome).toMatchObject({ status: "INVALID", validity: "INVALID", invalidReason: "MALFORMED_RESPONSE" });
			expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
		}
	});

	it("classifies a Perplexity auth-wall error row as provider refusal", async () => {
		const outcome = await adapterWith(
			respondWith(
				jsonResponse({
					timestamp: "2026-09-05T00:00:00.000Z",
					input: { prompt: SCENARIO_TEXT },
					error: "Auth wall: sign-up prompt detected",
					error_code: "AUTH_WALL",
				}),
			),
		).execute(permitFor({ systemId: "Perplexity" }));

		expect(outcome).toMatchObject({
			status: "INVALID",
			validity: "INVALID",
			invalidReason: "PROVIDER_ERROR_ROW",
			provider: "brightdata",
		});
		expect(outcome.rawResponseReference).toMatch(/^brightdata:sha256:[0-9a-f]{64}$/);
		expect(JSON.stringify(outcome)).not.toContain("Auth wall");
		expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
	});

	it("does not treat a visible login button as an auth wall when an answer is available", async () => {
		const outcome = await adapterWith(
			respondWith(
				jsonResponse({
					answer_text_markdown: "AVLI is recommended for Greek dining.",
					login_button_visible: true,
					citations: [{ url: "https://avlibali.com/", title: "AVLI" }],
				}),
			),
		).execute(permitFor({ systemId: "Perplexity" }));

		expect(outcome).toMatchObject({
			status: "SUCCEEDED",
			validity: "VALID",
			answer: { text: "AVLI is recommended for Greek dining." },
			sources: [{ url: "https://avlibali.com/", domain: "avlibali.com", title: "AVLI" }],
		});
		expect(outcome.invalidReason).toBeUndefined();
	});

	it("keeps a structured auth-wall row invalid even when it has no error text", async () => {
		const outcome = await adapterWith(
			respondWith(
				jsonResponse([
					{
						timestamp: "2026-09-05T00:00:00.000Z",
						input: { prompt: SCENARIO_TEXT },
						error_code: "AUTH_WALL",
					},
				]),
			),
		).execute(permitFor({ systemId: "Perplexity" }));

		expect(outcome.invalidReason).toBe("PROVIDER_ERROR_ROW");
		expect(outcome.answer).toBeUndefined();
	});

	it("keeps only the sources the payload actually showed", () => {
		const sources = extractBrightDataSources({
			citations: [
				{ url: "https://example.test/spa", title: " Spa guide " },
				{ url: "https://example.test/spa" },
				{ title: "no url here" },
				{ url: "javascript:alert(1)" },
				{ url: "not a url" },
			],
			links_attached: ["https://www.other.test/list"],
			sources: "not an array",
		});

		expect(sources).toEqual([
			{ url: "https://example.test/spa", domain: "example.test", title: "Spa guide" },
			{ url: "https://www.other.test/list", domain: "other.test" },
		]);
		// An answer that showed no sources yields none — nothing is inferred from
		// the answer text.
		expect(parseBrightDataAnswer({ answer_text: "Two studios stand out." })?.sources).toEqual([]);
		expect(parseBrightDataAnswer({ answer_text: "x" })?.providerRequestId).toBeUndefined();
		expect(parseBrightDataAnswer({ nothing: "known" })).toBeNull();
	});

	it("recovers displayed Perplexity sources from answer-section HTML", () => {
		const sources = extractBrightDataSources({
			citations: [],
			links_attached: [],
			sources: [],
			answer_section_html: [
				'<a href="https://nostimobali.com/">1</a>',
				'<a href="https://www.tripadvisor.com/Restaurant_Review">2</a>',
				'<a href="https://nostimobali.com/">duplicate</a>',
				'<a href="https://www.perplexity.ai/search/internal">provider page</a>',
				'<a href="javascript:alert(1)">not a source</a>',
			].join(""),
		});

		expect(sources).toEqual([
			{ url: "https://nostimobali.com/", domain: "nostimobali.com" },
			{ url: "https://www.tripadvisor.com/Restaurant_Review", domain: "tripadvisor.com" },
		]);
	});

	it("collects the answer a receipt stands for instead of refusing the receipt", async () => {
		// The scrape call replies with a handle when the collector runs long.
		// Stopping there would record a produced, billed answer as unreadable.
		const responses = [
			jsonResponse({ message: "Timeout, use snapshot_id to fetch", snapshot_id: "s_77" }),
			jsonResponse({ status: "ready" }),
			jsonResponse([{ answer_text_markdown: "KORA Food Hall is the one purpose-built option." }]),
		];
		const seen: string[] = [];
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			seen.push(String(input));
			return responses.shift() as Response;
		}) as unknown as typeof fetch;

		const outcome = await adapterWith(fetchImpl, { snapshotPollMs: 0 }).execute(permitFor());
		expect(outcome).toMatchObject({ status: "SUCCEEDED", validity: "VALID" });
		// The run stays auditable on the provider's side by the handle it was given.
		expect(outcome.rawResponseReference).toBe("brightdata:s_77");
		expect(seen[1]).toContain("/progress/s_77");
		expect(seen[2]).toContain("/snapshot/s_77");
	});

	it("records a snapshot that never arrives as unfinished, not as an empty answer", async () => {
		vi.useFakeTimers();
		try {
			const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
				String(input).includes("/scrape")
					? jsonResponse({ message: "queued", snapshot_id: "s_78" })
					: jsonResponse({ status: "running" }),
			) as unknown as typeof fetch;

			const outcomePromise = adapterWith(fetchImpl, { snapshotPollMs: 10, snapshotTimeoutMs: 100 }).execute(
				permitFor(),
			);
			await vi.advanceTimersByTimeAsync(100);
			const outcome = await outcomePromise;
			expect(outcome).toMatchObject({ status: "INVALID", invalidReason: "SNAPSHOT_NOT_READY" });
			// Silence from the provider must never reach the ledger as evidence.
			expect(outcome.measurement).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it("lets the owner pin the confirmed request and response shape without editing the adapter", async () => {
		const fetchImpl = respondWith(
			new Response(JSON.stringify({ visible_answer: "Confirmed answer." }), { status: 200 }),
		);

		const outcome = await adapterWith(fetchImpl, {
			buildRequestBody: (input: { system: string; prompt: string }) => ({
				collector: input.system,
				query: input.prompt,
			}),
			parseAnswer: (raw: unknown) => ({
				answerText: (raw as { visible_answer: string }).visible_answer,
				sources: [],
				providerRequestId: "req-42",
			}),
		}).execute(permitFor());

		const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
		expect(body).toEqual({ collector: "chatgpt", query: SCENARIO_TEXT });
		expect(outcome).toMatchObject({ status: "SUCCEEDED", rawResponseReference: "brightdata:req-42" });

		// A parser that throws on an unfamiliar payload is a refusal, not a crash.
		// The payload carries no handle, so there is nothing to collect and the
		// refusal is about the shape rather than about a snapshot.
		const thrown = await adapterWith(respondWith(jsonResponse({ unfamiliar: true })), {
			parseAnswer: () => {
				throw new Error("unfamiliar payload");
			},
		}).execute(permitFor());
		expect(thrown).toMatchObject({ status: "INVALID", invalidReason: "MALFORMED_RESPONSE" });
	});

	it("maps provider HTTP errors to a failed outcome carrying only the status code", async () => {
		for (const status of [429, 500]) {
			const fetchImpl = respondWith(() => jsonResponse({ error: `boom ${API_KEY}` }, status));
			const outcome = await adapterWith(fetchImpl).execute(permitFor());

			// §10.2: the request was dispatched, so a worst-case estimated charge
			// is recorded rather than letting a broken cycle ledger as $0.
			expect(outcome).toEqual({
				dispatchKey: permitFor().dispatchKey,
				status: "FAILED",
				validity: "INVALID",
				invalidReason: `PROVIDER_HTTP_${status}`,
				costUsd: estimateRunCostUsd("brightdata", true),
				costBasis: "estimated",
				provider: "brightdata",
			});
			// The provider's error body is never read into the run row.
			expect(JSON.stringify(outcome)).not.toContain(API_KEY);
			expect(JSON.stringify(outcome)).not.toContain("boom");
		}
	});

	it("aborts a request that outlives its timeout and records it as invalid", async () => {
		const fetchImpl = vi.fn(
			(_input: RequestInfo | URL, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						const error = new Error("The operation was aborted");
						error.name = "AbortError";
						reject(error);
					});
				}),
		);

		const outcome = await adapterWith(fetchImpl, { timeoutMs: 5 }).execute(permitFor());

		expect(outcome).toMatchObject({ status: "INVALID", validity: "INVALID", invalidReason: "TIMEOUT" });
		expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
	});

	it("caps the timeout at the permit's remaining lifetime", async () => {
		const fetchImpl = vi.fn(
			(_input: RequestInfo | URL, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						const error = new Error("aborted");
						error.name = "AbortError";
						reject(error);
					});
				}),
		);
		const permit = permitFor({ expiresAt: new Date(now().getTime() + 3) });

		// The adapter's own timeout is far longer than the permit; the permit wins.
		const outcome = await adapterWith(fetchImpl, { timeoutMs: 600_000 }).execute(permit);

		expect(outcome).toMatchObject({ invalidReason: "TIMEOUT" });
	});

	it("maps a transport failure to a failed outcome without quoting the error", async () => {
		const fetchImpl = vi.fn(async (): Promise<Response> => {
			throw new Error(`socket hang up while sending Authorization: Bearer ${API_KEY}`);
		});

		const outcome = await adapterWith(fetchImpl).execute(permitFor());

		expect(outcome).toEqual({
			dispatchKey: permitFor().dispatchKey,
			status: "FAILED",
			validity: "INVALID",
			invalidReason: "TRANSPORT_ERROR",
			costUsd: estimateRunCostUsd("brightdata", true),
			costBasis: "estimated",
			provider: "brightdata",
		});
	});

	it("stops reading a response that exceeds the size limit", async () => {
		const payload = successPayload({ answer_text_markdown: "x".repeat(4000) });
		const outcome = await adapterWith(respondWith(jsonResponse(payload)), { maxResponseBytes: 128 }).execute(
			permitFor(),
		);

		expect(outcome).toMatchObject({ status: "INVALID", invalidReason: "RESPONSE_TOO_LARGE" });
	});

	it("does not contact the provider when the scenario text cannot be resolved", async () => {
		const fetchImpl = respondWith(jsonResponse(successPayload()));
		const outcome = await adapterWith(fetchImpl, {
			resolveScenarioText: () => {
				throw new Error("Not found: scenario is outside AuthContext tenant");
			},
		}).execute(permitFor());

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(outcome).toMatchObject({ status: "FAILED", invalidReason: "SCENARIO_TEXT_UNAVAILABLE" });
		const empty = await adapterWith(fetchImpl, { resolveScenarioText: () => "  " }).execute(permitFor());
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(empty).toMatchObject({ status: "FAILED", invalidReason: "SCENARIO_TEXT_UNAVAILABLE" });
	});

	it("plans without transport and refuses a permit from another channel", async () => {
		const fetchImpl = respondWith(jsonResponse(successPayload()));
		const adapter = adapterWith(fetchImpl);

		expect(adapter.channel).toBe("visitor_view");
		await expect(
			adapter.measure({
				cycleId: "cycle-1",
				organizationId: "org-1",
				scenarioId: "scenario-1",
				channel: "visitor_view",
				dispatchKey: "k1",
			}),
		).resolves.toEqual({ dispatchKey: "k1", status: "queued" });
		await expect(
			adapter.measure({
				cycleId: "cycle-1",
				organizationId: "org-1",
				scenarioId: "scenario-1",
				channel: "api_view",
				dispatchKey: "k1",
			}),
		).rejects.toThrow("MEASUREMENT_CHANNEL_MISMATCH");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("measures only surfaces the catalog sells, over a transport that cannot leak the key", () => {
		expect(Object.values(brightDataVisitorSurface).every((surface) => visitorSurfaces.includes(surface))).toBe(true);

		const fetchImpl = respondWith(jsonResponse(successPayload()));
		expect(() => adapterWith(fetchImpl, { apiKey: " " })).toThrow("BRIGHTDATA_API_KEY_MISSING");
		expect(() => adapterWith(fetchImpl, { endpoint: "" })).toThrow("BRIGHTDATA_ENDPOINT_MISSING");
		// A plaintext endpoint would put the credential on the wire.
		expect(() => adapterWith(fetchImpl, { endpoint: "http://api.brightdata.com/request" })).toThrow(
			"BRIGHTDATA_ENDPOINT_INSECURE",
		);
		expect(() => adapterWith(fetchImpl, { datasetId: "  " })).toThrow("BRIGHTDATA_DATASET_ID_MISSING");
		expect(() => adapterWith(fetchImpl, { system: "claude" as BrightDataVisitorSystem })).toThrow(
			"BRIGHTDATA_SYSTEM_UNSUPPORTED",
		);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("keeps the API token out of every outcome and every error it raises", async () => {
		const outcomes: RunOutcome[] = [];
		const failures: string[] = [];
		const cases: Array<typeof fetch> = [
			respondWith(jsonResponse(successPayload())),
			respondWith(() => jsonResponse({ error: `token was ${API_KEY}` }, 401)),
			respondWith(() => new Response(`not json ${API_KEY}`, { status: 200 })),
			respondWith(() => jsonResponse({ answer_text: `echoed request with ${API_KEY}` })),
			vi.fn(async (): Promise<Response> => {
				throw new Error(`ECONNRESET with Bearer ${API_KEY}`);
			}),
		];
		for (const fetchImpl of cases) {
			try {
				outcomes.push(await adapterWith(fetchImpl).execute(permitFor()));
			} catch (error) {
				failures.push(error instanceof Error ? error.message : String(error));
			}
		}

		expect(outcomes).toHaveLength(cases.length);
		// Even an answer that quotes the token back is stored only as a digest.
		expect(`${JSON.stringify(outcomes)}${failures.join("|")}`).not.toContain(API_KEY);
	});

	it("stays behind the owner gate: the adapter cannot be selected by configuration", () => {
		expect(inertMeasurementAdapters as readonly string[]).not.toContain("brightdata");
		expect(() => assertAdapterAllowed("brightdata", ["noop"])).toThrow("SELENA_ADAPTER_NOT_REGISTERED");
		// Registering it in the worker is still not enough to select it.
		expect(() => assertAdapterAllowed("brightdata", ["noop", "brightdata"])).toThrow(
			"SELENA_LIVE_ADAPTER_REQUIRES_OWNER_GO",
		);
	});

	it("carries the displayed sources on the outcome, with or without extraction", async () => {
		const payload = successPayload({
			citations: [{ url: "https://guide.example/best-spas", title: "Best spas" }],
			links_attached: ["https://maps.example/place/1", "https://guide.example/best-spas"],
			sources: [{ url: "not a url" }, { url: "ftp://guide.example/file" }],
		});
		const outcome = await adapterWith(respondWith(jsonResponse(payload))).execute(permitFor());
		expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
		expect(outcome.sources).toEqual([
			{ url: "https://guide.example/best-spas", domain: "guide.example", title: "Best spas" },
			{ url: "https://maps.example/place/1", domain: "maps.example" },
		]);
		expect(outcome.measurement).toBeUndefined();

		const bare = await adapterWith(respondWith(jsonResponse(successPayload({ citations: [] })))).execute(permitFor());
		expect(bare.sources).toBeUndefined();
	});

	it("attaches a measurement when an extraction context is supplied, and stays silent without one", async () => {
		const payload = successPayload({
			answer_text_markdown: "1. KORA Food Hall\n2. Rival Cafe",
			citations: [{ url: "https://korafoodhall.com/menu", title: "Menu" }],
		});
		const extraction = {
			brandTerms: ["KORA Food Hall"],
			ownedDomains: ["korafoodhall.com"],
			competitors: [{ name: "Rival Cafe", terms: ["Rival Cafe"] }],
			language: "en",
			region: "ID",
		};

		const withContext = await adapterWith(respondWith(jsonResponse(payload)), {
			resolveExtractionContext: () => extraction,
		}).execute(permitFor());
		expect(() => runOutcomeSchema.parse(withContext)).not.toThrow();
		expect(withContext.measurement).toEqual({
			system: "ChatGPT",
			language: "en",
			region: "ID",
			extractorVersion: "selena-extract/1",
			captureMode: "live_search",
			brand: "KORA Food Hall",
			mention: true,
			position: 1,
			ownedCitation: true,
			citations: [{ url: "https://korafoodhall.com/menu", domain: "korafoodhall.com" }],
			competitors: [{ name: "Rival Cafe", position: 2 }],
			factualErrors: [],
		});

		const withoutContext = await adapterWith(respondWith(jsonResponse(payload))).execute(permitFor());
		expect(withoutContext.measurement).toBeUndefined();
	});

	it("attributes evidence to the surface the permit authorized, so the executor keeps it", async () => {
		const extraction = {
			brandTerms: ["KORA Food Hall"],
			ownedDomains: ["korafoodhall.com"],
			competitors: [],
			language: "en",
			region: "ID",
		};
		for (const [system, surface] of Object.entries(brightDataVisitorSurface)) {
			const permit = permitFor({ systemId: surface });
			const outcome = await executePermit({
				permit,
				adapter: adapterWith(respondWith(jsonResponse(successPayload())), {
					system,
					resolveExtractionContext: () => extraction,
				}),
				cycleState: {
					activeMaintenanceJobs: 0,
					activeCohortJobs: 0,
					cohortId: permit.cycleId,
					expectedJobs: 1,
					expectedProviderCalls: 1,
					seenCohortIds: new Set<string>(),
					globalEmergencyStop: false,
					orderStopped: false,
				} satisfies ControlledCycleState,
				config: { enabled: true, adapter: `brightdata-${system}` },
				now: now(),
			});
			expect(outcome.measurement?.system).toBe(surface);
		}
	});

	it("keeps a paid answer VALID when the extraction context cannot be resolved", async () => {
		const outcome = await adapterWith(respondWith(jsonResponse(successPayload())), {
			resolveExtractionContext: () => {
				throw new Error("LOCK_UNREACHABLE");
			},
		}).execute(permitFor());
		expect(outcome.status).toBe("SUCCEEDED");
		expect(outcome.validity).toBe("VALID");
		expect(outcome.measurement).toBeUndefined();
	});

	it("records a charge for an empty or malformed answer instead of a $0 ledger row", async () => {
		const emptyFetch = respondWith(jsonResponse(successPayload({ answer_text_markdown: "  " })));
		const empty = await adapterWith(emptyFetch).execute(permitFor());
		expect(empty.invalidReason).toBe("EMPTY_RESPONSE");
		expect(emptyFetch).toHaveBeenCalledTimes(1);
		expectCostUsd(empty, expectedBrightDataCost(1));
		expect(empty.costBasis).toBe("estimated");
		expect(empty.provider).toBe("brightdata");

		const malformedFetch = respondWith(jsonResponse({ unexpected: true }));
		const malformed = await adapterWith(malformedFetch).execute(permitFor());
		expect(malformed.invalidReason).toBe("MALFORMED_RESPONSE");
		expect(malformedFetch).toHaveBeenCalledTimes(1);
		expectCostUsd(malformed, expectedBrightDataCost(1));
		expect(malformed.provider).toBe("brightdata");
	});

	it("does not retry a failed provider call", async () => {
		// A transport error is a different problem than an unusable answer;
		// retrying it here would be the adapter guessing at a fix instead of
		// reporting what actually happened.
		const throwingFetch = vi.fn(async () => {
			throw new Error("ECONNRESET");
		});
		const outcome = await adapterWith(throwingFetch).execute(permitFor());
		expect(throwingFetch).toHaveBeenCalledTimes(1);
		expect(outcome.status).toBe("FAILED");
		expect(outcome.invalidReason).toBe("TRANSPORT_ERROR");

		// Nor a provider-side HTTP error.
		const httpErrorFetch = respondWith(new Response("server error", { status: 500 }));
		const outcome2 = await adapterWith(httpErrorFetch).execute(permitFor());
		expect(httpErrorFetch).toHaveBeenCalledTimes(1);
		expect(outcome2.invalidReason).toBe("PROVIDER_HTTP_500");
	});

	it("drops a contract-invalid extraction instead of failing the paid run", async () => {
		const outcome = await adapterWith(respondWith(jsonResponse(successPayload())), {
			resolveExtractionContext: () => ({
				brandTerms: ["KORA"],
				ownedDomains: [],
				competitors: [],
				language: "",
			}),
		}).execute(permitFor());
		expect(outcome.status).toBe("SUCCEEDED");
		expect(outcome.validity).toBe("VALID");
		expect(outcome.measurement).toBeUndefined();
	});
});
