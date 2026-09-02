import { IconArrowUpRight, IconMapPin } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { HorecaLocalFirstReadModel, HorecaModuleReadModel } from "@workspace/selena-visibility-contracts";
import {
	HORECA_PREVIEW_AREAS,
	HORECA_PREVIEW_MODULE_COPY,
	type HorecaEvidenceDetail,
	type HorecaPreviewLocale,
	type HorecaPreviewState,
	localizedHorecaText,
} from "@/lib/selena-horeca-local-first";

type Props = {
	locale: HorecaPreviewLocale;
	model: HorecaLocalFirstReadModel;
	sourceOnlyPreview?: boolean;
	evidenceDetail?: HorecaEvidenceDetail | null;
	evidenceDetailHref?: (evidenceId: string) => string;
	workspaceToolSearch?: {
		locale: HorecaPreviewLocale;
		project?: string;
		evidence?: string;
	};
};

const statusCopy: Record<HorecaPreviewState, { en: string; ru: string }> = {
	HIDDEN: { en: "Hidden", ru: "Скрыто" },
	LOCKED: { en: "Needs approval", ru: "Нужно разрешение" },
	PILOT: { en: "Pilot", ru: "Пилот" },
	ACTIVE: { en: "Available", ru: "Доступно" },
	PARTIAL: { en: "Partial data", ru: "Частичные данные" },
	UNKNOWN: { en: "Not measured", ru: "Не измерено" },
	BLOCKED: { en: "Blocked", ru: "Заблокировано" },
};

type LocalizedCopy = { en: string; ru: string };

const projectPhaseCopy: Record<HorecaLocalFirstReadModel["project"]["phase"], LocalizedCopy> = {
	ACTIVE: { en: "Active", ru: "Действующий проект" },
	PRE_OPENING: { en: "Pre-opening", ru: "До открытия" },
	UNKNOWN: { en: "Not confirmed", ru: "Не подтверждено" },
};

const evidenceAccessCopy: Record<HorecaLocalFirstReadModel["evidence"][number]["accessClass"], LocalizedCopy> = {
	PUBLIC: { en: "Public source", ru: "Публичный источник" },
	UPLOADED: { en: "Uploaded source", ru: "Загруженный источник" },
	CONNECTED: { en: "Connected source", ru: "Подключённый источник" },
	DERIVED: { en: "Derived evidence", ru: "Производное доказательство" },
};

const findingStatusCopy: Record<HorecaLocalFirstReadModel["findings"][number]["status"], LocalizedCopy> = {
	OBSERVED: { en: "Observed", ru: "Наблюдается" },
	CONFLICT: { en: "Conflict", ru: "Конфликт" },
	UNKNOWN: { en: "Not confirmed", ru: "Не подтверждено" },
	BLOCKED: { en: "Blocked", ru: "Заблокировано" },
};

const actionPriorityCopy: Record<HorecaLocalFirstReadModel["actions"][number]["priority"], LocalizedCopy> = {
	NOW: { en: "Now", ru: "Сейчас" },
	NEXT: { en: "Next", ru: "Далее" },
	LATER: { en: "Later", ru: "Позже" },
};

const actionStatusCopy: Record<HorecaLocalFirstReadModel["actions"][number]["status"], LocalizedCopy> = {
	PROPOSED: { en: "Proposed", ru: "Предложено" },
	READY: { en: "Ready", ru: "Готово" },
	IN_PROGRESS: { en: "In progress", ru: "В работе" },
	DONE: { en: "Done", ru: "Выполнено" },
	BLOCKED: { en: "Blocked", ru: "Заблокировано" },
};

const outcomeLevelCopy: Record<HorecaLocalFirstReadModel["outcomes"][number]["level"], LocalizedCopy> = {
	READINESS: { en: "Readiness", ru: "Готовность" },
	OBSERVED: { en: "Observed outcome", ru: "Наблюдаемый результат" },
	ASSISTED: { en: "Assisted outcome", ru: "Ассистированный результат" },
	ATTRIBUTED: { en: "Attributed outcome", ru: "Атрибутированный результат" },
};

