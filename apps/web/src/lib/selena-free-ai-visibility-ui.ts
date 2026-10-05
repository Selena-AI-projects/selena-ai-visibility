import type { FreeAiVisibilityStatus } from "@workspace/lib/selena-free-ai-visibility";
import { tr, type WorkspaceLocale } from "./selena-locale";

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

type Copy = { heading: [english: string, russian: string]; body: [english: string, russian: string] };

const errorCopy: Record<FreeAiVisibilityCustomerError, Copy> = {
	EMAIL_VERIFICATION_REQUIRED: {
		heading: ["Verify your email to continue", "Подтвердите email, чтобы продолжить"],
		body: [
			"This one-time check is available after your email address is verified.",
			"Разовая проверка доступна после подтверждения адреса электронной почты.",
		],
	},
	ALREADY_CLAIMED: {
		heading: ["Your free check has already been used", "Бесплатная проверка уже использована"],
		body: [
			"Each verified account can run one no-cost check across the two systems.",
			"Каждый подтверждённый аккаунт может запустить одну бесплатную проверку по двум системам.",
		],
	},
	BUDGET_UNAVAILABLE: {
		heading: ["The free-check budget is unavailable", "Бюджет бесплатных проверок недоступен"],
		body: ["Please try again later. No check was started.", "Попробуйте позже. Проверка не была запущена."],
	},
	DOMAIN_INVALID: {
		heading: ["Enter a public website address", "Укажите адрес публичного сайта"],
		body: ["Use a website URL such as https://example.com.", "Введите адрес сайта, например https://example.com."],
	},
	// The feature flag is the operator's decision, not a passing outage, so the
	// visitor is told whose decision it is instead of being asked to retry.
	DISABLED: {
		heading: ["The operator has not enabled the free check yet", "Оператор ещё не включил бесплатную проверку"],
		body: [
			"This cabinet's operator has not switched on the free two-system check. The paid measurement is available in the cabinet.",
			"Оператор этого кабинета пока не включил бесплатную проверку по двум системам. Платный замер доступен в кабинете.",
		],
	},
	FAILED: {
		heading: ["We could not start or read this check", "Не удалось запустить или прочитать проверку"],
		body: [
			"Please try again later. No provider response or source link is shown here.",
			"Попробуйте позже. Ответ провайдера и ссылки на источники здесь не показываются.",
		],
	},
};

export function freeAiVisibilityErrorCopy(
	state: FreeAiVisibilityCustomerError,
	locale: WorkspaceLocale,
): { heading: string; body: string } {
	const copy = errorCopy[state];
	return { heading: tr(locale, ...copy.heading), body: tr(locale, ...copy.body) };
}
