import { randomUUID } from "node:crypto";
import { db } from "@workspace/lib/db/db";
import type { ExternalLocalAuditContent } from "@workspace/lib/selena-local-external-audit";
import { localPilotBodyHash } from "@workspace/lib/selena-local-pilot-orchestrator";
import { localReportPrintableHtml } from "@workspace/lib/selena-local-report-print";
import { type LocalReportContent, localReportCsv } from "@workspace/lib/selena-local-report-publication";
import { createLocalReportStore, type ReportMutation } from "@workspace/lib/selena-local-report-store";
import { z } from "zod";
import {
	parseIdempotencyKey,
	SelenaApiHttpError,
	selenaApiErrorResponse,
	selenaApiHttpErrorResponse,
} from "../lib/selena-api-http";
import type { AuthContext } from "../lib/selena-auth-context";

const MAX_BODY_BYTES = 32 * 1024;

/** Only Selena staff run the pilot workflow; a customer owner must not QC or publish their own report. */
const operatorOperations = new Set<ReportMutation>([
	"canary-review",
	"pilot-reschedule",
	"report-create",
	"qc",
	"publish",
	"deliver",
]);

export type LocalReportAuth = AuthContext & { platformOperator: boolean };

type LocalReportStore = Pick<ReturnType<typeof createLocalReportStore>, "mutate" | "read">;

export type LocalReportRouteDependencies = {
	authenticate: (request: Request) => Promise<LocalReportAuth>;
	store: LocalReportStore;
	requestId: () => string;
};

const notFoundCodes = new Set(["LOCAL_CYCLE_NOT_FOUND", "LOCAL_REPORT_NOT_FOUND", "LOCAL_VISIBILITY_DISABLED"]);
const forbiddenCodes = new Set([
	"LOCAL_OPERATOR_MEMBERSHIP_REQUIRED",
	"LOCAL_MEMBERSHIP_REQUIRED",
	"LOCAL_DELIVERY_RECIPIENT_REQUIRED",
	"LOCAL_SESSION_REQUIRED",
]);

function errorResponse(error: unknown, requestId: string): Response {
	if (error instanceof SelenaApiHttpError) return selenaApiHttpErrorResponse(error, requestId);
	if (error instanceof z.ZodError)
		return selenaApiErrorResponse(400, {
			code: "BODY_INVALID",
			message: "Request body does not match the operation.",
			requestId,
			retryable: false,
		});
	const message = error instanceof Error ? error.message : String(error);
	const code = message.split(":")[0];
	if (message.startsWith("Unauthorized"))
		return selenaApiErrorResponse(401, {
			code: "UNAUTHENTICATED",
			message: "Authentication is required.",
			requestId,
			retryable: false,
		});
	// Membership of another tenant and a disabled feature are indistinguishable from a missing cycle.
	if (message.startsWith("Forbidden") || notFoundCodes.has(code))
		return selenaApiErrorResponse(404, {
			code: "LOCAL_REPORT_NOT_FOUND",
			message: "Local report not found.",
			requestId,
			retryable: false,
		});
	if (forbiddenCodes.has(code))
		return selenaApiErrorResponse(403, { code, message: "This action is not permitted.", requestId, retryable: false });
	if (code === "IDEMPOTENCY_BODY_CONFLICT")
		return selenaApiErrorResponse(409, {
			code,
			message: "Idempotency-Key was already used with a different body.",
			requestId,
			retryable: false,
		});
	if (/^LOCAL_[A-Z0-9_]+$/.test(code))
		return selenaApiErrorResponse(409, {
			code,
			message: "The report is not in a state that allows this action.",
			requestId,
			retryable: false,
		});
	return selenaApiErrorResponse(500, {
		code: "INTERNAL_ERROR",
		message: "The Local report request could not be completed.",
		requestId,
		retryable: true,
	});
}

function parseCycleId(value: string): string {
	const parsed = z.string().uuid().safeParse(value);
	if (!parsed.success) throw new Error("LOCAL_CYCLE_NOT_FOUND");
	return parsed.data;
}

/** Session cookies ride along cross-site, so a mutation must prove it came from this origin. */
function requireSameOrigin(request: Request): void {
	const origin = request.headers.get("origin");
	if (!origin || origin !== new URL(request.url).origin)
		throw new SelenaApiHttpError(403, "ORIGIN_FORBIDDEN", "Request origin is not allowed.");
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
	const raw = await request.text();
	if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES)
		throw new SelenaApiHttpError(413, "BODY_TOO_LARGE", "Request body is too large.");
	if (raw.trim() === "") return {};
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		throw new SelenaApiHttpError(400, "JSON_INVALID", "Request body must be valid JSON.");
	}
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new SelenaApiHttpError(400, "BODY_INVALID", "Request body must be a JSON object.");
	return value as Record<string, unknown>;
}

function requireSession(auth: LocalReportAuth): void {
	if (auth.authType !== "session")
		throw new SelenaApiHttpError(403, "LOCAL_SESSION_REQUIRED", "A signed-in session is required.");
}

