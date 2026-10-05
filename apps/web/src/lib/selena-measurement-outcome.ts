/**
 * What the client is told about a measurement that did not become a report:
 * a status, the reason, and what happens next. One wording for the cabinet and
 * the report page, so a client who signs in again reads the same thing in both.
 *
 * The next step never promises an automatic re-run: nothing re-runs a
 * measurement on its own, and a new one is a new order the operator places
 * after talking to the client.
 */
export type UnsuccessfulReason = "QC_REJECTED" | "NO_SUCCESSFUL_RUNS" | "STOPPED" | "FAILED" | "CARDINALITY_INCIDENT";

export type UnsuccessfulMeasurement = {
	reason: UnsuccessfulReason;
	succeededRuns: number;
	expectedRuns: number;
};

export type MeasurementOutcomeText = { status: string; reason: string; nextStep: string };

type Locale = "en" | "ru";

const tr = (locale: Locale, english: string, russian: string) => (locale === "ru" ? russian : english);

export function unsuccessfulMeasurementText(
	measurement: UnsuccessfulMeasurement,
	locale: Locale,
): MeasurementOutcomeText {
	const { succeededRuns, expectedRuns } = measurement;
	const none = succeededRuns === 0;
	let reason: string;
	switch (measurement.reason) {
		case "QC_REJECTED":
			reason = none
				? tr(
						locale,
						`Quality review rejected the measurement: none of its ${expectedRuns} questions got an answer from the AI systems.`,
						`Проверка качества отклонила замер: ни на один из ${expectedRuns} запросов AI-системы не вернули ответ.`,
					)
				: tr(
						locale,
						`Quality review rejected the measurement: the operator did not accept its answers (${succeededRuns} of ${expectedRuns} came back).`,
						`Проверка качества отклонила замер: оператор не принял полученные ответы (вернулось ${succeededRuns} из ${expectedRuns}).`,
					);
			break;
		case "NO_SUCCESSFUL_RUNS":
			reason = tr(
				locale,
				`None of its ${expectedRuns} questions got an answer from the AI systems.`,
				`Ни на один из ${expectedRuns} запросов AI-системы не вернули ответ.`,
			);
			break;
		case "STOPPED":
			reason = tr(locale, "The operator stopped the measurement.", "Оператор остановил замер.");
			break;
		default:
			reason = tr(
				locale,
				`The measurement broke off with an error after ${succeededRuns} of ${expectedRuns} answers.`,
				`Замер прервался с ошибкой: получено ответов ${succeededRuns} из ${expectedRuns}.`,
			);
	}
	return {
		status: tr(locale, "Measurement not accepted", "Замер не принят"),
		reason,
		nextStep: tr(
			locale,
			"Nothing is re-run or charged automatically. The operator will contact you at the address in your request to agree on a new measurement.",
			"Повторный замер сам не запускается и ничего не списывает. Оператор свяжется с вами по контакту из заявки, чтобы договориться о новом замере.",
		),
	};
}
