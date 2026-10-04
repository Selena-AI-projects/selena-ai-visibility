import { IconAlertCircle, IconArrowRight, IconCheck, IconLoader2, IconMail, IconSparkles } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useEffect, useState } from "react";
import { SelenaWordmark } from "@/components/selena-wordmark";
import {
	type FreeAiVisibilityCustomerError,
	freeAiVisibilityCustomerError,
	freeAiVisibilityErrorCopy,
	shouldPollFreeAiVisibilityStatus,
} from "@/lib/selena-free-ai-visibility-ui";
import { resolveWorkspaceLocale, tr, WORKSPACE_LOCALE_STORAGE_KEY, type WorkspaceLocale } from "@/lib/selena-locale";
import { claimFreeAiVisibilityCheckFn, getFreeAiVisibilityCheckStatusFn } from "@/server/selena-free-ai-visibility";

const statusQueryKey = ["selena", "free-ai-visibility"] as const;

/** States where another attempt can change the outcome. */
const retryableErrors: ReadonlySet<FreeAiVisibilityCustomerError> = new Set([
	"BUDGET_UNAVAILABLE",
	"DOMAIN_INVALID",
	"FAILED",
]);

/** States where the cabinet, not this page, is the visitor's next step. */
const cabinetErrors: ReadonlySet<FreeAiVisibilityCustomerError> = new Set(["DISABLED", "ALREADY_CLAIMED"]);

export const Route = createFileRoute("/_authed/free-ai-visibility")({
	component: FreeAiVisibilityPage,
});

function FreeAiVisibilityPage() {
	const queryClient = useQueryClient();
	const [locale, setLocale] = useState<WorkspaceLocale>("en");
	const [website, setWebsite] = useState("");
	const [submissionError, setSubmissionError] = useState<FreeAiVisibilityCustomerError | null>(null);
	const statusQuery = useQuery({
		queryKey: statusQueryKey,
		queryFn: () => getFreeAiVisibilityCheckStatusFn(),
		retry: false,
		refetchInterval: (query) => (shouldPollFreeAiVisibilityStatus(query.state.data) ? 3_000 : false),
		refetchIntervalInBackground: true,
	});
	const claim = useMutation({
		mutationFn: (nextWebsite: string) => claimFreeAiVisibilityCheckFn({ data: { website: nextWebsite } }),
		onSuccess: (check) => {
			setSubmissionError(null);
			setWebsite("");
			queryClient.setQueryData(statusQueryKey, { ...check, report: null });
			void queryClient.invalidateQueries({ queryKey: statusQueryKey });
		},
		onError: (error) => setSubmissionError(freeAiVisibilityCustomerError(error)),
	});

	useEffect(() => {
		const next = resolveWorkspaceLocale(window.localStorage.getItem(WORKSPACE_LOCALE_STORAGE_KEY), navigator.language);
		setLocale(next);
		document.documentElement.lang = next;
	}, []);

	function changeLocale(next: WorkspaceLocale) {
		setLocale(next);
		window.localStorage.setItem(WORKSPACE_LOCALE_STORAGE_KEY, next);
		document.documentElement.lang = next;
	}

	const queryError = statusQuery.isError ? freeAiVisibilityCustomerError(statusQuery.error) : null;
	const error = submissionError ?? queryError;

	function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmissionError(null);
		claim.mutate(website.trim());
	}

	return (
		<main className="selena-app min-h-screen px-4 py-6 sm:px-6 sm:py-10">
			<div className="mx-auto max-w-3xl">
				<header className="selena-app-header flex items-center justify-between gap-3 rounded-2xl px-5 py-4 sm:px-6">
					<SelenaWordmark />
					<div className="flex items-center gap-3">
						<p className="hidden text-sm text-[#574d45] sm:block">
							{tr(locale, "Verified account check", "Проверка для подтверждённого аккаунта")}
						</p>
						<fieldset className="selena-locale-switch">
							<legend className="sr-only">{tr(locale, "Interface language", "Язык интерфейса")}</legend>
							{(["en", "ru"] as const).map((option) => (
								<button
									key={option}
									type="button"
									aria-pressed={locale === option}
									onClick={() => changeLocale(option)}
								>
									{option.toUpperCase()}
								</button>
							))}
						</fieldset>
					</div>
				</header>

				<section className="selena-section selena-section--anchor mt-6 p-6 sm:p-8" aria-labelledby="free-check-heading">
					<p className="selena-anchor-meta">{tr(locale, "One-time, no-cost check", "Разовая бесплатная проверка")}</p>
					<h1 id="free-check-heading" className="selena-heading mt-3 text-3xl sm:text-4xl">
						{tr(
							locale,
							"See whether two AI systems mention your domain",
							"Узнайте, упоминают ли ваш домен две AI-системы",
						)}
					</h1>
					<p className="selena-anchor-lede mt-4 max-w-2xl">
						{tr(
							locale,
							"This verified-account check runs once in ChatGPT and Gemini. It reports only whether your domain was mentioned and the number of citations returned, not answer text or source links.",
							"Проверка для подтверждённого аккаунта выполняется один раз в ChatGPT и Gemini. Она показывает только, упомянут ли ваш домен и сколько ссылок на источники вернулось, — без текста ответов и самих ссылок.",
						)}
					</p>
				</section>

				<div className="mt-6">
					{error ? (
						<ErrorState
							state={error}
							locale={locale}
							onTryAgain={() => {
								setSubmissionError(null);
								if (queryError) void statusQuery.refetch();
							}}
						/>
					) : null}
					{!error && statusQuery.isPending ? <PendingStatus locale={locale} /> : null}
					{!error && statusQuery.data ? <CheckStatus status={statusQuery.data} locale={locale} /> : null}
					{!error && !statusQuery.isPending && !statusQuery.data ? (
						<form className="selena-section p-6 sm:p-8" onSubmit={submit} noValidate>
							<h2 className="selena-heading text-2xl">{tr(locale, "Start your check", "Запустить проверку")}</h2>
							<p className="mt-2 text-sm leading-6 text-[#574d45]">
								{tr(
									locale,
									"Enter one public website URL. This is the only information needed.",
									"Укажите адрес одного публичного сайта. Больше ничего не нужно.",
								)}
							</p>
							<div className="mt-6 space-y-2">
								<Label htmlFor="free-ai-visibility-website">{tr(locale, "Website URL", "Адрес сайта")}</Label>
								<Input
									id="free-ai-visibility-website"
									name="website"
									type="url"
									inputMode="url"
									autoComplete="url"
									placeholder="https://example.com"
									value={website}
									onChange={(event) => setWebsite(event.target.value)}
									required
									aria-describedby="free-ai-visibility-website-hint"
								/>
								<p id="free-ai-visibility-website-hint" className="text-sm text-[#574d45]">
									{tr(
										locale,
										"We normalize the domain before the check starts.",
										"Перед запуском мы приводим домен к единому виду.",
									)}
								</p>
							</div>
							<Button
								className="selena-primary-button mt-6 min-h-11"
								type="submit"
								disabled={claim.isPending}
								aria-busy={claim.isPending}
							>
								{claim.isPending ? (
									<IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<IconSparkles className="size-4" aria-hidden="true" />
								)}
								{claim.isPending
									? tr(locale, "Starting check", "Запускаем проверку")
									: tr(locale, "Run free two-system check", "Запустить бесплатную проверку по двум системам")}
							</Button>
						</form>
					) : null}
				</div>
			</div>
		</main>
	);
}

