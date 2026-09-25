# ТЗ: M1A (канонический каталог) и M2 (изоляция клиентов)

Статус: черновик, ждёт утверждения владельца. Основание: `recovery/m0/M0_REPORT.md` (M0 = PARTIAL / SUFFICIENT TO PROCEED).

## Общие запреты (действуют на M1A и M2)

1. Не трогать production, staging, DNS, домены Railway и клиентские данные. Разработка и проверки идут только в локальной или эфемерной базе.
2. Живые платежи не включать. Продавец не утверждён (HOLD).
3. Файлы из `recovery/` с меткой `RECONSTRUCTED` не выдавать за оригинал и не класть в `packages/lib/src/db/migrations/` без отдельного решения владельца.
4. `LOCAL_MAPS_ONE_OFF` ($49 разово, 15 запросов) имеет статус **LEGACY / DO NOT PORT AS COMMERCIAL PRODUCT**. Не переносить отдельный Local checkout, отдельную цену и страницу `/local-maps`.
5. Каждое изменение делается отдельным PR в `release/selena-visibility-mvp` и проходит CI. Мёржить без ревью владельца нельзя.

---

## M1A: канонический каталог

### Цель

Один продуктовый контракт в коде кабинета и на витрине. Никаких изменений в production.

### Утверждённый каталог (LOCKED 2026-09-25)

| plan_id | Название | Оплата | Local Discovery |
|---|---|---|---|
| `public-readiness` | FREE Public Readiness | бесплатно | — |
| `visibility-snapshot` | Visibility Snapshot | $49 в месяц (подписка) | — |
| `full-discovery-landscape` | Full Discovery Landscape | $79 в месяц (подписка) | автоматическое, только где production-измерение подтверждено |
| `competitive-audit` | Verified Discovery & Competitive Audit | $399 разово | ручная проверка Google Ask Maps / Local AI |
| `managed-discovery-90` | Managed Discovery Growth | $2,490 за 90 дней | по согласованному объёму |

Старые id остаются **алиасами только для чтения**, новые записи с ними запрещены:

| Старый id | Новый id |
|---|---|
| `visitor-local` | `visibility-snapshot` |
| `full-ai-landscape` | `full-discovery-landscape` |
| `expert-verified` | `competitive-audit` |
| `growth-90-days` | `managed-discovery-90` |
| `ai-visibility-snapshot` / `-landscape` / `-expert-verified` / `-implementation-90-days` (витрина) | те же новые id по смыслу |
| `LOCAL_MAPS_ONE_OFF` | алиаса нет. LEGACY: старые заказы читаются, новые не создаются |

### Работы

1. **Один источник каталога.** `packages/selena-visibility-contracts/src/catalog.ts`:
   - новые id и названия;
   - поле `billing: "subscription_monthly" | "one_time" | "term_90_days" | "free"`;
   - поле `surfaces` со значениями `visitor_ai`, `expanded_ai`, `local_discovery_auto`, `local_manual_audit`;
   - функция `resolvePlanId(legacyOrNew)` для алиасов.
2. **Доступ по тарифу.** Функция `entitlementsFor(planId)`. Её одинаково используют order desk, request inbox, `selena-report.tsx` и будущие вкладки отчёта. Вкладка **Local Discovery** видна только при `local_discovery_auto` и только если включён флаг «production-измерение подтверждено». Пока флаг выключен, вкладка показывает честное «ещё не подтверждено».
3. **Места, где используются plan id, перевести на новый каталог:** `selena-order-desk.tsx`, `selena-request-inbox.tsx`, `routes/_authed/app/selena-order.tsx`, `selena-report.tsx`, `server/selena-order-requests.ts`, `selena-pilot-seat-issuance.ts`, `staging-simulation.ts`, `scripts/selena-first-live-order.ts`.
4. **Сохранённые данные.** В `plan_id` таблиц `sv_order_requests`, `sv_quotes` и `sv_orders` старые id не переписываются. Чтение идёт через `resolvePlanId`. Миграцию данных не делать.
5. **Витрина `SELENA-AI-COMPANY`.** `lib/commercial-facts.ts` перевести на те же id, названия и тип оплаты. Кнопки покупки не добавлять: сейчас это заявка или ранний доступ, `CLIENT_PORTAL_ENABLED` остаётся `false`.
6. **LEGACY Local.** Код `selena-local-customer-order*` при переносе (в M3, не здесь) приходит без коммерческого предложения. В M1A только добавить в каталог явный запрет: `LOCAL_MAPS_ONE_OFF` не принимается `resolvePlanId`.

### Приёмка M1A

- Юнит-тесты: `resolvePlanId` для каждого алиаса, отказ для `LOCAL_MAPS_ONE_OFF`, матрица «тариф → вкладки».
- Снимок каталога совпадает с таблицей выше: цены, тип оплаты, поверхности.
- Поиск по репозиториям кабинета и витрины: старые id встречаются только в таблице алиасов и в тестах.
- На витрине и в кабинете для каждого тарифа одинаковые названия, цены и тип оплаты.

---

## M2: изоляция клиентов (P0, блокер запуска)

### Цель

Клиент A не видит данные клиента B ни через один путь. Приложение не подключается к базе ролью, которая может обойти RLS.

### Текущее состояние (проверено в M0 по схеме staging от 2026-09-25)

