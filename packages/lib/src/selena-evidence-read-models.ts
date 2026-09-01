import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { withOrganizationTransaction } from "./db/organization-transaction";
import * as schema from "./db/schema";
import type { SelenaRepositoryContext } from "./selena-visibility-repositories";

type Db = NodePgDatabase<typeof schema>;

export type HoReCaModuleState = "HIDDEN" | "LOCKED" | "PILOT" | "ACTIVE" | "PARTIAL" | "UNKNOWN" | "BLOCKED";

export type EvidenceReadModel = {
	evidenceId: string;
	domain: string;
	surface: string | null;
	source: string | null;
	datasetVersion: number;
	capturedAt: string;
	moduleState: HoReCaModuleState;
	provenanceState: "LINKED" | "PARTIAL" | "UNKNOWN";
	acceptanceStatus: "ACCEPTED" | "UNKNOWN";
	acceptedAt: string | null;
};

export type EvidenceReadPage = {
	items: EvidenceReadModel[];
	nextCursor: string | null;
};

export type EvidenceCoverageState = "PRESENT" | "ABSENT" | "UNKNOWN" | "INVALID" | "BLOCKED";

export type EvidenceCoverageSummary = {
	present: number;
	knownDenominator: number;
	unknown: number;
	invalid: number;
	blocked: number;
	coverage: number | null;
};

export type EvidenceProjection = {
	organizationId: string;
	projectId: string;
	evidenceId: string;
	domainId: string;
	datasetVersion: number;
	sourceSnapshotId: string | null;
	capabilityId: string | null;
	sourceType: string | null;
	source: string | null;
	surface: string | null;
	capabilityDomain: string | null;
	capabilityStatus: string | null;
	inputSchemaVersion: string | null;
	outputSchemaVersion: string | null;
	capabilityInputSchemaVersion: string | null;
	capabilityOutputSchemaVersion: string | null;
	acceptanceStatus: string | null;
	acceptedAt: Date | null;
	evidenceCapturedAt: Date;
};

export type EvidenceCursorPayload = {
	version: 1;
	tenantId: string;
	projectId: string;
	capturedAt: string;
	evidenceId: string;
	issuedAt: string;
	expiresAt: string;
};

export type EvidenceCursorCodec = {
	seal(payload: Omit<EvidenceCursorPayload, "issuedAt" | "expiresAt">): Promise<string>;
	verifyAndDecode(cursor: string): Promise<unknown>;
};

const MAX_PAGE_SIZE = 100;
const MAX_CURSOR_TTL_MS = 10 * 60 * 1000;

function cursorMac(key: string, payload: string): Buffer {
	return createHmac("sha256", key).update(payload).digest();
}

export function createHmacEvidenceCursorCodec(options: {
	signingKey: string;
	verificationKeys?: readonly string[];
	now?: () => number;
	ttlMs?: number;
}): EvidenceCursorCodec {
	if (Buffer.byteLength(options.signingKey) < 32) throw new Error("EVIDENCE_CURSOR_SIGNING_KEY_TOO_SHORT");
	const verificationKeys = [options.signingKey, ...(options.verificationKeys ?? [])];
	if (verificationKeys.some((key) => Buffer.byteLength(key) < 32))
		throw new Error("EVIDENCE_CURSOR_VERIFICATION_KEY_TOO_SHORT");
	const now = options.now ?? Date.now;
	const ttlMs = options.ttlMs ?? MAX_CURSOR_TTL_MS;
	if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_CURSOR_TTL_MS)
		throw new Error("EVIDENCE_CURSOR_TTL_INVALID");
	return {
		async seal(payload) {
			const issuedAtMs = now();
			const fullPayload: EvidenceCursorPayload = {
				...payload,
				issuedAt: new Date(issuedAtMs).toISOString(),
				expiresAt: new Date(issuedAtMs + ttlMs).toISOString(),
			};
			const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
			return `${encoded}.${cursorMac(options.signingKey, encoded).toString("base64url")}`;
		},
		async verifyAndDecode(cursor) {
			const [encoded, encodedSignature, extra] = cursor.split(".");
			if (!encoded || !encodedSignature || extra !== undefined) throw new Error("INVALID_EVIDENCE_CURSOR");
			let supplied: Buffer;
			try {
				supplied = Buffer.from(encodedSignature, "base64url");
			} catch {
				throw new Error("INVALID_EVIDENCE_CURSOR");
			}
			const verified = verificationKeys.some((key) => {
				const expected = cursorMac(key, encoded);
				return supplied.length === expected.length && timingSafeEqual(supplied, expected);
			});
			if (!verified) throw new Error("INVALID_EVIDENCE_CURSOR");
			try {
				return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
			} catch {
				throw new Error("INVALID_EVIDENCE_CURSOR");
			}
		},
	};
}

