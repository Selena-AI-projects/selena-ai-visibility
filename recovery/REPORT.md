# M0 — восстановление кода staging `selena-ai-visibility`

Сессия: 2026-09-25, локально на Mac. Режим только чтение.
Статус отчёта: завершён. Одна позиция открыта — миграция `0077`,
см. «Десять миграций» и «Что не сделано».
Ничего не деплоили, не перезапускали, не меняли. SQL, изменяющий данные, не выполнялся.
Клиентские данные не выгружались: только `pg_dump --schema-only` и `SELECT` из
служебной таблицы миграций.

- Railway project: `51dd0770-e622-4734-a705-ace401234bb8` (selena-ai-visibility)
- Environment: `staging` (`90f3bf7f-5e53-4de3-a3f7-56052b706f24`)
- Аккаунт: parkourcafe@gmail.com, railway CLI 5.41.1
- sourceTree применённой миграции: `0ab842432b0205eba5a6dead6e745312f1dcacc8`
- Git baseline для сравнения: `Selena-AI-projects/selena-ai-visibility`,
  ветка `release/selena-visibility-mvp`, коммит `03fb41a`

## Главный результат

Исходный код не потерян. В контейнере `local-worker` лежит **полный TypeScript
исходник** пакетов `@workspace/*` (в том числе `lib` — 3.2 МБ, вся папка миграций).
В контейнере `web` в клиентских source map сохранён `sourcesContent`, откуда
извлечены **322 файла оригинального исходника** приложения.

Это не декомпиляция и не реконструкция. Это те самые файлы, что были на диске
при сборке 15–16.09.2026.

## Что искали → что нашли

### Шесть модулей web

| Модуль | Состояние | Путь | SHA-256 |
|---|---|---|---|
| `selena-local-customer-order` | полный исходник | `worker-src/packages/lib/src/selena-local-customer-order.ts` | `fbae2d2d6b7c2faaed6537e56c258d1edb34fe6a45b120d45db8efd4c75ab50a` |
| `selena-local-customer-order-store` | полный исходник | `worker-src/packages/lib/src/selena-local-customer-order-store.ts` | `276014d63399b0c35d0d7287f6d4d9a9a2c8492ca3d2a4b5f48146e7a1028a18` |
| `selena-local-customer-execution` | полный исходник | `worker-src/packages/lib/src/selena-local-customer-execution.ts` | `2ad715192cf2a2ef53bd185b446f7a1da7d5729cf8b34a69d15d8e3a34fcca59` |
| `selena-local-report-print` | полный исходник | `worker-src/packages/lib/src/selena-local-report-print.ts` | `398fd8168edb7f759b80c2096abeafc769ab828e6880e9103fa8cccbc1c8c471` |
| `selena-workspaces` | полный исходник | `web-src/src/server/selena-workspaces.ts` | `5ac1ef942d403477c524f8c112f36599c2ae849c8c01ef11bb35b591bec7d217` |
| `selena-report-library` | **частично** — только собранный чанк | `web/server/_ssr/selena-report-library-DaJj8lm0.mjs` | `11cc4ebf90121ce88591b3d265b4bcd26b20602bb744ac15b267ac5d9c4b6799` |

Про `selena-report-library`: оригинал лежал в `src/server/selena-report-library.ts`
(видно по импорту в восстановленном `web-src/src/server/selena-horeca.ts`, строка 20).
Это серверный модуль, поэтому в клиентские source map он не попал и `sourcesContent`
для него нет. Собранный чанк не минифицирован и читается, но это не исходник.

Дополнительно у каждого модуля сохранены собранные серверные чанки в
`web/server/_ssr/` — их SHA-256 сверены с контейнером, все совпали.

### Десять миграций

Девять из десяти найдены файлами в `local-worker`. Все SHA-256 сверены с контейнером.
Путь: `worker-src/packages/lib/src/db/migrations/`.

