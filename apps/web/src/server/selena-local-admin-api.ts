import { randomUUID } from "node:crypto";
import { PROVIDER_CANARY_SCOPE } from "@workspace/selena-visibility-contracts";
import { z } from "zod";
import {
	hashIdempotencyBody,
	parseIdempotencyKey,
	requireSelenaApiScope,
	SelenaApiHttpError,
	selenaApiErrorResponse,
	selenaApiHttpErrorResponse,
} from "../lib/selena-api-http";
import { type AuthContext, resolveApiKeyAuthContext } from "../lib/selena-auth-context";
import { runSelenaApiMutation, type SelenaApiIdempotencyRunner } from "./selena-api-idempotency";

export const localAdminOperations = [
	"preflight",
	"approve",
	"stop",
	"maps-retry",
	"ai-retry",
	"provider-canary",
] as const;
export type LocalAdminOperation = (typeof localAdminOperations)[number];

type LocalAdminStoreInput = {
	auth: AuthContext;
	tenantId: string;
	operation: LocalAdminOperation;
	resourceId: string;
	idempotencyKey: string;
	bodyHash: string;
	body: Record<string, unknown>;
};

const localAdminSuccessResponseSchema = z.strictObject({
	operation: z.enum(localAdminOperations),
	resourceId: z.string().uuid(),
	status: z.enum(["ACCEPTED", "QUEUED", "STOPPED"]),
	providerCalls: z.number().int().nonnegative(),
});
type LocalAdminSuccessResponse = z.infer<typeof localAdminSuccessResponseSchema>;

export type SelenaLocalAdminStore = {
	execute(input: LocalAdminStoreInput): Promise<LocalAdminSuccessResponse | null>;
};

/**
 * Admin actions remain an explicit owner gate. No operation can mutate a
 * cycle, spend a provider budget, or return a fabricated success response
 * until the target schema, RLS and execution/approval proof are installed.
 */
export const LOCAL_ADMIN_OWNER_GATE_CODE = "OWNER_GATE_REQUIRED" as const;

export const failClosedLocalAdminStore: SelenaLocalAdminStore = {
	async execute({ operation }) {
		throw new SelenaApiHttpError(
			503,
			LOCAL_ADMIN_OWNER_GATE_CODE,
			`LOCAL_ADMIN_${operation.toUpperCase()} is unavailable until the target schema, RLS and approval gates are verified.`,
			true,
			{
				blocker: "LOCAL_ADMIN_SCHEMA_RLS_OR_APPROVAL_UNVERIFIED",
				providerCalls: 0,
				operation,
			},
		);
	},
};

export type LocalAdminRouteDependencies = {
	authenticate: (request: Request) => Promise<AuthContext>;
	store: SelenaLocalAdminStore;
	requestId: () => string;
	/** Optional transaction-owned durable idempotency adapter; absent stays fail-closed via the store. */
	idempotency?: SelenaApiIdempotencyRunner;
};

const defaultRouteDependencies: LocalAdminRouteDependencies = {
	authenticate: resolveApiKeyAuthContext,
	store: failClosedLocalAdminStore,
	requestId: randomUUID,
};

function requiredScope(operation: LocalAdminOperation): "local:execute" | "provider:canary" {
	return operation === "provider-canary" ? PROVIDER_CANARY_SCOPE : "local:execute";
}

function requireAdminScope(permissions: readonly string[], operation: LocalAdminOperation): void {
	const scope = requiredScope(operation);
	if (scope === "local:execute") {
		requireSelenaApiScope(permissions, scope);
		return;
	}
	if (!permissions.includes(scope)) {
		throw new SelenaApiHttpError(403, "SCOPE_FORBIDDEN", `API key lacks ${scope} scope.`, false, {
			requiredScope: scope,
		});
	}
}

function parseResourceId(resourceId: string): string {
	const parsed = z.string().uuid().safeParse(resourceId);
	if (!parsed.success) throw new SelenaApiHttpError(400, "RESOURCE_ID_INVALID", "resourceId must be a valid UUID.");
	return parsed.data;
}

