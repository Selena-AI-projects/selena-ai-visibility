import { createHash } from "node:crypto";
import { canonicalLocalMapsJson } from "@workspace/selena-visibility-contracts";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
	type OrganizationDatabase,
	type OrganizationTransaction,
	withOrganizationTransaction,
} from "./db/organization-transaction";

export async function startLocalCustomerTestRun(
	db: OrganizationDatabase,
	auth: { tenantId: string; actorId: string; authType: "session" },
	input: { orderId: string; snapshotSha256: string; retry?: boolean },
) {
	if (auth.authType !== "session") throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
	const { orderId, snapshotSha256, retry } = z
		.strictObject({
			orderId: z.string().uuid(),
			snapshotSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
			retry: z.boolean().default(false),
		})
		.parse(input);
	return withOrganizationTransaction(db, auth.tenantId, async (tx) => {
		await tx.execute(sql`select set_config('app.user_id',${auth.actorId},true)`);
		const member = await tx.execute(
			sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId} and role in ('owner','admin') for share`,
		);
		if (!member.rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
		const orders = await tx.execute<{
			snapshot: unknown;
			status: string;
		}>(sql`select l.snapshot,o.status from sv_orders o join sv_configuration_locks l on l.id=o.lock_id and l.organization_id=o.organization_id
		 where o.id=${orderId} and o.organization_id=${auth.tenantId} for update of o`);
		if (!orders.rows[0]) throw new Error("LOCAL_ORDER_NOT_FOUND");
		const canonical = canonicalLocalMapsJson(orders.rows[0].snapshot);
		if (`sha256:${createHash("sha256").update(canonical).digest("hex")}` !== snapshotSha256)
			throw new Error("LOCAL_ORDER_SNAPSHOT_MISMATCH");
		const spec = z
			.object({
				domainId: z.literal("LOCAL_MAPS_ORDER"),
				paymentMode: z.literal("TEST"),
				expectedSlots: z.number().int().min(9).max(375),
				providerPolicy: z.object({ mode: z.literal("FIXTURE") }),
			})
			.parse(orders.rows[0].snapshot);
		const prior = await tx.execute<{ status: string }>(
			sql`select status from sv_local_customer_runs where order_id=${orderId} and organization_id=${auth.tenantId}`,
		);
		if (prior.rows[0]) {
			if (prior.rows[0].status === "FAILED" && retry) {
				await tx.execute(sql`select sv_resume_local_customer_fixture_run(${orderId}::uuid)`);
				return { orderId, status: "QUEUED", duplicate: true };
			}
			return { orderId, status: prior.rows[0].status, duplicate: true };
		}
		if (orders.rows[0].status !== "PAID_REVIEW_REQUIRED") throw new Error("LOCAL_CUSTOMER_PAYMENT_STATE_CONFLICT");
		await tx.execute(sql`insert into sv_local_customer_runs(order_id,organization_id,actor_id,snapshot_canonical,snapshot_sha256,expected_slots)
		 values(${orderId},${auth.tenantId},${auth.actorId},${canonical},${snapshotSha256},${spec.expectedSlots})`);
		await tx.execute(
			sql`update sv_orders set status='QUEUED',updated_at=now() where id=${orderId} and organization_id=${auth.tenantId}`,
		);
		return { orderId, status: "QUEUED", duplicate: false };
	});
}

export async function readLocalCustomerExecution(tx: OrganizationTransaction, tenantId: string, orderId: string) {
	const run = await tx.execute<{
		status: string;
		failures: number;
		expected: number;
		completed: number;
	}>(sql`select r.status,r.failure_count as failures,r.expected_slots as expected,count(t.*) filter(where t.status='DONE')::int as completed
	 from sv_local_customer_runs r left join sv_local_customer_tasks t on t.order_id=r.order_id and t.organization_id=r.organization_id
	 where r.order_id=${orderId} and r.organization_id=${tenantId} group by r.order_id`);
	if (!run.rows[0]) return null;
	const tasks = await tx.execute<{
		queryIndex: number;
		pointIndex: number;
		keyword: string;
		status: string;
		result: Record<string, unknown> | null;
	}>(sql`select query_index as "queryIndex",point_index as "pointIndex",keyword,status,result_json as result
	 from sv_local_customer_tasks where order_id=${orderId} and organization_id=${tenantId} order by query_index,point_index`);
	return { ...run.rows[0], source: "FIXTURE_NOT_GOOGLE" as const, tasks: tasks.rows };
}

export async function processLocalCustomerFixtureQuery(db: OrganizationDatabase): Promise<number> {
	const result = await db.execute<{ processed: number }>(
		sql`select sv_process_local_customer_fixture_query() as processed`,
	);
	return result.rows[0].processed;
}

export function localCustomerFixtureCsv(value: unknown): string {
	const report = z
		.object({
			execution: z.object({
				status: z.literal("READY"),
				source: z.literal("FIXTURE_NOT_GOOGLE"),
				expected: z.number().int(),
				completed: z.number().int(),
				tasks: z.array(
					z.object({
						keyword: z.string(),
						pointIndex: z.number().int(),
						status: z.literal("DONE"),
						result: z.object({
							source: z.literal("FIXTURE_NOT_GOOGLE"),
							outcome: z.string(),
							targetRank: z.number().nullable(),
							generatedAt: z.string(),
							latitude: z.number(),
							longitude: z.number(),
						}),
					}),
				),
			}),
		})
		.parse(value);
	const run = report.execution;
	if (run.expected !== run.completed || run.tasks.length !== run.expected)
		throw new Error("LOCAL_CUSTOMER_REPORT_STATE_CONFLICT");
	const cell = (value: unknown) => {
		let text = value == null ? "" : String(value);
		if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
		return `"${text.replaceAll('"', '""')}"`;
	};
	const rows: unknown[][] = [
		["Source", "Query", "Point", "Latitude", "Longitude", "Outcome", "Test position", "Generated at"],
	];
	for (const task of run.tasks)
		rows.push([
			run.source,
			task.keyword,
			task.pointIndex + 1,
			task.result.latitude,
			task.result.longitude,
			task.result.outcome,
			task.result.targetRank,
			task.result.generatedAt,
		]);
	return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
