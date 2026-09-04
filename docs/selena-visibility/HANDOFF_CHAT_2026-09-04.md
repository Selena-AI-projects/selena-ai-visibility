# Selena AI Visibility — handoff по этому чату

**Дата handoff:** 2026-09-04
**Основной репозиторий:** `parkourcafe/selena-ai-visibility`
**Рабочая ветка:** `fix/migration-journal-mismatch`
**Последний отправленный commit:** `7676728f` — `feat: add guarded durable YouTube projection`
**Состояние:** source implementation завершена; live activation остаётся отдельным operational gate.

## 1. Итог в одном абзаце

За время этого чата мы прошли путь от конфигурации Bright Data datasets и
проблемы staging migrations до подтверждённого bounded YouTube canary,
privacy/retention decision и source-реализации tenant-scoped durable projection
с fail-closed customer API guard. Все автоматические запуски остальных источников,
scoring, UI, тарифы и публичный состав продукта оставлены без изменений.

Ключевая граница на момент handoff: код для durable YouTube projection готов и
запушен, но migration `0056` не применялась к live staging, capability row не
утверждалась для customer exposure, feature flag остаётся выключенным, новых
provider calls и расписаний не запускалось.

## 2. Что было сделано и подтверждено

### Bright Data: исходная постановка

- Зафиксировано, что восемь Social datasets — это пока конфигурация, а не
  готовая продуктовая интеграция.
- Согласован общий `BrightDataClient` и dataset registry; transport не должен
  дублироваться восемь раз, а dataset configuration и response normalizers
  должны оставаться раздельными.
- Зафиксировано требование отдельного schema-discovery smoke test для каждого
  dataset: input contract, response schema, stable IDs, pagination, latency,
  polling lifecycle, cost, errors, incremental collection и PII.
- Зафиксировано правило: до approval нельзя менять scoring, UI, тарифы,
  публичные обещания или включать автоматический запуск всех источников.

### PR #97 и migration recovery

- E2E failure PR #97 был диагностирован как проблема migration runner, а не
  Bright Data-логики.
- В migration-пути были последовательно сделаны исправления для явного вывода
  ошибок и SQL-контекста; отдельный programmatic runner заменил безмолвный
  `drizzle-kit` путь.
- В staging наблюдался конкретный failure на migration `0045`; прежний видимый
  journal оставался на `43`, потому что транзакционная цепочка откатывала
  промежуточные изменения при ошибке.
- Была зафиксирована проблема legacy drift: девять duplicate lock groups в
  восстановленной копии. Принято forward-only правило: не пропускать migration,
  не переписывать journal и не добавлять constraint вручную.
- `0054` был проверен на disposable-сценариях reconciliation/replay; live
  recovery зависших permits и claim не выполнялся автоматически.
- Для pg-boss runtime role добавлен отдельный provisioning contract; isolated
  smoke подтвердил queue-maintenance ACL без запуска provider calls.

### YouTube canary и capability evidence

- Утверждён dataset `gd_lk56epmy2i5g7lzu0k` и synchronous contract:
  `POST /datasets/v3/scrape` с одним публичным video URL.
- Ограничения canary соблюдены: одна попытка, одна страница, максимум одна
  результирующая запись, без comments, related videos, transcript или channel
  crawling, cap `$0.50`.
- Bounded YouTube canary получил `PASS` как технический canary: один record,
  transport/input/response/IDs/cardinality/latency подтверждены, фактическая
  стоимость в отчёте указана как `$0.00`.
- Стабильные идентификаторы: `video_id`, `shortcode`; channel identity может
  быть представлен `youtuber_id`.
- Остальные Social/Google datasets в этой последовательности не запускались;
  результат одного YouTube dataset не считается доказательством для остальных.
- Instagram Comments оставлен `NO-GO`, пока нет provider-enforced output cap и
  отдельной high-volume user-data policy.

### Privacy, retention и cleanup

- Принята политика YouTube:
  - raw payload и signed URLs не хранить;
  - comments и transcript не хранить;
  - fixture хранить не более 24 часов;
  - IDs, metrics и hashes хранить не более 90 дней;
  - title и description пока не хранить.
- Allowlist projection удаляет неизвестные поля, URL, title/description,
  transcript, comments и media assets; оставляет только допустимые IDs и
  числовые metrics.
- Cleanup job сделан opt-in: он работает только при явном retention flag и
  безопасно ограниченном artifact root; durable metrics этим job не удаляются.
- Privacy decision и canary report обновлены так, чтобы различать
  `PASS_SOURCE_ONLY` (кодовая граница) и `HOLD_FOR_PILOT` (операционная активация).

### Durable tenant-scoped persistence и API guard

Реализовано в текущей ветке и отправлено в origin:

- Добавлена таблица `sv_youtube_video_metrics` в schema и migration `0056`.
- Таблица содержит только tenant/project-scoped IDs, numeric metrics,
  `captured_at`, `expires_at`, content hash и schema version.
- В таблице намеренно нет колонок для raw payload, URL, title, description,
  transcript, comments или media.
- Добавлены forced RLS, composite FK `(project_id, organization_id)`,
  uniqueness для snapshot/video и индексы для tenant/project/expiry.
- UPDATE запрещён trigger-ом; новые metrics идут как новые snapshots. DELETE
  остаётся только для bounded expiry cleanup.
- `createYouTubeDurableProjectionStore` устанавливает transaction-local tenant
  context, проверяет принадлежность project tenant-у, пишет только безопасную
  projection и возвращает только customer-safe fields.
- Добавлен API route
  `/api/v1/selena/projects/:projectId/youtube/videos`:
  - feature flag off → `404`;
  - отсутствует `client:read` → `403`;
  - capability не `PILOT_ONLY`/`ALLOWED` → `403`;
  - чужой project → `404`;
  - response содержит только IDs/metrics/timestamp.
