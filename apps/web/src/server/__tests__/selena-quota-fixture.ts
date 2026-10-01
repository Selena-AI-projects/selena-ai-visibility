import type { OrganizationDatabase } from "@workspace/lib/db/organization-transaction";
import { svConfigurationLocks, svCycles, svOrders, svProjects, svQuotes, svRunPermits } from "@workspace/lib/db/schema";
import { createSelenaRepositories, type SelenaRepositoryContext } from "@workspace/lib/selena-visibility-repositories";
import { SELENA_CATALOG, type SelenaPlanId } from "@workspace/selena-visibility-contracts";
import { eq, sql } from "drizzle-orm";

/**
 * Synthetic measurement state for a real Postgres: a project on a plan, paid
 * orders with or without cycles, and runs finished through the same run store
 * the worker uses. Nothing here calls a provider. Nothing is cleaned up
 * either: locks and the cost ledger are immutable by trigger, so each run
 * writes under an organization of its own and leaves it there.
 */

export type QuotaFixture = {
	db: OrganizationDatabase;
	organizationId: string;
	actorId: string;
	projectId: string;
	planId: SelenaPlanId;
};

export function fixtureContext(fixture: QuotaFixture): SelenaRepositoryContext {
	return {
		actorId: fixture.actorId,
		tenantId: fixture.organizationId,
		role: "owner",
		authType: "session",
		permissions: ["client:write"],
	};
}

export async function ensureOrganization(db: OrganizationDatabase, id: string): Promise<void> {
	await db.execute(
		sql`insert into organization (id, name, slug, created_at) values (${id}, ${id}, ${id}, now()) on conflict (id) do nothing`,
	);
}

export async function seedQuotaProject(
	db: OrganizationDatabase,
	input: { organizationId: string; actorId: string; name: string; planId: SelenaPlanId },
): Promise<QuotaFixture> {
	const [project] = await db
		.insert(svProjects)
		.values({
			organizationId: input.organizationId,
			name: input.name,
			category: "restaurant",
			country: "ID",
			languages: ["en"],
			status: "ACTIVE",
		})
		.returning({ id: svProjects.id });
	if (!project) throw new Error("fixture: project insert returned nothing");
	return {
		db,
		organizationId: input.organizationId,
		actorId: input.actorId,
		projectId: project.id,
		planId: input.planId,
	};
}

let lockVersion = 0;

/** A configuration lock, its quote and a paid order, as the order desk leaves them. */
export async function seedOrder(
	fixture: QuotaFixture,
	input: {
		expectedRuns: number;
		orderStatus: (typeof svOrders.$inferInsert)["status"];
		createdAt?: Date;
	},
): Promise<{ lockId: string; quoteId: string; orderId: string }> {
	const plan = SELENA_CATALOG[fixture.planId];
	lockVersion += 1;
	const [lock] = await fixture.db
		.insert(svConfigurationLocks)
		.values({
			organizationId: fixture.organizationId,
			projectId: fixture.projectId,
			version: lockVersion,
			snapshot: { planId: fixture.planId, catalogVersion: "fixture" },
			engineSha: "fixture",
			expectedRuns: input.expectedRuns,
			budgetCap: String(plan.providerBudgetCap),
			createdBy: fixture.actorId,
		})
		.returning({ id: svConfigurationLocks.id });
	if (!lock) throw new Error("fixture: lock insert returned nothing");
	const [quote] = await fixture.db
		.insert(svQuotes)
		.values({
			organizationId: fixture.organizationId,
			projectId: fixture.projectId,
			lockId: lock.id,
			status: "ACCEPTED",
			priceAmount: String(plan.price),
			currency: plan.currency,
			expectedRuns: input.expectedRuns,
			expiresAt: new Date(Date.now() + 7 * 86_400_000),
		})
		.returning({ id: svQuotes.id });
	if (!quote) throw new Error("fixture: quote insert returned nothing");
	const [order] = await fixture.db
		.insert(svOrders)
		.values({
			organizationId: fixture.organizationId,
			projectId: fixture.projectId,
			quoteId: quote.id,
			lockId: lock.id,
			status: input.orderStatus,
			orderCap: String(plan.providerBudgetCap),
			paidAt: new Date(),
			...(input.createdAt ? { createdAt: input.createdAt, updatedAt: input.createdAt } : {}),
		})
		.returning({ id: svOrders.id });
	if (!order) throw new Error("fixture: order insert returned nothing");
	return { lockId: lock.id, quoteId: quote.id, orderId: order.id };
}

