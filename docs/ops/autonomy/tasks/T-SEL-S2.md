# T-SEL-S2 — M5 шаг 4: еженедельный дайджест в воркере

| Поле | Значение |
|---|---|
| task_id | T-SEL-S2 |
| repo / base SHA | `Selena-AI-projects/selena-ai-visibility` @ `39dda8f` (`release/selena-visibility-mvp`) |
| Статус | TESTED_LOCAL (синтетические данные, фейковое хранилище). Против настоящего Postgres не запускалось |
| Ветка / PR | `claude/six-projects-selena`, draft PR #202 |
| План | `recovery/m5/PLAN.md`, шаг 4 |

## Что сделано (коммиты)

- `d3003b0` — сборка отчёта цикла вынесена в `packages/lib/src/selena-cycle-report.ts` (и `selena-answer-payload.ts`). Кабинет (`apps/web/src/server/selena-grader-report.ts`) и воркер теперь считают одно и то же.
- `4425d90` — миграция `0079_weekly_digest_targets.sql`: definer-функция `sv_list_weekly_digest_targets()`. Она возвращает только пары (организация, проект) с привязанным Telegram, chat id не возвращает. Права выдаются `selena_app` (`packages/lib/scripts/selena-rls-runtime-role.sql`). Журнал drizzle, закреплённая цепочка в тесте, `SELENA_MIGRATION_MAX_INDEX` в `.github/workflows/e2e.yaml` → 79.
- `0cd3e96` — `packages/lib/src/selena-weekly-digest-store.ts`: чтение источника, сохранение дайджеста, создание доставки, claim и запись попытки на боевых таблицах 0077. Все шаги — внутри транзакции одной организации. `readCycleLedger` вынесен из замыкания репозиториев.
- `21daa89` — `apps/worker/src/jobs/selena-weekly-digest.ts`:
  - очередь `selena-weekly-digest` в `MANAGED_SCHEDULES`, cron `0 6 * * 1` UTC;
  - флаг `SELENA_WEEKLY_DIGEST_ENABLED` сравнивается строго с `'true'`, и в расписании, и в обработчике;
  - если бот не настроен (`readTelegramDeliveryConfig`), ничего не сохраняется;
  - повторы: `startAfter` по `decideNextDelivery`, 5 попыток, паузы 1 / 5 / 30 / 120 мин. `retryLimit: 0` у очереди.
- `be13e5f` — описание флага в `env-registry.ts`, changeset.

## Правила, которые проверяют тесты

`apps/worker/src/jobs/selena-weekly-digest.test.ts` — 10 тестов, все проходят. Фейковое хранилище применяет настоящие `resolveDeliveryPrecondition` и `decideNextDelivery` из контрактов.

- флаг не `'true'` → ни одного обращения к данным;
- бот не настроен → ничего не сохраняется;
- за неделю нет нового цикла или готовых циклов нет совсем → нет дайджеста и нет отправки;
- порядок событий `save → send`. Повторный запуск за ту же неделю даёт `ALREADY_DELIVERED` и не отправляет второй раз;
- у всех систем 0 разобранных ответов → в сообщении «нет данных: 2» и «неизвестно», `brandMentionRate = null`, «0%» в тексте нет;
- паузы между повторами 1 / 5 / 30 / 120 мин, затем `FAILED` после 5 попыток. Ранний повтор отклоняется `NOT_DUE`, шестая попытка — `ATTEMPTS_EXHAUSTED`;
- ответ `RECIPIENT_GONE` → получатель отвязывается, повтор не ставится;
- три организации, одна падает → остальные две доставлены. Каждое чтение и запись шли в scope своей организации.

## Запускалось локально

- `pnpm install --frozen-lockfile` — прошла (Node 22 вместо требуемого 24).
- `apps/worker`: `tsx --test src/jobs/selena-weekly-digest.test.ts` — 10/10; `src/recurring-schedules.test.ts` — 9/9; `tsc --noEmit` — без ошибок.
- `packages/lib`: `vitest run src/db/` — 13 файлов, 143/143; `tsc --noEmit` — без ошибок.
- `apps/web`: `tsc --noEmit` — без ошибок.
- `biome check --write` по изменённым файлам.

## Не проверено

- SQL `0079` и запросы хранилища против настоящего Postgres. Миграции локально не применялись (AGENTS.md запрещает запуск миграций без явного указания). Проверку даст e2e job CI.
- Реальный Telegram не вызывался.
- Staging не трогался. Это шаг 5 плана, только с разрешения владельца.

## Решения по умолчанию (интерпретация, можно изменить)

- Получатель — любой проект с привязанным Telegram. Отсечения по тарифу ($49 / $79 из PLAN.md) в задаче нет: карточка подключения тоже не проверяет тариф.
- «Цикл завершён» — статус `READY`. Время завершения — последний `sv_runs.finished_at` цикла: собственной метки завершения у цикла нет.
- Неделя — с понедельника 00:00 до понедельника 00:00 UTC, последняя полная неделя.
- Кроме флага, для работы нужны `SELENA_RECURRING_JOBS_ENABLED=true`, бот (`SELENA_TELEGRAM_BOT_TOKEN`, `_USERNAME`), `APP_URL` и ключ шифрования.

## blocker

BLOCKED_DECISION:
- нужно ли ограничивать дайджест тарифом;
- разрешение на шаг 5 (staging, тестовый бот).

## next_step

CI draft PR (e2e job применит 0079). Затем, после решения владельца, — шаг 5.