- Web и воркер подключаются через `DATABASE_URL` как **владелец таблиц**. `SELENA_WEB_DATABASE_URL` нигде в коде не читается.
- Роль `selena_app` (`NOBYPASSRLS`, `NOINHERIT`) существует. Её создаёт скрипт `scripts/selena-rls-runtime-role.sql`, приложение её не использует.
- В схеме `public` 127 таблиц. RLS включён на 117, FORCE — только на 24.
- **RLS включён, но политик нет** (для не-владельца это полный запрет, и приложение сломается при переключении): `brand_opportunities`, `brands`, `citations`, `competitors`, `organization_settings`, `prompt_run_hourly_aggregates`, `prompt_runs`, `prompts`, `secrets`, `sv_free_auto_dispatch_claims`, `sv_journal_no_spend_reconciliations`, `sv_pilot_invites`, `sv_provider_spend_budgets`, `sv_provider_spend_reservations`, `sv_public_scans`, `usage_events`.
- **RLS выключен:** таблицы авторизации (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `sso_provider`, `subscription`) и `sv_simulation_bootstrap_nonces`.
- В `organization-transaction.ts` выставляется `app.organization_id`. Новые Local-хранилища дополнительно проверяют членство в организации.

### Целевая модель ролей

| Роль | Кто использует | Свойства |
|---|---|---|
| owner / migrator | только сервис миграций | владеет таблицами, в runtime не используется |
| `selena_app` | web (запросы клиентов) | `NOBYPASSRLS`, не владелец, права по allowlist |
| `selena_worker` | воркер, задачи измерений | `NOBYPASSRLS`; кросс-тенантные операции только через явно перечисленные `SECURITY DEFINER` функции |
| `selena_internal` | админка и операторские действия | отдельная роль и отдельный путь, каждое действие пишется в аудит |

### Работы

1. **Подключения.** Web использует `SELENA_WEB_DATABASE_URL` (роль `selena_app`), воркер — `SELENA_WORKER_DATABASE_URL`. Если переменная не задана при `DEPLOYMENT_MODE != local`, приложение не стартует (fail closed). Owner-подключение остаётся только у `migrate`.
2. **Политики.** Для каждой из 16 таблиц без политик нужно решить одно из двух: tenant-политика по `organization_id` (или через `brand_id` → `organization`) либо осознанный полный запрет с доступом через `SECURITY DEFINER`. Решение записывается в реестр.
3. **FORCE RLS** на всех таблицах с данными клиентов. Новая миграция добавляется в конец журнала.
4. **Таблицы авторизации.** Доступ только через Better Auth и серверные функции. Для `member` и `invitation` добавить политики, чтобы `selena_app` видел только свои организации. Где это невозможно, задокументировать, как сделан доступ.
5. **Контекст запроса.** Любой запрос `selena_app` к данным выполняется внутри `withOrganizationTransaction`, которая ставит `app.organization_id` и `app.user_id`. Добавить линтер или проверку в тестах, запрещающую прямой `db.` вне этой обёртки в `apps/web/src/server`.
6. **API и server actions.** По реестру маршрутов (`recovery/m1a-m2/ROUTE_REGISTRY.md` плюс существующие маршруты) у каждого маршрута проверяются авторизация, членство и защита от IDOR (нельзя подставить чужой id объекта).
7. **Ссылки на отчёты и экспорт.** Доступ к отчётам, CSV и печатным версиям проверяется по организации. Публичные ссылки, если они нужны, — только подписанные, с ограниченным сроком действия. `selena-report-library` с зашитым tenant в main не переносится.
8. **Скрипт `selena-rls-runtime-role.sql`** превратить в воспроизводимый шаг деплоя. Скрипт должен быть идемпотентным, пароль передаётся из секрета, права — по allowlist, который генерируется и проверяется тестом.

### Приёмка M2 (тесты на эфемерной базе)

- **Роли:** `selena_app` и `selena_worker` не являются владельцами ни одной таблицы, у обеих `rolbypassrls = false`.
- **Каталог:** у каждой таблицы с `organization_id` включены RLS и FORCE, есть политика или она внесена в реестр как полный запрет.
- **Матрица доступа** на каждом маршруте и server action из реестра, плюс на выгрузках и отчётах. Минимум четыре identity:
  - `anonymous` → 401;
  - `tenant A` → свои объекты;
  - `tenant B` → чужие объекты A возвращают 404 или 403, в списках объектов A нет;
  - `selena_internal` → доступ есть, запись в аудит есть.
- **Прямой SQL под `selena_app`** без `app.organization_id`: из каждой клиентской таблицы возвращается 0 строк.
- **Сквозные домены данных**, по каждому отдельный тест: Local (orders, scan cycles, publications, local_ai), AI measurement (runs, cycles, datasets), recommendations, history и rechecks, exports.
- **Регрессия:** весь CI зелёный под `selena_app`, а не под владельцем.

---

## План миграции (порядок)

1. **M1A PR (кабинет):** каталог, `resolvePlanId`, `entitlementsFor`, места использования plan id и тесты.
2. **M1A PR (витрина):** `commercial-facts.ts` и тексты. Без кнопок покупки.
3. **M2-a:** реестр доступа (все маршруты плюс 20 невосстановленных), решения по 16 таблицам без политик, тестовый стенд с четырьмя identity. Только тесты и документы, без изменения поведения.
4. **M2-b:** миграция с политиками и FORCE RLS, роли, fail-closed подключения. Проверка на эфемерной базе, созданной из `staging-schema.sql`.
5. **M2-c:** исправления маршрутов по результатам матрицы доступа.
6. **Выход:** все тесты приёмки M2 зелёные. Только после этого M3: перенос Local (PORT TO MAIN из M0) и объединение поверхностей в одном кабинете.

## Долг восстановления

20 серверных маршрутов существуют только в собранном JS. Реестр со строками маршрут → назначение → вызывающие → доказательства в бандле → требования к авторизации → затрагиваемые данные → нужно ли переписывать → куда → приёмочный тест лежит в `recovery/m1a-m2/ROUTE_REGISTRY.md`. Ни один маршрут не переносится без строки в реестре и приёмочного теста.
