import { randomUUID } from "node:crypto";
import { z } from "zod";
import { SelenaApiHttpError, selenaApiErrorResponse, selenaApiHttpErrorResponse } from "../lib/selena-api-http";
import { type AuthContext, resolveApiKeyAuthContext } from "../lib/selena-auth-context";

type ProviderCapabilitiesStoreInput = { auth: AuthContext; providerId: string };

export type SelenaProviderCapabilitiesStore = {
	read(input: ProviderCapabilitiesStoreInput): Promise<Record<string, unknown> | null>;
};

export const failClosedProviderCapabilitiesStore: SelenaProviderCapabilitiesStore = {
	async read() {
		throw new SelenaApiHttpError(
			503,
			"OWNER_GATE_REQUIRED",
			"Provider capabilities are unavailable until the provider registry, credentials and runtime gates are verified.",
			true,
			{ blocker: "PROVIDER_REGISTRY_OR_CREDENTIALS_UNVERIFIED", providerCalls: 0 },
		);
	},
};

export type ProviderCapabilitiesRouteDependencies = {
	authenticate: (request: Request) => Promise<AuthContext>;
	store: SelenaProviderCapabilitiesStore;
	requestId: () => string;
};

const defaultRouteDependencies: ProviderCapabilitiesRouteDependencies = {
	authenticate: resolveApiKeyAuthContext,
	store: failClosedProviderCapabilitiesStore,
	requestId: randomUUID,
};

function parseProviderId(providerId: string): string {
	const parsed = z.string().uuid().safeParse(providerId);
	if (!parsed.success) throw new SelenaApiHttpError(400, "RESOURCE_ID_INVALID", "providerId must be a valid UUID.");
	return parsed.data;
}

function routeError(error: unknown, requestId: string): Response {
	if (error instanceof SelenaApiHttpError) return selenaApiHttpErrorResponse(error, requestId);
	const message = error instanceof Error ? error.message : String(error);
	if (message.startsWith("Unauthorized"))
		return selenaApiErrorResponse(401, {
			code: "UNAUTHENTICATED",
			message: "Authentication is required.",
			requestId,
			retryable: false,
		});
	if (message.startsWith("Forbidden"))
		return selenaApiErrorResponse(403, {
			code: "SCOPE_FORBIDDEN",
			message: "The credential lacks the required provider capability scope.",
			requestId,
			retryable: false,
		});
	return selenaApiErrorResponse(500, {
		code: "INTERNAL_ERROR",
		message: "Provider capabilities could not be read.",
		requestId,
		retryable: true,
	});
}

export function createProviderCapabilitiesRouteHandlers(
	dependencies: ProviderCapabilitiesRouteDependencies = defaultRouteDependencies,
) {
	return {
		capabilities: async (request: Request, providerId: string): Promise<Response> => {
			const requestId = dependencies.requestId();
			try {
				const auth = await dependencies.authenticate(request);
				if (!auth.permissions.includes("provider:canary"))
					throw new SelenaApiHttpError(403, "SCOPE_FORBIDDEN", "API key lacks provider:canary scope.", false, {
						requiredScope: "provider:canary",
					});
				const validatedProviderId = parseProviderId(providerId);
				const capabilities = await dependencies.store.read({ auth, providerId: validatedProviderId });
				if (capabilities === null)
					throw new SelenaApiHttpError(
						503,
						"OWNER_GATE_REQUIRED",
						"Provider capabilities did not produce a durable registry response.",
						true,
						{ blocker: "PROVIDER_REGISTRY_OR_CREDENTIALS_UNVERIFIED", providerCalls: 0 },
					);
				return Response.json(capabilities);
			} catch (error) {
				return routeError(error, requestId);
			}
		},
	};
}

export const providerCapabilitiesRouteHandlers = createProviderCapabilitiesRouteHandlers();
