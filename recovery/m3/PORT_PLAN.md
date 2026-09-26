# M3: перенос Local-инфраструктуры со staging в release

Источник: `origin/recovery/staging-2026-09-16`. Код воркера лежит в `recovery/worker-src/`, код web в `recovery/web-src/`, общая точка с release — `03fb41a`.

## Не переносится

Решения LOCKED:
- `selena-local-customer-order*`, `-customer-execution`;
- fixture scheduler;
- checkout ($49): `selena-local-checkout`, `routes/.../selena/local/checkout.tsx`, `selena-local-publication-links`;
- `test-payment`;
- `selena-report-library`, секция AVLI;
- 0077 local-AI;
- `local-maps-runtime-proof.ts`;
- staging-миграции 0074 и 0076 (customer runs и order publications, завязаны на тестовый платёж $49).

Двенадцать файлов на staging старше, чем в release: `db.ts`, `postgres-config.ts`, `provisioning.ts`, `organization-transaction.ts`, `secrets/store.ts`, `catalog.ts`, `selena-rls-runtime-role.sql` и другие. Их **не** переносить.

## Инвентарь

| Группа | Файлы | Объём |
|---|---|---|
| Новые модули lib | `selena-local-{pilot-orchestrator, report-store, billing-reconciliation, report-publication, external-audit, retry-coordinator, competitors, external-audit-store, report-print, customer-location, dispatch-store, raw-retention}` | ~2800 строк |
| Изменения lib | `selena-local-maps-attempt-store` (+491), `selena-api-idempotency` (+40, `withSelenaApiMutation`), `selena-local-execution` (+16, provider gate), `selena-provider-spend` (+5), `live-runner` (+5), экспорты в `package.json` | |
| Адаптеры | `dataforseo-local-maps-rank-adapter` (336), `http-local-maps-rank-adapter` (144) | |
| Контракты `packages/selena-visibility-contracts/src` | `local-report.ts` (новый); изменения в `local-locks` (PILOT_NO_CHARGE 0.00), `local-maps-live`, `local-api` (+PENDING/CANCELLED), `local-execution`, `local-maps-rank-adapter`, `index` | |
| `schema-visibility-os.ts` | +8 таблиц: `dispatch_outbox`, `report_versions`, `qc_decisions`, `report_deliveries`, `canary_reviews`, `raw_evidence`, `evidence_acceptances`, `raw_retention_health` | |
| Воркер | `local-dispatch-outbox`, `local-runtime-executor`, `local-raw-retention-scheduler`, `local-operator-alerts`, `jobs/selena-local-raw-retention`, `scripts/local-maps-one-shot`, `scripts/local-retention-health`; изменения в `local-index`, `handlers`, `index`, `jobs/selena-local-measure` | |
| cloud | `email.ts` (+`sendEmailWithReceipt`) | |
| env-registry | +15 переменных, ручной merge | |
| Компоненты web | `selena-local-map-report`, `-external-report`, `-report-page` (убрать кнопку $49 и documents); маршрут `/selena/local/$cycleId`; переименование в Ask Maps | |

## Схема БД

Нужно перенести объекты из staging 0067–0071 и 0073+0075 в финальном состоянии:
- 8 таблиц `sv_local_*`, около 16 guard-функций, изменения общих таблиц;
- таблицы `sv_local_external_{audits, tasks, raw_evidence, publications}`.

Требования к новым миграциям:
- номера с 0075, `when` с 1790320007000;
- идемпотентны относительно staging: `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`, DO-проверки;
- явный FORCE RLS.

## Маршруты, которые есть только в собранном JS

По `ROUTE_REGISTRY.md` таких маршрутов 21:
- LOW — 15;
- HIGH — 5: #3 и #10–13;
- не переносятся — 2: #2 и #9.

Store для маршрутов #14–21 восстановлен в исходниках. Переписать нужно только обработчики.

## План PR

1. Контракты и чистая lib без БД, с юнит-тестами.
2. Миграция 0075 (pilot runtime, финальное состояние staging 0067–0071) и таблицы в `schema-visibility-os.ts`. Проверки:
   - на чистой базе;
   - на базе из `recovery/staging-schema.sql` миграция ничего не меняет.
3. Миграция 0076 (external audits) и `external-audit-store`.
4. Провайдеры: адаптеры, env-registry, attempt-store, `retry-coordinator`, `billing-reconciliation`. По умолчанию выключены.
5. Runtime воркера: orchestrator, outbox, executor, retention, alerts (явный флаг вместо env-ID), email, скрипты.
6. Маршруты отчётов #14–21 и #1:
   - `withSelenaApiMutation`;
   - проверка оператора для QC, publish и deliver;
   - ответ 404 для чужого объекта;
   - проверка Origin;
   - кэш для `local-ready`.
7. Web UI за `entitlementsFor(..., { localDiscoveryVerified })`.
8. Опционально, только с подписью владельца: publications (#10–13) без гейта на оплату.

## Итог

| Шаг | PR | Отличия от плана |
|---|---|---|
| 1 | #184 | — |
| 2 | #185 | Миграция 0075 — staging 0067–0071 без изменений, но под проверкой «объекты уже есть». Применена на staging. |
| 3 | #186 | Миграция 0076. Добавлен rehearsal `local_external`. Применена на staging. |
| 4 | #187 | Pilot orchestrator, report-, dispatch- и retention-store перенесены сюда из шага 5 (это lib). |
| 5 | #188 | Customer fixture scheduler не перенесён. Второй consumer retention в основном воркере убран. |
| 6 | #189 | Действия оператора требуют platform admin. Маршрут `/api/local-ready` не изменён: у анонимной проверки из сборки нет вызывающих, и она нагружает базу. |
| 7 | этот PR | Страница `/app/selena-ask-maps/$cycleId` без гейта `entitlementsFor`. Пилоты ручные и бесплатные, поэтому доступ определяют сессия, тенант и опубликованный отчёт. Plan-гейт закрыл бы все пилоты, пока оплата на паузе. |
| 8 | — | Решение владельца 2026-09-26: отложено, пока клиентам не понадобится ссылка на отчёт для пересылки. В кабинете отчёт уже публикуется, отправляется и подтверждается. |
