import { i as __toESM } from "../_runtime.mjs";
import { C as IconLogout, H as IconChevronDown, N as IconExternalLink, U as IconCheck, V as IconChevronRight, X as IconArrowRight, _ as IconRefresh, f as IconSparkles, j as IconGlobe, nt as require_react, w as IconLock, x as IconMapPin, y as IconPlus, z as IconCircleDashed } from "../_libs/react+tabler__icons-react.mjs";
import { a as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-DFsJLuMy.mjs";
import { m as Link, x as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as resetPostHog } from "./posthog-DaElL-hv.mjs";
import { t as SelenaWordmark } from "./selena-wordmark-DhsBFluR.mjs";
import { t as Input } from "./input-BKn_RBJw.mjs";
import { t as Label } from "./label-D2dD1vst.mjs";
import { c as createServerFn } from "./createServerFn-CnO8ob2E.mjs";
import { t as createSsrRpc } from "./createSsrRpc-Bqc31yYQ.mjs";
import { M as string, O as object, c as _enum, f as array } from "../_libs/zod.mjs";
import { t as authClient } from "./client-CSZfU_Y2.mjs";
import { t as useAuth } from "./use-auth-CC3osVLV.mjs";
import { t as Checkbox } from "./checkbox-Bf5-JXC4.mjs";
import { t as validateWebsiteUrl } from "./brand-website-COFlckqV.mjs";
import { t as createSelenaProjectFn } from "./selena-client-DuI6j9MY.mjs";
import { t as Route } from "./selena-CB1KQQiH.mjs";
import { n as parseGoogleMapsLocation } from "./google-maps-location-Dex-PeaZ.mjs";
import { n as humanizeSelenaError } from "./selena-workspace-errors-D80mdaLm.mjs";
import { r as prepareSelenaScenariosFn } from "./selena-order-desk-bzehLOOg.mjs";
import { a as ruleExample, c as ruleSteps, i as listSelenaRunsFn, l as ruleTitle, n as getSelenaCycleCompareFn, o as ruleFixTask, r as getSelenaRunDetailFn, s as ruleHow } from "./selena-run-explorer-DSltl4Wv.mjs";
import { n as groupView, t as formatShare } from "./selena-measurement-view-Z1DAtP8m.mjs";
import { t as SUGGESTION_LIMITS } from "./selena-suggestion-ChgbW1K5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/selena-D2BAfN22.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "edb9461e-2883-4453-9fbd-e3128343bcd7", e._sentryDebugIdIdentifier = "sentry-dbid-edb9461e-2883-4453-9fbd-e3128343bcd7");
	} catch (e) {}
})();
function isRunAvailable(run) {
	const validity = run.validity?.toUpperCase();
	if (run.invalidReason || validity === "INVALID") return false;
	if (validity === "VALID") return true;
	return ["COMPLETED", "SUCCEEDED"].includes(run.status.toUpperCase());
}
function summarizeRuns(runs) {
	const available = runs.filter(isRunAvailable).length;
	return {
		total: runs.length,
		available,
		unavailable: runs.length - available
	};
}
function groupRunsByQuestion(runs) {
	const groups = /* @__PURE__ */ new Map();
	for (const run of runs) {
		const group = groups.get(run.scenarioId);
		if (group) group.runs.push(run);
		else groups.set(run.scenarioId, {
			scenarioId: run.scenarioId,
			scenarioText: run.scenarioText,
			runs: [run]
		});
	}
	return [...groups.values()].map((group) => ({
		...group,
		...summarizeRuns(group.runs)
	}));
}
/**
* Step 4 of the cabinet: what the paid measurement observed, straight from the
* evidence ledger. Branded and non-branded arrive as separate groups, an empty
* group arrives as UNKNOWN, and no composite score exists anywhere in the
* payload — the section renders exactly what the ledger can prove.
*/
var getSelenaMeasurementFn = createServerFn({ method: "GET" }).validator(object({ projectId: string().uuid() })).handler(createSsrRpc("db205754e7e78c00aadda3facc0efd2dd76f95da17da1d519c3d24cd58d9c0d5"));
var profileSchema = object({
	projectId: string().uuid(),
	brandName: string().trim().min(1).max(160),
	primaryDomain: string().trim().min(3).max(255),
	publicProfiles: array(object({
		platform: string().min(1),
		url: string().url()
	})).max(20),
	mapsLocationUrl: string().trim().max(2048).default(""),
	competitorSnapshot: array(object({
		name: string().min(1),
		domains: array(string()).default([])
	})).max(50),
	scenarioSnapshot: array(object({
		text: string().min(1),
		language: string().min(2),
		intentType: string().min(1)
	})).max(100)
});
var confirmSelenaProfileFn = createServerFn({ method: "POST" }).validator(profileSchema).handler(createSsrRpc("fd1a01f27660f737e20103cf6311b4d89923b2fd0316d7a0e089232ef62df1ef"));
/**
* Suggest competitors and customer questions from the project's own website.
*
* Owners rarely know who they compete with *inside an AI answer* — it is
* routinely a place they have never considered a rival. The research call
* reads the public site and proposes both lists as a starting hypothesis; the
* customer still edits and confirms them, and a paid measurement is what
* replaces the hypothesis with observed fact.
*
* Runs as a background job: this is an LLM + web-search round trip that takes
* about a minute, which a reverse proxy would cut off mid-request.
*/
var suggestionScopeSchema = object({ projectId: string().uuid() });
/**
* Free-text place context for the research prompt. The listing name comes
* from the customer's Google Maps link; the area comes from the project,
* because a share link often carries no readable fields at all.
*/
var startSelenaProfileSuggestionFn = createServerFn({ method: "POST" }).validator(suggestionScopeSchema.extend({
	website: string().trim().min(3).max(255),
	mapsLocationUrl: string().trim().max(2048).default("")
})).handler(createSsrRpc("5d038a85c5a2c4105b813f0890691c22a076e40eecd1e5a0a3204025aa7461fa"));
/** POST so no cache can pin an early `pending` and starve the poll. */
var getSelenaProfileSuggestionFn = createServerFn({ method: "POST" }).validator(suggestionScopeSchema).handler(createSsrRpc("fa370407bdeee6311af2f72e1d6338e70a580305c222baf9147b44df0f700a60"));
var cancelSelenaProfileSuggestionFn = createServerFn({ method: "POST" }).validator(suggestionScopeSchema).handler(createSsrRpc("2361f0d3ad7f61af6f587a26b733d8158e4aea6af4067178b6b68bb560e901a1"));
/**
* Step 2 of the cabinet: the questions a paid cycle would ask. The backend
* already refuses to build an order from anything but APPROVED scenarios;
* this read makes that state visible so the customer can decide it.
*/
var listSelenaScenariosFn = createServerFn({ method: "GET" }).validator(object({ projectId: string().uuid() })).handler(createSsrRpc("38ccccfeef11f41a6edcc70e65c90d50dea8d89718e94285ecbabb2a68518015"));
var reviewSelenaScenarioFn = createServerFn({ method: "POST" }).validator(object({
	scenarioId: string().uuid(),
	decision: _enum(["APPROVED", "REJECTED"]),
	text: string().max(2e3).optional()
})).handler(createSsrRpc("24ecf1adf006ead258e9f021c35ac897f967b50c156ff328d0a2cb3b6e685563"));
var collectSelenaWebsiteFn = createServerFn({ method: "POST" }).validator(object({ projectId: string().uuid() })).handler(createSsrRpc("2e23353b5d22ea5821a70811e083e4e964ca57aabe94300278bb2fdda456e0f4"));
/** How long to keep polling a suggestion before calling it stuck. */
var SUGGESTION_POLL_MS = 4e3;
var SUGGESTION_TIMEOUT_MS = 18e4;
var emptyProjectForm = {
	name: "",
	category: "",
	country: "ID",
	region: "",
	languages: "en"
};
var emptyProfileForm = {
	brandName: "",
	primaryDomain: "",
	mapsLocation: "",
	publicProfiles: "",
	competitors: "",
	scenarios: ""
};
function SelenaWorkspace() {
	const { workspace, localVisibility } = Route.useLoaderData();
	const { projects } = workspace;
	const router = useRouter();
	const { user } = useAuth();
	const [selectedProjectId, setSelectedProjectId] = (0, import_react.useState)(projects[0]?.project.id ?? "");
	const [showCreate, setShowCreate] = (0, import_react.useState)(projects.length === 0);
	const [projectForm, setProjectForm] = (0, import_react.useState)(emptyProjectForm);
	const [profileForm, setProfileForm] = (0, import_react.useState)(emptyProfileForm);
	const [pendingAction, setPendingAction] = (0, import_react.useState)("");
	const [feedbackScope, setFeedbackScope] = (0, import_react.useState)("");
	const [suggesting, setSuggesting] = (0, import_react.useState)(false);
	const [suggestion, setSuggestion] = (0, import_react.useState)(null);
	const [notice, setNotice] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [locale, setLocale] = (0, import_react.useState)("en");
	const selectedProject = (0, import_react.useMemo)(() => projects.find((item) => item.project.id === selectedProjectId) ?? projects[0] ?? null, [projects, selectedProjectId]);
	(0, import_react.useEffect)(() => {
		if (!selectedProject && projects[0]) setSelectedProjectId(projects[0].project.id);
	}, [projects, selectedProject]);
	(0, import_react.useEffect)(() => {
		const savedLocale = window.localStorage.getItem("selena-workspace-locale");
		const nextLocale = savedLocale === "ru" || savedLocale === "en" ? savedLocale : navigator.language.startsWith("ru") ? "ru" : "en";
		setLocale(nextLocale);
		document.documentElement.lang = nextLocale;
	}, []);
	(0, import_react.useEffect)(() => {
		if (!selectedProject?.profile) {
			setProfileForm(emptyProfileForm);
			return;
		}
		setProfileForm({
			brandName: selectedProject.profile.brandName,
			primaryDomain: selectedProject.profile.primaryDomain,
			mapsLocation: readObjectString(selectedProject.profile.mapsLocation, "url"),
			publicProfiles: selectedProject.profile.publicProfiles.map((item) => readObjectString(item, "url")).filter(Boolean).join(", "),
			competitors: selectedProject.profile.competitors.map((item) => readObjectString(item, "name")).filter(Boolean).join(", "),
			scenarios: selectedProject.profile.scenarios.map((item) => {
				const text = readObjectString(item, "text");
				const language = readObjectString(item, "language");
				return text ? `${language ? `${language.toUpperCase()}: ` : ""}${text}` : "";
			}).filter(Boolean).join("\n")
		});
	}, [selectedProject]);
	const refreshWorkspace = async () => {
		await router.invalidate();
	};
	const onProfileNormalized = (patch) => setProfileForm((current) => ({
		...current,
		...patch
	}));
	const runSuggestion = async (auto) => {
		if (!selectedProject || suggesting) return;
		const website = validateWebsiteUrl(profileForm.primaryDomain);
		if (!website.isValid) {
			setFeedbackScope("profile");
			setError(tr(locale, "Enter the primary website first — the suggestion is read from it.", "Сначала укажите основной сайт — подбор читает именно его."));
			return;
		}
		let mapsLocationUrl = "";
		if (profileForm.mapsLocation.trim()) {
			const maps = parseGoogleMapsLocation(profileForm.mapsLocation);
			if (!maps.isValid) {
				setFeedbackScope("profile");
				setError(tr(locale, "«Google Maps location»: we could not read the link. Paste your place's share link, for example https://maps.app.goo.gl/…", "«Локация в Google Maps»: ссылка не распознана. Вставьте ссылку «Поделиться» вашей точки, например https://maps.app.goo.gl/…"));
				return;
			}
			mapsLocationUrl = maps.location.url;
		}
		const projectId = selectedProject.project.id;
		setFeedbackScope("profile");
		setError("");
		setNotice(auto ? tr(locale, "Picking customer questions from the website — about a minute. Review them below, then confirm the profile.", "Подбираем вопросы по сайту — около минуты. Они появятся ниже: поправьте и подтвердите профиль.") : "");
		setSuggesting(true);
		try {
			await startSelenaProfileSuggestionFn({ data: {
				projectId,
				website: website.formattedUrl,
				mapsLocationUrl
			} });
			const deadline = Date.now() + SUGGESTION_TIMEOUT_MS;
			while (Date.now() < deadline) {
				await new Promise((resolve) => setTimeout(resolve, SUGGESTION_POLL_MS));
				const result = await getSelenaProfileSuggestionFn({ data: { projectId } });
				if (result.status === "failed") throw new Error(result.error);
				if (result.status === "done") {
					onProfileNormalized({ primaryDomain: website.formattedUrl });
					setSuggestion({
						competitors: result.competitors.split(",").map((item) => item.trim()).filter(Boolean),
						questions: result.questions.split("\n").map((item) => item.trim()).filter(Boolean)
					});
					setNotice(tr(locale, "Done: tick the competitors and questions you agree with, then accept the selection.", "Готово: отметьте галочками конкурентов и вопросы, с которыми согласны, и примите выбранное."));
					return;
				}
			}
			await cancelSelenaProfileSuggestionFn({ data: { projectId } }).catch(() => {});
			setError(tr(locale, "The suggestion is taking too long. Fill the lists in by hand, or try again later.", "Подбор занимает слишком долго. Заполните списки вручную или попробуйте позже."));
		} catch (cause) {
			setNotice("");
			setError(humanizeSelenaError(cause, locale, tr(locale, "We could not suggest competitors and questions. Fill them in by hand.", "Не удалось подобрать конкурентов и вопросы. Заполните их вручную.")));
		} finally {
			setSuggesting(false);
		}
	};
	const suggestProfile = () => runSuggestion(false);
	const createProject = async (event) => {
		event.preventDefault();
		setPendingAction("project");
		setFeedbackScope("project");
		setError("");
		setNotice("");
		try {
			const created = await createSelenaProjectFn({ data: {
				...projectForm,
				country: projectForm.country.trim().toUpperCase(),
				region: projectForm.region.trim() || void 0,
				languages: projectForm.languages.split(",").map((item) => item.trim()).filter(Boolean)
			} });
			setProjectForm(emptyProjectForm);
			setSelectedProjectId(created.id);
			setShowCreate(false);
			setNotice(tr(locale, "Project created. Complete the brand profile to prepare the website review.", "Проект создан. Заполните профиль бренда, чтобы подготовить проверку сайта."));
			await refreshWorkspace();
		} catch (cause) {
			setError(humanizeSelenaError(cause, locale, tr(locale, "We could not create this project. Please try again.", "Не удалось создать проект. Попробуйте ещё раз.")));
		} finally {
			setPendingAction("");
		}
	};
	const saveProfile = async (event) => {
		event.preventDefault();
		if (!selectedProject) return;
		setFeedbackScope("profile");
		setError("");
		setNotice("");
		const primary = validateWebsiteUrl(profileForm.primaryDomain);
		if (!primary.isValid) {
			setError(tr(locale, "«Primary website»: enter the full address, for example https://example.com", "«Основной сайт»: укажите полный адрес, например https://example.com"));
			return;
		}
		let mapsLocationUrl = "";
		if (profileForm.mapsLocation.trim()) {
			const maps = parseGoogleMapsLocation(profileForm.mapsLocation);
			if (!maps.isValid) {
				setError(tr(locale, "«Google Maps location»: we could not read the link. Paste your place's share link, for example https://maps.app.goo.gl/…", "«Локация в Google Maps»: ссылка не распознана. Вставьте ссылку «Поделиться» вашей точки, например https://maps.app.goo.gl/…"));
				return;
			}
			mapsLocationUrl = maps.location.url;
		}
		const publicProfiles = [];
		for (const input of splitList(profileForm.publicProfiles)) {
			const link = validateWebsiteUrl(input);
			if (!link.isValid) {
				setError(locale === "ru" ? `«Ссылки на публичные профили»: адрес «${input}» не распознан. Укажите полный адрес, например https://instagram.com/username` : `«Public profile links»: we could not read «${input}». Enter the full address, for example https://instagram.com/username`);
				return;
			}
			publicProfiles.push(link.formattedUrl);
		}
		onProfileNormalized({
			primaryDomain: primary.formattedUrl,
			mapsLocation: mapsLocationUrl,
			publicProfiles: publicProfiles.join(", ")
		});
		const scenarioSnapshot = profileForm.scenarios.split("\n").map((line) => parseScenario(line, selectedProject.project.languages[0] ?? "en")).filter((item) => item !== null);
		if (scenarioSnapshot.length === 0) {
			await runSuggestion(true);
			return;
		}
		setPendingAction("profile");
		try {
			await confirmSelenaProfileFn({ data: {
				projectId: selectedProject.project.id,
				brandName: profileForm.brandName.trim(),
				primaryDomain: primary.formattedUrl,
				publicProfiles: publicProfiles.map((url) => ({
					platform: "public",
					url
				})),
				mapsLocationUrl,
				competitorSnapshot: splitList(profileForm.competitors).map((name) => ({
					name,
					domains: []
				})),
				scenarioSnapshot
			} });
			setNotice(tr(locale, "Brand profile saved. You can now review the public website.", "Профиль бренда сохранён. Теперь можно проверить публичный сайт."));
			await refreshWorkspace();
		} catch (cause) {
			setError(humanizeSelenaError(cause, locale, tr(locale, "We could not save the brand profile. Please try again.", "Не удалось сохранить профиль бренда. Попробуйте ещё раз.")));
		} finally {
			setPendingAction("");
		}
	};
	const collectWebsite = async () => {
		if (!selectedProject) return;
		setPendingAction("website");
		setFeedbackScope("website");
		setError("");
		setNotice("");
		try {
			const result = await collectSelenaWebsiteFn({ data: { projectId: selectedProject.project.id } });
			setNotice(locale === "ru" ? `Проверка сайта завершена. Найдено рекомендаций: ${result.actionPlan.findings.length}.` : `Website review complete. ${result.actionPlan.findings.length} finding${result.actionPlan.findings.length === 1 ? " is" : "s are"} ready to review.`);
			await refreshWorkspace();
		} catch (cause) {
			setError(humanizeSelenaError(cause, locale, tr(locale, "We could not review the confirmed website. Check the address and try again.", "Не удалось проверить подтверждённый сайт. Проверьте адрес и попробуйте ещё раз.")));
		} finally {
			setPendingAction("");
		}
	};
	const signOut = () => {
		authClient.signOut({ fetchOptions: { onSuccess: () => {
			resetPostHog();
			window.location.href = "/auth/logout";
		} } });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "selena-app min-h-screen",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "selena-app-header",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 items-center gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelenaWordmark, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden h-6 w-px bg-[#d9cfc2] sm:block",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden truncate text-sm font-medium text-[#574d45] sm:block",
							children: tr(locale, "AI Visibility", "Видимость в AI")
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app/selena-sources",
							className: "selena-text-button hidden sm:inline-flex",
							children: tr(locale, "Sources", "Источники")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "https://www.selenasystems.com/visibility",
							target: "_blank",
							rel: "noreferrer",
							className: "selena-text-button hidden sm:inline-flex",
							children: [
								tr(locale, "How it works", "Как это работает"),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconExternalLink, { className: "size-4" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
							className: "selena-locale-switch",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
								className: "sr-only",
								children: tr(locale, "Interface language", "Язык интерфейса")
							}), ["en", "ru"].map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": locale === option,
								onClick: () => {
									setLocale(option);
									window.localStorage.setItem("selena-workspace-locale", option);
									document.documentElement.lang = option;
								},
								children: option.toUpperCase()
							}, option))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "ghost",
							className: "min-h-11 gap-2",
							onClick: signOut,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hidden max-w-40 truncate sm:inline",
									children: user?.name || user?.email || tr(locale, "Account", "Аккаунт")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLogout, { className: "size-4" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sr-only",
									children: tr(locale, "Sign out", "Выйти")
								})
							]
						})
					]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:py-12",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "min-w-0 space-y-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "selena-heading text-3xl text-[#181614]",
						children: tr(locale, "Your projects", "Ваши проекты")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-6 text-[#574d45]",
						children: tr(locale, "One place for evidence, results and your action plan.", "Все данные, результаты и план действий в одном месте.")
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						className: "selena-primary-button w-full",
						onClick: () => setShowCreate((value) => !value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconPlus, { className: "size-4" }), tr(locale, "New project", "Новый проект")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						"aria-label": tr(locale, "Projects", "Проекты"),
						className: "selena-project-nav space-y-2",
						children: projects.map((item) => {
							const selected = item.project.id === selectedProject?.project.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "selena-project-link",
								"data-selected": selected || void 0,
								"aria-pressed": selected,
								onClick: () => {
									setSelectedProjectId(item.project.id);
									setShowCreate(false);
									setNotice("");
									setError("");
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: item.project.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-[#574d45]",
										children: projectStageLabel(item, locale)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-[#8a7d70]",
										children: lastAuditLabel(item, locale)
									})
								]
							}, item.project.id);
						})
					}),
					projects.length === 0 && !showCreate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-xl border border-dashed border-[#d9cfc2] p-4 text-sm text-[#574d45]",
						children: tr(locale, "Create your first project to begin.", "Создайте первый проект, чтобы начать.")
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 space-y-7",
				children: [showCreate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateProjectForm, {
					locale,
					form: projectForm,
					pending: pendingAction === "project",
					feedback: feedbackScope === "project" ? {
						notice,
						error
					} : void 0,
					onChange: setProjectForm,
					onSubmit: createProject,
					onCancel: projects.length > 0 ? () => setShowCreate(false) : void 0
				}), !showCreate && selectedProject && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProjectOverview, {
						project: selectedProject,
						locale
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SetupProgress, {
						project: selectedProject,
						locale
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandProfileForm, {
						locale,
						project: selectedProject,
						form: profileForm,
						pending: pendingAction === "profile",
						feedback: feedbackScope === "profile" ? {
							notice,
							error
						} : void 0,
						suggesting,
						suggestion,
						onChange: setProfileForm,
						onSubmit: saveProfile,
						onSuggest: suggestProfile,
						onApplySuggestion: (competitors, questions) => {
							setProfileForm((current) => ({
								...current,
								competitors: competitors.join(", "),
								scenarios: questions.join("\n")
							}));
							setSuggestion(null);
							setNotice(tr(locale, "Accepted. Check the fields and confirm the profile.", "Принято. Проверьте поля и подтвердите профиль."));
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WebsiteEvidence, {
						locale,
						project: selectedProject,
						pending: pendingAction === "website",
						feedback: feedbackScope === "website" ? {
							notice,
							error
						} : void 0,
						onCollect: collectWebsite
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionsPanel, {
						project: selectedProject,
						locale
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeasurementPanel, {
						project: selectedProject,
						locale
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalVisibilityPanel, {
						state: localVisibility,
						locale
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultsPanel, {
						project: selectedProject,
						locale
					})
				] })]
			})]
		})]
	});
}
function LocalVisibilityPanel({ state, locale }) {
	const mapsStatus = state.enabled ? "UNKNOWN" : "LOCKED";
	const localAiStatus = "LOCKED";
	const statusLabel = (status) => status === "LOCKED" ? tr(locale, "LOCKED", "ЗАКРЫТО") : tr(locale, "UNKNOWN", "НЕИЗВЕСТНО");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section",
		"aria-labelledby": "local-visibility-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "selena-icon-disc",
						children: state.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconMapPin, {
							className: "size-5",
							"aria-hidden": "true"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLock, {
							className: "size-5",
							"aria-hidden": "true"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "local-visibility-title",
						className: "selena-heading text-2xl",
						children: tr(locale, "6 · Local visibility", "6 · Локальная видимость")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-2xl text-sm leading-6 text-[#574d45]",
						children: tr(locale, "A planned Google Maps visibility view for approved coordinates and searches. Data appears only after a separately approved local scan is enabled and completed.", "Запланированный обзор видимости в Google Maps по утверждённым координатам и запросам. Данные появятся только после отдельного утверждения, включения и завершения локального скана.")
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "inline-flex min-h-8 items-center rounded-full border border-[#d9cfc2] bg-[#fffdf8] px-3 text-xs font-semibold text-[#574d45]",
					children: statusLabel(state.enabled ? "UNKNOWN" : "LOCKED")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 max-w-3xl text-sm leading-6 text-[#574d45]",
				children: tr(locale, "Read-only status only. This cabinet never starts a local scan or an AI capture.", "Только статус в режиме чтения. Этот кабинет не запускает локальный скан или захват ответов AI.")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/app/selena-horeca",
				className: "mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#8f5c34] underline decoration-[#b9825b] underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[#8f5c34]",
				children: [tr(locale, "Open the HoReCa Local-first view", "Открыть HoReCa Local-first"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowRight, {
					className: "size-4",
					"aria-hidden": "true"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-4 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalVisibilitySurface, {
					locale,
					title: tr(locale, "Local Maps", "Local Maps"),
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconMapPin, {
						className: "size-5",
						"aria-hidden": "true"
					}),
					status: mapsStatus,
					statusLabel: statusLabel(mapsStatus),
					description: state.enabled ? tr(locale, "Approved coordinates and searches will appear here only after a separately approved local cycle records its points.", "Утверждённые координаты и запросы появятся здесь только после отдельного утверждения и записи точек локального цикла.") : tr(locale, "This deployment has not enabled the Local Maps surface. No map scan can start while it is locked.", "В этом развёртывании Local Maps не включён. Пока поверхность закрыта, сканирование карт не запустится."),
					emptyState: state.enabled ? tr(locale, "No local measurement data yet.", "Данных локального замера пока нет.") : tr(locale, "Local Maps is unavailable here.", "Local Maps здесь недоступен.")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocalVisibilitySurface, {
					locale,
					title: tr(locale, "Google Ask Maps", "Google Ask Maps"),
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSparkles, {
						className: "size-5",
						"aria-hidden": "true"
					}),
					status: localAiStatus,
					statusLabel: statusLabel(localAiStatus),
					description: tr(locale, "Google Ask Maps is a manual, owner-gated capture surface for conversational answers inside Google Maps. It is not an ordinary Maps ranking and is not available as an automated customer action.", "Google Ask Maps — ручная проверка разговорных ответов внутри Google Maps под контролем владельца. Это не позиция в карте и не автоматическое действие для клиента."),
					emptyState: tr(locale, "No Google Ask Maps pilot data is available.", "Данных пилота Google Ask Maps нет.")
				})]
			})
		]
	});
}
function LocalVisibilitySurface({ locale, title, icon, status, statusLabel, description, emptyState }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-56 flex-col rounded-xl border border-[#dccfbe] bg-[#fbf7f1] p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "selena-icon-disc size-10",
						"aria-hidden": "true",
						children: icon
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "selena-heading text-xl text-[#181614]",
						children: title
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#d9cfc2] bg-[#fffdf8] px-2.5 text-[0.6875rem] font-bold tracking-[0.08em] text-[#574d45]",
					"data-state": status.toLowerCase(),
					children: [status === "LOCKED" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLock, {
						className: "size-3.5",
						"aria-hidden": "true"
					}), statusLabel]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm leading-6 text-[#574d45]",
				children: description
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-auto border-t border-[#dccfbe] pt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-[#181614]",
					children: emptyState
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs leading-5 text-[#574d45]",
					children: tr(locale, "Nothing is run from this panel.", "Из этой панели ничего не запускается.")
				})]
			})
		]
	});
}
function ProjectOverview({ project, locale }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-hero-panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-[#d9aa86]",
					children: project.project.category
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "selena-heading mt-2 text-4xl text-[#fffdf8] sm:text-5xl",
					children: project.project.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 max-w-xl text-base leading-7 text-[#e9dfd4]",
					children: [
						project.project.region ? `${project.project.region}, ` : "",
						project.project.country,
						" · ",
						project.project.languages.map((language) => language.toUpperCase()).join(" + ")
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-8 flex flex-wrap items-center gap-3 text-sm text-[#e9dfd4]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "selena-status-chip",
					children: projectStageLabel(project, locale)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: lastAuditLabel(project, locale) }),
				project.measurement && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: locale === "ru" ? `Проверено ответов: ${project.measurement.completedRuns} из ${project.measurement.expectedRuns}` : `${project.measurement.completedRuns} of ${project.measurement.expectedRuns} answers checked` })
			]
		})]
	});
}
function SetupProgress({ project, locale }) {
	const steps = [
		{
			label: tr(locale, "Project created", "Проект создан"),
			complete: true
		},
		{
			label: tr(locale, "Brand profile confirmed", "Профиль бренда подтверждён"),
			complete: Boolean(project.profile)
		},
		{
			label: tr(locale, "Technical website check complete", "Техническая проверка сайта завершена"),
			complete: Boolean(project.website)
		},
		{
			label: tr(locale, "AI visibility report available", "Отчёт о видимости в AI готов"),
			complete: project.measurement?.status === "READY"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		"aria-labelledby": "setup-progress-title",
		className: "selena-section",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-end justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				id: "setup-progress-title",
				className: "selena-heading text-2xl",
				children: tr(locale, "1 · Setup progress", "1 · Подготовка проекта")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-6 text-[#574d45]",
				children: tr(locale, "Complete these steps to prepare the project and its AI visibility report.", "Выполните эти шаги, чтобы подготовить проект и отчёт о видимости в AI.")
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-sm font-semibold text-[#8f5c34]",
				children: [steps.filter((step) => step.complete).length, "/4"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "mt-6 grid gap-3 sm:grid-cols-2",
			children: steps.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex min-h-14 items-center gap-3 border-t border-[#dccfbe] pt-3 text-sm",
				children: [step.complete ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconCheck, {
					className: "size-5 shrink-0 text-[#2e7d4f]",
					"aria-hidden": "true"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconCircleDashed, {
					className: "size-5 shrink-0 text-[#8e8175]",
					"aria-hidden": "true"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: step.complete ? "font-medium text-[#181614]" : "text-[#574d45]",
					children: step.label
				})]
			}, step.label))
		})]
	});
}
function CreateProjectForm({ locale, form, pending, feedback, onChange, onSubmit, onCancel }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "selena-heading text-3xl",
				children: tr(locale, "Create a project", "Создать проект")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-2xl text-sm leading-6 text-[#574d45]",
				children: tr(locale, "Start with the business and market you want to understand. Creating a project does not start a paid scan.", "Укажите бизнес и рынок, который хотите изучить. Создание проекта не запускает платную проверку.")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "mt-7 grid gap-5 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: tr(locale, "Project name", "Название проекта"),
						htmlFor: "project-name",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "project-name",
							required: true,
							value: form.name,
							onChange: (event) => onChange({
								...form,
								name: event.target.value
							}),
							placeholder: "Usha Bakery"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: tr(locale, "Business category", "Категория бизнеса"),
						htmlFor: "project-category",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "project-category",
							required: true,
							value: form.category,
							onChange: (event) => onChange({
								...form,
								category: event.target.value
							}),
							placeholder: "Cafe and restaurant"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: tr(locale, "Country code", "Код страны"),
						hint: tr(locale, "Two letters, for example ID or US", "Две буквы, например ID или US"),
						htmlFor: "project-country",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "project-country",
							required: true,
							minLength: 2,
							maxLength: 2,
							value: form.country,
							onChange: (event) => onChange({
								...form,
								country: event.target.value.toUpperCase()
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: tr(locale, "City or region", "Город или регион"),
						htmlFor: "project-region",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "project-region",
							value: form.region,
							onChange: (event) => onChange({
								...form,
								region: event.target.value
							}),
							placeholder: "Ubud"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: tr(locale, "Languages", "Языки"),
						hint: tr(locale, "Comma separated, for example en, ru", "Через запятую, например en, ru"),
						htmlFor: "project-languages",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "project-languages",
							required: true,
							value: form.languages,
							onChange: (event) => onChange({
								...form,
								languages: event.target.value.toLowerCase()
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormFeedback, {
						feedback,
						className: "sm:col-span-2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-end gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							className: "selena-primary-button min-h-11",
							disabled: pending,
							children: [
								pending ? tr(locale, "Creating…", "Создаём…") : tr(locale, "Create project", "Создать проект"),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowRight, { className: "size-4" })
							]
						}), onCancel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							className: "min-h-11",
							onClick: onCancel,
							children: tr(locale, "Cancel", "Отмена")
						})]
					})
				]
			})
		]
	});
}
/**
* The suggested competitors and questions, each behind a checkbox — accepting
* the selection is the customer's judgement, so nothing lands in the fields
* without their tick.
*/
function SuggestionPicker({ locale, suggestion, onApply }) {
	const [checkedCompetitors, setCheckedCompetitors] = (0, import_react.useState)(new Set(suggestion.competitors));
	const [checkedQuestions, setCheckedQuestions] = (0, import_react.useState)(new Set(suggestion.questions));
	(0, import_react.useEffect)(() => {
		setCheckedCompetitors(new Set(suggestion.competitors));
		setCheckedQuestions(new Set(suggestion.questions));
	}, [suggestion]);
	const toggle = (set, update, value) => {
		const next = new Set(set);
		if (next.has(value)) next.delete(value);
		else next.add(value);
		update(next);
	};
	const group = (title, items, checked, update, prefix) => items.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-xs font-semibold uppercase tracking-wide text-[#574d45]",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "mt-2 grid gap-1.5",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex items-start gap-2.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
				id: `${prefix}-${item}`,
				checked: checked.has(item),
				onCheckedChange: () => toggle(checked, update, item),
				className: "mt-0.5"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: `${prefix}-${item}`,
				className: "cursor-pointer text-sm leading-6",
				children: item
			})]
		}, item))
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 border-t border-[#dccfbe] pt-4",
		children: [
			group(tr(locale, "Suggested competitors", "Предложенные конкуренты"), suggestion.competitors, checkedCompetitors, setCheckedCompetitors, "sc"),
			group(tr(locale, "Suggested questions", "Предложенные вопросы"), suggestion.questions, checkedQuestions, setCheckedQuestions, "sq"),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					size: "sm",
					disabled: checkedCompetitors.size + checkedQuestions.size === 0,
					onClick: () => onApply(suggestion.competitors.filter((item) => checkedCompetitors.has(item)), suggestion.questions.filter((item) => checkedQuestions.has(item))),
					children: tr(locale, `Accept checked (${checkedCompetitors.size + checkedQuestions.size})`, `Принять отмеченные (${checkedCompetitors.size + checkedQuestions.size})`)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs text-[#574d45]",
					children: tr(locale, "They will fill the Competitors and Customer questions fields below.", "Они заполнят поля «Конкуренты» и «Вопросы клиентов» ниже.")
				})]
			})
		]
	});
}
function BrandProfileForm({ locale, project, form, pending, feedback, suggesting, suggestion, onChange, onSubmit, onSuggest, onApplySuggestion }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section",
		"aria-labelledby": "brand-profile-title",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-start justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				id: "brand-profile-title",
				className: "selena-heading text-2xl",
				children: tr(locale, "2 · Brand profile", "2 · Профиль бренда")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-2xl text-sm leading-6 text-[#574d45]",
				children: tr(locale, "Confirm the public information and the questions customers ask. AI visibility checks start only after you approve a plan.", "Подтвердите публичную информацию и вопросы клиентов. Проверка видимости в AI начнётся только после выбора плана.")
			})] }), project.profile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "selena-success-label",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconCheck, { className: "size-4" }),
					" ",
					tr(locale, "Saved", "Сохранено")
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit,
			className: "mt-7 grid gap-5 sm:grid-cols-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: tr(locale, "Public brand name", "Публичное название бренда"),
					htmlFor: "brand-name",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "brand-name",
						required: true,
						value: form.brandName,
						onChange: (event) => onChange({
							...form,
							brandName: event.target.value
						}),
						placeholder: project.project.name
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: tr(locale, "Primary website", "Основной сайт"),
					htmlFor: "primary-domain",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "primary-domain",
						required: true,
						inputMode: "url",
						autoComplete: "url",
						autoCapitalize: "none",
						spellCheck: false,
						value: form.primaryDomain,
						onChange: (event) => onChange({
							...form,
							primaryDomain: event.target.value
						}),
						placeholder: "example.com"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: tr(locale, "Google Maps location", "Локация в Google Maps"),
					hint: tr(locale, "Optional. Your place's share link — it pins the exact business for local questions", "Необязательно. Ссылка «Поделиться» вашей точки — она однозначно указывает бизнес в локальных вопросах"),
					htmlFor: "maps-location",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "maps-location",
						inputMode: "url",
						autoCapitalize: "none",
						spellCheck: false,
						value: form.mapsLocation,
						onChange: (event) => onChange({
							...form,
							mapsLocation: event.target.value
						}),
						placeholder: "https://maps.app.goo.gl/…"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: tr(locale, "Public profile links", "Ссылки на публичные профили"),
					hint: tr(locale, "Optional. Instagram, TripAdvisor — comma separated", "Необязательно. Instagram, TripAdvisor — через запятую"),
					htmlFor: "public-profiles",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "public-profiles",
						inputMode: "url",
						autoCapitalize: "none",
						spellCheck: false,
						value: form.publicProfiles,
						onChange: (event) => onChange({
							...form,
							publicProfiles: event.target.value
						}),
						placeholder: tr(locale, "Instagram or other public profile", "Instagram или другой публичный профиль")
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-3 rounded-xl border border-[#dccfbe] bg-[#fbf7f1] p-4 sm:col-span-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm leading-6 text-[#574d45]",
								children: locale === "ru" ? `Не уверены, кого писать в конкурентах и какие вопросы задать? Мы прочитаем сайт выше и предложим до ${SUGGESTION_LIMITS.competitors} конкурентов и ${SUGGESTION_LIMITS.questions} вопросов — вы отметите галочками, что оставить.` : `Not sure who to list or what to ask? We read the website above and propose up to ${SUGGESTION_LIMITS.competitors} competitors and ${SUGGESTION_LIMITS.questions} questions — you tick what stays.`
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								variant: "outline",
								className: "min-h-11 shrink-0 border-[#cdbdac] bg-[#fffdf8]",
								disabled: suggesting || pending,
								onClick: onSuggest,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconRefresh, { className: suggesting ? "size-4 animate-spin" : "hidden" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSparkles, { className: suggesting ? "hidden" : "size-4" }),
									suggesting ? tr(locale, "Reading the site…", "Читаем сайт…") : tr(locale, "Suggest automatically", "Подобрать автоматически")
								]
							})]
						}),
						suggesting && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"aria-live": "polite",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#8f5c34]",
								children: tr(locale, "Working: reading the pages and drafting the lists — usually about a minute. Do not leave the page.", "Идёт работа: читаем страницы и готовим списки — обычно около минуты. Не уходите со страницы.")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 h-1.5 overflow-hidden rounded-full bg-[#ece4d7]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "selena-progress-strip h-full w-1/3 rounded-full bg-[#b9825b]" })
							})]
						}),
						suggestion && !suggesting && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuggestionPicker, {
							locale,
							suggestion,
							onApply: onApplySuggestion
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: tr(locale, "Competitors", "Конкуренты"),
					hint: tr(locale, "Comma separated", "Через запятую"),
					htmlFor: "competitors",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "competitors",
						value: form.competitors,
						onChange: (event) => onChange({
							...form,
							competitors: event.target.value
						}),
						placeholder: "Competitor One, Competitor Two"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sm:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: tr(locale, "Customer questions", "Вопросы клиентов"),
						hint: tr(locale, "One per line. Add EN: or RU: to specify the language. Leave it empty — questions are suggested when you confirm.", "Один вопрос в строке. Добавьте EN: или RU:, чтобы указать язык. Оставьте пустым — вопросы подберутся сами при подтверждении."),
						htmlFor: "scenarios",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							id: "scenarios",
							className: "selena-textarea",
							value: form.scenarios,
							onChange: (event) => onChange({
								...form,
								scenarios: event.target.value
							}),
							placeholder: "EN: we're in ubud for a week — where do we get breakfast with good coffee?\nRU: мы в Убуде на неделю — где вкусно позавтракать?"
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormFeedback, {
					feedback,
					className: "sm:col-span-2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sm:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "selena-primary-button min-h-11",
						disabled: pending,
						children: pending ? tr(locale, "Saving…", "Сохраняем…") : project.profile ? tr(locale, "Save changes", "Сохранить изменения") : tr(locale, "Confirm brand profile", "Подтвердить профиль бренда")
					})
				})
			]
		})]
	});
}
function WebsiteEvidence({ locale, project, pending, feedback, onCollect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section",
		"aria-labelledby": "website-evidence-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "selena-icon-disc",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconGlobe, { className: "size-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "website-evidence-title",
						className: "selena-heading text-2xl",
						children: tr(locale, "3 · Technical website check", "3 · Техническая проверка сайта")
					}), project.website ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm leading-6 text-[#574d45]",
						children: [
							tr(locale, "Last reviewed", "Последняя проверка"),
							" ",
							formatDate(project.website.capturedAt, locale),
							" ·",
							" ",
							project.website.website
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-6 text-[#574d45]",
						children: tr(locale, "How technically ready the site is for AI agents to read: crawling, structure, markup. This is not a visibility measurement.", "Насколько сайт технически готов к чтению AI-агентами: краулинг, структура, разметка. Это не замер видимости.")
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "outline",
					className: "min-h-11 shrink-0 border-[#cdbdac] bg-[#fffdf8]",
					disabled: !project.profile || pending,
					onClick: onCollect,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconRefresh, { className: pending ? "size-4 animate-spin" : "size-4" }), pending ? tr(locale, "Reviewing…", "Проверяем…") : project.website ? tr(locale, "Review again", "Проверить снова") : tr(locale, "Review website", "Проверить сайт")]
				})]
			}),
			!project.profile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-[#9a5f14]",
				children: tr(locale, "Save the brand profile before reviewing the website.", "Сохраните профиль бренда перед проверкой сайта.")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormFeedback, {
				feedback,
				className: "mt-5"
			})
		]
	});
}
/**
* Step 2 of the cabinet: approving the questions a paid cycle will ask. The
* backend has always refused to order unapproved scenarios; this screen makes
* that decision the customer's. Text can be edited only as part of the
* decision — the same single repository path the operator desk uses.
*/
function QuestionsPanel({ project, locale }) {
	const [scenarios, setScenarios] = (0, import_react.useState)(null);
	const [failed, setFailed] = (0, import_react.useState)(false);
	const [drafts, setDrafts] = (0, import_react.useState)({});
	const [checked, setChecked] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [bulkBusy, setBulkBusy] = (0, import_react.useState)(false);
	const [busyId, setBusyId] = (0, import_react.useState)("");
	const [rowError, setRowError] = (0, import_react.useState)("");
	const load = () => {
		listSelenaScenariosFn({ data: { projectId: project.project.id } }).then((data) => setScenarios(data.scenarios)).catch(() => setFailed(true));
	};
	(0, import_react.useEffect)(load, [project.project.id]);
	(0, import_react.useEffect)(() => {
		setChecked(new Set((scenarios ?? []).filter((item) => item.status === "PROPOSED").map((item) => item.id)));
	}, [scenarios]);
	const decideChecked = async (decision) => {
		const targets = proposed.filter((scenario) => checked.has(scenario.id));
		if (targets.length === 0) return;
		setBulkBusy(true);
		setRowError("");
		try {
			for (const scenario of targets) {
				const draft = drafts[scenario.id];
				await reviewSelenaScenarioFn({ data: {
					scenarioId: scenario.id,
					decision,
					...draft !== void 0 && draft !== scenario.text ? { text: draft } : {}
				} });
			}
			load();
		} catch (cause) {
			setRowError(humanizeSelenaError(cause, locale, tr(locale, "Could not save the decision. Try again.", "Не удалось сохранить решение. Попробуйте ещё раз.")));
		} finally {
			setBulkBusy(false);
		}
	};
	const proposed = scenarios?.filter((item) => item.status === "PROPOSED") ?? [];
	const decided = scenarios?.filter((item) => item.status !== "PROPOSED") ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section",
		"aria-labelledby": "questions-title",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "selena-icon-disc",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconCheck, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "questions-title",
					className: "selena-heading text-2xl",
					children: tr(locale, "4 · Approve the questions", "4 · Утвердите вопросы")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-sm leading-6 text-[#574d45]",
					children: tr(locale, "A paid measurement asks only questions you approved. Edit the wording if needed, then approve or reject each one — nothing runs on unapproved questions.", "Платный замер задаёт только утверждённые вами вопросы. Поправьте формулировку, если нужно, и утвердите или отклоните каждый — по неутверждённым вопросам ничего не запускается.")
				})] })]
			}),
			project.profile?.confirmedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					size: "sm",
					className: "border-[#cdbdac] bg-[#fffdf8]",
					disabled: busyId === "prepare",
					onClick: async () => {
						setBusyId("prepare");
						setRowError("");
						try {
							await prepareSelenaScenariosFn({ data: { projectId: project.project.id } });
							load();
						} catch (cause) {
							setRowError(humanizeSelenaError(cause, locale, tr(locale, "Could not prepare the questions. Try again.", "Не удалось подготовить вопросы. Попробуйте ещё раз.")));
						} finally {
							setBusyId("");
						}
					},
					children: busyId === "prepare" ? tr(locale, "Preparing…", "Готовим…") : tr(locale, "Suggest questions from my profile", "Подобрать вопросы из профиля")
				}), rowError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-[#9a5f14]",
					children: rowError
				})]
			}),
			failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 text-sm text-[#9a5f14]",
				children: tr(locale, "Could not load the questions.", "Не удалось загрузить вопросы.")
			}) : scenarios === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 text-sm text-[#574d45]",
				children: tr(locale, "Loading…", "Загружаем…")
			}) : scenarios.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 rounded-lg border border-dashed border-[#cdbdac] bg-[#fffdf8] px-4 py-3 text-sm text-[#574d45]",
				children: tr(locale, "No questions proposed yet. They appear here after the profile is confirmed and questions are prepared.", "Вопросов пока не предложено. Они появятся здесь после подтверждения профиля и подготовки вопросов.")
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex flex-col gap-3",
				children: [
					proposed.map((scenario) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-3 rounded-lg border border-[#e5dbcd] bg-[#fffdf8] p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
							id: `question-${scenario.id}`,
							checked: checked.has(scenario.id),
							onCheckedChange: () => setChecked((current) => {
								const next = new Set(current);
								if (next.has(scenario.id)) next.delete(scenario.id);
								else next.add(scenario.id);
								return next;
							}),
							className: "mt-1"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								htmlFor: `question-${scenario.id}`,
								className: "text-xs uppercase tracking-wide text-[#574d45]",
								children: [
									scenario.language.toUpperCase(),
									" ·",
									" ",
									scenario.intentType === "branded" ? tr(locale, "names the brand", "с названием бренда") : tr(locale, "category question", "вопрос про категорию")
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 2,
								className: "selena-textarea mt-2",
								value: drafts[scenario.id] ?? scenario.text,
								onChange: (event) => setDrafts((current) => ({
									...current,
									[scenario.id]: event.target.value
								}))
							})]
						})]
					}, scenario.id)),
					proposed.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5dbcd] bg-[#fffdf8] px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-[#3d362e]",
							children: tr(locale, `${checked.size} of ${proposed.length} question(s) checked`, `Отмечено вопросов: ${checked.size} из ${proposed.length}`)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								disabled: checked.size === 0 || bulkBusy,
								onClick: () => void decideChecked("APPROVED"),
								children: bulkBusy ? tr(locale, "Saving…", "Сохраняем…") : tr(locale, "Approve checked", "Утвердить отмеченные")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								variant: "outline",
								disabled: checked.size === 0 || bulkBusy,
								onClick: () => void decideChecked("REJECTED"),
								children: tr(locale, "Reject checked", "Отклонить отмеченные")
							})]
						})]
					}),
					decided.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-[#e5dbcd] bg-[#fffdf8] p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-semibold text-[#3d362e]",
							children: tr(locale, "Decided", "Решённые")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-2 flex flex-col gap-1 text-sm text-[#3d362e]",
							children: decided.map((scenario) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: scenario.text }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "shrink-0 text-xs text-[#574d45]",
									children: scenario.status === "APPROVED" ? tr(locale, "approved", "утверждён") : tr(locale, "rejected", "отклонён")
								})]
							}, scenario.id))
						})]
					})
				]
			})
		]
	});
}
/**
* Step 4 of the cabinet: the paid measurement. Locked (shown, not hidden)
* until the project has a cycle; once one exists, renders the ledger report
* with branded and non-branded apart, UNKNOWN for an empty group, and no
* composite score anywhere — the CABINET_MODEL rules the backend already
* enforces, made visible.
*/
function MeasurementPanel({ project, locale }) {
	const [view, setView] = (0, import_react.useState)(null);
	const [failed, setFailed] = (0, import_react.useState)(false);
	const hasCycle = project.measurement !== null;
	(0, import_react.useEffect)(() => {
		if (!hasCycle) return;
		let cancelled = false;
		getSelenaMeasurementFn({ data: { projectId: project.project.id } }).then((data) => {
			if (!cancelled) setView(data);
		}).catch(() => {
			if (!cancelled) setFailed(true);
		});
		return () => {
			cancelled = true;
		};
	}, [hasCycle, project.project.id]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section",
		"aria-labelledby": "measurement-title",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-start justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "selena-icon-disc",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSparkles, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					id: "measurement-title",
					className: "selena-heading text-2xl",
					children: tr(locale, "5 · Measurement", "5 · Замер")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-sm leading-6 text-[#574d45]",
					children: tr(locale, "What the ordered AI measurement observed. Questions naming the brand and category questions are counted separately and never merged into one score.", "Что показал заказанный AI-замер. Вопросы с названием бренда и вопросы про категорию считаются раздельно и никогда не сводятся в один балл.")
				})] })]
			}), hasCycle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/app/selena-report",
				search: { project: project.project.id },
				className: "shrink-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					className: "border-[#cdbdac] bg-[#fffdf8]",
					children: tr(locale, "Open the full report", "Открыть полный отчёт")
				})
			})]
		}), !hasCycle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-5 rounded-lg border border-dashed border-[#cdbdac] bg-[#fffdf8] px-4 py-3 text-sm text-[#574d45]",
			children: tr(locale, "This step opens after a measurement order is confirmed. No cycle has been ordered yet.", "Этот шаг откроется после подтверждения заказа на замер. Цикл ещё не заказан.")
		}) : failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-5 text-sm text-[#9a5f14]",
			children: tr(locale, "Could not load the measurement.", "Не удалось загрузить замер.")
		}) : view === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-5 text-sm text-[#574d45]",
			children: tr(locale, "Loading…", "Загружаем…")
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeasurementReport, {
			view,
			locale,
			projectId: project.project.id
		})]
	});
}
function MeasurementReport({ view, locale, projectId }) {
	const latest = view.latest;
	const cycle = view.cycles[0];
	if (!latest || !cycle) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-5 text-sm text-[#574d45]",
		children: tr(locale, "No measurement cycle recorded yet.", "Ни одного цикла замера ещё не записано.")
	});
	const [en, ru] = {
		SCHEDULED: ["Scheduled", "Запланирован"],
		RUNNING: ["Running", "Выполняется"],
		QC_REQUIRED: ["Awaiting quality review", "Ожидает проверку качества"],
		READY: ["Ready", "Готов"],
		DELIVERED: ["Delivered", "Выдан"]
	}[cycle.status] ?? [cycle.status, cycle.status];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-5 flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-[#574d45]",
				children: [
					tr(locale, "Cycle status", "Статус цикла"),
					": ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: tr(locale, en, ru) }),
					" ·",
					" ",
					tr(locale, "runs completed", "прогонов завершено"),
					": ",
					cycle.completedRuns,
					" / ",
					cycle.expectedRuns
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeasurementGroup, {
					locale,
					title: tr(locale, "Category questions (no brand name)", "Вопросы про категорию (без названия бренда)"),
					group: groupView(latest.report.nonBranded)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeasurementGroup, {
					locale,
					title: tr(locale, "Questions naming the brand", "Вопросы с названием бренда"),
					group: groupView(latest.report.branded)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RelativeMentionShare, {
				locale,
				report: latest.report
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitorApiSplit, {
				locale,
				report: latest.report
			}),
			latest.report.unclassifiedRuns > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-[#574d45]",
				children: [
					tr(locale, "Runs outside both groups", "Прогоны вне обеих групп"),
					": ",
					latest.report.unclassifiedRuns
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunExplorer, {
				cycleId: latest.cycleId,
				locale
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CycleComparePanel, {
				cycleCount: view.cycles.length,
				locale,
				projectId
			})
		]
	});
}
/**
* Step 7: what changed between the two newest cycles — and in which measured
* answers. Deliberately never "thanks to us": engines and competitors change
* over the same weeks, and the diff states observations, not causes.
*/
function CycleComparePanel({ cycleCount, locale, projectId }) {
	const [result, setResult] = (0, import_react.useState)(null);
	const [showDetails, setShowDetails] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setResult(null);
		setShowDetails(false);
		if (cycleCount < 2 || !projectId) return;
		let cancelled = false;
		getSelenaCycleCompareFn({ data: { projectId } }).then((data) => {
			if (!cancelled) setResult(data);
		}).catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [cycleCount, projectId]);
	if (cycleCount < 2) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "rounded-lg border border-dashed border-[#cdbdac] bg-[#fffdf8] px-4 py-3 text-sm text-[#574d45]",
		children: tr(locale, "Comparison between measurements opens after the second cycle.", "Сравнение между замерами откроется после второго цикла.")
	});
	if (!result?.comparable) return null;
	const label = (change) => {
		switch (change.type) {
			case "MENTION_APPEARED": return tr(locale, "the brand is now mentioned", "бренд теперь упоминается");
			case "MENTION_DISAPPEARED": return tr(locale, "the brand is no longer mentioned", "бренд больше не упоминается");
			case "POSITION_SHIFTED": return `${tr(locale, "position", "позиция")} ${change.basePosition} → ${change.comparePosition}`;
			case "SOURCE_APPEARED": return `${tr(locale, "new cited source", "новый цитируемый источник")}: ${change.domain}`;
			case "SOURCE_DISAPPEARED": return `${tr(locale, "source no longer cited", "источник больше не цитируется")}: ${change.domain}`;
		}
	};
	const unknownGroups = result.report.groups.filter((group) => group.status === "UNKNOWN");
	const changeCount = result.report.changes.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-[#e5dbcd] bg-[#fffdf8] p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold text-[#3d362e]",
				children: tr(locale, "What changed between the measurements", "Что изменилось между замерами")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-[#574d45]",
				children: locale === "ru" ? `Изменений: ${changeCount} · несравнимых групп: ${unknownGroups.length}` : `${changeCount} observed change${changeCount === 1 ? "" : "s"} · ${unknownGroups.length} group${unknownGroups.length === 1 ? "" : "s"} not comparable`
			}),
			changeCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "mt-2 inline-flex min-h-11 items-center gap-2 rounded px-2 text-sm font-semibold text-[#8f5c34] outline-none hover:bg-[#f5eee2] focus-visible:ring-2 focus-visible:ring-[#8f5c34]",
				"aria-expanded": showDetails,
				"aria-controls": "cycle-compare-details",
				onClick: () => setShowDetails((value) => !value),
				children: [showDetails ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronDown, {
					className: "size-4",
					"aria-hidden": "true"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronRight, {
					className: "size-4",
					"aria-hidden": "true"
				}), showDetails ? tr(locale, "Hide details", "Скрыть подробности") : tr(locale, "Show details", "Показать подробности")]
			}), showDetails && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				id: "cycle-compare-details",
				className: "mt-2 max-h-80 overflow-y-auto border-t border-[#e5dbcd] pt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-xs text-[#574d45]",
					children: tr(locale, "Observed differences only. AI systems and competitors may also have changed.", "Только наблюдаемые различия. AI-системы и конкуренты тоже могли измениться.")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-2 text-sm text-[#3d362e]",
					children: result.report.changes.map((change) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						change.system,
						" · ",
						label(change),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs text-[#574d45]",
							children: [
								"(",
								tr(locale, "measured in", "измерено в"),
								" ",
								change.evidence.baseRunIds.length,
								"+",
								change.evidence.compareRunIds.length,
								" ",
								tr(locale, "answers", "ответах"),
								")"
							]
						})
					] }, `${change.type}-${change.scenarioId}-${change.system}-${JSON.stringify(change.evidence)}`))
				})]
			})] })
		]
	});
}
/**
* Addendum §7 made visible: each answer behind the numbers, with the verbatim
* text while it is inside its retention window and an honest marker after.
*/
function RunExplorer({ cycleId, locale }) {
	const [runs, setRuns] = (0, import_react.useState)(null);
	const [openQuestionIds, setOpenQuestionIds] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [openRunId, setOpenRunId] = (0, import_react.useState)("");
	const [detail, setDetail] = (0, import_react.useState)(null);
	const detailRequest = (0, import_react.useRef)(0);
	const groups = (0, import_react.useMemo)(() => groupRunsByQuestion(runs ?? []), [runs]);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		setRuns(null);
		setOpenQuestionIds(/* @__PURE__ */ new Set());
		setOpenRunId("");
		setDetail(null);
		detailRequest.current += 1;
		listSelenaRunsFn({ data: { cycleId } }).then((data) => {
			if (!cancelled) setRuns(data.runs);
		}).catch(() => {
			if (!cancelled) setRuns([]);
		});
		return () => {
			cancelled = true;
		};
	}, [cycleId]);
	const openRun = async (runId) => {
		if (openRunId === runId) {
			detailRequest.current += 1;
			setOpenRunId("");
			setDetail(null);
			return;
		}
		const request = detailRequest.current + 1;
		detailRequest.current = request;
		setOpenRunId(runId);
		setDetail(null);
		try {
			const nextDetail = await getSelenaRunDetailFn({ data: { runId } });
			if (detailRequest.current === request) setDetail(nextDetail);
		} catch {
			if (detailRequest.current === request) setOpenRunId("");
		}
	};
	const toggleQuestion = (group) => {
		const next = new Set(openQuestionIds);
		if (next.has(group.scenarioId)) {
			next.delete(group.scenarioId);
			if (group.runs.some((run) => run.id === openRunId)) {
				detailRequest.current += 1;
				setOpenRunId("");
				setDetail(null);
			}
		} else next.add(group.scenarioId);
		setOpenQuestionIds(next);
	};
	if (!runs || runs.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-[#e5dbcd] bg-[#fffdf8] p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold text-[#3d362e]",
				children: tr(locale, "Answers behind the numbers", "Ответы, из которых собраны цифры")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-[#574d45]",
				children: tr(locale, "Choose a question, then open an AI system to read its full answer and sources.", "Выберите вопрос, затем AI-систему — откроется полный ответ и его источники.")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 divide-y divide-[#e5dbcd]",
				children: groups.map((group, index) => {
					const questionOpen = openQuestionIds.has(group.scenarioId);
					const groupId = `run-question-${index}`;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex min-h-11 w-full flex-col items-start justify-between gap-1 rounded px-2 py-2 text-left outline-none hover:bg-[#f5eee2] focus-visible:ring-2 focus-visible:ring-[#8f5c34] sm:flex-row sm:items-center sm:gap-4",
						"aria-expanded": questionOpen,
						"aria-controls": groupId,
						onClick: () => toggleQuestion(group),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex min-w-0 items-center gap-2 text-sm font-medium text-[#3d362e]",
							children: [questionOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronDown, {
								className: "size-4 shrink-0",
								"aria-hidden": "true"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChevronRight, {
								className: "size-4 shrink-0",
								"aria-hidden": "true"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: group.scenarioText ?? tr(locale, "Question text unavailable", "Текст вопроса недоступен") })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "pl-6 text-xs leading-5 text-[#574d45] sm:shrink-0 sm:pl-0 sm:text-right",
							children: locale === "ru" ? `Ответов: ${group.total} · доступно: ${group.available} · недоступно: ${group.unavailable}` : `${group.total} answer${group.total === 1 ? "" : "s"} · ${group.available} available · ${group.unavailable} unavailable`
						})]
					}), questionOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						id: groupId,
						className: "mb-2 ml-6 border-l border-[#dccfbe] pl-2",
						children: group.runs.map((run) => {
							const runOpen = openRunId === run.id;
							const detailId = `${groupId}-${run.id}`;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "flex min-h-11 w-full flex-col items-start justify-between gap-1 rounded px-2 py-2 text-left text-sm outline-none hover:bg-[#f5eee2] focus-visible:ring-2 focus-visible:ring-[#8f5c34] sm:flex-row sm:items-center sm:gap-3",
								"aria-expanded": runOpen,
								"aria-controls": detailId,
								onClick: () => openRun(run.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[#3d362e]",
									children: [
										run.system ?? tr(locale, "Unknown system", "Неизвестная система"),
										" · ",
										runViewLabel(run)
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "shrink-0 text-right text-xs text-[#574d45]",
									children: [runStatusLabel(run, locale), run.finishedAt ? ` · ${formatDate(run.finishedAt, locale)}` : ""]
								})]
							}), runOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								id: detailId,
								className: "mx-2 mb-2 border-t border-[#e5dbcd] bg-[#fbf7f1] p-3 text-sm",
								children: detail === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[#574d45]",
									children: tr(locale, "Loading…", "Загружаем…")
								}) : detail.id === run.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunEvidence, {
									detail,
									locale
								}) : null
							})] }, run.id);
						})
					})] }, group.scenarioId);
				})
			})
		]
	});
}
function RunEvidence({ detail, locale }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2",
		children: [
			detail.mentions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-[#574d45]",
				children: [tr(locale, "Named", "Названы"), ": "]
			}), detail.mentions.map((mention) => `${mention.name}${mention.ordinalPosition ? ` (#${mention.ordinalPosition})` : ""}`).join(", ")] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[#574d45]",
				children: tr(locale, "No tracked entity was named, or the answer is stored but not measured.", "Ни одна отслеживаемая сущность не названа, либо ответ сохранён, но не измерен.")
			}),
			detail.citations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-[#574d45]",
				children: [tr(locale, "Cited", "Процитированы"), ": "]
			}), detail.citations.map((citation) => citation.domain).join(", ")] }),
			detail.sources.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-[#574d45]",
				children: [tr(locale, "Shown as sources", "Показаны как источники"), ": "]
			}), detail.sources.map((source) => source.domain).join(", ")] }),
			detail.answer.state === "present" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", {
				className: "whitespace-pre-wrap [overflow-wrap:anywhere] rounded bg-[#faf6ee] p-2 text-[#3d362e]",
				children: detail.answer.text
			}) : detail.answer.state === "deleted" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[#574d45]",
				children: tr(locale, "The verbatim text was deleted at the end of its retention window; the findings above remain.", "Дословный текст удалён по окончании срока хранения; находки выше сохранены.")
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[#574d45]",
				children: tr(locale, "No answer text was saved for this run.", "Для этого прогона текст ответа не сохранён.")
			})
		]
	});
}
function runViewLabel(run) {
	return run.channel === "VISITOR" || run.channel.toLowerCase().startsWith("visitor") ? "Visitor View" : "API View";
}
function runStatusLabel(run, locale) {
	const reasons = {
		RESPONSE_TOO_LARGE: ["The AI service answer was too large to save", "Ответ AI-сервиса оказался слишком большим для сохранения"],
		EMPTY_RESPONSE: ["The AI service returned an empty answer", "AI-сервис вернул пустой ответ"],
		MALFORMED_RESPONSE: ["The AI service returned an unreadable answer", "AI-сервис вернул ответ в нечитаемом формате"],
		PROVIDER_AUTH_WALL: ["The AI service required sign-in", "AI-сервис потребовал вход"],
		PROVIDER_TIMEOUT: ["The AI service did not answer in time", "AI-сервис не ответил вовремя"],
		TIMEOUT: ["The AI service did not answer in time", "AI-сервис не ответил вовремя"],
		TRANSPORT_ERROR: ["The AI service could not be reached", "Не удалось связаться с AI-сервисом"],
		SNAPSHOT_NOT_READY: ["The answer was not ready in time", "Ответ не был готов вовремя"],
		PROVIDER_ERROR_ROW: ["The AI service returned an error", "AI-сервис вернул ошибку"],
		SCENARIO_TEXT_UNAVAILABLE: ["The question was unavailable", "Вопрос был недоступен"]
	};
	if (run.invalidReason) {
		const reason = reasons[run.invalidReason];
		if (reason) return tr(locale, reason[0], reason[1]);
		if (run.invalidReason.startsWith("PROVIDER_HTTP_")) return tr(locale, "The AI service rejected the request", "AI-сервис отклонил запрос");
		return tr(locale, "Answer unavailable", "Ответ недоступен");
	}
	if (run.validity?.toUpperCase() === "INVALID") return tr(locale, "Answer unavailable", "Ответ недоступен");
	if (isRunAvailable(run)) return tr(locale, "Available", "Доступен");
	const status = {
		PENDING: ["Waiting", "Ожидает"],
		QUEUED: ["Waiting", "Ожидает"],
		RUNNING: ["In progress", "Выполняется"],
		STARTED: ["In progress", "Выполняется"],
		FAILED: ["Answer unavailable", "Ответ недоступен"],
		INVALID: ["Answer unavailable", "Ответ недоступен"],
		OVERFLOW: ["Skipped after the cycle limit was reached", "Пропущен после достижения лимита цикла"],
		STOPPED: ["Measurement stopped", "Замер остановлен"]
	}[run.status.toUpperCase()] ?? ["Status unavailable", "Статус недоступен"];
	return tr(locale, status[0], status[1]);
}
function MeasurementGroup({ locale, title, group }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-[#e5dbcd] bg-[#fffdf8] p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-sm font-semibold text-[#3d362e]",
			children: title
		}), group.state === "unknown" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-[#574d45]",
			children: tr(locale, "Unknown — no measured answers in this group yet. Not shown as 0%.", "Неизвестно — в этой группе пока нет измеренных ответов. Это не 0%.")
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
			className: "mt-2 grid gap-1 text-sm text-[#3d362e]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-[#574d45]",
						children: tr(locale, "Answers mentioning the brand", "Ответы с упоминанием бренда")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: group.mentionCoverage ?? tr(locale, "unknown", "неизвестно") })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-[#574d45]",
						children: tr(locale, "Average position among mentions", "Средняя позиция среди упоминаний")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: group.averageBrandPosition ?? "—" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-[#574d45]",
						children: tr(locale, "Measured answers", "Измеренных ответов")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: group.measuredRuns })]
				}),
				group.unmeasuredRuns > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-[#574d45]",
						children: tr(locale, "Stored but not measured", "Сохранено, но не измерено")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: group.unmeasuredRuns })]
				})
			]
		})]
	});
}
/**
* The Share-of-Voice analog on ledger evidence (addendum §6.2): the brand's
* share among tracked-entity mentions, next to each confirmed competitor.
* Rendered under the mixed label because it pools branded and non-branded —
* the two group cards above stay the primary reading.
*/
function RelativeMentionShare({ locale, report }) {
	const mixed = report.mixed.group;
	if (mixed.status !== "MEASURED") return null;
	const share = mixed.metrics.relativeMentionShare;
	if (share.brand === null && share.competitors.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-[#e5dbcd] bg-[#fffdf8] p-4 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "font-semibold text-[#3d362e]",
			children: tr(locale, "Share among tracked mentions (both groups pooled)", "Доля среди отслеживаемых упоминаний (обе группы вместе)")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
			className: "mt-2 grid gap-1 text-[#3d362e]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
					className: "text-[#574d45]",
					children: tr(locale, "Your brand", "Ваш бренд")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: formatShare(share.brand) ?? tr(locale, "unknown", "неизвестно") })]
			}), share.competitors.map((competitor) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
					className: "text-[#574d45]",
					children: competitor.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: formatShare(competitor.share) })]
			}, competitor.name))]
		})]
	});
}
function VisitorApiSplit({ locale, report }) {
	const mixed = report.mixed.group;
	if (mixed.status !== "MEASURED") return null;
	const { visitorMentionRate, apiMentionRate } = mixed.metrics.visitorApiDivergence;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-[#e5dbcd] bg-[#fffdf8] p-4 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "font-semibold text-[#3d362e]",
			children: tr(locale, "Visitor View and API View, separately", "Visitor View и API View, раздельно")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-2 text-[#574d45]",
			children: [
				tr(locale, "What a visitor is shown", "Что видит посетитель"),
				":",
				" ",
				formatShare(visitorMentionRate) ?? tr(locale, "unknown", "неизвестно"),
				" ·",
				" ",
				tr(locale, "what the model answers directly", "что модель отвечает напрямую"),
				":",
				" ",
				formatShare(apiMentionRate) ?? tr(locale, "unknown", "неизвестно")
			]
		})]
	});
}
function ResultsPanel({ project, locale }) {
	const { access } = Route.useLoaderData();
	const result = project.recommendation;
	const measurementReady = project.measurement?.status === "READY";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "selena-section",
		"aria-labelledby": "results-title",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-start justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				id: "results-title",
				className: "selena-heading text-2xl",
				children: tr(locale, "7 · Results and next actions", "7 · Результаты и следующие действия")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-2xl text-sm leading-6 text-[#574d45]",
				children: tr(locale, "The website action plan and AI visibility report are separate. A website review never counts as an AI mention.", "План улучшения сайта и отчёт о видимости в AI показываются отдельно. Проверка сайта не считается упоминанием в AI.")
			})] }), result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex flex-wrap items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "selena-success-label",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSparkles, { className: "size-4" }),
						" ",
						tr(locale, "Website plan ready", "План для сайта готов")
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app/selena-report",
					search: { project: project.project.id },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "outline",
						size: "sm",
						className: "border-[#cdbdac] bg-[#fffdf8]",
						children: tr(locale, "Open as a report", "Открыть отчётом")
					})
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-7 space-y-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold text-[#181614]",
					children: tr(locale, "Website action plan", "План улучшения сайта")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium text-[#574d45]",
					children: tr(locale, "Public website", "Публичный сайт")
				})]
			}), result ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid gap-5 border-y border-[#dccfbe] py-5 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultMetric, {
						label: tr(locale, "Findings", "Наблюдения"),
						value: result.findingsCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultMetric, {
						label: tr(locale, "Recommendations", "Рекомендации"),
						value: result.recommendationsCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultMetric, {
						label: tr(locale, "Action tasks", "Задачи"),
						value: result.tasksCount
					})
				]
			}), result.topActions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold text-[#181614]",
					children: tr(locale, `Priority actions — top ${Math.min(3, result.recommendationsCount)} of ${result.recommendationsCount}`, `Приоритетные действия — первые ${Math.min(3, result.recommendationsCount)} из ${result.recommendationsCount}`)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 divide-y divide-[#dccfbe]",
					children: result.topActions.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "grid gap-1 py-4 sm:grid-cols-[5rem_1fr] sm:gap-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-semibold text-[#8f5c34]",
							children: priorityLabel(item.priority, locale)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-medium text-[#181614]",
								children: [ruleTitle(locale, item.ruleId, item.title), item.ruleId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-2 align-middle text-[0.62rem] font-semibold uppercase text-[#b0a294]",
									children: item.ruleId
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm leading-6 text-[#574d45]",
								children: ruleHow(locale, item.ruleId, item.action)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
								className: "mt-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
									className: "cursor-pointer text-xs font-semibold text-[#8f5c34] underline underline-offset-4 [&::-webkit-details-marker]:hidden",
									children: tr(locale, "How to fix →", "Как исправить →")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 rounded-lg border border-[#dccfbe] bg-[#fbf7ef] p-3",
									children: [
										ruleSteps(locale, item.ruleId).length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
											className: "list-decimal space-y-1 pl-4 text-xs leading-5 text-[#3d362e]",
											children: ruleSteps(locale, item.ruleId).map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: step }, step))
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs leading-5 text-[#3d362e]",
											children: item.action
										}),
										ruleExample(locale, item.ruleId) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-2 rounded border border-[#dccfbe] bg-[#fffdf8] px-2.5 py-1.5 font-mono text-[0.68rem] leading-4 text-[#3d362e]",
											children: [tr(locale, "Done right: ", "Как правильно: "), ruleExample(locale, item.ruleId)]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "mt-2 rounded-full border border-[#cdbdac] bg-[#fffdf8] px-3.5 py-1.5 text-xs font-semibold text-[#8f5c34]",
											onClick: (event) => {
												navigator.clipboard.writeText(ruleFixTask(locale, item.ruleId, project.profile?.primaryDomain ?? "", item.title, item.action));
												event.currentTarget.textContent = tr(locale, "Copied", "Скопировано");
											},
											children: tr(locale, "Copy a task for an AI developer", "Скопировать задание для AI-разработчика")
										})
									]
								})]
							})
						] })]
					}, `${item.priority}:${item.title}`))
				}),
				result.recommendationsCount > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/app/selena-report",
					search: { project: project.project.id },
					className: "mt-3 inline-block",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold text-[#8f5c34] underline underline-offset-4",
						children: tr(locale, `See all ${result.recommendationsCount} actions in the report →`, `Все ${result.recommendationsCount} действий — в полном отчёте →`)
					})
				})
			] })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-2xl border-t border-[#dccfbe] pt-5 text-sm leading-6 text-[#574d45]",
				children: tr(locale, "Your first recommendations will appear after the website review.", "Первые рекомендации появятся после проверки сайта.")
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border-t border-[#dccfbe] pt-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-semibold text-[#181614]",
							children: tr(locale, "AI visibility report", "Отчёт о видимости в AI")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: measurementReady ? "selena-success-label" : "text-xs font-medium text-[#574d45]",
							children: measurementReady ? tr(locale, "Report ready", "Отчёт готов") : project.measurement ? humanStatus(project.measurement.status, locale) : tr(locale, "Not started", "Не начат")
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChannelSummary, {
							title: "Visitor View",
							systems: "ChatGPT · Gemini · Perplexity",
							description: tr(locale, "What customers see in live AI answer surfaces.", "Что клиенты видят в пользовательских AI-сервисах."),
							href: orderPlanUrl(project.project.id, "snapshot", access.isAdmin),
							planLabel: tr(locale, "Snapshot plan · $49/mo", "План Snapshot · $49/мес")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChannelSummary, {
							title: "API View",
							systems: "Claude · DeepSeek · Qwen · Mistral · Grok",
							description: tr(locale, "A separate model-knowledge baseline without web search by default.", "Отдельная проверка знаний моделей; веб-поиск по умолчанию выключен."),
							href: orderPlanUrl(project.project.id, "landscape", access.isAdmin),
							planLabel: tr(locale, "In the Landscape plan · $79/mo", "Входит в Landscape · $79/мес")
						})]
					}),
					project.measurement ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-[#574d45]",
						children: locale === "ru" ? `Проверено ответов: ${project.measurement.completedRuns} из ${project.measurement.expectedRuns}` : `${project.measurement.completedRuns} of ${project.measurement.expectedRuns} answers checked`
					}) : null
				]
			})]
		})]
	});
}
/**
* The plan ladder, not the AI-audit brief: someone who just finished a free
* website review is buying a visibility measurement, and the audit form asks
* about a different product entirely. The card lands on the in-app order
* form with the plan and project pre-selected — there is no online checkout,
* so the form takes a request (and a promo code) instead of a payment.
*/
function orderPlanUrl(projectId, plan, isAdmin) {
	if (isAdmin) return "/app/selena-admin";
	return `/app/selena-order?plan=${plan}&project=${projectId}`;
}
function ChannelSummary({ title, systems, description, href, planLabel }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
		href,
		className: "block rounded-xl border border-[#dccfbe] bg-[#fbf7f1] p-4 transition-colors hover:border-[#8f5c34]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-medium text-[#181614]",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#8f5c34]",
				children: systems
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-6 text-[#574d45]",
				children: description
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#8f5c34]",
				children: [
					planLabel,
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconArrowRight, { className: "size-4" })
				]
			})
		]
	});
}
function ResultMetric({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-xs font-medium text-[#574d45]",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: "selena-heading mt-1 text-3xl text-[#181614]",
		children: value
	})] });
}
function Field({ label, hint, htmlFor, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor,
				className: "text-[#302b27]",
				children: label
			}),
			children,
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs leading-5 text-[#75695f]",
				children: hint
			})
		]
	});
}
function FormFeedback({ feedback, className }) {
	if (!feedback?.notice && !feedback?.error) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `space-y-3 ${className ?? ""}`,
		children: [feedback.notice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusMessage, {
			tone: "success",
			children: feedback.notice
		}), feedback.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusMessage, {
			tone: "error",
			children: feedback.error
		})]
	});
}
function StatusMessage({ tone, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		role: tone === "error" ? "alert" : "status",
		className: tone === "error" ? "selena-message selena-message-error" : "selena-message selena-message-success",
		children
	});
}
/** Comma is what the hints ask for, but the box above takes one per line. */
function splitList(value) {
	return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}
