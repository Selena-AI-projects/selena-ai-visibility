import {
	approvePreparedProviderDatasetCanary,
	assertProviderDatasetRawCaptureFromLifecycle,
	canonicalProviderDatasetPayload,
	immutableCanonicalProviderDatasetPayload,
	providerDatasetContentHash,
} from "./provider-dataset-authority";

export const PROVIDER_DATASET_CONTRACT_VERSION = "provider-dataset-v1.3" as const;
export const PROVIDER_DATASET_INPUT_SCHEMA_VERSION = "schema-discovery-input-v1" as const;
export const PROVIDER_DATASET_EVIDENCE_SCHEMA_VERSION = "schema-discovery-evidence-v1" as const;
export const PROVIDER_DATASET_RAW_CANONICALIZATION_VERSION = "canonical-json-sorted-keys-v1" as const;

export const providerDatasetSourceIds = [
	"GOOGLE_AI_MODE",
	"GOOGLE_SERP",
	"GOOGLE_MAPS_REVIEWS",
	"GOOGLE_MAPS_PLACE",
	"GOOGLE_TRAVEL_HOTELS",
	"INSTAGRAM_PROFILES",
	"INSTAGRAM_POSTS",
	"INSTAGRAM_REELS",
	"INSTAGRAM_COMMENTS",
	"TIKTOK_PROFILES",
	"TIKTOK_POSTS",
	"REDDIT_POSTS",
	"YOUTUBE_VIDEOS",
] as const;

export type ProviderDatasetSourceId = (typeof providerDatasetSourceIds)[number];
export type ProviderDatasetDomain = "AI" | "SEARCH" | "ENTITY" | "REPUTATION" | "SOCIAL" | "TRAVEL";
export type ProviderDatasetSurface =
	| "GOOGLE_AI_MODE"
	| "GOOGLE_SERP"
	| "GOOGLE_MAPS_REVIEWS"
	| "GOOGLE_MAPS_PLACE"
	| "GOOGLE_TRAVEL_HOTELS"
	| "INSTAGRAM"
	| "TIKTOK"
	| "REDDIT"
	| "YOUTUBE";
export type ProviderDatasetEntityType =
	| "AI_ANSWER"
	| "SEARCH_RESULT"
	| "PLACE"
	| "REVIEW"
	| "HOTEL"
	| "SOCIAL_PROFILE"
	| "SOCIAL_CONTENT"
	| "SOCIAL_CONVERSATION";
export type ProviderDatasetCapabilityStatus = "CONFIGURED_ONLY" | "CANARY_ONLY" | "PILOT_ONLY" | "ALLOWED" | "BLOCKED";
export type ProviderDatasetRetentionClass =
	| "RAW_PRIVATE_POLICY_PENDING"
	| "PUBLIC_PERSONAL_DATA_POLICY_PENDING"
	| "TRAVEL_POLICY_PENDING";

export type ProviderDatasetEnvKey =
	| "SELENA_BRIGHTDATA_DATASET_GOOGLE_AI"
	| "SELENA_BRIGHTDATA_DATASET_GOOGLE_SERP"
	| "SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_REVIEWS"
	| "SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_PLACE"
	| "SELENA_BRIGHTDATA_DATASET_GOOGLE_HOTELS"
	| "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_PROFILES"
	| "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_POSTS"
	| "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_REELS"
	| "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_COMMENTS"
	| "SELENA_BRIGHTDATA_DATASET_TIKTOK_PROFILES"
	| "SELENA_BRIGHTDATA_DATASET_TIKTOK_POSTS"
	| "SELENA_BRIGHTDATA_DATASET_REDDIT_POSTS"
	| "SELENA_BRIGHTDATA_DATASET_YOUTUBE_VIDEOS";

export type ProviderDatasetCanaryInput = Readonly<{
	schemaVersion: typeof PROVIDER_DATASET_INPUT_SCHEMA_VERSION;
	provider: "BRIGHT_DATA";
	source: ProviderDatasetSourceId;
	records: readonly [Readonly<Record<string, unknown>>];
}>;

export type ProviderDatasetRawCapture = Readonly<{
	environment: "ISOLATED_CANARY";
	source: ProviderDatasetSourceId;
	providerDatasetId: string;
	capturedAt: string;
	rawReference: string;
	rawPayload: unknown;
	recordCount: number;
}>;

