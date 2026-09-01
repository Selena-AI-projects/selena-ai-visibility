import type { PgBoss } from "pg-boss";

const MAINTENANCE_QUEUE = "schedule-maintenance";
const ANSWER_RETENTION_QUEUE = "selena-answer-retention";
const AUTH0_SYNC_QUEUE = "sync-auth0-memberships";
const MANAGED_SCHEDULES = [MAINTENANCE_QUEUE, ANSWER_RETENTION_QUEUE, AUTH0_SYNC_QUEUE] as const;

export interface RecurringScheduleOptions {
	recurringEnabled: string | undefined;
	legacyProviderExecutionEnabled: boolean;
	maintenanceEnabled: boolean;
	answerRetentionEnabled: string | undefined;
	deploymentMode: string | undefined;
	ownerManaged: boolean;
}

type Scheduler = Pick<PgBoss, "schedule" | "unschedule" | "getSchedules">;

export function isRecurringJobsEnabled(value: string | undefined): boolean {
	return value === "true";
}

async function removeManagedSchedules(scheduler: Scheduler): Promise<void> {
	for (const name of MANAGED_SCHEDULES) await scheduler.unschedule(name);
}

async function assertNoUnknownSchedules(scheduler: Scheduler): Promise<void> {
	const schedules = await scheduler.getSchedules();
	const managed = new Set<string>(MANAGED_SCHEDULES);
	const unknown = [
		...new Set(
			schedules.flatMap(({ name, key }) => {
				if (!managed.has(name)) return [name];
				if (key !== "") return [`${name}:NON_DEFAULT_KEY`];
				return [];
			}),
		),
	].sort();
	if (unknown.length > 0) throw new Error(`PGBOSS_UNKNOWN_RECURRING_SCHEDULES:${unknown.join(",")}`);
}

async function reconcileRecurringSchedules(scheduler: Scheduler, options: RecurringScheduleOptions): Promise<boolean> {
	const recurringRequested = isRecurringJobsEnabled(options.recurringEnabled);

	if (!recurringRequested) {
		await removeManagedSchedules(scheduler);
		await assertNoUnknownSchedules(scheduler);
		return false;
	}
	if (options.ownerManaged) {
		await removeManagedSchedules(scheduler);
		await assertNoUnknownSchedules(scheduler);
		throw new Error("PGBOSS_RECURRING_OWNER_PRIVILEGE_GATE_UNAVAILABLE");
	}

	await assertNoUnknownSchedules(scheduler);
	const maintenanceEnabled = options.legacyProviderExecutionEnabled && options.maintenanceEnabled;
	const answerRetentionEnabled = options.answerRetentionEnabled === "true";
	const auth0SyncEnabled = options.deploymentMode === "whitelabel";

	if (maintenanceEnabled) {
		await scheduler.schedule(MAINTENANCE_QUEUE, "*/5 * * * *", { source: "scheduled" }, { tz: "UTC" });
	} else {
		await scheduler.unschedule(MAINTENANCE_QUEUE);
	}

	if (answerRetentionEnabled) {
		await scheduler.schedule(ANSWER_RETENTION_QUEUE, "30 3 * * *", { source: "scheduled" }, { tz: "UTC" });
	} else {
		await scheduler.unschedule(ANSWER_RETENTION_QUEUE);
	}

	if (auth0SyncEnabled) {
		await scheduler.schedule(AUTH0_SYNC_QUEUE, "*/15 * * * *", { source: "scheduled" }, { tz: "UTC" });
	} else {
		await scheduler.unschedule(AUTH0_SYNC_QUEUE);
	}

	return true;
}

/** Reconcile every managed schedule before a Timekeeper-capable client starts. */
export async function reconcileAndStartRecurringSchedules<T>(
	scheduler: Scheduler,
	options: RecurringScheduleOptions,
	startTimekeeper: () => Promise<T>,
): Promise<T | undefined> {
	const recurringEnabled = await reconcileRecurringSchedules(scheduler, options);
	if (!recurringEnabled) return undefined;
	return startTimekeeper();
}
