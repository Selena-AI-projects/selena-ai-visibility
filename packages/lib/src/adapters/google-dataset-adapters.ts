import {
	assertProviderDatasetAccess,
	getProviderDatasetDefinition,
	type PreparedProviderDatasetCanary,
	type ProviderDatasetAccessRequest,
	type ProviderDatasetDefinition,
	type ProviderDatasetEnvKey,
	type ProviderDatasetRawCapture,
	type ProviderDatasetSchemaDiscoveryEvidence,
	type ProviderDatasetSourceId,
	prepareProviderDatasetCanary,
} from "../providers/dataset-registry";
import { assertPreparedProviderDatasetCanary } from "../providers/provider-dataset-authority";

export const coreGoogleDatasetSources = [
	"GOOGLE_AI_MODE",
	"GOOGLE_SERP",
	"GOOGLE_MAPS_PLACE",
	"GOOGLE_MAPS_REVIEWS",
] as const;

export type CoreGoogleDatasetSource = (typeof coreGoogleDatasetSources)[number];
export type GoogleDatasetEvidenceRole = "AI_ANSWER" | "SEARCH" | "ENTITY_ONLY" | "REPUTATION";

export type GoogleDatasetAdapter = Readonly<{
	id: string;
	source: CoreGoogleDatasetSource;
	evidenceRole: GoogleDatasetEvidenceRole;
	mapsRankEvidenceEligible: false;
	definition: ProviderDatasetDefinition;
	assertCanaryAccess(request: ProviderDatasetAccessRequest): void;
	prepareCanary(
		request: ProviderDatasetAccessRequest,
		environment: Readonly<Partial<Record<ProviderDatasetEnvKey, string | undefined>>>,
		providerInput: unknown,
	): PreparedProviderDatasetCanary;
	normalizeSchemaDiscoveryCapture(
		prepared: PreparedProviderDatasetCanary,
		capture: ProviderDatasetRawCapture,
	): ProviderDatasetSchemaDiscoveryEvidence;
	validateSchemaDiscoveryEvidence(evidence: ProviderDatasetSchemaDiscoveryEvidence): void;
}>;

function createGoogleDatasetAdapter(
	source: CoreGoogleDatasetSource,
	evidenceRole: GoogleDatasetEvidenceRole,
): GoogleDatasetAdapter {
	const definition = getProviderDatasetDefinition(source);
	return Object.freeze({
		id: `brightdata-${source.toLowerCase().replaceAll("_", "-")}-schema-discovery-v1`,
		source,
		evidenceRole,
		// None of these dataset collectors is the coordinate-aware Maps rank adapter.
		mapsRankEvidenceEligible: false as const,
		definition,
		assertCanaryAccess: (request) => assertProviderDatasetAccess(source, request),
		prepareCanary: (request, environment, providerInput) =>
			prepareProviderDatasetCanary(source, request, environment, providerInput),
		normalizeSchemaDiscoveryCapture: (prepared, capture) => {
			assertPreparedProviderDatasetCanary(prepared);
			if (
				prepared.definition.source !== source ||
				capture.source !== source ||
				capture.providerDatasetId !== prepared.providerDatasetId
			)
				throw new Error(`GOOGLE_DATASET_CAPTURE_BINDING_MISMATCH:${source}`);
			return definition.normalize(capture);
		},
		validateSchemaDiscoveryEvidence: (evidence) => definition.validateEvidence(evidence),
	});
}

export const googleAiModeDatasetAdapter = createGoogleDatasetAdapter("GOOGLE_AI_MODE", "AI_ANSWER");
export const googleSerpDatasetAdapter = createGoogleDatasetAdapter("GOOGLE_SERP", "SEARCH");
export const googleMapsPlaceDatasetAdapter = createGoogleDatasetAdapter("GOOGLE_MAPS_PLACE", "ENTITY_ONLY");
export const googleMapsReviewsDatasetAdapter = createGoogleDatasetAdapter("GOOGLE_MAPS_REVIEWS", "REPUTATION");

export const coreGoogleDatasetAdapters: Readonly<Record<CoreGoogleDatasetSource, GoogleDatasetAdapter>> = Object.freeze(
	{
		GOOGLE_AI_MODE: googleAiModeDatasetAdapter,
		GOOGLE_SERP: googleSerpDatasetAdapter,
		GOOGLE_MAPS_PLACE: googleMapsPlaceDatasetAdapter,
		GOOGLE_MAPS_REVIEWS: googleMapsReviewsDatasetAdapter,
	},
);

export function getCoreGoogleDatasetAdapter(source: ProviderDatasetSourceId): GoogleDatasetAdapter {
	const adapter = (coreGoogleDatasetAdapters as Partial<Record<ProviderDatasetSourceId, GoogleDatasetAdapter>>)[source];
	if (!adapter) throw new Error(`GOOGLE_DATASET_ADAPTER_NOT_AVAILABLE:${source}`);
	return adapter;
}
