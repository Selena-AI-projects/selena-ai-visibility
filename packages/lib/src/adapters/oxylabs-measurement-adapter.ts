import { createHash } from "node:crypto";
import {
	answerRetainUntil,
	type RunOutcome,
	runMeasurementSchema,
	runOutcomeSchema,
	type visitorSurfaces,
} from "@workspace/selena-visibility-contracts";
import { type ExtractionContext, extractMeasurement } from "../selena-answer-extraction";
import type { SelenaExecutablePermit, SelenaMeasurementAdapter, SelenaMeasurementPermit } from "../selena-measurement";
import { extractCitationsFromOxylabs } from "../text-extraction";
import { estimateRunCostUsd } from "../usage/cost";

// The second Visitor View transport. Oxylabs' `perplexity` source drives
// perplexity.ai itself, so an answer collected here is what a person is shown
// — the same channel the Bright Data adapter measures, not the Sonar API. It
// exists because the Bright Data Perplexity collector returns the sign-up wall
// (BRIGHTDATA_PERPLEXITY_AUTH_WALL.md); one live probe through this source on
// 2026-09-06 returned a 447-character answer with ten citations in 21 seconds.
//
// It stays selectable only by an owner code change, like every live adapter:
// the execution contract's allowlist is the gate, not this module. It is not a
// member of any routing family — the `Perplexity` visitor route stays on Bright
// Data until a canary through this adapter says otherwise — so it is reached
// only when named outright as SELENA_MEASUREMENT_ADAPTER=oxylabs-perplexity.
//
// The request and response shapes follow the provider this repository already
// ships (packages/lib/src/providers/registry/oxylabs.ts) and the probe fixture:
// a Push-Pull job — submit, poll until done, fetch results — whose parsed
// content carries `answer_results_md` and `additional_results.sources_results`.
// Both directions stay injectable so a confirmed shape can be pinned without
// editing this module; an unrecognized payload is MALFORMED_RESPONSE, never an
// answer guessed from it.

export const OXYLABS_DEFAULT_ENDPOINT = "https://data.oxylabs.io/v1/queries";
/** One HTTP exchange; the job as a whole has its own budget below. */
const DEFAULT_TIMEOUT_MS = 30_000;
/** The whole submit/poll/fetch job. The provider registry allows ten minutes; the probe took 21 seconds. */
const DEFAULT_JOB_TIMEOUT_MS = 10 * 60_000;
// The registry's pacing: two seconds, doubling every five polls, capped at ten.
const DEFAULT_POLL_MS = 2_000;
const POLL_MAX_MS = 10_000;
/** A visitor answer is prose plus a source list; past this it is a runaway page. */
const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

export const oxylabsVisitorSystems = ["perplexity"] as const;
export type OxylabsVisitorSystem = (typeof oxylabsVisitorSystems)[number];

/**
 * Which sold surface each source measures. The `satisfies` clause is the
 * point: a system this adapter can be pointed at has to be a surface the
 * catalog actually sells, so a run cannot be delivered under a name the
 * customer did not buy.
 */
export const oxylabsVisitorSurface = {
	perplexity: "Perplexity",
} as const satisfies Record<OxylabsVisitorSystem, (typeof visitorSurfaces)[number]>;

/** The Web Scraper API source behind each surface. */
export const oxylabsSource = {
	perplexity: "perplexity",
} as const satisfies Record<OxylabsVisitorSystem, string>;

/** A source the answer itself showed. Never inferred, never reconstructed. */
export type OxylabsSource = { url: string; domain: string; title?: string };

export type OxylabsAnswer = {
	/** The visible answer text. Empty string means the surface answered nothing. */
	answerText: string;
	/** Only links the payload carried; an answer without them yields []. */
	sources: OxylabsSource[];
	/** The provider's own handle for this call, when the payload names one. */
	providerRequestId?: string;
	/** What the provider says this call cost, when the payload reports it. */
	costUsd?: number;
	/**
	 * The provider's own parse status, when the payload names one. Recorded and
	 * logged, never gated on: the probe of 2026-09-06 observed 12000 on a good
	 * answer, which is one observation and not the provider's code list.
	 */
	parseStatusCode?: number;
};

export type OxylabsRequestInput = {
	system: OxylabsVisitorSystem;
	prompt: string;
};