- API guard fail-closed даже при включённом флаге, если capability approval не
  найден.

## 3. Проверки текущего source implementation

- `@workspace/lib` typecheck — PASS.
- `apps/web` typecheck — PASS.
- Targeted lib tests — `47/47 PASS`.
- Web unit tests — `412 passed`, `4 skipped`.
- Migration runner tests — `11/11 PASS`.
- Changed-surface Biome check — PASS.
- Web production build — PASS.
- `git diff --check` и secret scan staged diff — PASS.
- Repository lint завершён с exit code `0`, но в проекте остаются существующие
  warnings; это не warning-free lint claim.
- Проверки выполнялись на Node `22.23.0`; проект декларирует Node `24.x`, поэтому
  повторная Node 24 validation остаётся полезной перед environment-sensitive
  deployment.

## 4. Что намеренно не сделано

- Migration `0056` не применялась к live staging или production.
- Не включался `SELENA_YOUTUBE_CUSTOMER_API_ENABLED`.
- Не seed-илась и не утверждалась capability row для customer exposure.
- Не запускались новые provider calls, workers, recurring jobs или автоматический
  fan-out по всем datasets.
- Не менялись scoring, UI, тарифы, public product composition или Content OS
  Slice 1.
- Не принято решение о включении Social datasets в Social Intelligence,
  Reputation или Content Visibility.
- Не выполнялось recovery четырёх consumed permits без отдельного решения по
  reconciliation.

## 5. Отдельные работы вне текущего source implementation

Эти действия обсуждались или выполнялись в соседних контурах, но не являются
доказательством live acceptance этого репозитория:

- Рассматривался remote contour через Hetzner VPS и временный Railway Sandbox,
  чтобы не зависеть от свободного места на Mac. Подтверждённого полного переноса
  сервисов на VPS в этом handoff нет.
- Ollama/LiteLLM были остановлены, автозапуск отключён, модели удалены по
  отдельному запросу; конфигурацию требовалось сохранить. Это не часть
  Bright Data deployment.
- Были выполнены ограниченные Docker cleanup actions: build cache,
  dangling/unused images и stopped containers; volumes намеренно не трогались,
  потому что среди них могли быть базы данных.
- Обсуждался Boober backup и private GitHub/LFS repository. В этом репозитории
  нет достаточного first-party evidence, чтобы утверждать, что backup успешно
  загружен, hash проверен и локальная копия удалена.
- Content OS Slice 0 был оформлен в отдельной ветке/репозитории commit-ом
  `e63da891`; этот поток не смешивался с Bright Data discovery.
- Создавался navigation map экосистемы Selena и разделялись роли Selena OS,
  Aether Studio, Aether Runtime, AI Visibility и Content Control Room. Это
  архитектурный контекст, а не разрешение на product activation.
- В отдельном operational потоке 2026-09-04 наблюдался запущенный 30-run
  measurement (на checkpoint было 6 complete и 24 in progress). Финальные
  ответы, spend и результат для KORA в этом handoff не считаются подтверждёнными.
- Central Memory и remote backup обсуждались как отдельный контур; сервисы,
  токены и логи в рамках согласованного backup handoff не переносились.

## 6. Текущий статус по слоям

| Слой | Статус | Что это означает |
|---|---|---|
| Bright Data YouTube technical canary | `PASS` | Один bounded canary подтверждён |
| Остальные datasets | `NOT RUN` | Нужны отдельные schema-discovery smoke tests |
| Privacy projection | `PASS_SOURCE_ONLY` | Кодовая allowlist boundary есть |
| Durable persistence | `IMPLEMENTED_NOT_APPLIED` | `0056` подготовлена, live DB не изменена |
| Customer API | `FAIL_CLOSED` | По умолчанию 404; capability и flag gate обязательны |
| Staging operational activation | `HOLD` | Нужны approved maintenance window и runtime proof |
| Product activation/scoring/UI/tariffs | `UNCHANGED` | В этом чате не менялись |
| Content OS Slice 1 | `NOT STARTED` | Намеренно не смешивался с Bright Data |

## 7. Следующий порядок действий

1. На согласованной isolated/staging копии применить canonical migration runner
   через `0056`, проверить journal, RLS, tenant isolation, trigger и expiry.
2. Только после чистого результата отдельно решить, применять ли `0056` к live
   staging в maintenance window.
3. Через owner-controlled provisioning path seed-ить capability row для YouTube,
   если pilot approval действительно выдан.
4. Выполнить API smoke с feature flag **выключенным**, затем (только после
   отдельного approval) включить флаг на staging и проверить 404/403/tenant
   isolation/safe response.
5. После этого принять отдельное product decision по YouTube pilot. Остальные
   datasets запускать только после их собственных capability records и
   capability matrix.

## 8. Канонические файлы для продолжения

- [Canary и migration report](ISOLATED_DB_MIGRATION_REPORT_2026-09-02.md)
- [YouTube privacy/retention decision](BRIGHTDATA_YOUTUBE_PRIVACY_RETENTION_DECISION_V1.md)
- [Bright Data discovery architecture](BRIGHTDATA_DISCOVERY_ARCHITECTURE_V1.md)
- [Durable projection implementation](../../packages/lib/src/brightdata-social/youtube-durable-persistence.ts)
- [Customer API route](../../apps/web/src/routes/api/v1/selena/projects/$projectId/youtube/videos.ts)
- [Migration 0056](../../packages/lib/src/db/migrations/0056_youtube_durable_projection.sql)
- [Schema contract tests](../../packages/lib/src/db/schema-visibility-os.test.ts)

Этот файл является handoff-сводкой, а не разрешением на live migration, provider
spend, deployment или включение customer-facing продукта.