function PendingStatus({ locale }: { locale: WorkspaceLocale }) {
	return (
		<section className="selena-section flex items-center gap-3 p-6 sm:p-8" role="status" aria-live="polite">
			<IconLoader2 className="size-5 animate-spin text-[#8f5c34]" aria-hidden="true" />
			<div>
				<h2 className="selena-heading text-2xl">{tr(locale, "Checking your account", "Проверяем ваш аккаунт")}</h2>
				<p className="mt-1 text-sm text-[#574d45]">
					{tr(locale, "We are loading your one-time check status.", "Загружаем статус вашей разовой проверки.")}
				</p>
			</div>
		</section>
	);
}

function CabinetLink({ locale, lead }: { locale: WorkspaceLocale; lead: string }) {
	return (
		<p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm leading-6 text-[#574d45]">
			<span>{lead}</span>
			<Link className="selena-text-button inline-flex" to="/app/selena">
				{tr(locale, "Open the cabinet", "Перейти в кабинет")}
				<IconArrowRight className="size-4" aria-hidden="true" />
			</Link>
		</p>
	);
}

function ErrorState({
	state,
	locale,
	onTryAgain,
}: {
	state: FreeAiVisibilityCustomerError;
	locale: WorkspaceLocale;
	onTryAgain: () => void;
}) {
	const content = freeAiVisibilityErrorCopy(state, locale);
	return (
		<section className="selena-section p-6 sm:p-8" role="alert" aria-live="assertive">
			<div className="flex items-start gap-3">
				<IconAlertCircle className="mt-0.5 size-5 shrink-0 text-[#8f5c34]" aria-hidden="true" />
				<div>
					<h2 className="selena-heading text-2xl">{content.heading}</h2>
					<p className="mt-2 leading-6 text-[#574d45]">{content.body}</p>
					{state === "EMAIL_VERIFICATION_REQUIRED" ? (
						<Link
							className="selena-text-button mt-4 inline-flex"
							to="/auth/login"
							search={{ returnTo: "/free-ai-visibility" }}
						>
							<IconMail className="size-4" aria-hidden="true" />
							{tr(
								locale,
								"Sign in again to receive a verification email",
								"Войдите снова, чтобы получить письмо для подтверждения",
							)}
						</Link>
					) : null}
					{cabinetErrors.has(state) ? (
						<CabinetLink
							locale={locale}
							lead={tr(
								locale,
								"Your projects and measurements live in the cabinet.",
								"Ваши проекты и замеры — в кабинете.",
							)}
						/>
					) : null}
					{retryableErrors.has(state) ? (
						<Button className="mt-4 min-h-11" type="button" variant="outline" onClick={onTryAgain}>
							{state === "DOMAIN_INVALID"
								? tr(locale, "Edit website", "Изменить адрес")
								: tr(locale, "Try again", "Попробовать снова")}
						</Button>
					) : null}
				</div>
			</div>
		</section>
	);
}

function CheckStatus({
	status,
	locale,
}: {
	status: NonNullable<Awaited<ReturnType<typeof getFreeAiVisibilityCheckStatusFn>>>;
	locale: WorkspaceLocale;
}) {
	if (status.status !== "COMPLETED") {
		return (
			<section className="selena-section p-6 sm:p-8" role="status" aria-live="polite">
				<div className="flex items-start gap-3">
					<IconLoader2 className="mt-0.5 size-5 animate-spin text-[#8f5c34]" aria-hidden="true" />
					<div>
						<h2 className="selena-heading text-2xl">
							{status.status === "QUEUED"
								? tr(locale, "Your check is queued", "Проверка в очереди")
								: tr(locale, "Confirming your check", "Подтверждаем проверку")}
						</h2>
						<p className="mt-2 leading-6 text-[#574d45]">
							{tr(
								locale,
								`We will update this page when the two-system result is ready for ${status.domain}.`,
								`Мы обновим эту страницу, когда результат по двум системам для ${status.domain} будет готов.`,
							)}
						</p>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			className="selena-section p-6 sm:p-8"
			aria-labelledby="free-check-result-heading"
			role="status"
			aria-live="polite"
		>
			<div className="flex items-start gap-3">
				<IconCheck className="mt-0.5 size-5 shrink-0 text-[#52705b]" aria-hidden="true" />
				<div>
					<h2 id="free-check-result-heading" className="selena-heading text-2xl">
						{tr(locale, "Your two-system check is ready", "Результат проверки по двум системам готов")}
					</h2>
					<p className="mt-2 leading-6 text-[#574d45]">
						{tr(
							locale,
							`Results for ${status.domain}. These are limited observations from this one check, not a recommendation or future ranking prediction.`,
							`Результаты для ${status.domain}. Это ограниченные наблюдения одной проверки, а не рекомендация и не прогноз позиций.`,
						)}
					</p>
				</div>
			</div>
			<ul className="mt-6 grid gap-3 sm:grid-cols-2">
				{status.report.systems.map((system) => (
					<li key={system.system} className="rounded-xl border border-[#dccfbe] bg-[#fffdf8] p-4">
						<h3 className="font-semibold text-[#161413]">{system.system === "chatgpt" ? "ChatGPT" : "Gemini"}</h3>
						{system.terminalStatus === "FAILED" ? (
							<p className="mt-2 text-sm leading-6 text-[#574d45]">
								{tr(
									locale,
									"This system could not be confirmed for this check.",
									"Эту систему не удалось подтвердить в рамках проверки.",
								)}
							</p>
						) : (
							<dl className="mt-3 grid gap-2 text-sm">
								<div className="flex justify-between gap-4">
									<dt className="text-[#574d45]">{tr(locale, "Domain mentioned", "Домен упомянут")}</dt>
									<dd className="font-medium text-[#161413]">
										{system.domainMentioned ? tr(locale, "Yes", "Да") : tr(locale, "No", "Нет")}
									</dd>
								</div>
								<div className="flex justify-between gap-4">
									<dt className="text-[#574d45]">{tr(locale, "Citations returned", "Ссылок на источники")}</dt>
									<dd className="font-medium text-[#161413]">{system.citationCount}</dd>
								</div>
							</dl>
						)}
					</li>
				))}
			</ul>
			<CabinetLink
				locale={locale}
				lead={tr(
					locale,
					"Want the full measurement? Set up your project in the cabinet.",
					"Нужен полный замер? Настройте проект в кабинете.",
				)}
			/>
		</section>
	);
}
