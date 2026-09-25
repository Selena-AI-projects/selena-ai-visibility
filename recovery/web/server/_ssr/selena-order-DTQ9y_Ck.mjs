import { i as __toESM } from "../_runtime.mjs";
import { nt as require_react } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { t as Textarea } from "./textarea-D11Pept6.mjs";
import { t as Route } from "./selena-order-DqkWHSWS.mjs";
import { n as humanizeSelenaError } from "./selena-workspace-errors-D80mdaLm.mjs";
import { t as createSelenaOrderRequestFn } from "./selena-order-requests-CJhLhIkr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-order-DTQ9y_Ck.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "5c100330-c188-46c5-a6a8-474fa1187e62", e._sentryDebugIdIdentifier = "sentry-dbid-5c100330-c188-46c5-a6a8-474fa1187e62");
	} catch (e) {}
})();
/**
* /app/selena-order - the customer asks for a paid measurement plan.
*
* There is no online checkout yet, so this page collects a request — project,
* plan, contact — and a pilot invite code stands in for payment: an unspent,
* unexpired seat issued for this plan makes the request free of charge, once.
* The operator sees every request on the admin desk and builds the actual
* order there; nothing on this page touches quotes, orders or the queue.
*/
var PLAN_OPTIONS = [{
	search: "snapshot",
	planId: "visitor-local",
	title: "Visitor View · Snapshot",
	price: "$49",
	systems: "ChatGPT · Gemini · Perplexity",
	en: "What customers see in live AI answer surfaces.",
	ru: "Что клиенты видят в пользовательских AI-сервисах."
}, {
	search: "landscape",
	planId: "full-ai-landscape",
	title: "Visitor + API View · Landscape",
	price: "$79",
	systems: "ChatGPT · Gemini · Perplexity · Claude · DeepSeek · Qwen · Mistral · Grok",
	en: "The visitor check plus a model-knowledge baseline.",
	ru: "Проверка глазами посетителя плюс базовая проверка знаний моделей."
}];
function tr(locale, english, russian) {
	return locale === "ru" ? russian : english;
}
function SelenaOrderPage() {
	const { projects } = Route.useLoaderData();
	const search = Route.useSearch();
	const [locale, setLocale] = (0, import_react.useState)("en");
	const [projectId, setProjectId] = (0, import_react.useState)(search.project ?? projects[0]?.project.id ?? "");
	const [planSearch, setPlanSearch] = (0, import_react.useState)(search.plan ?? "snapshot");
	const [contactName, setContactName] = (0, import_react.useState)("");
	const [contactChannel, setContactChannel] = (0, import_react.useState)("");
	const [comment, setComment] = (0, import_react.useState)("");
	const [promoCode, setPromoCode] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [result, setResult] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const saved = window.localStorage.getItem("selena-workspace-locale");
		setLocale(saved === "ru" || saved === "en" ? saved : navigator.language.startsWith("ru") ? "ru" : "en");
	}, []);
	const plan = PLAN_OPTIONS.find((option) => option.search === planSearch) ?? PLAN_OPTIONS[0];
	const submit = async (event) => {
		event.preventDefault();
		setPending(true);
		setError("");
		try {
			const created = await createSelenaOrderRequestFn({ data: {
				projectId,
				planId: plan.planId,
				contactName,
				contactChannel,
				comment: comment.trim() ? comment.trim() : void 0,
				promoCode: promoCode.trim() ? promoCode.trim() : void 0
			} });
			setResult({
				promoApplied: created.promoApplied,
				autoStarted: created.autoStarted
			});
		} catch (cause) {
			setError(humanizeSelenaError(cause, locale, tr(locale, "We could not send the request. Check the fields and try again.", "Не удалось отправить заявку. Проверьте поля и попробуйте ещё раз.")));
		} finally {
			setPending(false);
		}
	};
	if (result) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "selena-section",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "selena-heading text-3xl",
					children: tr(locale, "Request received", "Заявка принята")
				}),
				result.autoStarted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm leading-6 text-[#3d362e]",
					children: tr(locale, "Your promo code was accepted and the measurement has already started — nothing to pay, nothing to confirm. The results will appear in your cabinet, in the Measurement section, as the answers come back.", "Промокод принят, замер уже запущен — платить и подтверждать ничего не нужно. Результаты появятся в кабинете в разделе «Замер», как только вернутся ответы.")
				}) : result.promoApplied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm leading-6 text-[#3d362e]",
					children: tr(locale, "Your promo code was accepted — this measurement is free of charge, no payment needed. We will prepare the questions and start the measurement; the results will appear in your cabinet, in the Measurement section.", "Промокод принят — этот замер для вас бесплатный, оплата не требуется. Мы подготовим вопросы и запустим замер; результаты появятся в вашем кабинете в разделе «Замер».")
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm leading-6 text-[#3d362e]",
					children: tr(locale, "Online payment is not available yet, so we will contact you at the address you left to arrange the payment and start the measurement.", "Онлайн-оплаты пока нет, поэтому мы свяжемся с вами по указанному контакту, чтобы договориться об оплате и запустить замер.")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app/selena",
						className: "text-sm underline",
						children: tr(locale, "Back to the cabinet", "Вернуться в кабинет")
					})
				})
			]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "selena-section",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "selena-heading text-3xl",
					children: tr(locale, "Order an AI measurement", "Заказ AI-замера")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-6 text-[#574d45]",
					children: tr(locale, "Choose a plan and leave a contact. A measurement starts only after the questions are approved — nothing runs from this form by itself.", "Выберите тариф и оставьте контакт. Замер запускается только после утверждения вопросов — сама по себе эта форма ничего не запускает.")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: submit,
					className: "mt-6 flex flex-col gap-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "order-project",
								children: tr(locale, "Project", "Проект")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								id: "order-project",
								className: "h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
								value: projectId,
								onChange: (event) => setProjectId(event.target.value),
								required: true,
								children: projects.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: item.project.id,
									children: item.project.name
								}, item.project.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
								className: "text-sm font-medium",
								children: tr(locale, "Plan", "Тариф")
							}), PLAN_OPTIONS.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: `flex cursor-pointer flex-col gap-1 rounded-lg border p-4 ${option.search === planSearch ? "border-[#3d362e] bg-[#fffdf8]" : "border-[#e5dbcd]"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "radio",
												name: "plan",
												value: option.search,
												checked: option.search === planSearch,
												onChange: () => setPlanSearch(option.search)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-medium",
												children: option.title
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-semibold",
											children: [option.price, tr(locale, "/mo", "/мес")]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs uppercase tracking-wide text-[#574d45]",
										children: option.systems
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm text-[#574d45]",
										children: tr(locale, option.en, option.ru)
									})
								]
							}, option.search))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-4 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "order-name",
									children: tr(locale, "Your name", "Ваше имя")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "order-name",
									value: contactName,
									onChange: (event) => setContactName(event.target.value),
									required: true,
									maxLength: 200
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "order-contact",
									children: tr(locale, "How to reach you", "Как с вами связаться")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "order-contact",
									value: contactChannel,
									onChange: (event) => setContactChannel(event.target.value),
									placeholder: tr(locale, "WhatsApp, Telegram or email", "WhatsApp, Telegram или email"),
									required: true,
									maxLength: 300
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "order-comment",
								children: tr(locale, "Comment (optional)", "Комментарий (необязательно)")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								id: "order-comment",
								value: comment,
								onChange: (event) => setComment(event.target.value),
								rows: 3,
								maxLength: 2e3
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "order-promo",
									children: tr(locale, "Promo code (optional)", "Промокод (необязательно)")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "order-promo",
									value: promoCode,
									onChange: (event) => setPromoCode(event.target.value),
									maxLength: 100
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-[#574d45]",
									children: tr(locale, "A valid promo code makes this measurement free of charge.", "Действующий промокод делает этот замер бесплатным.")
								})
							]
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-[#9a5f14]",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								className: "selena-primary-button min-h-11",
								disabled: pending || !projectId,
								children: pending ? tr(locale, "Sending…", "Отправляем…") : tr(locale, "Send the request", "Отправить заявку")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app/selena",
								className: "text-sm underline",
								children: tr(locale, "Back to the cabinet", "Вернуться в кабинет")
							})]
						})
					]
				})
			]
		})
	});
}
//#endregion
export { SelenaOrderPage as component };

//# sourceMappingURL=selena-order-DTQ9y_Ck.mjs.map