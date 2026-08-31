# Selena Systems — September 2026 Master Execution TZ v1.0

> **Провенанс.** Машинная конвертация из `SELENA_SYSTEMS_SEPTEMBER_2026_MASTER_EXECUTION_TZ_V1.0.docx`
> (31 августа 2026, 16:03 WITA), переданного владельцем. Оригинальный `.docx` лежит рядом и остаётся
> подписанным источником. Текст не редактировался, только перенесён в markdown.
>
> **Статус в самом документе:** `DRAFT FOR OWNER APPROVAL`. Проверка — `SELENA_SEPTEMBER_2026_MASTER_TZ_CLAUDE_REVIEW.md` в корне.
>
> Этот документ — родительский по отношению к Website Architecture & Content v1.0 (16:16 того же дня):
> сайт является его артефактом D-08 (WP-08), и публикация сайта остаётся NO-GO до Gate G7.

---

SELENA SYSTEMS / MASTER EXECUTION SPECIFICATION
SEPTEMBER 2026
HoReCa Local-First Validation, Provider Capability Discovery,AVLI/KORA Pilots and Gated Public Repositioning
Мастер-ТЗ на исполнение • Версия 1.0

| Поле | Значение |
|---|---|
| Владелец продукта | Selena Systems |
| Дата и время | 31 августа 2026, 16:03 WITA (Бали) |
| Период исполнения | 1–30 сентября 2026 |
| Статус | DRAFT FOR OWNER APPROVAL |
| Аудированный кодовый snapshot | origin/release/selena-visibility-mvp@0d1f21ed57577d915ef3d41a6533cb88fd3a1f1e |
| Нормативная база | Product Decision v1.0 + Architecture v1.2 + Implementation Delta v1.2.1 + Technical Delta v1.3 |

> РЕШЕНИЕ НА ПЕРИОД ЭТОГО ТЗ · GO: governance, current-state reconciliation, capability harness, fixtures, owner-approved isolated canaries, HoReCa Intent Ontology и подготовка пилотов.  HOLD: runtime expansion и limited UI до source gates.  NO-GO: публичное перепозиционирование сайта, изменение тарифов и новые коммерческие обещания до pilot acceptance и owner approval.

Конфиденциальный рабочий документ Selena Systems

## Содержание и правила чтения

| 1. Назначение документа · 2. Иерархия нормативных документов · 3. Цель сентября и критерий успеха · 4. Фиксированные продуктовые решения · 5. Разрешение на выполнение · 6. Scope и non-goals · 7. Current-State Reconciliation · 8. Work Packages · 9. Целевой календарь сентября · 10. Роли и ответственность · 11. Gate-модель | 12. Общие критерии приёмки · 13. Формат задач для Codex · 14. Обязательные артефакты · 15. Реестр ключевых рисков · 16. Решения владельца · 17. Финальный verdict · Приложение A. Traceability · Приложение B. Capability Matrix · Приложение C. Page Specification · Приложение D. PR Acceptance Report · Приложение E. Hermes backlog · Нормативные источники |
|---|---|

### Маркировка происхождения требований

| Метка | Значение |
|---|---|
| ИЗВЛЕЧЕНО | Положение прямо присутствует в одном или нескольких исходных документах. |
| ИНТЕРПРЕТИРОВАНО | Исполнимое решение, порядок или формат, выведенный из нескольких исходных требований. |
| НОРМАТИВНО | Обязательное правило исполнения этого ТЗ; не может быть изменено PR или задачей Codex. |
| OWNER DECISION | Требуется явное решение владельца; до него зависимая работа остаётся HOLD. |
| GO / HOLD / NO-GO | Разрешение на выполнение сейчас / ожидание gate / прямой запрет. |

[НОРМАТИВНО] Если положение источников не поддерживает конкретный факт, метрику, срок или обещание, документ сохраняет UNKNOWN либо запрашивает owner decision. Заполнять пробел правдоподобной догадкой запрещено.  [S1 §2.3, §6; S2 §6, §10; S3 §17.4]

## 1. Назначение документа

[ИНТЕРПРЕТИРОВАНО] Это первое исполнимое мастер-ТЗ сентября. Оно переводит утверждённые архитектурные документы и сентябрьский план в последовательность work packages, gates, deliverables, acceptance criteria и evidence requirements. Оно не заменяет архитектуру и не разрешает функции, которые источники оставляют в HOLD или NO-GO.  [S1–S4]
[НОРМАТИВНО] Документ обязателен для Selena/Owner, Codex, Claude Code, QA, аналитика, контента и дизайна. GitHub Issue, PR, комментарий или устное решение не могут молча изменить его границы; изменение оформляется новой версией ТЗ и owner approval.

### 1.1. Что должен дать этот документ

[ИНТЕРПРЕТИРОВАНО] Одну иерархию источников и одно определение продукта на период исполнения.
[ИНТЕРПРЕТИРОВАНО] Явное разделение разрешённых, отложенных и запрещённых работ.
[ИНТЕРПРЕТИРОВАНО] Проверяемый список выходных артефактов с владельцами и evidence.
[ИНТЕРПРЕТИРОВАНО] Малые независимые задачи для Codex вместо одного big-bang PR.
[ИНТЕРПРЕТИРОВАНО] Единые acceptance gates для provider calls, данных, пилотов, сайта и коммерческого релиза.
[ИНТЕРПРЕТИРОВАНО] Финальное owner-решение GO / PILOT ONLY / MANUAL ONLY / BLOCKED по новым источникам и GO / NO-GO по публичному позиционированию.

## 2. Иерархия нормативных документов

[ИНТЕРПРЕТИРОВАНО] Документы управляют разными уровнями решения. При чтении нельзя брать удобную фразу из старой версии и отменять более новое ограничение.  [S1–S5]

| Код | Документ | Что регулирует | Роль |
|---|---|---|---|
| S1 | SELENA_SYSTEMS_PRODUCT_DECISION_HORECA_LOCAL_FIRST_V1.0_2026-08-31.docx | Продуктовая граница, HoReCa Local-first, клиентский опыт, entitlements и pilot gates. | Высший продуктовый источник. |
| S2 | SELENA_AI_VISIBILITY_SAAS_TECHNICAL_DELTA_V1.3_2026-08-31.docx | Provider registry, 13 новых datasets, discovery, Google/Social/Travel gates. | Нормативное дополнение; discovery-only GO. |
| S3 | SELENA_AI_VISIBILITY_SAAS_ARCHITECTURE_TZ_V1.2_2026-08-29.docx | Единый evidence-first SaaS, независимые surfaces, data model, UX, reporting. | Основная архитектура. |
| S4 | SELENA_AI_VISIBILITY_SAAS_IMPLEMENTATION_DELTA_V1.2.1_2026-08-30.docx | LOCAL_MAPS, LOCAL_AI, grid, retries, attempts, cost caps и Local gates. | Нормативное дополнение к S3. |
| S5 | SELENA_AI_VISIBILITY_SAAS_ARCHITECTURE_TZ_V1 / v1.1 | Историческая база value-before-access и Public Audit. | Только background; не отменяет S1–S4. |

> ПРАВИЛО PRECEDENCE · Product Decision задаёт коммерческую границу и HoReCa-клиентский опыт; Architecture v1.2 задаёт платформу; Implementation Delta v1.2.1 задаёт Local execution; Technical Delta v1.3 задаёт новые providers. Это Master ТЗ задаёт только порядок исполнения и доказательства.

