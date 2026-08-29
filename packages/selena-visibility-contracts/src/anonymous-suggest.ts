/**
 * Whether a visitor with no account may spend the owner's money on one
 * suggestion of questions and competitors.
 *
 * The suggestion is the strongest thing the product can show before anyone has
 * paid: a list of the questions a business's own customers ask, and the names
 * that come back instead. Showing it before registration is the point — a
 * person who has already corrected the questions and the competitors has
 * something to lose by walking away, and nothing on a landing page argues as
 * well as that list does.
 *
 * It also reads a site through a paid model, at roughly five cents a call,
 * with no account behind it. So the decision is deliberately hard to say yes
 * to, in the same shape as free auto-dispatch:
 *
 *   - the flag is default-off, so a deploy alone opens nothing;
 *   - one visitor gets one suggestion a day, which is all an honest visitor
 *     needs and is where a script would start;
 *   - a day-wide ceiling bounds the whole surface if the per-visitor limit is
 *     evaded by rotating addresses.
 *
 * Everything here is a pure decision. The caller supplies today's counts and
 * performs the call; nothing in this module reaches a database or a provider.
 * The existing gates still apply on top of it: the global provider stop, the
 * named suggest budget class, and the monthly ceiling in dollars.
 */

export type AnonymousSuggestConfig = {
	enabled: boolean;
	maxPerDay: number;
	maxPerVisitorPerDay: number;
};

/**
 * One suggestion is booked at five cents, so forty of them is two dollars a
 * day — small enough to survive a bad night unnoticed, large enough that a
 * real day of traffic is not turned away.
 */
export const ANONYMOUS_SUGGEST_DEFAULT_PER_DAY = 40;
export const ANONYMOUS_SUGGEST_DEFAULT_PER_VISITOR_PER_DAY = 1;

function readCap(raw: string | undefined, fallback: number): number {
	if (raw === undefined || raw.trim() === "") return fallback;
	const parsed = Number(raw);
	// A malformed cap must not read as "unlimited": an unparseable value falls
	// back to the conservative default rather than to no limit at all.
	if (!Number.isInteger(parsed) || parsed < 0) return fallback;
	return parsed;
}

export function anonymousSuggestConfigFromEnv(
	env: Record<string, string | undefined>,
): AnonymousSuggestConfig {
	return {
		enabled: env.SELENA_ANONYMOUS_SUGGEST_ENABLED === "true",
		maxPerDay: readCap(env.SELENA_ANONYMOUS_SUGGEST_MAX_PER_DAY, ANONYMOUS_SUGGEST_DEFAULT_PER_DAY),
		maxPerVisitorPerDay: readCap(
			env.SELENA_ANONYMOUS_SUGGEST_MAX_PER_VISITOR_PER_DAY,
			ANONYMOUS_SUGGEST_DEFAULT_PER_VISITOR_PER_DAY,
		),
	};
}

export const anonymousSuggestRefusals = ["DISABLED", "VISITOR_CAP", "DAILY_CAP"] as const;
export type AnonymousSuggestRefusal = (typeof anonymousSuggestRefusals)[number];

export type AnonymousSuggestDecision =
	| { suggest: true }
	| { suggest: false; reason: AnonymousSuggestRefusal };

export function decideAnonymousSuggest(input: {
	config: AnonymousSuggestConfig;
	suggestedToday: number;
	suggestedTodayForVisitor: number;
}): AnonymousSuggestDecision {
	if (!input.config.enabled) return { suggest: false, reason: "DISABLED" };
	// The visitor's own limit is checked first so a person who has already had
	// their suggestion is told that, rather than being told the day is full.
	if (input.suggestedTodayForVisitor >= input.config.maxPerVisitorPerDay)
		return { suggest: false, reason: "VISITOR_CAP" };
	if (input.suggestedToday >= input.config.maxPerDay) return { suggest: false, reason: "DAILY_CAP" };
	return { suggest: true };
}
