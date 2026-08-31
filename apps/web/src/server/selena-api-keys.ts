import { createHash, randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/lib/db/db";
import { withOrganizationTransaction } from "@workspace/lib/db/organization-transaction";
import { svApiKeys } from "@workspace/lib/db/schema";
import { localApiScopeSchema } from "@workspace/selena-visibility-contracts";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { canWrite, resolveSessionAuthContext } from "../lib/selena-auth-context";

const legacyPermissionSchema = z.enum(["client:read", "client:write", "measurement:dispatch"]);
const permissions = z
	.array(z.union([legacyPermissionSchema, localApiScopeSchema]))
	.min(1)
	.max(10);
const createSchema = z.object({
	name: z.string().trim().min(1).max(120),
	permissions,
	expiresAt: z.coerce.date().nullable().default(null),
});

function hashKey(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}
function assertKeyAdmin(context: Awaited<ReturnType<typeof resolveSessionAuthContext>>): void {
	if (!canWrite(context) || context.role !== "owner")
		throw new Error("Forbidden: only tenant owners can manage API keys");
}

export const createSelenaApiKeyFn = createServerFn({ method: "POST" })
	.validator(createSchema)
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		assertKeyAdmin(context);
		const plaintext = `selena_${randomBytes(32).toString("base64url")}`;
		const key = await withOrganizationTransaction(db, context.tenantId, async (tx) => {
			const [created] = await tx
				.insert(svApiKeys)
				.values({
					organizationId: context.tenantId,
					name: data.name,
					keyHash: hashKey(plaintext),
					permissions: data.permissions,
					expiresAt: data.expiresAt,
					createdBy: context.actorId,
				})
				.returning({
					id: svApiKeys.id,
					name: svApiKeys.name,
					permissions: svApiKeys.permissions,
					expiresAt: svApiKeys.expiresAt,
					createdAt: svApiKeys.createdAt,
				});
			return created;
		});
		if (!key) throw new Error("Unable to create API key");
		return { ...key, plaintext: `Only shown once: ${plaintext}` };
	});

export const listSelenaApiKeysFn = createServerFn({ method: "GET" }).handler(async () => {
	const context = await resolveSessionAuthContext();
	assertKeyAdmin(context);
	return withOrganizationTransaction(db, context.tenantId, (tx) =>
		tx
			.select({
				id: svApiKeys.id,
				name: svApiKeys.name,
				permissions: svApiKeys.permissions,
				expiresAt: svApiKeys.expiresAt,
				revokedAt: svApiKeys.revokedAt,
				createdAt: svApiKeys.createdAt,
			})
			.from(svApiKeys)
			.where(and(eq(svApiKeys.organizationId, context.tenantId), isNull(svApiKeys.revokedAt))),
	);
});

export const revokeSelenaApiKeyFn = createServerFn({ method: "POST" })
	.validator(z.object({ keyId: z.string().uuid() }))
	.handler(async ({ data }) => {
		const context = await resolveSessionAuthContext();
		assertKeyAdmin(context);
		const key = await withOrganizationTransaction(db, context.tenantId, async (tx) => {
			const [revoked] = await tx
				.update(svApiKeys)
				.set({ revokedAt: new Date() })
				.where(
					and(
						eq(svApiKeys.id, data.keyId),
						eq(svApiKeys.organizationId, context.tenantId),
						isNull(svApiKeys.revokedAt),
					),
				)
				.returning({ id: svApiKeys.id, revokedAt: svApiKeys.revokedAt });
			return revoked;
		});
		if (!key) throw new Error("Not found: API key is outside AuthContext tenant or already revoked");
		return key;
	});
