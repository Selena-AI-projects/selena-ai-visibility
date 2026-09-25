import { i as DEFAULT_CHART_COLORS, n as DEFAULT_APP_NAME, r as DEFAULT_APP_URL, t as DEFAULT_APP_ICON } from "./constants-ChC5ZOH6.mjs";
import { a as requireEnvVars, n as getEnv, t as getDeploymentModeFromEnv } from "./env-D9tfoX6E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-B0rVTxL5.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "72126bfa-de98-4bd3-9be4-c3169744232c", e._sentryDebugIdIdentifier = "sentry-dbid-72126bfa-de98-4bd3-9be4-c3169744232c");
	} catch (e) {}
})();
/**
* Elmo Cloud deployment factory.
*
* Creates the Deployment for the managed multi-tenant Elmo Cloud offering.
*
* Feature flags: self-serve signup ON, multi-org ON, Stripe billing ON,
* read-only OFF. Report generation is OFF — the one-time report generator is
* an internal/whitelabel tool and is disabled entirely in cloud (no worker
* scheduling, no UI entry points).
*
* Branding uses the Elmo defaults, so no VITE_APP_* overrides are needed. Only
* the public app URL is deployment-specific and is read from APP_URL (required
* for cloud via env validation; the localhost default keeps this factory total
* so a missing APP_URL surfaces on the env-validation page rather than throwing).
*/
function createCloudDeployment(env = process.env) {
	return {
		mode: "cloud",
		features: {
			readOnly: false,
			showOptimizeButton: false,
			canCreateBrands: true,
			selfServeSignup: true,
			billing: true,
			reportGeneration: false,
			teamInvites: true
		},
		branding: {
			name: DEFAULT_APP_NAME,
			icon: DEFAULT_APP_ICON,
			url: getEnv("APP_URL", DEFAULT_APP_URL, env),
			chartColors: DEFAULT_CHART_COLORS
		}
	};
}
/**
* @workspace/local - Local development deployment
*
* Creates a Deployment for local development.
* When READ_ONLY=true, acts as a demo deployment with write operations blocked.
*
* Auth is fully handled by better-auth — this only provides static config.
*/
function createLocalDeployment(env = process.env) {
	const readOnly = env.READ_ONLY === "true";
	return {
		mode: readOnly ? "demo" : "local",
		features: {
			readOnly,
			showOptimizeButton: false,
			canCreateBrands: !readOnly,
			selfServeSignup: !readOnly && env.SELENA_SELF_SERVE_SIGNUP_ENABLED === "true",
			billing: false,
			reportGeneration: true,
			teamInvites: false
		},
		branding: {
			name: getEnv("APP_NAME", DEFAULT_APP_NAME, env),
			icon: getEnv("APP_ICON", DEFAULT_APP_ICON, env),
			url: getEnv("APP_URL", DEFAULT_APP_URL, env),
			parentName: env.APP_PARENT_NAME,
			parentUrl: env.APP_PARENT_URL,
			chartColors: DEFAULT_CHART_COLORS
		}
	};
}
/**
* Whitelabel deployment factory.
*
* Creates a Deployment with whitelabel-specific branding and feature flags.
* Auth is fully handled by better-auth (SSO via sso() plugin, org sync
* via auth-hooks.ts databaseHooks).
*/
function createOnboardingRedirectUrl(template) {
	if (!template) return void 0;
	return (brandId) => template.replace("{brandId}", brandId);
}
function parseChartColors(raw) {
	if (!raw) return void 0;
	const colors = raw.split(",").map((c) => c.trim()).filter(Boolean);
	return colors.length > 0 ? colors : void 0;
}
function createWhitelabelDeployment(options) {
	const { env } = options;
	const requiredEnv = requireEnvVars([
		"VITE_APP_NAME",
		"VITE_APP_ICON",
		"VITE_APP_URL",
		"VITE_OPTIMIZATION_URL_TEMPLATE"
	], env);
	return {
		mode: "whitelabel",
		features: {
			readOnly: false,
			showOptimizeButton: true,
			canCreateBrands: false,
			selfServeSignup: false,
			billing: false,
			reportGeneration: true,
			teamInvites: false
		},
		branding: {
			name: requiredEnv.VITE_APP_NAME,
			icon: requiredEnv.VITE_APP_ICON,
			url: requiredEnv.VITE_APP_URL,
			parentName: env.VITE_APP_PARENT_NAME,
			parentUrl: env.VITE_APP_PARENT_URL,
			onboardingRedirectUrl: createOnboardingRedirectUrl(env.VITE_ONBOARDING_REDIRECT_URL_TEMPLATE),
			onboardingRedirectUrlTemplate: env.VITE_ONBOARDING_REDIRECT_URL_TEMPLATE,
			optimizationUrlTemplate: requiredEnv.VITE_OPTIMIZATION_URL_TEMPLATE,
			chartColors: parseChartColors(env.VITE_CHART_COLORS) ?? DEFAULT_CHART_COLORS
		}
	};
}
/**
* Server-only deployment factory.
*
* Reads DEPLOYMENT_MODE from the environment and creates a Deployment
* configuration object. The Deployment is now purely static config
* (mode, features, branding) — all auth is handled by better-auth.
*
* The singleton is cached at module scope. On Vercel serverless this
* persists across warm invocations, which is safe because the
* Deployment object contains no request-scoped state.
*
* Factories are imported from their component-free entry points so this
* module (and anything that imports getDeployment) stays Node-safe — the
* worker builds a Deployment without pulling in the React OptimizeButton.
*/
var cached = null;
function getDeployment$1(options) {
	if (cached) return cached;
	const env = options?.env ?? process.env;
	switch (getDeploymentModeFromEnv(env)) {
		case "local":
			cached = createLocalDeployment(env);
			break;
		case "demo":
			cached = createLocalDeployment({
				...env,
				READ_ONLY: "true"
			});
			break;
		case "whitelabel":
			cached = createWhitelabelDeployment({ env });
			break;
		case "cloud": cached = createCloudDeployment(env);
	}
	return cached;
}
/**
* Server-side deployment accessor for the TanStack Start app.
*
* Thin wrapper around @workspace/deployment's getDeployment().
* All auth is handled by better-auth — the Deployment is pure config.
*/
function getDeployment(env = process.env) {
	return getDeployment$1({ env });
}
//#endregion
export { getDeployment as t };

//# sourceMappingURL=server-B0rVTxL5.mjs.map