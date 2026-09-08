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
import { estimateRunCostUsd } from "../usage/cost";
import { looksLikeOxylabsAuthWall } from "./oxylabs-measurement-adapter";

// The third Visitor View transport for Perplexity. Olostep drives
// perplexity.ai/?q= in its own browsers and hands back what the page showed
// through the parser `@olostep/perplexity-results`, so an answer collected
// here is what a person is shown — the same channel as the Bright Data and
// Oxylabs adapters, not the Sonar API. It exists because the Bright Data
// collector returns the sign-up wall and the Oxylabs account answers 401
// (PERPLEXITY_REVIEW_2026-09-07.md); the probe of 2026-09-07 15:33Z returned
// 643 characters with ten citations through this vendor, in 944 seconds.
//
// It stays selectable only by an owner code change, like every live adapter:
// the execution contract's allowlist is the gate, not this module. It is not
// a member of any routing family — the `Perplexity` visitor route stays on
// Bright Data until a canary through this adapter says otherwise — so it is
// reached only when named outright as SELENA_MEASUREMENT_ADAPTER=olostep-perplexity.
//
// The wire shape is the one the provider registry already proved on the
// probe (packages/lib/src/providers/registry/olostep.ts): one single-item
// batch created with the parser, polled to completion, its item's retrieve id
// read, and the parsed content retrieved as JSON. It is sent here over an
// injected fetch rather than through the vendor's SDK for three reasons the
// registry does not have to care about: the SDK reads the global transport
// and retries on its own, so nothing here could bound an exchange by the
// permit's deadline; it rewrites status codes into its own readings — a 402
// with credits in the account was printed as an invalid API key — where a
// paid run has to store the status the provider actually sent; and it holds
// the key where this module's scrubbing cannot see it.

export const OLOSTEP_DEFAULT_ENDPOINT = "https://api.olostep.com/v1";
/** One HTTP exchange; the job as a whole has its own budget below. */
const DEFAULT_TIMEOUT_MS = 30_000;
/**
 * The whole create/poll/retrieve job. The probe of 2026-09-07 took 944
 * seconds for one answer, which a fifteen-minute window — the journal's
 * ceiling for the faster collectors — would have discarded as JOB_NOT_READY
 * after it was produced and billed. Twenty-five minutes is the deadline the
 * slow Bright Data surfaces already run under, and the worker's queue lease
 * leaves room after it.
 */
export const OLOSTEP_DEFAULT_JOB_TIMEOUT_MS = 25 * 60_000;
// The registry's pacing is a flat five seconds; this starts there, doubles
// every five polls and caps at fifteen, so a quarter-hour job is not three
// hundred status calls.
const DEFAULT_POLL_MS = 5_000;
const POLL_MAX_MS = 15_000;
/** A visitor answer is prose plus a source list; past this it is a runaway page. */
const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
/** The registry's page size for a batch's items, sent unchanged so the request is the proven one. */
const ITEMS_PAGE_SIZE = 50;

export const olostepVisitorSystems = ["perplexity"] as const;
export type OlostepVisitorSystem = (typeof olostepVisitorSystems)[number];

/**
 * Which sold surface each parser measures. The `satisfies` clause is the
 * point: a system this adapter can be pointed at has to be a surface the
 * catalog actually sells, so a run cannot be delivered under a name the
 * customer did not buy.
 */
export const olostepVisitorSurface = {
	perplexity: "Perplexity",
} as const satisfies Record<OlostepVisitorSystem, (typeof visitorSurfaces)[number]>;

/**
 * The parser and the page it is run over, per surface — the registry's own
 * table, restated so the two cannot drift. Credits are what one item costs
 * on the account, which is the unit the vendor bills in.
 */
export const olostepParser = {
	perplexity: {
		id: "@olostep/perplexity-results",
		credits: 3,
		url: (prompt: string) => `https://www.perplexity.ai/?q=${encodeURIComponent(prompt)}`,
	},
} as const satisfies Record<OlostepVisitorSystem, { id: string; credits: number; url: (prompt: string) => string }>;

/** A source the answer itself showed. Never inferred, never reconstructed. */
export type OlostepSource = { url: string; domain: string; title?: string };

export type OlostepAnswer = {
	/** The visible answer text. Empty string means the surface answered nothing. */
	answerText: string;
	/** Only links the payload carried; an answer without them yields []. */
	sources: OlostepSource[];
	/** What the provider says this call cost, when the payload reports it. */
	costUsd?: number;
	/** The surface's own name for what answered, when the payload carries one. Logged, never stored. */
	model?: string;
};

