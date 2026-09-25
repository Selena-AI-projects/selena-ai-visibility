import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Skeleton } from "./skeleton-BcIvnIuu.mjs";
import { A as CircleCheck, D as Clock, N as ChevronRight, P as ChevronDown, R as Activity, _ as Play, b as LoaderCircle, d as Server, h as RefreshCw, k as CircleX, n as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, s as DialogTrigger, t as Dialog } from "./dialog-BmGdp57D.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-wJUKCpVc.mjs";
import { a as retryJobFn, i as getWorkflowDataFn, r as getJobLogsFn } from "./admin-BGFhkJzE.mjs";
import { t as Progress } from "./progress-DJY9He7H.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workflows-YZc_oQ8c.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "66cf9c18-430b-442d-b88d-2e8cbe4affad", e._sentryDebugIdIdentifier = "sentry-dbid-66cf9c18-430b-442d-b88d-2e8cbe4affad");
	} catch (e) {}
})();
/**
* /admin/workflows - Monitor prompt scheduling, job execution, and worker health
*/
function formatDuration(ms) {
	const seconds = Math.floor(ms / 1e3);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);
	if (weeks > 0) {
		const remainingDays = days % 7;
		return remainingDays > 0 ? `${weeks}w ${remainingDays}d` : `${weeks}w`;
	}
	if (days > 0) {
		const remainingHours = hours % 24;
		return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
	}
	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
	}
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
}
function formatRelativeTime(dateStr) {
	if (!dateStr) return "Never";
	const date = new Date(dateStr);
	return `${formatDuration((/* @__PURE__ */ new Date()).getTime() - date.getTime())} ago`;
}
function formatFutureTime(timestamp) {
	if (!timestamp) return "Unknown";
	const diffMs = timestamp - Date.now();
	if (diffMs < 0) return "Overdue";
	return `in ${formatDuration(diffMs)}`;
}
function QueueStatsCard({ stats, title }) {
	const hasIssues = stats.failed > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: hasIssues ? "border-amber-500/50" : "",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "pb-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "text-sm font-medium flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Server, { className: "h-4 w-4" }), title]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "pg-boss Job Queue Status" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-3 gap-4 text-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					title: "Jobs waiting to be picked up by a worker",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground",
						children: "Created"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xl font-semibold text-blue-600",
						children: stats.created
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					title: "Jobs currently being processed",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground",
						children: "Active"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xl font-semibold text-emerald-600",
						children: stats.active
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					title: "Jobs waiting to be retried after failure",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground",
						children: "Retry"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xl font-semibold text-amber-600",
						children: stats.retry
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Completed"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xl font-semibold",
					children: stats.completed.toLocaleString()
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Failed"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `text-xl font-semibold ${stats.failed > 0 ? "text-red-600" : ""}`,
					children: stats.failed
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Total Pending"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xl font-semibold text-violet-600",
					children: stats.totalPending
				})] })
			]
		}) })]
	});
}
function SchedulerCell({ info }) {
	if (!info.exists) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-muted-foreground text-xs",
		children: "—"
	});
	const nextText = info.nextRunAt ? formatFutureTime(info.nextRunAt) : "Unknown";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-col gap-0.5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-xs font-medium",
			children: ["Next: ", nextText]
		})
	});
}
/** Whether any target of an enabled prompt has missed its cadence. */
function isPromptStuck(prompt) {
	return prompt.enabled && Object.values(prompt.lastRunsByTarget).some((status) => status?.isOverdue);
}
function TargetStatus({ status }) {
	if (!status) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-muted-foreground",
		children: "-"
	});
	const lastRunText = status.lastRunAt ? formatRelativeTime(status.lastRunAt) : "Never";
	if (status.isOverdue) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-0.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3 w-3 text-amber-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-amber-600 text-xs",
				children: lastRunText
			})]
		}), status.overdueByMs && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-red-500 text-xs",
			children: [
				"(+",
				formatDuration(status.overdueByMs),
				")"
			]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3 text-emerald-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-emerald-600 text-xs",
			children: lastRunText
		})]
	});
}
function RetryButton({ promptId, onSuccess }) {
	const [isLoading, setIsLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [success, setSuccess] = (0, import_react.useState)(false);
	const handleRetry = async () => {
		setIsLoading(true);
		setError(null);
		setSuccess(false);
		try {
			await retryJobFn({ data: { promptId } });
			setSuccess("queued");
			setTimeout(() => onSuccess(), 1e3);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to retry");
		} finally {
			setIsLoading(false);
		}
	};
	if (success) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		size: "sm",
		variant: "outline",
		disabled: true,
		className: "cursor-default",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3 mr-1 text-emerald-500" }), success === "recreated" ? "Scheduler Reset" : "Queued"]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			size: "sm",
			variant: "outline",
			onClick: handleRetry,
			disabled: isLoading,
			className: "cursor-pointer text-xs",
			children: [isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3 w-3 mr-1 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-3 w-3 mr-1" }), "Retry"]
		}), error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs text-red-500",
			children: error
		})]
	});
}
function JobDetailsDialog({ job, onRetrySuccess }) {
	const isFailed = job.status === "failed";
	const [isOpen, setIsOpen] = (0, import_react.useState)(false);
	const [logs, setLogs] = (0, import_react.useState)([]);
	const [logsLoading, setLogsLoading] = (0, import_react.useState)(false);
	const [logsError, setLogsError] = (0, import_react.useState)(null);
	const [retryLoading, setRetryLoading] = (0, import_react.useState)(false);
	const [retryError, setRetryError] = (0, import_react.useState)(null);
	const [retrySuccess, setRetrySuccess] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (isOpen && job.id) {
			setLogsLoading(true);
			setLogsError(null);
			getJobLogsFn({ data: { jobId: job.id } }).then((data) => setLogs(data.logs || [])).catch((err) => setLogsError(err.message)).finally(() => setLogsLoading(false));
		}
	}, [isOpen, job.id]);
	const handleRetry = async () => {
		setRetryLoading(true);
		setRetryError(null);
		setRetrySuccess(false);
		try {
			await retryJobFn({ data: {
				jobId: job.id,
				promptId: job.data?.promptId
			} });
			setRetrySuccess(true);
			setTimeout(() => {
				setIsOpen(false);
				onRetrySuccess?.();
			}, 1e3);
		} catch (err) {
			setRetryError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setRetryLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open: isOpen,
		onOpenChange: setIsOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "sm",
				className: `cursor-pointer ${isFailed ? "text-red-600 hover:text-red-700" : "text-muted-foreground hover:text-foreground"}`,
				children: "View Logs"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-[90vw] sm:max-w-[90vw] w-full max-h-[80vh] overflow-y-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
				className: "flex items-center gap-2",
				children: [isFailed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-5 w-5 text-red-500" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-5 w-5 text-emerald-500" }), isFailed ? "Failed Job Details" : "Completed Job Details"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: ["Job ID: ", job.id] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-4 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-muted-foreground",
								children: "Status"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								className: isFailed ? "bg-red-500" : "bg-emerald-600",
								children: job.status
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-muted-foreground",
								children: "Prompt ID"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs",
								children: job.data?.promptId || "N/A"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-muted-foreground",
								children: "Finished At"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: job.finishedOn ? new Date(job.finishedOn).toLocaleString() : "Unknown" })] })
						]
					}),
					isFailed && job.failedReason && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground mb-1",
						children: "Error Message"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800",
						children: job.failedReason
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground mb-1",
						children: "Execution Logs"
					}), logsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-sm text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), "Loading logs..."]
					}) : logsError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800",
						children: ["Error loading logs: ", logsError]
					}) : logs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "bg-muted rounded p-3 text-xs overflow-x-auto max-h-80 whitespace-pre-wrap",
						children: logs.join("\n")
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground italic",
						children: "No logs available"
					})] }),
					isFailed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-3 pt-2 border-t",
						children: retrySuccess ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-emerald-600",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Job queued for retry" })]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: handleRetry,
							disabled: retryLoading,
							className: "cursor-pointer",
							children: [retryLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-4 w-4 mr-2" }), "Retry This Job"]
						}), retryError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-red-600",
							children: retryError
						})] })
					})
				]
			})]
		})]
	});
}
function BrandRow({ brand, isExpanded, onToggle, recentJobs, onRefresh }) {
	const hasOverdue = brand.overduePrompts > 0;
	const scheduleHealth = brand.enabledPrompts > 0 ? Math.round(brand.onSchedulePrompts / brand.enabledPrompts * 100) : 100;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
		className: `cursor-pointer hover:bg-muted/50 ${hasOverdue ? "bg-amber-50/50" : ""}`,
		onClick: onToggle,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app/$brand",
					params: { brand: brand.brandId },
					className: "font-medium text-primary hover:underline",
					onClick: (e) => e.stopPropagation(),
					children: brand.brandName
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: brand.website
				})] })]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				className: "text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium",
						children: brand.enabledPrompts
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted-foreground",
						children: ["/", brand.totalPrompts]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				className: "text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm",
					children: formatDuration(brand.runFrequencyMs)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				className: "text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
						value: scheduleHealth,
						className: "w-20 h-2"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: `text-sm font-medium ${scheduleHealth < 80 ? "text-amber-600" : "text-emerald-600"}`,
						children: [scheduleHealth, "%"]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				className: "text-center",
				children: brand.overduePrompts > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					variant: "destructive",
					className: "bg-amber-500",
					children: [brand.overduePrompts, " overdue"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: "secondary",
					className: "bg-emerald-100 text-emerald-700",
					children: "All on schedule"
				})
			})
		]
	}), isExpanded && brand.prompts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
		colSpan: 5,
		className: "bg-muted/30 p-0",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "w-[250px]",
					children: "Prompt"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: "Status"
				}),
				brand.targetColumns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: column.label
				}, column.key)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: "Prod Scheduler"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: "Last Job"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: "Actions"
				})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: [...brand.prompts].sort((a, b) => {
				const getCategory = (p) => {
					if (isPromptStuck(p)) return 0;
					if (p.enabled) return 1;
					return 2;
				};
				return getCategory(a) - getCategory(b);
			}).map((prompt) => {
				const isStuck = isPromptStuck(prompt);
				const latestJob = recentJobs.filter((j) => j.data?.promptId === prompt.promptId).sort((a, b) => b.timestamp - a.timestamp)[0];
				const hasActiveJob = prompt.jobStatus !== "none";
				const showRetry = prompt.enabled && isStuck && prompt.schedulerInfo.exists && !hasActiveJob;
				const shouldDim = !prompt.enabled;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
					className: shouldDim ? "opacity-50" : "",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "max-w-xs",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm",
								title: prompt.promptValue,
								children: prompt.promptValue
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-center",
							children: !prompt.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "outline",
								children: "Disabled"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col items-center gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										className: "bg-emerald-100 text-emerald-700",
										children: "Enabled"
									}),
									prompt.jobStatus === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										className: "bg-emerald-100 text-emerald-700",
										children: "Active"
									}),
									prompt.jobStatus === "created" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										className: "bg-blue-100 text-blue-700",
										children: "Queued"
									}),
									prompt.jobStatus === "retry" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										className: "bg-amber-100 text-amber-700",
										children: "Retry"
									})
								]
							})
						}),
						brand.targetColumns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TargetStatus, { status: prompt.lastRunsByTarget[column.key] })
						}, column.key)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SchedulerCell, { info: prompt.schedulerInfo })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-center",
							children: latestJob && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobDetailsDialog, {
								job: latestJob,
								onRetrySuccess: onRefresh
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, {
							className: "text-center",
							children: [
								showRetry && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RetryButton, {
									promptId: prompt.promptId,
									onSuccess: onRefresh
								}),
								prompt.jobStatus === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted-foreground",
									children: "Processing..."
								}),
								prompt.jobStatus === "created" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted-foreground",
									children: "In queue"
								}),
								prompt.jobStatus === "retry" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted-foreground",
									children: "Retrying soon"
								})
							]
						})
					]
				}, prompt.promptId);
			}) })] })
		})
	}) })] });
}
function WorkflowsPage() {
	const [data, setData] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [expandedBrands, setExpandedBrands] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [isRefreshing, setIsRefreshing] = (0, import_react.useState)(false);
	const fetchData = (0, import_react.useCallback)(async (showRefreshing = false) => {
		if (showRefreshing) setIsRefreshing(true);
		try {
			const result = await getWorkflowDataFn();
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
			setIsRefreshing(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		fetchData();
		const interval = setInterval(() => fetchData(), 3e4);
		return () => clearInterval(interval);
	}, [fetchData]);
	const toggleBrand = (brandId) => {
		setExpandedBrands((prev) => {
			const next = new Set(prev);
			if (next.has(brandId)) next.delete(brandId);
			else next.add(brandId);
			return next;
		});
	};
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-64" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-96" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 md:grid-cols-4",
				children: [
					0,
					1,
					2,
					3
				].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-32" }, n))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-6 w-48" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-4",
				children: [
					0,
					1,
					2,
					3,
					4
				].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 w-full" }, n))
			}) })] })
		]
	});
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
		className: "text-destructive",
		children: "Error"
	}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: error }) })] });
	if (!data) return null;
	const THIRTY_MIN_MS = 18e5;
	const overdueBreakdown = data.brands.reduce((acc, brand) => {
		for (const prompt of brand.prompts) {
			if (!isPromptStuck(prompt)) continue;
			acc.total++;
			if (Object.values(prompt.lastRunsByTarget).some((t) => t?.isOverdue && t.overdueByMs && t.overdueByMs > THIRTY_MIN_MS)) acc.severe++;
		}
		return acc;
	}, {
		total: 0,
		severe: 0
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-bold tracking-tight",
						children: "Workflows"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground",
						children: "Monitor prompt scheduling, job execution, and worker health"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						onClick: () => fetchData(true),
						disabled: isRefreshing,
						className: "cursor-pointer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}` }), "Refresh"]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
						className: "pb-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
							className: "text-sm font-medium flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "h-4 w-4" }), "Schedule Health"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `text-3xl font-bold ${data.summary.percentOnSchedule >= 80 ? "text-emerald-600" : "text-amber-600"}`,
							children: [data.summary.percentOnSchedule, "%"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground text-sm",
							children: "on schedule"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
						value: data.summary.percentOnSchedule,
						className: "mt-2"
					})] })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
						className: "pb-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
							className: "text-sm font-medium flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 text-emerald-500" }), "On Schedule"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-3xl font-bold text-emerald-600",
							children: data.summary.totalOnSchedule
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground text-sm",
							children: "prompts"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground mt-1",
						children: [
							"of ",
							data.summary.totalEnabled,
							" enabled"
						]
					})] })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: overdueBreakdown.severe > 0 ? "border-red-500/50" : overdueBreakdown.total > 0 ? "border-amber-500/50" : "",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
							className: "pb-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
								className: "text-sm font-medium flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: `h-4 w-4 ${overdueBreakdown.severe > 0 ? "text-red-500" : "text-amber-500"}` }), "Overdue >30min"]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `text-3xl font-bold ${overdueBreakdown.severe > 0 ? "text-red-600" : "text-muted-foreground"}`,
								children: overdueBreakdown.severe
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground text-sm",
								children: "prompts"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground mt-1",
							children: [overdueBreakdown.total - overdueBreakdown.severe, " additional recently expired"]
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, {
						className: "pb-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
							className: "text-sm font-medium flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-4 w-4" }), "Total Brands"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-3xl font-bold",
							children: data.summary.totalBrands
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground text-sm",
							children: "brands"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground mt-1",
						children: [data.summary.totalPrompts, " total prompts"]
					})] })] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueueStatsCard, {
				stats: data.queue,
				title: "Prompt Queue"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Brand Workflow Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Click on a brand to expand and see individual prompt status" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Brand" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: "Prompts"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: "Run Frequency"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: "Health"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-center",
					children: "Status"
				})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: [...data.brands].sort((a, b) => b.overduePrompts - a.overduePrompts).map((brand) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandRow, {
				brand,
				isExpanded: expandedBrands.has(brand.brandId),
				onToggle: () => toggleBrand(brand.brandId),
				recentJobs: data.recentJobs,
				onRefresh: () => fetchData(true)
			}, brand.brandId)) })] }) })] })
		]
	});
}
//#endregion
export { WorkflowsPage as component };

//# sourceMappingURL=workflows-YZc_oQ8c.mjs.map