import { sql } from "drizzle-orm";
import { type OrganizationDatabase, withOrganizationTransaction } from "./db/organization-transaction";
import type { LocalAttemptQueueData } from "./selena-local-execution";

type Claim = { id: string; claimToken: string; data: LocalAttemptQueueData };

/** A dispatcher is bound to the explicitly approved pilot tenant, never all tenants. */
export function createLocalDispatchStore(db: OrganizationDatabase, organizationId: string, leaseMs: number) {
	if (!organizationId.trim() || !Number.isSafeInteger(leaseMs) || leaseMs <= 0)
		throw new Error("LOCAL_OUTBOX_SCOPE_REQUIRED");
	return {
		async claim(input: { token: string; limit: number }): Promise<Claim[]> {
			if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 9)
				throw new Error("LOCAL_OUTBOX_LIMIT_INVALID");
			return withOrganizationTransaction(db, organizationId, async (tx) => {
				await tx.execute(sql`update sv_local_dispatch_outbox set status='PENDING',claim_token=null,lease_expires_at=null
					where organization_id=${organizationId} and status='CLAIMED' and lease_expires_at<=now()`);
				const result = await tx.execute(sql`with pending as (
					select o.id from sv_local_dispatch_outbox o join sv_local_scan_cycles c on c.id=o.local_cycle_id and c.organization_id=o.organization_id
					where o.organization_id=${organizationId} and o.status='PENDING' and c.emergency_stopped_at is null
					and c.execution_mode in ('CANARY','PILOT') and c.status in ('QUEUED','RUNNING','CANARY_RUNNING')
					order by o.created_at,o.id for update of o skip locked limit ${input.limit}
				) update sv_local_dispatch_outbox o set status='CLAIMED',claim_token=${input.token}::uuid,lease_expires_at=now()+${leaseMs}*interval '1 millisecond'
				from pending where o.id=pending.id and o.organization_id=${organizationId}
				returning o.id,o.organization_id,o.measurement_cycle_id,o.local_cycle_id,o.observation_id,o.attempt_id`);
				return (result.rows as Array<Record<string, string>>).map((row) => ({
					id: row.id,
					claimToken: input.token,
					data: {
						organizationId: row.organization_id,
						measurementCycleId: row.measurement_cycle_id,
						localCycleId: row.local_cycle_id,
						observationId: row.observation_id,
						attemptId: row.attempt_id,
					},
				}));
			});
		},
		async canDispatch(claim: Claim): Promise<boolean> {
			if (claim.data.organizationId !== organizationId) return false;
			return withOrganizationTransaction(db, organizationId, async (tx) => {
				const result = await tx.execute(sql`select o.id from sv_local_dispatch_outbox o
				join sv_local_scan_cycles c on c.id=o.local_cycle_id and c.organization_id=o.organization_id
				join sv_measurement_attempts a on a.id=o.attempt_id and a.organization_id=o.organization_id
				where o.id=${claim.id}::uuid and o.organization_id=${organizationId} and o.claim_token=${claim.claimToken}::uuid
				and o.status='CLAIMED' and o.lease_expires_at>now() and c.emergency_stopped_at is null
				and c.status in ('QUEUED','RUNNING','CANARY_RUNNING') and a.status in ('CLAIMED','SUBMITTED')`);
				return result.rows.length === 1;
			});
		},
		async markEnqueued(claim: Claim): Promise<void> {
			if (claim.data.organizationId !== organizationId) throw new Error("LOCAL_OUTBOX_TENANT_MISMATCH");
			await withOrganizationTransaction(db, organizationId, async (tx) => {
				const result =
					await tx.execute(sql`update sv_local_dispatch_outbox set status='ENQUEUED',claim_token=null,lease_expires_at=null,enqueued_at=now()
				where id=${claim.id}::uuid and organization_id=${organizationId} and status='CLAIMED' and claim_token=${claim.claimToken}::uuid and lease_expires_at>now() returning id`);
				if (result.rows.length !== 1) throw new Error("LOCAL_OUTBOX_LEASE_LOST");
			});
		},
	};
}
