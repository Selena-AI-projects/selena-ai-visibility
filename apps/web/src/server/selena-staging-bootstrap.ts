import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { member, organization, svApiKeys, svSimulationBootstrapNonces, user } from "@workspace/lib/db/schema";
import {
	assertBootstrapFresh,
	BOOTSTRAP_FRESHNESS_MS,
	parseBootstrapRequest,
	verifyPayloadSignature,
} from "@workspace/selena-visibility-contracts";
import { and, eq, isNull, lt } from "drizzle-orm";
import { assertSimulationEnvironment, SimulationError } from "./selena-staging-simulation";

/**
 * Gives an empty rehearsal rig the one tenant its simulation needs.
 *
 * A rig starts with a migrated but empty database: no organization, so no API
 * key, so no way to post the first signed payment event. Signing up through
 * the UI would work, but it needs a person at a browser, and the point of the
 * rehearsal is that a script can run the whole chain and leave evidence.
 *
 * This is deliberately narrow. It runs only where the simulation itself may
 * run — the opted-in staging environment — and it requires an HMAC signature
 * over a request that can be used once: the body carries a nonce and the time
 * it was signed, so a captured call is worthless minutes later and cannot be
 * repeated even before that. The key it returns is shown once and stored only
 * as its digest, exactly as a key created through the product is.
 */

const SIMULATION_ORG_SLUG = "staging-simulation";

export type BootstrapResult = {
	organizationId: string;
	apiKey: string | null;
	created: boolean;
};

function hashApiKey(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

export async function bootstrapSimulationTenant(input: {
	rawBody: string;
	signature: string;
	env?: NodeJS.ProcessEnv;
	now?: Date;
}): Promise<BootstrapResult> {
	const env = input.env ?? process.env;
	assertSimulationEnvironment(env);
	const secret = env.SELENA_SIMULATION_SIGNING_SECRET;
	if (!secret) throw new SimulationError("SELENA_SIMULATION_SIGNING_SECRET_MISSING", 503);
	if (!(await verifyPayloadSignature(input.rawBody, input.signature, secret)))
		throw new SimulationError("SELENA_SIMULATION_SIGNATURE_INVALID", 401);

	const now = input.now ?? new Date();
	await consumeBootstrapNonce(input.rawBody, now);

	const [existing] = await db
		.select({ id: organization.id })
		.from(organization)
		.where(eq(organization.slug, SIMULATION_ORG_SLUG))
		.limit(1);

	// A repeat call re-credentials the rig rather than withholding a key, so a
	// run never has to store a credential between attempts. That is only safe
	// because the request above can be used once: otherwise a captured call
	// would both take a key and revoke the runner's on every replay.
	if (existing) {
		const rotatedKey = await issueRunnerKey(existing.id, `bootstrap:${SIMULATION_ORG_SLUG}`, now);
		return { organizationId: existing.id, apiKey: rotatedKey, created: false };
	}

	const organizationId = `org_${randomUUID().replaceAll("-", "")}`;
	const userId = `user_${randomUUID().replaceAll("-", "")}`;

	await db.transaction(async (tx) => {
		await tx.insert(user).values({
			id: userId,
			name: "Staging simulation operator",
			email: `simulation+${organizationId}@staging.invalid`,
			emailVerified: false,
			createdAt: now,
			updatedAt: now,
		});
		await tx.insert(organization).values({
			id: organizationId,
			name: "Staging simulation",
			slug: SIMULATION_ORG_SLUG,
			createdAt: now,
		});
		await tx.insert(member).values({
			id: `mem_${randomUUID().replaceAll("-", "")}`,
			organizationId,
			userId,
			role: "owner",
			createdAt: now,
		});
	});

	// The key is written under the workspace's own RLS identity, which the
	// identity tables above cannot be: they are created before there is a
	// workspace to be. A failure between the two leaves a workspace with no key,
	// and the next call takes the branch above and issues one.
	const apiKey = await issueRunnerKey(organizationId, userId, now);
	return { organizationId, apiKey, created: true };
}

/**
 * Spends the request's nonce, or refuses. The insert is the check: two
 * simultaneous replays both find the ledger empty, and only the one whose row
 * lands proceeds.
 */
async function consumeBootstrapNonce(rawBody: string, now: Date): Promise<void> {
	let request: ReturnType<typeof parseBootstrapRequest>;
	try {
		request = parseBootstrapRequest(JSON.parse(rawBody));
		assertBootstrapFresh(request, now);
	} catch (error) {
		const code = error instanceof Error ? error.message : "SELENA_BOOTSTRAP_REQUEST_INVALID";
		throw new SimulationError(code, code === "SELENA_BOOTSTRAP_REQUEST_STALE" ? 401 : 400);
	}

	await db
		.delete(svSimulationBootstrapNonces)
		.where(lt(svSimulationBootstrapNonces.usedAt, new Date(now.getTime() - BOOTSTRAP_FRESHNESS_MS)));

	const spent = await db
		.insert(svSimulationBootstrapNonces)
		.values({ nonce: request.nonce, usedAt: now })
		.onConflictDoNothing({ target: svSimulationBootstrapNonces.nonce })
		.returning({ nonce: svSimulationBootstrapNonces.nonce });
	if (spent.length === 0) throw new SimulationError("SELENA_BOOTSTRAP_REQUEST_REPLAYED", 409);
}

/**
 * Issues the one live runner key, revoking whatever preceded it in the same
 * transaction so exactly one is valid at a time.
 */
async function issueRunnerKey(organizationId: string, createdBy: string, now: Date): Promise<string> {
	const key = `sk_sim_${randomBytes(24).toString("hex")}`;
	await withOrganizationTransaction(db, organizationId, async (tx) => {
		await tx
			.update(svApiKeys)
			.set({ revokedAt: now })
			.where(and(eq(svApiKeys.organizationId, organizationId), isNull(svApiKeys.revokedAt)));
		await tx.insert(svApiKeys).values({
			organizationId,
			name: "staging simulation runner",
			keyHash: hashApiKey(key),
			permissions: ["client:read", "client:write"],
			createdBy,
			createdAt: now,
		});
	});
	return key;
}
