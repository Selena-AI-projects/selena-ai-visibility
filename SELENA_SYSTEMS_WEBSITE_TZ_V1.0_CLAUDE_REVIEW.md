# Claude independent verification — Website Architecture & Content v1.0

**Дата проверки:** 31 августа 2026, Бали
**Проверяемый документ:** `docs/site-tz/SELENA_SYSTEMS_WEBSITE_ARCHITECTURE_CONTENT_TZ_V1.0.md` (§21 этого ТЗ требует независимой проверки Claude)
**Проверяемая реализация:** `parkourcafe/selena-ai-company` @ `453db49` (публичный сайт), `parkourcafe/selena-ai-visibility` @ `aac8a9e` (приложение и каталог)
**Режим:** read-only. Исходники и статический анализ репозиториев. Живой прод, DNS, платежи и провайдеры не трогались. Браузерная и Lighthouse-проверка **не выполнялась** — в этом окружении нет доступа к превью-деплою, поэтому всё, что требует рендера, помечено `NOT_VERIFIED`, а не `PASS`.

---

## Вердикт

# **CONDITIONAL GO — на разработку. NO-GO — на публикацию §8 (Pricing) в текущей редакции.**

Раздельно, как требует §21:

| Контур | Вердикт | Основание |
|---|---|---|
| Готовность **сайта** (реализация) | `NOT_STARTED` — ожидаемо | Ни один новый маршрут ТЗ не существует; ТЗ написано 20 минут назад. Это baseline, а не дефект. |
| Готовность **ТЗ** к передаче в Codex | `CONDITIONAL GO` | Документ исполним, но содержит 5 блокеров ниже. Блокеры B-1 и B-2 нужно закрыть **до** старта W1, остальные — до соответствующей фазы. |
| Готовность **runtime/провайдеров** | `NOT READY` | Visitor View ни разу не завершил прогон (`HANDOFF.md`), платежи выключены, Google Places вне MVP. |

ТЗ v1.0 качественное: truth-rules (§0.3), capability publication contract (§19.1) и conflict rule (§23) — сильнее, чем в большинстве продуктовых спецификаций. Блокеры ниже найдены **этими же правилами**, применёнными к самому документу.

---

## Блокеры

### B-1 · Публичные тарифы §8 продают возможности, которых нет в утверждённом каталоге · `NO-GO на публикацию`

§8 объявляет в покупаемых планах:

| План | Заявлено в §8 | Состояние по утверждённому каталогу |
|---|---|---|
| $49 Snapshot | «Maps 5×5 / 3 km / 5 keywords monthly» | **Google Places исключён из MVP** — `SELENA_PRODUCT_CATALOG_LOCK_V1.md:33`, `PRODUCT.md:48` (оба репозитория) |
| $49 Snapshot | «Profile/Reviews monthly» | Review-источники не входят в RC6-lock; описаны только как «available from approved public sources… optional connected accounts» |
| $79 Landscape | «Local AI recommendation layer», «bounded Social Snapshot when selected» | Social/Instagram — «optional and gated by ToS, attribution, retention and OAuth requirements», не принято |

Утверждённый RC6-lock для $49: `1 язык, ChatGPT/Gemini/Perplexity, 300 ответов`. Ничего про Maps и Reviews.

Это ловится собственным правилом ТЗ дважды: §19.1 («source capability accepted + normalized contract + persistence + entitlement + UI states = block may be published and **sold**; otherwise = block disabled or absent») и §23 CONFLICT RULE («technical truth and owner-approved entitlement win. Update the copy before publication»). По §21.1 «Card differs from enforced entitlement» — **Automatic NO-GO**.

**Что сделать:** либо убрать Maps/Reviews/Social из публичных карточек до приёмки этих источников, либо провести их через полный gate (адаптер → схема → хранение → entitlement → UI-состояния) до W3. Промежуточной формулировки быть не может — §18.1 запрещает «coming soon».

### B-2 · Визуальная система §14 противоречит живому бренду · `решение владельца до W1`

§14 требует «disciplined Selena **blue/cyan** identity»: navy для заголовков, existing Selena blue для CTA, cyan/teal для evidence, тёплый акцент только для hospitality-моментов.

Живой сайт построен на противоположной палитре: `app/globals.css` — тёплый ivory, медь (copper/copper-deep), угольный подвал. И `DESIGN.md` приложения прямо фиксирует: «Pure black, pure white and blue-purple gradients are **not** part of the Selena default theme», а кабинет описан как «warm, editorial, calm» и явно «extends the existing Selena Systems public site».

То есть §14 описывает не текущий бренд, а другой. Один из трёх вариантов, и выбрать должен владелец:

1. §14 — намеренный ребрендинг сайта в navy/blue/cyan → тогда нужно обновить `DESIGN.md` кабинета, иначе сайт и кабинет разъедутся визуально на глазах у клиента, который проходит из одного в другой.
2. §14 унаследовано из более раннего документа по ошибке → заменить на ivory/copper токены.
3. Гибрид: navy/cyan только внутри продуктовых визуализаций (evidence, карты), ivory/copper — оболочка сайта.

