import { t as SYSTEM_TAGS } from "./schema-ejW7s7Gs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tag-utils-C10EeA61.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a4495a19-d1eb-4e75-b636-c087fd7c508a", e._sentryDebugIdIdentifier = "sentry-dbid-a4495a19-d1eb-4e75-b636-c087fd7c508a");
	} catch (e) {}
})();
Object.values(SYSTEM_TAGS);
/**
* Determine the effective branded status for a prompt, considering user tag overrides.
*
* Rules:
* - If user tags contain "branded" (and not "unbranded"), treat as branded
* - If user tags contain "unbranded" (and not "branded"), treat as unbranded
* - If user tags contain both "branded" and "unbranded", use the system tag
* - If user tags contain neither, use the system tag
*
* All comparisons are case-insensitive.
*/
function getEffectiveBrandedStatus(systemTags, userTags) {
	const systemTagsLower = systemTags.map((t) => t.toLowerCase());
	const userTagsLower = userTags.map((t) => t.toLowerCase());
	const systemIsBranded = systemTagsLower.includes(SYSTEM_TAGS.BRANDED);
	const hasBrandedUserTag = userTagsLower.includes(SYSTEM_TAGS.BRANDED);
	const hasUnbrandedUserTag = userTagsLower.includes(SYSTEM_TAGS.UNBRANDED);
	if (hasBrandedUserTag && !hasUnbrandedUserTag) return {
		isBranded: true,
		isOverridden: !systemIsBranded,
		systemIsBranded
	};
	if (hasUnbrandedUserTag && !hasBrandedUserTag) return {
		isBranded: false,
		isOverridden: systemIsBranded,
		systemIsBranded
	};
	return {
		isBranded: systemIsBranded,
		isOverridden: false,
		systemIsBranded
	};
}
/**
* Check if a prompt text is "branded" (contains the brand name or domain)
*/
function isPromptBranded(promptValue, brandName, brandWebsite) {
	const promptLower = promptValue.toLowerCase();
	const brandNameLower = brandName.toLowerCase();
	try {
		const domain = new URL(brandWebsite.startsWith("http") ? brandWebsite : `https://${brandWebsite}`).hostname.replace(/^www\./, "").toLowerCase();
		const domainWithoutTld = domain.split(".")[0];
		return promptLower.includes(brandNameLower) || promptLower.includes(domain) || promptLower.includes(domainWithoutTld);
	} catch {
		return promptLower.includes(brandNameLower);
	}
}
/**
* Compute system tags for a prompt based on its content
*/
function computeSystemTags(promptValue, brandName, brandWebsite) {
	return [isPromptBranded(promptValue, brandName, brandWebsite) ? SYSTEM_TAGS.BRANDED : SYSTEM_TAGS.UNBRANDED];
}
/**
* Normalize a tag (lowercase, trimmed)
*/
function normalizeTag(tag) {
	return tag.toLowerCase().trim();
}
/**
* Sanitize user tags - normalize and dedupe.
* Note: "branded" and "unbranded" are allowed as user tags to override system-computed values.
*/
function sanitizeUserTags(tags) {
	return tags.map(normalizeTag).filter((tag) => tag.length > 0).filter((tag, index, self) => self.indexOf(tag) === index);
}
//#endregion
export { getEffectiveBrandedStatus as n, sanitizeUserTags as r, computeSystemTags as t };

//# sourceMappingURL=tag-utils-C10EeA61.mjs.map