export type ProviderDatasetSchemaDiscoveryEvidence = Readonly<{
	schemaVersion: typeof PROVIDER_DATASET_EVIDENCE_SCHEMA_VERSION;
	contractVersion: typeof PROVIDER_DATASET_CONTRACT_VERSION;
	provider: "BRIGHT_DATA";
	source: ProviderDatasetSourceId;
	surface: ProviderDatasetSurface;
	domain: ProviderDatasetDomain;
	entityType: ProviderDatasetEntityType;
	environment: "ISOLATED_CANARY";
	providerDatasetId: string;
	capturedAt: string;
	rawReference: string;
	rawCanonicalizationVersion: typeof PROVIDER_DATASET_RAW_CANONICALIZATION_VERSION;
	rawContentHash: `sha256:${string}`;
	rawPayload: unknown;
	recordCount: number;
	immutable: true;
	normalized: false;
}>;

export type ProviderDatasetDefinition = Readonly<{
	provider: "BRIGHT_DATA";
	source: ProviderDatasetSourceId;
	surface: ProviderDatasetSurface;
	domain: ProviderDatasetDomain;
	entityType: ProviderDatasetEntityType;
	datasetEnvKey: ProviderDatasetEnvKey;
	contractVersion: typeof PROVIDER_DATASET_CONTRACT_VERSION;
	inputSchemaVersion: typeof PROVIDER_DATASET_INPUT_SCHEMA_VERSION;
	outputSchemaVersion: null;
	accessClass: "PUBLIC";
	capabilityStatus: "CANARY_ONLY";
	retentionClass: ProviderDatasetRetentionClass;
	timeoutPolicy: Readonly<{
		strategy: "CANARY_DERIVED";
		timeoutMs: null;
		pollIntervalMs: null;
	}>;
	retryPolicy: Readonly<{
		controller: "ATTEMPT_LEDGER";
		maxAttempts: 3;
		genericQueueRetries: false;
		retryEmptyResult: false;
		wholeDatasetRetry: false;
		retryableReasons: readonly ["TRANSPORT_TIMEOUT", "PROVIDER_5XX", "RATE_LIMIT", "MALFORMED_RESPONSE"];
	}>;
	costPolicy: Readonly<{
		strategy: "CANARY_DERIVED";
		unit: null;
		estimatedUnitCostUsd: null;
		ownerApprovedCapRequired: true;
	}>;
	buildInput(providerInput: unknown): ProviderDatasetCanaryInput;
	normalize(capture: ProviderDatasetRawCapture): ProviderDatasetSchemaDiscoveryEvidence;
	validateEvidence(evidence: ProviderDatasetSchemaDiscoveryEvidence): void;
}>;

export type ProviderDatasetAccessRequest = Readonly<{
	mode: "CANARY" | "RUNTIME" | "PUBLIC";
	environment: "ISOLATED_CANARY" | "LOCAL" | "STAGING" | "PRODUCTION";
	ownerApproved: boolean;
	schemaDiscoveryOnly: boolean;
	providerCalls: number;
	recurring: boolean;
	worstCaseCostUsd: number | null;
	approvedCostCapUsd: number | null;
	redactionPolicyApproved: boolean;
	privacyReviewApproved?: boolean;
	retentionReviewApproved?: boolean;
	deletionPropagationApproved?: boolean;
	legalHoldPolicyApproved?: boolean;
	sourceTermsApproved?: boolean;
	travelProductGateApproved?: boolean;
}>;

export type PreparedProviderDatasetCanary = Readonly<{
	definition: ProviderDatasetDefinition;
	providerDatasetId: string;
	input: ProviderDatasetCanaryInput;
}>;

type DefinitionMetadata = Pick<
	ProviderDatasetDefinition,
	"source" | "surface" | "domain" | "entityType" | "datasetEnvKey" | "retentionClass"
>;

function isForbiddenProviderInputKey(key: string): boolean {
	const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
	return new Set([
		"apikey",
		"authorization",
		"auth",
		"credential",
		"credentials",
		"password",
		"secret",
		"clientsecret",
		"accesstoken",
		"brightdataapitoken",
		"token",
	]).has(normalized);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoTransportCredentials(value: unknown, path = "providerInput"): void {
	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			assertNoTransportCredentials(item, `${path}[${index}]`);
		});
		return;
	}
	if (!isPlainRecord(value)) return;
	for (const [key, nested] of Object.entries(value)) {
		if (isForbiddenProviderInputKey(key)) throw new Error(`PROVIDER_DATASET_INPUT_CREDENTIAL_FORBIDDEN:${path}.${key}`);
		assertNoTransportCredentials(nested, `${path}.${key}`);
	}
}

