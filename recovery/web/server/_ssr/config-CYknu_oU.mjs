import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { n as getDefaultDelayHours } from "./constants-BDRQAb6s.mjs";
import { t as countUsers } from "./provisioning-ClYiUXoH.mjs";
import { r as getEnvValidationState } from "./env-D9tfoX6E.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { t as getDeployment } from "./server-B0rVTxL5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/config-CYknu_oU.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "648cccb7-1ead-4b7d-8c61-b0e8a713762e", e._sentryDebugIdIdentifier = "sentry-dbid-648cccb7-1ead-4b7d-8c61-b0e8a713762e");
	} catch (e) {}
})();
/**
* Server functions for providing deployment configuration to the client.
*/
/**
* Get the client-safe deployment configuration.
* This server function is called in the root route's loader
* so the config is available to all routes via context.
*
* IMPORTANT: The return value must be fully serializable (no functions, classes, etc.).
* BrandingConfig.onboardingRedirectUrl is a function, so we strip it and send the
* raw template string instead. The client can reconstruct the function if needed.
*/
var POSTHOG_PUBLIC_KEY = "phc_Jhx9LnI9cTDFHpQmpOzJSDTW127qD9pFU65KRnYym6z";
function resolvePosthogKey() {
	if (process.env.DISABLE_TELEMETRY) return void 0;
	return process.env.VITE_POSTHOG_KEY ?? POSTHOG_PUBLIC_KEY;
}
var getClientConfig_createServerFn_handler = createServerRpc({
	id: "fd6f788a04c64578f4b3dc50713eef6d60c9ac92cd1a7cad730ec6f27f0139ac",
	name: "getClientConfig",
	filename: "src/server/config.ts"
}, (opts) => getClientConfig.__executeServer(opts));
var getClientConfig = createServerFn({ method: "GET" }).handler(getClientConfig_createServerFn_handler, async () => {
	const deployment = getDeployment();
	const { onboardingRedirectUrl, ...serializableBranding } = deployment.branding;
	const hasUsers = await countUsers() > 0;
	const canRegister = deployment.features.selfServeSignup || deployment.mode === "local" && !hasUsers;
	return {
		mode: deployment.mode,
		features: deployment.features,
		branding: serializableBranding,
		analytics: {
			plausibleDomain: process.env.VITE_PLAUSIBLE_DOMAIN,
			clarityProjectId: process.env.VITE_CLARITY_PROJECT_ID,
			posthogKey: resolvePosthogKey()
		},
		defaultDelayHours: getDefaultDelayHours(),
		canRegister,
		hasUsers
	};
});
var getEnvValidationStateFn_createServerFn_handler = createServerRpc({
	id: "a8feb3ed6b5610aac78911027a733e7275b662d1dc3f8e930895fe94aa950014",
	name: "getEnvValidationStateFn",
	filename: "src/server/config.ts"
}, (opts) => getEnvValidationStateFn.__executeServer(opts));
var getEnvValidationStateFn = createServerFn({ method: "GET" }).handler(getEnvValidationStateFn_createServerFn_handler, async () => {
	const envState = getEnvValidationState();
	return {
		mode: envState.mode,
		missing: envState.missing,
		isValid: envState.isValid
	};
});
//#endregion
export { getClientConfig_createServerFn_handler, getEnvValidationStateFn_createServerFn_handler };

//# sourceMappingURL=config-CYknu_oU.mjs.map