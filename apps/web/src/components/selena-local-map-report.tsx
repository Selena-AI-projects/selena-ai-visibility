import {
	IconAlertTriangle,
	IconCircleCheck,
	IconClock,
	IconMapPin,
	IconQuestionMark,
	IconX,
} from "@tabler/icons-react";
import type { LocalReportContent } from "@workspace/lib/selena-local-report-publication";

type Props = {
	report: LocalReportContent;
	locale?: "en" | "ru";
	onEvidence?: (evidenceId: string) => void;
};

const copy = {
	en: {
		title: "Google Maps visibility",
		captured: "Report generated",
		grid: "3×3 measurement grid",
		expected: "Expected",
		terminal: "Finished",
		valid: "Measured",
		invalid: "Failed",
		unknown: "Unconfirmed",
		pending: "Pending",
		found: "Found",
		absent: "Absent within depth",
		invalidState: "Invalid",
		unknownState: "Unknown",
		blocked: "Blocked",
		cancelled: "Cancelled",
		pendingState: "Pending",
		evidence: "Evidence",
		noEvidence: "No accepted evidence",
	},
	ru: {
		title: "Видимость в Google Maps",
		captured: "Отчёт создан",
		grid: "Сетка замера 3×3",
		expected: "Ожидалось",
		terminal: "Завершено",
		valid: "Валидно",
		invalid: "Невалидно",
		unknown: "Неизвестно",
		pending: "Ожидает",
		found: "Найдено",
		absent: "Нет в глубине",
		invalidState: "Невалидно",
		unknownState: "Неизвестно",
		blocked: "Заблокировано",
		cancelled: "Отменено",
		pendingState: "Ожидает",
		evidence: "Доказательство",
		noEvidence: "Принятого доказательства нет",
	},
} as const;

type ReportCopy = { [Key in keyof (typeof copy)["en"]]: string };

function outcomeLabel(outcome: string, text: ReportCopy): string {
	return outcome === "FOUND"
		? text.found
		: outcome === "ABSENT_WITHIN_DEPTH"
			? text.absent
			: outcome === "INVALID"
				? text.invalidState
				: outcome === "UNKNOWN"
					? text.unknownState
					: outcome === "BLOCKED"
						? text.blocked
						: outcome === "CANCELLED"
							? text.cancelled
							: text.pendingState;
}

function OutcomeIcon({ outcome }: { outcome: string }) {
	if (outcome === "FOUND" || outcome === "ABSENT_WITHIN_DEPTH")
		return <IconCircleCheck className="size-4" aria-hidden="true" />;
	if (outcome === "INVALID" || outcome === "BLOCKED")
		return <IconAlertTriangle className="size-4" aria-hidden="true" />;
	if (outcome === "UNKNOWN") return <IconQuestionMark className="size-4" aria-hidden="true" />;
	if (outcome === "CANCELLED") return <IconX className="size-4" aria-hidden="true" />;
	return <IconClock className="size-4" aria-hidden="true" />;
}

function outcomeTone(outcome: string): string {
	if (outcome === "FOUND") return "border-[#6f8f73] bg-[#edf3ed] text-[#24472b]";
	if (outcome === "ABSENT_WITHIN_DEPTH") return "border-[#b8a177] bg-[#f7f1e5] text-[#5b4928]";
	if (outcome === "INVALID" || outcome === "BLOCKED") return "border-[#b87962] bg-[#f9ece7] text-[#6d2f20]";
	if (outcome === "UNKNOWN") return "border-[#ad936c] bg-[#f4eee5] text-[#54422b]";
	if (outcome === "CANCELLED") return "border-[#a49b91] bg-[#eeeae5] text-[#4b443e]";
	return "border-[#c9beb2] bg-[#faf7f2] text-[#574d45]";
}

