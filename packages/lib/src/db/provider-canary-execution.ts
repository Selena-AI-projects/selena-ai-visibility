import { type OrganizationDatabase, withOrganizationTransaction } from "./organization-transaction";
import { svProviderCanaryExecutions } from "./schema";

export const GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD = 0.25 as const;

export type GoogleAiModeCanaryReservation =
	| Readonly<{
			status: "RESERVED";
			reservationId: string;
			approvedCapUsd: typeof GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD;
			remainingAuthorizedUsd: typeof GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD;
	  }>
	| Readonly<{ status: "ALREADY_RESERVED" }>;

/**
 * Commits the durable, once-ever reservation before the provider trigger may
 * run. The immutable row records authorization, not an assertion of spend.
 */
export async function reserveGoogleAiModeCanaryExecution(
	db: OrganizationDatabase,
	input: Readonly<{ organizationId: string; executionIdentity: string }>,
): Promise<GoogleAiModeCanaryReservation> {
	if (input.executionIdentity.length < 8 || input.executionIdentity.length > 128)
		throw new Error("PROVIDER_CANARY_EXECUTION_IDENTITY_INVALID");
	if (input.executionIdentity !== input.executionIdentity.trim())
		throw new Error("PROVIDER_CANARY_EXECUTION_IDENTITY_INVALID");

	const reservationId = await withOrganizationTransaction(db, input.organizationId, async (tx) => {
		const [reserved] = await tx
			.insert(svProviderCanaryExecutions)
			.values({
				organizationId: input.organizationId,
				executionIdentity: input.executionIdentity,
				source: "GOOGLE_AI_MODE",
				approvedCapUsd: "0.250000",
				recurring: false,
				automaticRetries: 0,
				costStatus: "UNKNOWN",
			})
			.onConflictDoNothing({
				target: [svProviderCanaryExecutions.source, svProviderCanaryExecutions.executionIdentity],
			})
			.returning({ id: svProviderCanaryExecutions.id });
		return reserved?.id ?? null;
	});

	return reservationId
		? Object.freeze({
				status: "RESERVED" as const,
				reservationId,
				approvedCapUsd: GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD,
				remainingAuthorizedUsd: GOOGLE_AI_MODE_CANARY_APPROVED_CAP_USD,
			})
		: Object.freeze({ status: "ALREADY_RESERVED" as const });
}