async function readOptionalJson(request: Request): Promise<Record<string, unknown>> {
	const raw = await request.text();
	if (raw.trim() === "") return {};
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		throw new SelenaApiHttpError(400, "JSON_INVALID", "Request body must be valid JSON.");
	}
	const parsed = z.record(z.string(), z.unknown()).safeParse(value);
	if (!parsed.success) throw new SelenaApiHttpError(400, "BODY_INVALID", "Request body must be a JSON object.");
	return parsed.data;
}

function routeError(error: unknown, requestId: string): Response {
	if (error instanceof SelenaApiHttpError) return selenaApiHttpErrorResponse(error, requestId);
	const message = error instanceof Error ? error.message : String(error);
	if (message.startsWith("Unauthorized"))
		return selenaApiErrorResponse(401, {
			code: "UNAUTHENTICATED",
			message: "Authentication is required.",
			requestId,
			retryable: false,
		});
	if (message.startsWith("Forbidden"))
		return selenaApiErrorResponse(403, {
			code: "SCOPE_FORBIDDEN",
			message: "The credential lacks the required scope.",
			requestId,
			retryable: false,
		});
	return selenaApiErrorResponse(500, {
		code: "INTERNAL_ERROR",
		message: "The local admin request could not be completed.",
		requestId,
		retryable: true,
	});
}

export function createSelenaLocalAdminRouteHandlers(
	dependencies: LocalAdminRouteDependencies = defaultRouteDependencies,
) {
	const execute = async (request: Request, operation: LocalAdminOperation, resourceId: string): Promise<Response> => {
		const requestId = dependencies.requestId();
		try {
			const auth = await dependencies.authenticate(request);
			requireAdminScope(auth.permissions, operation);
			const validatedResourceId = parseResourceId(resourceId);
			const idempotencyKey = parseIdempotencyKey(request.headers);
			const body = await readOptionalJson(request);
			const bodyHash = hashIdempotencyBody({ operation, resourceId: validatedResourceId, body });
			const response = await runSelenaApiMutation({
				runner: dependencies.idempotency,
				identity: {
					tenantId: auth.tenantId,
					operation,
					resourceId: validatedResourceId,
					idempotencyKey,
					bodyHash,
				},
				execute: async () => {
					const result = await dependencies.store.execute({
						auth,
						tenantId: auth.tenantId,
						operation,
						resourceId: validatedResourceId,
						idempotencyKey,
						bodyHash,
						body,
					});
					if (result === null)
						throw new SelenaApiHttpError(
							503,
							LOCAL_ADMIN_OWNER_GATE_CODE,
							"Admin action did not produce a durable response.",
							true,
							{ providerCalls: 0, operation },
						);
					return { status: 202, body: result };
				},
			});
			const parsed = localAdminSuccessResponseSchema.safeParse(response.body);
			if (!parsed.success)
				throw new SelenaApiHttpError(
					503,
					LOCAL_ADMIN_OWNER_GATE_CODE,
					"Admin action did not produce a valid durable response.",
					true,
					{ providerCalls: 0, operation },
				);
			return Response.json(parsed.data, { status: response.status });
		} catch (error) {
			return routeError(error, requestId);
		}
	};

	return {
		preflight: (request: Request, cycleId: string) => execute(request, "preflight", cycleId),
		approve: (request: Request, cycleId: string) => execute(request, "approve", cycleId),
		stop: (request: Request, cycleId: string) => execute(request, "stop", cycleId),
		mapsRetry: (request: Request, runId: string) => execute(request, "maps-retry", runId),
		aiRetry: (request: Request, runId: string) => execute(request, "ai-retry", runId),
		providerCanary: (request: Request, providerId: string) => execute(request, "provider-canary", providerId),
	};
}

export const selenaLocalAdminRouteHandlers = createSelenaLocalAdminRouteHandlers();
