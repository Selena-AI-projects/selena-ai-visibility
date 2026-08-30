import {
	type LocalApiIdempotencyIdentity,
	localApiIdempotencyIdentitySchema,
} from "@workspace/selena-visibility-contracts";

export type SelenaApiMutationResponse<T> = {
	status: number;
	body: T;
};

/**
 * A runtime adapter must implement this callback with one database transaction:
 * read/replay before `execute`, then persist the response before commit. The
 * route layer deliberately has no fallback persistence implementation; absent
 * adapters keep the existing fail-closed stores in control.
 */
export type SelenaApiIdempotencyRunner = (input: {
	identity: LocalApiIdempotencyIdentity;
	execute: () => Promise<SelenaApiMutationResponse<unknown>>;
}) => Promise<SelenaApiMutationResponse<unknown>>;

export async function runSelenaApiMutation<T>(input: {
	runner?: SelenaApiIdempotencyRunner;
	identity: LocalApiIdempotencyIdentity;
	execute: () => Promise<SelenaApiMutationResponse<T>>;
}): Promise<SelenaApiMutationResponse<T>> {
	const identity = localApiIdempotencyIdentitySchema.parse(input.identity);
	const result = input.runner ? await input.runner({ identity, execute: input.execute }) : await input.execute();
	if (!Number.isInteger(result.status) || result.status < 200 || result.status > 299)
		throw new Error("IDEMPOTENCY_RESPONSE_STATUS_INVALID");
	return result as SelenaApiMutationResponse<T>;
}
