/**
 * What the owner service has been asked to do, read from its variables.
 *
 * The owner's own database steps — minting pilot seats, reading or setting a
 * spend ceiling, granting the operator role — need a connection with owner
 * rights, which no product runtime holds and no operator's laptop should. So
 * they run where that connection already lives: a one-shot Railway service
 * built from the worker image, whose task is named by one variable and whose
 * inputs are the others. Everything here is a pure reading of that
 * environment, so the refusals are testable without a database.
 */

export const ownerTaskKinds = [
	"issue-pilot-invites",
	"read-spend-budget",
	"set-spend-budget",
	"grant-platform-admin",
] as const;
export type OwnerTaskKind = (typeof ownerTaskKinds)[number];

export const OWNER_TASK_ENV = "SELENA_OWNER_TASK";
export const PILOT_SEATS_CSV_ENV = "SELENA_PILOT_SEATS_CSV";
export const PILOT_SEAT_DAYS_ENV = "SELENA_PILOT_SEAT_DAYS";
export const SPEND_SCOPE_ENV = "SELENA_SPEND_SCOPE";
export const SPEND_CAP_USD_ENV = "SELENA_SPEND_CAP_USD";
export const OWNER_ADMIN_EMAIL_ENV = "SELENA_OWNER_ADMIN_EMAIL";

export const DEFAULT_PILOT_SEAT_DAYS = 30;
export const DEFAULT_SPEND_SCOPE = "measure";

export type OwnerTask =
	| { kind: "issue-pilot-invites"; csv: string; validDays: number }
	| { kind: "read-spend-budget"; scope: string }
	| { kind: "set-spend-budget"; scope: string; capUsd: number }
	| { kind: "grant-platform-admin"; email: string }
	| { kind: "refused"; reason: OwnerTaskRefusal };

export const ownerTaskRefusals = [
	"OWNER_TASK_REQUIRED",
	"OWNER_TASK_UNKNOWN",
	"PILOT_SEATS_CSV_REQUIRED",
	"PILOT_SEAT_DAYS_INVALID",
	"SPEND_CAP_USD_REQUIRED",
	"SPEND_CAP_USD_INVALID",
	"OWNER_ADMIN_EMAIL_REQUIRED",
	"OWNER_ADMIN_EMAIL_INVALID",
] as const;
export type OwnerTaskRefusal = (typeof ownerTaskRefusals)[number];

function text(value: string | undefined): string {
	return (value ?? "").trim();
}

export function resolveOwnerTask(env: Record<string, string | undefined>): OwnerTask {
	const kind = text(env[OWNER_TASK_ENV]);
	if (kind === "") return { kind: "refused", reason: "OWNER_TASK_REQUIRED" };
	if (!(ownerTaskKinds as readonly string[]).includes(kind)) return { kind: "refused", reason: "OWNER_TASK_UNKNOWN" };

	if (kind === "issue-pilot-invites") {
		// The variable holds the seats file's contents, one seat per line.
		const csv = env[PILOT_SEATS_CSV_ENV] ?? "";
		if (csv.trim() === "") return { kind: "refused", reason: "PILOT_SEATS_CSV_REQUIRED" };
		const rawDays = text(env[PILOT_SEAT_DAYS_ENV]);
		const validDays = rawDays === "" ? DEFAULT_PILOT_SEAT_DAYS : Number(rawDays);
		if (!Number.isInteger(validDays) || validDays <= 0) return { kind: "refused", reason: "PILOT_SEAT_DAYS_INVALID" };
		return { kind, csv, validDays };
	}

	if (kind === "grant-platform-admin") {
		const email = text(env[OWNER_ADMIN_EMAIL_ENV]);
		if (email === "") return { kind: "refused", reason: "OWNER_ADMIN_EMAIL_REQUIRED" };
		// The database matches the address exactly (case aside); anything that
		// cannot be an address is refused here, before a connection is opened.
		if (!email.includes("@")) return { kind: "refused", reason: "OWNER_ADMIN_EMAIL_INVALID" };
		return { kind, email };
	}

	const scope = text(env[SPEND_SCOPE_ENV]) || DEFAULT_SPEND_SCOPE;
	if (kind === "read-spend-budget") return { kind, scope };

	const rawCap = text(env[SPEND_CAP_USD_ENV]);
	if (rawCap === "") return { kind: "refused", reason: "SPEND_CAP_USD_REQUIRED" };
	const capUsd = Number(rawCap);
	if (!Number.isFinite(capUsd) || capUsd < 0) return { kind: "refused", reason: "SPEND_CAP_USD_INVALID" };
	return { kind: "set-spend-budget", scope, capUsd };
}

/** What the log says when the service was started without a task it can run. */
export function ownerTaskUsage(): string[] {
	return [
		`${OWNER_TASK_ENV} names the task: ${ownerTaskKinds.join(", ")}.`,
		`issue-pilot-invites reads ${PILOT_SEATS_CSV_ENV} (one seat per line, CODE,planId[,label]) and ${PILOT_SEAT_DAYS_ENV} (default ${DEFAULT_PILOT_SEAT_DAYS}).`,
		`read-spend-budget and set-spend-budget read ${SPEND_SCOPE_ENV} (default ${DEFAULT_SPEND_SCOPE}); set-spend-budget also needs ${SPEND_CAP_USD_ENV}.`,
		`grant-platform-admin reads ${OWNER_ADMIN_EMAIL_ENV}, the address of the one existing account to make a platform operator.`,
	];
}
