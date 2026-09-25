import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object, c as _enum } from "../_libs/zod.mjs";
import { c as refreshCredentialOverlay, o as getCredential, s as getKeyring, t as EncryptionKeyError, u as storeCredential } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { c as requireAuthSession, i as isAdmin } from "./helpers-phr0Aqka.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/provider-credentials-B5sk44ym.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "c39fb524-956d-4319-aa3a-bf88f459e945", e._sentryDebugIdIdentifier = "sentry-dbid-c39fb524-956d-4319-aa3a-bf88f459e945");
	} catch (e) {}
})();
var SYSTEM_CREDENTIALS = { BRIGHT_DATA_SERP: "BRIGHTDATA_API_TOKEN" };
function getPublicProviderCredentialStatus(provider, resolveCredential = getCredential) {
	const name = SYSTEM_CREDENTIALS[provider];
	if (!name) return "OAUTH_REQUIRED";
	return resolveCredential(name) ? "PRESENT" : "MISSING";
}
var MANAGED_PUBLIC_PROVIDERS = ["BRIGHT_DATA_SERP"];
var providerSchema = _enum(MANAGED_PUBLIC_PROVIDERS);
var credentialByProvider = { BRIGHT_DATA_SERP: "BRIGHTDATA_API_TOKEN" };
async function requireAdmin() {
	const session = await requireAuthSession();
	if (!isAdmin(session)) throw new Error("Unauthorized: Admin access required");
}
function getStorageStatus() {
	try {
		return getKeyring() ? "READY" : "MISSING";
	} catch (error) {
		if (error instanceof EncryptionKeyError) return "INVALID";
		throw error;
	}
}
var getProviderCredentialStatusFn_createServerFn_handler = createServerRpc({
	id: "972a8e5d4f6e57855554eb2821225b8023c7854c5c559b2601437f7f6c81135d",
	name: "getProviderCredentialStatusFn",
	filename: "src/server/provider-credentials.ts"
}, (opts) => getProviderCredentialStatusFn.__executeServer(opts));
var getProviderCredentialStatusFn = createServerFn({ method: "GET" }).handler(getProviderCredentialStatusFn_createServerFn_handler, async () => {
	await requireAdmin();
	const storage = getStorageStatus();
	if (storage === "READY") try {
		await refreshCredentialOverlay();
	} catch {
		throw new Error("Credential status is temporarily unavailable");
	}
	return {
		storage,
		providers: MANAGED_PUBLIC_PROVIDERS.map((provider) => ({
			provider,
			status: getPublicProviderCredentialStatus(provider)
		}))
	};
});
var saveProviderCredentialFn_createServerFn_handler = createServerRpc({
	id: "03b88e37001905638dad66a6dd260f2297960819bd264941c2725ec46e5da20a",
	name: "saveProviderCredentialFn",
	filename: "src/server/provider-credentials.ts"
}, (opts) => saveProviderCredentialFn.__executeServer(opts));
var saveProviderCredentialFn = createServerFn({ method: "POST" }).validator(object({
	provider: providerSchema,
	credential: string().trim().min(8).max(4096)
})).handler(saveProviderCredentialFn_createServerFn_handler, async ({ data }) => {
	await requireAdmin();
	if (getStorageStatus() !== "READY") throw new Error("Encrypted credential storage is not configured");
	try {
		const { runtimeRefreshed } = await storeCredential(credentialByProvider[data.provider], data.credential);
		return {
			provider: data.provider,
			status: "PRESENT",
			runtimeRefreshed
		};
	} catch (error) {
		if (error instanceof EncryptionKeyError) throw new Error("Encrypted credential storage is not configured");
		throw new Error("Credential could not be stored");
	}
});
//#endregion
export { getProviderCredentialStatusFn_createServerFn_handler, saveProviderCredentialFn_createServerFn_handler };

//# sourceMappingURL=provider-credentials-B5sk44ym.mjs.map