export function customerModuleState(capabilityStatus: string | null): HoReCaModuleState {
	switch (capabilityStatus) {
		case "CONFIGURED_ONLY":
		case "CANARY_ONLY":
			return "LOCKED";
		case "PILOT_ONLY":
			return "PILOT";
		case "ALLOWED":
			return "ACTIVE";
		case "BLOCKED":
			return "BLOCKED";
		default:
			return "UNKNOWN";
	}
}

export function summarizeEvidenceCoverage(states: readonly EvidenceCoverageState[]): EvidenceCoverageSummary {
	let present = 0;
	let absent = 0;
	let unknown = 0;
	let invalid = 0;
	let blocked = 0;
	for (const state of states) {
		switch (state) {
			case "PRESENT":
				present += 1;
				break;
			case "ABSENT":
				absent += 1;
				break;
			case "UNKNOWN":
				unknown += 1;
				break;
			case "INVALID":
				invalid += 1;
				break;
			case "BLOCKED":
				blocked += 1;
		}
	}
	const knownDenominator = present + absent;
	return {
		present,
		knownDenominator,
		unknown,
		invalid,
		blocked,
		coverage: knownDenominator === 0 ? null : present / knownDenominator,
	};
}

export function toEvidenceReadModel(
	row: EvidenceProjection,
	scope: { tenantId: string; projectId: string },
): EvidenceReadModel {
	if (row.organizationId !== scope.tenantId || row.projectId !== scope.projectId)
		throw new Error("Not found: evidence is outside AuthContext tenant or project");
	const hasSnapshot = row.sourceSnapshotId !== null;
	const compatibleDomain =
		row.capabilityDomain === row.domainId ||
		(row.capabilityDomain === "ENTITY" && (row.domainId === "LOCAL" || row.domainId === "LOCAL_MAPS"));
	const hasVersionedCapability =
		hasSnapshot &&
		row.capabilityId !== null &&
		row.sourceType === row.source &&
		row.source !== null &&
		row.surface !== null &&
		compatibleDomain &&
		row.inputSchemaVersion !== null &&
		row.inputSchemaVersion === row.capabilityInputSchemaVersion &&
		row.outputSchemaVersion !== null &&
		row.outputSchemaVersion === row.capabilityOutputSchemaVersion;
	const acceptedAtMs = row.acceptedAt?.getTime();
	const accepted =
		row.acceptanceStatus === "ACCEPTED" &&
		typeof acceptedAtMs === "number" &&
		Number.isFinite(acceptedAtMs) &&
		acceptedAtMs >= row.evidenceCapturedAt.getTime();
	return {
		evidenceId: row.evidenceId,
		domain: row.domainId,
		surface: row.surface,
		source: row.source,
		datasetVersion: row.datasetVersion,
		capturedAt: row.evidenceCapturedAt.toISOString(),
		moduleState: customerModuleState(row.capabilityStatus),
		provenanceState: hasVersionedCapability ? "LINKED" : hasSnapshot ? "PARTIAL" : "UNKNOWN",
		acceptanceStatus: accepted ? "ACCEPTED" : "UNKNOWN",
		acceptedAt: accepted ? (row.acceptedAt?.toISOString() ?? null) : null,
	};
}

export function validateEvidenceCursorPayload(
	value: unknown,
	scope: { tenantId: string; projectId: string },
	now = Date.now(),
): { capturedAt: Date; evidenceId: string } {
	if (typeof value !== "object" || value === null) throw new Error("INVALID_EVIDENCE_CURSOR");
	const payload = value as Partial<EvidenceCursorPayload>;
	if (
		payload.version !== 1 ||
		payload.tenantId !== scope.tenantId ||
		payload.projectId !== scope.projectId ||
		typeof payload.capturedAt !== "string" ||
		typeof payload.issuedAt !== "string" ||
		typeof payload.expiresAt !== "string" ||
		typeof payload.evidenceId !== "string" ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.evidenceId)
	)
		throw new Error("INVALID_EVIDENCE_CURSOR");
	const capturedAt = new Date(payload.capturedAt);
	const issuedAt = new Date(payload.issuedAt);
	const expiresAt = new Date(payload.expiresAt);
	if (!Number.isFinite(capturedAt.getTime()) || capturedAt.toISOString() !== payload.capturedAt)
		throw new Error("INVALID_EVIDENCE_CURSOR");
	if (
		!Number.isFinite(issuedAt.getTime()) ||
		!Number.isFinite(expiresAt.getTime()) ||
		issuedAt.toISOString() !== payload.issuedAt ||
		expiresAt.toISOString() !== payload.expiresAt ||
		issuedAt.getTime() > now ||
		expiresAt.getTime() <= now ||
		expiresAt.getTime() - issuedAt.getTime() > MAX_CURSOR_TTL_MS
	)
		throw new Error("INVALID_EVIDENCE_CURSOR");
	return { capturedAt, evidenceId: payload.evidenceId };
}