## 3. Цель сентября и критерий успеха

[ИНТЕРПРЕТИРОВАНО] Главная цель сентября: проверить HoReCa Local-first product model на доказательных данных, определить реальные возможности и себестоимость новых источников, собрать HoReCa Intent Ontology, провести AVLI/KORA pilots и подготовить публичное позиционирование к отдельному gated-релизу.  [S1 §1, §6–9; S2 §12–16]

### 3.1. Измеримый результат месяца

| ID | Deliverable | Критерий результата | WP |
|---|---|---|---|
| R1 | Current-State Reconciliation | Фактический статус сайта, кода, staging и data paths: VERIFIED / PARTIAL / CONFIGURED_ONLY / NOT FOUND / UNKNOWN / CONFLICT. | WP-01 |
| R2 | Provider Capability Matrix | 13 новых datasets: fixture, schema, stable identity, pagination, cost, latency, privacy, retention и status. | WP-02 |
| R3 | Execution Safety PASS | sv_measurement_attempts, max 3 attempts, generic retries off, Local domain alignment, migration/RLS/grid tests. | WP-03 |
| R4 | Provider Registry Contracts | Registry, validators, evidence writer и fixture tests; Google paths только после source gates. | WP-04 |
| R5 | HoReCa Intent Ontology v0.1 | 50–100 нормализованных intents с market/language/class/action/source mapping. | WP-05 |
| R6 | AVLI Local Decision Report | Visibility, evidence gaps, competitor reasons и 30-day actions. | WP-06 |
| R7 | KORA Pre-opening Readiness Report | Facts, UNKNOWN, missing evidence, action readiness и recheck calendar. | WP-07 |
| R8 | Website Target Specification | Route architecture, page specs, claims, copy, CTA, schema и release gates без публичного deployment. | WP-08 |
| R9 | Unit Economics + Owner GO/NO-GO | Source costs, attempts, cadence, eligibility и финальное решение по sources и public release. | WP-09 |

### 3.2. Что НЕ считается успехом

[НОРМАТИВНО] Количество опубликованных статей, если они не связаны с измерением, evidence и recheck.
[НОРМАТИВНО] Наличие Dataset ID в Railway без request path, raw fixture, storage и capability status.
[НОРМАТИВНО] Красивый dashboard на тестовых цифрах без canonical dataset и evidence references.
[НОРМАТИВНО] Новый Local, Social или Travel текст на сайте раньше capability и commercial gates.
[НОРМАТИВНО] Рост метрики, названный причинным результатом без booking, WhatsApp, calls, POS или analytics evidence.

## 4. Фиксированные продуктовые решения

### 4.1. Позиционирование

[ИЗВЛЕЧЕНО] Selena Systems остаётся платформой измерения AI-driven discovery: как цифровые системы понимают, подтверждают и рекомендуют бизнес, какие источники формируют решение и что меняется после выполненных действий. Для HoReCa главным коммерческим опытом становится Local Visibility.  [S1 §1]
[НОРМАТИВНО] Local Visibility является центром HoReCa-вертикали, но не всей Selena Systems. Платформа сохраняет независимые modules: AI Answers, Search, Maps & Local, Reviews, Social и Travel.  [S1 §1–3]

### 4.2. Продуктовая цепочка

> Visibility  →  Evidence  →  Recommendation  →  Action  →  Outcome Evidence

[ИЗВЛЕЧЕНО] Outcome Evidence публикуется по уровням Readiness, Observed Actions, Assisted Outcomes и Attributed Outcomes. Причинная атрибуция не обещается без доказуемой интеграции.  [S1 §1.2, §2.2, §4–5]

### 4.3. Независимые измерительные поверхности

| Surface | Что измеряет | Жёсткая граница |
|---|---|---|
| Public Readiness | Доступность сайта, entity clarity, schema, content и action readiness. | Не является AI recommendation measurement. |
| AI Answers | Visitor View и API View; branded и discovery отдельно. | Не смешивать consumer и API responses. |
| Google Search | SERP visibility и search context. | Google AI Mode хранится отдельно от SERP. |
| LOCAL_MAPS | Google Maps Geo-Grid: points × keywords × variants × repeats. | Places/GBP facts не являются rank evidence. |
| LOCAL_AI | Controlled dated sample с coordinate proof. | MANUAL_ONLY до Phase 4 gate. |
| REPUTATION | Profile/review facts и review evidence. | Не записывать reviews в Maps rank storage. |
| SOCIAL | Accounts, content и conversations. | Не добавлять в AI Visibility score. |
| TRAVEL | Google Travel Hotels capability. | PILOT ONLY до schema/cost/customer-fit gate. |

### 4.4. Правила интерпретации

[ИЗВЛЕЧЕНО] Никакого общего магического score для несопоставимых surfaces.  [S1 §2.3; S3 §17.3]
[ИЗВЛЕЧЕНО] Каждая доля показывается как X из Y, с датой, denominator и invalid count.  [S1 §2.3; S3 §17.4]
[ИЗВЛЕЧЕНО] UNKNOWN не равен FAIL, нулю или отраслевому benchmark.  [S1 §1.1, §2.3; S3 §17.4]
[ИЗВЛЕЧЕНО] Branded, discovery, occasion, atmosphere, needs, group-size и action intents не смешиваются.  [S1 §2.3, §4.2]
[ИЗВЛЕЧЕНО] Trend допустим только при совместимых Configuration Locks и provider versions.  [S1 §2.3; S3 §17.4]
[ИЗВЛЕЧЕНО] Recommendation без evidence IDs не публикуется.  [S1 §1.1, §6.1; S3 §16.4, §25.4]

## 5. Разрешение на выполнение

| Работа | Статус | Provider calls | Условие |
|---|---|---|---|
| Product/source decisions, non-goals, status matrix | GO | 0 provider calls | Можно выполнять сразу. |
| Current-state audit, GSC/site baseline, route/claims inventory | GO | 0 provider calls | Технические проверки и evidence capture. |
| Capability harness, fixture tooling, validators | GO | 0 provider calls | Код не включает runtime source. |
| 13 isolated schema-discovery canaries | HOLD → GO по каждому source | Только явно approved calls | Нужны owner-approved scope и cost. |
| LOCAL_MAPS Phase 0/1 + free stub | GO | 0 provider calls | По v1.2.1 до next gate. |
| Paid Maps canary 1×1×1 | HOLD | 1 task после owner approval | Только после Phase 2A PASS. |
| Automatic Local AI | NO-GO | Запрещены | LOCAL_AI_DISCOVERY_POLICY остаётся MANUAL_ONLY. |
| New Google/Social/Travel runtime integrations | HOLD | Capped only after source gates | Configuration-only не является capability. |
| Target website copy, IA, wireframes | GO | 0 provider calls | Только draft/staging/feature-flag; не публиковать. |
| Public website repositioning, pricing and new claims | NO-GO | N/A | До 3–5 cycles + unit economics + owner approval. |

> КРИТИЧЕСКАЯ ГРАНИЦА · Настроенная переменная окружения или Dataset ID означает CONFIGURED_ONLY. Клиенту нельзя показывать это как доступную функцию, пока не доказаны request, raw evidence, normalization, storage, cost, retention и quality status.

## 6. Scope и non-goals

