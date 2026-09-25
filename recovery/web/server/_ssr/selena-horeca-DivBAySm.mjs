import { i as __toESM } from "../_runtime.mjs";
import { Y as IconArrowUpRight, Z as IconArrowLeft, nt as require_react, x as IconMapPin } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SelenaWordmark } from "./selena-wordmark-DhsBFluR.mjs";
import { t as Route } from "./selena-horeca-CyeknTkv.mjs";
import { i as buildHorecaLocalFirstPreview, n as HORECA_PREVIEW_MODULE_COPY, o as localizedHorecaText, t as HORECA_PREVIEW_AREAS } from "./selena-horeca-local-first-BejoPszS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-horeca-DivBAySm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "34c39259-8cef-4cbd-ad54-e35816e9d411", e._sentryDebugIdIdentifier = "sentry-dbid-34c39259-8cef-4cbd-ad54-e35816e9d411");
	} catch (e) {}
})();
var statusCopy = {
	HIDDEN: {
		en: "Hidden",
		ru: "Скрыто"
	},
	LOCKED: {
		en: "Needs approval",
		ru: "Нужно разрешение"
	},
	PILOT: {
		en: "Pilot",
		ru: "Пилот"
	},
	ACTIVE: {
		en: "Available",
		ru: "Доступно"
	},
	PARTIAL: {
		en: "Partial data",
		ru: "Частичные данные"
	},
	UNKNOWN: {
		en: "Not measured",
		ru: "Не измерено"
	},
	BLOCKED: {
		en: "Blocked",
		ru: "Заблокировано"
	}
};
var projectPhaseCopy = {
	ACTIVE: {
		en: "Active",
		ru: "Действующий проект"
	},
	PRE_OPENING: {
		en: "Pre-opening",
		ru: "До открытия"
	},
	UNKNOWN: {
		en: "Not confirmed",
		ru: "Не подтверждено"
	}
};
var evidenceAccessCopy = {
	PUBLIC: {
		en: "Public source",
		ru: "Публичный источник"
	},
	UPLOADED: {
		en: "Uploaded source",
		ru: "Загруженный источник"
	},
	CONNECTED: {
		en: "Connected source",
		ru: "Подключённый источник"
	},
	DERIVED: {
		en: "Derived evidence",
		ru: "Производное доказательство"
	}
};
var findingStatusCopy = {
	OBSERVED: {
		en: "Observed",
		ru: "Наблюдается"
	},
	CONFLICT: {
		en: "Conflict",
		ru: "Конфликт"
	},
	UNKNOWN: {
		en: "Not confirmed",
		ru: "Не подтверждено"
	},
	BLOCKED: {
		en: "Blocked",
		ru: "Заблокировано"
	}
};
var actionPriorityCopy = {
	NOW: {
		en: "Now",
		ru: "Сейчас"
	},
	NEXT: {
		en: "Next",
		ru: "Далее"
	},
	LATER: {
		en: "Later",
		ru: "Позже"
	}
};
var actionStatusCopy = {
	PROPOSED: {
		en: "Proposed",
		ru: "Предложено"
	},
	READY: {
		en: "Ready",
		ru: "Готово"
	},
	IN_PROGRESS: {
		en: "In progress",
		ru: "В работе"
	},
	DONE: {
		en: "Done",
		ru: "Выполнено"
	},
	BLOCKED: {
		en: "Blocked",
		ru: "Заблокировано"
	}
};
var outcomeLevelCopy = {
	READINESS: {
		en: "Readiness",
		ru: "Готовность"
	},
	OBSERVED: {
		en: "Observed outcome",
		ru: "Наблюдаемый результат"
	},
	ASSISTED: {
		en: "Assisted outcome",
		ru: "Ассистированный результат"
	},
	ATTRIBUTED: {
		en: "Attributed outcome",
		ru: "Атрибутированный результат"
	}
};
var outcomeStatusCopy = {
	MEASURED: {
		en: "Measured",
		ru: "Измерено"
	},
	UNKNOWN: {
		en: "Not measured",
		ru: "Не измерено"
	},
	BLOCKED: {
		en: "Blocked",
		ru: "Заблокировано"
	}
};
function tr(locale, en, ru) {
	return locale === "ru" ? ru : en;
}
function summaryCopy(module, locale) {
	if (module.summary.kind === "UNKNOWN") {
		if (module.evidenceIds.length > 0) return tr(locale, "Accepted linked evidence is available; no aggregate measurement has passed the read-model gate.", "Принятые связанные доказательства доступны; агрегированный замер ещё не прошёл проверку модели чтения.");
		return locale === "ru" ? localizedHorecaText(locale, HORECA_PREVIEW_MODULE_COPY[module.moduleId].summary) : module.summary.reason;
	}
	return tr(locale, `Observed in ${module.summary.numerator} of ${module.summary.denominator} accepted checks; ${module.summary.invalidCount} excluded. Captured ${new Date(module.summary.capturedAt).toLocaleDateString("en-GB")}.`, `Обнаружено в ${module.summary.numerator} из ${module.summary.denominator} принятых проверок; исключено: ${module.summary.invalidCount}. Дата: ${new Date(module.summary.capturedAt).toLocaleDateString("ru-RU")}.`);
}
function stateTone(state) {
	if (state === "ACTIVE") return "selena-state--active";
	if (state === "PARTIAL" || state === "PILOT") return "selena-state--partial";
	if (state === "BLOCKED") return "selena-state--blocked";
	return "selena-state--quiet";
}
function ModuleRow({ module, locale, evidence }) {
	const copy = HORECA_PREVIEW_MODULE_COPY[module.moduleId];
	const linkedEvidence = evidence.filter((item) => module.evidenceIds.includes(item.id));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "selena-record grid gap-3 sm:grid-cols-[minmax(10rem,0.7fr)_minmax(16rem,1.3fr)] sm:items-start",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline justify-between gap-3 sm:block",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "selena-record-label",
				children: locale === "en" ? module.label : localizedHorecaText(locale, copy.label)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `selena-state sm:mt-3 sm:block ${stateTone(module.state)}`,
				children: localizedHorecaText(locale, statusCopy[module.state])
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "selena-record-statement",
				children: summaryCopy(module, locale)
			}),
			module.configurationLockReference && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs font-semibold text-[#8f5c34]",
				children: tr(locale, "Measurement settings saved for comparison.", "Настройки замера сохранены для сравнения.")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "selena-record-note mt-2 space-y-1",
				children: (module.limitations.length > 0 ? module.limitations : [localizedHorecaText(locale, copy.limitation)]).map((limitation) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: limitation }, limitation))
			}),
			linkedEvidence.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs leading-5 text-[#574d45]",
				children: [
					tr(locale, "Accepted sources", "Принятые источники"),
					":",
					" ",
					linkedEvidence.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [index > 0 ? ", " : "", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "underline underline-offset-2",
						href: `#evidence-${item.id}`,
						children: item.sourceLabel
					})] }, item.id))
				]
			})
		] })]
	});
}
function SelenaHorecaLocalFirst({ locale, model, sourceOnlyPreview = true, evidenceDetail = null, evidenceDetailHref, workspaceToolSearch }) {
	const modules = model.modules.filter((module) => module.state !== "HIDDEN");
	const socialHidden = model.modules.some((module) => module.moduleId === "SOCIAL" && module.state === "HIDDEN");
	const travelHidden = model.modules.some((module) => module.moduleId === "TRAVEL" && module.state === "HIDDEN");
	const evidence = model.evidence.filter((item) => !(socialHidden && item.domain === "SOCIAL") && !(travelHidden && item.domain === "TRAVEL"));
	const evidenceIds = new Set(evidence.map((item) => item.id));
	const findings = model.findings.filter((finding) => finding.evidenceIds.every((id) => evidenceIds.has(id)));
	const findingIds = new Set(findings.map((finding) => finding.id));
	const competitors = model.competitors.filter((competitor) => !(socialHidden && competitor.surface === "SOCIAL") && !(travelHidden && competitor.surface === "TRAVEL") && competitor.evidenceIds.every((id) => evidenceIds.has(id)));
	const actions = model.actions.filter((action) => action.evidenceIds.every((id) => evidenceIds.has(id)) && action.findingIds.every((id) => findingIds.has(id)));
	const outcomeRecords = model.outcomes.filter((outcome) => outcome.evidenceIds.every((id) => evidenceIds.has(id)));
	const visibilityModules = modules.filter((module) => [
		"AI_ANSWERS",
		"SEARCH",
		"LOCAL_MAPS",
		"LOCAL_AI"
	].includes(module.moduleId));
	const evidenceModules = modules.filter((module) => [
		"REPUTATION",
		"SOCIAL",
		"TRAVEL"
	].includes(module.moduleId));
	const outcomes = modules.filter((module) => module.moduleId === "OUTCOMES");
	const measuredVisibilityCount = visibilityModules.filter((module) => module.summary.kind === "MEASURED_SHARE").length;
	const readinessEvidenceCount = outcomeRecords.filter((outcome) => outcome.level === "READINESS" && outcome.status === "MEASURED").length;
	const evidenceGapCount = findings.filter((finding) => finding.status !== "OBSERVED").length;
	const actionBlockerCount = actions.filter((action) => action.status === "BLOCKED").length;
	const notMeasured = tr(locale, "Not measured", "Не измерено");
	const notAssessed = tr(locale, "Not assessed", "Не оценено");
	const overviewSignals = [
		{
			label: tr(locale, "Visibility coverage", "Охват видимости"),
			value: measuredVisibilityCount === 0 ? notMeasured : String(measuredVisibilityCount),
			detail: tr(locale, "Measured surfaces; samples and denominators remain separate", "Измеренные поверхности; выборки и знаменатели остаются раздельными")
		},
		{
			label: tr(locale, "Readiness evidence", "Доказательства готовности"),
			value: outcomeRecords.length === 0 ? notMeasured : String(readinessEvidenceCount),
			detail: tr(locale, "Readiness is not a visibility measurement", "Готовность не является замером видимости")
		},
		{
			label: tr(locale, "Competitor observations", "Наблюдения о конкурентах"),
			value: competitors.length === 0 ? notAssessed : String(competitors.length),
			detail: tr(locale, "Only evidence-linked reasons are counted", "Учитываются только причины с доказательствами")
		},
		{
			label: tr(locale, "Evidence gaps", "Пробелы в доказательствах"),
			value: findings.length === 0 ? notAssessed : String(evidenceGapCount),
			detail: tr(locale, "Unknown, conflicting or blocked findings", "Неизвестные, конфликтующие или заблокированные выводы")
		},
		{
			label: tr(locale, "Action blockers", "Блокеры действий"),
			value: actions.length === 0 ? notAssessed : String(actionBlockerCount),
			detail: tr(locale, "Actions that cannot proceed on current evidence", "Действия, которые нельзя продолжить с текущими доказательствами")
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				"aria-label": tr(locale, "Workspace tools", "Инструменты кабинета"),
				className: "selena-toolbar overflow-x-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 text-xs font-bold tracking-[0.08em] text-[#574d45]",
					children: tr(locale, "TOOLS", "ИНСТРУМЕНТЫ")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex min-w-max gap-7",
					children: HORECA_PREVIEW_AREAS.map((area) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: workspaceToolSearch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/selena-horeca",
						search: workspaceToolSearch,
						hash: area.id,
						className: "selena-tool-link outline-none",
						children: localizedHorecaText(locale, area.label)
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: `#${area.id}`,
						className: "selena-tool-link outline-none",
						children: localizedHorecaText(locale, area.label)
					}) }, area.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "overview",
				className: "selena-section selena-section--anchor scroll-mt-5",
				"aria-labelledby": "horeca-overview-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-start justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-3xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								id: "horeca-overview-title",
								className: "selena-heading text-3xl sm:text-4xl",
								children: tr(locale, "HoReCa Local-first decision view", "HoReCa Local-first для принятия решений")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "selena-anchor-lede selena-prose mt-4",
								children: tr(locale, "A business decision view, not a single score. Each signal stays independent; evidence appears only after it is accepted and linked. No measurement starts from this page.", "Картина для бизнес-решений, а не единый балл. Каждый сигнал остаётся независимым; доказательства появляются только после приёмки и привязки. С этой страницы замеры не запускаются.")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "selena-anchor-meta mt-2 text-xs font-semibold",
								children: [
									tr(locale, "Project", "Проект"),
									": ",
									model.project.displayName,
									" · ",
									tr(locale, "Phase", "Этап"),
									":",
									" ",
									localizedHorecaText(locale, projectPhaseCopy[model.project.phase])
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "selena-status-chip text-xs font-bold tracking-[0.08em]",
						children: sourceOnlyPreview ? tr(locale, "SOURCE-ONLY PREVIEW", "SOURCE-ONLY ПРЕВЬЮ") : tr(locale, "READ-ONLY EVIDENCE", "ДОКАЗАТЕЛЬСТВА · ТОЛЬКО ЧТЕНИЕ")
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
					className: "mt-9 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3",
					children: overviewSignals.map((signal) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "selena-signal",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "selena-signal-label",
								children: signal.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "selena-signal-value",
								children: signal.value
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "selena-signal-detail",
								children: signal.detail
							})
						]
					}, signal.label))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "visibility",
				className: "selena-section scroll-mt-5",
				"aria-labelledby": "horeca-visibility-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconMapPin, {
						className: "mt-1 size-5 shrink-0 text-[#8f5c34]",
						"aria-hidden": "true"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "horeca-visibility-title",
						className: "selena-heading text-2xl text-[#181614]",
						children: tr(locale, "Visibility", "Видимость")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "selena-prose mt-3 text-[#574d45]",
						children: tr(locale, "AI answers, search, Maps and Google Ask Maps keep separate samples, comparison settings and dates.", "Ответы AI, поиск, Maps и Google Ask Maps используют отдельные выборки, настройки сравнения и даты.")
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4",
					children: visibilityModules.map((module) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModuleRow, {
						module,
						locale,
						evidence
					}, module.moduleId))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "evidence",
				className: "selena-section scroll-mt-5",
				"aria-labelledby": "horeca-evidence-title",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "horeca-evidence-title",
						className: "selena-heading text-2xl text-[#181614]",
						children: tr(locale, "Evidence", "Доказательства")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "selena-prose mt-3 text-[#574d45]",
						children: tr(locale, "Business facts, website and menu, reviews, and approved connected sources remain separate records. A configured source is never shown as collected proof.", "Данные о бизнесе, сайт и меню, отзывы и разрешённые подключённые источники остаются отдельными записями. Настроенный источник не показывается как собранное доказательство.")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4",
						children: evidenceModules.map((module) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModuleRow, {
							module,
							locale,
							evidence
						}, module.moduleId))
					}),
					evidence.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-5 divide-y divide-[#dccfbe] border-y border-[#dccfbe]",
						children: evidence.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							id: `evidence-${item.id}`,
							className: "scroll-mt-5 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold text-[#181614]",
								children: evidenceDetailHref ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: evidenceDetailHref(item.id),
									className: "inline-flex min-h-11 items-center underline decoration-[#b9825b] underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#8f5c34]",
									children: item.sourceLabel
								}) : item.sourceLabel
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs leading-5 text-[#574d45]",
								children: [
									tr(locale, "Captured", "Зафиксировано"),
									" ",
									new Date(item.capturedAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB"),
									" ·",
									" ",
									localizedHorecaText(locale, evidenceAccessCopy[item.accessClass])
								]
							})]
						}, item.id))
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm font-semibold text-[#8f5c34]",
						children: tr(locale, "No accepted sources are connected.", "Принятые источники не подключены.")
					}),
					evidenceDetail && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: "mt-5 border-l-2 border-[#b9825b] bg-[#fffdf8] px-4 py-3",
						"aria-labelledby": "horeca-evidence-detail-title",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								id: "horeca-evidence-detail-title",
								className: "text-sm font-semibold text-[#181614]",
								children: tr(locale, "Evidence detail", "Детали доказательства")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm font-medium text-[#181614]",
								children: evidenceDetail.sourceLabel
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "mt-2 grid gap-2 text-xs leading-5 text-[#574d45] sm:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "font-semibold text-[#181614]",
										children: tr(locale, "Surface", "Поверхность")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: evidenceDetail.surfaceLabel })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "font-semibold text-[#181614]",
										children: tr(locale, "Dataset version", "Версия набора")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: evidenceDetail.datasetVersion })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "font-semibold text-[#181614]",
										children: tr(locale, "Reference", "Ссылка")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: evidenceDetail.reference })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "font-semibold text-[#181614]",
										children: tr(locale, "Snapshot reference", "Ссылка на снимок")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: evidenceDetail.snapshotReference })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "font-semibold text-[#181614]",
										children: tr(locale, "Access", "Доступ")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: tr(locale, "Normalized detail only", "Только нормализованные детали") })] })
								]
							})
						]
					}),
					findings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-5 space-y-3",
						children: findings.map((finding) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "border-l-2 border-[#b9825b] pl-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium leading-6 text-[#181614]",
								children: finding.statement
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#574d45]",
								children: localizedHorecaText(locale, findingStatusCopy[finding.status])
							})]
						}, finding.id))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "competitors",
				className: "selena-section scroll-mt-5",
				"aria-labelledby": "horeca-competitors-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "horeca-competitors-title",
					className: "selena-heading text-2xl text-[#181614]",
					children: tr(locale, "Competitors", "Конкуренты")
				}), competitors.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 space-y-3",
					children: competitors.map((competitor) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "border-t border-[#dccfbe] pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold text-[#181614]",
							children: competitor.competitorLabel
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm leading-6 text-[#574d45]",
							children: competitor.reason
						})]
					}, competitor.id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm font-semibold text-[#8f5c34]",
					children: tr(locale, "No accepted competitor observations.", "Принятых наблюдений о конкурентах нет.")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "actions",
				className: "selena-section scroll-mt-5",
				"aria-labelledby": "horeca-actions-title",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "horeca-actions-title",
					className: "selena-heading text-2xl text-[#181614]",
					children: tr(locale, "Actions", "Действия")
				}), actions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 space-y-3",
					children: actions.map((action) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "border-t border-[#dccfbe] pt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold text-[#181614]",
								children: action.action
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm leading-6 text-[#574d45]",
								children: [
									tr(locale, "Owner", "Владелец"),
									": ",
									action.owner,
									" · ",
									tr(locale, "Priority", "Приоритет"),
									":",
									" ",
									localizedHorecaText(locale, actionPriorityCopy[action.priority]),
									" · ",
									tr(locale, "Status", "Статус"),
									":",
									" ",
									localizedHorecaText(locale, actionStatusCopy[action.status])
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs leading-5 text-[#574d45]",
								children: action.verificationPlan
							})
						]
					}, action.id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "selena-prose mt-3 text-[#574d45]",
					children: tr(locale, "No recommendation is published until it has accepted sources, an owner, a priority and a verification plan.", "Рекомендация не публикуется без принятых источников, владельца, приоритета и плана проверки.")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "outcomes",
				className: "selena-section scroll-mt-5",
				"aria-labelledby": "horeca-outcomes-title",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "horeca-outcomes-title",
						className: "selena-heading text-2xl text-[#181614]",
						children: tr(locale, "Outcomes", "Результаты")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4",
						children: outcomes.map((module) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModuleRow, {
							module,
							locale,
							evidence
						}, module.moduleId))
					}),
					outcomeRecords.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 space-y-3",
						children: outcomeRecords.map((outcome) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "border-t border-[#dccfbe] pt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium leading-6 text-[#181614]",
								children: outcome.statement
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-[#574d45]",
								children: [
									localizedHorecaText(locale, outcomeLevelCopy[outcome.level]),
									" ·",
									" ",
									localizedHorecaText(locale, outcomeStatusCopy[outcome.status])
								]
							})]
						}, outcome.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: "https://www.selenasystems.com/visibility",
						target: "_blank",
						rel: "noreferrer",
						className: "mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8f5c34] underline decoration-[#b9825b] underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#8f5c34]",
						children: [tr(locale, "Read the current product scope", "Текущий scope продукта"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowUpRight, {
							className: "size-4",
							"aria-hidden": "true"
						})]
					})
				]
			})
		]
	});
}
function SelenaHorecaPage() {
	const { localVisibility, workspace, generatedAt } = Route.useLoaderData();
	const search = Route.useSearch();
	const requestedLocale = search.locale;
	const [locale, setLocale] = (0, import_react.useState)(requestedLocale ?? "en");
	const selectedProject = workspace.projects.find((project) => project.id === workspace.selectedProjectId);
	const preview = buildHorecaLocalFirstPreview(localVisibility.enabled, generatedAt);
	const model = workspace.model ?? (selectedProject ? {
		...preview,
		project: {
			...preview.project,
			displayName: selectedProject.name
		}
	} : preview);
	const evidenceDetailHref = (evidenceId) => {
		const params = new URLSearchParams();
		params.set("locale", locale);
		if (workspace.selectedProjectId) params.set("project", workspace.selectedProjectId);
		params.set("evidence", evidenceId);
		return `/app/selena-horeca?${params.toString()}#evidence`;
	};
	const workspaceToolSearch = {
		locale,
		...workspace.selectedProjectId ? { project: workspace.selectedProjectId } : {},
		...search.evidence ? { evidence: search.evidence } : {}
	};
	(0, import_react.useEffect)(() => {
		const savedLocale = window.localStorage.getItem("selena-workspace-locale");
		const nextLocale = requestedLocale ?? (savedLocale === "ru" ? "ru" : "en");
		setLocale(nextLocale);
		document.documentElement.lang = nextLocale;
		if (requestedLocale) window.localStorage.setItem("selena-workspace-locale", requestedLocale);
	}, [requestedLocale]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "selena-app min-h-screen bg-[#ece4d8] pb-16 text-[#181614]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "selena-app-header",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaWordmark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/selena-horeca",
						search: {
							...search,
							locale: locale === "ru" ? "en" : "ru"
						},
						className: "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold text-[#181614] outline-none hover:bg-[#eee5da] focus-visible:ring-2 focus-visible:ring-[#8f5c34]",
						"aria-label": locale === "ru" ? "Switch to English" : "Переключить на русский",
						children: locale === "ru" ? "EN" : "RU"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/app/selena",
						className: "inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#181614] outline-none hover:bg-[#eee5da] focus-visible:ring-2 focus-visible:ring-[#8f5c34]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowLeft, {
							className: "size-4",
							"aria-hidden": "true"
						}), locale === "ru" ? "Проекты" : "Projects"]
					})]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:py-12",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
				className: "min-w-0 lg:sticky lg:top-8 lg:self-start",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					"aria-label": locale === "ru" ? "Проекты HoReCa" : "HoReCa projects",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-3 text-xs font-bold tracking-[0.08em] text-[#574d45]",
						children: locale === "ru" ? "ПРОЕКТЫ" : "PROJECTS"
					}), workspace.projects.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "selena-project-nav-list space-y-2",
						children: workspace.projects.map((project) => {
							const selected = project.id === workspace.selectedProjectId;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/app/selena-horeca",
								search: {
									locale,
									project: project.id
								},
								className: "selena-project-link",
								"data-selected": selected || void 0,
								"aria-current": selected ? "page" : void 0,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium",
									children: project.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-[#574d45]",
									children: locale === "ru" ? "Открыть кабинет" : "Open workspace"
								})]
							}) }, project.id);
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-xl border border-dashed border-[#d9cfc2] p-4 text-sm leading-6 text-[#574d45]",
						children: locale === "ru" ? "Проекты HoReCa пока не доступны." : "No HoReCa projects are available yet."
					})]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [workspace.reportDocuments.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mb-8 border-b border-[#e6ddd1] pb-8",
					"aria-labelledby": "report-library-title",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "report-library-title",
							className: "font-serif text-2xl font-semibold",
							children: locale === "ru" ? "Готовые отчёты AVLI" : "AVLI reports"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-6 text-[#574d45]",
							children: locale === "ru" ? "Сохранённые клиентские документы. Открытие и скачивание не запускают новые измерения." : "Saved client documents in Russian. Opening or downloading does not start new measurements."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-5 divide-y divide-[#e6ddd1]",
							children: workspace.reportDocuments.map((document) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "py-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-semibold",
										children: document.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-sm leading-6 text-[#574d45]",
										children: document.description
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-2 flex flex-wrap gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: document.href,
											target: "_blank",
											rel: "noopener noreferrer",
											className: "inline-flex min-h-11 items-center text-[#8f5c34] underline underline-offset-4",
											children: locale === "ru" ? "Открыть отчёт ↗" : "Open report ↗"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: `${document.href}&download=1`,
											className: "inline-flex min-h-11 items-center text-[#8f5c34] underline underline-offset-4",
											children: locale === "ru" ? "Скачать HTML" : "Download HTML"
										})]
									})
								]
							}, document.id))
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaHorecaLocalFirst, {
					locale,
					model,
					sourceOnlyPreview: workspace.model === null,
					evidenceDetail: workspace.evidenceDetail,
					evidenceDetailHref: workspace.model ? evidenceDetailHref : void 0,
					workspaceToolSearch
				})]
			})]
		})]
	});
}
//#endregion
export { SelenaHorecaPage as component };

//# sourceMappingURL=selena-horeca-DivBAySm.mjs.map