export type OxylabsAdapterDeps = {
	/** Web Scraper API credentials. They travel only in the Authorization header. */
	username: string;
	password: string;
	/** The queries endpoint. HTTPS only — the credentials travel in a header. */
	endpoint?: string;
	/** Which visitor surface this adapter instance measures. */
	system: OxylabsVisitorSystem;
	/**
	 * Transport is injected rather than read off the global: it is what lets a
	 * test exercise this module without a network, and what keeps every
	 * outbound call visible in the wiring instead of hidden in the module.
	 */
	fetchImpl: typeof fetch;
	/**
	 * A permit carries a scenario id, not the scenario text, and this module
	 * holds no database imports — the caller resolves the text for the tenant
	 * that owns the permit.
	 */
	resolveScenarioText: (permit: SelenaExecutablePermit) => Promise<string> | string;
	/**
	 * Brand, competitor and domain terms for extraction, resolved per permit
	 * like the scenario text. Optional: without it the run is stored with its
	 * raw response only, and extraction can be re-run from that later.
	 */
	resolveExtractionContext?: (permit: SelenaExecutablePermit) => Promise<ExtractionContext> | ExtractionContext;
	now?: () => Date;
	timeoutMs?: number;
	jobTimeoutMs?: number;
	/** Base poll interval; 0 polls without waiting, which is what a test wants. */
	pollMs?: number;
	maxResponseBytes?: number;
	/** Override once a different request shape is confirmed against the account. */
	buildRequestBody?: (input: OxylabsRequestInput) => unknown;
	/**
	 * Override once a different response shape is confirmed. Receives the
	 * parsed results payload, or the raw body string when the body was not
	 * JSON at all. Returning null (or throwing) means "this is not a shape I
	 * understand", which is recorded as MALFORMED_RESPONSE — never as an
	 * empty answer.
	 */
	parseAnswer?: (raw: unknown) => OxylabsAnswer | null;
};

/** Whether a cost came from the provider or from the local estimate. */
export type OxylabsCostBasis = "provider_reported" | "estimated";

class ResponseTooLargeError extends Error {}

export function resolveOxylabsCost(reportedCostUsd?: number | null): {
	costUsd: number | null;
	basis: OxylabsCostBasis;
} {
	if (typeof reportedCostUsd === "number" && Number.isFinite(reportedCostUsd) && reportedCostUsd >= 0)
		return { costUsd: reportedCostUsd, basis: "provider_reported" };
	// Visitor View is a search-backed surface by definition, so the estimate is
	// taken with web search on. The results payload names no charge, so every
	// row this adapter writes is an estimate until the invoice says otherwise.
	return { costUsd: estimateRunCostUsd("oxylabs", true), basis: "estimated" };
}

/** Past this, prose that mentions signing up is prose, not an interstitial. */
export const OXYLABS_AUTH_WALL_MAX_CHARS = 600;
const AUTH_WALL_PATTERN = /sign up|sign in|log in|create a free account|continue with google|verify you are human/i;

/**
 * A wall is not a short answer, and which of the two a row is decides whether
 * it is evidence at all. The Bright Data collector returns Perplexity's
 * sign-up page on every call, and one of its rows — 366 characters, no
 * sources — was stored VALID on 2026-09-04. A canary that counts a row like
 * that as healthy measures the collector rather than the brand.
 *
 * The phrases are the ones the live probe watches for, and it imports this
 * rather than keeping a second copy, so the verdict a probe gives and the
 * verdict a paid run gives cannot drift apart.
 */
export function looksLikeOxylabsAuthWall(text: string): boolean {
	const trimmed = text.trim();
	return trimmed !== "" && trimmed.length < OXYLABS_AUTH_WALL_MAX_CHARS && AUTH_WALL_PATTERN.test(trimmed);
}

/**
 * The job body the provider registry sends for this source. `parse: true` is
 * what turns the page into the structured content read below; without it the
 * result is the page's HTML and nothing here can read an answer off it.
 */
export function buildOxylabsRequestBody(input: OxylabsRequestInput): Record<string, unknown> {
	return { source: oxylabsSource[input.system], prompt: input.prompt, parse: true };
}

