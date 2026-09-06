import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "@workspace/lib/db/db";
import { member, organization, svApiKeys, user } from "@workspace/lib/db/schema";
import { verifyPayloadSignature } from "@workspace/selena-visibility-contracts";
import { eq } from "drizzle-orm";
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
 * run — an opted-in, non-production environment — it requires the same HMAC
 * signature every other simulation entry point requires, and it refuses once a
 * simulation tenant exists, so it cannot be used to mint a second credential
 * for a workspace that already has one. The key it returns is shown once and
 * stored only as its digest, exactly as a key created through the product is.
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

	const [existing] = await db
		.select({ id: organization.id })
		.from(organization)
		.where(eq(organization.slug, SIMULATION_ORG_SLUG))
		.limit(1);

	// A second call is answered but not re-credentialed: the tenant is reported
	// so a re-run can continue, and the key is withheld because the first call
	// was the only moment it could be shown.
	if (existing) return { organizationId: existing.id, apiKey: null, created: false };

	const organizationId = `org_${randomUUID().replaceAll("-", "")}`;
	const userId = `user_${randomUUID().replaceAll("-", "")}`;
	const apiKey = `sk_sim_${randomBytes(24).toString("hex")}`;

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
		await tx.insert(svApiKeys).values({
			organizationId,
			name: "staging simulation runner",
			keyHash: hashApiKey(apiKey),
			permissions: ["client:read", "client:write"],
			createdBy: userId,
			createdAt: now,
		});
	});

	return { organizationId, apiKey, created: true };
}
