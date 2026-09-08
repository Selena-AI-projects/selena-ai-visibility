import { createHash } from "node:crypto";
import {
	assertAdapterAllowed,
	measurementAdapterNamesFor,
	type RunOutcome,
	runOutcomeSchema,
	visitorSurfaces,
} from "@workspace/selena-visibility-contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelenaExecutablePermit } from "../selena-measurement";
import { estimateRunCostUsd } from "../usage/cost";
import {
	buildOlostepRequestBody,
	createOlostepAdapter,
	describeUnreadableOlostepPayload,
	OLOSTEP_DEFAULT_ENDPOINT,
	OLOSTEP_DEFAULT_JOB_TIMEOUT_MS,
	olostepCredentialFingerprint,
	olostepParser,
	olostepVisitorSurface,
	parseOlostepAnswer,
	resolveOlostepCost,
} from "./olostep-measurement-adapter";

const API_KEY = "olostep-owner-secret-key-0123456789";
const BATCH_ID = "batch_7f3a9c2e1d";
const RETRIEVE_ID = "retrieve_5b8d2e4f6a";
const SCENARIO_TEXT = "What are the best food halls in Ubud, Bali?";

function permitFor(overrides: Partial<SelenaExecutablePermit> = {}): SelenaExecutablePermit {
	return {
		id: "permit-1",
		organizationId: "org-1",
		cycleId: "cycle-1",
		scenarioId: "scenario-1",
		// The catalog's name for the surface, which is what a real permit carries.
		systemId: "Perplexity",
		channel: "VISITOR",
		dispatchKey: "order-1:scenario-1:Perplexity:0:1",
		expiresAt: new Date("2026-09-08T16:00:00.000Z"),
		consumedAt: null,
		...overrides,
	};
}

const now = () => new Date("2026-09-08T15:00:00.000Z");

function jsonResponse(payload: unknown, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "content-type": "application/json", ...headers },
	});
}

/** The parser's output in the fields the registry reads, reduced to what is read. */
function parsedContent(overrides: Record<string, unknown> = {}) {
	return {
		model: "perplexity",
		answer_markdown: "- Kafe Ubud\n- Hujan Locale\n- Ubud Food Court",
		sources: [
			{ url: "https://example.test/ubud-food-halls", title: "Food halls in Ubud" },
			{ url: "https://www.example.test/ubud-food-halls", title: "Duplicate by www" },
			{ url: "https://guide.test/kafe", label: "Kafe" },
			"https://plain.test/list",
			{ url: "not a url" },
			{ url: "https://example.test/ubud-food-halls", title: "Repeated" },
		],
		search_queries: [SCENARIO_TEXT],
		...overrides,
	};
}

/** The retrieve body: the parser's output travels as a JSON string under json_content. */
function retrieveBody(content: unknown = parsedContent(), asString = true) {
	return { json_content: asString ? JSON.stringify(content) : content, html_content: null, markdown_content: null };
}

function itemsListing() {
	return { items: [{ url: olostepParser.perplexity.url(SCENARIO_TEXT), custom_id: "1", retrieve_id: RETRIEVE_ID }] };
}

/**
 * A transport that answers by route: the batch creation, then each status
 * poll in order, then the item listing, then the retrieval. Anything else is
 * a test bug and throws.
 */
function routed(
	routes: {
		submit?: Response | (() => Response) | Error;
		status?: Array<Response | Error>;
		items?: Response | (() => Response) | Error;
		retrieve?: Response | (() => Response) | Error;
	},
	endpoint = OLOSTEP_DEFAULT_ENDPOINT,
) {
	const status = [...(routes.status ?? [])];
	const materialize = (response: Response | (() => Response) | Error | undefined, what: string): Response => {
		if (response === undefined) throw new Error(`TEST_NO_${what}_ROUTE`);
		if (response instanceof Error) throw response;
		return typeof response === "function" ? response() : response;
	};
	return vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = String(input);
		if (url === `${endpoint}/batches` && init?.method === "POST") return materialize(routes.submit, "SUBMIT");
		if (url === `${endpoint}/batches/${BATCH_ID}/items?limit=50`) return materialize(routes.items, "ITEMS");
		if (url === `${endpoint}/retrieve?retrieve_id=${RETRIEVE_ID}&formats=json`)
			return materialize(routes.retrieve, "RETRIEVE");
		if (url === `${endpoint}/batches/${BATCH_ID}`) {
			const next = status.shift();
			if (next === undefined) throw new Error("TEST_STATUS_SEQUENCE_EXHAUSTED");
			return materialize(next, "STATUS");
		}
		throw new Error(`TEST_UNEXPECTED_URL:${url}`);
	});
}