Пока не выбрано — W1 (design tokens) стартовать нельзя: токены закладываются один раз.

### B-3 · Кейс AVLI требуется §2/§9, но данных под него в репозитории нет · `до W2`

§2 (блок 8 главной) и §9 называют AVLI и KORA как опорные кейсы. В журнале (`data/journal/`) есть: `korafoodhall`, `otherbali`, `petid`, `remhaos`, `selenasystems`, `villaops`, `bigdragonvillas`. **AVLI отсутствует.** Big Dragon Villas и Chito Bistro намеренно не опубликованы — нет записанного консента, и тест падает без него.

§9 сам ставит publication gate: «Accepted dataset, evidence-linked findings, **owner permission**, before/after when claimed». Пока AVLI не измерен и разрешение не записано, блок Proof на главной публиковаться не может — а он в ТЗ несёт функцию «Establish trust».

**Что сделать:** либо провести замер AVLI и получить письменное разрешение до W2, либо на старте публиковать Proof только на KORA и собственных проектах.

### B-4 · Запрещённые §18.1 строки уже живут в публичном коде · `до W2, дешёвая правка`

`grep` по публичным строкам сайта:

| Файл | Строка | Правило |
|---|---|---|
| `lib/visibility/content.en.ts:528` | `"For existing pilot and early-access clients."` | §18.1 запрещает «pilot» в публичном тексте — прямое нарушение |
| `lib/visibility/types.ts:191` | `PricingPlanStatus = "beta" \| "founding_soon" \| "active"` | тип; публично сейчас не рендерится как «beta», но остаётся заряженным ружьём |
| EN pricing | `statusLabel: "Early access · checkout not open"` | буквально не в списке, но это ровно та транзитная формулировка, которую §18.1 отменяет: «publish accepted final capability in present tense, or hide the block» |

Третий пункт — решение владельца, а не механическая правка: если чекаут закрыт, ТЗ требует **убрать блок**, а не подписать его «скоро». Это может означать, что до включения платежей платные карточки не показывают цену как покупаемую, а ведут в разговор.

### B-5 · Миграция локальных маршрутов затрагивает проиндексированные URL · `W0, до любых редиректов`

§1.1 требует пары `EN /about ↔ RU /ru/about` (и так же contact/privacy/terms, плюс EN `/projects`).

Сейчас в коде:

| ТЗ хочет | Есть сейчас |
|---|---|
| `/about`, `/contact`, `/privacy`, `/terms` (EN) | `/en/about`, `/en/contact`, `/en/privacy`, `/en/terms` |
| `/ru/about`, `/ru/contact`, `/ru/privacy`, `/ru/terms` | `/about`, `/contact`, `/privacy`, `/terms` — **без префикса, это русские страницы** |
| `/projects` (EN) | только `/ru/projects` |

То есть у русских юридических страниц придётся сменить URL, а английские переехать с `/en/*` на корень. Это самая рискованная часть миграции: §1.2 сам требует «PRE-LAUNCH CRAWL: export all current URLs, status codes, titles, canonicals, hreflang and backlinks **before** redirects are committed» и «Never redirect all RU pages to /ru/».

**Что сделать:** W0 обязан выдать матрицу редиректов по каждому URL персонально, включая внешние ссылки. Без неё W1 не начинается.

---

## Замечания без статуса блокера

**N-1 · Расхождение в объёме Expert Verified $399.** ТЗ §8 — «expert review of the measured dataset» без числа. Но внутри репозиториев два разных числа на один и тот же план: `SELENA_PRODUCT_CATALOG_LOCK_V1.md` → `20 сценариев × 8 × 5 = 800` ответов; `docs/selena-visibility/OFFER_LADDER.md` и `PRODUCT.md` → `25 × 2 × 8 × 5 = 2000`. До того как цифра попадёт на страницу цен, владелец должен зафиксировать одну. Публиковать её сейчас нельзя ни в одном варианте.

**N-2 · «Limited visibility preview» во free-плане (§8).** Master Correction (`docs/visibility/SELENA_MASTER_CORRECTION_RECONCILIATION_V1.md`) специально убрал AI-answer sample из бесплатного контура: free = только Public Readiness, «does not… expose an AI-answer sample», а `/report/sample` стал 410. Формулировка §8 «limited visibility preview» рискует вернуть ровно ту поверхность, которую закрыли. Нужно уточнить в ТЗ, что именно показывает preview и из какого источника, иначе Codex реализует это как AI-превью.

**N-3 · Клиентский портал §13 против фактического кабинета.** §13 описывает шесть разделов (Overview · Visibility · Evidence · Competitors · Actions · Outcomes). Фактический кабинет — один экран `/app/selena` и четыре шага (`docs/selena-visibility/CLIENT_FLOW.md`, решение владельца: «повторяет поток HubSpot дословно, без изобретательства»). Это другой репозиторий и другой gate, но сайт не должен обещать интерфейс, которого в кабинете нет: §13 сам это запрещает («Do not reproduce a fake dashboard as a marketing-only interaction»).