### 6.1. In Scope

[ИНТЕРПРЕТИРОВАНО] Утверждение product/source decisions и source-of-truth hierarchy.
[ИНТЕРПРЕТИРОВАНО] Current-state reconciliation сайта, приложения, code snapshot, migrations, adapters и staging configuration.
[ИНТЕРПРЕТИРОВАНО] Capability discovery для Google AI Mode, Google SERP, Maps Place, Maps Reviews, Travel Hotels, Instagram Profiles/Posts/Reels/Comments, TikTok Profiles/Videos, Reddit Posts и YouTube Videos.
[ИНТЕРПРЕТИРОВАНО] Fixture-first provider contracts, source normalizers, evidence writer и attempt/cost/audit linkage.
[ИНТЕРПРЕТИРОВАНО] LOCAL_MAPS safety alignment, 5×5 / 3 km grid, max 3 attempts и no whole-grid retry.
[ИНТЕРПРЕТИРОВАНО] HoReCa Intent Ontology v0.1.
[ИНТЕРПРЕТИРОВАНО] AVLI operating-restaurant pilot и KORA pre-opening readiness pilot.
[ИНТЕРПРЕТИРОВАНО] Target public-site architecture, page specifications, claim matrix и drafts.
[ИНТЕРПРЕТИРОВАНО] Technical site readiness: GSC baseline, sitemap, robots, canonicals, indexability, SSR/crawler-readable HTML, schema consistency, CWV, mobile и internal links.
[ИНТЕРПРЕТИРОВАНО] Unit economics, comparable remeasurement и final owner GO/NO-GO.

### 6.2. Out of Scope до отдельного решения

[ИЗВЛЕЧЕНО] Публичное изменение позиционирования или тарифов.  [S1 §8; S2 §1, §7–10; S3 §4.3, §21.3]
[ИЗВЛЕЧЕНО] Автоматический запуск всех datasets и recurring production scans.  [S1 §8; S2 §1, §7–10; S3 §4.3, §21.3]
[ИЗВЛЕЧЕНО] Полноценный Social Monitoring, Travel production module или causal Outcome Attribution.  [S1 §8; S2 §1, §7–10; S3 §4.3, §21.3]
[ИЗВЛЕЧЕНО] Одна универсальная results table или composite score.  [S1 §8; S2 §1, §7–10; S3 §4.3, §21.3]
[ИЗВЛЕЧЕНО] Автоматическое изменение сайта, карточки, отзывов или социальных профилей клиента.  [S1 §8; S2 §1, §7–10; S3 §4.3, §21.3]
[ИЗВЛЕЧЕНО] Unlimited locations, grids, prompts, records или continuous monitoring.  [S1 §8; S2 §1, §7–10; S3 §4.3, §21.3]
[ИЗВЛЕЧЕНО] Нативные iOS/Android-приложения.  [S1 §8; S2 §1, §7–10; S3 §4.3, §21.3]

## 7. Current-State Reconciliation

[ИЗВЛЕЧЕНО] Аудит Technical Delta v1.3 выполнялся на snapshot 0d1f21e. Perplexity имеет working AI path. Пять Google и восемь social dataset variables сообщены как присутствующие в staging, но код не читает их и request path не доказан. Это CONFIGURED_ONLY, а не capability.  [S2 §2]

| Контур | Наблюдение | Статус | Обязательное действие |
|---|---|---|---|
| Existing AI path | ChatGPT / Gemini / Perplexity adapter family | PARTIAL / Perplexity working path | Проверить фактический current HEAD и production/staging path. |
| Google AI Mode | Dataset env присутствует по сообщению owner | CONFIGURED_ONLY | Schema-discovery canary; не включать UI. |
| Google SERP | Dataset env присутствует | CONFIGURED_ONLY | Отдельный SEARCH flow. |
| Maps Place | Dataset env присутствует | CONFIGURED_ONLY | Entity/facts only; не rank. |
| Maps Reviews | Dataset env присутствует | CONFIGURED_ONLY | REPUTATION schema decision. |
| Travel Hotels | Dataset env присутствует | CONFIGURED_ONLY | TRAVEL gate. |
| 8 social datasets | Dataset env присутствуют | CONFIGURED_ONLY | Privacy/retention/cost gates. |
| Retry behavior | Current adapter допускает до 4 attempts | CONFLICT | Привести к max 3 attempts total. |
| Raw evidence path | Normalized response/raw reference есть; полный provider raw→sv_source_snapshots не доказан | NOT VERIFIED | Fixture and evidence writer acceptance. |

### 7.1. Обязательный формат reconciliation

| Объект | Документ утверждает | Код | Staging | Production | Статус | Разрыв / evidence |
|---|---|---|---|---|---|---|
| Пример: Google AI Mode | Candidate AI surface | Dataset registry отсутствует | Env сообщён owner | UNKNOWN | CONFIGURED_ONLY | Нужен isolated canary + fixture + storage path |

[НОРМАТИВНО] Для каждого объекта evidence должен включать команду/путь/скриншот/экспорт/commit SHA и captured_at. Формулировка «вероятно реализовано» запрещена.

## 8. Work Packages

[ИНТЕРПРЕТИРОВАНО] Work packages организованы по зависимостям. Календарная дата не отменяет gate: работа, не прошедшая prerequisite, остаётся HOLD даже 30 сентября.

| ID | Название | Результат | Зависимость |
|---|---|---|---|
| WP-00 | Governance & Source of Truth | Owner approvals, non-goals, baseline SHA, flags OFF | Нет |
| WP-01 | Current-State & Website Baseline | Reconciliation, GSC, routes, claims, technical readiness | WP-00 |
| WP-02 | Capability Harness & 13-Source Matrix | Isolated canaries, fixtures, schema/cost/privacy matrix | WP-00 |
| WP-03 | Measurement Safety Reconciliation | Attempts, retries, Local domains, migrations, grid stub | WP-00 / code baseline |
| WP-04 | Provider Registry & Core Google Contracts | Registry, validators, evidence writer, Google pilots | WP-02 + WP-03 |
| WP-05 | HoReCa Intent Ontology v0.1 | 50–100 normalized intents | WP-00; parallel |
| WP-06 | AVLI Pilot | Operating restaurant decision report | WP-04 gate + WP-05 |
| WP-07 | KORA Pilot | Pre-opening readiness report | WP-01 + WP-05; provider subset after WP-04 |
| WP-08 | Target Website & Offer Specification | IA, page specs, claims, content and release gates | WP-01 + product decisions |
| WP-09 | Evidence Loop, Unit Economics & Owner Gate | Remeasurement, costs, GO/NO-GO | WP-02–WP-08 |

### WP-00. Governance & Source of Truth

[НОРМАТИВНО] До capability discovery должны быть утверждены Product Decision, Technical Delta discovery boundary, non-goals и flags OFF.  [S1 §9; S2 §13 Phase 0]

#### Задачи

Записать фактический repository, branch и baseline SHA на момент старта.
Утвердить S1–S4 как нормативную базу и отметить S5 как background.
Утвердить owner-approved global и per-source canary cost caps.
Утвердить, что public website/pricing остаются без изменений до Gate G7.
Зафиксировать feature flags OFF и доказать, что deploy/migration создают 0 cycles, 0 permits и 0 calls.
Назначить владельцев work packages и канал хранения acceptance evidence.

#### Acceptance