export type OlostepRequestInput = {
	system: OlostepVisitorSystem;
	prompt: string;
};

export type OlostepAdapterDeps = {
	/** The account's API key. It travels only in the Authorization header. */
	apiKey: string;
	/** The API root. HTTPS only — the key travels in a header. */
	endpoint?: string;
	/** Which visitor surface this adapter instance measures. */
	system: OlostepVisitorSystem;
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
	buildRequestBody?: (input: OlostepRequestInput) => unknown;
	/**
	 * Override once a different response shape is confirmed. Receives the
	 * retrieved payload — the retrieve body, whose `json_content` is the
	 * parser's output — or the raw body string when it was not JSON at all.
	 * Returning null (or throwing) means "this is not a shape I understand",
	 * which is recorded as MALFORMED_RESPONSE — never as an empty answer.
	 */
	parseAnswer?: (raw: unknown) => OlostepAnswer | null;
};

/** Whether a cost came from the provider or from the local estimate. */
export type OlostepCostBasis = "provider_reported" | "estimated";

class ResponseTooLargeError extends Error {}

export function resolveOlostepCost(reportedCostUsd?: number | null): {
	costUsd: number | null;
	basis: OlostepCostBasis;
} {
	if (typeof reportedCostUsd === "number" && Number.isFinite(reportedCostUsd) && reportedCostUsd >= 0)
		return { costUsd: reportedCostUsd, basis: "provider_reported" };
	// Visitor View is a search-backed surface by definition, so the estimate is
	// taken with web search on. The retrieved payload names no charge — the
	// vendor bills credits per item — so every row this adapter writes is an
	// estimate until the account's usage says otherwise.
	return { costUsd: estimateRunCostUsd("olostep", true), basis: "estimated" };
}

/**
 * What was sent, identified without revealing it. The probe prints the same
 * digest for the same key, so a probe that answered and a canary that was
 * refused can be compared on whether they sent the same credential.
 */
export function olostepCredentialFingerprint(apiKey: string): string {
	return createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
}

/**
 * The batch the provider registry creates for this surface: one item, the
 * parser named, nothing else. `custom_id` is the registry's constant; the
 * vendor requires one per item and this batch only ever holds one.
 */