| Хэш из ТЗ | Файл | Статус |
|---|---|---|
| `21ebc5b9…` | `0067_local_maps_pilot_runtime.sql` | найдена |
| `da5c58f6…` | `0068_local_maps_runtime_guards.sql` | найдена |
| `c48499cf…` | `0069_local_report_acceptance.sql` | найдена |
| `ecbf60ee…` | `0070_local_pilot_reschedule.sql` | найдена |
| `87329271…` | `0071_local_observation_guard_privileges.sql` | найдена |
| `c3b5ea83…` | `0073_local_external_audits.sql` | найдена |
| `f99aff0d…` | `0074_local_customer_test_execution.sql` | найдена |
| `43a02100…` | `0075_local_external_legacy_identity.sql` | найдена |
| `aeb4942e…` | `0076_local_order_publications.sql` | найдена |
| `8c53ec71…` | — | **НЕ НАЙДЕНА** → RECONSTRUCTED FROM SCHEMA DIFF (pending) |

Полный хэш ненайденной: `8c53ec711a96d452c362aa762f294b83e2637aea6b246e66d92a86a889f3e3c9`.

Что про неё известно точно (из журнала базы и лога деплоя
`local-ai-migrate`, deployment `69abc500-5f96-4d0f-ac26-20f0835efc6d`, SUCCESS):

- это 78-я и последняя запись журнала, `created_at = 1787940034000`;
- она применена именно тем деплоем 16.09.2026 02:14 UTC, и он применил ровно её одну
  (`journal before: 77` → `journal after: 78`, `applying 1`);
- по нумерации это `0077_*`, следующая за `0076_local_order_publications`.

Файла нет ни в `web` (там вообще 0 файлов `.sql`), ни в `local-worker` (проверены
все 83 файла `.sql`, 81 уникальный). Сервисы `local-ai-migrate` и `migrate`, где
этот файл почти наверняка лежит в образе, **остановлены** (status: exited).

**Статус: RECONSTRUCTED FROM SCHEMA DIFF (pending). Оригинал не извлечён.**

Решение владельца от 2026-09-25: `local-ai-migrate` не перезапускать, в Railway
ничего не менять. Поэтому оригинальный файл `0077` не извлекается. Его содержание
предстоит восстановить в облачной сессии — diff `staging-schema.sql` против
результата миграций `0000`–`0076`. Результат такого diff-а будет реконструкцией,
а не оригиналом: он может воспроизводить итоговое состояние схемы, но не порядок
операций, не комментарии и не те шаги, что не оставили следа в схеме
(например `UPDATE` данных или `GRANT`, уже перекрытый более поздней миграцией).
Помечать восстановленный файл в Git как точную копию нельзя.

### Два расхождения, которых не было в ТЗ

Сверка журнала базы (78 записей) с файлами на диске (81 файл) дала не одно
расхождение по 0060, а три.

| Позиция в журнале | Хэш в базе | Файл на диске сейчас | Комментарий |
|---|---|---|---|
| 46 | `3b3915803095bf23f8e8b2e70134bfd71a7774d2793bf40f2e0a0bd03b1c051b` | `0045_visibility_os_domain_and_lock_hardening.sql` = `321e6633…` | файл 0045 переписан после применения |
| 61 | `5b5f21235bf75ee1f39f7946fca5a7fd537a9d768396d114e7a6d2f0e570adf1` | `0060_journal_hold_owner_reconciliation.sql` = `b3f720b1…` | известно из ТЗ |
| 78 | `8c53ec711a96d452…` | файла нет | см. выше |

Про 0045 в ТЗ не было. Это такая же проблема, как с 0060: в базе лежит хэш старой
версии файла, а на диске уже новая. Версия базы = версия Git (`b3f720b1` для 0060),
то есть staging применил старые редакции, а потом файлы отредактировали.

Файлы, которые есть на диске, но в базу не применялись (это нормально, не проблема):
`compat/0051_release_short_to_feature_superset.sql`,
`_pending-os/M4_action_evidence_loop_down.sql`,
`_pending-os/M5_visibility_map_down.sql`,
`_pending-os/M6_outcome_layer_down.sql`.

## Какая база рабочая

**Сервис `Postgres`**, id `280e3b59-77c3-46e0-8c2c-75955b7f9a40`.