[НОРМАТИВНО] Owner Decision Record подписан или имеет явное электронное approval evidence.
[НОРМАТИВНО] Baseline SHA и environment inventory сохранены.
[НОРМАТИВНО] Canary budget, stop conditions и permitted sources перечислены.
[НОРМАТИВНО] Нет незадокументированных публичных обещаний или runtime enablement.

### WP-01. Current-State & Website Baseline

[ИНТЕРПРЕТИРОВАНО] Этот пакет объединяет полезную часть Hermes backlog: baseline, routes, technical readiness, claims inventory и indexability. Он не публикует новую стратегию.

#### Задачи

Составить inventory маршрутов: /, /visibility, /check, /pricing, app entry points, Lab, automation, methodology, evidence, contact и все фактические redirects.
Для каждого route присвоить KEEP / REWRITE / MERGE / REMOVE / MISSING и CURRENT / TARGET / HOLD.
Снять GSC baseline: queries, pages, impressions, clicks, average position, indexing issues и доступные AI features без подмены недоступных данных.
Проверить sitemap, robots.txt, canonicals, indexability, crawler-readable HTML, SSR, broken links, duplicate routes, schema/text consistency, Lighthouse/CWV и mobile.
Зафиксировать текущие pricing/claims/FAQ/CTA и отметить каждое обещание как SUPPORTED / PARTIAL / UNSUPPORTED / UNKNOWN.
Проверить Cloudflare AI Crawl Control только если домен действительно использует соответствующую конфигурацию.
Оставить llms.txt как zero-weight diagnostic, не как P0 growth lever.

#### Acceptance

[НОРМАТИВНО] 100% публичных routes и claims включены в matrix.
[НОРМАТИВНО] GSC baseline имеет export date и source file.
[НОРМАТИВНО] Каждая technical issue имеет evidence, severity, owner и verification step.
[НОРМАТИВНО] Технические maintenance fixes не меняют positioning/price и оформлены отдельными PR.
[НОРМАТИВНО] Все недоступные данные отмечены UNKNOWN.

### WP-02. Capability Harness & 13-Source Matrix

[ИЗВЛЕЧЕНО] Ближайший технический приоритет Technical Delta v1.3 — capability matrix для 13 вновь настроенных datasets. Разрешены только contract discovery, fixtures и isolated staging canaries с owner-approved cost.  [S2 §12–16]

#### Источники discovery

| Source | Target domain | Order |
|---|---|---|
| Google AI Mode | AI Answers | P1-A |
| Google SERP | SEARCH | P1-B |
| Google Maps Place | Entity / Local | P1-C |
| Google Maps Reviews | REPUTATION | P1-D |
| Google Travel Hotels | TRAVEL | P1-H |
| Instagram Profiles | SOCIAL account | P1-E |
| Instagram Posts | SOCIAL content | P1-F |
| Instagram Reels | SOCIAL content | P1-F |
| Instagram Comments | SOCIAL conversation | P1-G |
| TikTok Profiles | SOCIAL account | P1-E |
| TikTok Videos | SOCIAL content | P1-F |
| Reddit Posts | SOCIAL conversation | P1-G |
| YouTube Videos | SOCIAL / video content | P1-F |

#### Canary output contract

[ИЗВЛЕЧЕНО] Input contract: required/optional fields, cardinality, URL/query/locale constraints.  [S2 §5.2–6]
[ИЗВЛЕЧЕНО] Raw response: full payload/reference, checksum, capture time, dataset ID and environment.  [S2 §5.2–6]
[ИЗВЛЕЧЕНО] Schema inventory: field, type, nullable, repeated, observed class; no invented fields.  [S2 §5.2–6]
[ИЗВЛЕЧЕНО] Stable identity and parent/child relationships.  [S2 §5.2–6]
[ИЗВЛЕЧЕНО] Pagination/incremental behavior and duplicate boundary.  [S2 §5.2–6]
[ИЗВЛЕЧЕНО] Actual or estimated cost and observed latency; canary latency is not SLA.  [S2 §5.2–6]
[ИЗВЛЕЧЕНО] Privacy classification, retention and deletion rule.  [S2 §5.2–6]
[ИЗВЛЕЧЕНО] Sanitized immutable fixture and versioned normalizer test.  [S2 §5.2–6]
[ИЗВЛЕЧЕНО] Capability verdict: ALLOWED / PILOT_ONLY / MANUAL_ONLY / BLOCKED.  [S2 §5.2–6]

#### Acceptance

[НОРМАТИВНО] Количество provider calls точно совпадает с owner-approved canaries.
[НОРМАТИВНО] Для каждого из 13 sources существует fixture checksum и capability row.
[НОРМАТИВНО] Secrets и raw provider credentials отсутствуют в logs, reports и exports.
[НОРМАТИВНО] Unknown fields сохраняются в raw evidence, но не выдумываются в normalized model.
[НОРМАТИВНО] Ни один source не включён в production runtime или public UI.

### WP-03. Measurement Safety Reconciliation

[ИЗВЛЕЧЕНО] Implementation Delta v1.2.1 разрешает Phase 0, database/staging gate и бесплатный Maps stub; платный canary, automatic Local AI, checkout и recurring scans остаются закрыты.  [S4 §1, §8]

#### Задачи

Проверить применённость migration inventory и rebase numeric prefixes перед новой migration.
Выполнить LOCAL → LOCAL_MAPS transactional backfill и добавить LOCAL_AI domain, если это ещё не применено.
Реализовать/проверить sv_measurement_attempts как spend permit + attempt ledger.
Ограничить attempts: initial + 2 controlled retries, максимум 3 total; generic queue retryLimit=0.
Сохранить failed attempts в cost/audit ledger; в denominator входит только один VALID или ABSENT result.
Запретить whole-grid, whole-dataset и whole-cycle retry.
Проверить grid formula sv-grid-sphere-v1: 5×5, radius 3000 m, 25 stable points, ROUND_HALF_UP 6 decimals, UUIDv5.
Доказать 125 Maps analytical slots и максимум 375 attempts для 5 keywords.
Выполнить forward/replay/rollback, RLS cross-tenant, duplicate executionKey, stop/cap/retry reconciliation tests.

#### Acceptance

[НОРМАТИВНО] Migration/deploy создают 0 tasks, 0 permits и 0 provider calls.
[НОРМАТИВНО] Golden tests PASS: Bali, equator, negative longitude, antimeridian, repeat generation.
[НОРМАТИВНО] Attempt count >3 технически невозможен.
[НОРМАТИВНО] ABSENT_WITHIN_DEPTH не повторяется и остаётся VALID с targetRank=null.
[НОРМАТИВНО] Попытка expected+1 блокируется до provider call.
[НОРМАТИВНО] RLS crossover = 0; secrets = 0; feature flags remain OFF.

### WP-04. Provider Registry & Core Google Contracts

[ИЗВЛЕЧЕНО] Новые datasets нельзя добавлять hard-coded if/else. Целевая архитектура: ProviderDatasetRegistry → common BrightDataClient → Dataset Definition → Source Normalizer → Evidence Writer → Attempt/Cost Ledger.  [S2 §2.1–3.2]

#### Задачи

