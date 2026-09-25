import type { FreeAiVisibilityStatus } from "@workspace/lib/selena-free-ai-visibility";

export type FreeAiVisibilityCustomerError =
	| "EMAIL_VERIFICATION_REQUIRED"
	| "ALREADY_CLAIMED"
	| "BUDGET_UNAVAILABLE"
	| "DOMAIN_INVALID"
	| "DISABLED"
	| "FAILED";

const knownErrors: Array<[string, FreeAiVisibilityCustomerError]> = [
	["SELENA_FREE_AI_VISIBILITY_EMAIL_VERIFICATION_REQUIRED", "EMAIL_VERIFICATION_REQUIRED"],
	["SELENA_FREE_AI_VISIBILITY_ALREADY_CLAIMED", "ALREADY_CLAIMED"],
	["SELENA_FREE_AI_VISIBILITY_CAP_REACHED", "BUDGET_UNAVAILABLE"],
	["SELENA_FREE_AI_VISIBILITY_DOMAIN_INVALID", "DOMAIN_INVALID"],
	["SELENA_FREE_AI_VISIBILITY_DISABLED", "DISABLED"],
];

export function freeAiVisibilityCustomerError(error: unknown): FreeAiVisibilityCustomerError {
	const message = error instanceof Error ? error.message : String(error);
	return knownErrors.find(([code]) => message.includes(code))?.[1] ?? "FAILED";
}

export function shouldPollFreeAiVisibilityStatus(status: FreeAiVisibilityStatus | null | undefined): boolean {
	return status?.status === "QUEUED" || status?.status === "UNCONFIRMED";
}