// The fields extractTextFromOxylabs reads, in its order. Read here directly
// because that extractor answers an empty payload with a sentence, and a
// sentence is not an empty answer.
const ANSWER_TEXT_FIELDS = ["answer_results_md", "markdown_text", "response_text", "answer_text", "answer"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/**
 * The parsed content of a results payload: `{ results: [{ content }] }`. A
 * bare content record is accepted too, so a pinned parser can be handed the
 * inner object. A content that is not an object — the page's HTML when the
 * provider could not parse it — is not content this adapter can read.
 */
function contentOf(
	raw: unknown,
): { content: Record<string, unknown> | null; envelope: Record<string, unknown> } | null {
	const envelope = asRecord(raw);
	if (!envelope) return null;
	if (!Array.isArray(envelope.results)) return { content: envelope, envelope: { results: [{ content: envelope }] } };
	const first = asRecord(envelope.results[0]);
	return { content: asRecord(first?.content), envelope };
}

/**
 * Default reading of a results payload. Deliberately stricter than the
 * registry's extractor: it never turns an unknown record into an "answer",
 * because that would store a measurement of something nobody read.
 *
 * Exported so the owner's shape-pinning path (parseAnswer injection) can wrap
 * or replace it without editing the adapter.
 */
export function parseOxylabsAnswer(raw: unknown): OxylabsAnswer | null {
	const parsed = contentOf(raw);
	if (!parsed?.content) return null;
	const { content, envelope } = parsed;

	let answerText = "";
	let sawAnswerField = false;
	for (const field of ANSWER_TEXT_FIELDS) {
		const value = content[field];
		if (typeof value !== "string") continue;
		sawAnswerField = true;
		answerText = value.trim();
		if (answerText !== "") break;
	}
	// A payload with no answer field of any known name is not an empty answer:
	// it is a shape this parser does not understand, and the two must not be
	// recorded as the same thing.
	if (!sawAnswerField) return null;

	// The registry's citation reader already knows every source field this
	// provider uses across its AI sources, dedupes, and keeps only http(s)
	// links; what it returns is what the answer displayed, and nothing more.
	const sources: OxylabsSource[] = extractCitationsFromOxylabs(envelope).map(({ url, domain, title }) => ({
		url,
		domain,
		...(title ? { title } : {}),
	}));
	const parseStatusCode = content.parse_status_code;
	return {
		answerText,
		sources,
		...(typeof parseStatusCode === "number" ? { parseStatusCode } : {}),
	};
}

/**
 * What an unreadable payload contained, without quoting it: the field names
 * it carried, the provider's parse status, and its own status line when it
 * has one. Field names and a status are neither the answer text nor the
 * credential, which is what makes them safe to write down.
 */
export function describeUnreadableOxylabsPayload(payload: unknown, scrub: (value: string) => string): string {
	if (typeof payload === "string") return `body: text, ${payload.length} chars`;
	const parsed = contentOf(payload);
	if (!parsed) return `body: ${Array.isArray(payload) ? "array" : typeof payload}`;
	const record = parsed.content ?? parsed.envelope;
	const keys = Object.keys(record).slice(0, 20).join(",");
	const notes = ["status", "message", "error", "warning"]
		.map((field) => {
			const value = record[field];
			return typeof value === "string" && value.trim() !== "" ? `${field}=${scrub(value).slice(0, 200)}` : null;
		})
		.filter((note): note is string => note !== null);
	const parseStatus = record.parse_status_code;
	if (typeof parseStatus === "number") notes.push(`parse_status_code=${parseStatus}`);
	if (parsed.content === null) notes.unshift("content=unparsed");
	return [`keys=${keys || "none"}`, ...notes].join(" ");
}

/**
 * A handle, never the payload. The visitor answer belongs in private storage,
 * so what the run row keeps is the provider's own job id — which is how the
 * same result is looked up again on Oxylabs' side — or, when no job was ever
 * named, a digest of the body that identifies it without revealing it.
 */
function rawResponseReference(jobId: string | undefined, rawBody: string): string {
	if (jobId && jobId.trim() !== "") return `oxylabs:${jobId.trim()}`;
	return `oxylabs:sha256:${createHash("sha256").update(rawBody).digest("hex")}`;
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/** The statuses the registry treats as "ask again", not "give up". */
function isTransientStatus(status: number): boolean {
	return status === 204 || status === 408 || status === 429 || status >= 500;
}

type CostFields = Pick<RunOutcome, "costUsd" | "costBasis" | "provider">;
type InvalidOutcomeFields = CostFields & Partial<Pick<RunOutcome, "rawResponseReference">>;

/**
 * §10.2: once a job has been submitted the charge may exist whether or not a
 * usable answer came back, so every post-submission outcome carries a cost —
 * the provider's reported figure when the payload names one, the estimate
 * otherwise. An unrecorded charge is how a cap alert reads $0 while a broken
 * cycle burns real budget.
 */
function costFields(reportedCostUsd?: number | null): CostFields {
	const { costUsd, basis } = resolveOxylabsCost(reportedCostUsd);
	return costUsd === null
		? {}
		: {
				costUsd,
				costBasis: basis === "provider_reported" ? ("actual" as const) : ("estimated" as const),
				provider: "oxylabs",
			};
}

function invalidOutcome(permit: SelenaExecutablePermit, reason: string, fields: InvalidOutcomeFields = {}): RunOutcome {
	return { dispatchKey: permit.dispatchKey, status: "INVALID", validity: "INVALID", invalidReason: reason, ...fields };
}

function failedOutcome(permit: SelenaExecutablePermit, reason: string, fields: InvalidOutcomeFields = {}): RunOutcome {
	return { dispatchKey: permit.dispatchKey, status: "FAILED", validity: "INVALID", invalidReason: reason, ...fields };
}

async function readBodyWithinLimit(response: Response, limitBytes: number): Promise<string> {
	const declared = Number(response.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > limitBytes) throw new ResponseTooLargeError();
	const body = response.body;
	if (!body) {
		const text = await response.text();
		if (new TextEncoder().encode(text).byteLength > limitBytes) throw new ResponseTooLargeError();
		return text;
	}
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let received = 0;
	let text = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		received += value.byteLength;
		// Stop pulling rather than buffer first and measure after: an oversized
		// body must not be able to exhaust the worker's memory.
		if (received > limitBytes) {
			await reader.cancel();
			throw new ResponseTooLargeError();
		}
		text += decoder.decode(value, { stream: true });
	}
	return text + decoder.decode();
}

/**
 * Visitor View measurement over Oxylabs. One permit produces exactly one job;
 * polling reads the result that job produces and never submits another. Every
 * outcome path returns the permit's dispatch key, because the executor refuses
 * an outcome whose key does not match the permit it spent.
 */
export function createOxylabsAdapter(deps: OxylabsAdapterDeps): SelenaMeasurementAdapter {
	if (deps.username.trim() === "") throw new Error("OXYLABS_USERNAME_MISSING");
	if (deps.password.trim() === "") throw new Error("OXYLABS_PASSWORD_MISSING");
	const endpoint = (deps.endpoint ?? OXYLABS_DEFAULT_ENDPOINT).trim().replace(/\/+$/, "");
	// The credentials travel in a request header, so a plaintext endpoint would
	// put them on the wire; a mock transport needs no URL scheme to be relaxed.
	if (!/^https:\/\//i.test(endpoint)) throw new Error("OXYLABS_ENDPOINT_INSECURE");
	if (!(oxylabsVisitorSystems as readonly string[]).includes(deps.system))
		throw new Error("OXYLABS_SYSTEM_UNSUPPORTED");

	const now = deps.now ?? (() => new Date());
	const maxResponseBytes = deps.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
	const buildRequestBody = deps.buildRequestBody ?? buildOxylabsRequestBody;
	const parseAnswer = deps.parseAnswer ?? parseOxylabsAnswer;
	const jobTimeoutMs = deps.jobTimeoutMs ?? DEFAULT_JOB_TIMEOUT_MS;
	const pollMs = deps.pollMs ?? DEFAULT_POLL_MS;
	// The only place the credentials are assembled. Never put in a body, a
	// URL, an outcome or an error.
	const authorization = `Basic ${Buffer.from(`${deps.username}:${deps.password}`).toString("base64")}`;
	// A surface that echoes request material back would otherwise put a
	// credential into anything written from a payload — a stored row or a log
	// line alike.
	const scrub = (value: string) =>
		value.split(deps.username).join("[redacted-credential]").split(deps.password).join("[redacted-credential]");
	const describe = (payload: unknown) => describeUnreadableOxylabsPayload(payload, scrub);

	function pollDelay(attempt: number): number {
		if (pollMs <= 0) return 0;
		return Math.min(pollMs * 2 ** Math.floor(attempt / 5), POLL_MAX_MS);
	}

	/**
	 * One HTTP exchange inside the job's remaining budget. A call that would
	 * start after the deadline is not made; a call the deadline interrupts is
	 * reported as aborted so the caller can classify it.
	 */
	async function exchange(
		url: string,
		init: RequestInit,
		deadlineAt: number,
	): Promise<{ kind: "response"; response: Response } | { kind: "aborted" } | { kind: "transport" }> {
		const remaining = deadlineAt - Date.now();
		if (remaining <= 0) return { kind: "aborted" };
		const controller = new AbortController();
		const timer = setTimeout(
			() => controller.abort(),
			Math.max(1, Math.min(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS, remaining)),
		);
		try {
			const response = await deps.fetchImpl(url, { ...init, signal: controller.signal });
			return { kind: "response", response };
		} catch (error) {
			// The provider error is classified, never quoted: a thrown request
			// error can carry the request headers, and this text is stored.
			return isAbortError(error) || controller.signal.aborted ? { kind: "aborted" } : { kind: "transport" };
		} finally {
			clearTimeout(timer);
		}
	}

	async function discard(response: Response): Promise<void> {
		// The error body can echo request material back, so it is dropped
		// rather than read into the run row.
		await response.body?.cancel().catch(() => {});
	}

	async function attemptOnce(
		permit: SelenaExecutablePermit,
		scenarioText: string,
		deadlineAt: number,
	): Promise<RunOutcome> {
		// The permit is the authorization window: a job that outlives it would
		// return an answer nothing is allowed to record any more.
		if (Math.min(permit.expiresAt.getTime() - now().getTime(), deadlineAt - Date.now()) <= 0)
			return invalidOutcome(permit, "TIMEOUT");

		// Submit. From here on a charge may exist, so every outcome carries one.
		const submitted = await exchange(
			endpoint,
			{
				method: "POST",
				headers: { Authorization: authorization, "Content-Type": "application/json" },
				body: JSON.stringify(buildRequestBody({ system: deps.system, prompt: scenarioText })),
			},
			deadlineAt,
		);
		if (submitted.kind === "aborted") return invalidOutcome(permit, "TIMEOUT", costFields());
		if (submitted.kind === "transport") return failedOutcome(permit, "TRANSPORT_ERROR", costFields());
		if (!submitted.response.ok) {
			await discard(submitted.response);
			return failedOutcome(permit, `PROVIDER_HTTP_${submitted.response.status}`, costFields());
		}
		let submitBody: string;
		try {
			submitBody = await readBodyWithinLimit(submitted.response, maxResponseBytes);
		} catch (error) {
			if (error instanceof ResponseTooLargeError) return invalidOutcome(permit, "RESPONSE_TOO_LARGE", costFields());
			return failedOutcome(permit, "TRANSPORT_ERROR", costFields());
		}
		let job: Record<string, unknown> | null;
		try {
			job = asRecord(JSON.parse(submitBody));
		} catch {
			job = null;
		}
		const jobId = typeof job?.id === "string" && job.id.trim() !== "" ? job.id.trim() : null;
		if (jobId === null) {
			console.warn(`[oxylabs] ${deps.system} submission carried no job id — ${describe(job ?? submitBody)}`);
			return invalidOutcome(permit, "MALFORMED_RESPONSE", {
				...costFields(),
				rawResponseReference: rawResponseReference(undefined, submitBody),
			});
		}
		const reference = { rawResponseReference: rawResponseReference(jobId, submitBody) };
		const statusUrl = `${endpoint}/${encodeURIComponent(jobId)}`;

		// Poll. The job is the paid call; asking after it is not another one.
		let status = typeof job?.status === "string" ? job.status.toLowerCase() : "";
		let attempt = 0;
		while (status !== "done") {
			if (status === "faulted") return invalidOutcome(permit, "JOB_FAULTED", { ...costFields(), ...reference });
			const wait = Math.min(pollDelay(attempt++), Math.max(0, deadlineAt - Date.now()));
			if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
			// Both clocks bound the wait: the job budget on the wall clock, the
			// permit on the injected one, so expiry stays testable.
			if (deadlineAt - Date.now() <= 0 || permit.expiresAt.getTime() - now().getTime() <= 0)
				return invalidOutcome(permit, "JOB_NOT_READY", { ...costFields(), ...reference });
			const polled = await exchange(
				statusUrl,
				{ method: "GET", headers: { Authorization: authorization } },
				deadlineAt,
			);
			if (polled.kind === "aborted") return invalidOutcome(permit, "JOB_NOT_READY", { ...costFields(), ...reference });
			if (polled.kind === "transport") continue;
			if (!polled.response.ok) {
				const code = polled.response.status;
				await discard(polled.response);
				if (isTransientStatus(code)) continue;
				return failedOutcome(permit, `PROVIDER_HTTP_${code}`, { ...costFields(), ...reference });
			}
			let state: Record<string, unknown> | null;
			try {
				state = asRecord(JSON.parse(await readBodyWithinLimit(polled.response, maxResponseBytes)));
			} catch {
				state = null;
			}
			status = typeof state?.status === "string" ? state.status.toLowerCase() : "";
		}

		// Fetch the result the job produced.
		let raw: string | null = null;
		for (let fetchAttempt = 0; raw === null; fetchAttempt++) {
			if (deadlineAt - Date.now() <= 0)
				return invalidOutcome(permit, "JOB_NOT_READY", { ...costFields(), ...reference });
			const fetched = await exchange(
				`${statusUrl}/results`,
				{ method: "GET", headers: { Authorization: authorization } },
				deadlineAt,
			);
			if (fetched.kind === "aborted") return invalidOutcome(permit, "JOB_NOT_READY", { ...costFields(), ...reference });
			if (fetched.kind === "transport")
				return failedOutcome(permit, "TRANSPORT_ERROR", { ...costFields(), ...reference });
			if (!fetched.response.ok) {
				const code = fetched.response.status;
				await discard(fetched.response);
				if (isTransientStatus(code)) {
					const wait = Math.min(pollDelay(fetchAttempt), Math.max(0, deadlineAt - Date.now()));
					if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
					continue;
				}
				return failedOutcome(permit, `PROVIDER_HTTP_${code}`, { ...costFields(), ...reference });
			}
			try {
				raw = await readBodyWithinLimit(fetched.response, maxResponseBytes);
			} catch (error) {
				if (error instanceof ResponseTooLargeError)
					return invalidOutcome(permit, "RESPONSE_TOO_LARGE", { ...costFields(), ...reference });
				return failedOutcome(permit, "TRANSPORT_ERROR", { ...costFields(), ...reference });
			}
		}

		// A non-JSON body is handed to the parser as the raw string rather than
		// refused here: the confirmed shape may not be JSON, and the default
		// parser reports anything it does not recognize as malformed.
		let payload: unknown;
		try {
			payload = JSON.parse(raw);
		} catch {
			payload = raw;
		}
		let answer: OxylabsAnswer | null;
		try {
			answer = parseAnswer(payload);
		} catch {
			answer = null;
		}
		if (!answer) {
			console.warn(`[oxylabs] ${deps.system} job ${jobId} held no readable answer — ${describe(payload)}`);
			return invalidOutcome(permit, "MALFORMED_RESPONSE", { ...costFields(), ...reference });
		}
		// Storing the answer text (CABINET_MODEL §4a) must never store a
		// credential: a surface that echoes request material back would
		// otherwise write it into a row read by more people than hold it.
		answer = {
			...answer,
			answerText: scrub(answer.answerText),
			sources: answer.sources.map((source) => ({
				...source,
				url: scrub(source.url),
				...(source.title ? { title: scrub(source.title) } : {}),
			})),
		};
		if (answer.answerText.trim() === "")
			return invalidOutcome(permit, "EMPTY_RESPONSE", { ...costFields(answer.costUsd), ...reference });

		// Both conditions together, because either alone misreads a row: a real
		// answer to "where can I sign up for a cooking class" carries the phrase,
		// and the sign-up page carries no citations. The charge stands — the job
		// was submitted and the wall was served — but the row is not an answer.
		if (answer.sources.length === 0 && looksLikeOxylabsAuthWall(answer.answerText)) {
			console.warn(
				`[oxylabs] ${deps.system} job ${jobId} served a sign-up wall, not an answer — ${answer.answerText.length} chars, no sources`,
			);
			return invalidOutcome(permit, "PROVIDER_AUTH_WALL", { ...costFields(answer.costUsd), ...reference });
		}

		// Extraction is an enrichment of a call that already succeeded and was
		// paid for: a context failure must not turn paid evidence into a FAILED
		// row. The raw response is stored either way, so a missing measurement
		// is recoverable offline rather than lost.
		let measurement: ReturnType<typeof extractMeasurement> | null = null;
		if (deps.resolveExtractionContext) {
			try {
				const extracted = extractMeasurement({
					answerText: answer.answerText,
					sources: answer.sources,
					// The sold surface, not the source key: the executor refuses
					// evidence attributed to a system the permit did not authorize,
					// and a permit carries the catalog's name for it.
					system: oxylabsVisitorSurface[deps.system],
					// Visitor View is the public surface answering a live query, so
					// what it returned is a live-search observation.
					captureMode: "live_search",
					context: await deps.resolveExtractionContext(permit),
				});
				// Validated here, not in the executor: a context that produces a
				// contract-invalid measurement must cost the measurement, never
				// the paid run.
				measurement = runMeasurementSchema.safeParse(extracted).success ? extracted : null;
			} catch {
				measurement = null;
			}
		}
		// What the canary reads to decide whether the route can move: the probe
		// of 2026-09-06 answered in 447 characters with ten sources, so a run of
		// shorter and sourceless answers is the wall in another shape even when
		// no row matched the pattern above.
		console.info(
			`[oxylabs] ${deps.system} job ${jobId} answered ${answer.answerText.length} chars, ${answer.sources.length} sources` +
				(answer.parseStatusCode === undefined ? "" : `, parse_status_code=${answer.parseStatusCode}`),
		);
		return {
			dispatchKey: permit.dispatchKey,
			status: "SUCCEEDED",
			validity: "VALID",
			rawResponseReference: rawResponseReference(answer.providerRequestId ?? jobId, raw),
			// CABINET_MODEL §4a: the answer text is retained with the run for the
			// owner's window so findings can be recomputed without buying a
			// second measurement; the reference stays for provider-side lookup
			// after the text expires. Only the answer body — an error body is
			// never stored (see the discard paths above).
			answer: { text: answer.answerText, retainUntil: answerRetainUntil(now()) },
			// Displayed-source evidence survives independently of extraction.
			...(answer.sources.length > 0 ? { sources: answer.sources } : {}),
			// No tokenUsage: a scraped visitor surface reports no token
			// accounting, and a zero would read as a measured value.
			...costFields(answer.costUsd),
			...(measurement === null ? {} : { measurement }),
		};
	}

	async function execute(permit: SelenaExecutablePermit): Promise<RunOutcome> {
		const deadlineAt = Date.now() + Math.max(0, Math.min(jobTimeoutMs, permit.expiresAt.getTime() - now().getTime()));
		let scenarioText: string;
		try {
			scenarioText = (await deps.resolveScenarioText(permit)).trim();
		} catch {
			// Resolution failures are not the provider's; failing here means no
			// job is submitted, so the permit is spent without spend.
			return failedOutcome(permit, "SCENARIO_TEXT_UNAVAILABLE");
		}
		if (scenarioText === "") return failedOutcome(permit, "SCENARIO_TEXT_UNAVAILABLE");
		// The permit is the paid-call cardinality boundary: one job, polled to
		// its result, and never a second submission.
		return attemptOnce(permit, scenarioText, deadlineAt);
	}

	return {
		// Oxylabs here is a Visitor View provider; an API View permit routed
		// here would be measuring something other than what it was sold as.
		channel: "visitor_view",
		async measure(permit: SelenaMeasurementPermit) {
			if (permit.channel !== "visitor_view") throw new Error("MEASUREMENT_CHANNEL_MISMATCH");
			// Planning only. Transport happens in execute, behind the executor's
			// guards, so nothing can reach the provider through this method.
			return { dispatchKey: permit.dispatchKey, status: "queued" as const };
		},
		async execute(permit: SelenaExecutablePermit) {
			// Parsed here as well as in the executor: this module owns its own
			// contract, so a mapping bug surfaces as a refusal rather than as a
			// malformed row reaching storage.
			return runOutcomeSchema.parse(await execute(permit));
		},
	};
}
