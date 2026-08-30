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

/** A fixed sequence of responses, one per call — for tests that exercise the retry loop's attempt-by-attempt behavior, where each attempt must see a different answer. */
function sequenceOf(...responses: Response[]) {
	let i = 0;
	return vi.fn(async (): Promise<Response> => {
		if (i >= responses.length) throw new Error("TEST_SEQUENCE_EXHAUSTED: more attempts than fixtures");
		const response = responses[i];
		i += 1;
		return response;
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
				},
			],
		});
		expect(globalFetch).not.toHaveBeenCalled();
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
			collectionMode: "trigger",
			snapshotPollMs: 0,
		}).execute(permitFor({ systemId: "Perplexity" }));

		const triggerUrl = new URL(seen[0]?.url ?? "");
		expect(triggerUrl.pathname).toBe("/datasets/v3/trigger");
		expect(triggerUrl.searchParams.get("dataset_id")).toBe(DATASET_ID);
		expect(triggerUrl.searchParams.get("include_errors")).toBe("true");
		expect(JSON.parse(String(seen[0]?.init?.body))).toEqual([
			{ url: "https://www.perplexity.ai", prompt: SCENARIO_TEXT, country: "", index: 1 },
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

	it("bounds a stalled snapshot status request", async () => {
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

		const outcome = await adapterWith(fetchImpl, {
			system: "perplexity",
			collectionMode: "trigger",
			snapshotTimeoutMs: 5,
			snapshotPollMs: 0,
		}).execute(permitFor({ systemId: "Perplexity" }));

		expect(outcome).toMatchObject({
			status: "INVALID",
			invalidReason: "SNAPSHOT_NOT_READY",
			rawResponseReference: "brightdata:s_stalled",
		});
		expect(fetchImpl).toHaveBeenCalledTimes(3);
		expect(String(fetchSpy.mock.calls[2]?.[0])).toContain("/snapshot/s_stalled/cancel");
	});

	it("keeps polling a Perplexity snapshot beyond five minutes", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
		const readyAt = Date.now() + 6 * 60_000;
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
			await vi.advanceTimersByTimeAsync(6 * 60_000);
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
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
			String(input).includes("/scrape")
				? jsonResponse({ message: "queued", snapshot_id: "s_78" })
				: jsonResponse({ status: "running" }),
		) as unknown as typeof fetch;

		const outcome = await adapterWith(fetchImpl, { snapshotPollMs: 0, snapshotTimeoutMs: 0 }).execute(permitFor());
		expect(outcome).toMatchObject({ status: "INVALID", invalidReason: "SNAPSHOT_NOT_READY" });
		// Silence from the provider must never reach the ledger as evidence.
		expect(outcome.measurement).toBeUndefined();
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
		// A single attempt that keeps coming back empty/malformed is retried up
		// to MAX_ATTEMPTS times (see the retry loop above `execute`), and every
		// attempt that reaches the provider is billed — so the charge here is
		// four attempts' worth, not one.
		const empty = await adapterWith(respondWith(jsonResponse(successPayload({ answer_text_markdown: "  " })))).execute(
			permitFor(),
		);
		expect(empty.invalidReason).toBe("EMPTY_RESPONSE");
		expectCostUsd(empty, expectedBrightDataCost(4));
		expect(empty.costBasis).toBe("estimated");
		expect(empty.provider).toBe("brightdata");

		const malformed = await adapterWith(respondWith(jsonResponse({ unexpected: true }))).execute(permitFor());
		expect(malformed.invalidReason).toBe("MALFORMED_RESPONSE");
		expectCostUsd(malformed, expectedBrightDataCost(4));
		expect(malformed.provider).toBe("brightdata");
	});

	it("retries an empty or malformed answer and keeps a real one that follows", async () => {
		// EMPTY_RESPONSE, then a real answer on the second attempt: the run
		// succeeds, and the ledger carries the cost of both calls, not just
		// the one that finally worked.
		const fetchImpl = sequenceOf(
			jsonResponse(successPayload({ answer_text_markdown: "   " })),
			jsonResponse(successPayload()),
		);
		const outcome = await adapterWith(fetchImpl).execute(permitFor());

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(outcome.status).toBe("SUCCEEDED");
		expect(outcome.validity).toBe("VALID");
		expectCostUsd(outcome, expectedBrightDataCost(2));

		// MALFORMED_RESPONSE first, a real answer second — the other retriable
		// reason, same recovery.
		const fetchImpl2 = sequenceOf(jsonResponse({ unexpected: true }), jsonResponse(successPayload()));
		const outcome2 = await adapterWith(fetchImpl2).execute(permitFor());
		expect(fetchImpl2).toHaveBeenCalledTimes(2);
		expect(outcome2.status).toBe("SUCCEEDED");
	});

	it("gives up after three retries and reports the last attempt's empty outcome", async () => {
		const fetchImpl = respondWith(jsonResponse(successPayload({ answer_text_markdown: "   " })));
		const outcome = await adapterWith(fetchImpl).execute(permitFor());

		// One original attempt plus three retries — never a fifth call.
		expect(fetchImpl).toHaveBeenCalledTimes(4);
		expect(outcome.invalidReason).toBe("EMPTY_RESPONSE");
		expectCostUsd(outcome, expectedBrightDataCost(4));
	});

	it("does not retry a failure that is not an empty or malformed answer", async () => {
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
