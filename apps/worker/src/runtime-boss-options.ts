import type { RuntimePgBossSchemaLifecycle } from "@workspace/lib/db/postgres-config";

export interface OwnerManagedPgBossRuntimeOptions {
	supervise?: false;
	persistQueueStats?: false;
	persistWarnings?: false;
}

export function isOwnerManagedPgBossRuntime(lifecycle: RuntimePgBossSchemaLifecycle): boolean {
	return lifecycle.createSchema === false && lifecycle.migrate === false;
}

/** Owner-managed runtime roles may process jobs but never run schema/maintenance ownership tasks. */
export function ownerManagedPgBossRuntimeOptions(
	lifecycle: RuntimePgBossSchemaLifecycle,
): OwnerManagedPgBossRuntimeOptions {
	if (!isOwnerManagedPgBossRuntime(lifecycle)) return {};
	return {
		supervise: false,
		persistQueueStats: false,
		persistWarnings: false,
	};
}
