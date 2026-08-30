import { randomUUID } from "node:crypto";
import {
	type LocalScanCycleCreateRequest,
	type LocalScanQuoteRequest,
	localScanCycleCreateRequestSchema,
	localScanCycleCreateResponseSchema,
	localScanQuoteRequestSchema,
	localScanQuoteResponseSchema,
	type MapsLockV1,
	mapsLockV1Schema,
} from "@workspace/selena-visibility-contracts";
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

type StoredQuote = ReturnType<typeof localScanQuoteResponseSchema.parse>;
type StoredCycle = ReturnType<typeof localScanCycleCreateResponseSchema.parse>;

export type SelenaLocalWriteStore = {
	quote(input: {
		auth: AuthContext;
		locationId: string;
		idempotencyKey: string;
		bodyHash: string;
		input: LocalScanQuoteRequest;
	}): Promise<StoredQuote>;
	createCycle(input: {
		auth: AuthContext;
		locationId: string;
		idempotencyKey: string;
		bodyHash: string;
		input: LocalScanCycleCreateRequest;
	}): Promise<StoredCycle>;
};

/**
 * Persistence is intentionally an explicit boundary. The target `sv_*`
 * schema is present in source, but shared-runtime migration and tenant-RLS
 * proof are owner gates. Until that evidence exists, writes fail closed rather
 * than returning a synthetic 201 or mutating legacy commerce tables.
 */
export const LOCAL_WRITE_OWNER_GATE_CODE = "OWNER_GATE_REQUIRED" as const;

export function localWriteOwnerGateError(operation: "quote" | "cycle"): SelenaApiHttpError {
	return new SelenaApiHttpError(
		503,
		LOCAL_WRITE_OWNER_GATE_CODE,
		`LOCAL_${operation.toUpperCase()} is unavailable until the target schema and tenant RLS are verified.`,
		true,
		{
			blocker: "LOCAL_SCHEMA_NOT_APPLIED_OR_RLS_UNVERIFIED",
			providerCalls: 0,
			operation,
		},
	);
}

/** Default store: no local write is permitted before the runtime owner gate. */
export const failClosedLocalWriteStore: SelenaLocalWriteStore = {
	async quote() {
		throw localWriteOwnerGateError("quote");
	},
	async createCycle() {
		throw localWriteOwnerGateError("cycle");
	},
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** Read only the frozen Maps child lock; callers must persist it separately. */
export function parseLocalMapsLock(snapshot: unknown): MapsLockV1 {
	const record = asRecord(snapshot);
	for (const candidate of [record?.mapsLock, record?.localMapsLock, record?.localMaps, snapshot]) {
		const parsed = mapsLockV1Schema.safeParse(candidate);
		if (parsed.success) return parsed.data;
	}
	throw new SelenaApiHttpError(
		422,
		"CONFIGURATION_LOCK_LOCAL_MAPS_MISSING",
		"The configuration lock does not contain a valid LOCAL_MAPS lock.",
		false,
		{ surface: "LOCAL_MAPS" },
	);
}

function quotePriceAmount(commercialPriceAmount: string): string {
	// A provider-cost estimate is not a retail price. The future pricing
	// adapter must supply a separately approved commercial amount; this pure
	// projection only validates its storage representation.
	const parsed = z
		.string()
		.regex(/^(?:0|[1-9]\d*)\.\d{2}$/)
		.safeParse(commercialPriceAmount);
	if (!parsed.success) throw new SelenaApiHttpError(422, "PRICE_INVALID", "The commercial quote price is invalid.");
	return parsed.data;
}

/** Pure quote projection for a future target-schema adapter and tests. */
export function prepareLocalScanQuote(input: {
	quoteId: string;
	locationId: string;
	configurationLockId: string;
	lock: MapsLockV1;
	commercialPriceAmount: string;
	expiresAt?: Date;
}): StoredQuote {
	const quoteId = z.string().uuid().parse(input.quoteId);
	const locationId = z.string().uuid().parse(input.locationId);
	const configurationLockId = z.string().uuid().parse(input.configurationLockId);
	if (input.lock.locationId !== locationId)
		throw new SelenaApiHttpError(422, "LOCK_LOCATION_MISMATCH", "The configuration lock belongs to another location.");
	if (
		Number(input.lock.budget.worstCaseCostUsd) > Number(input.lock.budget.surfaceCapUsd) ||
		Number(input.lock.budget.worstCaseCostUsd) > Number(input.lock.budget.monthlyCapUsd)
	)
		throw new SelenaApiHttpError(422, "BUDGET_BLOCKED", "The locked worst-case cost exceeds its cap.", false, {
			surface: "LOCAL_MAPS",
		});
	const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	const priceAmount = quotePriceAmount(input.commercialPriceAmount);
	return localScanQuoteResponseSchema.parse({
		quoteId,
		locationId,
		configurationLockId,
		lockVersion: input.lock.lockVersion,
		status: "ISSUED",
		surfaces: ["LOCAL_MAPS"],
		maps: {
			points: input.lock.grid.points.length,
			keywords: input.lock.keywordSet.keywordIds.length,
			repeats: input.lock.repeats,
			captureDepth: input.lock.request.depth,
			tasks: input.lock.expectedSlots,
			maxProviderAttempts: input.lock.maxProviderAttempts,
		},
		providerEnvelope: {
			id: input.lock.provider.id,
			endpoint: input.lock.provider.endpoint,
			version: input.lock.provider.version,
			rankEvidenceSource: input.lock.provider.rankEvidenceSource,
			externalProviderCalls: 0,
		},
		priceAmount,
		currency: "USD",
		budget: input.lock.budget,
		caveats: [
			"Quote calculation performs zero provider calls.",
			"Commercial price is supplied by the approved pricing snapshot; provider cost remains an internal budget field.",
			"Persistence is blocked until the target schema and tenant RLS are owner-verified.",
			"Execution requires a separate owner-approved local:execute gate.",
			"Local AI remains MANUAL_ONLY and is not included in this Maps quote.",
		],
		expiresAt: expiresAt.toISOString(),
	});
}

/** Pure response projection for a cycle a future adapter may persist. */
export function prepareLocalScanCycle(input: {
	cycleId: string;
	measurementCycleId: string;
	locationId: string;
	projectId: string;
	configurationLockId: string;
	gridDefinitionId: string;
	lock: MapsLockV1;
	createdAt?: Date;
}): StoredCycle {
	const cycleId = z.string().uuid().parse(input.cycleId);
	const measurementCycleId = z.string().uuid().parse(input.measurementCycleId);
	const locationId = z.string().uuid().parse(input.locationId);
	const projectId = z.string().uuid().parse(input.projectId);
	const configurationLockId = z.string().uuid().parse(input.configurationLockId);
	const gridDefinitionId = z.string().uuid().parse(input.gridDefinitionId);
	if (input.lock.locationId !== locationId)
		throw new SelenaApiHttpError(422, "LOCK_LOCATION_MISMATCH", "The configuration lock belongs to another location.");
	return localScanCycleCreateResponseSchema.parse({
		cycleId,
		measurementCycleId,
		locationId,
		projectId,
		configurationLockId,
		gridDefinitionId,
		status: "CREATED",
		domainId: "LOCAL_MAPS",
		expectedObservations: input.lock.expectedSlots,
		createdObservations: 0,
		providerCalls: 0,
		providerExecution: "MANUAL_ONLY_UNTIL_APPROVED",
		createdAt: (input.createdAt ?? new Date()).toISOString(),
	});
}

type LocalWriteRouteDependencies = {
	authenticate: (request: Request) => Promise<AuthContext>;
	store: SelenaLocalWriteStore;
	requestId: () => string;
};

const defaultRouteDependencies: LocalWriteRouteDependencies = {
	authenticate: resolveApiKeyAuthContext,
	store: failClosedLocalWriteStore,
	requestId: randomUUID,
};

function parseLocationId(locationId: string): string {
	const parsed = z.string().uuid().safeParse(locationId);
	if (!parsed.success) throw new SelenaApiHttpError(400, "LOCATION_ID_INVALID", "locationId must be a valid UUID.");
	return parsed.data;
}

async function readJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		throw new SelenaApiHttpError(400, "JSON_INVALID", "Request body must be valid JSON.");
	}
}

