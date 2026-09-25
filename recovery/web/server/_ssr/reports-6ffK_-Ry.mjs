import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { M as string, O as object } from "../_libs/zod.mjs";
import { d as and, f as eq, u as desc } from "../_libs/drizzle-orm.mjs";
import { f as reports } from "./schema-ejW7s7Gs.mjs";
import { t as db } from "./db-DcHqq7B9.mjs";
import { n as cleanUrl } from "./onboarding-D7p0ZNRK.mjs";
import { a as sendReportJob } from "./job-scheduler-PGB1J6XT.mjs";
import { t as createServerRpc } from "./createServerRpc-CV4epehf.mjs";
import { a as listUserOrganizations, c as requireAuthSession, i as isAdmin, r as hasReportAccess } from "./helpers-phr0Aqka.mjs";
import { t as withOrganizationTransaction } from "./organization-transaction-CKHq9ko_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-6ffK_-Ry.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "7895fab1-fd4f-470b-9d1f-ad906f76df30", e._sentryDebugIdIdentifier = "sentry-dbid-7895fab1-fd4f-470b-9d1f-ad906f76df30");
	} catch (e) {}
})();
/**
* Server functions for report operations.
* Replaces apps/web/src/app/api/reports/route.ts
*/
/**
* DS-P0-15: reports are scoped to the caller's organization. The session's
* active organization wins; without one, the user's first membership does —
* the same resolution the Selena auth context uses.
*/
async function requireReportAccess() {
	const session = await requireAuthSession();
	if (!hasReportAccess(session)) throw new Error("Access denied. Report generator access required.");
	const activeOrg = session.session.activeOrganizationId;
	const memberships = await listUserOrganizations(session.user.id);
	const membership = activeOrg ? memberships.find((org) => org.id === activeOrg) : memberships[0];
	if (!membership) throw new Error("Forbidden: no organization membership");
	return { organizationId: membership.id };
}
/**
* Legacy rows (organization_id NULL) predate scoping and have no recoverable
* owner; they stay behind an explicit admin-only path, never the customer one.
*/
async function requireAdminForLegacyReports() {
	const session = await requireAuthSession();
	if (!isAdmin(session)) throw new Error("Access denied. Admin access required.");
}
/**
* Get all reports
*/
var getReportsFn_createServerFn_handler = createServerRpc({
	id: "380a1c66f4d0b8ba1bceb3fb7fa8734bb01819c4a70b3f9cfa333dc0a6563765",
	name: "getReportsFn",
	filename: "src/server/reports.ts"
}, (opts) => getReportsFn.__executeServer(opts));
var getReportsFn = createServerFn({ method: "GET" }).handler(getReportsFn_createServerFn_handler, async () => {
	const { organizationId } = await requireReportAccess();
	return withOrganizationTransaction(db, organizationId, (tx) => tx.select({
		id: reports.id,
		brandName: reports.brandName,
		brandWebsite: reports.brandWebsite,
		status: reports.status,
		createdAt: reports.createdAt,
		completedAt: reports.completedAt,
		updatedAt: reports.updatedAt
	}).from(reports).where(eq(reports.organizationId, organizationId)).orderBy(desc(reports.createdAt)));
});
var getLegacyReportsFn_createServerFn_handler = createServerRpc({
	id: "1053c4d7198ae4130e72397e46287cf930b56fc95ec5a94bc6e6e2dc749fb1aa",
	name: "getLegacyReportsFn",
	filename: "src/server/reports.ts"
}, (opts) => getLegacyReportsFn.__executeServer(opts));
var getLegacyReportsFn = createServerFn({ method: "GET" }).handler(getLegacyReportsFn_createServerFn_handler, async () => {
	await requireAdminForLegacyReports();
	throw new Error("LEGACY_REPORT_OWNER_ROLE_REQUIRED");
});
var getReportByIdFn_createServerFn_handler = createServerRpc({
	id: "24b6f752febe198fa42cec9ab22cff32478b02ba2102e9258f68fb5db5626108",
	name: "getReportByIdFn",
	filename: "src/server/reports.ts"
}, (opts) => getReportByIdFn.__executeServer(opts));
var getReportByIdFn = createServerFn({ method: "GET" }).validator(object({ reportId: string() })).handler(getReportByIdFn_createServerFn_handler, async ({ data }) => {
	const { organizationId } = await requireReportAccess();
	const result = await withOrganizationTransaction(db, organizationId, (tx) => tx.select().from(reports).where(and(eq(reports.id, data.reportId), eq(reports.organizationId, organizationId))).limit(1));
	if (result.length === 0) throw new Error("Report not found");
	const report = result[0];
	return {
		...report,
		rawOutput: report.rawOutput
	};
});
var createReportFn_createServerFn_handler = createServerRpc({
	id: "58a541b4103d51938841af7f67f87bec4271776f21a07941660043ee4d51887e",
	name: "createReportFn",
	filename: "src/server/reports.ts"
}, (opts) => createReportFn.__executeServer(opts));
var createReportFn = createServerFn({ method: "POST" }).validator(object({
	brandName: string().min(1),
	brandWebsite: string().min(1).refine((website) => cleanUrl(website) !== "", "Enter a valid domain or http(s) website URL"),
	manualPrompts: string().optional()
})).handler(createReportFn_createServerFn_handler, async ({ data }) => {
	const { organizationId } = await requireReportAccess();
	const parsedManualPrompts = [];
	if (data.manualPrompts?.trim()) parsedManualPrompts.push(...data.manualPrompts.split("\n").map((line) => line.trim()).filter((line) => line.length > 0));
	const newReport = {
		brandName: data.brandName.trim(),
		brandWebsite: cleanUrl(data.brandWebsite),
		organizationId,
		status: "pending"
	};
	const createdReport = (await withOrganizationTransaction(db, organizationId, (tx) => tx.insert(reports).values(newReport).returning()))[0];
	if (!createdReport) throw new Error("Failed to create report");
	try {
		if (!await sendReportJob(createdReport.id, createdReport.brandName, createdReport.brandWebsite, parsedManualPrompts.length > 0 ? parsedManualPrompts : void 0)) throw new Error("Failed to send report job");
	} catch {
		await withOrganizationTransaction(db, organizationId, async (tx) => {
			await tx.update(reports).set({
				status: "failed",
				updatedAt: /* @__PURE__ */ new Date()
			}).where(and(eq(reports.id, createdReport.id), eq(reports.organizationId, organizationId)));
		});
		throw new Error("Failed to queue report generation");
	}
	return {
		...createdReport,
		rawOutput: createdReport.rawOutput
	};
});
//#endregion
export { createReportFn_createServerFn_handler, getLegacyReportsFn_createServerFn_handler, getReportByIdFn_createServerFn_handler, getReportsFn_createServerFn_handler };

//# sourceMappingURL=reports-6ffK_-Ry.mjs.map