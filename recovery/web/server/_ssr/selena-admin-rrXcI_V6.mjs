import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { x as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CardHeader, n as CardContent, o as CardTitle, r as CardDescription, t as Card } from "./card-CTzAVKuz.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { t as Checkbox } from "./checkbox-Bf5-JXC4.mjs";
import { t as Badge } from "./badge-CEgIcDZr.mjs";
import { t as Textarea } from "./textarea-D11Pept6.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-wJUKCpVc.mjs";
import { a as enqueueSelenaOrderRunsFn, c as getSelenaOrderPreflightFn, l as recordSelenaQcFn, n as approveSelenaOrderFn, u as stopSelenaOrderFn } from "./selena-admin-orders-CbZS8oDU.mjs";
import { t as Route } from "./selena-admin-CiX-uoh-.mjs";
import { t as humanizeSelenaAdminError } from "./selena-workspace-errors-D80mdaLm.mjs";
import { i as startSelenaMeasurementFn, n as getSelenaOrderDeskFn, r as prepareSelenaScenariosFn, t as decideSelenaScenariosFn } from "./selena-order-desk-bzehLOOg.mjs";
import { n as listSelenaOrderRequestsFn, r as updateSelenaOrderRequestStatusFn } from "./selena-order-requests-CJhLhIkr.mjs";
import { t as analyzeSelenaOrderFn } from "./selena-order-analysis-CU_0Zk_i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-admin-rrXcI_V6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "bca89961-4c78-42e6-8743-9684ade4fbb4", e._sentryDebugIdIdentifier = "sentry-dbid-bca89961-4c78-42e6-8743-9684ade4fbb4");
	} catch (e) {}
})();
/** Kept in step with the catalog plans an operator sells from this desk. */
var PLANS = [
	{
		id: "visitor-local",
		label: "Snapshot · $49/mo",
		systems: 3,
		repeats: 1,
		budgetCap: 12
	},
	{
		id: "full-ai-landscape",
		label: "Landscape · $79/mo",
		systems: 8,
		repeats: 1,
		budgetCap: 28
	},
	{
		id: "expert-verified",
		label: "Expert Verified · $399",
		systems: 8,
		repeats: 5,
		budgetCap: 140
	}
];
function tr$2(locale, english, russian) {
	return locale === "ru" ? russian : english;
}
function statusTone(status) {
	if (status === "APPROVED") return "default";
	if (status === "REJECTED") return "outline";
	return "secondary";
}
function SelenaOrderDesk({ locale, onOrderCreated }) {
	const [projects, setProjects] = (0, import_react.useState)(null);
	const [projectId, setProjectId] = (0, import_react.useState)("");
	const [planId, setPlanId] = (0, import_react.useState)("visitor-local");
	const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [pending, setPending] = (0, import_react.useState)("");
	const [notice, setNotice] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [draftKey, setDraftKey] = (0, import_react.useState)(() => crypto.randomUUID());
	const load = (0, import_react.useCallback)(async () => {
		try {
			const desk = await getSelenaOrderDeskFn();
			setProjects(desk);
			setProjectId((current) => current || desk[0]?.id || "");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load the order desk");
		}
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	const project = projects?.find((item) => item.id === projectId) ?? null;
	const plan = PLANS.find((item) => item.id === planId) ?? PLANS[0];
	(0, import_react.useEffect)(() => {
		setSelected(new Set(project?.scenarios.filter((s) => s.status === "APPROVED").map((s) => s.id) ?? []));
	}, [project]);
	const expectedRuns = (0, import_react.useMemo)(() => selected.size * plan.systems * plan.repeats, [selected, plan]);
	const run = async (label, action) => {
		setPending(label);
		setError("");
		setNotice("");
		try {
			setNotice(await action());
			await load();
		} catch (cause) {
			setError(humanizeSelenaAdminError(cause, locale, tr$2(locale, "Action failed", "Действие не выполнено")));
		} finally {
			setPending("");
		}
	};
	const toggle = (scenarioId) => setSelected((current) => {
		const next = new Set(current);
		if (next.has(scenarioId)) next.delete(scenarioId);
		else next.add(scenarioId);
		return next;
	});
	const selectedApproved = (project?.scenarios ?? []).filter((scenario) => selected.has(scenario.id) && scenario.status === "APPROVED");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: tr$2(locale, "Order a measurement", "Заказать замер") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: tr$2(locale, "Promote the confirmed profile questions into scenarios, approve the ones worth measuring, then order and start the measurement in one confirmed action. The order and its progress appear in the queue below.", "Перенесите вопросы подтверждённого профиля в сценарии, утвердите те, что стоит измерять, и одним подтверждённым действием оформите заказ и запустите замер. Заказ и его прогресс появятся в очереди ниже.") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "flex flex-col gap-5",
		children: [
			notice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900",
				children: notice
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive",
				children: error
			}),
			projects === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: tr$2(locale, "Loading projects…", "Загружаем проекты…")
			}) : projects.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: tr$2(locale, "No projects in this workspace yet.", "В этом пространстве ещё нет проектов.")
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "desk-project",
							children: tr$2(locale, "Project", "Проект")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: "desk-project",
							className: "h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
							value: projectId,
							onChange: (event) => setProjectId(event.target.value),
							children: projects.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: item.id,
								children: item.name
							}, item.id))
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "desk-plan",
							children: tr$2(locale, "Plan", "Тариф")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: "desk-plan",
							className: "h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
							value: planId,
							onChange: (event) => setPlanId(event.target.value),
							children: PLANS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: item.id,
								children: item.label
							}, item.id))
						})]
					})]
				}),
				project && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border bg-muted/40 px-4 py-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium",
						children: [project.brandName ?? project.name, project.primaryDomain ? ` · ${project.primaryDomain}` : ""]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-muted-foreground",
						children: project.profileConfirmedAt ? tr$2(locale, `Profile confirmed · ${project.profileQuestions} question(s) on file · ${project.scenarios.length} scenario(s) prepared`, `Профиль подтверждён · вопросов в профиле: ${project.profileQuestions} · подготовлено сценариев: ${project.scenarios.length}`) : tr$2(locale, "The customer has not confirmed a brand profile yet.", "Клиент ещё не подтвердил профиль бренда.")
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							disabled: !project?.profileConfirmedAt || pending !== "",
							onClick: () => run("prepare", async () => {
								const result = await prepareSelenaScenariosFn({ data: { projectId } });
								return tr$2(locale, `Prepared ${result.added} new scenario(s); ${result.total} on file.`, `Подготовлено новых сценариев: ${result.added}; всего: ${result.total}.`);
							}),
							children: pending === "prepare" ? tr$2(locale, "Preparing…", "Готовим…") : tr$2(locale, "Prepare scenarios from profile", "Подготовить сценарии из профиля")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							disabled: selected.size === 0 || pending !== "",
							onClick: () => run("approve", async () => {
								const result = await decideSelenaScenariosFn({ data: {
									projectId,
									scenarioIds: [...selected],
									decision: "APPROVED"
								} });
								return tr$2(locale, `Approved ${result.updated} scenario(s).`, `Утверждено сценариев: ${result.updated}.`);
							}),
							children: tr$2(locale, "Approve selected", "Утвердить выбранные")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "sm",
							disabled: selected.size === 0 || pending !== "",
							onClick: () => run("reject", async () => {
								const result = await decideSelenaScenariosFn({ data: {
									projectId,
									scenarioIds: [...selected],
									decision: "REJECTED"
								} });
								return tr$2(locale, `Rejected ${result.updated} scenario(s).`, `Отклонено сценариев: ${result.updated}.`);
							}),
							children: tr$2(locale, "Reject selected", "Отклонить выбранные")
						})
					]
				}),
				project && project.scenarios.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y rounded-md border",
					children: project.scenarios.map((scenario) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-start gap-3 px-4 py-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
								id: `scenario-${scenario.id}`,
								checked: selected.has(scenario.id),
								onCheckedChange: () => toggle(scenario.id),
								className: "mt-1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								htmlFor: `scenario-${scenario.id}`,
								className: "flex-1 cursor-pointer text-sm",
								children: [scenario.text, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-2 text-xs uppercase text-muted-foreground",
									children: scenario.language
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: statusTone(scenario.status),
								children: scenario.status
							})
						]
					}, scenario.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-4 rounded-md border bg-muted/40 px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							tr$2(locale, `${selectedApproved.length} approved scenario(s) × ${plan.systems} system(s) × ${plan.repeats} repeat(s) = `, `Утверждённых сценариев: ${selectedApproved.length} × систем: ${plan.systems} × повторов: ${plan.repeats} = `),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selectedApproved.length * plan.systems * plan.repeats }),
							" ",
							tr$2(locale, "planned answers", "запланированных ответов"),
							selectedApproved.length !== selected.size && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-2 text-muted-foreground",
								children: tr$2(locale, "(unapproved selections are excluded)", "(неутверждённые из выбранных не учитываются)")
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						disabled: selectedApproved.length === 0 || pending !== "" || expectedRuns === 0,
						onClick: () => {
							if (!window.confirm(tr$2(locale, `This orders and starts a measurement: ${expectedRuns} answers from AI providers, capped at $${plan.budgetCap}. Continue?`, `Это оформит заказ и запустит замер: ${expectedRuns} ответов от AI-провайдеров, потолок $${plan.budgetCap}. Продолжить?`))) return;
							run("order", async () => {
								let result;
								try {
									result = await startSelenaMeasurementFn({ data: {
										projectId,
										planId,
										scenarioIds: selectedApproved.map((scenario) => scenario.id),
										idempotencyKey: draftKey
									} });
								} finally {
									onOrderCreated();
								}
								setDraftKey(crypto.randomUUID());
								if (result.stoppedAt === "payment") return tr$2(locale, "The order was created but the payment was not recorded, so nothing was started.", "Заказ создан, но платёж не зафиксирован — запуск не производился.");
								if (result.stoppedAt === "execution") return tr$2(locale, "Ordered and approved, but execution is off: set SELENA_MEASUREMENT_ENABLED=true on web and worker. Nothing was queued.", "Заказ оформлен и одобрен, но исполнение выключено: поставьте SELENA_MEASUREMENT_ENABLED=true на web и worker. В очередь ничего не поставлено.");
								return tr$2(locale, `Started: ${result.expectedRuns} answers ordered, ${result.approved?.permits ?? 0} permits issued, ${result.queued?.enqueued ?? 0} runs queued. Watch the count in the queue below.`, `Запущено: заказано ответов ${result.expectedRuns}, выпущено разрешений ${result.approved?.permits ?? 0}, поставлено в очередь ${result.queued?.enqueued ?? 0}. Следите за счётчиком в очереди ниже.`);
							});
						},
						children: pending === "order" ? tr$2(locale, "Starting…", "Запускаем…") : tr$2(locale, "Order and start the measurement", "Заказать и запустить замер")
					})]
				})
			] })
		]
	})] });
}
function tr$1(locale, english, russian) {
	return locale === "ru" ? russian : english;
}
var PLAN_LABELS = {
	"visitor-local": "Snapshot · $49",
	"full-ai-landscape": "Landscape · $79"
};
function SelenaRequestInbox({ locale }) {
	const [requests, setRequests] = (0, import_react.useState)(null);
	const [pendingId, setPendingId] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const load = (0, import_react.useCallback)(async () => {
		try {
			setRequests(await listSelenaOrderRequestsFn());
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load the requests");
		}
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	const setStatus = async (requestId, status) => {
		setPendingId(requestId);
		setError("");
		try {
			await updateSelenaOrderRequestStatusFn({ data: {
				requestId,
				status
			} });
			await load();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not update the request");
		} finally {
			setPendingId("");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: tr$1(locale, "Plan requests", "Заявки на тариф") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: tr$1(locale, "What customers asked for from the cabinet. A request is a lead — build the order above once the payment (or a promo code) is settled.", "Что клиенты запросили из кабинета. Заявка — это обращение: оформляйте заказ выше, когда оплата (или промокод) улажена.") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-4 text-sm text-destructive",
		children: error
	}), requests === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: tr$1(locale, "Loading…", "Загружаем…")
	}) : requests.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: tr$1(locale, "No plan requests yet.", "Заявок на тариф пока нет.")
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-x-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr$1(locale, "Project", "Проект") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr$1(locale, "Plan", "Тариф") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr$1(locale, "Contact", "Контакт") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr$1(locale, "Payment", "Оплата") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr$1(locale, "Status", "Статус") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {})
		] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: requests.map((request) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, {
				className: "font-medium",
				children: [request.projectName, request.comment && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-1 block text-xs text-muted-foreground",
					children: request.comment
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: PLAN_LABELS[request.planId] ?? request.planId }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { children: [request.contactName, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block text-xs text-muted-foreground",
				children: request.contactChannel
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: request.promoApplied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: tr$1(locale, `Free · ${request.promoCode}`, `Бесплатно · ${request.promoCode}`) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs text-muted-foreground",
				children: tr$1(locale, "To be arranged", "Нужно согласовать")
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "rounded-full border px-2 py-0.5 text-xs",
				children: request.status
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				className: "text-right",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-2",
					children: [request.status !== "IN_PROGRESS" && request.status !== "CLOSED" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "sm",
						variant: "outline",
						disabled: pendingId === request.id,
						onClick: () => void setStatus(request.id, "IN_PROGRESS"),
						children: tr$1(locale, "In progress", "В работу")
					}), request.status !== "CLOSED" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "sm",
						variant: "outline",
						disabled: pendingId === request.id,
						onClick: () => void setStatus(request.id, "CLOSED"),
						children: tr$1(locale, "Close", "Закрыть")
					})]
				})
			})
		] }, request.id)) })] })
	})] })] });
}
var emptyQcForm = {
	reviewer: "",
	scope: "",
	decision: "approved",
	notes: ""
};
function SelenaAdminOrders() {
	const orders = Route.useLoaderData();
	const router = useRouter();
	const [locale, setLocale] = (0, import_react.useState)("en");
	const [selectedOrderId, setSelectedOrderId] = (0, import_react.useState)(orders[0]?.id ?? "");
	const [preflight, setPreflight] = (0, import_react.useState)(null);
	const [preflightPending, setPreflightPending] = (0, import_react.useState)(false);
	const [pendingAction, setPendingAction] = (0, import_react.useState)("");
	const [measurementDisabled, setMeasurementDisabled] = (0, import_react.useState)(false);
	const [stopReason, setStopReason] = (0, import_react.useState)("");
	const [qcForm, setQcForm] = (0, import_react.useState)(emptyQcForm);
	const [analysis, setAnalysis] = (0, import_react.useState)(null);
	const [notice, setNotice] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [actionKeys] = (0, import_react.useState)(() => /* @__PURE__ */ new Map());
	const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;
	(0, import_react.useEffect)(() => {
		const saved = window.localStorage.getItem("selena-workspace-locale");
		setLocale(saved === "ru" || saved === "en" ? saved : navigator.language.startsWith("ru") ? "ru" : "en");
	}, []);
	const loadPreflight = (0, import_react.useCallback)(async (orderId) => {
		setPreflightPending(true);
		try {
			setPreflight(await getSelenaOrderPreflightFn({ data: { orderId } }));
		} catch (cause) {
			setPreflight(null);
			setError(humanizeSelenaAdminError(cause, locale, "Preflight failed"));
		} finally {
			setPreflightPending(false);
		}
	}, [locale]);
	(0, import_react.useEffect)(() => {
		if (!selectedOrder) {
			setPreflight(null);
			setAnalysis(null);
			return;
		}
		loadPreflight(selectedOrder.id);
	}, [selectedOrder, loadPreflight]);
	const idempotencyKey = (action, orderId) => {
		const mapKey = `${action}:${orderId}`;
		const existing = actionKeys.get(mapKey);
		if (existing) return existing;
		const created = crypto.randomUUID();
		actionKeys.set(mapKey, created);
		return created;
	};
	const runAction = async (action, operation) => {
		setPendingAction(action);
		setNotice("");
		setError("");
		setMeasurementDisabled(false);
		try {
			setNotice(await operation());
			await router.invalidate();
			if (selectedOrder) await loadPreflight(selectedOrder.id);
		} catch (cause) {
			setError(humanizeSelenaAdminError(cause, locale, tr(locale, "Action failed", "Действие не выполнено")));
		} finally {
			setPendingAction("");
		}
	};
	const approve = () => {
		if (!selectedOrder) return;
		runAction("approve", async () => {
			const result = await approveSelenaOrderFn({ data: {
				orderId: selectedOrder.id,
				idempotencyKey: idempotencyKey("approve", selectedOrder.id)
			} });
			return tr(locale, `Approved. ${result.created} run permits issued of ${result.expected}; order is ${result.status}.`, `Заказ одобрен. Выпущено разрешений: ${result.created} из ${result.expected}; статус заказа: ${result.status}.`);
		});
	};
	const enqueue = () => {
		if (!selectedOrder) return;
		runAction("enqueue", async () => {
			const result = await enqueueSelenaOrderRunsFn({ data: {
				orderId: selectedOrder.id,
				idempotencyKey: idempotencyKey("enqueue", selectedOrder.id)
			} });
			if (result.reason === "SELENA_MEASUREMENT_DISABLED") {
				setMeasurementDisabled(true);
				return tr(locale, "Nothing was queued.", "В очередь ничего не поставлено.");
			}
			const duplicates = result.duplicates > 0 ? tr(locale, ` ${result.duplicates} were already queued.`, ` Уже стояли в очереди: ${result.duplicates}.`) : "";
			return tr(locale, `Queued ${result.enqueued} run(s); ${result.skipped} permit(s) skipped as consumed or expired.${duplicates}`, `Поставлено в очередь прогонов: ${result.enqueued}; пропущено разрешений (потрачены или истекли): ${result.skipped}.${duplicates}`);
		});
	};
	const stop = () => {
		if (!selectedOrder) return;
		runAction("stop", async () => {
			const result = await stopSelenaOrderFn({ data: {
				orderId: selectedOrder.id,
				reason: stopReason.trim() || void 0,
				idempotencyKey: idempotencyKey("stop", selectedOrder.id)
			} });
			setStopReason("");
			return tr(locale, `Order stopped. Cycles moved to STOPPED: ${result.stoppedCycles}.`, `Заказ остановлен. Циклов переведено в STOPPED: ${result.stoppedCycles}.`);
		});
	};
	const submitQc = (event) => {
		event.preventDefault();
		if (!selectedOrder) return;
		runAction("qc", async () => {
			const record = await recordSelenaQcFn({ data: {
				orderId: selectedOrder.id,
				cycleId: selectedOrder.cycles[0]?.id,
				reviewer: qcForm.reviewer.trim() || void 0,
				scope: qcForm.scope.trim(),
				decision: qcForm.decision,
				notes: qcForm.notes.trim() || void 0
			} });
			setQcForm(emptyQcForm);
			return tr(locale, `QC recorded: ${record.decision}.`, `QC записан: ${record.decision}.`);
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6 p-4 md:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: tr(locale, "Order operations", "Работа с заказами")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-sm text-muted-foreground",
					children: tr(locale, "Preflight, approve, queue, stop and QC. Approving issues run permits; queueing hands them to the worker — no measurement is executed from this screen.", "Preflight, одобрение, постановка в очередь, остановка и QC. Одобрение выпускает разрешения на прогоны, постановка в очередь передаёт их воркеру — измерение с этого экрана не запускается.")
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					size: "sm",
					onClick: () => {
						const next = locale === "ru" ? "en" : "ru";
						setLocale(next);
						window.localStorage.setItem("selena-workspace-locale", next);
					},
					children: locale === "ru" ? "EN" : "RU"
				})]
			}),
			notice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900",
				children: notice
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive",
				children: error
			}),
			measurementDisabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900",
				children: tr(locale, "Execution is off: SELENA_MEASUREMENT_ENABLED is not enabled. No job was queued and no run has started.", "Исполнение выключено: SELENA_MEASUREMENT_ENABLED не включён. Ни одна джоба не поставлена в очередь, прогон не начался.")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaRequestInbox, { locale }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaOrderDesk, {
				locale,
				onOrderCreated: () => void router.invalidate()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: tr(locale, "Order queue", "Очередь заказов") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: tr(locale, "Orders in the review, dispatch and QC stages of your workspace.", "Заказы вашего пространства на стадиях проверки, диспетчеризации и QC.") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: tr(locale, "No orders are waiting for an operator.", "Нет заказов, ожидающих оператора.")
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr(locale, "Project", "Проект") }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr(locale, "Status", "Статус") }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: tr(locale, "Expected runs", "Ожидаемые прогоны")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: tr(locale, "Order cap", "Лимит заказа")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr(locale, "Cycle", "Цикл") }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: tr(locale, "Latest QC", "Последний QC") }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {})
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: orders.map((order) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
					"data-state": order.id === selectedOrder?.id ? "selected" : void 0,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "font-medium",
							children: order.projectName
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border px-2 py-0.5 text-xs",
							children: order.status
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-right tabular-nums",
							children: order.lockExpectedRuns
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, {
							className: "text-right tabular-nums",
							children: [
								order.orderCap,
								" ",
								order.currency
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-xs text-muted-foreground",
							children: cycleSummary(order)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-xs text-muted-foreground",
							children: order.latestQc ? order.latestQc.decision : tr(locale, "none", "нет")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							className: "text-right",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "outline",
								size: "sm",
								onClick: () => setSelectedOrderId(order.id),
								children: tr(locale, "Select", "Выбрать")
							})
						})
					]
				}, order.id)) })] })
			}) })] }),
			selectedOrder && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: tr(locale, "Preflight", "Preflight") }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
					selectedOrder.projectName,
					" · ",
					selectedOrder.status
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-4",
					children: [
						preflightPending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: tr(locale, "Checking…", "Проверяем…")
						}),
						preflight && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm",
								children: preflight.ok ? tr(locale, "All checks pass.", "Все проверки пройдены.") : tr(locale, `Blocked by ${preflight.blockers.length} check(s).`, `Блокировано проверками: ${preflight.blockers.length}.`)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "space-y-2",
								children: preflight.checks.map((check) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex gap-3 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										className: check.ok ? "text-emerald-600" : "text-destructive",
										children: check.ok ? "✓" : "✗"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: checkLabel(check.code, locale)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "ml-2 font-mono text-xs text-muted-foreground",
											children: check.code
										}),
										check.details && Object.keys(check.details).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-xs text-muted-foreground",
											children: Object.entries(check.details).map(([key, value]) => `${key}: ${String(value)}`).join(" · ")
										})
									] })]
								}, check.code))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "grid grid-cols-2 gap-2 border-t pt-4 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-muted-foreground",
										children: tr(locale, "Expected runs", "Ожидаемые прогоны")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "text-right tabular-nums",
										children: preflight.expectedRuns
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-muted-foreground",
										children: tr(locale, "Worst case", "Худший случай")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
										className: "text-right tabular-nums",
										children: [
											preflight.worstCaseCost.amount,
											" ",
											preflight.worstCaseCost.currency,
											" (",
											tr(locale, "estimated", "оценка"),
											")"
										]
									})
								]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-3 border-t pt-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									onClick: approve,
									disabled: !preflight?.ok || pendingAction !== "" || preflightPending,
									children: pendingAction === "approve" ? tr(locale, "Approving…", "Одобряем…") : tr(locale, "Approve run", "Одобрить прогон")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "secondary",
									onClick: enqueue,
									disabled: selectedOrder.status !== "QUEUED" || pendingAction !== "",
									children: pendingAction === "enqueue" ? tr(locale, "Queueing…", "Ставим в очередь…") : tr(locale, "Queue runs", "Поставить прогоны в очередь")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "outline",
									onClick: () => void loadPreflight(selectedOrder.id),
									disabled: preflightPending,
									children: tr(locale, "Re-check", "Проверить снова")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "outline",
									disabled: pendingAction !== "",
									onClick: () => void (async () => {
										setPendingAction("analyze");
										setError("");
										setNotice("");
										try {
											setAnalysis(await analyzeSelenaOrderFn({ data: { orderId: selectedOrder.id } }));
										} catch (cause) {
											setAnalysis(null);
											setError(humanizeSelenaAdminError(cause, locale, tr(locale, "Analysis failed", "Анализ не выполнен")));
										} finally {
											setPendingAction("");
										}
									})(),
									children: pendingAction === "analyze" ? tr(locale, "Reading answers…", "Читаем ответы…") : tr(locale, "Read the answers", "Разобрать ответы")
								})
							]
						}),
						(notice || error || measurementDisabled) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [
								notice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900",
									children: notice
								}),
								error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive",
									children: error
								}),
								measurementDisabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900",
									children: tr(locale, "Execution is off on this service: set SELENA_MEASUREMENT_ENABLED=true on both web and worker. Nothing was queued.", "Исполнение выключено на этом сервисе: поставьте SELENA_MEASUREMENT_ENABLED=true и на web, и на worker. В очередь ничего не поставлено.")
								})
							]
						}),
						analysis && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4 border-t pt-4 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted-foreground",
									children: tr(locale, `Read ${analysis.analyzed} answer(s); ${analysis.reused} reused past findings; ${analysis.withoutAnswer} had nothing to read.`, `Разобрано ответов: ${analysis.analyzed}; взято из прежних находок: ${analysis.reused}; без текста: ${analysis.withoutAnswer}.`)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
									className: "grid gap-4 sm:grid-cols-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-xs text-muted-foreground",
											children: tr(locale, "Answers naming the brand", "Ответов с упоминанием бренда")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "text-lg font-semibold",
											children: formatShare(analysis.summary.brandMentionRate, locale)
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-xs text-muted-foreground",
											children: tr(locale, "Share of voice", "Доля голоса")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "text-lg font-semibold",
											children: formatShare(analysis.summary.brandShareOfVoice, locale)
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-xs text-muted-foreground",
											children: tr(locale, "Average standing", "Средняя позиция")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "text-lg font-semibold",
											children: analysis.summary.brandAverageOrder === null ? tr(locale, "UNKNOWN", "НЕИЗВЕСТНО") : analysis.summary.brandAverageOrder.toFixed(2)
										})] })
									]
								}),
								analysis.summary.competitors.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: tr(locale, "Named instead", "Названы вместо вас")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-2 space-y-1 text-muted-foreground",
									children: analysis.summary.competitors.slice(0, 8).map((competitor) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										competitor.name,
										" — ",
										competitor.answersMentioned,
										" ",
										tr(locale, "answer(s)", "ответ(ов)"),
										",",
										" ",
										tr(locale, "avg standing", "средняя позиция"),
										" ",
										competitor.averageOrder.toFixed(2)
									] }, competitor.name))
								})] }),
								analysis.summary.citationGap.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium",
										children: tr(locale, "Citation gap", "Разрыв по источникам")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: tr(locale, "Sources the answers leaned on, ranked by how often the brand was absent from them.", "Источники, на которые опирались ответы, по числу случаев, где бренда в них не было.")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "mt-2 space-y-1 text-muted-foreground",
										children: analysis.summary.citationGap.slice(0, 10).map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
											entry.domain,
											" — ",
											tr(locale, "cited", "цитирований"),
											" ",
											entry.timesCited,
											",",
											" ",
											tr(locale, "without the brand", "без бренда"),
											" ",
											entry.timesCitedWithoutBrand,
											entry.ownedByBrand ? tr(locale, " (own site)", " (свой сайт)") : ""
										] }, entry.domain))
									})
								] })
							]
						}),
						selectedOrder.status !== "QUEUED" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: tr(locale, "Runs can only be queued once the order is QUEUED, which approval does.", "Прогоны можно поставить в очередь только когда заказ в статусе QUEUED — в него переводит одобрение.")
						}),
						preflight && !preflight.ok && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: tr(locale, "Approve stays disabled until every check passes.", "Кнопка одобрения остаётся выключенной, пока не пройдены все проверки.")
						})
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: tr(locale, "Stop order", "Остановить заказ") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: tr(locale, "Cancels the order and marks its cycles STOPPED.", "Отменяет заказ и переводит его циклы в STOPPED.") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "stop-reason",
								children: tr(locale, "Reason (optional)", "Причина (необязательно)")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "stop-reason",
								value: stopReason,
								onChange: (event) => setStopReason(event.target.value),
								maxLength: 500
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "destructive",
								onClick: stop,
								disabled: pendingAction !== "",
								children: pendingAction === "stop" ? tr(locale, "Stopping…", "Останавливаем…") : tr(locale, "Stop", "Стоп")
							})
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: tr(locale, "QC decision", "Решение QC") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: tr(locale, "The latest record per order is what publication gates read.", "Публикация опирается на последнюю запись QC по заказу.") })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "space-y-3",
						onSubmit: submitQc,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "qc-reviewer",
									children: tr(locale, "Reviewer", "Проверяющий")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "qc-reviewer",
									value: qcForm.reviewer,
									onChange: (event) => setQcForm({
										...qcForm,
										reviewer: event.target.value
									}),
									placeholder: tr(locale, "Defaults to you", "По умолчанию — вы"),
									maxLength: 200
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "qc-scope",
									children: tr(locale, "Scope", "Объём проверки")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "qc-scope",
									required: true,
									value: qcForm.scope,
									onChange: (event) => setQcForm({
										...qcForm,
										scope: event.target.value
									}),
									maxLength: 500
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "qc-decision",
									children: tr(locale, "Decision", "Решение")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									id: "qc-decision",
									className: "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm",
									value: qcForm.decision,
									onChange: (event) => setQcForm({
										...qcForm,
										decision: event.target.value
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "approved",
										children: tr(locale, "approved", "approved — принято")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "rejected",
										children: tr(locale, "rejected", "rejected — отклонено")
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "qc-notes",
									children: tr(locale, "Notes", "Заметки")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									id: "qc-notes",
									value: qcForm.notes,
									onChange: (event) => setQcForm({
										...qcForm,
										notes: event.target.value
									}),
									maxLength: 2e3,
									rows: 3
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								disabled: pendingAction !== "",
								children: pendingAction === "qc" ? tr(locale, "Recording…", "Записываем…") : tr(locale, "Record QC", "Записать QC")
							})
						]
					}) })] })]
				})]
			})
		]
	});
}
/** An empty measurement reports UNKNOWN; a zero here would claim knowledge. */
function formatShare(value, locale) {
	if (value === null) return tr(locale, "UNKNOWN", "НЕИЗВЕСТНО");
	return `${Math.round(value * 100)}%`;
}
function cycleSummary(order) {
	const cycle = order.cycles[0];
	if (!cycle) return "—";
	return `${cycle.status} ${cycle.completedRuns}/${cycle.expectedRuns}`;
}
function checkLabel(code, locale) {
	const label = {
		ORDER_STATUS_PAID_REVIEW_REQUIRED: ["Order is awaiting review", "Заказ ожидает проверки"],
		LOCK_PRESENT: ["Configuration lock exists", "Конфигурация зафиксирована"],
		LOCK_SCOPE_PRESENT: ["Lock carries a measurement scope", "В фиксации есть объём измерения"],
		EXPECTED_RUNS_MATCH: ["Expected runs match the scope", "Ожидаемые прогоны совпадают с объёмом"],
		NO_ACTIVE_PERMITS: ["No run permits in flight", "Нет активных разрешений на прогоны"],
		NO_ACTIVE_JOBS: ["No runs in flight", "Нет незавершённых прогонов"],
		MAINTENANCE_IDLE: ["Recurring maintenance is idle", "Регулярное обслуживание не активно"],
		WITHIN_ORDER_CAP: ["Worst case fits the order cap", "Худший случай не превышает лимит заказа"],
		WITHIN_PROVIDER_BUDGET: ["Worst case fits the provider budget", "Худший случай не превышает бюджет провайдера"],
		PAYMENT_RECORDED: ["Payment is recorded", "Платёж зафиксирован"]
	}[code];
	return label ? tr(locale, label[0], label[1]) : code;
}
function tr(locale, english, russian) {
	return locale === "ru" ? russian : english;
}
//#endregion
export { SelenaAdminOrders as component };

//# sourceMappingURL=selena-admin-rrXcI_V6.mjs.map