/**
 * Auth instance for the web app.
 *
 * Created once at module scope using the shared factory from @workspace/lib,
 * with deployment-specific options injected based on DEPLOYMENT_MODE.
 *
 * This is the single source of truth for the server-side auth object.
 * All server functions, middleware, and route handlers import from here.
 */
import { getCloudAuthOptions } from "@workspace/cloud/auth-hooks";
import { type CreateAuthOptions, createAuth } from "@workspace/lib/auth/server";
import { countUsers, provisionLocalOrg, provisionUmbrellaOrg } from "@workspace/lib/db/provisioning";
import { selfServeSignupOpen } from "@workspace/selena-visibility-contracts";
import { getWhitelabelAuthOptions } from "@workspace/whitelabel/auth-hooks";

/**
 * Local mode hooks: enforce "exactly one user, with an admin org created
 * atomically on signup". The `before` hook rejects any signup once a user
 * exists; the `after` hook creates the organization and membership.
 *
 * Also applies to direct POST /api/auth/sign-up/email calls — the hooks
 * fire regardless of whether signup is triggered from our UI or a curl.
 */
function getLocalAuthOptions(): CreateAuthOptions {
	// With self-serve signup open, "exactly one user" no longer holds, and the
	// single shared org must not be handed out with it: `provisionLocalOrg`
	// inserts a fixed organization id, so a second signup would either collide
	// on the primary key or seat a stranger as admin of the owner's workspace.
	// Each account gets its own org instead, the way cloud provisions one.
	if (selfServeSignupOpen(process.env)) {
		return {
			databaseHooks: {
				user: {
					create: {
						after: async (user) => {
							await provisionUmbrellaOrg({
								userId: user.id,
								name: user.name?.trim() ? `${user.name.trim()}'s workspace` : "My workspace",
							});
						},
					},
				},
			},
		};
	}

	return {
		databaseHooks: {
			user: {
				create: {
					before: async () => {
						if ((await countUsers()) > 0) {
							throw new Error("This instance is already bootstrapped. Sign in with the existing account instead.");
						}
					},
					after: async (user) => {
						await provisionLocalOrg({ userId: user.id });
					},
				},
			},
		},
	};
}

function getDeploymentAuthOptions(): CreateAuthOptions | undefined {
	switch (process.env.DEPLOYMENT_MODE) {
		case "whitelabel":
			return getWhitelabelAuthOptions();
		case "demo":
			// Signup is disabled. Demo deployments reuse a database previously
			// bootstrapped in local mode; visitors can only sign in as that
			// pre-existing user.
			return { disableSignUp: true };
		case "cloud": {
			// Full cloud auth stack (email verification, Google OAuth, Resend
			// transactional email, team invitations, disposable-domain blocking,
			// invite-only allowlist, and umbrella-org provisioning). The cloud
			// package owns the entire hook chain — this case is a single call.
			return getCloudAuthOptions();
		}
		default:
			return getLocalAuthOptions();
	}
}

export const auth = /* @__PURE__ */ createAuth(getDeploymentAuthOptions());
