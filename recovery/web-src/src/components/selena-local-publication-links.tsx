import { useEffect, useState } from "react";

type Version = { id: string; version: number; status: string; createdAt: string; analysisStatus: string };
const control =
	"inline-flex min-h-11 items-center rounded-xl border border-[#b9825b] px-4 py-2 font-semibold text-[#8f5c34] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60";
export function SelenaLocalPublicationLinks({ orderId, status }: { orderId: string; status: string }) {
	const [versions, setVersions] = useState<Version[]>([]),
		[error, setError] = useState(""),
		[busy, setBusy] = useState(false),
		[reload, setReload] = useState(0);
	const endpoint = `/api/v1/selena/local-orders/${encodeURIComponent(orderId)}/publications`;
	useEffect(() => {
		const abort = new AbortController();
		setVersions([]);
		void fetch(`${endpoint}?refresh=${reload}`, { credentials: "same-origin", signal: abort.signal })
			.then(async (r) => {
				if (!r.ok) throw new Error();
				setVersions(await r.json());
				setError("");
			})
			.catch(() => {
				if (!abort.signal.aborted)
					setError("Report history is temporarily unavailable. Your measurement results are preserved.");
			});
		return () => abort.abort();
	}, [endpoint, reload]);
	async function publish() {
		setBusy(true);
		setError("");
		try {
			const r = await fetch(endpoint, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ allowPartial: status === "FAILED" }),
			});
			if (!r.ok) throw new Error();
			setReload((v) => v + 1);
		} catch {
			setError("The report could not be saved. Please retry; no new measurement will run.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<section aria-labelledby="publication-title" className="space-y-3">
			<h2 id="publication-title" className="text-xl font-semibold">
				Saved report versions
			</h2>
			<p>
				Measurements and expert recommendations have separate review states. Saving a report does not run another
				measurement.
			</p>
			{error && <p role="alert">{error}</p>}
			{["READY", "FAILED"].includes(status) && (
				<button className={control} disabled={busy} type="button" onClick={() => void publish()}>
					{status === "FAILED" ? "Save partial report — unfinished points remain visible" : "Save report version"}
				</button>
			)}
			<ul className="space-y-4">
				{versions.map((v) => (
					<li key={v.id}>
						<p>
							Version {v.version} · {v.status === "REVOKED" ? "Revoked" : "Published"} · Expert analysis:{" "}
							{v.analysisStatus === "REVIEWED" ? "reviewed" : "awaiting review"}
						</p>
						{v.status === "PUBLISHED" && (
							<div className="flex flex-wrap gap-3">
								<a className={control} href={`/api/v1/selena/local-publications/${v.id}/`}>
									Open report
								</a>
								<a className={control} href={`/api/v1/selena/local-publications/${v.id}/?format=csv`}>
									Download report CSV
								</a>
							</div>
						)}
					</li>
				))}
			</ul>
		</section>
	);
}