const outcomeStatusCopy: Record<HorecaLocalFirstReadModel["outcomes"][number]["status"], LocalizedCopy> = {
	MEASURED: { en: "Measured", ru: "Измерено" },
	UNKNOWN: { en: "Not measured", ru: "Не измерено" },
	BLOCKED: { en: "Blocked", ru: "Заблокировано" },
};

function tr(locale: HorecaPreviewLocale, en: string, ru: string): string {
	return locale === "ru" ? ru : en;
}

function summaryCopy(module: HorecaModuleReadModel, locale: HorecaPreviewLocale): string {
	if (module.summary.kind === "UNKNOWN") {
		if (module.evidenceIds.length > 0) {
			return tr(
				locale,
				"Accepted linked evidence is available; no aggregate measurement has passed the read-model gate.",
				"Принятые связанные доказательства доступны; агрегированный замер ещё не прошёл проверку модели чтения.",
			);
		}
		return locale === "ru"
			? localizedHorecaText(locale, HORECA_PREVIEW_MODULE_COPY[module.moduleId].summary)
			: module.summary.reason;
	}
	return tr(
		locale,
		`Observed in ${module.summary.numerator} of ${module.summary.denominator} accepted checks; ${module.summary.invalidCount} excluded. Captured ${new Date(module.summary.capturedAt).toLocaleDateString("en-GB")}.`,
		`Обнаружено в ${module.summary.numerator} из ${module.summary.denominator} принятых проверок; исключено: ${module.summary.invalidCount}. Дата: ${new Date(module.summary.capturedAt).toLocaleDateString("ru-RU")}.`,
	);
}

function stateTone(state: HorecaPreviewState): string {
	if (state === "ACTIVE") return "border-[#b7d4bf] bg-[#edf7ef] text-[#285f3e]";
	if (state === "PARTIAL" || state === "PILOT") return "border-[#dfc09e] bg-[#fff7ed] text-[#7a4b24]";
	if (state === "BLOCKED") return "border-[#e3bbb5] bg-[#fff1ef] text-[#7c3029]";
	return "border-[#d9cfc2] bg-[#fffdf8] text-[#6e6258]";
}

function ModuleRow({
	module,
	locale,
	evidence,
}: {
	module: HorecaModuleReadModel;
	locale: HorecaPreviewLocale;
	evidence: HorecaLocalFirstReadModel["evidence"];
}) {
	const copy = HORECA_PREVIEW_MODULE_COPY[module.moduleId];
	const linkedEvidence = evidence.filter((item) => module.evidenceIds.includes(item.id));
	return (
		<li className="grid gap-3 border-t border-[#e6ddd1] py-5 first:border-t-0 sm:grid-cols-[minmax(10rem,0.7fr)_minmax(16rem,1.3fr)] sm:items-start">
			<div className="flex items-center justify-between gap-3 sm:block">
				<h3 className="font-semibold text-[#181614]">
					{locale === "en" ? module.label : localizedHorecaText(locale, copy.label)}
				</h3>
				<span
					className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[0.6875rem] font-bold tracking-[0.08em] ${stateTone(module.state)}`}
				>
					{localizedHorecaText(locale, statusCopy[module.state])}
				</span>
			</div>
			<div>
				<p className="text-sm font-medium leading-6 text-[#181614]">{summaryCopy(module, locale)}</p>
				{module.configurationLockReference && (
					<p className="mt-1 text-xs font-semibold text-[#8f5c34]">
						{tr(locale, "Measurement settings saved for comparison.", "Настройки замера сохранены для сравнения.")}
					</p>
				)}
				<ul className="mt-1 space-y-1 text-sm leading-6 text-[#6e6258]">
					{(module.limitations.length > 0 ? module.limitations : [localizedHorecaText(locale, copy.limitation)]).map(
						(limitation) => (
							<li key={limitation}>{limitation}</li>
						),
					)}
				</ul>
				{linkedEvidence.length > 0 && (
					<p className="mt-2 text-xs leading-5 text-[#6e6258]">
						{tr(locale, "Accepted sources", "Принятые источники")}:{" "}
						{linkedEvidence.map((item, index) => (
							<span key={item.id}>
								{index > 0 ? ", " : ""}
								<a className="underline underline-offset-2" href={`#evidence-${item.id}`}>
									{item.sourceLabel}
								</a>
							</span>
						))}
					</p>
				)}
			</div>
		</li>
	);
}

