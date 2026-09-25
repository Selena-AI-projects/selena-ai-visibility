import {
	assertAdapterAllowed,
	type RunOutcome,
	runOutcomeSchema,
	visitorSurfaces,
} from "@workspace/selena-visibility-contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelenaExecutablePermit } from "../selena-measurement";
import { estimateRunCostUsd } from "../usage/cost";
import {
	buildOxylabsAuthorization,
	buildOxylabsRequestBody,
	createOxylabsAdapter,
	describeUnreadableOxylabsPayload,
	looksLikeOxylabsAuthWall,
	OXYLABS_AUTH_WALL_MAX_CHARS,
	OXYLABS_DEFAULT_ENDPOINT,
	oxylabsCredentialFingerprint,
	oxylabsVisitorSurface,
	parseOxylabsAnswer,
	resolveOxylabsCost,
} from "./oxylabs-measurement-adapter";

const USERNAME = "selena_probe_user";
const PASSWORD = "oxy-secret-owner-password";
const BASIC = `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64")}`;
const JOB_ID = "7346123456789012345";
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
		expiresAt: new Date("2026-09-06T16:00:00.000Z"),
		consumedAt: null,
		...overrides,
	};
}

const now = () => new Date("2026-09-06T15:00:00.000Z");

function jsonResponse(payload: unknown, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "content-type": "application/json", ...headers },
	});
}

/** The content the probe of 2026-09-06 observed, reduced to the fields read. */
function resultsPayload(content: Record<string, unknown> = {}) {
	return {
		results: [
			{
				content: {
					answer_results_md: "- Kafe Ubud\n- Hujan Locale\n- Ubud Food Court",
					model: "turbo",
					parse_status_code: 12000,
					additional_results: {
						sources_results: [
							{ url: "https://example.test/ubud-food-halls", title: "Food halls in Ubud" },
							{ url: "https://www.example.test/ubud-food-halls", title: "Duplicate by www" },
							{ link: "https://guide.test/kafe", name: "Kafe" },
							{ url: "not a url" },
						],
					},
					...content,
				},
				created_at: "2026-09-06 15:15:57",
				status_code: 200,
			},
		],
	};
}

/**
 * A transport that answers by route: the submission, then each status poll in
 * order, then the results. Anything else is a test bug and throws.
 */
function routed(
	routes: {
		submit?: Response | (() => Response) | Error;
		status?: Array<Response | Error>;
		results?: Response | (() => Response) | Error;
	},
	endpoint = OXYLABS_DEFAULT_ENDPOINT,
) {
	const status = [...(routes.status ?? [])];
	const materialize = (response: Response | (() => Response) | Error | undefined, what: string): Response => {
		if (response === undefined) throw new Error(`TEST_NO_${what}_ROUTE`);
		if (response instanceof Error) throw response;
		return typeof response === "function" ? response() : response;
	};
	return vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = String(input);
		if (url === endpoint && init?.method === "POST") return materialize(routes.submit, "SUBMIT");
		if (url === `${endpoint}/${JOB_ID}/results`) return materialize(routes.results, "RESULTS");
		if (url === `${endpoint}/${JOB_ID}`) {
			const next = status.shift();
			if (next === undefined) throw new Error("TEST_STATUS_SEQUENCE_EXHAUSTED");
			return materialize(next, "STATUS");
		}
		throw new Error(`TEST_UNEXPECTED_URL:${url}`);
	});
}

function adapterWith(fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}) {
	return createOxylabsAdapter({
		username: USERNAME,
		password: PASSWORD,
		system: "perplexity",
		fetchImpl,
		resolveScenarioText: () => SCENARIO_TEXT,
		now,
		pollMs: 0,
		...overrides,
	});
}

function happyPath(content: Record<string, unknown> = {}) {
	return routed({
		submit: jsonResponse({ id: JOB_ID, status: "pending" }, 201),
		status: [jsonResponse({ id: JOB_ID, status: "pending" }), jsonResponse({ id: JOB_ID, status: "done" })],
		results: jsonResponse(resultsPayload(content)),
	});
}

function expectCostUsd(outcome: RunOutcome, expected: number) {
	if (typeof outcome.costUsd !== "number") throw new Error("Expected the provider attempt to record a numeric cost");
	expect(outcome.costUsd).toBeCloseTo(expected);
}

