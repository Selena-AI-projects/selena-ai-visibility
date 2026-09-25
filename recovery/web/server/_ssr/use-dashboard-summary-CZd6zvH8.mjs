import { n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { y as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { D as number, M as string, O as object, c as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-dashboard-summary-CZd6zvH8.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "79435ed3-94b5-4de1-a8d6-61dbc8d0881e", e._sentryDebugIdIdentifier = "sentry-dbid-79435ed3-94b5-4de1-a8d6-61dbc8d0881e");
	} catch (e) {}
})();
/**
* Server functions for citation data.
* Replaces apps/web/src/app/api/brands/[id]/citations/route.ts
*/
/**
* Get citation statistics for a brand
*/
var getCitationsFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	days: number().optional().default(7),
	tags: string().optional(),
	model: string().optional()
})).handler(createSsrRpc("5641d455e2edf9b119c506bec5c19457cb537c15c6e0ba75dbd5946581f3a460"));
var citationKeys = {
	all: ["citations"],
	list: (brandId, filters) => [
		...citationKeys.all,
		brandId,
		filters
	]
};
function useCitations(brandId, filters) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: citationKeys.list(resolvedBrandId || "", filters),
		queryFn: () => getCitationsFn({ data: {
			brandId: resolvedBrandId,
			days: filters?.days || 7,
			tags: filters?.tags?.join(","),
			model: filters?.model
		} }),
		enabled: !!resolvedBrandId,
		staleTime: 3e4,
		refetchOnWindowFocus: true,
		refetchInterval: 6e4,
		placeholderData: (prev) => prev
	});
	return {
		citations: query.data,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.error,
		revalidate: query.refetch
	};
}
/**
* Server functions for dashboard data.
* Replaces apps/web/src/app/api/brands/[id]/dashboard-summary/route.ts
*/
/**
* Get dashboard summary with visibility and citation time series.
*/
var getDashboardSummaryFn = createServerFn({ method: "GET" }).validator(object({
	brandId: string(),
	lookback: _enum([
		"1w",
		"1m",
		"3m",
		"6m",
		"1y",
		"all"
	]).default("1m"),
	timezone: string().default("UTC")
})).handler(createSsrRpc("11c2deba98af4895020c451e07332ccef0c715ea70da26df5ac1b0c1ffca90d7"));
var dashboardKeys = {
	all: ["dashboard"],
	summary: (brandId, lookback) => [
		...dashboardKeys.all,
		"summary",
		brandId,
		lookback
	]
};
function useDashboardSummary(brandId, lookback = "1m") {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: dashboardKeys.summary(resolvedBrandId || "", lookback),
		queryFn: () => getDashboardSummaryFn({ data: {
			brandId: resolvedBrandId,
			lookback,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		} }),
		enabled: !!resolvedBrandId,
		staleTime: 3e4,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		refetchInterval: 6e4,
		placeholderData: (prev) => prev
	});
	return {
		dashboardSummary: query.data,
		isLoading: query.isLoading,
		isError: query.error,
		revalidate: query.refetch
	};
}
//#endregion
export { useDashboardSummary as i, dashboardKeys as n, useCitations as r, citationKeys as t };

//# sourceMappingURL=use-dashboard-summary-CZd6zvH8.mjs.map