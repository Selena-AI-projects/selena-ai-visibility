import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { user } from "@workspace/lib/db/schema";
import {
	claimFreeAiVisibilityCheck,
	FREE_AI_VISIBILITY_QUEUE,
	readFreeAiVisibilityStatus,
} from "@workspace/lib/selena-free-ai-visibility";
import { normalizeRegistrableDomain, RegistrableDomainError } from "@workspace/lib/selena-registrable-domain";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getBoss } from "../lib/boss-client";
import { resolveSessionAuthContext } from "../lib/selena-auth-context";

export function freeAiVisibilityFeatureState(env: Record<string, string | undefined>): { enabled: boolean } {
	return { enabled: env.SELENA_FREE_AI_VISIBILITY_ENABLED === "true" };
}

async function requireVerifiedSessionContext() {
	const context = await resolveSessionAuthContext();
	const verified = await db
		.select({ emailVerified: user.emailVerified })
		.from(user)
		.where(eq(user.id, context.actorId))
		.limit(1)
		.then((rows) => rows[0]?.emailVerified === true);
	if (!verified) throw new Error("SELENA_FREE_AI_VISIBILITY_EMAIL_VERIFICATION_REQUIRED");
	return context;
}

export const claimFreeAiVisibilityCheckFn = createServerFn({ method: "POST" })
	.validator(z.object({ website: z.string().trim().min(1).max(2048) }))
	.handler(async ({ data }) => {
		const context = await requireVerifiedSessionContext();
		if (!freeAiVisibilityFeatureState(process.env).enabled) throw new Error("SELENA_FREE_AI_VISIBILITY_DISABLED");

		let domain: string;
		try {
			domain = normalizeRegistrableDomain(data.website);
		} catch (error) {
			if (error instanceof RegistrableDomainError) throw new Error("SELENA_FREE_AI_VISIBILITY_DOMAIN_INVALID");
			throw error;
		}

		const claim = await withOrganizationTransaction(db, context.tenantId, (tx) =>
			claimFreeAiVisibilityCheck(tx, {
				userId: context.actorId,
				organizationId: context.tenantId,
				domain,
			}),
		);
		if (claim.decision !== "CLAIMED") {
			if (claim.decision === "ALREADY_CLAIMED") throw new Error("SELENA_FREE_AI_VISIBILITY_ALREADY_CLAIMED");
			throw new Error("SELENA_FREE_AI_VISIBILITY_CAP_REACHED");
		}

		const boss = await getBoss();
		await boss.send(
			FREE_AI_VISIBILITY_QUEUE,
			{ checkId: claim.checkId, organizationId: context.tenantId },
			{ singletonKey: claim.checkId },
		);
		return { checkId: claim.checkId, domain: claim.domain, status: "QUEUED" as const };
	});

export const getFreeAiVisibilityCheckStatusFn = createServerFn({ method: "GET" }).handler(async () => {
	const context = await requireVerifiedSessionContext();
	return withOrganizationTransaction(db, context.tenantId, (tx) =>
		readFreeAiVisibilityStatus(tx, { userId: context.actorId, organizationId: context.tenantId }),
	);
});