function adapterWith(fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}) {
	return createOlostepAdapter({
		apiKey: API_KEY,
		system: "perplexity",
		fetchImpl,
		resolveScenarioText: () => SCENARIO_TEXT,
		now,
		pollMs: 0,
		...overrides,
	});
}

function happyPath(content: Record<string, unknown> = {}, asString = true) {
	return routed({
		submit: jsonResponse({ id: BATCH_ID, status: "in_progress", total_urls: 1 }),
		status: [
			jsonResponse({ id: BATCH_ID, status: "in_progress" }),
			jsonResponse({ id: BATCH_ID, status: "completed" }),
		],
		items: jsonResponse(itemsListing()),
		retrieve: jsonResponse(retrieveBody(parsedContent(content), asString)),
	});
}

function expectCostUsd(outcome: RunOutcome, expected: number) {
	if (typeof outcome.costUsd !== "number") throw new Error("Expected the provider attempt to record a numeric cost");
	expect(outcome.costUsd).toBeCloseTo(expected);
}

function expectedOlostepCost() {
	const cost = estimateRunCostUsd("olostep", true);
	if (cost === null) throw new Error("Expected Olostep to have a configured cost estimate");
	return cost;
}

// Nothing in these tests may reach a network: the global is replaced with a
// throwing stub so an accidental use of ambient fetch fails loudly instead of
// quietly spending the owner's Olostep credits.
let globalFetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
	globalFetch = vi.fn(() => {
		throw new Error("NETWORK_FORBIDDEN_IN_TESTS");
	});
	vi.stubGlobal("fetch", globalFetch);
	vi.spyOn(console, "info").mockImplementation(() => {});
	vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("Olostep measurement adapter", () => {
	it("creates the registry's batch: one item under the Perplexity parser, carrying the question and nothing else", () => {
		expect(buildOlostepRequestBody({ system: "perplexity", prompt: SCENARIO_TEXT })).toEqual({
			items: [{ url: `https://www.perplexity.ai/?q=${encodeURIComponent(SCENARIO_TEXT)}`, custom_id: "1" }],
			parser: { id: "@olostep/perplexity-results" },
		});
	});

	it("creates the batch, polls to completion, reads its item and retrieves the answer with the sources it showed", async () => {
		const fetchImpl = happyPath();
		const permit = permitFor();

		const outcome = await adapterWith(fetchImpl).execute(permit);

		expect(globalFetch).not.toHaveBeenCalled();
		// One creation, two polls, one listing, one retrieval: the batch is the
		// paid call, and asking after it is not another one.
		expect(fetchImpl).toHaveBeenCalledTimes(5);
		const [submitUrl, submitInit] = fetchImpl.mock.calls[0] ?? [];
		expect(submitUrl).toBe(`${OLOSTEP_DEFAULT_ENDPOINT}/batches`);
		expect(submitInit?.method).toBe("POST");
		const headers = submitInit?.headers as Record<string, string>;
		expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
		expect(headers["Content-Type"]).toBe("application/json");
		const rawBody = String(submitInit?.body);
		expect(JSON.parse(rawBody)).toEqual(buildOlostepRequestBody({ system: "perplexity", prompt: SCENARIO_TEXT }));
		// The key belongs in the header and nowhere else.
		expect(rawBody).not.toContain(API_KEY);
		for (const [url] of fetchImpl.mock.calls) expect(String(url)).not.toContain(API_KEY);

		expect(outcome).toEqual({
			dispatchKey: permit.dispatchKey,
			status: "SUCCEEDED",
			validity: "VALID",
			rawResponseReference: `olostep:${BATCH_ID}/${RETRIEVE_ID}`,
			answer: { text: "- Kafe Ubud\n- Hujan Locale\n- Ubud Food Court", retainUntil: expect.any(Date) },
			// Deduplicated, http(s) only, titled under either name the parser
			// uses — exactly what the surface displayed.
			sources: [
				{ url: "https://example.test/ubud-food-halls", domain: "example.test", title: "Food halls in Ubud" },
				{ url: "https://www.example.test/ubud-food-halls", domain: "example.test", title: "Duplicate by www" },
				{ url: "https://guide.test/kafe", domain: "guide.test", title: "Kafe" },
				{ url: "https://plain.test/list", domain: "plain.test" },
			],
			costUsd: expectedOlostepCost(),
			costBasis: "estimated",
			provider: "olostep",
		});
		// A scraped surface reports no token accounting, so none is claimed.
		expect(outcome.tokenUsage).toBeUndefined();
		expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
	});

	it("reads json_content whether it arrives as a JSON string or as the object itself", async () => {
		const asObject = await adapterWith(happyPath({}, false)).execute(permitFor());
		expect(asObject.status).toBe("SUCCEEDED");
		expect(asObject.answer?.text).toBe("- Kafe Ubud\n- Hujan Locale\n- Ubud Food Court");
	});

	it("skips polling when the creation already reports the batch completed", async () => {
		const fetchImpl = routed({
			submit: jsonResponse({ id: BATCH_ID, status: "completed" }),
			items: jsonResponse(itemsListing()),
			retrieve: jsonResponse(retrieveBody()),
		});
		const outcome = await adapterWith(fetchImpl).execute(permitFor());
		expect(outcome.status).toBe("SUCCEEDED");
		expect(fetchImpl).toHaveBeenCalledTimes(3);
	});

	it("keeps polling through transient statuses and gives up on a failed batch with the charge recorded", async () => {
		const faulted = await adapterWith(
			routed({
				submit: jsonResponse({ id: BATCH_ID, status: "in_progress" }),
				status: [
					new Response(null, { status: 204 }),
					new Response("busy", { status: 503 }),
					jsonResponse({ id: BATCH_ID, status: "failed" }),
				],
			}),
		).execute(permitFor());
		expect(faulted).toMatchObject({
			status: "INVALID",
			validity: "INVALID",
			invalidReason: "JOB_FAULTED",
			rawResponseReference: `olostep:${BATCH_ID}`,
		});
		expectCostUsd(faulted, expectedOlostepCost());
		expect(faulted.provider).toBe("olostep");
	});

	it("records a batch that never completes inside its budget as unfinished, keeping the handle", async () => {
		const pendingForever = routed({
			submit: jsonResponse({ id: BATCH_ID, status: "in_progress" }),
			status: Array.from({ length: 200 }, () => jsonResponse({ id: BATCH_ID, status: "in_progress" })),
		});
		const outcome = await adapterWith(pendingForever, { jobTimeoutMs: 5 }).execute(permitFor());
		expect(outcome).toMatchObject({
			status: "INVALID",
			validity: "INVALID",
			invalidReason: "JOB_NOT_READY",
			rawResponseReference: `olostep:${BATCH_ID}`,
		});
		expectCostUsd(outcome, expectedOlostepCost());
		expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
	});

	it("budgets a job for longer than the slowest answer observed, as the second-probe decision requires", () => {
		// The probe of 2026-09-07 took 944 seconds; a fifteen-minute window
		// would have discarded that answer after it was produced and billed.
		expect(OLOSTEP_DEFAULT_JOB_TIMEOUT_MS).toBeGreaterThanOrEqual(20 * 60_000);
		expect(OLOSTEP_DEFAULT_JOB_TIMEOUT_MS).toBeGreaterThan(944_000);
	});

	it("caps the whole job at the permit's remaining lifetime", async () => {
		const fetchImpl = happyPath();
		// The permit expired before the call: nothing is created.
		const expired = await adapterWith(fetchImpl).execute(
			permitFor({ expiresAt: new Date("2026-09-08T14:00:00.000Z") }),
		);
		expect(expired).toMatchObject({ status: "INVALID", invalidReason: "TIMEOUT" });
		expect(expired.costUsd).toBeUndefined();
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("maps a refused creation to a failed outcome carrying the status the provider sent, and no charge", async () => {
		// 402 is what this vendor answers an unpaid or exhausted account with;
		// its client prints that as an invalid key, and the status is what a
		// row has to carry so nobody diagnoses the credential again.
		const exhausted = await adapterWith(
			routed({ submit: new Response('{"message":"Payment Required","usage_limit_reached":true}', { status: 402 }) }),
		).execute(permitFor());
		expect(exhausted).toMatchObject({ status: "FAILED", validity: "INVALID", invalidReason: "PROVIDER_HTTP_402" });
		// The provider refused the request, so no batch exists to be billed.
		expect(exhausted.costUsd).toBeUndefined();
		expect(exhausted.provider).toBeUndefined();

		const fetchImpl = routed({ submit: new Response(`{"message":"Unauthorized ${API_KEY}"}`, { status: 401 }) });
		const refused = await adapterWith(fetchImpl).execute(permitFor());
		expect(refused).toMatchObject({ status: "FAILED", invalidReason: "PROVIDER_HTTP_401" });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(refused)).not.toContain(API_KEY);
	});

	it("keeps the charge when the creation fails ambiguously", async () => {
		// A 5xx may hide a batch that was created before the error, and a
		// creation that never came back may have arrived all the same.
		const serverError = await adapterWith(
			routed({ submit: new Response("upstream unavailable", { status: 503 }) }),
		).execute(permitFor());
		expect(serverError.invalidReason).toBe("PROVIDER_HTTP_503");
		expectCostUsd(serverError, expectedOlostepCost());

		const transport = await adapterWith(routed({ submit: new Error("ECONNRESET") })).execute(permitFor());
		expect(transport.invalidReason).toBe("TRANSPORT_ERROR");
		expectCostUsd(transport, expectedOlostepCost());
	});

	it("maps a transport failure to a failed outcome without quoting the error", async () => {
		const outcome = await adapterWith(routed({ submit: new Error(`ECONNRESET while sending ${API_KEY}`) })).execute(
			permitFor(),
		);
		expect(outcome).toMatchObject({ status: "FAILED", invalidReason: "TRANSPORT_ERROR" });
		expect(JSON.stringify(outcome)).not.toContain(API_KEY);
	});

	it("stops reading a result that exceeds the size limit", async () => {
		const fetchImpl = routed({
			submit: jsonResponse({ id: BATCH_ID, status: "completed" }),
			items: jsonResponse(itemsListing()),
			retrieve: jsonResponse(retrieveBody(), 200, { "content-length": String(9 * 1024 * 1024) }),
		});
		const outcome = await adapterWith(fetchImpl).execute(permitFor());
		expect(outcome).toMatchObject({
			status: "INVALID",
			invalidReason: "RESPONSE_TOO_LARGE",
			rawResponseReference: `olostep:${BATCH_ID}/${RETRIEVE_ID}`,
		});
		expectCostUsd(outcome, expectedOlostepCost());
	});

	it("records an answered-nothing result as empty and an unrecognized one as malformed, each with its charge", async () => {
		const empty = await adapterWith(happyPath({ answer_markdown: "   " })).execute(permitFor());
		expect(empty.invalidReason).toBe("EMPTY_RESPONSE");
		expectCostUsd(empty, expectedOlostepCost());
		expect(empty.provider).toBe("olostep");

		const unknownShape = await adapterWith(
			routed({
				submit: jsonResponse({ id: BATCH_ID, status: "completed" }),
				items: jsonResponse(itemsListing()),
				retrieve: jsonResponse(retrieveBody({ model: "perplexity", unexpected: true })),
			}),
		).execute(permitFor());
		expect(unknownShape.invalidReason).toBe("MALFORMED_RESPONSE");
		expectCostUsd(unknownShape, expectedOlostepCost());

		// The page itself, when the parser produced nothing readable, is not an answer.
		const unparsed = await adapterWith(
			routed({
				submit: jsonResponse({ id: BATCH_ID, status: "completed" }),
				items: jsonResponse(itemsListing()),
				retrieve: jsonResponse({ json_content: "<html>Sign up to continue</html>" }),
			}),
		).execute(permitFor());
		expect(unparsed.invalidReason).toBe("MALFORMED_RESPONSE");

		// A completed batch with nothing to retrieve is a shape, not an answer.
		const noItem = routed({
			submit: jsonResponse({ id: BATCH_ID, status: "completed" }),
			items: jsonResponse({ items: [] }),
		});
		const nothingToRetrieve = await adapterWith(noItem).execute(permitFor());
		expect(nothingToRetrieve).toMatchObject({
			invalidReason: "MALFORMED_RESPONSE",
			rawResponseReference: `olostep:${BATCH_ID}`,
		});
		expect(noItem).toHaveBeenCalledTimes(2);

		// A creation that names no batch is malformed too, and keeps a digest
		// of what it did say.
		const noBatch = await adapterWith(routed({ submit: jsonResponse({ ok: true }) })).execute(permitFor());
		expect(noBatch.invalidReason).toBe("MALFORMED_RESPONSE");
		expect(noBatch.rawResponseReference).toMatch(/^olostep:sha256:[0-9a-f]{64}$/);
	});

	it("refuses a sign-up wall as an answer, and keeps the charge it cost", async () => {
		const wall = await adapterWith(
			happyPath({
				answer_markdown: "Sign up to continue. Create a free account to see this answer.",
				sources: [],
			}),
		).execute(permitFor());
		expect(wall.invalidReason).toBe("PROVIDER_AUTH_WALL");
		expect(wall.validity).toBe("INVALID");
		// The batch ran and the wall was served, so the charge stands.
		expectCostUsd(wall, expectedOlostepCost());
		expect(wall.rawResponseReference).toBe(`olostep:${BATCH_ID}/${RETRIEVE_ID}`);
		// A wall is never kept as evidence of what the surface said.
		expect(wall.answer).toBeUndefined();
	});

	it("keeps an answer that showed its sources, whatever phrase it used", async () => {
		// The question sets ask where to hold events, so an answer can name a
		// sign-up without being a sign-up page. Its citations are the difference.
		const cited = await adapterWith(
			happyPath({ answer_markdown: "Kafe Ubud hosts classes; sign up on their site." }),
		).execute(permitFor());
		expect(cited.validity).toBe("VALID");
		expect(cited.answer?.text).toContain("sign up");

		// Long prose that mentions signing up is prose, sources or not.
		const long = await adapterWith(
			happyPath({
				answer_markdown: `Sign up is not needed. ${"Ubud has many food halls. ".repeat(40)}`,
				sources: [],
			}),
		).execute(permitFor());
		expect(long.validity).toBe("VALID");
	});

	it("identifies the key it sent the way the probe does, without revealing it", () => {
		const fingerprint = olostepCredentialFingerprint(API_KEY);
		expect(fingerprint).toMatch(/^[0-9a-f]{12}$/);
		// The probe prints sha256 of the credential, so the two are comparable.
		expect(fingerprint).toBe(createHash("sha256").update(API_KEY).digest("hex").slice(0, 12));
		expect(fingerprint).not.toBe(olostepCredentialFingerprint(`${API_KEY}x`));
		expect(API_KEY).not.toContain(fingerprint);
	});

	it("says what an unreadable payload carried, without quoting it or the key", () => {
		const scrub = (value: string) => value.split(API_KEY).join("[redacted-credential]");
		expect(
			describeUnreadableOlostepPayload(
				{ json_content: JSON.stringify({ status: "error", message: `bad ${API_KEY}`, foo: 1 }) },
				scrub,
			),
		).toBe("keys=status,message,foo status=error message=bad [redacted-credential]");
		expect(describeUnreadableOlostepPayload({ json_content: "<html/>" }, scrub)).toContain("json_content=unparsed");
		expect(describeUnreadableOlostepPayload("plain text", scrub)).toBe("body: text, 10 chars");
	});

	it("keeps the key out of every stored field, even when the surface echoes it", async () => {
		const outcome = await adapterWith(
			happyPath({
				answer_markdown: `Answer mentioning ${API_KEY}`,
				sources: [{ url: `https://example.test/?k=${API_KEY}`, title: API_KEY }],
			}),
		).execute(permitFor());
		const stored = JSON.stringify(outcome);
		expect(stored).not.toContain(API_KEY);
		expect(outcome.answer?.text).toBe("Answer mentioning [redacted-credential]");
	});

	it("does not contact the provider when the scenario text cannot be resolved", async () => {
		const fetchImpl = happyPath();
		const outcome = await adapterWith(fetchImpl, {
			resolveScenarioText: () => {
				throw new Error("SCENARIO_LOOKUP_FAILED");
			},
		}).execute(permitFor());
		expect(outcome).toMatchObject({ status: "FAILED", invalidReason: "SCENARIO_TEXT_UNAVAILABLE" });
		expect(outcome.costUsd).toBeUndefined();
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("plans without transport and refuses a permit from another channel", async () => {
		const fetchImpl = happyPath();
		const adapter = adapterWith(fetchImpl);
		const planned = await adapter.measure({
			cycleId: "cycle-1",
			organizationId: "org-1",
			scenarioId: "scenario-1",
			channel: "visitor_view",
			dispatchKey: "order-1:scenario-1:Perplexity:0:1",
		});
		expect(planned).toEqual({ dispatchKey: "order-1:scenario-1:Perplexity:0:1", status: "queued" });
		await expect(
			adapter.measure({
				cycleId: "cycle-1",
				organizationId: "org-1",
				scenarioId: "scenario-1",
				channel: "api_view",
				dispatchKey: "k",
			}),
		).rejects.toThrow("MEASUREMENT_CHANNEL_MISMATCH");
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(adapter.channel).toBe("visitor_view");
	});

	it("measures only a surface the catalog sells, over a transport that cannot leak the key", () => {
		for (const surface of Object.values(olostepVisitorSurface)) expect(visitorSurfaces).toContain(surface);
		expect(() => adapterWith(happyPath(), { apiKey: " " })).toThrow("OLOSTEP_API_KEY_MISSING");
		// A key that cannot travel in a header is refused by name, not as a
		// transport error on every permit.
		expect(() => adapterWith(happyPath(), { apiKey: "secret\n" })).toThrow("OLOSTEP_API_KEY_NOT_HEADER_SAFE");
		expect(() => adapterWith(happyPath(), { endpoint: "http://api.olostep.com/v1" })).toThrow(
			"OLOSTEP_ENDPOINT_INSECURE",
		);
		expect(() => adapterWith(happyPath(), { system: "chatgpt" })).toThrow("OLOSTEP_SYSTEM_UNSUPPORTED");
	});

	it("stays behind the owner gate under its own name, and is not reachable through a family", () => {
		// The bare provider name is not approved; only the one-surface adapter is.
		expect(() => assertAdapterAllowed("olostep", ["noop", "olostep"])).toThrow("SELENA_LIVE_ADAPTER_REQUIRES_OWNER_GO");
		expect(() => assertAdapterAllowed("olostep-perplexity", ["noop", "olostep-perplexity"])).not.toThrow();
		expect(() => assertAdapterAllowed("olostep-perplexity", ["noop"])).toThrow("SELENA_ADAPTER_NOT_REGISTERED");
		for (const family of ["brightdata", "auto"])
			expect(measurementAdapterNamesFor(family)).not.toContain("olostep-perplexity");
	});

	it("falls back to the local estimate because the result names no charge", () => {
		expect(resolveOlostepCost(undefined)).toEqual({ costUsd: estimateRunCostUsd("olostep", true), basis: "estimated" });
		expect(resolveOlostepCost(0.02)).toEqual({ costUsd: 0.02, basis: "provider_reported" });
		expect(resolveOlostepCost(-1).basis).toBe("estimated");
	});

	it("reads the answer off the fields the registry reads, in the registry's order, and refuses shapes it does not know", () => {
		const answer = parseOlostepAnswer(retrieveBody());
		expect(answer?.answerText).toBe("- Kafe Ubud\n- Hujan Locale\n- Ubud Food Court");
		expect(answer?.model).toBe("perplexity");
		expect(answer?.sources.map((source) => source.domain)).toEqual([
			"example.test",
			"example.test",
			"guide.test",
			"plain.test",
		]);
		// The registry's alternate fields, in its precedence.
		expect(
			parseOlostepAnswer({ result: { markdown_content: "From result" }, citations: ["https://c.test/a"] }),
		).toEqual({
			answerText: "From result",
			sources: [{ url: "https://c.test/a", domain: "c.test" }],
		});
		expect(
			parseOlostepAnswer({ answer: "plain", inline_references: [{ url: "https://i.test/x", label: "I" }] }),
		).toEqual({ answerText: "plain", sources: [{ url: "https://i.test/x", domain: "i.test", title: "I" }] });
		// The first source field present wins, as it does in the registry, even when empty.
		expect(parseOlostepAnswer({ answer: "x", sources: [], citations: ["https://c.test/a"] })?.sources).toEqual([]);
		// A bare content record is accepted so a pinned parser can be handed the inner object.
		expect(parseOlostepAnswer({ answer_markdown: "x" })?.answerText).toBe("x");
		expect(parseOlostepAnswer({ model: "perplexity" })).toBeNull();
		expect(parseOlostepAnswer({ json_content: null })).toBeNull();
		expect(parseOlostepAnswer("text")).toBeNull();
		expect(parseOlostepAnswer(null)).toBeNull();
	});

	it("attaches a measurement when an extraction context is supplied, attributed to the sold surface", async () => {
		const outcome = await adapterWith(happyPath(), {
			resolveExtractionContext: () => ({
				brandTerms: ["KORA Food Hall", "KORA"],
				ownedDomains: ["korafoodhall.com"],
				competitors: [{ name: "Ubud Food Court", terms: ["Ubud Food Court"] }],
				language: "en",
				region: "ID",
			}),
		}).execute(permitFor());
		expect(outcome.status).toBe("SUCCEEDED");
		expect(outcome.measurement).toMatchObject({
			system: "Perplexity",
			captureMode: "live_search",
			brand: "KORA Food Hall",
			mention: false,
			position: null,
			ownedCitation: false,
			competitors: [{ name: "Ubud Food Court", position: 3 }],
		});
		expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
	});
});
