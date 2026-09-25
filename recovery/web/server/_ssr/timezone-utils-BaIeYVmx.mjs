//#region node_modules/.nitro/vite/services/ssr/assets/timezone-utils-BaIeYVmx.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "0232eb2a-0855-4c91-bf83-09a6b065c530", e._sentryDebugIdIdentifier = "sentry-dbid-0232eb2a-0855-4c91-bf83-09a6b065c530");
	} catch (e) {}
})();
function resolveTimezone(timezoneParam, resolvedFallback) {
	if (timezoneParam) try {
		Intl.DateTimeFormat("en-CA", { timeZone: timezoneParam });
		return timezoneParam;
	} catch {}
	return (resolvedFallback ?? (() => {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone;
		} catch {
			return;
		}
	})()) || "UTC";
}
function shiftDateStr(dateStr, delta) {
	const [yearStr, monthStr, dayStr] = dateStr.split("-");
	const year = Number(yearStr);
	const monthIndex = Number(monthStr) - 1;
	const day = Number(dayStr);
	let targetYear = year + (delta.years ?? 0);
	let targetMonthIndex = monthIndex + (delta.months ?? 0);
	if (targetMonthIndex < 0 || targetMonthIndex > 11) {
		const yearDelta = Math.floor(targetMonthIndex / 12);
		targetYear += yearDelta;
		targetMonthIndex = (targetMonthIndex % 12 + 12) % 12;
	}
	const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
	const clampedDay = Math.min(day, lastDayOfTargetMonth);
	const date = new Date(Date.UTC(targetYear, targetMonthIndex, clampedDay));
	if (delta.days) date.setUTCDate(date.getUTCDate() + delta.days);
	return date.toISOString().slice(0, 10);
}
function getTimezoneLookbackRange(lookback, timezone, options) {
	const todayStr = (options?.now ?? /* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: timezone });
	if (lookback === "all") {
		if (options?.allStrategy === "1y") return {
			fromDateStr: shiftDateStr(todayStr, { years: -1 }),
			toDateStr: todayStr
		};
		return {
			fromDateStr: null,
			toDateStr: null
		};
	}
	switch (lookback) {
		case "1w": return {
			fromDateStr: shiftDateStr(todayStr, { days: -6 }),
			toDateStr: todayStr
		};
		case "1m": return {
			fromDateStr: shiftDateStr(todayStr, { months: -1 }),
			toDateStr: todayStr
		};
		case "3m": return {
			fromDateStr: shiftDateStr(todayStr, { months: -3 }),
			toDateStr: todayStr
		};
		case "6m": return {
			fromDateStr: shiftDateStr(todayStr, { months: -6 }),
			toDateStr: todayStr
		};
		case "1y": return {
			fromDateStr: shiftDateStr(todayStr, { years: -1 }),
			toDateStr: todayStr
		};
	}
}
//#endregion
export { resolveTimezone as n, getTimezoneLookbackRange as t };

//# sourceMappingURL=timezone-utils-BaIeYVmx.mjs.map