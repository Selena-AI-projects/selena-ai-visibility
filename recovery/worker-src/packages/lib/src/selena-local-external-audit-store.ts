import { sql } from "drizzle-orm";
import { z } from "zod";
import { type OrganizationDatabase, withOrganizationTransaction } from "./db/organization-transaction";
import { type ExternalLocalAuditInput, prepareExternalLocalAudit } from "./selena-local-external-audit";

export async function readExternalLocalAudit(
	db: OrganizationDatabase,
	auth: { tenantId: string; actorId: string; authType: "session" },
	auditId: string,
) {
	if (auth.authType !== "session" || !auth.actorId) throw new Error("LOCAL_EXTERNAL_AUTH_REQUIRED");
	const id = z.string().uuid().parse(auditId);
	return withOrganizationTransaction(db, auth.tenantId, async (tx) => {
		const member = await tx.execute(
			sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId}`,
		);
		if (!member.rows.length) throw new Error("LOCAL_EXTERNAL_MEMBERSHIP_REQUIRED");
		const result = await tx.execute<{
			id: string;
			content: ReturnType<typeof prepareExternalLocalAudit>["content"];
			contentSha256: string;
		}>(sql`select a.id, a.content_json as content, a.content_sha256 as "contentSha256"
			from sv_local_external_audits a join sv_local_external_publications p
			on p.audit_id=a.id and p.organization_id=a.organization_id
			join sv_local_report_versions r on r.id=p.report_version_id and r.organization_id=p.organization_id
			where a.id=${id} and a.organization_id=${auth.tenantId} and r.status='PUBLISHED'`);
		return result.rows[0] ?? null;
	});
}

export async function publishExternalLocalAudit(
	db: OrganizationDatabase,
	auth: { tenantId: string; actorId: string; authType: "session" },
	input: { auditId: string; reportVersionId: string },
) {
	if (auth.authType !== "session" || !auth.actorId) throw new Error("LOCAL_EXTERNAL_AUTH_REQUIRED");
	const ids = z.object({ auditId: z.string().uuid(), reportVersionId: z.string().uuid() }).parse(input);
	return withOrganizationTransaction(db, auth.tenantId, async (tx) => {
		await tx.execute(sql`select set_config('app.user_id', ${auth.actorId}, true)`);
		const member = await tx.execute(
			sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId} and role in ('owner','admin') for share`,
		);
		if (!member.rows.length) throw new Error("LOCAL_EXTERNAL_OPERATOR_REQUIRED");
		await tx.execute(sql`insert into sv_local_external_publications(organization_id,report_version_id,audit_id,actor_id)
			values(${auth.tenantId},${ids.reportVersionId},${ids.auditId},${auth.actorId})
			on conflict(organization_id,report_version_id,audit_id) do nothing`);
		return ids;
	});
}

/** Import already retained evidence; this path cannot submit or settle provider work. */
export async function importExternalLocalAudit(
	db: OrganizationDatabase,
	auth: { tenantId: string; actorId: string; authType: "session" },
	input: ExternalLocalAuditInput,
) {
	if (auth.authType !== "session" || input.organizationId !== auth.tenantId || !auth.actorId)
		throw new Error("LOCAL_EXTERNAL_AUTH_REQUIRED");
	const prepared = prepareExternalLocalAudit(input);
	const canonical = JSON.stringify(prepared.content);
	return withOrganizationTransaction(db, auth.tenantId, async (tx) => {
		await tx.execute(sql`select set_config('app.user_id', ${auth.actorId}, true)`);
		const membership = await tx.execute(sql`select 1 from member
			where organization_id=${auth.tenantId} and user_id=${auth.actorId} and role in ('owner','admin') for share`);
		if (!membership.rows.length) throw new Error("LOCAL_EXTERNAL_OPERATOR_REQUIRED");
		// Serialize replay before insertion; task uniqueness also rejects overlapping different packages.
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended(${`${auth.tenantId}:${prepared.contentSha256}`},0))`,
		);
		const existing = await tx.execute<{ id: string }>(sql`select id from sv_local_external_audits
			where organization_id=${auth.tenantId} and content_sha256=${prepared.contentSha256}`);
		if (existing.rows[0]) return { id: existing.rows[0].id, contentSha256: prepared.contentSha256, duplicate: true };
		const inserted = await tx.execute<{ id: string }>(sql`insert into sv_local_external_audits
			(organization_id,actor_id,content_json,content_canonical,content_sha256)
			values(${auth.tenantId},${auth.actorId},${canonical}::jsonb,${canonical},${prepared.contentSha256}) returning id`);
		const captures = new Map(
			prepared.content.batches.flatMap((batch) =>
				batch.observations.map((row) => [row.providerTaskId, row.capturedAt] as const),
			),
		);
		for (const batch of input.batches)
			for (const row of batch.observations) {
				const capturedAt = captures.get(row.providerTaskId);
				if (!capturedAt) throw new Error("LOCAL_EXTERNAL_RAW_SOURCE_REQUIRED");
				await tx.execute(sql`insert into sv_local_external_raw_evidence(provider_task_id,organization_id,audit_id,raw_sha256,captured_at,retention_expires_at,raw_body,raw_deleted_at)
			 values(${row.providerTaskId},${auth.tenantId},${inserted.rows[0].id},${row.rawSha256},${capturedAt}::timestamptz,${capturedAt}::timestamptz+interval '720 hours',
			 case when ${capturedAt}::timestamptz+interval '720 hours'>now() then ${row.rawBody} else null end,
			 case when ${capturedAt}::timestamptz+interval '720 hours'<=now() then now() else null end)`);
			}
		return { id: inserted.rows[0].id, contentSha256: prepared.contentSha256, duplicate: false };
	}).catch((error: unknown) => {
		if (error instanceof Error && /^LOCAL_EXTERNAL_[A-Z_]+$/.test(error.message)) throw error;
		const cause = error instanceof Error ? error.cause : null;
		const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
		throw new Error(
			/^[A-Z0-9]{5}$/.test(code) ? `LOCAL_EXTERNAL_IMPORT_FAILED_${code}` : "LOCAL_EXTERNAL_IMPORT_FAILED",
		);
	});
}
