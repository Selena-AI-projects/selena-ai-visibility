import { z } from "zod";
import { executionKeyPartSchema } from "./local-execution.js";

const usdAmountSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/);
const periodKeySchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/);
const localMapsExecutionKeySchema = z
	.string()
	.min(1)
	.regex(/^\S+$/)
	.superRefine((key, issues) => {
		const parts = key.split("|");
		if (
			parts.length !== 7 ||
			parts[0] !== "LOCAL_MAPS" ||
			!z.string().uuid().safeParse(parts[1]).success ||
			!z.string().uuid().safeParse(parts[2]).success ||
			!z.string().uuid().safeParse(parts[3]).success ||
			!executionKeyPartSchema.safeParse(parts[4]).success ||
			!/^(?:0|[1-9]\d{0,9})$/.test(parts[5] ?? "") ||
			Number(parts[5]) > 2_147_483_647 ||
			!new Set(["1", "2", "3"]).has(parts[6] ?? "")
		)
			issues.addIssue({ code: "custom", message: "LOCAL_BUDGET_EXECUTION_KEY_INVALID" });
	});

function toMicros(amount: string): bigint {
	const [whole, fraction = ""] = usdAmountSchema.parse(amount).split(".");
	return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
}

function fromMicros(amount: bigint): string {
	if (amount < 0) throw new Error("LOCAL_BUDGET_NEGATIVE_MICROS");
	const whole = amount / BigInt(1_000_000);
	const fraction = (amount % BigInt(1_000_000)).toString().padStart(6, "0");
	return `${whole}.${fraction}`;
}

export const localBudgetExposureSnapshotRowSchema = z
	.strictObject({
		organizationId: z.string().trim().min(1),
		domainId: z.literal("LOCAL_MAPS"),
		measurementCycleId: z.string().uuid(),
		periodKey: periodKeySchema,
		executionKey: localMapsExecutionKeySchema,
		reservationId: z.string().uuid(),
		budgetState: z.enum(["RESERVED", "SPENT", "RELEASED"]),
		reservedCostUsd: usdAmountSchema,
		spentCostUsd: usdAmountSchema,
		surfaceCapUsd: usdAmountSchema,
		monthlyCapUsd: usdAmountSchema,
		priceSnapshotVersion: executionKeyPartSchema,
	})
	.superRefine((row, issues) => {
		if (row.executionKey.split("|")[1] !== row.measurementCycleId)
			issues.addIssue({ code: "custom", message: "LOCAL_BUDGET_EXECUTION_CYCLE_MISMATCH", path: ["executionKey"] });
		if (row.budgetState !== "SPENT" && toMicros(row.spentCostUsd) !== BigInt(0))
			issues.addIssue({ code: "custom", message: "LOCAL_BUDGET_NON_SPENT_ROW_HAS_SPEND", path: ["spentCostUsd"] });
	});
export type LocalBudgetExposureSnapshotRow = z.infer<typeof localBudgetExposureSnapshotRowSchema>;

export const localBudgetClaimProjectionInputSchema = z
	.strictObject({
		organizationId: z.string().trim().min(1),
		domainId: z.literal("LOCAL_MAPS"),
		measurementCycleId: z.string().uuid(),
		periodKey: periodKeySchema,
		executionKey: localMapsExecutionKeySchema,
		reservationId: z.string().uuid(),
		requestedReserveUsd: usdAmountSchema,
		surfaceCapUsd: usdAmountSchema,
		monthlyCapUsd: usdAmountSchema,
		priceSnapshotVersion: executionKeyPartSchema,
	})
	.refine((claim) => claim.executionKey.split("|")[1] === claim.measurementCycleId, {
		message: "LOCAL_BUDGET_EXECUTION_CYCLE_MISMATCH",
		path: ["executionKey"],
	});
export type LocalBudgetClaimProjectionInput = z.infer<typeof localBudgetClaimProjectionInputSchema>;

