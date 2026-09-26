import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { checkLocalRawRetentionInTransaction } from "@workspace/lib/selena-local-raw-retention";

async function main() {
	if (process.env.SELENA_LOCAL_RAW_RETENTION_OWNER_APPROVED !== "true") return;
	const organizationId = process.env.SELENA_LOCAL_RAW_RETENTION_ORGANIZATION_ID?.trim();
	if (!organizationId) throw new Error("LOCAL_RAW_RETENTION_ORGANIZATION_REQUIRED");
	const status = await withOrganizationTransaction(db, organizationId, (tx) =>
		checkLocalRawRetentionInTransaction(tx, organizationId),
	);
	if (!status.healthy) throw new Error("LOCAL_RAW_RETENTION_STALE_OR_OVERDUE");
}
void main()
	.then(() => process.exit(0))
	.catch(() => {
		console.error("Local retention health failed");
		process.exit(1);
	});
