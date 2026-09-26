import type { ExternalLocalAuditContent } from "@workspace/lib/selena-local-external-audit";
import type { LocalReportContent } from "@workspace/lib/selena-local-report-publication";
import { useEffect, useRef, useState } from "react";
import { SelenaLocalExternalReport } from "./selena-local-external-report";
import { SelenaLocalMapReport } from "./selena-local-map-report";

type PublishedReport = {
	id: string;
	version: number;
	content: LocalReportContent;
	externalAudits?: Array<{ id: string; content: ExternalLocalAuditContent; contentSha256: string }>;
	delivery: { id: string; status: string; sentAt: string; acknowledgedAt: string | null } | null;
};
type Evidence = {
	observation: LocalReportContent["observations"][number];
	provider: string;
	evidenceSha256: string;
	acceptedAt: string;
};
const control =
	"inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b9825b] px-4 py-2 font-semibold text-[#8f5c34] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60";

export function SelenaLocalReportPage({ cycleId }: { cycleId: string }) {
	const [report, setReport] = useState<PublishedReport | null>(null);
	const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
	const [reload, setReload] = useState(0);
	const [acknowledging, setAcknowledging] = useState(false);
	const [message, setMessage] = useState("");
	const [evidence, setEvidence] = useState<Evidence | null>(null);
	const [evidenceState, setEvidenceState] = useState<"idle" | "loading" | "ready" | "error">("idle");
	const requestKey = useRef("");
	const evidencePanel = useRef<HTMLElement>(null);
	useEffect(() => {
		if (evidenceState === "ready" || evidenceState === "error") {
			evidencePanel.current?.focus();
			evidencePanel.current?.scrollIntoView({ block: "start" });
		}
	}, [evidenceState]);
	const endpoint = `/api/v1/selena/local-scan-cycles/${encodeURIComponent(cycleId)}/report`;
	useEffect(() => {
		const abort = new AbortController();
		setState("loading");
		setReport(null);
		setEvidence(null);
		setEvidenceState("idle");
		setMessage("");
		requestKey.current = "";
		void fetch(`${endpoint}?refresh=${reload}`, { credentials: "same-origin", signal: abort.signal })
			.then(async (response) => {
				if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("REPORT_UNAVAILABLE");
				if (response.status === 404) {
					setState("empty");
					return;
				}
				if (!response.ok) throw new Error("REPORT_UNAVAILABLE");
				setReport((await response.json()) as PublishedReport);
				setState("ready");
			})
			.catch(() => {
				if (!abort.signal.aborted) setState("error");
			});
		return () => abort.abort();
	}, [endpoint, reload]);
	async function acknowledge() {
		if (!report?.delivery || acknowledging) return;
		setAcknowledging(true);
		setMessage("");
		requestKey.current ||= crypto.randomUUID();
		try {
			const response = await fetch(`${endpoint}/acknowledge`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current },
				body: JSON.stringify({ deliveryId: report.delivery.id }),
			});
			if (!response.ok) throw new Error("ACKNOWLEDGEMENT_FAILED");
			setReport({ ...report, delivery: { ...report.delivery, status: "ACKNOWLEDGED" } });
			setMessage("Thank you. Your receipt is confirmed.");
		} catch {
			setMessage("Receipt could not be confirmed. Please try again.");
		} finally {
			setAcknowledging(false);
		}
	}
	async function openEvidence(id: string) {
		setEvidence(null);
		setEvidenceState("loading");
		try {
			const response = await fetch(`${endpoint}?evidence=${encodeURIComponent(id)}`, { credentials: "same-origin" });
			if (!response.ok) throw new Error("EVIDENCE_UNAVAILABLE");
			setEvidence((await response.json()) as Evidence);
			setEvidenceState("ready");
		} catch {
			setEvidenceState("error");
		}
	}
	return (
		<main className="min-h-screen bg-[#f7f2ea] px-4 py-8 text-[#181614] sm:px-8">
			<div className="mx-auto max-w-5xl space-y-8">
				<header>
					<a href="/app/selena" className={`${control} mb-6`}>
						Back to workspace
					</a>
					<h1 className="font-serif text-3xl sm:text-4xl">Your Google Maps report</h1>
					<p className="mt-3 max-w-2xl text-[#574d45]">
						Positions measured around your location, with the time and evidence for each point. Positions may change
						after the measurement.
					</p>
				</header>
				{state === "loading" && <p role="status">Loading your report…</p>}
				{state === "empty" && (
					<p role="status">This report is not available yet. Your operator will share it after review.</p>
				)}
				{state === "error" && (
					<div role="alert">
						<p>We could not load this report. Sign in to the workspace that received the report and try again.</p>
						<button className={`${control} mt-4`} onClick={() => setReload((value) => value + 1)} type="button">
							Try again
						</button>
					</div>
				)}
				{state === "ready" && report && (
					<>
						<a href={`${endpoint}?download=csv`} className={control}>
							Download report (CSV)
						</a>
						<a
							href={`${endpoint}?download=print`}
							target="_blank"
							rel="noopener noreferrer"
							className={`${control} ml-3`}
						>
							Print / save PDF
						</a>
						<SelenaLocalMapReport report={report.content} onEvidence={(id) => void openEvidence(id)} />
						{report.externalAudits?.length ? <SelenaLocalExternalReport audits={report.externalAudits} /> : null}
						<section aria-labelledby="local-competitors-title" className="space-y-4">
							<h2 id="local-competitors-title" className="text-xl font-semibold">
								Competitors in the saved results
							</h2>
							<p>
								Organic positions exclude advertising. These are positions at the measurement time, not visits or
								bookings. They do not explain why Google ranked a restaurant. Saved comparisons remain in the report
								after the original response reaches its retention deadline.
							</p>
							<p className="text-sm sm:hidden">Scroll the table sideways to compare positions and advertising.</p>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[42rem] border-collapse text-left">
									<thead>
										<tr>
											<th scope="col" className="p-3">
												Point and query
											</th>
											<th scope="col" className="p-3">
												Organic results above your restaurant
											</th>
											<th scope="col" className="p-3">
												Advertising, shown separately
											</th>
										</tr>
									</thead>
									<tbody>
										{report.content.observations.map((row) => (
											<tr key={row.id} className="border-t border-[#e6ddd1]">
												<th scope="row" className="p-3 font-normal">
													Point {row.pointIndex + 1}
													<br />
													{row.keyword}
													{row.competition?.status === "AVAILABLE" && row.competition.rawRetentionExpiresAt && (
														<p className="mt-2 text-sm">
															Source response retention until{" "}
															{new Date(row.competition.rawRetentionExpiresAt).toLocaleString()}
														</p>
													)}
												</th>
												<td className="p-3">
													{row.competition?.status !== "AVAILABLE" ? (
														"Competitor evidence unavailable"
													) : !row.competition.target ? (
														"Restaurant not found within the checked depth; its exact position is unknown."
													) : row.competition.aboveTarget.length === 0 ? (
														"No organic result ahead in this saved response."
													) : (
														<ul>
															{row.competition.aboveTarget.map((item) => (
																<li key={item.sourceItemIndex}>
																	{item.name} — organic #{item.groupRank}
																	{item.absoluteRank == null ? "" : `; overall #${item.absoluteRank}`}
																</li>
															))}
														</ul>
													)}
												</td>
												<td className="p-3">
													{row.competition?.status !== "AVAILABLE" ? (
														"Advertising evidence unavailable"
													) : row.competition.ads.length === 0 ? (
														"No ad recorded in this response."
													) : (
														<ul>
															{row.competition.ads.map((item) => (
																<li key={item.sourceItemIndex}>
																	{item.name} — ad{item.absoluteRank == null ? "" : `; overall #${item.absoluteRank}`}
																</li>
															))}
														</ul>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>

						<section
							ref={evidencePanel}
							tabIndex={-1}
							aria-live="polite"
							aria-label="Measurement evidence"
							className="scroll-mt-6 focus-visible:outline-2 focus-visible:outline-offset-4"
						>
							{evidenceState === "loading" && <p role="status">Loading evidence…</p>}
							{evidenceState === "error" && (
								<p role="alert">Evidence could not be loaded. Select the point again to retry.</p>
							)}
							{evidence && (
								<>
									<h2 className="text-xl font-semibold">Evidence for point {evidence.observation.pointIndex + 1}</h2>
									<p className="mt-3">{evidence.observation.keyword}</p>
									<dl className="mt-3 grid gap-3 sm:grid-cols-2">
										<div>
											<dt>Position</dt>
											<dd>
												{evidence.observation.targetRank
													? `#${evidence.observation.targetRank}`
													: "Absent within the measured depth"}
											</dd>
										</div>
										<div>
											<dt>Measured at</dt>
											<dd>
												{evidence.observation.capturedAt
													? new Date(evidence.observation.capturedAt).toLocaleString()
													: "Unavailable"}
											</dd>
										</div>
										<div>
											<dt>Coordinates</dt>
											<dd>
												{evidence.observation.latitude}, {evidence.observation.longitude}
											</dd>
										</div>
										<div>
											<dt>Data provider</dt>
											<dd>{evidence.provider}</dd>
										</div>
									</dl>
									<details className="mt-4">
										<summary className="min-h-11 cursor-pointer py-3">Verification record</summary>
										<p className="break-all text-sm">{evidence.evidenceSha256}</p>
										<p className="mt-2 text-sm">Accepted: {new Date(evidence.acceptedAt).toLocaleString()}</p>
									</details>
								</>
							)}
						</section>
						{report.delivery && (
							<section className="border-t border-[#d9cfc2] pt-6" aria-label="Report receipt">
								<h2 className="text-xl font-semibold">Confirm receipt</h2>
								<p className="mt-2 text-[#574d45]">This confirms that you received this report.</p>
								{report.delivery.status === "ACKNOWLEDGED" ? (
									<p className="mt-4 font-semibold">Receipt confirmed</p>
								) : (
									report.delivery.status === "SENT" && (
										<button
											className={`${control} mt-4`}
											type="button"
											disabled={acknowledging}
											onClick={() => void acknowledge()}
										>
											{acknowledging ? "Confirming…" : "I received this report"}
										</button>
									)
								)}
								<p role="status" className="mt-3">
									{message}
								</p>
							</section>
						)}
					</>
				)}
			</div>
		</main>
	);
}