export function SelenaHorecaLocalFirst({
	locale,
	model,
	sourceOnlyPreview = true,
	evidenceDetail = null,
	evidenceDetailHref,
	workspaceToolSearch,
}: Props) {
	const modules = model.modules.filter((module) => module.state !== "HIDDEN");
	const socialHidden = model.modules.some((module) => module.moduleId === "SOCIAL" && module.state === "HIDDEN");
	const travelHidden = model.modules.some((module) => module.moduleId === "TRAVEL" && module.state === "HIDDEN");
	const evidence = model.evidence.filter(
		(item) => !(socialHidden && item.domain === "SOCIAL") && !(travelHidden && item.domain === "TRAVEL"),
	);
	const evidenceIds = new Set(evidence.map((item) => item.id));
	const findings = model.findings.filter((finding) => finding.evidenceIds.every((id) => evidenceIds.has(id)));
	const findingIds = new Set(findings.map((finding) => finding.id));
	const competitors = model.competitors.filter(
		(competitor) =>
			!(socialHidden && competitor.surface === "SOCIAL") &&
			!(travelHidden && competitor.surface === "TRAVEL") &&
			competitor.evidenceIds.every((id) => evidenceIds.has(id)),
	);
	const actions = model.actions.filter(
		(action) =>
			action.evidenceIds.every((id) => evidenceIds.has(id)) && action.findingIds.every((id) => findingIds.has(id)),
	);
	const outcomeRecords = model.outcomes.filter((outcome) => outcome.evidenceIds.every((id) => evidenceIds.has(id)));
	const visibilityModules = modules.filter((module) =>
		["AI_ANSWERS", "SEARCH", "LOCAL_MAPS", "LOCAL_AI"].includes(module.moduleId),
	);
	const evidenceModules = modules.filter((module) => ["REPUTATION", "SOCIAL", "TRAVEL"].includes(module.moduleId));
	const outcomes = modules.filter((module) => module.moduleId === "OUTCOMES");
	const measuredVisibilityCount = visibilityModules.filter((module) => module.summary.kind === "MEASURED_SHARE").length;
	const readinessEvidenceCount = outcomeRecords.filter(
		(outcome) => outcome.level === "READINESS" && outcome.status === "MEASURED",
	).length;
	const evidenceGapCount = findings.filter((finding) => finding.status !== "OBSERVED").length;
	const actionBlockerCount = actions.filter((action) => action.status === "BLOCKED").length;
	const notMeasured = tr(locale, "Not measured", "Не измерено");
	const notAssessed = tr(locale, "Not assessed", "Не оценено");
	const overviewSignals = [
		{
			label: tr(locale, "Visibility coverage", "Охват видимости"),
			value: measuredVisibilityCount === 0 ? notMeasured : String(measuredVisibilityCount),
			detail: tr(
				locale,
				"Measured surfaces; samples and denominators remain separate",
				"Измеренные поверхности; выборки и знаменатели остаются раздельными",
			),
		},
		{
			label: tr(locale, "Readiness evidence", "Доказательства готовности"),
			value: outcomeRecords.length === 0 ? notMeasured : String(readinessEvidenceCount),
			detail: tr(locale, "Readiness is not a visibility measurement", "Готовность не является замером видимости"),
		},
		{
			label: tr(locale, "Competitor observations", "Наблюдения о конкурентах"),
			value: competitors.length === 0 ? notAssessed : String(competitors.length),
			detail: tr(locale, "Only evidence-linked reasons are counted", "Учитываются только причины с доказательствами"),
		},
		{
			label: tr(locale, "Evidence gaps", "Пробелы в доказательствах"),
			value: findings.length === 0 ? notAssessed : String(evidenceGapCount),
			detail: tr(
				locale,
				"Unknown, conflicting or blocked findings",
				"Неизвестные, конфликтующие или заблокированные выводы",
			),
		},
		{
			label: tr(locale, "Action blockers", "Блокеры действий"),
			value: actions.length === 0 ? notAssessed : String(actionBlockerCount),
			detail: tr(
				locale,
				"Actions that cannot proceed on current evidence",
				"Действия, которые нельзя продолжить с текущими доказательствами",
			),
		},
	];

	return (
		<div className="space-y-6">
			<nav aria-label={tr(locale, "Workspace tools", "Инструменты кабинета")} className="overflow-x-auto">
				<p className="mb-2 text-xs font-bold tracking-[0.08em] text-[#6e6258]">{tr(locale, "TOOLS", "ИНСТРУМЕНТЫ")}</p>
				<ul className="flex min-w-max gap-2 pb-1">
					{HORECA_PREVIEW_AREAS.map((area) => (
						<li key={area.id}>
							{workspaceToolSearch ? (
								<Link
									to="/app/selena-horeca"
									search={workspaceToolSearch}
									hash={area.id}
									className="inline-flex min-h-11 items-center rounded-full border border-[#d9cfc2] bg-[#fffdf8] px-4 text-sm font-semibold text-[#181614] outline-none transition-colors hover:border-[#b9825b] focus-visible:ring-2 focus-visible:ring-[#8f5c34] focus-visible:ring-offset-2"
								>
									{localizedHorecaText(locale, area.label)}
								</Link>
							) : (
								<a
									href={`#${area.id}`}
									className="inline-flex min-h-11 items-center rounded-full border border-[#d9cfc2] bg-[#fffdf8] px-4 text-sm font-semibold text-[#181614] outline-none transition-colors hover:border-[#b9825b] focus-visible:ring-2 focus-visible:ring-[#8f5c34] focus-visible:ring-offset-2"
								>
									{localizedHorecaText(locale, area.label)}
								</a>
							)}
						</li>
					))}
				</ul>
			</nav>

			<section id="overview" className="selena-section scroll-mt-5" aria-labelledby="horeca-overview-title">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-3xl">
						<h1 id="horeca-overview-title" className="selena-heading text-3xl text-[#181614] sm:text-4xl">
							{tr(locale, "HoReCa Local-first decision view", "HoReCa Local-first для принятия решений")}
						</h1>
						<p className="mt-3 text-sm leading-6 text-[#6e6258] sm:text-base">
							{tr(
								locale,
								"A business decision view, not a single score. Each signal stays independent; evidence appears only after it is accepted and linked. No measurement starts from this page.",
								"Картина для бизнес-решений, а не единый балл. Каждый сигнал остаётся независимым; доказательства появляются только после приёмки и привязки. С этой страницы замеры не запускаются.",
							)}
						</p>
						<p className="mt-2 text-xs font-semibold text-[#8f5c34]">
							{tr(locale, "Project", "Проект")}: {model.project.displayName} · {tr(locale, "Phase", "Этап")}:{" "}
							{localizedHorecaText(locale, projectPhaseCopy[model.project.phase])}
						</p>
					</div>
					<span className="inline-flex min-h-9 items-center rounded-full border border-[#d9cfc2] bg-[#fffdf8] px-3 text-xs font-bold tracking-[0.08em] text-[#6e6258]">
						{sourceOnlyPreview
							? tr(locale, "SOURCE-ONLY PREVIEW", "SOURCE-ONLY ПРЕВЬЮ")
							: tr(locale, "READ-ONLY EVIDENCE", "ДОКАЗАТЕЛЬСТВА · ТОЛЬКО ЧТЕНИЕ")}
					</span>
				</div>

				<dl className="mt-7 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-5">
					{overviewSignals.map((signal) => (
						<div key={signal.label} className="border-t border-[#e6ddd1] py-4">
							<dt className="font-semibold text-sm text-[#181614]">{signal.label}</dt>
							<dd className="mt-2 text-sm font-semibold text-[#8f5c34]">{signal.value}</dd>
							<dd className="mt-1 text-xs leading-5 text-[#6e6258]">{signal.detail}</dd>
						</div>
					))}
				</dl>
			</section>

			<section id="visibility" className="selena-section scroll-mt-5" aria-labelledby="horeca-visibility-title">
				<div className="flex items-start gap-3">
					<IconMapPin className="mt-1 size-5 shrink-0 text-[#8f5c34]" aria-hidden="true" />
					<div>
						<h2 id="horeca-visibility-title" className="selena-heading text-2xl text-[#181614]">
							{tr(locale, "Visibility", "Видимость")}
						</h2>
						<p className="mt-2 text-sm leading-6 text-[#6e6258]">
							{tr(
								locale,
								"AI answers, search, Maps and Local AI keep separate samples, comparison settings and dates.",
								"Ответы AI, поиск, Maps и Local AI используют отдельные выборки, настройки сравнения и даты.",
							)}
						</p>
					</div>
				</div>
				<ul className="mt-4">
					{visibilityModules.map((module) => (
						<ModuleRow key={module.moduleId} module={module} locale={locale} evidence={evidence} />
					))}
				</ul>
			</section>

			<section id="evidence" className="selena-section scroll-mt-5" aria-labelledby="horeca-evidence-title">
				<h2 id="horeca-evidence-title" className="selena-heading text-2xl text-[#181614]">
					{tr(locale, "Evidence", "Доказательства")}
				</h2>
				<p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6258]">
					{tr(
						locale,
						"Business facts, website and menu, reviews, and approved connected sources remain separate records. A configured source is never shown as collected proof.",
						"Данные о бизнесе, сайт и меню, отзывы и разрешённые подключённые источники остаются отдельными записями. Настроенный источник не показывается как собранное доказательство.",
					)}
				</p>
				<ul className="mt-4">
					{evidenceModules.map((module) => (
						<ModuleRow key={module.moduleId} module={module} locale={locale} evidence={evidence} />
					))}
				</ul>
				{evidence.length > 0 ? (
					<ul className="mt-5 divide-y divide-[#e6ddd1] border-y border-[#e6ddd1]">
						{evidence.map((item) => (
							<li id={`evidence-${item.id}`} key={item.id} className="scroll-mt-5 py-4">
								<p className="text-sm font-semibold text-[#181614]">
									{evidenceDetailHref ? (
										<a
											href={evidenceDetailHref(item.id)}
											className="inline-flex min-h-11 items-center underline decoration-[#b9825b] underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#8f5c34]"
										>
											{item.sourceLabel}
										</a>
									) : (
										item.sourceLabel
									)}
								</p>
								<p className="mt-1 text-xs leading-5 text-[#6e6258]">
									{tr(locale, "Captured", "Зафиксировано")}{" "}
									{new Date(item.capturedAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB")} ·{" "}
									{localizedHorecaText(locale, evidenceAccessCopy[item.accessClass])}
								</p>
							</li>
						))}
					</ul>
				) : (
					<p className="mt-4 text-sm font-semibold text-[#8f5c34]">
						{tr(locale, "No accepted sources are connected.", "Принятые источники не подключены.")}
					</p>
				)}
				{evidenceDetail && (
					<aside
						className="mt-5 border-l-2 border-[#b9825b] bg-[#fffdf8] px-4 py-3"
						aria-labelledby="horeca-evidence-detail-title"
					>
						<h3 id="horeca-evidence-detail-title" className="text-sm font-semibold text-[#181614]">
							{tr(locale, "Evidence detail", "Детали доказательства")}
						</h3>
						<p className="mt-2 text-sm font-medium text-[#181614]">{evidenceDetail.sourceLabel}</p>
						<dl className="mt-2 grid gap-2 text-xs leading-5 text-[#6e6258] sm:grid-cols-2">
							<div>
								<dt className="font-semibold text-[#181614]">{tr(locale, "Surface", "Поверхность")}</dt>
								<dd>{evidenceDetail.surfaceLabel}</dd>
							</div>
							<div>
								<dt className="font-semibold text-[#181614]">{tr(locale, "Dataset version", "Версия набора")}</dt>
								<dd>{evidenceDetail.datasetVersion}</dd>
							</div>
							<div>
								<dt className="font-semibold text-[#181614]">{tr(locale, "Reference", "Ссылка")}</dt>
								<dd>{evidenceDetail.reference}</dd>
							</div>
							<div>
								<dt className="font-semibold text-[#181614]">{tr(locale, "Snapshot reference", "Ссылка на снимок")}</dt>
								<dd>{evidenceDetail.snapshotReference}</dd>
							</div>
							<div>
								<dt className="font-semibold text-[#181614]">{tr(locale, "Access", "Доступ")}</dt>
								<dd>{tr(locale, "Normalized detail only", "Только нормализованные детали")}</dd>
							</div>
						</dl>
					</aside>
				)}
				{findings.length > 0 && (
					<ul className="mt-5 space-y-3">
						{findings.map((finding) => (
							<li key={finding.id} className="border-l-2 border-[#b9825b] pl-4">
								<p className="text-sm font-medium leading-6 text-[#181614]">{finding.statement}</p>
								<p className="text-xs text-[#6e6258]">
									{localizedHorecaText(locale, findingStatusCopy[finding.status])}
								</p>
							</li>
						))}
					</ul>
				)}
			</section>

			<section id="competitors" className="selena-section scroll-mt-5" aria-labelledby="horeca-competitors-title">
				<h2 id="horeca-competitors-title" className="selena-heading text-2xl text-[#181614]">
					{tr(locale, "Competitors", "Конкуренты")}
				</h2>
				{competitors.length > 0 ? (
					<ul className="mt-4 space-y-3">
						{competitors.map((competitor) => (
							<li key={competitor.id} className="border-t border-[#e6ddd1] pt-4">
								<p className="text-sm font-semibold text-[#181614]">{competitor.competitorLabel}</p>
								<p className="mt-1 text-sm leading-6 text-[#6e6258]">{competitor.reason}</p>
							</li>
						))}
					</ul>
				) : (
					<p className="mt-3 text-sm font-semibold text-[#8f5c34]">
						{tr(locale, "No accepted competitor observations.", "Принятых наблюдений о конкурентах нет.")}
					</p>
				)}
			</section>

			<section id="actions" className="selena-section scroll-mt-5" aria-labelledby="horeca-actions-title">
				<h2 id="horeca-actions-title" className="selena-heading text-2xl text-[#181614]">
					{tr(locale, "Actions", "Действия")}
				</h2>
				{actions.length > 0 ? (
					<ul className="mt-4 space-y-3">
						{actions.map((action) => (
							<li key={action.id} className="border-t border-[#e6ddd1] pt-4">
								<p className="text-sm font-semibold text-[#181614]">{action.action}</p>
								<p className="mt-1 text-sm leading-6 text-[#6e6258]">
									{tr(locale, "Owner", "Владелец")}: {action.owner} · {tr(locale, "Priority", "Приоритет")}:{" "}
									{localizedHorecaText(locale, actionPriorityCopy[action.priority])} · {tr(locale, "Status", "Статус")}:{" "}
									{localizedHorecaText(locale, actionStatusCopy[action.status])}
								</p>
								<p className="mt-1 text-xs leading-5 text-[#6e6258]">{action.verificationPlan}</p>
							</li>
						))}
					</ul>
				) : (
					<p className="mt-3 max-w-3xl text-sm leading-6 text-[#6e6258]">
						{tr(
							locale,
							"No recommendation is published until it has accepted sources, an owner, a priority and a verification plan.",
							"Рекомендация не публикуется без принятых источников, владельца, приоритета и плана проверки.",
						)}
					</p>
				)}
			</section>

			<section id="outcomes" className="selena-section scroll-mt-5" aria-labelledby="horeca-outcomes-title">
				<h2 id="horeca-outcomes-title" className="selena-heading text-2xl text-[#181614]">
					{tr(locale, "Outcomes", "Результаты")}
				</h2>
				<ul className="mt-4">
					{outcomes.map((module) => (
						<ModuleRow key={module.moduleId} module={module} locale={locale} evidence={evidence} />
					))}
				</ul>
				{outcomeRecords.length > 0 && (
					<ul className="mt-4 space-y-3">
						{outcomeRecords.map((outcome) => (
							<li key={outcome.id} className="border-t border-[#e6ddd1] pt-4">
								<p className="text-sm font-medium leading-6 text-[#181614]">{outcome.statement}</p>
								<p className="mt-1 text-xs text-[#6e6258]">
									{localizedHorecaText(locale, outcomeLevelCopy[outcome.level])} ·{" "}
									{localizedHorecaText(locale, outcomeStatusCopy[outcome.status])}
								</p>
							</li>
						))}
					</ul>
				)}
				<a
					href="https://www.selenasystems.com/visibility"
					target="_blank"
					rel="noreferrer"
					className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8f5c34] underline decoration-[#b9825b] underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#8f5c34]"
				>
					{tr(locale, "Read the current product scope", "Текущий scope продукта")}
					<IconArrowUpRight className="size-4" aria-hidden="true" />
				</a>
			</section>
		</div>
	);
}