Ввести domain/surface-aware ProviderDatasetRegistry с capability status и versioned input/output schemas.
Сохранить SELENA_MEASUREMENT_ADAPTER как legacy/default selector только для существующего AI execution path.
Реализовать common BrightDataClient: auth, request, snapshot/polling, timeout, cancel и provider task uniqueness.
Писать immutable raw payload/reference + SHA-256 + evidence index до завершения normalization.
После WP-02 source gate реализовывать в порядке: Google AI Mode → Google SERP → Maps Place → Maps Reviews.
Google AI Mode хранить как AI surface; Google SERP — SEARCH; Maps Place — entity snapshot; Maps Reviews — REPUTATION.
Не создавать параллельные generic tables, если текущий sv_* domain выражает семантику.

#### Acceptance

[НОРМАТИВНО] Registry, input/output validators и fixture tests PASS без новых paid calls.
[НОРМАТИВНО] Capped adapter pilot имеет raw→normalized→DB→evidence→cost→audit reconciliation.
[НОРМАТИВНО] Provider task/event IDs и executionKey уникальны.
[НОРМАТИВНО] Google AI Mode не смешан с SERP; Maps Place не записан как rank; Reviews не записаны в LOCAL_MAPS.
[НОРМАТИВНО] Existing Perplexity path regression tests PASS.
[НОРМАТИВНО] Каждый adapter имеет source-specific timeout, retry, cost и retention policy.

### WP-05. HoReCa Intent Ontology v0.1

[ИЗВЛЕЧЕНО] Product Decision требует 50–100 intents с типом, языком, рынком, intent class и action class. Категории: business type, occasion, atmosphere, needs, location/time и action.  [S1 §4.2, §6.2]

#### Минимальная схема записи

| Поле | Пример | Правило |
|---|---|---|
| intent_id | HRC-REST-OCC-ROMANTIC-001 | Стабильный versioned ID |
| business_type | restaurant / cafe / food hall / hotel / villa / spa | Вертикаль |
| market / area | Bali / Ubud | Рынок и локальный контекст |
| language | EN / RU / ID | Не смешивать языки |
| intent_class | occasion / atmosphere / needs / location_time / action | Таксономия |
| action_class | book / call / WhatsApp / order / directions / availability | Следующее действие |
| query_form | Search / Maps / AI | Формулировки строятся отдельно |
| branded | true / false | Branded и discovery разделены |
| evidence_requirement | mention / citation / recommendation / action readiness | Что считается доказательством |
| lifecycle_status | draft / approved / pilot / retired | Версионность |

#### Acceptance

[НОРМАТИВНО] 50–100 уникальных intents; дубликаты и синонимы нормализованы.
[НОРМАТИВНО] Каждый intent имеет business type, market, language, intent class, action class и applicable surfaces.
[НОРМАТИВНО] Search query, Maps keyword и AI prompt не копируются автоматически друг в друга.
[НОРМАТИВНО] Branded/discovery и action/occasion/atmosphere/needs группы имеют отдельные denominators.
[НОРМАТИВНО] Pilot subset для AVLI и KORA утверждён и зафиксирован в immutable version.

### WP-06. AVLI Local Decision Pilot

[ИЗВЛЕЧЕНО] Главный вопрос AVLI: почему действующий ресторан рекомендуют или не рекомендуют? Обязательные evidence: entity match, reviews, menu/site, selected social evidence, competitors, local intents и action paths.  [S1 §6; S2 §14]

#### Scope

Одна verified business location и подтверждённая entity identity.
Website/menu, Maps Place, Maps Reviews и только прошедшие gate selected social sources.
3–5 competitors с evidence-backed identity match.
Locked subset HoReCa intents.
Booking, WhatsApp, call, order и directions paths.

#### Структура отчёта

Executive summary.
Entity and facts.
Visibility by surface.
Evidence strength and gaps.
Competitor selection reasons.
Action blockers.
30-day action plan.
Recheck calendar.
Limitations and UNKNOWN.
Evidence index.

#### Acceptance

[НОРМАТИВНО] 100% опубликованных findings имеют evidence IDs и capture timestamp.
[НОРМАТИВНО] 0 fabricated facts, benchmarks, ratings или inferred outcomes.
[НОРМАТИВНО] Каждая recommendation содержит action, owner, priority и verification plan.
[НОРМАТИВНО] Основные причины выбора/невыбора понятны owner за две минуты.
[НОРМАТИВНО] Нельзя утверждать, что обнаруженная корреляция вызвала бронирование.

### WP-07. KORA Pre-opening Readiness Pilot

[ИЗВЛЕЧЕНО] Главный вопрос KORA: что должно быть согласовано до открытия? Пилот использует pre-opening facts и action readiness; rank/review/outcome metrics нельзя публиковать до появления валидных данных.  [S1 §6; S2 §14]

#### Scope

Official entity facts, name/category/address/coordinates/hours/opening status.
Official profiles and source inventory.
Menu/service readiness and business-type clarity.
Maps, booking, WhatsApp, call, directions and availability prerequisites.
Conflict findings и UNKNOWN ledger.
Verification calendar до и после открытия.

#### Acceptance

[НОРМАТИВНО] Каждый факт имеет official/public source или помечен UNKNOWN.
[НОРМАТИВНО] Conflicts связаны с evidence и конкретным owner action.
[НОРМАТИВНО] Не публикуются вымышленные ranking, reviews, conversions или recommendation trends.
[НОРМАТИВНО] Каждая readiness action имеет deadline/owner/verification method.
[НОРМАТИВНО] Recheck plan использует совместимый Lock либо отмечает break in series.

### WP-08. Target Website & Offer Specification

[НОРМАТИВНО] Можно проектировать target site и тексты, но public deployment, pricing changes и новые Local/Social/Travel/Outcome promises остаются NO-GO до Gate G7.  [S1 §5, §8–9; S2 §16]

#### Target information architecture — draft

| Route | Роль | Primary intent | Статус |
|---|---|---|---|
| / | Platform overview | Selena Systems как evidence-first visibility platform | HOLD FOR RELEASE |
| /visibility | Commercial hub | AI-driven discovery measurement and evidence | HOLD FOR RELEASE |
| /horeca | HoReCa vertical | Local-first: restaurants, cafes, food halls, hotels, villas, spa | HOLD FOR RELEASE |
| /check | Free Public Readiness | Public-only technical/entity/action readiness | CURRENT / VERIFY |
| /pricing | Offers and entitlements | Только approved scope; без invented Local/Social/Travel claims | CURRENT / HOLD CHANGES |
| /methodology | Method and limitations | Surfaces, denominators, repeats, UNKNOWN, evidence | TARGET |
| /evidence | Evidence example | Readable web evidence view; export remains secondary | TARGET |
| /lab | Selena Lab | Experiments, tools, cases and research from real measurements | TARGET |
| /automation | AI Automation | Отдельный commercial hub, не смешивать с Visibility | TARGET / VERIFY |
| /contact | Contact / application | Clear next step | CURRENT / VERIFY |

#### Обязательная карточка каждой страницы

> Page ID / Route / Status · Audience / Primary intent / Business job · Current capability / Target capability · Allowed promise / Blocked promises · H1 / Direct answer in first 50–100 words · Required sections / Required evidence · Primary CTA / Secondary CTA / Internal links · Schema / Analytics events / Mobile and SEO requirements · Acceptance criteria / Release gate

#### Acceptance

