import { IconAlertCircle, IconCheck, IconLoader2, IconMail, IconSparkles } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useState } from "react";
import { SelenaWordmark } from "@/components/selena-wordmark";
import {
	freeAiVisibilityCustomerError,
	shouldPollFreeAiVisibilityStatus,
	type FreeAiVisibilityCustomerError,
} from "@/lib/selena-free-ai-visibility-ui";
import { claimFreeAiVisibilityCheckFn, getFreeAiVisibilityCheckStatusFn } from "@/server/selena-free-ai-visibility";

const statusQueryKey = ["selena", "free-ai-visibility"] as const;

const errorContent: Record<FreeAiVisibilityCustomerError, { heading: string; body: string }> = {
	EMAIL_VERIFICATION_REQUIRED: {
		heading: "Verify your email to continue",
		body: "This one-time check is available after your email address is verified.",
	},
	ALREADY_CLAIMED: {
		heading: "Your free check has already been used",
		body: "Each verified account can run one no-cost check across the two systems.",
	},
	BUDGET_UNAVAILABLE: {
		heading: "The free-check budget is unavailable",
		body: "Please try again later. No check was started.",
	},
	DOMAIN_INVALID: {
		heading: "Enter a public website address",
		body: "Use a website URL such as https://example.com.",
	},
	DISABLED: {
		heading: "The free check is not available right now",
		body: "Please try again later.",
	},
	FAILED: {
		heading: "We could not start or read this check",
		body: "Please try again later. No provider response or source link is shown here.",
	},
};

export const Route = createFileRoute("/_authed/free-ai-visibility")({
	component: FreeAiVisibilityPage,
});

function FreeAiVisibilityPage() {
	const queryClient = useQueryClient();
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
				<header className="selena-app-header flex items-center justify-between rounded-2xl px-5 py-4 sm:px-6">
					<SelenaWordmark />
					<p className="text-sm text-[#574d45]">Verified account check</p>
				</header>

				<section className="selena-section selena-section--anchor mt-6 p-6 sm:p-8" aria-labelledby="free-check-heading">
					<p className="selena-anchor-meta">One-time, no-cost check</p>
					<h1 id="free-check-heading" className="selena-heading mt-3 text-3xl sm:text-4xl">
						See whether two AI systems mention your domain
					</h1>
					<p className="selena-anchor-lede mt-4 max-w-2xl">
						This verified-account check runs once in ChatGPT and Gemini. It reports only whether your domain was
						mentioned and the number of citations returned, not answer text or source links.
					</p>
				</section>

				<div className="mt-6">
					{error ? (
						<ErrorState
							state={error}
							onTryAgain={() => {
								setSubmissionError(null);
								if (queryError) void statusQuery.refetch();
							}}
						/>
					) : null}
					{!error && statusQuery.isPending ? <PendingStatus /> : null}
					{!error && statusQuery.data ? <CheckStatus status={statusQuery.data} /> : null}
					{!error && !statusQuery.isPending && !statusQuery.data ? (
						<form className="selena-section p-6 sm:p-8" onSubmit={submit} noValidate>
							<h2 className="selena-heading text-2xl">Start your check</h2>
							<p className="mt-2 text-sm leading-6 text-[#574d45]">
								Enter one public website URL. This is the only information needed.
							</p>
							<div className="mt-6 space-y-2">
								<Label htmlFor="free-ai-visibility-website">Website URL</Label>
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
									We normalize the domain before the check starts.
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
								{claim.isPending ? "Starting check" : "Run free two-system check"}
							</Button>
						</form>
					) : null}
				</div>
			</div>
		</main>
	);
}

function PendingStatus() {
	return (
		<section className="selena-section flex items-center gap-3 p-6 sm:p-8" role="status" aria-live="polite">
			<IconLoader2 className="size-5 animate-spin text-[#8f5c34]" aria-hidden="true" />
			<div>
				<h2 className="selena-heading text-2xl">Checking your account</h2>
				<p className="mt-1 text-sm text-[#574d45]">We are loading your one-time check status.</p>
			</div>
		</section>
	);
}

function ErrorState({ state, onTryAgain }: { state: FreeAiVisibilityCustomerError; onTryAgain: () => void }) {
	const content = errorContent[state];
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
							Sign in again to receive a verification email
						</Link>
					) : null}
					{state !== "EMAIL_VERIFICATION_REQUIRED" && state !== "ALREADY_CLAIMED" ? (
						<Button className="mt-4 min-h-11" type="button" variant="outline" onClick={onTryAgain}>
							{state === "DOMAIN_INVALID" ? "Edit website" : "Try again"}
						</Button>
					) : null}
				</div>
			</div>
		</section>
	);
}

function CheckStatus({
	status,
}: {
	status: NonNullable<Awaited<ReturnType<typeof getFreeAiVisibilityCheckStatusFn>>>;
}) {
	if (status.status !== "COMPLETED") {
		return (
			<section className="selena-section p-6 sm:p-8" role="status" aria-live="polite">
				<div className="flex items-start gap-3">
					<IconLoader2 className="mt-0.5 size-5 animate-spin text-[#8f5c34]" aria-hidden="true" />
					<div>
						<h2 className="selena-heading text-2xl">
							{status.status === "QUEUED" ? "Your check is queued" : "Confirming your check"}
						</h2>
						<p className="mt-2 leading-6 text-[#574d45]">
							We will update this page when the two-system result is ready for {status.domain}.
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
						Your two-system check is ready
					</h2>
					<p className="mt-2 leading-6 text-[#574d45]">
						Results for {status.domain}. These are limited observations from this one check, not a recommendation or
						future ranking prediction.
					</p>
				</div>
			</div>
			<ul className="mt-6 grid gap-3 sm:grid-cols-2">
				{status.report.systems.map((system) => (
					<li key={system.system} className="rounded-xl border border-[#dccfbe] bg-[#fffdf8] p-4">
						<h3 className="font-semibold text-[#161413]">{system.system === "chatgpt" ? "ChatGPT" : "Gemini"}</h3>
						{system.terminalStatus === "FAILED" ? (
							<p className="mt-2 text-sm leading-6 text-[#574d45]">
								This system could not be confirmed for this check.
							</p>
						) : (
							<dl className="mt-3 grid gap-2 text-sm">
								<div className="flex justify-between gap-4">
									<dt className="text-[#574d45]">Domain mentioned</dt>
									<dd className="font-medium text-[#161413]">{system.domainMentioned ? "Yes" : "No"}</dd>
								</div>
								<div className="flex justify-between gap-4">
									<dt className="text-[#574d45]">Citations returned</dt>
									<dd className="font-medium text-[#161413]">{system.citationCount}</dd>
								</div>
							</dl>
						)}
					</li>
				))}
			</ul>
		</section>
	);
}
