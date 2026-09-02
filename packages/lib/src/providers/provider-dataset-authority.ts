import { createHash } from "node:crypto";
import type { PreparedProviderDatasetCanary, ProviderDatasetRawCapture } from "./dataset-registry";

const approvedCanaryRequests = new WeakMap<object, { consumed: boolean }>();
const approvedRawCaptures = new WeakSet<object>();

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJsonValue(value: unknown, ancestors: ReadonlySet<object>): unknown {
	if (value === null || typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new Error("PROVIDER_DATASET_RAW_PAYLOAD_INVALID");
		return value;
	}
	if (typeof value !== "object") throw new Error("PROVIDER_DATASET_RAW_PAYLOAD_INVALID");
	if (ancestors.has(value)) throw new Error("PROVIDER_DATASET_RAW_PAYLOAD_INVALID");
	const nestedAncestors = new Set(ancestors).add(value);
	if (Array.isArray(value)) return value.map((item) => canonicalJsonValue(item, nestedAncestors));
	if (!isPlainRecord(value)) throw new Error("PROVIDER_DATASET_RAW_PAYLOAD_INVALID");
	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, canonicalJsonValue(value[key], nestedAncestors)]),
	);
}

function deepFreeze<T>(value: T): T {
	if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
	Object.freeze(value);
	for (const nested of Object.values(value)) deepFreeze(nested);
	return value;
}

export function canonicalProviderDatasetPayload(value: unknown): string {
	return JSON.stringify(canonicalJsonValue(value, new Set()));
}

export function immutableCanonicalProviderDatasetPayload(value: unknown): unknown {
	return deepFreeze(JSON.parse(canonicalProviderDatasetPayload(value)) as unknown);
}

export function providerDatasetContentHash(value: unknown): `sha256:${string}` {
	return `sha256:${createHash("sha256").update(canonicalProviderDatasetPayload(value)).digest("hex")}`;
}

export function approvePreparedProviderDatasetCanary(prepared: PreparedProviderDatasetCanary): void {
	approvedCanaryRequests.set(prepared, { consumed: false });
}

export function assertPreparedProviderDatasetCanary(
	prepared: PreparedProviderDatasetCanary,
): asserts prepared is PreparedProviderDatasetCanary {
	if (!approvedCanaryRequests.has(prepared)) throw new Error("PROVIDER_DATASET_CANARY_PREPARATION_REQUIRED");
}

export function consumePreparedProviderDatasetCanary(prepared: PreparedProviderDatasetCanary): void {
	const approval = approvedCanaryRequests.get(prepared);
	if (!approval) throw new Error("PROVIDER_DATASET_CANARY_PREPARATION_REQUIRED");
	if (approval.consumed) throw new Error("PROVIDER_DATASET_CANARY_ALREADY_CONSUMED");
	approval.consumed = true;
}

export function createProviderDatasetRawCaptureFromLifecycle(
	prepared: PreparedProviderDatasetCanary,
	result: Readonly<{ snapshotId: string; capturedAt: string; rawPayload: unknown; rawReference?: string }>,
): ProviderDatasetRawCapture {
	assertPreparedProviderDatasetCanary(prepared);
	const snapshotId = result.snapshotId.trim();
	if (!snapshotId) throw new Error("BRIGHTDATA_DATASET_SNAPSHOT_ID_REQUIRED");
	if (!Number.isFinite(Date.parse(result.capturedAt))) throw new Error("PROVIDER_DATASET_CAPTURE_TIME_INVALID");
	const rawPayload = immutableCanonicalProviderDatasetPayload(result.rawPayload);
	const capture = Object.freeze({
		environment: "ISOLATED_CANARY" as const,
		source: prepared.definition.source,
		providerDatasetId: prepared.providerDatasetId,
		capturedAt: result.capturedAt,
		rawReference: result.rawReference ?? `brightdata:snapshot:${snapshotId}`,
		rawPayload,
		recordCount: Array.isArray(rawPayload) ? rawPayload.length : 1,
	});
	approvedRawCaptures.add(capture);
	return capture;
}

export function assertProviderDatasetRawCaptureFromLifecycle(capture: ProviderDatasetRawCapture): void {
	if (!approvedRawCaptures.has(capture)) throw new Error("PROVIDER_DATASET_RAW_CAPTURE_FACTORY_REQUIRED");
}
