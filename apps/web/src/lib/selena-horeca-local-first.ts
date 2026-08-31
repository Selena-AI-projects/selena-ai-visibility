import type { HorecaLocalFirstReadModel, HorecaModuleReadModel } from "@workspace/selena-visibility-contracts";

export type HorecaPreviewLocale = "en" | "ru";
export type HorecaPreviewState = HorecaModuleReadModel["state"];

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
		limitations: [HORECA_PREVIEW_MODULE_COPY[moduleId].limitation.en],
	};
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