function validateRawCapture(capture: ProviderDatasetRawCapture): void {
	if (capture.environment !== "ISOLATED_CANARY") throw new Error("PROVIDER_DATASET_CANARY_ENVIRONMENT_REQUIRED");
	if (!providerDatasetSourceIds.includes(capture.source)) throw new Error("PROVIDER_DATASET_SOURCE_UNKNOWN");
	if (!/^gd_[a-z0-9]+$/.test(capture.providerDatasetId)) throw new Error("PROVIDER_DATASET_ID_INVALID");
	if (!capture.rawReference.trim()) throw new Error("PROVIDER_DATASET_RAW_REFERENCE_REQUIRED");
	if (!Number.isFinite(Date.parse(capture.capturedAt))) throw new Error("PROVIDER_DATASET_CAPTURE_TIME_INVALID");
	if (!Number.isSafeInteger(capture.recordCount) || capture.recordCount < 0)
		throw new Error("PROVIDER_DATASET_RECORD_COUNT_INVALID");
	canonicalProviderDatasetPayload(capture.rawPayload);
}

function createDefinition(metadata: DefinitionMetadata): ProviderDatasetDefinition {
	const buildInput = (providerInput: unknown): ProviderDatasetCanaryInput => {
		if (!isPlainRecord(providerInput) || Object.keys(providerInput).length === 0)
			throw new Error("PROVIDER_DATASET_CANARY_INPUT_REQUIRED");
		assertNoTransportCredentials(providerInput);
		const inputRecord = immutableCanonicalProviderDatasetPayload(providerInput) as Readonly<Record<string, unknown>>;
		return Object.freeze({
			schemaVersion: PROVIDER_DATASET_INPUT_SCHEMA_VERSION,
			provider: "BRIGHT_DATA" as const,
			source: metadata.source,
			records: Object.freeze([inputRecord]) as readonly [Readonly<Record<string, unknown>>],
		});
	};

	const normalize = (capture: ProviderDatasetRawCapture): ProviderDatasetSchemaDiscoveryEvidence => {
		assertProviderDatasetRawCaptureFromLifecycle(capture);
		validateRawCapture(capture);
		if (capture.source !== metadata.source) throw new Error("PROVIDER_DATASET_CAPTURE_SOURCE_MISMATCH");
		const rawPayload = immutableCanonicalProviderDatasetPayload(capture.rawPayload);
		return Object.freeze({
			schemaVersion: PROVIDER_DATASET_EVIDENCE_SCHEMA_VERSION,
			contractVersion: PROVIDER_DATASET_CONTRACT_VERSION,
			provider: "BRIGHT_DATA" as const,
			source: metadata.source,
			surface: metadata.surface,
			domain: metadata.domain,
			entityType: metadata.entityType,
			environment: capture.environment,
			providerDatasetId: capture.providerDatasetId,
			capturedAt: capture.capturedAt,
			rawReference: capture.rawReference,
			rawCanonicalizationVersion: PROVIDER_DATASET_RAW_CANONICALIZATION_VERSION,
			rawContentHash: providerDatasetContentHash(rawPayload),
			rawPayload,
			recordCount: capture.recordCount,
			immutable: true as const,
			normalized: false as const,
		});
	};

	const validateEvidence = (evidence: ProviderDatasetSchemaDiscoveryEvidence): void => {
		if (
			evidence.schemaVersion !== PROVIDER_DATASET_EVIDENCE_SCHEMA_VERSION ||
			evidence.contractVersion !== PROVIDER_DATASET_CONTRACT_VERSION ||
			evidence.provider !== "BRIGHT_DATA" ||
			evidence.source !== metadata.source ||
			evidence.surface !== metadata.surface ||
			evidence.domain !== metadata.domain ||
			evidence.entityType !== metadata.entityType ||
			evidence.environment !== "ISOLATED_CANARY" ||
			evidence.rawCanonicalizationVersion !== PROVIDER_DATASET_RAW_CANONICALIZATION_VERSION ||
			evidence.immutable !== true ||
			evidence.normalized !== false
		)
			throw new Error("PROVIDER_DATASET_EVIDENCE_CONTRACT_MISMATCH");
		validateRawCapture(evidence);
		if (evidence.rawContentHash !== providerDatasetContentHash(evidence.rawPayload))
			throw new Error("PROVIDER_DATASET_RAW_PAYLOAD_TAMPERED");
	};

	return Object.freeze({
		provider: "BRIGHT_DATA" as const,
		...metadata,
		contractVersion: PROVIDER_DATASET_CONTRACT_VERSION,
		inputSchemaVersion: PROVIDER_DATASET_INPUT_SCHEMA_VERSION,
		outputSchemaVersion: null,
		accessClass: "PUBLIC" as const,
		capabilityStatus: "CANARY_ONLY" as const,
		timeoutPolicy: Object.freeze({ strategy: "CANARY_DERIVED" as const, timeoutMs: null, pollIntervalMs: null }),
		retryPolicy: Object.freeze({
			controller: "ATTEMPT_LEDGER" as const,
			maxAttempts: 3 as const,
			genericQueueRetries: false as const,
			retryEmptyResult: false as const,
			wholeDatasetRetry: false as const,
			retryableReasons: Object.freeze([
				"TRANSPORT_TIMEOUT",
				"PROVIDER_5XX",
				"RATE_LIMIT",
				"MALFORMED_RESPONSE",
			]) as readonly ["TRANSPORT_TIMEOUT", "PROVIDER_5XX", "RATE_LIMIT", "MALFORMED_RESPONSE"],
		}),
		costPolicy: Object.freeze({
			strategy: "CANARY_DERIVED" as const,
			unit: null,
			estimatedUnitCostUsd: null,
			ownerApprovedCapRequired: true as const,
		}),
		buildInput,
		normalize,
		validateEvidence,
	});
}

