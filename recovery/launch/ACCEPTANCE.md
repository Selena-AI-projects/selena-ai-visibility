# Приёмка перед запуском: обещания сайта и продукт

Шаг 2 из 4, 2026-09-27. Каждое обещание из `PROMISES.md` сверено с кодом. Код только читался: ничего не запускалось и не тратилось. Колонку «staging» заполнит живая проверка (шаг 3).

Статусы:
- ✅ есть в продукте;
- 🟡 есть частично или с оговоркой;
- ❌ в продукте нет;
- 👤 делает человек, продукт этого не делает;
- ⏸ сознательно выключено.

Пути:
- `site:` — SELENA-AI-COMPANY, ветка main;
- `app:` — selena-ai-visibility, ветка release/selena-visibility-mvp.

## Где сейчас работает кабинет

- `app.selenasystems.com` и `staging.selenasystems.com` ведут на один и тот же сервис: web в окружении **staging**.
- В production-окружении Railway есть только база Postgres (с 2026-08-15). Web и worker там нет.
- Клиент, который зайдёт в кабинет сегодня, попадёт в тестовую среду.

## Что сейчас выключено на staging

Railway отдаёт только имена переменных, без значений. Поэтому состояние определено по логам и по списку имён.
- **Платные вызовы провайдеров остановлены.** Сервис `measure` при деплое 2026-09-27 07:41 UTC записал `PROVIDER_CALLS_STOPPED`: включён аварийный стоп.
- **Регулярных замеров нет.** Воркер при старте пишет `Recurring scheduler disabled`.
- **Ручной Local AI (Ask Maps) выключен.** На web не заданы `LOCAL_AI_DISCOVERY_ENABLED` и `ASK_MAPS_MANUAL_PILOT_ENABLED`, поэтому его маршруты отвечают 404.
- **Токена Telegram-бота на web нет.**

## Бесплатно: Public Readiness (/check)

Проверка идёт внутри самого сайта, без базы и очереди (`site: app/api/checks/route.ts`).

| # | Статус | Как на самом деле | Где в коде |
|---|---|---|---|
| P1 | 🟡 | Карта и вход не нужны. Фраза «без платных вызовов AI-провайдеров» неверна: пояснение к результату пишет OpenAI. Это включено в production решением D-034 и стоит около $0.00035 за вызов. | `site: lib/visibility/explanation/resolveExplanation.ts:76`, `lib/commercial-facts.ts:123` |
| P2 | 🟡 | Лимит в 5 страниц есть. Текст спорит сам с собой: EN:346 «меньше чем за минуту», EN:21 «несколько минут». | `site: lib/visibility/crawler/discover.ts:69` |
| P3 | ✅ | Все заявленные измерения есть. llms.txt имеет вес 0. | `site: lib/visibility/readiness/publicReadiness.ts:20-28`, `lib/visibility/readiness/ruleRegistry.ts:217-219` |
| P4 | 🟡 | Список исправлений есть. «1 повторная проверка» держится только в браузере: после перезагрузки страницы можно проверить ещё раз. | `site: components/visibility/VisibilityCheckForm.tsx:101-127` |
| P5 | ✅ | Есть полный аудит, план исправлений, .md и prompt для агента. PDF — через печать браузера. | `site: components/visibility/LiveReportView.tsx` |
| P6 | 🟡 | Лимит 5 запусков в час с адреса хранится в памяти одного сервера. На Vercel у каждого экземпляра свой счётчик, холодный старт его обнуляет. | `site: lib/visibility/security/rate-limit.ts:10-28` |
| P7 | ✅ | Сказано явно. | EN:316, 375, 447, 553 |
| P8 | ⏸ | На сайте скрыто: `CLIENT_PORTAL_ENABLED = false` прописан в коде. Продуктовая часть готова: миграция 0067, общий лимит $10, по одному разу на пользователя и на домен, замер через Bright Data. | `site: lib/visibility/routes.ts:24`; `app: apps/web/src/server/selena-free-ai-visibility.ts` |

## $49/мес Visitor Snapshot

Как клиент сейчас получает замер:
1. Оставляет заявку в кабинете.
2. Оператор собирает заказ в `/app/selena-admin` и записывает тестовую оплату.
3. Оператор одобряет заказ и ставит его в очередь.

Онлайн-оплаты нет.

