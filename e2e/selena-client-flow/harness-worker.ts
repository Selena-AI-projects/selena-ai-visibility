/**
 * The production `selena-measure` handler with the inert stub adapter
 * registered in code. It exists only for the client-flow acceptance run: it
 * lives outside every deployed package, refuses any database that is not on
 * this machine, and consumes nothing but `selena-measure`.
 *
 * Permits of a workspace whose name contains HARNESS_FAIL_MARKER fail as a
 * provider timeout would, so the run can drive a measurement QC must reject.
 */
import { db } from "@workspace/lib/db/db";
import { runtimeDatabaseConnection } from "@workspace/lib/db/postgres-config";
import { createSelenaMeasurementResolvers } from "@workspace/lib/selena-extraction-context";
import { SLOW_COLLECTOR_QUEUE_LEASE_SECONDS } from "@workspace/lib/selena-measurement";
import pg from "pg";
import { PgBoss } from "pg-boss";
import { createSelenaMeasureJob, type SelenaMeasureData } from "../../apps/worker/src/jobs/selena-measure";
import { createStubMeasurementAdapter } from "../../packages/lib/src/adapters/stub-measurement-adapter";

const databaseHost = new URL(process.env.DATABASE_URL ?? "postgres://unset").hostname;
if (!["127.0.0.1", "localhost"].includes(databaseHost)) throw new Error("HARNESS_LOCAL_DATABASE_ONLY");
if (process.env.SELENA_MEASUREMENT_ADAPTER !== "stub") throw new Error("HARNESS_EXPECTS_STUB_ADAPTER");

const failMarker = process.env.HARNESS_FAIL_MARKER?.trim() || "harness-fail";
const resolvers = createSelenaMeasurementResolvers(db);
const stub = createStubMeasurementAdapter({
	channel: "visitor_view",
	resolveExtractionContext: resolvers.resolveExtractionContext,
});

const names = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function workspaceName(organizationId: string): Promise<string> {
	const result = await names.query<{ name: string }>("select name from organization where id = $1", [organizationId]);
	return result.rows[0]?.name ?? "";
}

const boss = new PgBoss({ ...runtimeDatabaseConnection(), schema: "pgboss", schedule: false });
const handler = createSelenaMeasureJob({
	stub: {
		...stub,
		async execute(permit) {
			if ((await workspaceName(permit.organizationId)).includes(failMarker))
				throw new Error("HARNESS_PROVIDER_TIMEOUT");
			return stub.execute(permit);
		},
	},
});

await boss.start();
await boss.createQueue("selena-measure", { retryLimit: 0, expireInSeconds: SLOW_COLLECTOR_QUEUE_LEASE_SECONDS });
await boss.work<SelenaMeasureData>("selena-measure", { localConcurrency: 1 }, handler);
console.log("harness worker: consuming selena-measure with the stub adapter");

for (const signal of ["SIGINT", "SIGTERM"] as const)
	process.on(signal, () => {
		boss.stop({ graceful: true, timeout: 5000 }).finally(() => process.exit(0));
	});