const rawPrivate = "RAW_PRIVATE_POLICY_PENDING" as const;
const socialPrivate = "PUBLIC_PERSONAL_DATA_POLICY_PENDING" as const;

export const providerDatasetRegistry = Object.freeze([
	createDefinition({
		source: "GOOGLE_AI_MODE",
		surface: "GOOGLE_AI_MODE",
		domain: "AI",
		entityType: "AI_ANSWER",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_GOOGLE_AI",
		retentionClass: rawPrivate,
	}),
	createDefinition({
		source: "GOOGLE_SERP",
		surface: "GOOGLE_SERP",
		domain: "SEARCH",
		entityType: "SEARCH_RESULT",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_GOOGLE_SERP",
		retentionClass: rawPrivate,
	}),
	createDefinition({
		source: "GOOGLE_MAPS_REVIEWS",
		surface: "GOOGLE_MAPS_REVIEWS",
		domain: "REPUTATION",
		entityType: "REVIEW",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_REVIEWS",
		retentionClass: rawPrivate,
	}),
	createDefinition({
		source: "GOOGLE_MAPS_PLACE",
		surface: "GOOGLE_MAPS_PLACE",
		domain: "ENTITY",
		entityType: "PLACE",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_PLACE",
		retentionClass: rawPrivate,
	}),
	createDefinition({
		source: "GOOGLE_TRAVEL_HOTELS",
		surface: "GOOGLE_TRAVEL_HOTELS",
		domain: "TRAVEL",
		entityType: "HOTEL",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_GOOGLE_HOTELS",
		retentionClass: "TRAVEL_POLICY_PENDING",
	}),
	createDefinition({
		source: "INSTAGRAM_PROFILES",
		surface: "INSTAGRAM",
		domain: "SOCIAL",
		entityType: "SOCIAL_PROFILE",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_PROFILES",
		retentionClass: socialPrivate,
	}),
	createDefinition({
		source: "INSTAGRAM_POSTS",
		surface: "INSTAGRAM",
		domain: "SOCIAL",
		entityType: "SOCIAL_CONTENT",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_POSTS",
		retentionClass: socialPrivate,
	}),
	createDefinition({
		source: "INSTAGRAM_REELS",
		surface: "INSTAGRAM",
		domain: "SOCIAL",
		entityType: "SOCIAL_CONTENT",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_REELS",
		retentionClass: socialPrivate,
	}),
	createDefinition({
		source: "INSTAGRAM_COMMENTS",
		surface: "INSTAGRAM",
		domain: "SOCIAL",
		entityType: "SOCIAL_CONVERSATION",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_COMMENTS",
		retentionClass: socialPrivate,
	}),
	createDefinition({
		source: "TIKTOK_PROFILES",
		surface: "TIKTOK",
		domain: "SOCIAL",
		entityType: "SOCIAL_PROFILE",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_TIKTOK_PROFILES",
		retentionClass: socialPrivate,
	}),
	createDefinition({
		source: "TIKTOK_POSTS",
		surface: "TIKTOK",
		domain: "SOCIAL",
		entityType: "SOCIAL_CONTENT",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_TIKTOK_POSTS",
		retentionClass: socialPrivate,
	}),
	createDefinition({
		source: "REDDIT_POSTS",
		surface: "REDDIT",
		domain: "SOCIAL",
		entityType: "SOCIAL_CONVERSATION",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_REDDIT_POSTS",
		retentionClass: socialPrivate,
	}),
	createDefinition({
		source: "YOUTUBE_VIDEOS",
		surface: "YOUTUBE",
		domain: "SOCIAL",
		entityType: "SOCIAL_CONTENT",
		datasetEnvKey: "SELENA_BRIGHTDATA_DATASET_YOUTUBE_VIDEOS",
		retentionClass: socialPrivate,
	}),
] as const);