function expectedOxylabsCost() {
	const cost = estimateRunCostUsd("oxylabs", true);
	if (cost === null) throw new Error("Expected Oxylabs to have a configured cost estimate");
	return cost;
}

// Nothing in these tests may reach a network: the global is replaced with a
// throwing stub so an accidental use of ambient fetch fails loudly instead of
// quietly billing the owner's Oxylabs account.
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

describe("Oxylabs measurement adapter", () => {
	it("submits one parsed Perplexity job, carrying the question and nothing else", () => {
		expect(buildOxylabsRequestBody({ system: "perplexity", prompt: SCENARIO_TEXT })).toEqual({
			source: "perplexity",
			prompt: SCENARIO_TEXT,
			parse: true,
		});
	});

	it("submits, polls to done, fetches the result and stores the answer with the sources it showed", async () => {
		const fetchImpl = happyPath();
		const permit = permitFor();

		const outcome = await adapterWith(fetchImpl).execute(permit);

		expect(globalFetch).not.toHaveBeenCalled();
		// One submission, two polls, one fetch: the job is the paid call, and
		// asking after it is not another one.
		expect(fetchImpl).toHaveBeenCalledTimes(4);
		const [submitUrl, submitInit] = fetchImpl.mock.calls[0] ?? [];
		expect(submitUrl).toBe(OXYLABS_DEFAULT_ENDPOINT);
		expect(submitInit?.method).toBe("POST");
		const headers = submitInit?.headers as Record<string, string>;
		expect(headers.Authorization).toBe(BASIC);
		expect(headers["Content-Type"]).toBe("application/json");
		const rawBody = String(submitInit?.body);
		expect(JSON.parse(rawBody)).toEqual({ source: "perplexity", prompt: SCENARIO_TEXT, parse: true });
		// The credentials belong in the header and nowhere else.
		expect(rawBody).not.toContain(USERNAME);
		expect(rawBody).not.toContain(PASSWORD);
		for (const [url] of fetchImpl.mock.calls) {
			expect(String(url)).not.toContain(USERNAME);
			expect(String(url)).not.toContain(PASSWORD);
		}

		expect(outcome).toEqual({
			dispatchKey: permit.dispatchKey,
			status: "SUCCEEDED",
			validity: "VALID",
			rawResponseReference: `oxylabs:${JOB_ID}`,
			answer: { text: "- Kafe Ubud\n- Hujan Locale\n- Ubud Food Court", retainUntil: expect.any(Date) },
			// Deduplicated, http(s) only, and read under the provider's own
			// alternate field names — exactly what the surface displayed.
			sources: [
				{ url: "https://example.test/ubud-food-halls", domain: "example.test", title: "Food halls in Ubud" },
				{ url: "https://www.example.test/ubud-food-halls", domain: "example.test", title: "Duplicate by www" },
				{ url: "https://guide.test/kafe", domain: "guide.test", title: "Kafe" },
			],
			costUsd: expectedOxylabsCost(),
			costBasis: "estimated",
			provider: "oxylabs",
		});
		// A scraped surface reports no token accounting, so none is claimed.
		expect(outcome.tokenUsage).toBeUndefined();
		expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
	});

	it("skips polling when the submission already reports the job done", async () => {
		const fetchImpl = routed({
			submit: jsonResponse({ id: JOB_ID, status: "done" }, 201),
			results: jsonResponse(resultsPayload()),
		});
		const outcome = await adapterWith(fetchImpl).execute(permitFor());
		expect(outcome.status).toBe("SUCCEEDED");
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	it("keeps polling through transient statuses and gives up on a faulted job with the charge recorded", async () => {
		const faulted = await adapterWith(
			routed({
				submit: jsonResponse({ id: JOB_ID, status: "pending" }, 201),
				status: [
					new Response(null, { status: 204 }),
					new Response("busy", { status: 503 }),
					jsonResponse({ id: JOB_ID, status: "faulted" }),
				],
			}),
		).execute(permitFor());
		expect(faulted).toMatchObject({
			status: "INVALID",
			validity: "INVALID",
			invalidReason: "JOB_FAULTED",
			rawResponseReference: `oxylabs:${JOB_ID}`,
		});
		expectCostUsd(faulted, expectedOxylabsCost());
		expect(faulted.provider).toBe("oxylabs");
	});

	it("records a job that never finishes inside its budget as unfinished, keeping the handle", async () => {
		const pendingForever = routed({
			submit: jsonResponse({ id: JOB_ID, status: "pending" }, 201),
			status: Array.from({ length: 50 }, () => jsonResponse({ id: JOB_ID, status: "pending" })),
		});
		// The budget must outlast the submission on a slow runner, or the run
		// ends as TIMEOUT before a job exists; polling sleeps so it runs out
		// while the job is still pending.
		const outcome = await adapterWith(pendingForever, { jobTimeoutMs: 250, pollMs: 10 }).execute(permitFor());
		expect(outcome).toMatchObject({
			status: "INVALID",
			validity: "INVALID",
			invalidReason: "JOB_NOT_READY",
			rawResponseReference: `oxylabs:${JOB_ID}`,
		});
		expectCostUsd(outcome, expectedOxylabsCost());
		expect(() => runOutcomeSchema.parse(outcome)).not.toThrow();
	});

	it("caps the whole job at the permit's remaining lifetime", async () => {
		const fetchImpl = happyPath();
		// The permit expired before the call: nothing is submitted.
		const expired = await adapterWith(fetchImpl).execute(
			permitFor({ expiresAt: new Date("2026-09-06T14:00:00.000Z") }),
		);
		expect(expired).toMatchObject({ status: "INVALID", invalidReason: "TIMEOUT" });
		expect(expired.costUsd).toBeUndefined();
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("maps a refused submission to a failed outcome carrying the status code and no charge", async () => {
		const fetchImpl = routed({
			submit: new Response(`{"message":"Unauthorized for ${USERNAME}"}`, { status: 401 }),
		});
		const outcome = await adapterWith(fetchImpl).execute(permitFor());
		expect(outcome).toMatchObject({ status: "FAILED", validity: "INVALID", invalidReason: "PROVIDER_HTTP_401" });
		// The provider refused the request, so no job exists to be invoiced.
		expect(outcome.costUsd).toBeUndefined();
		expect(outcome.provider).toBeUndefined();
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(outcome)).not.toContain(USERNAME);
	});

	it("keeps the charge when the submission fails ambiguously", async () => {
		// A 5xx may hide a job that was created before the error, and a
		// submission that never came back may have arrived all the same.
		const serverError = await adapterWith(
			routed({ submit: new Response("upstream unavailable", { status: 503 }) }),
		).execute(permitFor());
		expect(serverError.invalidReason).toBe("PROVIDER_HTTP_503");
		expectCostUsd(serverError, expectedOxylabsCost());

		const transport = await adapterWith(routed({ submit: new Error("ECONNRESET") })).execute(permitFor());
		expect(transport.invalidReason).toBe("TRANSPORT_ERROR");
		expectCostUsd(transport, expectedOxylabsCost());
	});

	it("maps a transport failure to a failed outcome without quoting the error", async () => {
		const outcome = await adapterWith(routed({ submit: new Error(`ECONNRESET while sending ${PASSWORD}`) })).execute(
			permitFor(),
		);
		expect(outcome).toMatchObject({ status: "FAILED", invalidReason: "TRANSPORT_ERROR" });
		expect(JSON.stringify(outcome)).not.toContain(PASSWORD);
	});

	it("stops reading a result that exceeds the size limit", async () => {
		const fetchImpl = routed({
			submit: jsonResponse({ id: JOB_ID, status: "done" }, 201),
			results: jsonResponse(resultsPayload(), 200, { "content-length": String(9 * 1024 * 1024) }),
		});
		const outcome = await adapterWith(fetchImpl).execute(permitFor());
		expect(outcome).toMatchObject({
			status: "INVALID",
			invalidReason: "RESPONSE_TOO_LARGE",
			rawResponseReference: `oxylabs:${JOB_ID}`,
		});
		expectCostUsd(outcome, expectedOxylabsCost());
	});

	it("records an answered-nothing result as empty and an unrecognized one as malformed, each with its charge", async () => {
		const empty = await adapterWith(happyPath({ answer_results_md: "   " })).execute(permitFor());
		expect(empty.invalidReason).toBe("EMPTY_RESPONSE");
		expectCostUsd(empty, expectedOxylabsCost());
		expect(empty.provider).toBe("oxylabs");

		const unknownShape = await adapterWith(
			routed({
				submit: jsonResponse({ id: JOB_ID, status: "done" }, 201),
				results: jsonResponse({ results: [{ content: { parse_status_code: 12005, unexpected: true } }] }),
			}),
		).execute(permitFor());
		expect(unknownShape.invalidReason).toBe("MALFORMED_RESPONSE");
		expectCostUsd(unknownShape, expectedOxylabsCost());

		// The page's HTML, when the provider could not parse it, is not an answer.
		const unparsed = await adapterWith(
			routed({
				submit: jsonResponse({ id: JOB_ID, status: "done" }, 201),
				results: jsonResponse({ results: [{ content: "<html>Sign up to continue</html>" }] }),
			}),
		).execute(permitFor());
		expect(unparsed.invalidReason).toBe("MALFORMED_RESPONSE");

		// A submission that names no job is malformed too, and keeps a digest
		// of what it did say.
		const noJob = await adapterWith(routed({ submit: jsonResponse({ ok: true }, 201) })).execute(permitFor());
		expect(noJob.invalidReason).toBe("MALFORMED_RESPONSE");
		expect(noJob.rawResponseReference).toMatch(/^oxylabs:sha256:[0-9a-f]{64}$/);
	});

	it("refuses a sign-up wall as an answer, and keeps the charge it cost", async () => {
		const wall = await adapterWith(
			happyPath({
				answer_results_md: "Sign up to continue. Create a free account to see this answer.",
				additional_results: {},
			}),
		).execute(permitFor());
		expect(wall.invalidReason).toBe("PROVIDER_AUTH_WALL");
		expect(wall.validity).toBe("INVALID");
		// The job was submitted and the wall was served, so the charge stands.
		expectCostUsd(wall, expectedOxylabsCost());
		expect(wall.rawResponseReference).toBe(`oxylabs:${JOB_ID}`);
		// A wall is never kept as evidence of what the surface said.
		expect(wall.answer).toBeUndefined();
	});

	it("keeps an answer that showed its sources, whatever phrase it used", async () => {
		// The question sets ask where to hold events, so an answer can name a
		// sign-up without being a sign-up page. Its citations are the difference.
		const cited = await adapterWith(
			happyPath({ answer_results_md: "Kafe Ubud hosts classes; sign up on their site." }),
		).execute(permitFor());
		expect(cited.validity).toBe("VALID");
		expect(cited.answer?.text).toContain("sign up");

		// Long prose that mentions signing up is prose, sources or not.
		const long = await adapterWith(
			happyPath({
				answer_results_md: `Sign up is not needed. ${"Ubud has many food halls. ".repeat(40)}`,
				additional_results: {},
			}),
		).execute(permitFor());
		expect(long.validity).toBe("VALID");
	});

	it("builds the header the working provider path builds, and refuses what Basic cannot carry", () => {
		// btoa is what the registry reaches this account with; matching it byte
		// for byte is the point, because UTF-8 would send a different password.
		for (const password of ["oxy-secret", "pa55!@#", "café±§", "ÿ"]) {
			expect(buildOxylabsAuthorization("user", password)).toBe(`Basic ${btoa(`user:${password}`)}`);
		}
		// A trailing newline is part of the credential, not noise to tidy away.
		expect(buildOxylabsAuthorization("user", "secret\n")).not.toBe(buildOxylabsAuthorization("user", "secret"));
		for (const beyondLatin1 of ["пароль", "naïve—dash", "🔑"]) {
			expect(() => buildOxylabsAuthorization("user", beyondLatin1)).toThrow("OXYLABS_CREDENTIAL_NOT_LATIN1");
		}
	});

	it("identifies the header it sent without revealing it", () => {
		const authorization = buildOxylabsAuthorization(USERNAME, PASSWORD);
		const fingerprint = oxylabsCredentialFingerprint(authorization);
		expect(fingerprint).toMatch(/^[0-9a-f]{12}$/);
		expect(fingerprint).toBe(oxylabsCredentialFingerprint(authorization));
		expect(fingerprint).not.toBe(oxylabsCredentialFingerprint(buildOxylabsAuthorization(USERNAME, `${PASSWORD}x`)));
		expect(authorization).not.toContain(fingerprint);
	});

	it("tells a wall from an answer by phrase and length together", () => {
		expect(looksLikeOxylabsAuthWall("Sign up to continue")).toBe(true);
		expect(looksLikeOxylabsAuthWall("Verify you are human")).toBe(true);
		expect(looksLikeOxylabsAuthWall("Kafe Ubud and Hujan Locale are the best known food halls in Ubud.")).toBe(false);
		expect(looksLikeOxylabsAuthWall("   ")).toBe(false);
		expect(looksLikeOxylabsAuthWall(`sign up ${"a".repeat(OXYLABS_AUTH_WALL_MAX_CHARS)}`)).toBe(false);
	});

	it("says what an unreadable payload carried, without quoting it or the credentials", () => {
		const scrub = (value: string) => value.split(PASSWORD).join("[redacted-credential]");
		expect(
			describeUnreadableOxylabsPayload(
				{ results: [{ content: { parse_status_code: 12005, message: `bad ${PASSWORD}`, foo: 1 } }] },
				scrub,
			),
		).toBe("keys=parse_status_code,message,foo message=bad [redacted-credential] parse_status_code=12005");
		expect(describeUnreadableOxylabsPayload({ results: [{ content: "<html/>" }] }, scrub)).toContain(
			"content=unparsed",
		);
		expect(describeUnreadableOxylabsPayload("plain text", scrub)).toBe("body: text, 10 chars");
	});

	it("keeps the credentials out of every stored field, even when the surface echoes them", async () => {
		const outcome = await adapterWith(
			happyPath({
				answer_results_md: `Answer mentioning ${USERNAME} and ${PASSWORD}`,
				additional_results: { sources_results: [{ url: `https://example.test/?u=${USERNAME}`, title: PASSWORD }] },
			}),
		).execute(permitFor());
		const stored = JSON.stringify(outcome);
		expect(stored).not.toContain(USERNAME);
		expect(stored).not.toContain(PASSWORD);
		expect(outcome.answer?.text).toBe("Answer mentioning [redacted-credential] and [redacted-credential]");
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

	it("measures only a surface the catalog sells, over a transport that cannot leak the credentials", () => {
		for (const surface of Object.values(oxylabsVisitorSurface)) expect(visitorSurfaces).toContain(surface);
		expect(() => adapterWith(happyPath(), { username: " " })).toThrow("OXYLABS_USERNAME_MISSING");
		expect(() => adapterWith(happyPath(), { password: "" })).toThrow("OXYLABS_PASSWORD_MISSING");
		expect(() => adapterWith(happyPath(), { endpoint: "http://data.oxylabs.io/v1/queries" })).toThrow(
			"OXYLABS_ENDPOINT_INSECURE",
		);
		expect(() => adapterWith(happyPath(), { system: "chatgpt" })).toThrow("OXYLABS_SYSTEM_UNSUPPORTED");
	});

	it("stays behind the owner gate under its own name, and is not reachable through a family", () => {
		// The bare provider name is not approved; only the one-surface adapter is.
		expect(() => assertAdapterAllowed("oxylabs", ["noop", "oxylabs"])).toThrow("SELENA_LIVE_ADAPTER_REQUIRES_OWNER_GO");
		expect(() => assertAdapterAllowed("oxylabs-perplexity", ["noop", "oxylabs-perplexity"])).not.toThrow();
		expect(() => assertAdapterAllowed("oxylabs-perplexity", ["noop"])).toThrow("SELENA_ADAPTER_NOT_REGISTERED");
	});

	it("falls back to the local estimate because the result names no charge", () => {
		expect(resolveOxylabsCost(undefined)).toEqual({ costUsd: estimateRunCostUsd("oxylabs", true), basis: "estimated" });
		expect(resolveOxylabsCost(0.02)).toEqual({ costUsd: 0.02, basis: "provider_reported" });
		expect(resolveOxylabsCost(-1).basis).toBe("estimated");
	});

	it("reads the answer off the probe's observed shape and refuses shapes it does not know", () => {
		const answer = parseOxylabsAnswer(resultsPayload());
		expect(answer?.answerText).toBe("- Kafe Ubud\n- Hujan Locale\n- Ubud Food Court");
		expect(answer?.sources.map((source) => source.domain)).toEqual(["example.test", "example.test", "guide.test"]);
		// A bare content record is accepted so a pinned parser can be handed the inner object.
		expect(parseOxylabsAnswer({ answer_results_md: "x" })?.answerText).toBe("x");
		expect(parseOxylabsAnswer({ results: [] })).toBeNull();
		expect(parseOxylabsAnswer({ results: [{ content: { model: "turbo" } }] })).toBeNull();
		expect(parseOxylabsAnswer("text")).toBeNull();
		expect(parseOxylabsAnswer(null)).toBeNull();
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
