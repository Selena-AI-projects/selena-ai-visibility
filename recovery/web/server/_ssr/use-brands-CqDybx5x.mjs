import { i as useQueryClient, n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { y as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as getBrand, s as getCompetitors } from "./brands-Djh0ZZPk.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-brands-CqDybx5x.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "6c0067e2-4de1-4372-9da7-3ca003ed7d2a", e._sentryDebugIdIdentifier = "sentry-dbid-6c0067e2-4de1-4372-9da7-3ca003ed7d2a");
	} catch (e) {}
})();
var brandKeys = {
	all: ["brands"],
	list: () => [...brandKeys.all, "list"],
	detail: (brandId) => [
		...brandKeys.all,
		"detail",
		brandId
	],
	competitors: (brandId) => [
		...brandKeys.all,
		"competitors",
		brandId
	]
};
/**
* Get a single brand by ID.
* If no brandId provided, extracts from route params.
*/
function useBrand(brandId) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: brandKeys.detail(resolvedBrandId || ""),
		queryFn: () => getBrand({ data: { brandId: resolvedBrandId } }),
		enabled: !!resolvedBrandId,
		staleTime: 3e4,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true
	});
	const revalidate = async () => {
		await query.refetch();
		queryClient.invalidateQueries({ queryKey: brandKeys.list() });
	};
	return {
		brandId: resolvedBrandId,
		brand: query.data,
		isLoading: query.isLoading,
		isError: query.error,
		revalidate
	};
}
/**
* Get competitors for a brand
*/
function useCompetitors(brandId) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: brandKeys.competitors(resolvedBrandId || ""),
		queryFn: () => getCompetitors({ data: { brandId: resolvedBrandId } }),
		enabled: !!resolvedBrandId,
		staleTime: 3e4,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true
	});
	return {
		competitors: query.data || [],
		isLoading: query.isLoading,
		isError: query.error,
		revalidate: query.refetch
	};
}
//#endregion
export { useBrand as n, useCompetitors as r, brandKeys as t };

//# sourceMappingURL=use-brands-CqDybx5x.mjs.map