const definitionsBySource = new Map(providerDatasetRegistry.map((definition) => [definition.source, definition]));

export function getProviderDatasetDefinition(source: ProviderDatasetSourceId): ProviderDatasetDefinition {
	const definition = definitionsBySource.get(source);
	if (!definition) throw new Error(`PROVIDER_DATASET_SOURCE_UNKNOWN:${source}`);
	return definition;
}

export function resolveProviderDatasetId(
	source: ProviderDatasetSourceId,
	environment: Readonly<Partial<Record<ProviderDatasetEnvKey, string | undefined>>>,
): string {
	const definition = getProviderDatasetDefinition(source);
	const datasetId = environment[definition.datasetEnvKey]?.trim();
	if (!datasetId) throw new Error(`PROVIDER_DATASET_ID_NOT_CONFIGURED:${source}`);
	if (!/^gd_[a-z0-9]+$/.test(datasetId)) throw new Error(`PROVIDER_DATASET_ID_INVALID:${source}`);
	return datasetId;
}

export function assertProviderDatasetAccess(
	source: ProviderDatasetSourceId,
	request: ProviderDatasetAccessRequest,
): void {
	const definition = getProviderDatasetDefinition(source);
	if (source === "INSTAGRAM_COMMENTS")
		throw new Error("PROVIDER_DATASET_BLOCKED_COST_AND_PERSONAL_DATA:INSTAGRAM_COMMENTS");
	if (definition.capabilityStatus !== "CANARY_ONLY" || request.mode !== "CANARY")
		throw new Error(`PROVIDER_DATASET_CANARY_ONLY:${source}`);
	if (!request.ownerApproved) throw new Error(`PROVIDER_DATASET_OWNER_APPROVAL_REQUIRED:${source}`);
	if (request.environment !== "ISOLATED_CANARY")
		throw new Error(`PROVIDER_DATASET_CANARY_ENVIRONMENT_REQUIRED:${source}`);
	if (!request.schemaDiscoveryOnly || request.recurring || request.providerCalls !== 1)
		throw new Error(`PROVIDER_DATASET_CANARY_SCOPE_INVALID:${source}`);
	if (
		request.worstCaseCostUsd === null ||
		request.approvedCostCapUsd === null ||
		!Number.isFinite(request.worstCaseCostUsd) ||
		!Number.isFinite(request.approvedCostCapUsd) ||
		request.worstCaseCostUsd < 0 ||
		request.approvedCostCapUsd < request.worstCaseCostUsd
	)
		throw new Error(`PROVIDER_DATASET_COST_CAP_REQUIRED:${source}`);
	if (!request.redactionPolicyApproved) throw new Error(`PROVIDER_DATASET_REDACTION_POLICY_REQUIRED:${source}`);
	if (definition.domain === "SOCIAL" && (!request.privacyReviewApproved || !request.retentionReviewApproved))
		throw new Error(`PROVIDER_DATASET_SOCIAL_POLICY_GATE_REQUIRED:${source}`);
	if (definition.domain === "SOCIAL" && !request.deletionPropagationApproved)
		throw new Error(`PROVIDER_DATASET_SOCIAL_DELETION_GATE_REQUIRED:${source}`);
	if (definition.domain === "SOCIAL" && !request.legalHoldPolicyApproved)
		throw new Error(`PROVIDER_DATASET_SOCIAL_LEGAL_HOLD_GATE_REQUIRED:${source}`);
	if (definition.domain === "SOCIAL" && !request.sourceTermsApproved)
		throw new Error(`PROVIDER_DATASET_SOCIAL_SOURCE_TERMS_GATE_REQUIRED:${source}`);
	if (definition.domain === "TRAVEL" && !request.travelProductGateApproved)
		throw new Error(`PROVIDER_DATASET_TRAVEL_GATE_REQUIRED:${source}`);
}

export function prepareProviderDatasetCanary(
	source: ProviderDatasetSourceId,
	request: ProviderDatasetAccessRequest,
	environment: Readonly<Partial<Record<ProviderDatasetEnvKey, string | undefined>>>,
	providerInput: unknown,
): PreparedProviderDatasetCanary {
	assertProviderDatasetAccess(source, request);
	const definition = getProviderDatasetDefinition(source);
	const prepared = Object.freeze({
		definition,
		providerDatasetId: resolveProviderDatasetId(source, environment),
		input: definition.buildInput(providerInput),
	});
	approvePreparedProviderDatasetCanary(prepared);
	return prepared;
}