export function buildOlostepRequestBody(input: OlostepRequestInput): Record<string, unknown> {
	const parser = olostepParser[input.system];
	return { items: [{ url: parser.url(input.prompt), custom_id: "1" }], parser: { id: parser.id } };
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/**
 * The parser's output out of a retrieve body. The body wraps it as
 * `json_content` — a JSON string, or on some responses the object itself —
 * and a bare content record is accepted too, so a pinned parser can be handed
 * the inner object. A `json_content` that is not readable JSON is not content
 * this adapter can read.
 */
function contentOf(raw: unknown): { content: Record<string, unknown> | null; wrapped: boolean } | null {
	const envelope = asRecord(raw);
	if (!envelope) return null;
	if (!("json_content" in envelope)) return { content: envelope, wrapped: false };
	const inner = envelope.json_content;
	if (typeof inner !== "string") return { content: asRecord(inner), wrapped: true };
	try {
		return { content: asRecord(JSON.parse(inner)), wrapped: true };
	} catch {
		return { content: null, wrapped: true };
	}
}

/**
 * Where the registry reads the answer text, in its order. Read here directly
 * because that reader answers an empty payload with a sentence, and a
 * sentence is not an empty answer.
 */
function answerTextCandidates(content: Record<string, unknown>): unknown[] {
	const result = asRecord(content.result);
	return [result?.markdown_content, content.answer_markdown, result?.text_content, content.answer];
}

/** Where the registry reads the displayed sources: the first field present wins, as it does there. */
function sourceEntries(content: Record<string, unknown>): unknown[] {
	const result = asRecord(content.result);
	const entries = content.sources ?? content.citations ?? result?.links_on_page ?? content.inline_references ?? [];
	return Array.isArray(entries) ? entries : [];
}

/**
 * Default reading of a retrieved payload. Deliberately stricter than the
 * registry's extractor: it never turns an unknown record into an "answer",
 * because that would store a measurement of something nobody read.
 *
 * Exported so the owner's shape-pinning path (parseAnswer injection) can wrap
 * or replace it without editing the adapter.
 */
export function parseOlostepAnswer(raw: unknown): OlostepAnswer | null {
	const parsed = contentOf(raw);
	if (!parsed?.content) return null;
	const { content } = parsed;

	let answerText = "";
	let sawAnswerField = false;
	for (const candidate of answerTextCandidates(content)) {
		if (typeof candidate !== "string") continue;
		sawAnswerField = true;
		answerText = candidate.trim();
		if (answerText !== "") break;
	}
	// A payload with no answer field of any known name is not an empty answer:
	// it is a shape this parser does not understand, and the two must not be
	// recorded as the same thing.
	if (!sawAnswerField) return null;

	// Only http(s) links, once each: what the answer displayed, and nothing
	// more. A title is kept under either name the parser has used for it.
	const sources: OlostepSource[] = [];
	const seen = new Set<string>();
	for (const entry of sourceEntries(content)) {
		const record = asRecord(entry);
		const url = typeof entry === "string" ? entry : record?.url;
		if (typeof url !== "string" || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
		let domain: string;
		try {
			domain = new URL(url).hostname.replace(/^www\./, "");
		} catch {
			continue;
		}
		if (domain === "") continue;
		seen.add(url);
		const title = record?.title ?? record?.label;
		sources.push({ url, domain, ...(typeof title === "string" && title.trim() !== "" ? { title } : {}) });
	}
	const model = content.model;
	return { answerText, sources, ...(typeof model === "string" && model !== "" ? { model } : {}) };
}

/**
 * What an unreadable payload contained, without quoting it: the field names
 * it carried and its own status line when it has one. Field names and a
 * status are neither the answer text nor the credential, which is what makes
 * them safe to write down.
 */
export function describeUnreadableOlostepPayload(payload: unknown, scrub: (value: string) => string): string {
	if (typeof payload === "string") return `body: text, ${payload.length} chars`;
	const envelope = asRecord(payload);
	if (!envelope) return `body: ${Array.isArray(payload) ? "array" : typeof payload}`;
	const parsed = contentOf(payload);
	const record = parsed?.content ?? envelope;
	const keys = Object.keys(record).slice(0, 20).join(",");
	const notes = ["status", "message", "error", "detail"]
		.map((field) => {
			const value = record[field];
			return typeof value === "string" && value.trim() !== "" ? `${field}=${scrub(value).slice(0, 200)}` : null;
		})
		.filter((note): note is string => note !== null);
	if (parsed?.wrapped && parsed.content === null) notes.unshift("json_content=unparsed");
	return [`keys=${keys || "none"}`, ...notes].join(" ");
}

/**
 * A handle, never the payload. The visitor answer belongs in private storage,
 * so what the run row keeps is the provider's own batch id — and, once the
 * result exists, the retrieve id that looks the same content up again on
 * Olostep's side — or, when no batch was ever named, a digest of the body
 * that identifies it without revealing it.
 */
function rawResponseReference(batchId: string | undefined, rawBody: string, retrieveId?: string): string {
	if (batchId && batchId.trim() !== "") {
		const handle = `olostep:${batchId.trim()}`;
		return retrieveId && retrieveId.trim() !== "" ? `${handle}/${retrieveId.trim()}` : handle;
	}
	return `olostep:sha256:${createHash("sha256").update(rawBody).digest("hex")}`;
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/** The statuses that mean "ask again", not "give up". */
function isTransientStatus(status: number): boolean {
	return status === 204 || status === 408 || status === 429 || status >= 500;
}

/** The batch's own vocabulary: the vendor's client returns on exactly these two. */
function batchStatusOf(record: Record<string, unknown> | null): string {
	return typeof record?.status === "string" ? record.status.trim().toLowerCase() : "";
}

type CostFields = Pick<RunOutcome, "costUsd" | "costBasis" | "provider">;
type InvalidOutcomeFields = CostFields & Partial<Pick<RunOutcome, "rawResponseReference">>;

/**
 * §10.2: once a batch has been created the charge may exist whether or not a
 * usable answer came back, so every post-submission outcome carries a cost —
 * the provider's reported figure when the payload names one, the estimate
 * otherwise. An unrecorded charge is how a cap alert reads $0 while a broken
 * cycle burns real budget.
 */
function costFields(reportedCostUsd?: number | null): CostFields {
	const { costUsd, basis } = resolveOlostepCost(reportedCostUsd);
	return costUsd === null
		? {}
		: {
				costUsd,
				costBasis: basis === "provider_reported" ? ("actual" as const) : ("estimated" as const),
				provider: "olostep",
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
 * Visitor View measurement over Olostep. One permit produces exactly one
 * batch; polling reads the result that batch produces and never creates
 * another. Every outcome path returns the permit's dispatch key, because the
 * executor refuses an outcome whose key does not match the permit it spent.
 */
export function createOlostepAdapter(deps: OlostepAdapterDeps): SelenaMeasurementAdapter {
	if (deps.apiKey.trim() === "") throw new Error("OLOSTEP_API_KEY_MISSING");
	// A Bearer value is one header line. A key carrying a newline or other
	// control character could never be sent — the transport refuses the
	// header before a request exists — so it is refused here by name rather
	// than surfacing later as a transport error on every permit.
	if (!/^[\x21-\x7e]+$/.test(deps.apiKey)) throw new Error("OLOSTEP_API_KEY_NOT_HEADER_SAFE");
	const endpoint = (deps.endpoint ?? OLOSTEP_DEFAULT_ENDPOINT).trim().replace(/\/+$/, "");
	// The key travels in a request header, so a plaintext endpoint would put
	// it on the wire; a mock transport needs no URL scheme to be relaxed.
	if (!/^https:\/\//i.test(endpoint)) throw new Error("OLOSTEP_ENDPOINT_INSECURE");
	if (!(olostepVisitorSystems as readonly string[]).includes(deps.system))
		throw new Error("OLOSTEP_SYSTEM_UNSUPPORTED");

	const now = deps.now ?? (() => new Date());
	const maxResponseBytes = deps.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
	const buildRequestBody = deps.buildRequestBody ?? buildOlostepRequestBody;
	const parseAnswer = deps.parseAnswer ?? parseOlostepAnswer;
	const jobTimeoutMs = deps.jobTimeoutMs ?? OLOSTEP_DEFAULT_JOB_TIMEOUT_MS;
	const pollMs = deps.pollMs ?? DEFAULT_POLL_MS;
	// The only place the credential is assembled into a header. Never put in a
	// body, a URL, an outcome or an error.
	const authorization = `Bearer ${deps.apiKey}`;
	// Printed once per adapter, not per job, in the probe's own wording: what a
	// refusal has to be checked against. The length catches the whitespace a
	// dashboard hides, the digest catches everything else, and neither can be
	// read back into a credential.
	console.info(
		`[olostep] ${deps.system} credential ${deps.apiKey.length} chars, digest ${olostepCredentialFingerprint(deps.apiKey)}`,
	);
	// A surface that echoes request material back would otherwise put the key
	// into anything written from a payload — a stored row or a log line alike.
	const scrub = (value: string) => value.split(deps.apiKey).join("[redacted-credential]");
	const describe = (payload: unknown) => describeUnreadableOlostepPayload(payload, scrub);

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

	/** A GET that asks again on the transient statuses and gives up on the rest. */
	async function fetchWithinBudget(
		url: string,
		deadlineAt: number,
	): Promise<
		| { kind: "body"; body: string }
		| { kind: "aborted" }
		| { kind: "transport" }
		| { kind: "refused"; status: number }
		| { kind: "too_large" }
	> {
		for (let attempt = 0; ; attempt++) {
			if (deadlineAt - Date.now() <= 0) return { kind: "aborted" };
			const fetched = await exchange(url, { method: "GET", headers: { Authorization: authorization } }, deadlineAt);
			if (fetched.kind !== "response") return fetched;
			if (!fetched.response.ok) {
				const status = fetched.response.status;
				await discard(fetched.response);
				if (!isTransientStatus(status)) return { kind: "refused", status };
				const wait = Math.min(pollDelay(attempt), Math.max(0, deadlineAt - Date.now()));
				if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
				continue;
			}
			try {
				return { kind: "body", body: await readBodyWithinLimit(fetched.response, maxResponseBytes) };
			} catch (error) {
				return error instanceof ResponseTooLargeError ? { kind: "too_large" } : { kind: "transport" };
			}
		}
	}

	async function attemptOnce(
		permit: SelenaExecutablePermit,
		scenarioText: string,
		deadlineAt: number,
	): Promise<RunOutcome> {
		// The permit is the authorization window: a batch that outlives it would
		// return an answer nothing is allowed to record any more.
		if (Math.min(permit.expiresAt.getTime() - now().getTime(), deadlineAt - Date.now()) <= 0)
			return invalidOutcome(permit, "TIMEOUT");

		// Create the batch. From here on a charge may exist, so every outcome
		// carries one.
		const submitted = await exchange(
			`${endpoint}/batches`,
			{
				method: "POST",
				headers: { Authorization: authorization, "Content-Type": "application/json" },
				body: JSON.stringify(buildRequestBody({ system: deps.system, prompt: scenarioText })),
			},
			deadlineAt,
		);
		// A submission that timed out or died in transit may still have reached
		// the provider and become a batch, so its charge is recorded: an
		// unrecorded charge is how a cap alert reads $0 while a cycle burns
		// budget.
		if (submitted.kind === "aborted") return invalidOutcome(permit, "TIMEOUT", costFields());
		if (submitted.kind === "transport") return failedOutcome(permit, "TRANSPORT_ERROR", costFields());
		if (!submitted.response.ok) {
			const status = submitted.response.status;
			await discard(submitted.response);
			// A 4xx is the provider answering that it refused the request: no
			// batch was created, so no credit was spent on it and an estimate
			// here would be spend the ledger has to explain away later. That
			// includes 402, which this vendor sends for an exhausted or unpaid
			// account and its client reports as an invalid key. A 5xx is the
			// ambiguous case — the batch may exist behind the error — and keeps
			// its charge.
			return failedOutcome(permit, `PROVIDER_HTTP_${status}`, status >= 400 && status < 500 ? {} : costFields());
		}
		let submitBody: string;
		try {
			submitBody = await readBodyWithinLimit(submitted.response, maxResponseBytes);
		} catch (error) {
			if (error instanceof ResponseTooLargeError) return invalidOutcome(permit, "RESPONSE_TOO_LARGE", costFields());
			return failedOutcome(permit, "TRANSPORT_ERROR", costFields());
		}
		let batch: Record<string, unknown> | null;
		try {
			batch = asRecord(JSON.parse(submitBody));
		} catch {
			batch = null;
		}
		const batchId = typeof batch?.id === "string" && batch.id.trim() !== "" ? batch.id.trim() : null;
		if (batchId === null) {
			console.warn(`[olostep] ${deps.system} submission carried no batch id — ${describe(batch ?? submitBody)}`);
			return invalidOutcome(permit, "MALFORMED_RESPONSE", {
				...costFields(),
				rawResponseReference: rawResponseReference(undefined, submitBody),
			});
		}
		const reference = { rawResponseReference: rawResponseReference(batchId, submitBody) };
		const batchUrl = `${endpoint}/batches/${encodeURIComponent(batchId)}`;

		// Poll. The batch is the paid call; asking after it is not another one.
		let status = batchStatusOf(batch);
		let attempt = 0;
		while (status !== "completed") {
			if (status === "failed") return invalidOutcome(permit, "JOB_FAULTED", { ...costFields(), ...reference });
			const wait = Math.min(pollDelay(attempt++), Math.max(0, deadlineAt - Date.now()));
			if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
			// Both clocks bound the wait: the job budget on the wall clock, the
			// permit on the injected one, so expiry stays testable.
			if (deadlineAt - Date.now() <= 0 || permit.expiresAt.getTime() - now().getTime() <= 0)
				return invalidOutcome(permit, "JOB_NOT_READY", { ...costFields(), ...reference });
			const polled = await exchange(batchUrl, { method: "GET", headers: { Authorization: authorization } }, deadlineAt);
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
			status = batchStatusOf(state);
		}

		// The batch's one item names where its result is kept.
		const items = await fetchWithinBudget(`${batchUrl}/items?limit=${ITEMS_PAGE_SIZE}`, deadlineAt);
		if (items.kind === "aborted") return invalidOutcome(permit, "JOB_NOT_READY", { ...costFields(), ...reference });
		if (items.kind === "transport") return failedOutcome(permit, "TRANSPORT_ERROR", { ...costFields(), ...reference });
		if (items.kind === "refused")
			return failedOutcome(permit, `PROVIDER_HTTP_${items.status}`, { ...costFields(), ...reference });
		if (items.kind === "too_large")
			return invalidOutcome(permit, "RESPONSE_TOO_LARGE", { ...costFields(), ...reference });
		let listing: Record<string, unknown> | null;
		try {
			listing = asRecord(JSON.parse(items.body));
		} catch {
			listing = null;
		}
		const first = Array.isArray(listing?.items) ? asRecord(listing.items[0]) : null;
		const retrieveId =
			typeof first?.retrieve_id === "string" && first.retrieve_id.trim() !== "" ? first.retrieve_id.trim() : null;
		if (retrieveId === null) {
			// The registry throws here — a completed batch with nothing to
			// retrieve. It is a shape, not an answer, and it cost a credit.
			console.warn(
				`[olostep] ${deps.system} batch ${batchId} completed with no retrievable item — ${describe(listing ?? items.body)}`,
			);
			return invalidOutcome(permit, "MALFORMED_RESPONSE", { ...costFields(), ...reference });
		}
		const resultReference = { rawResponseReference: rawResponseReference(batchId, submitBody, retrieveId) };

		// Retrieve the parsed content the batch produced.
		const retrieved = await fetchWithinBudget(
			`${endpoint}/retrieve?retrieve_id=${encodeURIComponent(retrieveId)}&formats=json`,
			deadlineAt,
		);
		if (retrieved.kind === "aborted")
			return invalidOutcome(permit, "JOB_NOT_READY", { ...costFields(), ...resultReference });
		if (retrieved.kind === "transport")
			return failedOutcome(permit, "TRANSPORT_ERROR", { ...costFields(), ...resultReference });
		if (retrieved.kind === "refused")
			return failedOutcome(permit, `PROVIDER_HTTP_${retrieved.status}`, { ...costFields(), ...resultReference });
		if (retrieved.kind === "too_large")
			return invalidOutcome(permit, "RESPONSE_TOO_LARGE", { ...costFields(), ...resultReference });
		const raw = retrieved.body;

		// A non-JSON body is handed to the parser as the raw string rather than
		// refused here: the confirmed shape may not be JSON, and the default
		// parser reports anything it does not recognize as malformed.
		let payload: unknown;
		try {
			payload = JSON.parse(raw);
		} catch {
			payload = raw;
		}
		let answer: OlostepAnswer | null;
		try {
			answer = parseAnswer(payload);
		} catch {
			answer = null;
		}
		if (!answer) {
			console.warn(`[olostep] ${deps.system} batch ${batchId} held no readable answer — ${describe(payload)}`);
			return invalidOutcome(permit, "MALFORMED_RESPONSE", { ...costFields(), ...resultReference });
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
			return invalidOutcome(permit, "EMPTY_RESPONSE", { ...costFields(answer.costUsd), ...resultReference });

		// Both conditions together, because either alone misreads a row: a real
		// answer to "where can I sign up for a cooking class" carries the phrase,
		// and the sign-up page carries no citations. The charge stands — the
		// batch ran and the wall was served — but the row is not an answer. The
		// definition is the Oxylabs adapter's, shared with the probe, so the
		// three verdicts cannot drift apart.
		if (answer.sources.length === 0 && looksLikeOxylabsAuthWall(answer.answerText)) {
			console.warn(
				`[olostep] ${deps.system} batch ${batchId} served a sign-up wall, not an answer — ${answer.answerText.length} chars, no sources`,
			);
			return invalidOutcome(permit, "PROVIDER_AUTH_WALL", { ...costFields(answer.costUsd), ...resultReference });
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
					// The sold surface, not the parser key: the executor refuses
					// evidence attributed to a system the permit did not authorize,
					// and a permit carries the catalog's name for it.
					system: olostepVisitorSurface[deps.system],
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
		// of 2026-09-07 answered in 643 characters with ten sources, so a run of
		// shorter and sourceless answers is the wall in another shape even when
		// no row matched the pattern above.
		console.info(
			`[olostep] ${deps.system} batch ${batchId} answered ${answer.answerText.length} chars, ${answer.sources.length} sources` +
				(answer.model === undefined ? "" : `, model=${scrub(answer.model).slice(0, 40)}`),
		);
		return {
			dispatchKey: permit.dispatchKey,
			status: "SUCCEEDED",
			validity: "VALID",
			...resultReference,
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
			// batch is created, so the permit is spent without spend.
			return failedOutcome(permit, "SCENARIO_TEXT_UNAVAILABLE");
		}
		if (scenarioText === "") return failedOutcome(permit, "SCENARIO_TEXT_UNAVAILABLE");
		// The permit is the paid-call cardinality boundary: one batch, polled to
		// its result, and never a second creation.
		return attemptOnce(permit, scenarioText, deadlineAt);
	}

	return {
		// Olostep here is a Visitor View provider; an API View permit routed
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