[НОРМАТИВНО] Каждая money page имеет один primary intent и прямой ответ в первых 50–100 словах.
[НОРМАТИВНО] Каждый claim классифицирован SUPPORTED / PARTIAL / UNSUPPORTED / UNKNOWN.
[НОРМАТИВНО] FAQ, schema и visible copy согласованы; schema не добавляет скрытые обещания.
[НОРМАТИВНО] Comparison pages сравнивают категории, а не создают фальшивые брендовые войны.
[НОРМАТИВНО] Case pages используют только безопасные факты и evidence.
[НОРМАТИВНО] Drafts и wireframes доступны, но production deployment заблокирован feature flag/release process.

### WP-09. Evidence Loop, Unit Economics & Owner Gate

[ИНТЕРПРЕТИРОВАНО] Финальный пакет связывает product validation, provider economics и сайт. Он отвечает не «сколько сделали», а «что измерили, что изменили, что проверили повторно и какое решение можно принять».

#### Evidence loop

> Baseline → Finding → Evidence → Recommendation → Owner Action → Verification · → Remeasurement → Comparison → GO / HOLD / NO-GO

#### Unit-economics fields

Source and exact contract version.
Analytical slots and max attempts.
Provider unit and worst-case cost.
Observed cost and latency.
Retention/deletion cost.
Cadence.
Plan/module eligibility.
Manual vs automated scope.
Overage behavior.
Margin assumptions marked as assumptions.

#### Comparison statuses

| Статус | Когда используется |
|---|---|
| IMPROVED | Comparable Lock; agreed metric improved. |
| DECLINED | Comparable Lock; agreed metric declined. |
| UNCHANGED | Comparable Lock; change below defined threshold or no change. |
| UNKNOWN | Недостаточно valid evidence. |
| BREAK_IN_SERIES | Изменился Lock, provider, surface version или method. |

#### Acceptance

[НОРМАТИВНО] Unit economics не используют free credits как устойчивую себестоимость.
[НОРМАТИВНО] 3–5 comparable cycles требуются до commercial approval тех surfaces, для которых это установлено источниками.
[НОРМАТИВНО] Owner review присваивает каждому source ALLOWED / PILOT_ONLY / MANUAL_ONLY / BLOCKED.
[НОРМАТИВНО] Отдельное решение присваивает public positioning/pricing GO или NO-GO.
[НОРМАТИВНО] Ни один отрицательный или неизвестный результат не скрыт из final report.

## 9. Целевой календарь сентября

[ИНТЕРПРЕТИРОВАНО] Даты являются target windows. Gate имеет приоритет над календарём. Если prerequisite не пройден, последующий пакет не ускоряется обещанием «закончить к пятнице».

| Окно | Milestone | Пакет | Результат |
|---|---|---|---|
| 31 Aug – 2 Sep | M0 | WP-00 | Owner decisions, baseline SHA, flags OFF, evidence repository |
| 1–6 Sep | M1 | WP-01 + WP-03 start | Current-state/site baseline; migration and retry reconciliation |
| 3–13 Sep | M2 | WP-02 + WP-05 | 13-source discovery; HoReCa ontology draft |
| 7–20 Sep | M3 | WP-04 after gates | Registry/contracts; capped Core Google pilots only where approved |
| 14–24 Sep | M4 | WP-06 + WP-07 | AVLI and KORA data collection/report drafts |
| 14–27 Sep | M5 | WP-08 | Target site architecture, page specs, copy and claim matrix |
| 25–30 Sep | M6 | WP-09 | Remeasurement, unit economics, owner GO/NO-GO |

## 10. Роли и ответственность

| Роль | Ответственность | Выход |
|---|---|---|
| Selena / Owner | Product decisions, claims, tariffs, canary budgets, source and production GO/NO-GO. | Final approval |
| Product Architect / ChatGPT | Master ТЗ, traceability, page specs, acceptance logic, contradiction resolution. | Specification |
| Codex | Code, migrations, fixtures, tests, PR evidence; без изменения product boundary. | Implementation |
| Claude Code | Read-only verification, delta review, safety and contradiction checks. | Independent verification |
| Analyst | Entity match, intent approval, findings, Expert Verified review. | Evidence quality |
| QA | Acceptance matrix, tests, RLS, mobile, accessibility, links, screenshots. | Acceptance evidence |
| Content | Draft copy strictly within allowed claims and evidence. | Content drafts |
| Designer | Target wireframes and report UX; no capability invention. | UX drafts |

### 10.1. RACI по work packages

| WP | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| WP-00 | Owner | Product Architect | Codex / Claude | All |
| WP-01 | QA / Codex | Product Architect | Owner / Analyst | All |
| WP-02 | Codex | Owner | QA / Product Architect | Claude |
| WP-03 | Codex | Owner | QA / Claude | Product Architect |
| WP-04 | Codex | Owner | QA / Analyst | Product Architect / Claude |
| WP-05 | Product Architect / Analyst | Owner | Content / QA | Codex |
| WP-06 | Analyst | Owner | Product Architect / QA | Codex |
| WP-07 | Analyst | Owner | Product Architect / QA | Codex |
| WP-08 | Product Architect / Content / Designer | Owner | QA / Codex | Analyst |
| WP-09 | Product Architect / Analyst | Owner | Codex / QA | All |

## 11. Gate-модель

| Gate | Mandatory PASS | Calls | Открывает |
|---|---|---|---|
| G0 — Decision | Product Decision + Technical Delta discovery boundary approved; non-goals fixed; flags OFF. | 0 | GO to discovery |
| G1 — Capability | 13 isolated canaries; fixtures; schema/cost/latency/privacy matrix. | Approved canaries only | Source GO/NO-GO |
| G2 — Contracts | Registry, validators, fixture tests and evidence writer; no runtime source enablement. | 0 | GO to adapter pilots |
| G3 — Core Google | AI Mode/SERP/Place/Reviews raw→normalized→DB; retry/cost/idempotency PASS. | Capped | GO to AVLI pilot |
| G4 — Social | Account/content/conversation schemas; privacy/retention/duplicates PASS. | Capped | GO to Social Snapshot pilot |
| G5 — Travel | Hotels schema, stable IDs, offer semantics and cost proven. | Capped | GO/NO-GO Travel |
| G6 — Product | AVLI/KORA reports; 100% evidence-linked findings; UNKNOWN/partial correct. | Capped | GO to limited UI |
| G7 — Commercial | 3–5 comparable cycles, unit economics, entitlements, scheduler, deletion, alerts, owner approval. | Plan-capped | Production/public GO |

### 11.1. Безусловные STOP conditions

[NO-GO] Unknown или unbounded provider price.  [S2 §13.1; S4 §8.1]
[NO-GO] Unexplained cardinality mismatch, overflow или duplicate provider call.  [S2 §13.1; S4 §8.1]
[NO-GO] Raw payload отсутствует там, где evidence contract его требует.  [S2 §13.1; S4 §8.1]
[NO-GO] Schema change без version break.  [S2 §13.1; S4 §8.1]
[NO-GO] Cross-tenant RLS failure, secret exposure или unsupported retention/deletion path.  [S2 §13.1; S4 §8.1]
[NO-GO] Attempt count >3, generic queue retries, whole-grid/dataset/cycle retry или silent scope reduction.  [S2 §13.1; S4 §8.1]
[NO-GO] Maps Place используется как Maps rank evidence.  [S2 §13.1; S4 §8.1]
[NO-GO] Google AI Mode смешан с Google SERP.  [S2 §13.1; S4 §8.1]
[NO-GO] Social записан в Reviews storage или Reviews в LOCAL_MAPS.  [S2 §13.1; S4 §8.1]
[NO-GO] Local AI automated без coordinate proof и Phase 4 gate.  [S2 §13.1; S4 §8.1]
[NO-GO] Travel/Social/Local promises опубликованы раньше capability и tariff approval.  [S2 §13.1; S4 §8.1]
[NO-GO] Mismatch Lock → permits → attempts → observations → cost events → export.  [S2 §13.1; S4 §8.1]

