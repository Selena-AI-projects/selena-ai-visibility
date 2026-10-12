import { and, asc, eq, sql } from "drizzle-orm";
import { type OrganizationDatabase, withOrganizationTransaction } from "./db/organization-transaction";
import * as schema from "./db/schema";
import {
	localPilotBodyHash,
	materializeLocalPilotInTransaction,
	reviewLocalCanaryInTransaction,
	validateLocalPilotLock,
	withLocalPilotMutation,
} from "./selena-local-pilot-orchestrator";

const MICROS = BigInt(1_000_000);

function usdMicros(value: string): bigint {
	if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value)) throw new Error("LOCAL_PILOT_SPEND_CAP_INVALID");
	const [whole, fraction = ""] = value.split(".");
	return BigInt(whole) * MICROS + BigInt(fraction.padEnd(6, "0"));
}

export type LocalCanaryReview = {
	canaryCycleId: string;
	reviewId: string;
	decision: "ACCEPTED" | "REJECTED";
	attemptId: string;
	evidenceId: string;
	pilotCycleId: string | null;
};

/**
 * The owner's decision on one canary of this lock, recorded through the same
 * orchestrator step the operator route uses. The attempt and its canary-only
 * evidence are the single measured center point of that canary, so the owner
 * names the cycle and the decision, never an id that could point elsewhere.
 * An accepted canary creates its PILOT cycle in CREATED; a second acceptance
 * is refused rather than creating a second pilot.
 */
export async function reviewLocalMapsCanary(input: {
	db: OrganizationDatabase;
	organizationId: string;
	actorId: string;
	configurationLockId: string;
	canaryCycleId: string;
	decision: "ACCEPTED" | "REJECTED";
}): Promise<LocalCanaryReview> {
	const identity = {
		tenantId: input.organizationId,
		operation: "canary-review",
		resourceId: input.canaryCycleId,
		idempotencyKey: `local-maps-owner-canary-review:${input.canaryCycleId}`,
		bodyHash: localPilotBodyHash({
			organizationId: input.organizationId,
			configurationLockId: input.configurationLockId,
			canaryCycleId: input.canaryCycleId,
			decision: input.decision,
		}),
	};
	return withLocalPilotMutation<LocalCanaryReview>({
		db: input.db,
		identity,
		actorId: input.actorId,
		work: async (tx) => {
			const org = input.organizationId;
			const [canary] = await tx
				.select()
				.from(schema.svLocalScanCycles)
				.where(
					and(eq(schema.svLocalScanCycles.organizationId, org), eq(schema.svLocalScanCycles.id, input.canaryCycleId)),
				)
				.limit(1);
			if (canary?.executionMode !== "CANARY" || canary.configurationLockId !== input.configurationLockId)
				throw new Error("LOCAL_CANARY_REVIEW_STATE_INVALID");
			const [accepted] = await tx
				.select({ id: schema.svLocalCanaryReviews.id })
				.from(schema.svLocalCanaryReviews)
				.where(
					and(
						eq(schema.svLocalCanaryReviews.organizationId, org),
						eq(schema.svLocalCanaryReviews.localCycleId, canary.id),
						eq(schema.svLocalCanaryReviews.status, "ACCEPTED"),
					),
				)
				.limit(1);
			if (accepted) throw new Error("LOCAL_CANARY_ALREADY_ACCEPTED");
			const measured = await tx.execute(sql`
				select a.id as attempt_id, s.id as evidence_id
				from sv_measurement_attempts a
				join sv_grid_points p on p.id = a.point_id and p.organization_id = a.organization_id and p.point_index = 4
				join sv_source_snapshots s on s.organization_id = a.organization_id and s.source_ref = a.raw_ref
					and s.source_type = 'LOCAL_MAPS_CANARY_ONLY'
				where a.organization_id = ${org} and a.measurement_cycle_id = ${canary.measurementCycleId}
					and a.status = 'SUCCEEDED'`);
			const rows = measured.rows as Array<{ attempt_id: string; evidence_id: string }>;
			const [only] = rows;
			if (rows.length !== 1 || !only) throw new Error("LOCAL_CANARY_REVIEW_EVIDENCE_INVALID");
			const review = await reviewLocalCanaryInTransaction({
				tx,
				organizationId: org,
				cycleId: canary.id,
				actorId: input.actorId,
				attemptId: only.attempt_id,
				evidenceId: only.evidence_id,
				decision: input.decision,
			});
			return {
				canaryCycleId: canary.id,
				reviewId: review.reviewId,
				decision: input.decision,
				attemptId: only.attempt_id,
				evidenceId: only.evidence_id,
				pilotCycleId: ("pilotCycleId" in review ? review.pilotCycleId : undefined) ?? null,
			};
		},
	});
}