function readObjectString(value, key) {
	if (!value || typeof value !== "object") return "";
	const candidate = value[key];
	return typeof candidate === "string" ? candidate : "";
}
function parseScenario(line, fallbackLanguage) {
	const trimmed = line.trim();
	if (!trimmed) return null;
	const match = trimmed.match(/^([a-z]{2}(?:-[A-Z]{2})?)\s*:\s*(.+)$/i);
	return {
		text: match?.[2]?.trim() || trimmed,
		language: (match?.[1] || fallbackLanguage).toLowerCase(),
		intentType: "discovery"
	};
}
/**
* The most recent check this project has actually had — the AI measurement
* when one exists, otherwise the website review. Nothing checked yet reads as
* exactly that, not as a blank.
*/
function lastAuditLabel(project, locale) {
	if (project.measurement) return `${tr(locale, "AI measurement", "AI-замер")}: ${formatDate(project.measurement.updatedAt, locale)}`;
	if (project.website) return `${tr(locale, "Website audit", "Аудит сайта")}: ${formatDate(project.website.capturedAt, locale)}`;
	return tr(locale, "Not audited yet", "Проверок ещё не было");
}
function projectStageLabel(project, locale) {
	if (project.measurement?.status === "READY") return tr(locale, "AI report ready", "Отчёт AI готов");
	if (project.measurement) return humanStatus(project.measurement.status, locale);
	if (project.recommendation) return tr(locale, "Website action plan ready", "План для сайта готов");
	if (project.website) return tr(locale, "Website review saved", "Проверка сайта сохранена");
	if (project.profile) return tr(locale, "Ready for website review", "Можно проверять сайт");
	return tr(locale, "Profile needed", "Заполните профиль");
}
function humanStatus(value, locale) {
	const status = value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
	if (locale === "en") return status;
	return {
		Draft: "Черновик",
		Pending: "Ожидает",
		Running: "Выполняется",
		Ready: "Готово",
		Failed: "Ошибка",
		Cancelled: "Отменено"
	}[status] ?? status;
}
function priorityLabel(value, locale) {
	if (value === "NOW") return tr(locale, "Do now", "Сейчас");
	if (value === "NEXT") return tr(locale, "Do next", "Следом");
	return tr(locale, "Later", "Позже");
}
function formatDate(value, locale) {
	return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en", { dateStyle: "medium" }).format(new Date(value));
}
function tr(locale, english, russian) {
	return locale === "ru" ? russian : english;
}
//#endregion
export { SelenaWorkspace as component };

//# sourceMappingURL=selena-D2BAfN22.mjs.map