Доказательство: `DATABASE_URL` у `web` и у `local-worker` указывает на хост
`postgres.railway.internal` (пароль замаскирован при выводе), а у сервиса `Postgres`
переменная `RAILWAY_PRIVATE_DOMAIN` равна ровно `postgres.railway.internal`.
Внутри: PostgreSQL 18.6, база `railway`, таблица журнала `drizzle.__drizzle_migrations`.

Семь архивных баз (`Postgres-selena-v14-0043-0051-clean-20260905`,
`Postgres-selena-v13-0059-0060-isolated-20260903`,
`Postgres-selena-v13-0058-isolated-20260902`,
`Postgres-selena-v13-0056-restore-20260902`,
`Postgres-selena-v13-restore-20260901`, `Postgres-W_9y`) — не рабочие, не трогались.

## Схема базы

`staging-schema.sql` — 18 419 строк, 140 таблиц (`CREATE TABLE`).
SHA-256: `fb5c3241ec79a7f7b4907d8b3fcc99bf29dc75ce62d1e0c5637f9b258d04c595`.
Снята командой `pg_dump --schema-only --no-owner -h /var/run/postgresql -U postgres railway`
через unix-сокет внутри контейнера `Postgres`. Данных в файле нет.

`migrations-journal.txt` — 78 записей `id, hash, created_at, applied_at`.

## Проверка на секреты

Прогнано два раза. Второй прогон — по расширенному набору шаблонов, по всей папке,
1689 файлов: `sk-`, `sk_live_`, `postgres://user:pass@`, `mysql://`, `redis://`,
`mongodb://`, `-----BEGIN … PRIVATE KEY-----`, `ghp_`, `gho_`, `github_pat_`,
`AKIA`, `xox[baprs]-`, JWT (`eyJ….….…`), `password=`, `api_key=`, `secret=`, `token=`.

Совпадений 17. **Реальных секретов нет, все 17 ложные.**

| Файл | Строки | Что это на самом деле |
|---|---|---|
| `web/server/_ssr/server-CDtmD6L-.mjs` | 68477, 68505, 68556, 68573, 68610, 68678, 68741, 68790, 68881 | константы-заголовки PEM внутри упакованной crypto-библиотеки, не ключи |
| `web/server/_ssr/providers-kvP4SquB.mjs` | 8713, 14305, 14740 | имена переменных и полей в коде (`secret:` перед ссылкой на переменную), не значения |
| `web/server/_ssr/esm-DEkPjT0I.mjs` | 26598 | пример в JSDoc-комментарии библиотеки с заглушкой вместо ключа |
| `worker-src/packages/lib/scripts/generate-auth-schema.sh` | 49 | заглушка для локального запуска на `127.0.0.1` |
| `local-worker/…/@workspace/lib/scripts/generate-auth-schema.sh` | 49 | та же строка, копия того же файла |
| `REPORT.md` | 139, 141 | перечень самих шаблонов поиска в этом разделе |

`DATABASE_URL` в папке не сохранён ни в одном файле. При каждом выводе в чат пароль
маскировался через `sed -E 's#//[^@]*@#//***@#'`. Папку можно передавать целиком.

## Состав папки `~/selena-m0-recovery/`

| Путь | Что это | Объём |
|---|---|---|
| `worker-src/` | **главное**: исходный TypeScript пакетов `@workspace/*` (lib, ui, config, cloud, whitelabel, local, deployment, selena-visibility-contracts) + код воркера + все 81 файл миграций | 4.3 МБ, 431 файл |
| `web-src/` | 322 файла оригинального исходника web, извлечённых из `sourcesContent` клиентских source map | 3.3 МБ |
| `web/` | собранные артефакты из `/app/.output`: 303 серверных чанка `.mjs` и 180 клиентских `.map` | 39 МБ, 491 файл |
| `local-worker/` | сырая распаковка того, что забрали из контейнера воркера (источник `worker-src/`) | 4.3 МБ |
| `staging-schema.sql` | схема рабочей базы | 696 КБ |
| `migrations-journal.txt` | журнал применённых миграций из базы | 12 КБ |
| `migrate-deploy-log.md` | лог деплоя миграции с sourceTree и `applying 1` | — |
| `db-hashes.txt`, `file-hashes.txt` | списки хэшей для сверки | — |
| `remote-*.sha`, `local-*.sha` | результаты сверки контейнер ↔ локально | — |