export function formatLocalCanaryReview(review: LocalCanaryReview): string[] {
	return [
		`canary-review: canary ${review.canaryCycleId} ${review.decision} (review ${review.reviewId}, attempt ${review.attemptId}, evidence ${review.evidenceId})`,
		review.pilotCycleId
			? `  SELENA_LOCAL_PILOT_CYCLE_ID=${review.pilotCycleId}`
			: "no pilot created: a rejected canary ends here",
	];
}

export type LocalPilotApproval = {
	operation: "pilot-approve";
	pilotCycleId: string;
	measurementCycleId: string;
	canaryCycleId: string;
	acceptedCanaryReviewId: string;
	configurationLockId: string;
	observations: number;
	attempts: number;
	outbox: number;
	worstCaseCostUsd: string;
	providerCalls: 0;
};

/**
 * Approves the one PILOT cycle an accepted canary created for this lock and
 * materializes its nine points, all in one tenant transaction. Anything else
 * — a canary, a pilot of another lock, a pilot already approved, rescheduled
 * or stopped, a pilot whose canary is no longer the accepted one under review
 * — is refused before a row changes. The provider is reached only later, by
 * the Local worker consuming the outbox rows this writes.
 */
export async function approveLocalPilot(input: {
	db: OrganizationDatabase;
	organizationId: string;
	actorId: string;
	configurationLockId: string;
	pilotCycleId: string;
	maxSpendUsd: string;
	env: Record<string, string | undefined>;
}): Promise<LocalPilotApproval> {
	const maxSpendMicros = usdMicros(input.maxSpendUsd);
	const identity = {
		tenantId: input.organizationId,
		operation: "pilot-approve",
		resourceId: input.pilotCycleId,
		idempotencyKey: `local-maps-pilot-approve:${input.pilotCycleId}`,
		bodyHash: localPilotBodyHash({
			organizationId: input.organizationId,
			configurationLockId: input.configurationLockId,
			pilotCycleId: input.pilotCycleId,
		}),
	};
	return withLocalPilotMutation<LocalPilotApproval>({
		db: input.db,
		identity,
		actorId: input.actorId,
		work: async (tx) => {
			const org = input.organizationId;
			const [pilot] = await tx
				.select()
				.from(schema.svLocalScanCycles)
				.where(
					and(eq(schema.svLocalScanCycles.organizationId, org), eq(schema.svLocalScanCycles.id, input.pilotCycleId)),
				)
				.for("update");
			if (
				pilot?.executionMode !== "PILOT" ||
				pilot.configurationLockId !== input.configurationLockId ||
				pilot.status !== "CREATED" ||
				pilot.createdObservations !== 0 ||
				pilot.emergencyStoppedAt ||
				!pilot.approvedCanaryReviewId
			)
				throw new Error("LOCAL_PILOT_APPROVAL_STATE_INVALID");
			const [review] = await tx
				.select()
				.from(schema.svLocalCanaryReviews)
				.where(
					and(
						eq(schema.svLocalCanaryReviews.organizationId, org),
						eq(schema.svLocalCanaryReviews.id, pilot.approvedCanaryReviewId),
					),
				)
				.limit(1);
			if (review?.status !== "ACCEPTED" || review.providerContractDigest !== pilot.providerContractDigest)
				throw new Error("LOCAL_ACCEPTED_CANARY_REQUIRED");
			const [canary] = await tx
				.select()
				.from(schema.svLocalScanCycles)
				.where(
					and(eq(schema.svLocalScanCycles.organizationId, org), eq(schema.svLocalScanCycles.id, review.localCycleId)),
				)
				.for("update");
			if (
				canary?.executionMode !== "CANARY" ||
				canary.status !== "CANARY_REVIEW" ||
				canary.emergencyStoppedAt ||
				canary.configurationLockId !== pilot.configurationLockId ||
				canary.gridDefinitionId !== pilot.gridDefinitionId ||
				canary.locationId !== pilot.locationId ||
				canary.providerContractDigest !== pilot.providerContractDigest
			)
				throw new Error("LOCAL_ACCEPTED_CANARY_REQUIRED");
			const [lockRow] = await tx
				.select({ snapshot: schema.svConfigurationLocks.snapshot })
				.from(schema.svConfigurationLocks)
				.where(
					and(
						eq(schema.svConfigurationLocks.organizationId, org),
						eq(schema.svConfigurationLocks.id, pilot.configurationLockId),
					),
				)
				.limit(1);
			const lock = validateLocalPilotLock(lockRow?.snapshot);
			// The owner approves the pilot's worst case — every retry of every
			// point — not just the nine first attempts it reserves now.
			if (usdMicros(lock.budget.worstCaseCostUsd) > maxSpendMicros)
				throw new Error("LOCAL_PILOT_LOCK_COST_EXCEEDS_APPROVED_MAXIMUM");

			await tx
				.update(schema.svLocalScanCycles)
				.set({ status: "APPROVED", updatedAt: new Date() })
				.where(and(eq(schema.svLocalScanCycles.organizationId, org), eq(schema.svLocalScanCycles.id, pilot.id)));
			const materialized = await materializeLocalPilotInTransaction({
				tx,
				organizationId: org,
				localCycleId: pilot.id,
				env: input.env,
			});
			const approval: LocalPilotApproval = {
				operation: "pilot-approve",
				pilotCycleId: pilot.id,
				measurementCycleId: pilot.measurementCycleId,
				canaryCycleId: canary.id,
				acceptedCanaryReviewId: review.id,
				configurationLockId: pilot.configurationLockId,
				...materialized,
				worstCaseCostUsd: lock.budget.worstCaseCostUsd,
				providerCalls: 0,
			};
			await tx.insert(schema.svAuditEvents).values({
				organizationId: org,
				actorId: input.actorId,
				event: "LOCAL_PILOT_APPROVED",
				subjectKind: "local_scan_cycle",
				subjectId: pilot.id,
				details: approval,
			});
			return approval;
		},
	});
}

