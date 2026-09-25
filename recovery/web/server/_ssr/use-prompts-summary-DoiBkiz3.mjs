import { i as useQueryClient, n as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { y as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getPromptsSummaryFn } from "./prompts-C2FXcuMy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-prompts-summary-DoiBkiz3.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "f73ec12c-9706-459c-a011-9e9a7daa4962", e._sentryDebugIdIdentifier = "sentry-dbid-f73ec12c-9706-459c-a011-9e9a7daa4962");
	} catch (e) {}
})();
var promptsSummaryKeys = {
	all: ["prompts-summary"],
	list: (brandId, filters) => [
		...promptsSummaryKeys.all,
		brandId,
		filters
	]
};
function usePromptsSummary(brandId, filters) {
	const params = useParams({ strict: false });
	const resolvedBrandId = brandId || params.brand;
	const query = useQuery({
		queryKey: promptsSummaryKeys.list(resolvedBrandId || "", filters),
		queryFn: () => getPromptsSummaryFn({ data: {
			brandId: resolvedBrandId,
			lookback: filters?.lookback || "1m",
			webSearchEnabled: filters?.webSearchEnabled?.toString(),
			model: filters?.model,
			tags: filters?.tags?.join(",")
		} }),
		enabled: !!resolvedBrandId,
		staleTime: 3e4,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		refetchInterval: 6e4,
		placeholderData: (prev) => prev
	});
	return {
		promptsSummary: query.data,
		isLoading: query.isLoading,
		isValidating: query.isFetching,
		isError: query.error,
		revalidate: query.refetch
	};
}
/**
* Hook to get an invalidation function for prompts summary cache.
* Call at the top level of a component, then invoke the returned function in handlers.
*/
function useInvalidatePromptsSummary() {
	const queryClient = useQueryClient();
	return (brandId) => {
		queryClient.invalidateQueries({ queryKey: [...promptsSummaryKeys.all, brandId] });
	};
}
//#endregion
export { useInvalidatePromptsSummary as n, usePromptsSummary as r, promptsSummaryKeys as t };

//# sourceMappingURL=use-prompts-summary-DoiBkiz3.mjs.map