const printHeaders = {
	"content-type": "text/html; charset=utf-8",
	"content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
	"x-content-type-options": "nosniff",
	"cache-control": "private, no-store",
};

export function createSelenaLocalReportRouteHandlers(dependencies: LocalReportRouteDependencies) {
	const mutate = async (request: Request, operation: ReportMutation, cycleIdParam: string): Promise<Response> => {
		const requestId = dependencies.requestId();
		try {
			requireSameOrigin(request);
			const auth = await dependencies.authenticate(request);
			requireSession(auth);
			if (operatorOperations.has(operation) && !auth.platformOperator)
				throw new SelenaApiHttpError(
					403,
					"LOCAL_PLATFORM_OPERATOR_REQUIRED",
					"Only a Selena operator can perform this action.",
				);
			const cycleId = parseCycleId(cycleIdParam);
			const idempotencyKey = parseIdempotencyKey(request.headers);
			const body = await readJsonObject(request);
			const result = await dependencies.store.mutate({
				auth,
				tenantId: auth.tenantId,
				operation,
				cycleId,
				idempotencyKey,
				bodyHash: localPilotBodyHash({ operation, cycleId, body }),
				body,
			});
			return Response.json(result, { status: 200, headers: { "cache-control": "no-store" } });
		} catch (error) {
			return errorResponse(error, requestId);
		}
	};

	const read = async (request: Request, cycleIdParam: string, preview: boolean): Promise<Response> => {
		const requestId = dependencies.requestId();
		try {
			const auth = await dependencies.authenticate(request);
			requireSession(auth);
			if (preview && !auth.platformOperator)
				throw new SelenaApiHttpError(
					403,
					"LOCAL_PLATFORM_OPERATOR_REQUIRED",
					"Only a Selena operator can preview a report.",
				);
			const cycleId = parseCycleId(cycleIdParam);
			const url = new URL(request.url);
			const evidence = url.searchParams.get("evidence");
			const evidenceId = evidence === null ? undefined : z.string().uuid().safeParse(evidence).data;
			if (evidence !== null && !evidenceId) throw new Error("LOCAL_REPORT_NOT_FOUND");
			const report = await dependencies.store.read({ auth, cycleId, evidenceId, preview });
			if (!report) throw new Error("LOCAL_REPORT_NOT_FOUND");
			if (evidenceId) return Response.json(report, { headers: { "cache-control": "private, no-store" } });
			const full = report as {
				content: unknown;
				externalAudits?: Array<{ content: ExternalLocalAuditContent }>;
				requestParameters?: Parameters<typeof localReportPrintableHtml>[2];
			};
			const content = full.content as LocalReportContent;
			const external = (full.externalAudits ?? []).map((audit) => audit.content);
			const download = url.searchParams.get("download");
			if (download === "csv")
				return new Response(localReportCsv(content, external), {
					headers: {
						"content-type": "text/csv; charset=utf-8",
						"content-disposition": `attachment; filename="local-report-${cycleId}.csv"`,
						"cache-control": "private, no-store",
					},
				});
			if (download === "print")
				return new Response(localReportPrintableHtml(content, external, full.requestParameters), {
					headers: printHeaders,
				});
			if (download !== null) throw new SelenaApiHttpError(400, "DOWNLOAD_INVALID", "Unknown download format.");
			return Response.json(report, { headers: { "cache-control": "private, no-store" } });
		} catch (error) {
			return errorResponse(error, requestId);
		}
	};

	return {
		canaryReview: (request: Request, cycleId: string) => mutate(request, "canary-review", cycleId),
		pilotReschedule: (request: Request, cycleId: string) => mutate(request, "pilot-reschedule", cycleId),
		createReport: (request: Request, cycleId: string) => mutate(request, "report-create", cycleId),
		qc: (request: Request, cycleId: string) => mutate(request, "qc", cycleId),
		publish: (request: Request, cycleId: string) => mutate(request, "publish", cycleId),
		deliver: (request: Request, cycleId: string) => mutate(request, "deliver", cycleId),
		acknowledge: (request: Request, cycleId: string) => mutate(request, "acknowledge", cycleId),
		preview: (request: Request, cycleId: string) => read(request, cycleId, true),
		report: (request: Request, cycleId: string) => read(request, cycleId, false),
	};
}

async function authenticateSession(): Promise<LocalReportAuth> {
	const [{ resolveSessionAuthContext }, { getAuthSession, isAdmin }] = await Promise.all([
		import("../lib/selena-auth-context"),
		import("../lib/auth/helpers"),
	]);
	const auth = await resolveSessionAuthContext();
	const session = await getAuthSession();
	return { ...auth, platformOperator: session !== null && isAdmin(session) };
}

let defaultHandlers: ReturnType<typeof createSelenaLocalReportRouteHandlers> | undefined;

export function selenaLocalReportRouteHandlers() {
	defaultHandlers ??= createSelenaLocalReportRouteHandlers({
		authenticate: authenticateSession,
		store: createLocalReportStore(db, process.env),
		requestId: randomUUID,
	});
	return defaultHandlers;
}