export function formatLocalPilotApproval(approval: LocalPilotApproval): string[] {
	return [
		`pilot-approve: pilot ${approval.pilotCycleId} approved from canary ${approval.canaryCycleId} (review ${approval.acceptedCanaryReviewId})`,
		`queued ${approval.attempts} attempts over ${approval.observations} points; worst case $${approval.worstCaseCostUsd}; provider calls now 0`,
		`report: /app/selena-local-maps/${approval.pilotCycleId}`,
	];
}

export type LocalMapsLockStatus = {
	configurationLockId: string;
	cycles: Array<{
		cycleId: string;
		executionMode: string;
		status: string;
		createdObservations: number;
		emergencyStopped: boolean;
		createdAt: string;
		approvedCanaryReviewId: string | null;
		observations: Record<string, number>;
		ranks: Array<{ pointIndex: number; outcome: string; targetRank: number | null }>;
		attempts: Array<{
			attemptId: string;
			pointIndex: number | null;
			attemptIndex: number;
			status: string;
			spentCostUsd: string;
			evidenceId: string | null;
			event: string | null;
			targetRank: number | null;
		}>;
		reviews: Array<{ reviewId: string; status: string; createdAt: string }>;
	}>;
};

/**
 * Read-only: what happened to every cycle of one lock, with the ids an
 * operator needs for the canary review (the canary attempt and its
 * canary-only evidence). It reads through the owner connection because the
 * runtime role may not select the evidence's provenance columns.
 */