export function createSelenaEvidenceReadRepository(
	db: Db,
	cursorCodec: EvidenceCursorCodec,
	now: () => number = Date.now,
) {
	return {
		async list(
			ctx: SelenaRepositoryContext,
			input: { projectId: string; cursor?: string; limit?: number; domains?: string[] },
		): Promise<EvidenceReadPage> {
			const limit = input.limit ?? 50;
			if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) throw new Error("INVALID_EVIDENCE_PAGE_SIZE");
			const cursor = input.cursor
				? validateEvidenceCursorPayload(
						await cursorCodec.verifyAndDecode(input.cursor),
						{
							tenantId: ctx.tenantId,
							projectId: input.projectId,
						},
						now(),
					)
				: null;
			const conditions = [
				eq(schema.svEvidenceReadModel.organizationId, ctx.tenantId),
				eq(schema.svEvidenceReadModel.projectId, input.projectId),
			];
			if (input.domains?.length) conditions.push(inArray(schema.svEvidenceReadModel.domainId, input.domains));
			if (cursor) {
				const cursorCondition = or(
					lt(schema.svEvidenceReadModel.evidenceCapturedAt, cursor.capturedAt),
					and(
						eq(schema.svEvidenceReadModel.evidenceCapturedAt, cursor.capturedAt),
						lt(schema.svEvidenceReadModel.evidenceId, cursor.evidenceId),
					),
				);
				if (cursorCondition) conditions.push(cursorCondition);
			}
			const rows = await withOrganizationTransaction(db, ctx.tenantId, async (tx) => {
				return tx
					.select({
						organizationId: schema.svEvidenceReadModel.organizationId,
						projectId: schema.svEvidenceReadModel.projectId,
						evidenceId: schema.svEvidenceReadModel.evidenceId,
						domainId: schema.svEvidenceReadModel.domainId,
						datasetVersion: schema.svEvidenceReadModel.datasetVersion,
						sourceSnapshotId: schema.svEvidenceReadModel.sourceSnapshotId,
						capabilityId: schema.svEvidenceReadModel.capabilityId,
						sourceType: schema.svEvidenceReadModel.sourceType,
						source: schema.svEvidenceReadModel.source,
						surface: schema.svEvidenceReadModel.surface,
						capabilityDomain: schema.svEvidenceReadModel.capabilityDomain,
						capabilityStatus: schema.svEvidenceReadModel.capabilityStatus,
						inputSchemaVersion: schema.svEvidenceReadModel.inputSchemaVersion,
						outputSchemaVersion: schema.svEvidenceReadModel.outputSchemaVersion,
						capabilityInputSchemaVersion: schema.svEvidenceReadModel.capabilityInputSchemaVersion,
						capabilityOutputSchemaVersion: schema.svEvidenceReadModel.capabilityOutputSchemaVersion,
						acceptanceStatus: schema.svEvidenceReadModel.acceptanceStatus,
						acceptedAt: schema.svEvidenceReadModel.acceptedAt,
						evidenceCapturedAt: schema.svEvidenceReadModel.evidenceCapturedAt,
					})
					.from(schema.svEvidenceReadModel)
					.where(and(...conditions))
					.orderBy(desc(schema.svEvidenceReadModel.evidenceCapturedAt), desc(schema.svEvidenceReadModel.evidenceId))
					.limit(limit + 1);
			});
			const page = rows.slice(0, limit);
			const last = page[page.length - 1];
			return {
				items: page.map((row) => toEvidenceReadModel(row, { tenantId: ctx.tenantId, projectId: input.projectId })),
				nextCursor:
					rows.length > limit && last
						? await cursorCodec.seal({
								version: 1,
								tenantId: ctx.tenantId,
								projectId: input.projectId,
								capturedAt: last.evidenceCapturedAt.toISOString(),
								evidenceId: last.evidenceId,
							})
						: null,
			};
		},
	};
}
