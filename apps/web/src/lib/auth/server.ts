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
import { getWhitelabelAuthOptions } from "@workspace/whitelabel/auth-hooks";
import { getDeployment } from "@/lib/config/server";

/**
 * Local mode hooks, in one of two shapes.
 *
 * Closed (the default): "exactly one user, with an admin org created
 * atomically on signup". The `before` hook rejects any signup once a user
 * exists; the `after` hook creates the single shared organization.
 *
 * Open (SELENA_SELF_SERVE_SIGNUP=true): anyone may sign up, and each new
 * user gets their own workspace. The shared organization must not be reused
 * here — it would seat every stranger as an admin next to the operator's own
 * brands, and its id is a constant, so the second signup would collide on
 * the primary key anyway.
 *
 * Both shapes also apply to direct POST /api/auth/sign-up/email calls — the
 * hooks fire regardless of whether signup is triggered from our UI or a curl.
 */
function getLocalAuthOptions(): CreateAuthOptions {
	const selfServeSignup = getDeployment().features.selfServeSignup;

	return {
		databaseHooks: {
			user: {
				create: {
					before: async () => {
						if (selfServeSignup) return;
						if ((await countUsers()) > 0) {
							throw new Error("This instance is already bootstrapped. Sign in with the existing account instead.");
						}
					},
					after: async (user) => {
						if (selfServeSignup) {
							await provisionUmbrellaOrg({
								userId: user.id,
								name: user.name?.trim() ? `${user.name.trim()}'s workspace` : "My workspace",
							});
							return;
						}
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