| # | Статус | Как на самом деле | Где в коде |
|---|---|---|---|
| P9 | 🟡 | ChatGPT и Gemini работают через Bright Data, Perplexity — через DataForSEO (режим `branch-c` или `auto`). У Bright Data для Perplexity 4 сентября было 2 валидных ответа из 10. Сейчас всё остановлено аварийным стопом. Юридический вопрос — см. блокер 4. | `app: packages/selena-visibility-contracts/src/measurement-execution.ts:69-93`, `apps/worker/src/jobs/selena-measure.ts:97-166` |
| P10 | 🟡 | Лимит 25 вопросов и 1 повтор проверяются. Число языков не проверяется: функция проверки (`validateCatalogScope`) есть, но её никто не вызывает. Сейчас за этим следит оператор. | `app: apps/web/src/server/selena-order-desk-core.ts:344-351`, `packages/selena-visibility-contracts/src/catalog.ts:317` |
| P11 | ✅ | Ответы, упоминания, средняя позиция. | `app: packages/lib/src/selena-answer-extraction.ts`, `packages/lib/src/selena-grader-report.ts:270` |
| P12 | ✅ | Таблица «назван конкурент, а вы нет». | `app: packages/lib/src/selena-grader-report.ts:290-310` |
| P13 | ✅ | Цитируемые домены и проверка своего сайта. | `app: packages/lib/src/selena-grader-report.ts:325-356` |
| P14 | ✅ | Три типа автоматических рекомендаций. | `app: packages/lib/src/selena-grader-report.ts:73-76` |
| P15 | 🟡 | Сравниваются два последних замера. Автоматических повторов нет: каждый повтор — новый заказ оператора. Сайт честно пишет «регулярные замеры ещё не включены». | `app: apps/web/src/server/selena-cycle-compare.ts:36-43` |
| P16 | ⏸ | Таблицы доставки и сборка дайджеста готовы (PR #192, #197). Подключения бота и отправки нет. Сайт пишет «после активации доставки». | `app: packages/lib/src/selena-weekly-digest.ts` |
| P17 | ❌ текст | RU называет тариф «ежемесячным мониторингом», а регулярного мониторинга нет. | `site: lib/commercial-facts.ts:141` |

## $79/мес Full Discovery Landscape

| # | Статус | Как на самом деле | Где в коде |
|---|---|---|---|
| P18 | ✅ | Claude, DeepSeek, Qwen, Mistral и Grok идут через OpenRouter, без веб-поиска. Visitor View и API View в отчёте раздельные. Работает только в режиме адаптера `auto`. | `app: packages/selena-visibility-contracts/src/catalog.ts:13-19`, `packages/lib/src/adapters/openrouter-measurement-adapter.ts` |
| P19 | 🟡 | Лимит 50 сценариев (25 × 2 языка). Число языков не проверяется, поэтому 50 вопросов на одном языке тоже пройдут. | `app: apps/web/src/server/selena-order-desk-core.ts:347` |
| P20 | 🟡 | Автоматический замер Google Maps существует как отдельный процесс оператора (флаги `SELENA_LOCAL_*`). К тарифу $79 он не привязан: `entitlementsFor` никто не вызывает. Проверки на уровне production ещё не было, поэтому по условию сайта в тариф он пока не входит. | `app: apps/web/src/routes/_authed/app/selena-local-maps/$cycleId.tsx`, `packages/selena-visibility-contracts/src/catalog.ts:98` |
| P21 | 🟡 | Список конкурентов и «где вы проигрываете» есть. Разбивки «выигрываете / проигрываете / отсутствуете» по намерению гостя нет. | `app: packages/lib/src/selena-grader-report.ts:290-310` |
| P22 | 🟡 | Источники те же, что в $49. Проверки «паттерны между системами» нет. | — |
| P23 | ❌ | Расширенных рекомендаций нет. Отчёт не знает тариф, правила одинаковые для $49 и $79. | `app: packages/lib/src/selena-grader-report.ts` |
| P24 | ❌ текст | RU-описание не говорит, что Visitor View и API View в отчёте раздельные. | `site: lib/commercial-facts.ts:158` |

## $399: Verified Discovery & Competitive Audit

Это работа людей. Продукт даёт замер, отчёт и Evidence Ledger, остальное делает аналитик.

| # | Статус | Как на самом деле | Где в коде |
|---|---|---|---|
| P25 | 👤 | Конкуренты вводятся свободным текстом в профиле, лимита 3–5 нет. Сессию назначают вручную: кнопки на сайте ведут в Telegram, WhatsApp и email. | `app: apps/web/src/routes/_authed/app/selena.tsx`; `site: components/visibility/DiscoverySales.tsx:134-174` |
| P26 | 👤 | Инструментов аналитика для страниц, Maps и отзывов нет. В админке можно только читать ответы. | `app: apps/web/src/routes/_authed/app/selena-admin.tsx:392` |
| P27 | 🟡 | Ручной Local AI есть только как API: задача → наблюдение со скриншотом → проверка → результат клиенту. Экранов нет ни у аналитика, ни у клиента. На staging выключен. | `app: apps/web/src/routes/api/v1/selena/pilot/`, `apps/web/src/routes/api/v1/selena/local-scan-cycles/$cycleId/ai-results.ts`, `apps/web/src/lib/selena-pilot-gate.ts` |
| P28 | 👤 | Есть только текст. | `site: lib/visibility/sales.ts:190` |
| P29 | 👤 | Action Plan пишет человек. Генератор в коде выдаёт две шаблонные рекомендации, 11 полей и 3 классов в нём нет. | `app: packages/lib/src/recommendation-engine.ts:120-151` |
| P30 | 🟡 | Сравнение двух замеров есть. Права «одна перепроверка за 30 дней» в продукте нет: это новый заказ, срок отслеживает оператор. | `app: apps/web/src/server/selena-cycle-compare.ts` |
| P31 | 👤 | Анкеты перед сессией нет. Перенос и неявку ведёт человек. | `site: app/api/leads/route.ts:15-21` |
| P32 | 👤 | Есть только текст условий. | `site: lib/visibility/sales.ts:201` |
| P33 | 👤 | Есть только текст. | `site: lib/visibility/sales.ts:392` |

## $2,490 / 90 дней: Managed Discovery Growth

| # | Статус | Как на самом деле | Где в коде |
|---|---|---|---|
| P34 | 👤 | Внедрение по Action Plan делают люди. | — |
| P35 | 🟡 | Цепочка замера есть, повторы запускаются вручную. Живые замеры пока были только на staging. | `app: apps/web/src/components/selena-order-desk.tsx`, `apps/web/src/server/selena-admin-orders.ts` |
| P36 | 🟡 | Как P27: только API, без экранов. | — |
| P37 | 🟡 | В кабинете есть `/app/selena`, `/app/selena-report`, `/app/selena-sources`, `/app/selena-local-maps/$cycleId`. Telegram — как P16. | — |
| P38 | 🟡 | Сравнение циклов есть. Итоговый обзор «до и после» пишет человек. | `app: packages/lib/src/selena-cycle-diff.ts` |
| P39 | 🟡 | Потолок затрат есть: лимит заказа, `SELENA_PROVIDER_BUDGET_USD` и бюджет в журнале трат. Число циклов в продукте не задаётся. | `app: packages/lib/src/selena-preflight.ts`, `apps/web/src/server/selena-admin-orders.ts:112-117` |

## Для всех тарифов

| # | Статус | Как на самом деле | Где в коде |
|---|---|---|---|
| P40 | ✅ | Онлайн-оплаты нет: live-платёж код отклоняет. Заявки с сайта уходят в Telegram или webhook, заявки из кабинета — оператору во входящие. Сама заявка ничего не запускает. | `app: packages/selena-visibility-contracts/src/payment.ts:16-20`; `site: app/api/leads/route.ts` |
| P41 | 🟡 | Кабинет работает на staging (см. выше). Регистрация закрыта: либо один пользователь, либо список адресов с лимитом мест. Инструмента «создать организацию клиента» нет, оператор должен сам состоять в организации клиента. | `app: apps/web/src/lib/auth/server.ts:50-85` |
| P42 | ⏸ | Как P16. Сайт честно пишет, что это «не обещание живой доставки». | — |
| P43 | ✅ | Неизвестное показывается как «неизвестно», а не 0. | `app: packages/lib/src/selena-grader-report.ts`, `packages/lib/src/selena-cycle-diff.ts:117-121` |
| P44 | 🟡 | Записываются версии каталога, экстрактора и rulepack. Версий методологии, набора вопросов и скоринга нет. Блок `methodology` в отчёте версии не показывает. | `app: apps/web/src/server/selena-order-desk-core.ts:408-417`, `packages/lib/src/selena-grader-report.ts:368` |
| P45 | ✅ | Ничего из этого сайт не обещает. | — |

## Предварительный вывод (до живой проверки)

### Без этого нельзя брать деньги (не код)
1. Не подтверждено юрлицо продавца. Оплата на паузе.
2. Не опубликованы условия оплаты, продления и возврата и политика конфиденциальности. Сами terms обещают опубликовать их до включения оплаты.
3. Нет платёжного провайдера.
4. Не решён юридический вопрос по Visitor View:
   - условия Perplexity и OpenAI запрещают автоматический сбор ответов и обход защиты;
   - у Gemini `robots.txt` закрывает `/app/`.

   В `HANDOFF.md` это записано как решение владельца вместе с юристом. От него зависят весь тариф $49, половина $79 и часть аудита $399.

### Инфраструктура
5. Production-кабинета нет. Нужно:
   - поднять web и worker в production;
   - применить миграции к production-базе;
   - перевести на production `app.selenasystems.com`.

   Всё это только с отдельного разрешения владельца.

### Исправить текст сайта
- R1, R2, R3 из `PROMISES.md`.
- P1: «без платных вызовов AI-провайдеров», хотя пояснение пишет OpenAI.
- P2: «несколько минут» против «меньше чем за минуту».
- P17: «ежемесячный мониторинг» в $49.
- P23: «расширенные рекомендации» в $79 — сделать или убрать.
- P24: в RU-описании $79 не сказано, что Visitor View и API View раздельные.

### Небольшие доработки кода
- Проверять число языков в заказе (P10, P19).
- Лимиты бесплатной проверки (P4, P6) держать в общем хранилище или смягчить текст.

### Что можно продавать с ручной работой после пунктов 1–3 и 5
- **$399 Audit.** Замер, отчёт и Evidence Ledger даёт продукт. Action Plan, сессию, анкету и Ask Maps делают люди.
- **$2,490 Managed.** Так же, в рамках согласованного scope.

Тарифы $49 и $79 зависят ещё от пункта 4 и от живой проверки (шаг 3).
