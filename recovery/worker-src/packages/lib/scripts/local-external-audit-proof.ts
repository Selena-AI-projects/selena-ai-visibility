import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { withOrganizationTransaction } from "../src/db/organization-transaction";
import * as schema from "../src/db/schema";
import {
	importExternalLocalAudit,
	publishExternalLocalAudit,
	readExternalLocalAudit,
} from "../src/selena-local-external-audit-store";
import { cleanupExpiredLocalRawEvidenceInTransaction } from "../src/selena-local-raw-retention";
import { loadLocalExternalAuditSources } from "./prepare-local-external-audit";

async function main() {
	const port = Number(process.argv[2]);
	assert(Number.isInteger(port) && port > 1024 && port < 65536, "DISPOSABLE_LOOPBACK_PORT_REQUIRED");
	const owner = new Pool({ host: "127.0.0.1", port, user: "postgres", database: "postgres" });
	const app = new Pool({ host: "127.0.0.1", port, user: "selena_app", database: "postgres" });
	try {
		await owner.query(`create role selena_app login nosuperuser nobypassrls;
		 create table organization(id text primary key);
		 create table member(organization_id text, user_id text, role text);
		 create table sv_configuration_locks(id uuid primary key,organization_id text,snapshot jsonb);
		 create table sv_local_scan_cycles(id uuid primary key,organization_id text,configuration_lock_id uuid);
		 create table sv_local_report_versions(id uuid primary key,organization_id text,local_cycle_id uuid,status text,unique(organization_id,id));
		 grant select on sv_configuration_locks,sv_local_scan_cycles,sv_local_report_versions to selena_app;
		 grant select,update on member to selena_app;`);
		await owner.query(await readFile(resolve("packages/lib/src/db/migrations/0073_local_external_audits.sql"), "utf8"));
		const tenantId = "00000000-0000-4000-8000-000000000001";
		const otherId = "00000000-0000-4000-8000-000000000002";
		await owner.query("insert into organization values($1),($2)", [tenantId, otherId]);
		await owner.query("insert into member values($1,'operator','admin'),($2,'other','admin'),($1,'viewer','member')", [
			tenantId,
			otherId,
		]);
		const db = drizzle({ client: app, schema });
		const coordinates = Array.from({ length: 9 }, (_, i) => `-8.${i},115,13`);
		const input = {
			organizationId: tenantId,
			target: { cid: "1", placeId: "target" },
			language: "en",
			coordinates,
			batches: [
				{
					auditId: "fixture-audit",
					summarySha256: `sha256:${"a".repeat(64)}`,
					observations: coordinates.map((location_coordinate, pointIndex) => {
						const providerTaskId = `fixture-${pointIndex}`;
						const rawBody = JSON.stringify({
							status_code: 20000,
							cost: 0.002,
							tasks: [
								{
									id: providerTaskId,
									status_code: 20000,
									cost: 0.002,
									path: ["v3", "serp", "google", "maps", "live", "advanced"],
									data: {
										api: "serp",
										function: "live",
										se: "google",
										se_type: "maps",
										keyword: "dinner",
										language_code: "en",
										location_coordinate,
										device: "mobile",
										os: "android",
										se_domain: "google.com",
										depth: 20,
										search_this_area: true,
									},
									result: [
										{
											type: "maps",
											keyword: "dinner",
											language_code: "en",
											se_domain: "google.com",
											datetime: "2026-09-12 03:00:00 +00:00",
											items: [],
										},
									],
								},
							],
						});
						return {
							pointIndex,
							keyword: "dinner",
							providerTaskId,
							rawBody,
							rawSha256: `sha256:${createHash("sha256").update(rawBody).digest("hex")}`,
							sourceRecordedAt: "2026-09-12T03:00:01Z",
							sourceTimeField: "receivedAt" as const,
							providerReportedCostUsd: "0.002",
							targetRank: null,
						};
					}),
				},
			],
		};
		const auth = { tenantId, actorId: "operator", authType: "session" as const };
		const pair = await Promise.all([
			importExternalLocalAudit(db, auth, input),
			importExternalLocalAudit(db, auth, input),
		]);
		assert.equal(pair[0].id, pair[1].id);
		assert.equal(
			(await owner.query("select count(*)::int n from sv_local_external_raw_evidence where raw_body is not null"))
				.rows[0].n,
			9,
		);
		await assert.rejects(app.query("select raw_body from sv_local_external_raw_evidence"), /permission denied/);
		await assert.rejects(
			owner.query("update sv_local_external_raw_evidence set raw_body=null,raw_deleted_at=now()"),
			/RETENTION_REQUIRED/,
		);
		await assert.rejects(owner.query("update sv_local_external_raw_evidence set raw_body='tampered'"), /IMMUTABLE/);
		assert.equal(await readExternalLocalAudit(db, { ...auth, actorId: "viewer" }, pair[0].id), null);
		const reportId = "00000000-0000-4000-8000-000000000003";
		await owner.query("insert into sv_configuration_locks values($1,$2,$3)", [
			reportId,
			tenantId,
			JSON.stringify({ targetIdentity: input.target }),
		]);
		await owner.query("insert into sv_local_scan_cycles values($1,$2,$1)", [reportId, tenantId]);
		await owner.query("insert into sv_local_report_versions values($1,$2,$1,'DRAFT')", [reportId, tenantId]);
		const publication = { auditId: pair[0].id, reportVersionId: reportId };
		await assert.rejects(publishExternalLocalAudit(db, auth, publication));
		await owner.query("update sv_local_report_versions set status='PUBLISHED'");
		await assert.rejects(publishExternalLocalAudit(db, { ...auth, actorId: "viewer" }, publication));
		await publishExternalLocalAudit(db, auth, publication);
		await publishExternalLocalAudit(db, auth, publication);

		// The first hosted AVLI lock predates Place ID storage and has only its immutable CID.
		await owner.query("update sv_configuration_locks set snapshot=$1", [
			JSON.stringify({ targetIdentity: { cid: "1" } }),
		]);
		await assert.rejects(publishExternalLocalAudit(db, auth, publication));
		await owner.query(
			await readFile(resolve("packages/lib/src/db/migrations/0075_local_external_legacy_identity.sql"), "utf8"),
		);
		await publishExternalLocalAudit(db, auth, publication);
		for (const targetIdentity of [{ cid: "other" }, { cid: "1", placeId: "conflicting" }, { placeId: "target" }, {}]) {
			await owner.query("update sv_configuration_locks set snapshot=$1", [JSON.stringify({ targetIdentity })]);
			await assert.rejects(publishExternalLocalAudit(db, auth, publication));
		}
		await owner.query("update sv_configuration_locks set snapshot=$1", [
			JSON.stringify({ targetIdentity: input.target }),
		]);
		await publishExternalLocalAudit(db, auth, publication);
		console.log("PASS legacy CID-only publication upgrade; wrong CID, conflicting Place ID and absent CID rejected");
		assert.equal((await owner.query("select count(*)::int n from sv_local_external_publications")).rows[0].n, 1);
		const visible = await readExternalLocalAudit(db, { ...auth, actorId: "viewer" }, pair[0].id);
		assert.equal(visible?.content.observationCount, 9);
		assert.equal(
			await readExternalLocalAudit(db, { tenantId: otherId, actorId: "other", authType: "session" }, pair[0].id),
			null,
		);
		await assert.rejects(
			readExternalLocalAudit(db, { ...auth, actorId: "nonmember" }, pair[0].id),
			/MEMBERSHIP_REQUIRED/,
		);
		assert.equal(pair.filter((r) => r.duplicate).length, 1);
		assert.equal((await owner.query("select count(*)::int n from sv_local_external_tasks")).rows[0].n, 9);
		await assert.rejects(importExternalLocalAudit(db, { ...auth, actorId: "viewer" }, input), /OPERATOR_REQUIRED/);
		await assert.rejects(importExternalLocalAudit(db, { ...auth, tenantId: otherId }, input), /AUTH_REQUIRED/);
		const changed = structuredClone(input);
		changed.batches[0].summarySha256 = `sha256:${"b".repeat(64)}`;
		await assert.rejects(importExternalLocalAudit(db, auth, changed));
		assert.equal((await owner.query("select count(*)::int n from sv_local_external_audits")).rows[0].n, 1);
		assert.equal((await owner.query("select count(*)::int n from sv_local_external_tasks")).rows[0].n, 9);
		const client = await app.connect();
		try {
			await client.query("begin");
			await client.query("select set_config('app.organization_id',$1,true)", [otherId]);
			assert.equal((await client.query("select * from sv_local_external_audits")).rows.length, 0);
			assert.equal((await client.query("select * from sv_local_external_tasks")).rows.length, 0);
			await client.query("rollback");
		} finally {
			client.release();
		}
		await assert.rejects(owner.query("delete from sv_local_external_audits"), /IMMUTABLE/);
		await assert.rejects(owner.query("truncate sv_local_external_tasks"), /IMMUTABLE|foreign key/);
		await owner.query(
			"create table sv_local_raw_evidence(id uuid,organization_id text,raw_response_body text,raw_deleted_at timestamptz,retention_expires_at timestamptz);grant select,update on sv_local_raw_evidence to selena_app",
		);
		const expiring = structuredClone(input);
		expiring.batches[0].auditId = "expiring-audit";
		const captured = new Date(Date.now() - 720 * 60 * 60 * 1000 + 5000);
		captured.setUTCMilliseconds(0);
		for (const row of expiring.batches[0].observations) {
			row.providerTaskId = `expiring-${row.providerTaskId}`;
			const raw = JSON.parse(row.rawBody);
			raw.tasks[0].id = row.providerTaskId;
			raw.tasks[0].result[0].datetime = captured.toISOString().replace("T", " ").replace(".000Z", " +00:00");
			row.sourceRecordedAt = new Date(captured.getTime() + 1000).toISOString();
			row.rawBody = JSON.stringify(raw);
			row.rawSha256 = `sha256:${createHash("sha256").update(row.rawBody).digest("hex")}`;
		}
		const expiringImport = await importExternalLocalAudit(db, auth, expiring);
		await publishExternalLocalAudit(db, auth, { auditId: expiringImport.id, reportVersionId: reportId });
		assert.equal(
			(
				await owner.query(
					"select count(*)::int n from sv_local_external_raw_evidence where audit_id=$1 and raw_body is not null",
					[expiringImport.id],
				)
			).rows[0].n,
			9,
		);
		await new Promise((resolve) => setTimeout(resolve, 5500));
		assert.equal(
			await withOrganizationTransaction(db, tenantId, (tx) =>
				cleanupExpiredLocalRawEvidenceInTransaction(tx, tenantId),
			),
			9,
		);
		assert.equal((await importExternalLocalAudit(db, auth, expiring)).duplicate, true);
		assert.equal(
			(await readExternalLocalAudit(db, { ...auth, actorId: "viewer" }, expiringImport.id))?.content.observationCount,
			9,
		);
		assert.equal(
			(
				await owner.query(
					"select count(*)::int n from sv_local_external_raw_evidence where audit_id=$1 and raw_body is null",
					[expiringImport.id],
				)
			).rows[0].n,
			9,
		);
		console.log(
			"PASS private raw bodies: denied runtime reads, exact hashes,30-day retention, expiry cleanup and replay without resurrection",
		);
		console.log(
			"PASS real PostgreSQL import, concurrent replay, conflicting package rollback, membership, tenant RLS, immutability; external provider calls=0",
		);
		const realDirectories = process.argv.slice(3);
		if (realDirectories.length) {
			const source = await loadLocalExternalAuditSources(realDirectories);
			const realInput = {
				organizationId: tenantId,
				target: { cid: "1418632173084409489", placeId: "ChIJ0wOlGBpF0i0Rkf6i93H-rxM" },
				language: "en",
				...source,
			};
			const imported = await importExternalLocalAudit(db, auth, realInput);
			const stats = (
				await owner.query(
					"select count(*)::int rows,sum(octet_length(raw_body))::text bytes from sv_local_external_raw_evidence where audit_id=$1",
					[imported.id],
				)
			).rows[0];
			assert.equal(stats.rows, 126);
			assert.equal((await importExternalLocalAudit(db, auth, realInput)).duplicate, true);
			console.log(
				JSON.stringify({
					proof: "AVLI126_NATIVE_PRIVATE_IMPORT",
					rows: stats.rows,
					bytes: stats.bytes,
					contentSha256: imported.contentSha256,
					externalProviderCalls: 0,
				}),
			);
		}
	} finally {
		await app.end();
		await owner.end();
	}
}
main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : "LOCAL_EXTERNAL_PROOF_FAILED");
	process.exitCode = 1;
});