**N-4 · Промо `AUGUST2026` истекает сегодня.** `activePromotion()` гасит баннер после 31.08 UTC 23:59:59. Ничего делать не нужно — отмечено, чтобы никто не «чинил» исчезнувший баннер.

---

## Матрица §20.1 — baseline на сегодня

`NOT_STARTED` здесь означает «работа ещё не начиналась», а не «сделано плохо».

| # | Пункт приёмки §20.1 | Статус | Доказательство |
|---|---|---|---|
| 1 | Все канонические EN/RU маршруты 200, реципрокный hreflang, один хоп редиректа | `NOT_STARTED` | `/hospitality-ai-visibility*`, `/how-it-works`, `/data-sources`, `/lab/{research,experiments,tools,guides}`, EN `/projects` — отсутствуют в `app/` |
| 2 | Хедер, мобильное меню, футер, переключатель языка, ссылка в кабинет | `PARTIAL` | Хедер/футер/меню есть и качественные (`components/layout/*`), но нет меню «Solutions ▾» и пунктов «How it works»/«Proof» из §1.3 |
| 3 | Иерархия главной = один hospitality-нарратив | `NOT_STARTED` | Текущие `lib/data/homepage.ts` / `homepage-ru.ts` — не hospitality-first |
| 4 | Нет публичных строк pilot/beta/coming soon/being developed/configured-only | `FAIL` | B-4 |
| 5 | Ни одного неподтверждённого утверждения при выключенном capability-флаге | `NOT_VERIFIED` | Флагов capability в текущем коде нет — есть env-проверки (`CLIENT_PORTAL_ENABLED`), что §19.1 прямо запрещает как основание для публикации |
| 6 | У каждой метрики знаменатель/скоуп/дата/статус, sample помечен | `PARTIAL` | Sample-разметка уже дисциплинированная (`lib/visibility/sample-report-data.ts`, `sourceStatus: "sample"` на каждом значении) — это сильная база под §2.5 |
| 7 | Карточки цен = versioned entitlement registry | `FAIL` | `lib/commercial-facts.ts` — хороший единый источник, но его содержимое расходится с §8 (B-1) |
| 8 | Free check валидирует ввод, пишет консент, не выдаёт выдуманный успех | `PARTIAL` | Формы уже с honeypot, серверным rate-limit, идемпотентностью (SEO-аудит 17.08); поля §11.1 (тип бизнеса, официальный профиль) — нет |
| 9 | Портал/приватные маршруты noindex и tenant-safe | `NOT_VERIFIED` | Требует прогона по живому деплою |
| 10 | Клавиатура, скринридер, контраст, reduced-motion, 320–1440 | `NOT_VERIFIED` | Фокус-ловушка и Escape в меню реализованы; остальное требует браузера |
| 11 | Без регрессии Lighthouse/CWV к базовой линии | `NOT_VERIFIED` | Базовой линии не существует: CWV = `UNKNOWN` (аудит 17.08, D-07). **Базу нужно снять до W1, иначе «без регрессии» непроверяемо** |
| 12 | Нет ошибок консоли, битых картинок, мёртвых CTA, дублей title/H1 | `NOT_VERIFIED` | На 17.08 было чисто на проверенных маршрутах |
| 13 | Скриншоты каждого шаблона EN/RU, мобайл и десктоп | `NOT_STARTED` | — |
| 14 | Сборка, типы, юнит/интеграция/маршруты/ссылки/schema/браузер в CI | `PARTIAL` | 148 юнит-тестов, `validate-sitemap.mjs`, typecheck/lint/build уже есть; браузерных и schema-тестов в CI нет |

---

## Что должно произойти до старта W1

1. Владелец решает B-2 (палитра) — иначе токены закладываются вслепую.
2. Владелец решает B-1 (что именно продаётся в $49/$79) — иначе W3 переделывается целиком.
3. W0 снимает краулинг текущего сайта и матрицу редиректов (B-5) **и** базовую линию CWV (пункт 11), потому что без неё критерий «без регрессии» ничего не проверяет.
4. Правится B-4 — 10 минут работы.
5. Уточняется N-1 и N-2 в тексте ТЗ, до того как Codex превратит их в код.

Пункты 1–2 — не инженерные. Пока они открыты, любой написанный код — ставка на неподтверждённое решение.

---

## Границы этой проверки

Проверено статически: наличие маршрутов, публичные строки, источники цен, палитра, данные журнала, конфигурация навигации, тестовая инфраструктура, документы обоих репозиториев.

**Не проверено** (нет доступа к рендеру/сети в этой сессии): HTTP-статусы живого прода, реальные canonical/hreflang в отданном HTML, rich-results валидация, доступность в браузере, скринридер, Core Web Vitals, изоляция арендаторов в кабинете, поведение форм под нагрузкой. Всё это в матрице выше стоит как `NOT_VERIFIED` и обязано быть закрыто отдельным прогоном на превью-деплое до G8.

По правилу §21: ни один `NOT_VERIFIED` не засчитан как `PASS`.