export function SelenaLocalMapReport({ report, locale = "en", onEvidence }: Props) {
	const text = copy[locale];
	const observations = [...report.observations].sort((a, b) => a.pointIndex - b.pointIndex);
	return (
		<section className="space-y-6" aria-labelledby="selena-local-map-report-title">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-2 text-[#8f5c34]">
						<IconMapPin className="size-5" aria-hidden="true" />
						<span className="text-xs font-bold tracking-[0.08em]">{text.grid}</span>
					</div>
					<h2 id="selena-local-map-report-title" className="mt-2 text-2xl font-semibold text-[#181614]">
						{text.title}
					</h2>
					<p className="mt-1 text-sm text-[#574d45]">
						{report.observations[0]?.keyword ?? ""} · {report.provider}
					</p>
				</div>
				<p className="text-right text-xs text-[#574d45]">
					{text.captured}: {new Date(report.generatedAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB")}
				</p>
			</header>

			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
				{[
					[text.expected, report.totals.expected],
					[text.terminal, report.totals.terminal],
					[text.valid, report.totals.valid],
					[text.invalid, report.totals.invalid],
					[text.unknown, report.totals.unknown],
				].map(([label, value]) => (
					<div key={String(label)} className="rounded-xl border border-[#d9cfc2] bg-[#faf7f2] p-3">
						<dt className="text-xs font-semibold text-[#574d45]">{label}</dt>
						<dd className="mt-1 text-xl font-semibold text-[#181614]">{value}</dd>
					</div>
				))}
			</dl>

			<svg
				viewBox="0 0 360 300"
				className="mx-auto w-full max-w-xl rounded-xl border border-[#d9cfc2] bg-[#faf7f2]"
				role="img"
				aria-label={text.grid}
			>
				<title>
					{text.grid}:{" "}
					{observations
						.map((row) => `P${row.pointIndex + 1} ${outcomeLabel(row.outcome, text)} ${row.targetRank ?? "—"}`)
						.join(", ")}
				</title>
				<text x="180" y="22" textAnchor="middle" fill="#574d45" fontSize="12">
					N ↑
				</text>
				{[60, 150, 240].map((y) => (
					<path key={y} d={`M60 ${y} H300`} stroke="#d9cfc2" />
				))}
				{[60, 180, 300].map((x) => (
					<path key={x} d={`M${x} 60 V240`} stroke="#d9cfc2" />
				))}
				{observations.map((row) => {
					const latitudes = observations.map((point) => point.latitude);
					const longitudes = observations.map((point) => point.longitude);
					const x =
						60 +
						((row.longitude - Math.min(...longitudes)) / (Math.max(...longitudes) - Math.min(...longitudes) || 1)) *
							240;
					const y =
						60 +
						((Math.max(...latitudes) - row.latitude) / (Math.max(...latitudes) - Math.min(...latitudes) || 1)) * 180;
					return (
						<g key={row.id}>
							<circle cx={x} cy={y} r="22" fill={row.outcome === "FOUND" ? "#24472b" : "#574d45"} />
							<text x={x} y={y + 5} textAnchor="middle" fill="#fffdf8" fontSize="16">
								{row.outcome === "FOUND" ? row.targetRank : "—"}
							</text>
							<text x={x} y={y + 39} textAnchor="middle" fill="#574d45" fontSize="12">
								P{row.pointIndex + 1}
							</text>
						</g>
					);
				})}
			</svg>
			<div className="grid gap-4 sm:grid-cols-3">
				{observations.map((observation) => (
					<article
						key={observation.id}
						className={`min-h-32 rounded-xl border p-4 ${outcomeTone(observation.outcome)}`}
					>
						<div className="flex items-start justify-between gap-2">
							<span className="text-xs font-bold tracking-[0.08em]">P{observation.pointIndex + 1}</span>
							<span className="inline-flex items-center gap-1 text-xs font-semibold">
								<OutcomeIcon outcome={observation.outcome} />
								{outcomeLabel(observation.outcome, text)}
							</span>
						</div>
						<p className="mt-5 text-2xl font-semibold">
							{observation.targetRank === null ? "—" : `#${observation.targetRank}`}
						</p>
						{observation.capturedAt && (
							<p className="mt-2 text-xs">
								<time dateTime={observation.capturedAt}>
									{new Date(observation.capturedAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB")}
								</time>
							</p>
						)}
						<p className="mt-1 text-xs">
							{observation.latitude.toFixed(5)}, {observation.longitude.toFixed(5)}
						</p>
						{observation.evidenceId ? (
							<a
								className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
								href={`/api/v1/selena/local-scan-cycles/${report.localCycleId}/report?evidence=${observation.evidenceId}`}
								onClick={
									onEvidence
										? (event) => {
												event.preventDefault();
												onEvidence(observation.evidenceId as string);
											}
										: undefined
								}
								aria-label={`${text.evidence} P${observation.pointIndex + 1}`}
							>
								{text.evidence}
							</a>
						) : (
							<p className="mt-3 text-xs">{observation.reason ?? text.noEvidence}</p>
						)}
					</article>
				))}
			</div>
		</section>
	);
}
