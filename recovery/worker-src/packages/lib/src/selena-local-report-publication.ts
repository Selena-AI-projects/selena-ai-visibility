import { createHash } from "node:crypto";
import { canonicalLocalMapsJson } from "@workspace/selena-visibility-contracts";
import type { LocalReportCompetition } from "./selena-local-competitors";
import type { ExternalLocalAuditContent } from "./selena-local-external-audit";

export type LocalReportObservation = {
	id: string;
	pointIndex: number;
	latitude: string | number;
	longitude: string | number;
	keyword: string;
	language: string;
	outcome: string;
	validity: string | null;
	targetRank: number | null;
	capturedAt: Date | null;
	reason: string | null;
	evidenceId: string | null;
	competition?: LocalReportCompetition;
};

export type LocalReportContent = {
	schemaVersion: 1;
	localCycleId: string;
	measurementCycleId: string;
	provider: string;
	generatedAt: string;
	status: "COMPLETE" | "PARTIAL";
	totals: {
		expected: 9;
		terminal: number;
		valid: number;
		invalid: number;
		unknown: number;
		blocked: number;
		pending: number;
	};
	observations: Array<{
		id: string;
		pointIndex: number;
		latitude: number;
		longitude: number;
		keyword: string;
		language: string;
		outcome: string;
		validity: string | null;
		targetRank: number | null;
		capturedAt: string | null;
		reason: string | null;
		evidenceId: string | null;
		competition?: LocalReportCompetition;
	}>;
};

export function buildLocalReportContent(input: {
	localCycleId: string;
	measurementCycleId: string;
	provider: string;
	generatedAt: Date;
	observations: readonly LocalReportObservation[];
}): LocalReportContent {
	const rows = input.observations.map((row) => ({
		id: row.id,
		pointIndex: row.pointIndex,
		latitude: Number(row.latitude),
		longitude: Number(row.longitude),
		keyword: row.keyword,
		language: row.language,
		outcome: row.outcome,
		validity: row.validity,
		targetRank: row.targetRank,
		capturedAt: row.capturedAt?.toISOString() ?? null,
		reason: row.reason,
		evidenceId: row.evidenceId,
		...(row.competition ? { competition: row.competition } : {}),
	}));
	const terminal = rows.filter((row) => row.outcome !== "PENDING").length;
	const valid = rows.filter((row) => row.validity === "VALID").length;
	const invalid = rows.filter((row) => row.outcome === "INVALID").length;
	const unknown = rows.filter((row) => row.outcome === "UNKNOWN").length;
	const blocked = rows.filter((row) => row.outcome === "BLOCKED" || row.outcome === "CANCELLED").length;
	return {
		schemaVersion: 1,
		localCycleId: input.localCycleId,
		measurementCycleId: input.measurementCycleId,
		provider: input.provider,
		generatedAt: input.generatedAt.toISOString(),
		status:
			rows.length === 9 && terminal === 9 && valid === 9 && invalid === 0 && unknown === 0 && blocked === 0
				? "COMPLETE"
				: "PARTIAL",
		totals: { expected: 9, terminal, valid, invalid, unknown, blocked, pending: rows.length - terminal },
		observations: rows,
	};
}

export function canonicalLocalReport(content: LocalReportContent): string {
	return canonicalLocalMapsJson(content);
}

