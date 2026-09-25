import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { runtimeDatabaseConnection } from "@workspace/lib/db/postgres-config";
import * as schema from "@workspace/lib/db/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
	localBillingManifestDigest,
	localBillingManifestSchema,
	reconcileLocalPilotBilling,
} from "../../../packages/lib/src/selena-local-billing-reconciliation";

export function parseBillingArgs(args: string[]) {
	let manifestPath = "";
	let actorId = "";
	let approvedManifestSha256: string | undefined;
	let apply = false;
	for (let i = 0; i < args.length; i++) {
		const flag = args[i];
		if (flag === "--apply") {
			apply = true;
			continue;
		}
		if (!["--manifest", "--actor", "--approved-manifest-sha256"].includes(flag))
			throw new Error("LOCAL_BILLING_UNKNOWN_ARGUMENT");
		const value = args[++i];
		if (!value || value.startsWith("--")) throw new Error("LOCAL_BILLING_ARGUMENT_VALUE_REQUIRED");
		if (flag === "--manifest") manifestPath = value;
		if (flag === "--actor") actorId = value;
		if (flag === "--approved-manifest-sha256") approvedManifestSha256 = value;
	}
	if (!manifestPath.endsWith(".json") || !actorId.trim()) throw new Error("LOCAL_BILLING_MANIFEST_AND_ACTOR_REQUIRED");
	if (apply && !/^[a-f0-9]{64}$/.test(approvedManifestSha256 ?? ""))
		throw new Error("LOCAL_BILLING_MANIFEST_APPROVAL_REQUIRED");
	return { manifestPath, actorId, approvedManifestSha256, apply };
}

async function main() {
	if (process.argv.slice(2).join(" ") === "--help") {
		console.log(
			"Usage: reconcile-local-pilot-billing --manifest reviewed.json --actor USER_ID [--apply --approved-manifest-sha256 HASH]. Default: read-only preview. Requires the authorized staging project/environment and stopped Local execution controls. Database operator role must be able to read the nine spend reservations.",
		);
		return;
	}
	const args = parseBillingArgs(process.argv.slice(2));
	if (
		process.env.RAILWAY_PROJECT_ID !== "51dd0770-e622-4734-a705-ace401234bb8" ||
		process.env.RAILWAY_ENVIRONMENT_ID !== "90f3bf7f-5e53-4de3-a3f7-56052b706f24"
	)
		throw new Error("LOCAL_BILLING_STAGING_TARGET_REQUIRED");
	const manifest = localBillingManifestSchema.parse(JSON.parse(readFileSync(args.manifestPath, "utf8")));
	if (args.apply && localBillingManifestDigest(manifest) !== args.approvedManifestSha256)
		throw new Error("LOCAL_BILLING_MANIFEST_APPROVAL_REQUIRED");
	const pool = new pg.Pool({ ...runtimeDatabaseConnection(), max: 1 });
	try {
		const result = await reconcileLocalPilotBilling({
			db: drizzle(pool, { schema }),
			actorId: args.actorId,
			manifest,
			apply: args.apply,
			approvedManifestSha256: args.approvedManifestSha256,
			env: process.env,
		});
		console.log(JSON.stringify(result));
	} finally {
		await pool.end();
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	void main().catch((error: unknown) => {
		const code =
			error instanceof Error && /^LOCAL_[A-Z_]+$/.test(error.message)
				? error.message
				: "LOCAL_BILLING_RECONCILIATION_FAILED";
		console.error(JSON.stringify({ error: code }));
		process.exitCode = 1;
	});
}