/** A queued cycle with one issued permit per expected run. */
export async function seedCycle(
	fixture: QuotaFixture,
	input: { orderId: string; lockId: string; expectedRuns: number; createdAt?: Date; keyPrefix: string },
): Promise<{ cycleId: string; permitIds: string[] }> {
	const [cycle] = await fixture.db
		.insert(svCycles)
		.values({
			organizationId: fixture.organizationId,
			orderId: input.orderId,
			lockId: input.lockId,
			status: "QUEUED",
			expectedRuns: input.expectedRuns,
			createdRuns: input.expectedRuns,
			...(input.createdAt ? { createdAt: input.createdAt, updatedAt: input.createdAt } : {}),
		})
		.returning({ id: svCycles.id });
	if (!cycle) throw new Error("fixture: cycle insert returned nothing");
	const systems = SELENA_CATALOG[fixture.planId].systems;
	const permits = await fixture.db
		.insert(svRunPermits)
		.values(
			Array.from({ length: input.expectedRuns }, (_, index) => ({
				organizationId: fixture.organizationId,
				cycleId: cycle.id,
				dispatchKey: `${input.keyPrefix}:${index}`,
				channel: "api_view",
				scenarioId: `scenario-${index % 3}`,
				systemId: systems[index % systems.length] ?? "ChatGPT",
				expiresAt: new Date(Date.now() + 86_400_000),
			})),
		)
		.returning({ id: svRunPermits.id });
	return { cycleId: cycle.id, permitIds: permits.map((permit) => permit.id) };
}

/**
 * Runs the permit through the real store: claim, then complete with either a
 * usable answer or a provider failure. Returns the run id so a redelivery can
 * complete it again.
 */
export async function finishPermit(
	fixture: QuotaFixture,
	permitId: string,
	outcome: "SUCCEEDED" | "FAILED",
): Promise<string> {
	const repositories = createSelenaRepositories(fixture.db);
	const ctx = fixtureContext(fixture);
	const { permit, run } = await repositories.runs.claim(ctx, permitId);
	await repositories.runs.complete(ctx, run.id, runOutcome(permit.dispatchKey, permit.systemId, outcome));
	return run.id;
}

export function runOutcome(dispatchKey: string, systemId: string | null, outcome: "SUCCEEDED" | "FAILED") {
	const cost = { costUsd: 0.0015, costBasis: "estimated" as const, provider: "stub" };
	if (outcome === "FAILED")
		return {
			dispatchKey,
			status: "FAILED" as const,
			validity: "INVALID" as const,
			invalidReason: "SYNTHETIC_PROVIDER_ERROR",
			...cost,
		};
	return {
		dispatchKey,
		status: "SUCCEEDED" as const,
		validity: "VALID" as const,
		...cost,
		measurement: {
			system: systemId ?? "ChatGPT",
			language: "en",
			extractorVersion: "fixture",
			captureMode: "unknown" as const,
			brand: "Fixture Brand",
			mention: true,
			position: 1,
			ownedCitation: false,
			citations: [],
			competitors: [{ name: "Rival", position: 2 }],
			factualErrors: [],
		},
	};
}

export async function setCycleStatus(
	fixture: QuotaFixture,
	cycleId: string,
	status: (typeof svCycles.$inferInsert)["status"],
): Promise<void> {
	await fixture.db.update(svCycles).set({ status, updatedAt: new Date() }).where(eq(svCycles.id, cycleId));
}

export async function setOrderStatus(
	fixture: QuotaFixture,
	orderId: string,
	status: (typeof svOrders.$inferInsert)["status"],
): Promise<void> {
	await fixture.db.update(svOrders).set({ status, updatedAt: new Date() }).where(eq(svOrders.id, orderId));
}