export function localReportSha256(canonical: string): `sha256:${string}` {
	return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

export function assertLocalReportPublishable(content: LocalReportContent): void {
	if (
		content.observations.length !== 9 ||
		new Set(content.observations.map((row) => row.id)).size !== 9 ||
		new Set(content.observations.map((row) => row.pointIndex)).size !== 9 ||
		content.observations.some((row) => !Number.isInteger(row.pointIndex) || row.pointIndex < 0 || row.pointIndex > 8)
	)
		throw new Error("LOCAL_REPORT_CARDINALITY_INVALID");
	if (content.totals.expected !== 9 || content.totals.terminal !== 9 || content.totals.pending !== 0)
		throw new Error("LOCAL_REPORT_CARDINALITY_INVALID");
	if (content.totals.unknown > 0 || content.totals.blocked > 0) throw new Error("LOCAL_REPORT_UNKNOWN_OR_BLOCKED");
	for (const observation of content.observations) {
		if (!["FOUND", "ABSENT_WITHIN_DEPTH", "INVALID"].includes(observation.outcome))
			throw new Error("LOCAL_REPORT_UNKNOWN_OR_BLOCKED");
		if (
			observation.outcome === "FOUND" &&
			(observation.validity !== "VALID" ||
				observation.targetRank === null ||
				!Number.isInteger(observation.targetRank) ||
				observation.targetRank < 1 ||
				observation.targetRank > 20)
		)
			throw new Error("LOCAL_REPORT_RANK_INVALID");
		if (observation.outcome !== "FOUND" && observation.targetRank !== null)
			throw new Error("LOCAL_REPORT_RANK_INVALID");
		if (
			["FOUND", "ABSENT_WITHIN_DEPTH"].includes(observation.outcome) &&
			(!observation.capturedAt ||
				!Number.isFinite(Date.parse(observation.capturedAt)) ||
				observation.validity !== "VALID")
		)
			throw new Error("LOCAL_REPORT_CAPTURE_REQUIRED");
		if ((observation.outcome === "FOUND" || observation.outcome === "ABSENT_WITHIN_DEPTH") && !observation.evidenceId)
			throw new Error("LOCAL_REPORT_EVIDENCE_REQUIRED");
	}
}

/** Spreadsheet-safe export of the same immutable content served to the customer. */
export function localReportCsv(
	content: LocalReportContent,
	externalAudits: readonly ExternalLocalAuditContent[] = [],
): string {
	const cell = (value: string | number | null) => {
		let text = value == null ? "" : String(value);
		if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
		return `"${text.replaceAll('"', '""')}"`;
	};
	const rows: Array<Array<string | number | null>> = [
		[
			"Query",
			"Language",
			"Point",
			"Latitude",
			"Longitude",
			"Outcome",
			"Organic Maps position",
			"Captured at",
			"Evidence reference",
			"Overall position",
			"Competitors ahead (organic)",
			"Advertisements",
			"Saved comparison status",
			"Source response retention deadline",
			"Returned organic results (not a relative rank when target is absent)",
		],
	];
	for (const row of content.observations)
		rows.push([
			row.keyword,
			row.language,
			row.pointIndex + 1,
			row.latitude,
			row.longitude,
			row.outcome,
			row.targetRank,
			row.capturedAt,
			row.evidenceId,
			row.competition?.status === "AVAILABLE" ? (row.competition.target?.absoluteRank ?? null) : null,
			row.competition?.status === "AVAILABLE"
				? row.competition.aboveTarget.map((item) => `${item.name} — organic #${item.groupRank}`).join("; ")
				: null,
			row.competition?.status === "AVAILABLE"
				? row.competition.ads
						.map((item) => `${item.name} — ad${item.absoluteRank == null ? "" : `; overall #${item.absoluteRank}`}`)
						.join("; ")
				: null,
			row.competition?.status ?? "UNAVAILABLE",
			row.competition?.status === "AVAILABLE" ? (row.competition.rawRetentionExpiresAt ?? null) : null,
			row.competition?.status === "AVAILABLE"
				? (row.competition.returnedOrganic?.map((item) => `${item.name} — organic #${item.groupRank}`).join("; ") ??
					null)
				: null,
		]);
	for (const audit of externalAudits)
		for (const batch of audit.batches)
			for (const row of batch.observations) {
				const [latitude, longitude] = row.request.location_coordinate.split(",");
				rows.push([
					row.keyword,
					row.request.language_code,
					row.pointIndex + 1,
					latitude,
					longitude,
					row.targetRank === null ? "ABSENT_WITHIN_DEPTH" : "FOUND",
					row.targetRank,
					row.capturedAt,
					`external:${row.providerTaskId}; ${row.rawSha256}`,
					row.competition.target?.absoluteRank ?? null,
					row.competition.aboveTarget.map((item) => `${item.name} — organic #${item.groupRank}`).join("; "),
					row.competition.ads.map((item) => `${item.name} — ad; overall #${item.absoluteRank ?? "unknown"}`).join("; "),
					"EXTERNAL_RETAINED_RESPONSE",
					null,
					row.competition.returnedOrganic?.map((item) => `${item.name} — organic #${item.groupRank}`).join("; ") ??
						null,
				]);
			}
	return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