export async function readLocalMapsLockStatus(input: {
	db: OrganizationDatabase;
	organizationId: string;
	configurationLockId: string;
}): Promise<LocalMapsLockStatus> {
	return withOrganizationTransaction(input.db, input.organizationId, async (tx) => {
		await tx.execute(sql`SET TRANSACTION READ ONLY`);
		const org = input.organizationId;
		const cycles = await tx
			.select()
			.from(schema.svLocalScanCycles)
			.where(
				and(
					eq(schema.svLocalScanCycles.organizationId, org),
					eq(schema.svLocalScanCycles.configurationLockId, input.configurationLockId),
				),
			)
			.orderBy(asc(schema.svLocalScanCycles.createdAt));
		const result: LocalMapsLockStatus = { configurationLockId: input.configurationLockId, cycles: [] };
		for (const cycle of cycles) {
			const observations = await tx
				.select({
					outcome: schema.svLocalRankObservations.outcome,
					targetRank: schema.svLocalRankObservations.targetRank,
					pointIndex: schema.svGridPoints.pointIndex,
				})
				.from(schema.svLocalRankObservations)
				.innerJoin(schema.svGridPoints, eq(schema.svGridPoints.id, schema.svLocalRankObservations.gridPointId))
				.where(
					and(
						eq(schema.svLocalRankObservations.organizationId, org),
						eq(schema.svLocalRankObservations.cycleId, cycle.id),
					),
				)
				.orderBy(asc(schema.svGridPoints.pointIndex));
			const counts: Record<string, number> = {};
			for (const row of observations) counts[row.outcome] = (counts[row.outcome] ?? 0) + 1;
			const attempts = await tx.execute(sql`
				select a.id, p.point_index, a.attempt_index, a.status, a.spent_cost_usd::text as spent_cost_usd,
					s.id as evidence_id, s.snapshot #>> '{event,kind}' as event_kind, (s.snapshot ->> 'targetRank')::int as target_rank
				from sv_measurement_attempts a
				left join sv_grid_points p on p.id = a.point_id and p.organization_id = a.organization_id
				left join sv_source_snapshots s on s.organization_id = a.organization_id and s.source_ref = a.raw_ref
					and s.source_type in ('LOCAL_MAPS_CANARY_ONLY', 'LOCAL_MAPS_PROVIDER')
				where a.organization_id = ${org} and a.measurement_cycle_id = ${cycle.measurementCycleId}
				order by p.point_index, a.attempt_index`);
			const reviews = await tx
				.select({
					id: schema.svLocalCanaryReviews.id,
					status: schema.svLocalCanaryReviews.status,
					createdAt: schema.svLocalCanaryReviews.createdAt,
				})
				.from(schema.svLocalCanaryReviews)
				.where(
					and(
						eq(schema.svLocalCanaryReviews.organizationId, org),
						eq(schema.svLocalCanaryReviews.localCycleId, cycle.id),
					),
				)
				.orderBy(asc(schema.svLocalCanaryReviews.createdAt));
			result.cycles.push({
				cycleId: cycle.id,
				executionMode: cycle.executionMode,
				status: cycle.status,
				createdObservations: cycle.createdObservations,
				emergencyStopped: cycle.emergencyStoppedAt !== null,
				createdAt: cycle.createdAt.toISOString(),
				approvedCanaryReviewId: cycle.approvedCanaryReviewId,
				observations: counts,
				ranks: observations
					.filter((row) => row.outcome !== "BLOCKED")
					.map((row) => ({ pointIndex: row.pointIndex, outcome: row.outcome, targetRank: row.targetRank })),
				attempts: (attempts.rows as Array<Record<string, unknown>>).map((row) => ({
					attemptId: String(row.id),
					pointIndex: row.point_index === null ? null : Number(row.point_index),
					attemptIndex: Number(row.attempt_index),
					status: String(row.status),
					spentCostUsd: String(row.spent_cost_usd),
					evidenceId: row.evidence_id === null ? null : String(row.evidence_id),
					event: row.event_kind === null ? null : String(row.event_kind),
					targetRank: row.target_rank === null ? null : Number(row.target_rank),
				})),
				reviews: reviews.map((row) => ({
					reviewId: row.id,
					status: row.status,
					createdAt: row.createdAt.toISOString(),
				})),
			});
		}
		return result;
	});
}

export function formatLocalMapsLockStatus(status: LocalMapsLockStatus): string[] {
	const lines = [`local-maps-status: lock ${status.configurationLockId}, ${status.cycles.length} cycle(s)`];
	for (const cycle of status.cycles) {
		lines.push(
			`${cycle.executionMode} ${cycle.cycleId}: ${cycle.status}${cycle.emergencyStopped ? " (emergency stopped)" : ""}, observations ${JSON.stringify(cycle.observations)}`,
		);
		if (cycle.approvedCanaryReviewId) lines.push(`  from accepted canary review ${cycle.approvedCanaryReviewId}`);
		for (const attempt of cycle.attempts)
			lines.push(
				`  attempt ${attempt.attemptId} point ${attempt.pointIndex ?? "?"} #${attempt.attemptIndex}: ${attempt.status}, spent $${attempt.spentCostUsd}, ${attempt.event ?? "no result"}${attempt.targetRank === null ? "" : ` rank ${attempt.targetRank}`}${attempt.evidenceId ? `, evidenceId ${attempt.evidenceId}` : ""}`,
			);
		for (const review of cycle.reviews) lines.push(`  review ${review.reviewId}: ${review.status}`);
		if (cycle.executionMode === "PILOT")
			for (const rank of cycle.ranks)
				lines.push(
					`  point ${rank.pointIndex}: ${rank.outcome}${rank.targetRank === null ? "" : ` rank ${rank.targetRank}`}`,
				);
	}
	return lines;
}
