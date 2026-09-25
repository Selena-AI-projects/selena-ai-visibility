import { db } from "@workspace/lib/db/db";
import { processLocalCustomerFixtureQuery } from "@workspace/lib/selena-local-customer-execution";
import type { LocalOperatorAlertCode } from "./local-operator-alerts";

/** This worker advances only durable, paid TEST/FIXTURE orders; it has no provider adapter. */
export function startLocalCustomerFixtureScheduler(
	env: NodeJS.ProcessEnv = process.env,
	notify?: (code: LocalOperatorAlertCode) => Promise<void>,
) {
	if (
		env.SELENA_LOCAL_CUSTOMER_TEST_ENABLED !== "true" ||
		env.RAILWAY_ENVIRONMENT_ID !== "90f3bf7f-5e53-4de3-a3f7-56052b706f24"
	)
		return null;
	let stopped = false;
	let pending: Promise<void> | null = null;
	const tick = () => {
		if (stopped || pending) return;
		pending = processLocalCustomerFixtureQuery(db)
			.then(async (count) => {
				if (count > 0) console.log(`Local fixture query completed: ${count} points; external calls=0`);
				if (count < 0) {
					console.error("LOCAL_CUSTOMER_FIXTURE_QUERY_FAILED: run paused; retry remains bounded");
					await notify?.("FIXTURE_QUERY_FAILED").catch(() => console.error("LOCAL_OPERATOR_ALERT_ENQUEUE_FAILED"));
				}
			})
			.catch(async () => {
				stopped = true;
				clearInterval(timer);
				console.error(
					"LOCAL_CUSTOMER_FIXTURE_WORKER_PAUSED: database operation failed; inspect and restart after recovery",
				);
				await notify?.("FIXTURE_WORKER_PAUSED").catch(() => console.error("LOCAL_OPERATOR_ALERT_ENQUEUE_FAILED"));
			})
			.finally(() => {
				pending = null;
			});
	};
	const timer = setInterval(tick, 1000);
	tick();
	return async () => {
		stopped = true;
		clearInterval(timer);
		await pending;
	};
}
