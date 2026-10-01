/**
 * The cabinet's one-line answer to "which AI measurement is this project on".
 * It follows the client report's rule: the date belongs to the newest cycle
 * that passed quality review, a newer cycle is news about the measurement,
 * and without a reviewed cycle there is no date to give — a count or a
 * timestamp from an unfinished or rejected cycle would read as a result.
 */
export type MeasurementReportSummary = {
	/** When the READY cycle the report speaks for was created; null until one is signed off. */
	measuredAt: string | null;
	/** A cycle newer than the report, stated as an update rather than shown as the report. */
	update: { state: "in_progress" | "awaiting_review" | "unsuccessful"; createdAt: string } | null;
};

export type MeasurementLabelLocale = "en" | "ru";

function tr(locale: MeasurementLabelLocale, english: string, russian: string): string {
	return locale === "ru" ? russian : english;
}

function updateOutcome(
	locale: MeasurementLabelLocale,
	state: NonNullable<MeasurementReportSummary["update"]>["state"],
) {
	if (state === "in_progress") return tr(locale, "update in progress", "обновление выполняется");
	if (state === "awaiting_review") return tr(locale, "update awaiting quality review", "обновление ждёт проверки");
	return tr(locale, "update did not pass quality review", "обновление не прошло проверку");
}

export function measurementReportLabel(
	report: MeasurementReportSummary,
	locale: MeasurementLabelLocale,
	formatDate: (iso: string) => string,
): string {
	const prefix = tr(locale, "AI measurement", "AI-замер");
	if (!report.measuredAt) return `${prefix}: ${tr(locale, "report not ready", "отчёт не готов")}`;
	const date = formatDate(report.measuredAt);
	if (!report.update) return `${prefix}: ${date}`;
	return `${prefix}: ${updateOutcome(locale, report.update.state)}, ${tr(locale, `showing the report of ${date}`, `показан отчёт от ${date}`)}`;
}