Целостность: SHA-256 посчитан в контейнере и локально для всех перенесённых файлов.
180 клиентских `.map` — совпало 180 из 180. 303 серверных чанка — 303 из 303.
81 файл миграций — 81 из 81. 9 файлов модулей — 9 из 9.

## Предварительная классификация отличий от Git

Классификация предварительная. Diff с Git в этой сессии не делался — Git-репозиторий
не открывался, поэтому строгого сравнения нет. Всё, что не подтверждено фактом
из контейнера или базы, помечено UNKNOWN.

| Отличие | Класс | Почему |
|---|---|---|
| Миграции 0067–0071, 0073–0076 (9 файлов) | PORT TO MAIN | файлы найдены целиком, применены к staging, в Git отсутствуют. Переносить как есть. |
| Миграция `8c53ec71…` (`0077_*`) | RECONSTRUCTED FROM SCHEMA DIFF (pending) | применена к базе, файла нет, оригинал не извлечён по решению владельца. Содержание выводится diff-ом схемы против результата 0000–0076. Это реконструкция, не оригинал. Работа не сделана, помечена как pending. |
| Файл `0060` на диске (`b3f720b1`) vs хэш в базе (`5b5f2123`) | UNKNOWN | на диске та же версия, что в Git. Что менялось между `5b5f2123` и `b3f720b1` — без diff-а неизвестно. Возможно, staging-база нуждается в правке журнала, а не файл. |
| Файл `0045` на диске (`321e6633`) vs хэш в базе (`3b391580`) | UNKNOWN | то же самое, в ТЗ этого пункта не было. Нужен отдельный разбор. |
| `worker-src/packages/lib/src/selena-local-*.ts` (4 модуля) | PORT TO MAIN | полный исходник, восстановлен дословно. |
| `web-src/src/server/selena-workspaces.ts` | PORT TO MAIN | полный исходник из `sourcesContent`. |
| `src/server/selena-report-library.ts` | UNKNOWN | исходника нет, только собранный чанк. Переносить нельзя, надо либо переписывать по чанку, либо искать исходник. |
| Остальные 321 файл в `web-src/` | UNKNOWN | не сверялись с Git. Часть наверняка совпадает с `03fb41a`, часть — нет. Это работа следующего шага. |
| Файлы `compat/0051`, `_pending-os/M4–M6` | KEEP | есть на диске, к базе не применялись. Ничего делать не надо. |
| Семь архивных баз Postgres | OBSOLETE | по именам это срезы отладки 0043–0060 от 01–05.09.2026. Рабочая база — `Postgres`. Удалять — решение владельца, я их не трогал. |

## Что не сделано и почему

1. **Миграция `8c53ec71…` (`0077_*`) — RECONSTRUCTED FROM SCHEMA DIFF (pending),
   оригинал не извлечён.** Файл почти наверняка в образе остановленного сервиса
   `local-ai-migrate`. Владелец 2026-09-25 решил его не перезапускать и вообще
   ничего в Railway не менять. Дальнейший путь — реконструкция по diff-у схемы
   в облачной сессии. Пока не сделано.
2. **Diff с Git не делался.** По ТЗ это следующий шаг, в облачной сессии.
3. **Отступление от ТЗ, о котором надо знать.** ТЗ предписывало копировать только
   файлы шести модулей. Я скопировал шире: все 180 клиентских `.map`, все 303
   серверных чанка и все пакеты `@workspace/*`. Причина: исходники модулей из списка
   лежат внутри общих бандлов, а не в файлах со своими именами, — по одним только
   названным файлам восстановить исходник было нельзя. Побочный результат: вместо
   6 модулей восстановлено 322 файла исходника плюс весь пакет `lib`.