## 12. Общие критерии приёмки

### Traceability

[НОРМАТИВНО] Каждая задача связана с Requirement ID, work package и source section.
[НОРМАТИВНО] Каждый PR содержит acceptance report и evidence links.
[НОРМАТИВНО] Каждое изменение product boundary оформлено новой версией документа.

### Data & Evidence

[НОРМАТИВНО] Каждый published finding имеет evidence ID, captured_at, provider/source и dataset version.
[НОРМАТИВНО] PUBLIC, UPLOADED, CONNECTED и DERIVED различимы.
[НОРМАТИВНО] UNKNOWN сохраняется и не попадает в denominator как ноль.
[НОРМАТИВНО] Raw evidence private; client export по умолчанию normalized.

### Execution Safety

[НОРМАТИВНО] Provider call имеет spend permit, executionKey и cost event.
[НОРМАТИВНО] Максимум 3 attempts total.
[НОРМАТИВНО] Duplicate provider calls = 0.
[НОРМАТИВНО] Expected+1 блокируется до provider call.
[НОРМАТИВНО] Migration/deploy создают 0 calls.

### Product & Claims

[НОРМАТИВНО] No composite score для несопоставимых surfaces.
[НОРМАТИВНО] Никаких guaranteed ranks, mentions, recommendations или outcomes.
[НОРМАТИВНО] Public claims соответствуют current capability.
[НОРМАТИВНО] Automated report помечен NOT EXPERT VERIFIED, если review отсутствует.

### UX & Accessibility

[НОРМАТИВНО] Важные статусы не кодируются только цветом.
[НОРМАТИВНО] Touch targets ≥44×44 px и keyboard navigation.
[НОРМАТИВНО] Owner понимает main result за две минуты.
[НОРМАТИВНО] Evidence доступно от summary до source snapshot.

## 13. Формат задач для Codex

[НОРМАТИВНО] Нельзя объединять 13 datasets, migrations, UI и tariffs в один PR. Каждая task заканчивается собственным evidence-backed acceptance report.  [S2 §15]

> TASK ID: · Название: · Work package: · Статус: GO / HOLD / BLOCKED · Цель и business reason: · Source requirements: · Repository / branch / baseline SHA: · Dependencies and gates: · Inputs: · Разрешённые изменения: · Запрещённые изменения: · Data migrations: · Provider calls allowed: · Feature flags: · Tests: · Acceptance criteria: · Required evidence: · Rollback: · Output files: · PR scope:

### 13.1. Definition of Ready

Статус задачи GO и prerequisite gate PASS.
Baseline SHA записан.
Exact source contract/fixture известен либо задача является discovery canary.
Budget cap и permitted calls определены.
Acceptance и rollback определены до начала кода.

### 13.2. Definition of Done

Code/tests/evidence соответствуют acceptance.
No secret, no duplicate, no unapproved provider call.
Migration forward/replay/rollback и RLS PASS, если применимо.
Feature flag остаётся в требуемом состоянии.
Acceptance report приложен к PR.
Docs/status matrix обновлены.

## 14. Обязательные артефакты и имена файлов

| ID | Файл | Содержание |
|---|---|---|
| D-00 | SELENA_OWNER_DECISION_SEPTEMBER_2026_V1.0.md | Owner approvals, budgets, non-goals, flags. |
| D-01 | SELENA_CURRENT_STATE_RECONCILIATION_2026-09.md | Routes, code, staging, production, claims and gaps. |
| D-02 | SELENA_PROVIDER_CAPABILITY_MATRIX_V1.0.xlsx / .md | 13 source contracts, fixtures, cost, privacy and verdicts. |
| D-03 | SELENA_MEASUREMENT_SAFETY_ACCEPTANCE_V1.0.md | Attempts, migrations, RLS, grid and stop tests. |
| D-04 | SELENA_PROVIDER_REGISTRY_CONTRACTS_V1.0.md | Registry definitions and fixture tests. |
| D-05 | HORECA_INTENT_ONTOLOGY_V0.1.csv + .docx | 50–100 intents and pilot subsets. |
| D-06 | AVLI_LOCAL_DECISION_REPORT_V1.0.docx | Operating restaurant pilot. |
| D-07 | KORA_PREOPENING_READINESS_REPORT_V1.0.docx | Pre-opening pilot. |
| D-08 | SELENA_SYSTEMS_WEBSITE_TARGET_SPEC_V1.0.docx | Target IA, pages, claims and release gates. |
| D-09 | SELENA_UNIT_ECONOMICS_V1.0.xlsx | Source/task/attempt/cadence economics. |
| D-10 | SELENA_OWNER_GO_NO_GO_2026-09-30.docx | Source and public-release decisions. |

## 15. Реестр ключевых рисков

| ID | Риск | Impact | Контроль | Реакция |
|---|---|---|---|---|
| R-01 | Provider output schema отличается от ожиданий | High | Fixture-first; не создавать normalized fields до real response. | STOP on unversioned drift |
| R-02 | Цена неизвестна или зависит от объёма | High | Worst-case cap + isolated canary + source-specific policy. | BUDGET_BLOCKED |
| R-03 | Entity mismatch | High | Stable IDs first; fallback review flag. | No publication |
| R-04 | Privacy/retention не решены | High | Capability status BLOCKED до deletion path. | STOP |
| R-05 | Surfaces смешаны в storage/score | High | Domain-specific schemas/read models. | STOP |
| R-06 | Causal claim без outcome evidence | High | Observed/assisted/attributed labels only. | Remove claim |
| R-07 | Big-bang PR | Medium | One task + one acceptance report per PR. | Reject PR |
| R-08 | Baseline drift | Medium | Lock/provider version/break-in-series. | No trend claim |
| R-09 | Local AI lacks coordinate proof | High | MANUAL_ONLY; no pin map. | COORDINATE_PROOF_FAILED |
| R-10 | Website promises ahead of capability | High | Claims matrix + G7 release gate. | NO-GO deploy |

## 16. Решения владельца, необходимые для старта

| ID | Решение | Рекомендация | Статус |
|---|---|---|---|
| OD-01 | Утвердить Product Decision v1.0 и non-goals. | Рекомендация: APPROVE | PENDING |
| OD-02 | Утвердить Technical Delta v1.3 только для discovery/fixtures/isolated canaries. | Рекомендация: APPROVE WITH LIMITS | PENDING |
| OD-03 | Утвердить global и per-source canary budget. | Конкретные суммы не поддержаны источниками; заполнить owner. | PENDING |
| OD-04 | Утвердить AVLI и KORA как сентябрьские pilots. | Рекомендация: APPROVE | PENDING |
| OD-05 | Утвердить draft target site, но запретить public release до G7. | Рекомендация: APPROVE DRAFT / NO-GO DEPLOY | PENDING |
| OD-06 | Утвердить evidence retention и signed-reference policy. | Нужна отдельная policy. | PENDING |
| OD-07 | Разрешать paid Maps canary только отдельным решением после Phase 2A PASS. | Рекомендация: KEEP HOLD | PENDING |

