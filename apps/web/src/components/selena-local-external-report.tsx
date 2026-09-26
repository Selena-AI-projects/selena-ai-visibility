import type { ExternalLocalAuditContent } from "@workspace/lib/selena-local-external-audit";
import { useState } from "react";

export function SelenaLocalExternalReport({
	audits,
}: {
	audits: Array<{
		id: string;
		content: ExternalLocalAuditContent;
		rawRetention?: Array<{ providerTaskId: string; expiresAt: string; available: boolean }>;
	}>;
}) {
	const queries = audits.flatMap((audit) =>
		audit.content.batches.flatMap((batch) =>
			[...new Set(batch.observations.map((row) => row.keyword))].map((keyword) => ({
				key: `${audit.id}:${batch.auditId}:${keyword}`,
				rawRetention: audit.rawRetention ?? [],
				keyword,
				rows: batch.observations.filter((row) => row.keyword === keyword),
			})),
		),
	);
	const [selected, setSelected] = useState("");
	const [point, setPoint] = useState(0);
	const query = queries.find((item) => item.key === selected) ?? queries[0];
	if (!query) return null;
	const row = query.rows.find((item) => item.pointIndex === point) ?? query.rows[0];
	const retention = query.rawRetention.find((item) => item.providerTaskId === row.providerTaskId);
	return (
		<section aria-labelledby="additional-query-title" className="space-y-5 border-t border-[#e6ddd1] pt-8">
			<h2 id="additional-query-title" className="font-serif text-2xl">
				Additional measured queries
			</h2>
			<p>
				{queries.length} additional queries · {queries.reduce((sum, item) => sum + item.rows.length, 0)} saved
				positions. The original measurement above remains separate.
			</p>
			<p>
				These results come from retained external audits of the same restaurant. Different search terms and capture
				times are separate scenarios, not a before-and-after comparison. Positions do not measure visits, bookings or
				revenue.
			</p>
			<div>
				<label className="mb-2 block font-semibold" htmlFor="external-query">
					Search query
				</label>
				<select
					id="external-query"
					className="min-h-11 w-full rounded-xl border border-[#b9825b] bg-[#fffdf8] px-3 text-[#181614] focus-visible:outline-2 focus-visible:outline-offset-4"
					value={query.key}
					onChange={(event) => {
						setSelected(event.target.value);
						setPoint(0);
					}}
				>
					{queries.map((item) => (
						<option key={item.key} value={item.key}>
							{item.keyword}
						</option>
					))}
				</select>
			</div>
			<p role="status">
				Found at {query.rows.filter((item) => item.targetRank !== null).length} of {query.rows.length} points; top 3 at{" "}
				{query.rows.filter((item) => item.targetRank !== null && item.targetRank <= 3).length} points.
			</p>
			<p>
				Google Maps · {row.request.language_code} · {row.request.device}/{row.request.os} · depth {row.request.depth} ·
				zoom 13. Select a point to inspect its results.
			</p>
			<fieldset
				aria-label="Additional query measurement points, ordered by point number"
				className="grid grid-cols-3 gap-3"
			>
				{[...query.rows]
					.sort((a, b) => a.pointIndex - b.pointIndex)
					.map((item) => (
						<button
							key={item.providerTaskId}
							type="button"
							aria-pressed={row.pointIndex === item.pointIndex}
							className={`min-h-20 rounded-xl border p-3 focus-visible:outline-2 focus-visible:outline-offset-4 ${row.pointIndex === item.pointIndex ? "border-[#8f5c34] bg-[#181614] text-[#fffdf8]" : "border-[#e6ddd1] bg-[#fffdf8] text-[#181614]"}`}
							onClick={() => setPoint(item.pointIndex)}
						>
							P{item.pointIndex + 1}
							<br />
							{item.targetRank === null ? "Not found" : `#${item.targetRank}`}
						</button>
					))}
			</fieldset>
			<div className="space-y-3" aria-live="polite">
				<h3 className="text-lg font-semibold">
					Point {row.pointIndex + 1} ·{" "}
					{row.targetRank === null ? "Not found within depth 20" : `Organic position #${row.targetRank}`}
				</h3>
				<p>
					Captured: {new Date(row.capturedAt).toLocaleString()} · Coordinates:{" "}
					{row.request.location_coordinate.split(",").slice(0, 2).join(", ")}
				</p>
				{row.targetRank === null && (
					<p>The restaurant was not returned within the checked depth. Its exact position is unknown.</p>
				)}
				<h4 className="font-semibold">Organic results above the restaurant</h4>
				{row.targetRank === null ? (
					<p>No relative position can be assigned when the restaurant is absent.</p>
				) : row.competition.aboveTarget.length === 0 ? (
					<p>No organic result ahead in this response.</p>
				) : (
					<ul className="list-disc pl-5">
						{row.competition.aboveTarget.map((item) => (
							<li key={item.sourceItemIndex}>
								{item.name} — #{item.groupRank}
							</li>
						))}
					</ul>
				)}
				{row.targetRank === null && row.competition.returnedOrganic && (
					<div>
						<h4 className="font-semibold">Restaurants returned in this search</h4>
						<ul className="list-disc pl-5">
							{row.competition.returnedOrganic.map((item) => (
								<li key={item.sourceItemIndex}>
									{item.name} — organic #{item.groupRank}
								</li>
							))}
						</ul>
					</div>
				)}
				<h4 className="font-semibold">Advertising — separate from organic positions</h4>
				{row.competition.ads.length === 0 ? (
					<p>No ad recorded in this response.</p>
				) : (
					<ul className="list-disc pl-5">
						{row.competition.ads.map((item) => (
							<li key={item.sourceItemIndex}>
								{item.name}
								{item.absoluteRank === null ? "" : ` — overall #${item.absoluteRank}`}
							</li>
						))}
					</ul>
				)}
				<details className="break-words text-sm">
					<summary className="min-h-11 cursor-pointer py-3 font-semibold">Saved source reference</summary>
					<p>External retained response · provider task {row.providerTaskId}</p>
					{retention && (
						<p>
							Original response retention deadline: {new Date(retention.expiresAt).toLocaleString()}.{" "}
							{retention.available
								? "Retained privately; the response body is not included in this report."
								: "Original body is unavailable under the retention policy. The saved comparison and hashes remain."}
						</p>
					)}
					<p className="break-all">SHA-256: {row.rawSha256}</p>
					<p>
						Original journal field: {row.sourceTimeField}; recorded {row.sourceRecordedAt}.{" "}
						{row.providerClockAheadMs > 0
							? `Provider clock is ${row.providerClockAheadMs} ms ahead of the source journal.`
							: ""}
					</p>
				</details>
			</div>
		</section>
	);
}
