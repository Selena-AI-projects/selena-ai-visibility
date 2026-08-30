import { randomUUID } from "node:crypto";
import {
	type LocalBusinessLocationCreateRequest,
	type LocalKeywordSetCreateRequest,
	type LocalPlaceEntityConfirmRequest,
	localBusinessLocationCreateRequestSchema,
	localKeywordSetCreateRequestSchema,
	localPlaceEntityConfirmRequestSchema,
} from "@workspace/selena-visibility-contracts";
import {
	hashIdempotencyBody,
	parseIdempotencyKey,
	requireSelenaApiScope,
	SelenaApiHttpError,
	selenaApiErrorResponse,
	selenaApiHttpErrorResponse,
} from "../lib/selena-api-http";
import { type AuthContext, resolveApiKeyAuthContext } from "../lib/selena-auth-context";

export type LocalSetupOperation = "location-create" | "place-entity-confirm" | "keyword-set-create";

type LocalSetupBody =
	| LocalBusinessLocationCreateRequest
	| LocalPlaceEntityConfirmRequest
	| LocalKeywordSetCreateRequest;

type LocalSetupStoreInput = {
	auth: AuthContext;
	operation: LocalSetupOperation;
	resourceId: string;
	idempotencyKey: string;
	bodyHash: string;
	body: LocalSetupBody;
};

export type SelenaLocalSetupStore = {
	execute(input: LocalSetupStoreInput): Promise<void>;
};

export const LOCAL_SETUP_OWNER_GATE_CODE = "OWNER_GATE_REQUIRED" as const;

export const failClosedLocalSetupStore: SelenaLocalSetupStore = {
	async execute({ operation }) {
		throw new SelenaApiHttpError(
			503,
			LOCAL_SETUP_OWNER_GATE_CODE,
			`LOCAL_${operation.toUpperCase()} is unavailable until the target schema, RLS and approval gates are verified.`,
			true,
			{
				blocker: "LOCAL_SETUP_SCHEMA_RLS_OR_APPROVAL_UNVERIFIED",
				providerCalls: 0,
				operation,
			},
		);
	},
};

export type LocalSetupRouteDependencies = {
	authenticate: (request: Request) => Promise<AuthContext>;
	store: SelenaLocalSetupStore;
	requestId: () => string;
};

const defaultRouteDependencies: LocalSetupRouteDependencies = {
	authenticate: resolveApiKeyAuthContext,
	store: failClosedLocalSetupStore,
	requestId: randomUUID,
};

function parseResourceId(resourceId: string): string {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resourceId))
		throw new SelenaApiHttpError(400, "RESOURCE_ID_INVALID", "resourceId must be a valid UUID.");
	return resourceId;
}

async function readBody<T>(
	request: Request,
	schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
): Promise<T> {
	let value: unknown;
	try {
		value = await request.json();
	} catch {
		throw new SelenaApiHttpError(400, "JSON_INVALID", "Request body must be valid JSON.");
	}
	const parsed = schema.safeParse(value);
	if (!parsed.success)
		throw new SelenaApiHttpError(400, "BODY_INVALID", "Request body does not match the local setup contract.");
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
		message: "The local setup request could not be completed.",
		requestId,
		retryable: true,
	});
}

export function createSelenaLocalSetupRouteHandlers(
	dependencies: LocalSetupRouteDependencies = defaultRouteDependencies,
) {
	const execute = async (
		request: Request,
		operation: LocalSetupOperation,
		resourceId: string,
		read: (request: Request) => Promise<LocalSetupBody>,
	): Promise<Response> => {
		const requestId = dependencies.requestId();
		try {
			const auth = await dependencies.authenticate(request);
			requireSelenaApiScope(auth.permissions, "local:write");
			const validatedResourceId = parseResourceId(resourceId);
			const idempotencyKey = parseIdempotencyKey(request.headers);
			const body = await read(request);
			const bodyHash = hashIdempotencyBody({ operation, resourceId: validatedResourceId, body });
			await dependencies.store.execute({
				auth,
				operation,
				resourceId: validatedResourceId,
				idempotencyKey,
				bodyHash,
				body,
			});
			throw new SelenaApiHttpError(
				503,
				LOCAL_SETUP_OWNER_GATE_CODE,
				"Local setup action did not produce a durable response.",
				true,
				{ providerCalls: 0, operation },
			);
		} catch (error) {
			return routeError(error, requestId);
		}
	};

	return {
		createLocation: (request: Request, projectId: string) =>
			execute(request, "location-create", projectId, (input) =>
				readBody(input, localBusinessLocationCreateRequestSchema),
			),
		confirmPlaceEntity: (request: Request, locationId: string) =>
			execute(request, "place-entity-confirm", locationId, (input) =>
				readBody(input, localPlaceEntityConfirmRequestSchema),
			),
		createKeywordSet: (request: Request, locationId: string) =>
			execute(request, "keyword-set-create", locationId, (input) =>
				readBody(input, localKeywordSetCreateRequestSchema),
			),
	};
}

export const selenaLocalSetupRouteHandlers = createSelenaLocalSetupRouteHandlers();
