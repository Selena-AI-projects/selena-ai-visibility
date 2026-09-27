import { IconBrandTelegram, IconCheck, IconExternalLink } from "@tabler/icons-react";
import { Button } from "@workspace/ui/components/button";
import { useCallback, useEffect, useState } from "react";
import {
	createTelegramConnectLinkFn,
	disconnectTelegramFn,
	getTelegramDeliveryFn,
	type TelegramDeliveryState,
} from "@/server/selena-telegram-delivery";

type Locale = "en" | "ru";
type ConnectLink = Awaited<ReturnType<typeof createTelegramConnectLinkFn>>;

function tr(locale: Locale, english: string, russian: string): string {
	return locale === "ru" ? russian : english;
}

// Every failure here is a configuration or permission code meant for logs,
// so the customer gets plain wording for what they tried instead.
function describeFailure(cause: unknown, locale: Locale, fallback: string): string {
	const message = cause instanceof Error ? cause.message : "";
	if (message.startsWith("Forbidden:"))
		return tr(locale, "Only workspace editors can change this.", "Изменить это могут только редакторы кабинета.");
	return fallback;
}

function formatDate(value: string, locale: Locale): string {
	return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en", { dateStyle: "medium" }).format(new Date(value));
}

export function SelenaTelegramDigestCard({ projectId, locale }: { projectId: string; locale: Locale }) {
	const [state, setState] = useState<TelegramDeliveryState | null>(null);
	const [link, setLink] = useState<ConnectLink | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");

	const load = useCallback(
		(afterCheck = false) => {
			getTelegramDeliveryFn({ data: { projectId } })
				.then((next) => {
					setState(next);
					if (afterCheck)
						setNotice(
							next.bound
								? ""
								: tr(
										locale,
										"Not connected yet. Press Start in Telegram, then check again.",
										"Пока не подключено. Нажмите «Старт» в Telegram и проверьте ещё раз.",
									),
						);
				})
				// Delivery is optional; a card that cannot load is simply not shown.
				.catch(() => setState({ available: false, canWrite: false, bound: null }));
		},
		[projectId, locale],
	);
	useEffect(() => {
		setState(null);
		setLink(null);
		setError("");
		setNotice("");
		load();
	}, [load]);

	if (!state?.available) return null;

	const connect = async () => {
		setBusy(true);
		setError("");
		setNotice("");
		try {
			setLink(await createTelegramConnectLinkFn({ data: { projectId, locale } }));
		} catch (cause) {
			setError(
				describeFailure(
					cause,
					locale,
					tr(locale, "Could not create the link. Try again later.", "Не удалось создать ссылку. Попробуйте позже."),
				),
			);
		} finally {
			setBusy(false);
		}
	};

	const disconnect = async () => {
		setBusy(true);
		setError("");
		setNotice("");
		try {
			await disconnectTelegramFn({ data: { projectId } });
			setLink(null);
			load();
		} catch (cause) {
			setError(
				describeFailure(
					cause,
					locale,
					tr(locale, "Could not disconnect. Try again.", "Не удалось отключить. Попробуйте ещё раз."),
				),
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="selena-section" aria-labelledby="telegram-digest-title">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex gap-4">
					<div className="selena-icon-disc">
						<IconBrandTelegram className="size-5" />
					</div>
					<div>
						<h2 id="telegram-digest-title" className="selena-heading text-2xl">
							{tr(locale, "Weekly report in Telegram", "Еженедельный отчёт в Telegram")}
						</h2>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-[#574d45]">
							{tr(
								locale,
								"A short summary arrives only in weeks when a new measurement finished. The full report stays here.",
								"Короткая сводка приходит только в те недели, когда завершился новый замер. Полный отчёт остаётся здесь.",
							)}
						</p>
					</div>
				</div>
				{state.bound && (
					<span className="selena-success-label">
						<IconCheck className="size-4" /> {tr(locale, "Connected", "Подключено")}
					</span>
				)}
			</div>

			<div className="mt-5">
				{state.bound ? (
					<div className="flex flex-wrap items-center gap-3">
						<p className="text-sm text-[#574d45]">
							{tr(locale, "Connected since", "Подключено с")} {formatDate(state.bound.boundAt, locale)}
						</p>
						{state.canWrite && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="border-[#cdbdac] bg-[#fffdf8]"
								disabled={busy}
								onClick={disconnect}
							>
								{busy ? tr(locale, "Disconnecting…", "Отключаем…") : tr(locale, "Disconnect", "Отключить")}
							</Button>
						)}
					</div>
				) : link ? (
					<div className="space-y-3 rounded-lg border border-[#e3d7c9] bg-[#fffdf8] px-4 py-3 text-sm text-[#3d362e]">
						<a
							href={link.url}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-2 font-medium underline underline-offset-4"
						>
							{tr(locale, "Open Telegram and press Start", "Откройте Telegram и нажмите «Старт»")}
							<IconExternalLink className="size-4" />
						</a>
						<p className="text-[#574d45]">
							{tr(
								locale,
								"If there is no Start button, send the bot this message:",
								"Если кнопки «Старт» нет, отправьте боту это сообщение:",
							)}{" "}
							<code className="break-all rounded bg-[#f3ece3] px-1.5 py-0.5">{link.startCommand}</code>
						</p>
						<p className="text-[#574d45]">
							{tr(locale, "The link works for 15 minutes.", "Ссылка действует 15 минут.")}{" "}
							<button type="button" className="underline underline-offset-4" onClick={() => load(true)}>
								{tr(locale, "Check the connection", "Проверить подключение")}
							</button>
						</p>
						<button
							type="button"
							className="text-[#574d45] underline underline-offset-4"
							disabled={busy}
							onClick={connect}
						>
							{busy ? tr(locale, "Preparing…", "Готовим…") : tr(locale, "Create a new link", "Создать новую ссылку")}
						</button>
					</div>
				) : !state.canWrite ? (
					<p className="text-sm text-[#574d45]">
						{tr(locale, "A workspace editor can connect Telegram.", "Подключить Telegram может редактор кабинета.")}
					</p>
				) : (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="border-[#cdbdac] bg-[#fffdf8]"
						disabled={busy}
						onClick={connect}
					>
						{busy ? tr(locale, "Preparing…", "Готовим…") : tr(locale, "Connect Telegram", "Подключить Telegram")}
					</Button>
				)}
				{notice && <p className="mt-2 text-sm text-[#574d45]">{notice}</p>}
				{error && <p className="mt-2 text-sm text-[#9a5f14]">{error}</p>}
			</div>
		</section>
	);
}
