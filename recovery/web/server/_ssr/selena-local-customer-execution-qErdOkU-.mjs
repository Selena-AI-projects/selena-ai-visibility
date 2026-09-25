import { D as number, M as string, O as object, T as literal, f as array, j as strictObject, p as boolean } from "../_libs/zod.mjs";
import { D as canonicalLocalMapsJson } from "./src-BdeAuGX5.mjs";
import { L as sql } from "../_libs/drizzle-orm.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
import { createHash } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-local-customer-execution-qErdOkU-.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "99eb6ffe-3447-4096-acf1-fa720bd34147", e._sentryDebugIdIdentifier = "sentry-dbid-99eb6ffe-3447-4096-acf1-fa720bd34147");
	} catch (e) {}
})();
async function startLocalCustomerTestRun(db, auth, input) {
	if (auth.authType !== "session") throw new Error("LOCAL_ORDER_SESSION_REQUIRED");
	const { orderId, snapshotSha256, retry } = strictObject({
		orderId: string().uuid(),
		snapshotSha256: string().regex(/^sha256:[a-f0-9]{64}$/),
		retry: boolean().default(false)
	}).parse(input);
	return withOrganizationTransaction(db, auth.tenantId, async (tx) => {
		await tx.execute(sql`select set_config('app.user_id',${auth.actorId},true)`);
		if (!(await tx.execute(sql`select 1 from member where organization_id=${auth.tenantId} and user_id=${auth.actorId} and role in ('owner','admin') for share`)).rows.length) throw new Error("LOCAL_ORDER_MEMBER_REQUIRED");
		const orders = await tx.execute(sql`select l.snapshot,o.status from sv_orders o join sv_configuration_locks l on l.id=o.lock_id and l.organization_id=o.organization_id
		 where o.id=${orderId} and o.organization_id=${auth.tenantId} for update of o`);
		if (!orders.rows[0]) throw new Error("LOCAL_ORDER_NOT_FOUND");
		const canonical = canonicalLocalMapsJson(orders.rows[0].snapshot);
		if (`sha256:${createHash("sha256").update(canonical).digest("hex")}` !== snapshotSha256) throw new Error("LOCAL_ORDER_SNAPSHOT_MISMATCH");
		const spec = object({
			domainId: literal("LOCAL_MAPS_ORDER"),
			paymentMode: literal("TEST"),
			expectedSlots: number().int().min(9).max(375),
			providerPolicy: object({ mode: literal("FIXTURE") })
		}).parse(orders.rows[0].snapshot);
		const prior = await tx.execute(sql`select status from sv_local_customer_runs where order_id=${orderId} and organization_id=${auth.tenantId}`);
		if (prior.rows[0]) {
			if (prior.rows[0].status === "FAILED" && retry) {
				await tx.execute(sql`select sv_resume_local_customer_fixture_run(${orderId}::uuid)`);
				return {
					orderId,
					status: "QUEUED",
					duplicate: true
				};
			}
			return {
				orderId,
				status: prior.rows[0].status,
				duplicate: true
			};
		}
		if (orders.rows[0].status !== "PAID_REVIEW_REQUIRED") throw new Error("LOCAL_CUSTOMER_PAYMENT_STATE_CONFLICT");
		await tx.execute(sql`insert into sv_local_customer_runs(order_id,organization_id,actor_id,snapshot_canonical,snapshot_sha256,expected_slots)
		 values(${orderId},${auth.tenantId},${auth.actorId},${canonical},${snapshotSha256},${spec.expectedSlots})`);
		await tx.execute(sql`update sv_orders set status='QUEUED',updated_at=now() where id=${orderId} and organization_id=${auth.tenantId}`);
		return {
			orderId,
			status: "QUEUED",
			duplicate: false
		};
	});
}
async function readLocalCustomerExecution(tx, tenantId, orderId) {
	const run = await tx.execute(sql`select r.status,r.failure_count as failures,r.expected_slots as expected,count(t.*) filter(where t.status='DONE')::int as completed
	 from sv_local_customer_runs r left join sv_local_customer_tasks t on t.order_id=r.order_id and t.organization_id=r.organization_id
	 where r.order_id=${orderId} and r.organization_id=${tenantId} group by r.order_id`);
	if (!run.rows[0]) return null;
	const tasks = await tx.execute(sql`select query_index as "queryIndex",point_index as "pointIndex",keyword,status,result_json as result
	 from sv_local_customer_tasks where order_id=${orderId} and organization_id=${tenantId} order by query_index,point_index`);
	return {
		...run.rows[0],
		source: "FIXTURE_NOT_GOOGLE",
		tasks: tasks.rows
	};
}
function localCustomerFixtureCsv(value) {
	const run = object({ execution: object({
		status: literal("READY"),
		source: literal("FIXTURE_NOT_GOOGLE"),
		expected: number().int(),
		completed: number().int(),
		tasks: array(object({
			keyword: string(),
			pointIndex: number().int(),
			status: literal("DONE"),
			result: object({
				source: literal("FIXTURE_NOT_GOOGLE"),
				outcome: string(),
				targetRank: number().nullable(),
				generatedAt: string(),
				latitude: number(),
				longitude: number()
			})
		}))
	}) }).parse(value).execution;
	if (run.expected !== run.completed || run.tasks.length !== run.expected) throw new Error("LOCAL_CUSTOMER_REPORT_STATE_CONFLICT");
	const cell = (value) => {
		let text = value == null ? "" : String(value);
		if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
		return `"${text.replaceAll("\"", "\"\"")}"`;
	};
	const rows = [[
		"Source",
		"Query",
		"Point",
		"Latitude",
		"Longitude",
		"Outcome",
		"Test position",
		"Generated at"
	]];
	for (const task of run.tasks) rows.push([
		run.source,
		task.keyword,
		task.pointIndex + 1,
		task.result.latitude,
		task.result.longitude,
		task.result.outcome,
		task.result.targetRank,
		task.result.generatedAt
	]);
	return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
//#endregion
export { localCustomerFixtureCsv, readLocalCustomerExecution, startLocalCustomerTestRun };

//# sourceMappingURL=selena-local-customer-execution-qErdOkU-.mjs.map