### 16.1. Подтверждение

| Owner approval · ________________________________ · Имя / дата / решение | Technical scope approval · ________________________________ · Имя / дата / решение | Public release status · ________________________________ · Имя / дата / решение |
|---|---|---|

## 17. Финальный verdict этого Master ТЗ

> MASTER EXECUTION SPECIFICATION · READY FOR OWNER REVIEW.  GO: governance, reconciliation, capability harness, fixtures, approved isolated canaries, Local safety foundation, HoReCa Intent Ontology and pilot preparation.  HOLD: runtime expansion, limited UI and provider-backed pilots until their gates.  NO-GO: public website repositioning, pricing changes, new Social/Travel/Outcome promises and automatic Local AI.

[ИНТЕРПРЕТИРОВАНО] При одобрении этого документа первой исполнимой задачей для Codex становится не «переписать сайт», а WP-00/WP-01/WP-02: зафиксировать baseline, доказать фактическое состояние и построить capability matrix. Только после этого открываются adapter pilots, продуктовые отчёты и коммерческий релиз.

## Приложение A. Source-to-Requirement Traceability

| Requirement | Источник | Раздел Master ТЗ |
|---|---|---|
| Product boundary / HoReCa Local-first | S1 §1–2 | §4, WP-05–WP-09 |
| Independent surfaces / no composite score | S1 §2.3; S3 §7–9, §17 | §4.3–4.4, §12 |
| Public prices unchanged | S1 §1.1, §5; S4 §7 | §5, WP-08, G7 |
| Capability discovery only | S2 §1, §12–16 | WP-02, §5, G1 |
| 13 configured-only datasets | S2 §2, §12 | §7, WP-02 |
| Registry architecture | S2 §3–5 | WP-04 |
| Max 3 attempts / no bulk retry | S2 §5.1; S4 §5 | WP-03, §11 STOP |
| LOCAL_MAPS / LOCAL_AI separation | S3 §8–9; S4 §1–4 | §4.3, WP-03 |
| AVLI/KORA pilots | S1 §6; S2 §14 | WP-06, WP-07 |
| Website/public change NO-GO | S1 §8–9; S2 §16 | §5, WP-08, G7 |
| Evidence-linked findings and UNKNOWN | S1 §2.3, §6.1; S3 §16–17 | §4.4, §12, WP-06–09 |

## Приложение B. Template — Provider Capability Matrix

| Поле | Что фиксируется |
|---|---|
| source / surface / domain | Идентичность source и target domain. |
| dataset env key / contract version | Dataset ID не раскрывается клиенту; version фиксируется. |
| capability status | CONFIGURED_ONLY / PILOT_ONLY / ALLOWED / MANUAL_ONLY / BLOCKED. |
| input contract | Required/optional fields, cardinality and constraints. |
| raw fixture | Private ref, SHA-256, captured_at, environment. |
| schema inventory | Field/type/nullable/repeated/observed class. |
| stable identity | Account/content/review/place/video/post ID or fallback. |
| pagination / dedupe | Cursor/date/page semantics and duplicate boundary. |
| cost / latency | Actual/estimated cost and observed latency. |
| privacy / retention / deletion | Classification and policy. |
| normalizer version | Fixture test and unknown-field preservation. |
| GO/NO-GO rationale | Evidence-backed owner decision. |

## Приложение C. Template — Page Specification

| Поле | Требование |
|---|---|
| Page ID / Route / Status | Уникальный ID, current/target/hold/release state. |
| Audience / Primary intent | Одна аудитория и один главный intent. |
| Business job | Какое решение принимает пользователь. |
| Current / Target capability | Что доступно сейчас и что является целью. |
| Allowed / Blocked claims | Поддержанные и запрещённые обещания. |
| H1 + Direct answer | Первые 50–100 слов без туманного copy. |
| Required sections / evidence | Контент и доказательства. |
| CTA / Internal links | Следующий шаг и связность. |
| Schema / Analytics | Structured data и события, совпадающие с visible content. |
| Mobile / Accessibility / SEO | CWV, keyboard, touch, indexability. |
| Acceptance / Release gate | Что считается готовым и когда можно публиковать. |

## Приложение D. Template — PR Acceptance Report

> Task / PR / branch / baseline SHA / final SHA · Requirement IDs and source sections · Scope completed / scope explicitly not completed · Provider calls: expected / actual / cost · Migrations: forward / replay / rollback · Tests: unit / integration / contract / security / visual · Cardinality: Lock → permits → attempts → observations → cost → export · Evidence links / fixture hashes / screenshots · Secrets scan / RLS / idempotency / duplicate result · Known limitations / UNKNOWN / follow-up gate · Verdict: PASS / PARTIAL / FAIL / BLOCKED

## Приложение E. Disposition первоначального Hermes backlog

| Disposition | Что входит |
|---|---|
| RUN NOW | GSC baseline; route/claims inventory; sitemap/robots/canonicals/indexability; SSR/crawler HTML; Lighthouse/CWV; prompt baseline; evidence capture; citation/competitor source mapping; remeasurement. |
| DRAFT ONLY | Commercial page architecture; first 50–100 words; FAQ; schema; comparison pages; case pages; CTA; internal links; target site and report UX. |
| CONDITIONAL | Cloudflare AI Crawl Control — только если фактическая конфигурация домена этого требует. |
| DEFER | llms.txt как zero-weight diagnostic; 10 generic articles; mass YouTube/Telegram repurposing; дополнительные comparison pages. |
| BLOCKED | Публичное repositioning, pricing changes, Local/Social/Travel/Outcome promises до G7. |

## Нормативные источники

S1. SELENA_SYSTEMS_PRODUCT_DECISION_HORECA_LOCAL_FIRST_V1.0_2026-08-31.docx — Продуктовая граница, HoReCa Local-first, клиентский опыт, entitlements и pilot gates. Высший продуктовый источник.
S2. SELENA_AI_VISIBILITY_SAAS_TECHNICAL_DELTA_V1.3_2026-08-31.docx — Provider registry, 13 новых datasets, discovery, Google/Social/Travel gates. Нормативное дополнение; discovery-only GO.
S3. SELENA_AI_VISIBILITY_SAAS_ARCHITECTURE_TZ_V1.2_2026-08-29.docx — Единый evidence-first SaaS, независимые surfaces, data model, UX, reporting. Основная архитектура.
S4. SELENA_AI_VISIBILITY_SAAS_IMPLEMENTATION_DELTA_V1.2.1_2026-08-30.docx — LOCAL_MAPS, LOCAL_AI, grid, retries, attempts, cost caps и Local gates. Нормативное дополнение к S3.
S5. SELENA_AI_VISIBILITY_SAAS_ARCHITECTURE_TZ_V1 / v1.1 — Историческая база value-before-access и Public Audit. Только background; не отменяет S1–S4.
[НОРМАТИВНО] Внешние provider ссылки и цены, упомянутые в source documents, не являются автоматическим production approval. Для каждого endpoint обязательны capability, ToS/legal, retention, cost и controlled canary decisions.  [S3 §20, §30; S4 §9]