function routeError(error: unknown, requestId: string): Response {
	if (error instanceof SelenaApiHttpError) return selenaApiHttpErrorResponse(error, requestId);
	if (error instanceof z.ZodError) {
		return selenaApiErrorResponse(400, {
			code: "VALIDATION_ERROR",
			message: "The request body or path is invalid.",
			requestId,
			retryable: false,
		});
	}
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
		message: "The local write request could not be completed.",
		requestId,
		retryable: true,
	});
}

export function createSelenaLocalWriteRouteHandlers(
	dependencies: LocalWriteRouteDependencies = defaultRouteDependencies,
) {
	return {
		async quote(request: Request, locationId: string): Promise<Response> {
			const requestId = dependencies.requestId();
			try {
				const auth = await dependencies.authenticate(request);
				requireSelenaApiScope(auth.permissions, "local:write");
				const validatedLocationId = parseLocationId(locationId);
				const idempotencyKey = parseIdempotencyKey(request.headers);
				const body = localScanQuoteRequestSchema.parse(await readJson(request));
				const bodyHash = hashIdempotencyBody({ locationId: validatedLocationId, body });
				const result = localScanQuoteResponseSchema.parse(
					await dependencies.store.quote({
						auth,
						locationId: validatedLocationId,
						idempotencyKey,
						bodyHash,
						input: body,
					}),
				);
				return Response.json(result, { status: 201 });
			} catch (error) {
				return routeError(error, requestId);
			}
		},
		async createCycle(request: Request, locationId: string): Promise<Response> {
			const requestId = dependencies.requestId();
			try {
				const auth = await dependencies.authenticate(request);
				requireSelenaApiScope(auth.permissions, "local:write");
				const validatedLocationId = parseLocationId(locationId);
				const idempotencyKey = parseIdempotencyKey(request.headers);
				const parsed = localScanCycleCreateRequestSchema.parse(await readJson(request));
				const bodyHash = hashIdempotencyBody({ locationId: validatedLocationId, body: parsed });
				const result = localScanCycleCreateResponseSchema.parse(
					await dependencies.store.createCycle({
						auth,
						locationId: validatedLocationId,
						idempotencyKey,
						bodyHash,
						input: parsed,
					}),
				);
				return Response.json(result, { status: 201 });
			} catch (error) {
				return routeError(error, requestId);
			}
		},
	};
}

export const selenaLocalWriteRouteHandlers = createSelenaLocalWriteRouteHandlers();