export type LocalBudgetClaimProjection = {
	fit: "FITS" | "EXCEEDS" | "EXACT_REPLAY" | "CONFLICT";
	reason:
		| "SURFACE_CAP_EXCEEDED"
		| "MONTHLY_CAP_EXCEEDED"
		| "EXISTING_EXECUTION_MISMATCH"
		| "EXECUTION_ALREADY_FINALIZED"
		| null;
	currentSurfaceExposureUsd: string;
	currentMonthlyExposureUsd: string;
	projectedSurfaceExposureUsd: string;
	projectedMonthlyExposureUsd: string;
};

function rowExposure(row: LocalBudgetExposureSnapshotRow): bigint {
	if (row.budgetState === "RELEASED") return BigInt(0);
	return row.budgetState === "SPENT" ? toMicros(row.spentCostUsd) : toMicros(row.reservedCostUsd);
}

/**
 * Non-authoritative arithmetic over a caller-supplied snapshot candidate.
 * FITS is never permission to dispatch: only a future transactional store may
 * derive the tenant period, lock complete aggregates and issue an opaque permit.
 */
export function projectLocalBudgetClaim(
	rowsInput: readonly LocalBudgetExposureSnapshotRow[],
	projectionInput: LocalBudgetClaimProjectionInput,
): LocalBudgetClaimProjection {
	const rows = rowsInput.map((row) => localBudgetExposureSnapshotRowSchema.parse(row));
	const projection = localBudgetClaimProjectionInputSchema.parse(projectionInput);
	const scopedRows = rows.filter(
		(row) => row.organizationId === projection.organizationId && row.domainId === projection.domainId,
	);
	if (new Set(scopedRows.map((row) => row.executionKey)).size !== scopedRows.length)
		throw new Error("LOCAL_BUDGET_DUPLICATE_EXECUTION_EXPOSURE");
	const currentSurface = scopedRows
		.filter((row) => row.measurementCycleId === projection.measurementCycleId)
		.reduce((sum, row) => sum + rowExposure(row), BigInt(0));
	const currentMonthly = scopedRows
		.filter((row) => row.periodKey === projection.periodKey)
		.reduce((sum, row) => sum + rowExposure(row), BigInt(0));
	const existing = scopedRows.find((row) => row.executionKey === projection.executionKey);
	const requested = existing ? BigInt(0) : toMicros(projection.requestedReserveUsd);
	const projectedSurface = currentSurface + requested;
	const projectedMonthly = currentMonthly + requested;
	const base = {
		currentSurfaceExposureUsd: fromMicros(currentSurface),
		currentMonthlyExposureUsd: fromMicros(currentMonthly),
		projectedSurfaceExposureUsd: fromMicros(projectedSurface),
		projectedMonthlyExposureUsd: fromMicros(projectedMonthly),
	};
	if (existing) {
		if (existing.budgetState !== "RESERVED") return { fit: "CONFLICT", reason: "EXECUTION_ALREADY_FINALIZED", ...base };
		const exactReplay =
			existing.measurementCycleId === projection.measurementCycleId &&
			existing.periodKey === projection.periodKey &&
			existing.reservationId === projection.reservationId &&
			existing.reservedCostUsd === projection.requestedReserveUsd &&
			existing.surfaceCapUsd === projection.surfaceCapUsd &&
			existing.monthlyCapUsd === projection.monthlyCapUsd &&
			existing.priceSnapshotVersion === projection.priceSnapshotVersion;
		return exactReplay
			? { fit: "EXACT_REPLAY", reason: null, ...base }
			: { fit: "CONFLICT", reason: "EXISTING_EXECUTION_MISMATCH", ...base };
	}
	if (projectedSurface > toMicros(projection.surfaceCapUsd))
		return { fit: "EXCEEDS", reason: "SURFACE_CAP_EXCEEDED", ...base };
	if (projectedMonthly > toMicros(projection.monthlyCapUsd))
		return { fit: "EXCEEDS", reason: "MONTHLY_CAP_EXCEEDED", ...base };
	return { fit: "FITS", reason: null, ...base };
}
