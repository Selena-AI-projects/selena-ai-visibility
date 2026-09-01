import type { ChildProcess } from "node:child_process";

const MIGRATION_HARD_TIMEOUT_MS = 25 * 60 * 1000;
const MIGRATION_KILL_GRACE_MS = 5_000;

export async function waitForMigrationChild(
	child: ChildProcess,
	{ hardTimeoutMs = MIGRATION_HARD_TIMEOUT_MS, killGraceMs = MIGRATION_KILL_GRACE_MS } = {},
): Promise<Readonly<{ childCode: number; code: number; timedOut: boolean }>> {
	let timedOut = false;
	let forceKillTimeout: NodeJS.Timeout | undefined;
	const hardTimeout = setTimeout(() => {
		if (child.exitCode !== null || child.signalCode !== null) return;
		timedOut = true;
		child.kill("SIGTERM");
		forceKillTimeout = setTimeout(() => child.kill("SIGKILL"), killGraceMs);
		forceKillTimeout.unref();
	}, hardTimeoutMs);
	hardTimeout.unref();
	const childCode = await new Promise<number>((resolveExit, reject) => {
		child.once("error", reject);
		child.once("exit", (exitCode, signal) => resolveExit(exitCode ?? (signal ? 1 : 0)));
	}).finally(() => {
		clearTimeout(hardTimeout);
		if (forceKillTimeout) clearTimeout(forceKillTimeout);
	});
	return Object.freeze({ childCode, code: timedOut ? 1 : childCode, timedOut });
}
