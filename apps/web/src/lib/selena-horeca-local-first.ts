import type { EvidenceReadModel } from "@workspace/lib/selena-evidence-read-models";
import {
	type HorecaLocalFirstReadModel,
	type HorecaModuleReadModel,
	horecaLocalFirstReadModelSchema,
} from "@workspace/selena-visibility-contracts";
import { z } from "zod";

export type HorecaPreviewLocale = "en" | "ru";
export type HorecaPreviewState = HorecaModuleReadModel["state"];

export type HorecaProjectSource = {
	id: string;
	organizationId: string;
	name: string;
	category: string;
	phase: HorecaLocalFirstReadModel["project"]["phase"];
};

export type HorecaEvidenceSource = EvidenceReadModel & {
	organizationId: string;
	projectId: string;
	acceptanceStatus: "ACCEPTED" | "UNKNOWN";
	acceptedAt: string | null;
	snapshotLinked: boolean;
};

export const horecaEvidenceDetailSchema = z.strictObject({
	evidenceId: z.string().uuid(),
	domain: z.enum(["ENTITY", "WEBSITE", "MENU", "AI_ANSWERS", "SEARCH", "MAPS", "REVIEW", "OUTCOME"]),
	sourceLabel: z.string().trim().min(1),
	surfaceLabel: z.string().trim().min(1),
	datasetVersion: z.number().int().positive(),
	capturedAt: z.iso.datetime(),
	accessClass: z.literal("DERIVED"),
	reference: z.string().regex(/^evidence:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
	snapshotReference: z
		.string()
		.regex(/^snapshot:evidence:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
	sourceUrl: z.null(),
	downloadable: z.literal(false),
});
export type HorecaEvidenceDetail = z.infer<typeof horecaEvidenceDetailSchema>;

export type HorecaPreviewArea = {
	id: "overview" | "visibility" | "evidence" | "competitors" | "actions" | "outcomes";
	label: { en: string; ru: string };
};

export const HORECA_PREVIEW_AREAS: readonly HorecaPreviewArea[] = [
	{ id: "overview", label: { en: "Overview", ru: "Обзор" } },
	{ id: "visibility", label: { en: "Visibility", ru: "Видимость" } },
	{ id: "evidence", label: { en: "Evidence", ru: "Доказательства" } },
	{ id: "competitors", label: { en: "Competitors", ru: "Конкуренты" } },
	{ id: "actions", label: { en: "Actions", ru: "Действия" } },
	{ id: "outcomes", label: { en: "Outcomes", ru: "Результаты" } },
] as const;

export const HORECA_PREVIEW_MODULE_COPY: Readonly<
	Record<
		HorecaModuleReadModel["moduleId"],
		{
			label: { en: string; ru: string };
			summary: { en: string; ru: string };
			limitation: { en: string; ru: string };
		}
	>
> = {
	AI_ANSWERS: {
		label: { en: "AI answers", ru: "Ответы AI" },
		summary: {
			en: "Not measured — no accepted data is connected.",
			ru: "Не измерено — принятые данные не подключены.",
		},
		limitation: {
			en: "AI answer visibility is measured separately from search and maps.",
			ru: "Видимость в ответах AI измеряется отдельно от поиска и карт.",
		},
	},
	SEARCH: {
		label: { en: "Google Search", ru: "Google Search" },
		summary: { en: "No accepted search measurement is available.", ru: "Принятого поискового замера нет." },
		limitation: {
			en: "Google Search results cannot fill the AI-answer sample.",
			ru: "Результаты Google Search не входят в выборку ответов AI.",
		},
	},
	LOCAL_MAPS: {
		label: { en: "Maps & local search", ru: "Карты и локальный поиск" },
		summary: {
			en: "Not measured — no accepted local data is connected.",
			ru: "Не измерено — принятые локальные данные не подключены.",
		},
		limitation: {
			en: "A matching place proves identity, not a position in map results.",
			ru: "Совпадение места подтверждает компанию, но не позицию в картах.",
		},
	},
	LOCAL_AI: {
		label: { en: "Local AI", ru: "Local AI" },
		summary: { en: "Manual, owner-approved pilot only.", ru: "Только ручной пилот с разрешением владельца." },
		limitation: {
			en: "Local AI never starts from this workspace and stays separate from Maps.",
			ru: "Local AI не запускается из этого кабинета и остаётся отдельно от Maps.",
		},
	},
	REPUTATION: {
		label: { en: "Reviews", ru: "Отзывы" },
		summary: {
			en: "Not measured — no accepted review data is connected.",
			ru: "Не измерено — принятые данные об отзывах не подключены.",
		},
		limitation: {
			en: "Review evidence remains separate from map-position observations.",
			ru: "Данные об отзывах остаются отдельно от наблюдений позиций в картах.",
		},
	},
	SOCIAL: {
		label: { en: "Social evidence", ru: "Социальные источники" },
		summary: { en: "Hidden until source and policy approval.", ru: "Скрыто до утверждения источника и правил." },
		limitation: { en: "Not a customer capability.", ru: "Не является клиентской возможностью." },
	},
	TRAVEL: {
		label: { en: "Travel", ru: "Travel" },
		summary: { en: "Hidden until source and product approval.", ru: "Скрыто до утверждения источника и продукта." },
		limitation: { en: "No customer entitlement is available.", ru: "Клиентский доступ отсутствует." },
	},
	OUTCOMES: {
		label: { en: "Outcome evidence", ru: "Доказательства результата" },
		summary: {
			en: "Not measured — no accepted outcome data is connected.",
			ru: "Не измерено — принятые данные о результатах не подключены.",
		},
		limitation: {
			en: "Attribution requires proof from booking, WhatsApp, calls, POS or analytics.",
			ru: "Для атрибуции нужны доказательства из booking, WhatsApp, звонков, POS или analytics.",
		},
	},
};

function unknownSummary(reason: string) {
	return { kind: "UNKNOWN" as const, numerator: null, denominator: null, invalidCount: 0, reason };
}

function previewModule(
	moduleId: HorecaModuleReadModel["moduleId"],
	state: HorecaModuleReadModel["state"],
): HorecaModuleReadModel {
	return {
		moduleId,
		state,
		label: HORECA_PREVIEW_MODULE_COPY[moduleId].label.en,
		summary: unknownSummary(HORECA_PREVIEW_MODULE_COPY[moduleId].summary.en),
		evidenceIds: [],
		configurationLockReference: null,
		limitations: [],
	};
}

const businessTypeAliases: Readonly<Record<string, HorecaLocalFirstReadModel["project"]["businessType"]>> = {
	RESTAURANT: "RESTAURANT",
	CAFE: "CAFE",
	CAFÉ: "CAFE",
	FOOD_HALL: "FOOD_HALL",
	FOODHALL: "FOOD_HALL",
	HOTEL: "HOTEL",
	VILLA: "VILLA",
	SPA: "SPA",
};

export function parseHorecaBusinessType(category: string): HorecaLocalFirstReadModel["project"]["businessType"] | null {
	const normalized = category
		.trim()
		.toUpperCase()
		.replace(/[\s-]+/g, "_");
	return businessTypeAliases[normalized] ?? null;
}

type VisibleEvidenceDomain = HorecaLocalFirstReadModel["evidence"][number]["domain"];
type VisibleModuleId = HorecaModuleReadModel["moduleId"];

function evidenceDomain(domain: string): VisibleEvidenceDomain | null {
	switch (domain) {
		case "AI":
		case "LOCAL_AI":
			return "AI_ANSWERS";
		case "SEARCH":
			return "SEARCH";
		case "LOCAL":
		case "LOCAL_MAPS":
			return "MAPS";
		case "REPUTATION":
			return "REVIEW";
		case "OUTCOME":
			return "OUTCOME";
		case "ENTITY":
		case "WEBSITE":
		case "MENU":
			return domain;
		default:
			return null;
	}
}

function evidenceModule(domain: string): VisibleModuleId | null {
	switch (domain) {
		case "AI":
			return "AI_ANSWERS";
		case "SEARCH":
			return "SEARCH";
		case "LOCAL":
		case "LOCAL_MAPS":
		case "ENTITY":
			return "LOCAL_MAPS";
		case "LOCAL_AI":
			return "LOCAL_AI";
		case "REPUTATION":
			return "REPUTATION";
		case "OUTCOME":
			return "OUTCOMES";
		default:
			return null;
	}
}

export function horecaProjectPhaseFromPersistedState(
	status: string,
	entities: readonly { confirmationStatus: string; prelaunch: boolean }[],
): HorecaLocalFirstReadModel["project"]["phase"] {
	const confirmed = entities.filter(
		(entity) => entity.confirmationStatus === "CLIENT_CONFIRMED" || entity.confirmationStatus === "ANALYST_CONFIRMED",
	);
	const prelaunchStates = new Set(confirmed.map((entity) => entity.prelaunch));
	if (prelaunchStates.size !== 1) return "UNKNOWN";
	if (prelaunchStates.has(true)) return "PRE_OPENING";
	return status === "ACTIVE" ? "ACTIVE" : "UNKNOWN";
}

function sourceLabel(row: HorecaEvidenceSource): string {
	const labels: Record<string, string> = {
		GOOGLE_AI_MODE: "Google AI Mode evidence",
		GOOGLE_SERP: "Google Search evidence",
		GOOGLE_MAPS_REVIEWS: "Google Maps review evidence",
		GOOGLE_MAPS_PLACE: "Google Maps place evidence",
	};
	return row.source ? (labels[row.source] ?? "Accepted source evidence") : "Accepted source evidence";
}

function assertEvidenceScope(row: HorecaEvidenceSource, scope: { tenantId: string; projectId: string }): void {
	if (row.organizationId !== scope.tenantId || row.projectId !== scope.projectId) {
		throw new Error("Not found: HoReCa evidence is outside AuthContext tenant or project");
	}
}

function acceptedLinkedEvidence(
	rows: readonly HorecaEvidenceSource[],
	scope: { tenantId: string; projectId: string },
): HorecaEvidenceSource[] {
	for (const row of rows) assertEvidenceScope(row, scope);
	return rows.filter(
		(row) =>
			row.acceptanceStatus === "ACCEPTED" &&
			typeof row.acceptedAt === "string" &&
			z.iso.datetime().safeParse(row.acceptedAt).success &&
			Date.parse(row.acceptedAt) >= Date.parse(row.capturedAt) &&
			row.provenanceState === "LINKED" &&
			row.snapshotLinked === true &&
			z.string().uuid().safeParse(row.evidenceId).success &&
			z.iso.datetime().safeParse(row.capturedAt).success &&
			Number.isInteger(row.datasetVersion) &&
			row.datasetVersion > 0 &&
			typeof row.source === "string" &&
			row.source.trim().length > 0 &&
			typeof row.surface === "string" &&
			row.surface.trim().length > 0 &&
			row.domain !== "SOCIAL" &&
			row.domain !== "TRAVEL" &&
			evidenceDomain(row.domain) !== null,
	);
}

function moduleState(rows: readonly HorecaEvidenceSource[]): HorecaModuleReadModel["state"] {
	if (rows.some((row) => row.moduleState === "BLOCKED")) return "BLOCKED";
	if (rows.some((row) => row.moduleState === "PILOT")) return "PILOT";
	if (rows.every((row) => row.moduleState === "LOCKED")) return "LOCKED";
	return "UNKNOWN";
}

/**
 * Builds the customer view only from the application-safe evidence projection.
 * A linked row proves provenance, not a measured share, so aggregates stay
 * UNKNOWN until a separate accepted result contract can supply a denominator.
 */
export function assembleHorecaLocalFirstReadModel(input: {
	tenantId: string;
	project: HorecaProjectSource;
	evidence: readonly HorecaEvidenceSource[];
	generatedAt: string;
}): HorecaLocalFirstReadModel | null {
	if (input.project.organizationId !== input.tenantId) {
		throw new Error("Not found: HoReCa project is outside AuthContext tenant");
	}
	const accepted = acceptedLinkedEvidence(input.evidence, {
		tenantId: input.tenantId,
		projectId: input.project.id,
	});
	if (accepted.length === 0) return null;
	const businessType = parseHorecaBusinessType(input.project.category);
	if (!businessType) throw new Error("HORECA_PROJECT_BUSINESS_TYPE_REQUIRED");

	const base = buildHorecaLocalFirstPreview(false, input.generatedAt);
	const evidence = accepted.map((row) => {
		const domain = evidenceDomain(row.domain);
		if (!domain) throw new Error("HORECA_EVIDENCE_DOMAIN_UNSUPPORTED");
		return {
			id: row.evidenceId,
			domain,
			accessClass: "DERIVED" as const,
			sourceLabel: sourceLabel(row),
			capturedAt: row.capturedAt,
			sourceReference: `evidence:${row.evidenceId}`,
			snapshotReference: `snapshot:evidence:${row.evidenceId}`,
			acceptance: { status: "ACCEPTED" as const, acceptedAt: row.acceptedAt as string },
		};
	});
	const modules = base.modules.map((module) => {
		if (module.moduleId === "SOCIAL" || module.moduleId === "TRAVEL") return module;
		const linked = accepted.filter((row) => evidenceModule(row.domain) === module.moduleId);
		if (linked.length === 0) return module;
		return {
			...module,
			state: moduleState(linked),
			evidenceIds: linked.map((row) => row.evidenceId),
		};
	});

	return horecaLocalFirstReadModelSchema.parse({
		...base,
		generatedAt: input.generatedAt,
		project: {
			displayName: input.project.name,
			businessType,
			phase: input.project.phase,
		},
		modules,
		evidence,
	});
}

export function resolveHorecaEvidenceDetail(input: {
	tenantId: string;
	projectId: string;
	evidenceId: string;
	evidence: readonly HorecaEvidenceSource[];
}): HorecaEvidenceDetail | null {
	const accepted = acceptedLinkedEvidence(input.evidence, {
		tenantId: input.tenantId,
		projectId: input.projectId,
	});
	const row = accepted.find((item) => item.evidenceId === input.evidenceId);
	if (!row) return null;
	const domain = evidenceDomain(row.domain);
	if (!domain) return null;
	return horecaEvidenceDetailSchema.parse({
		evidenceId: row.evidenceId,
		domain,
		sourceLabel: sourceLabel(row),
		surfaceLabel: row.surface?.trim() || "Accepted evidence surface",
		datasetVersion: row.datasetVersion,
		capturedAt: row.capturedAt,
		accessClass: "DERIVED",
		reference: `evidence:${row.evidenceId}`,
		snapshotReference: `snapshot:evidence:${row.evidenceId}`,
		sourceUrl: null,
		downloadable: false,
	});
}

export function buildHorecaLocalFirstPreview(
	localMapsEnabled: boolean,
	generatedAt: string,
): HorecaLocalFirstReadModel {
	return {
		schemaVersion: "horeca-local-first-read-model/v1",
		generatedAt,
		project: { displayName: "Source-only preview", businessType: "RESTAURANT", phase: "UNKNOWN" },
		navigation: ["OVERVIEW", "VISIBILITY", "EVIDENCE", "COMPETITORS", "ACTIONS", "OUTCOMES"],
		modules: [
			previewModule("AI_ANSWERS", "UNKNOWN"),
			previewModule("SEARCH", "LOCKED"),
			previewModule("LOCAL_MAPS", localMapsEnabled ? "UNKNOWN" : "LOCKED"),
			previewModule("LOCAL_AI", "LOCKED"),
			previewModule("REPUTATION", "UNKNOWN"),
			previewModule("SOCIAL", "HIDDEN"),
			previewModule("TRAVEL", "HIDDEN"),
			previewModule("OUTCOMES", "UNKNOWN"),
		],
		evidence: [],
		findings: [],
		competitors: [],
		actions: [],
		outcomes: [],
	};
}

export function localizedHorecaText(locale: HorecaPreviewLocale, value: { en: string; ru: string }): string {
	return value[locale];
}
