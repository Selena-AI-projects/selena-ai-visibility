# Claude independent verification — September 2026 Master Execution TZ v1.0

**Дата проверки:** 31 августа 2026, Бали
**Проверяемый документ:** `docs/site-tz/SELENA_SYSTEMS_SEPTEMBER_2026_MASTER_EXECUTION_TZ_V1.0.md` (статус в документе — `DRAFT FOR OWNER APPROVAL`)
**Проверено против:** `parkourcafe/selena-ai-visibility` @ `aac8a9e` (текущий HEAD `release/selena-visibility-mvp`), `parkourcafe/selena-ai-company` @ `453db49`
**Роль по §10 этого же ТЗ:** Claude Code — read-only verification, delta review, safety and contradiction checks
**Режим:** статический анализ. Провайдеры, Railway, staging и платежи не трогались. Ни одного provider call.

---

## Вердикт

# **APPROVE с шестью поправками. Ни одна не меняет структуру плана.**

Документ решает главную проблему, которую я зафиксировал в проверке сайта тремя часами раньше: он прямо ставит публичное перепозиционирование и изменение тарифов в **NO-GO до Gate G7**. Последовательность WP-00 → WP-01 → WP-02 (зафиксировать baseline → доказать фактическое состояние → построить capability matrix) — правильный порядок, и §17 верно называет первой задачей Codex не «переписать сайт».

Поправки ниже — про точность, а не про замысел. Три из них (M-3, M-4, M-5) проверены на текущем дереве и меняют оценку трудоёмкости WP-03.

---

## M-1 · Два разных URL-map в двух утверждённых документах · `правится одной строкой, но правится до WP-08`

Два документа, написанных с разницей в 13 минут, задают разную карту маршрутов:

| Master TZ, WP-08 (16:03) | Website TZ v1.0, §1.1 (16:16) |
|---|---|
| `/horeca` | `/hospitality-ai-visibility` + 4 вертикали (`/restaurants`, `/hotels`, `/villas`, `/spas`) |
| `/methodology` | `/how-it-works` |
| `/evidence` | — (нет такого маршрута) |
| — | `/data-sources` |
| `/automation` | `/ai-automation` |

По существу выигрывает Website TZ: он написан позже, объявляет себя «normative target for public information architecture», а таблица в Master TZ прямо помечена «draft». Но **нигде это не записано**, а §2 Master TZ задаёт precedence только для S1–S5 и себя, не для Website TZ.

Пока строки нет, Codex получает два маршрутных плана и выберет тот, который откроет первым.

**Правка:** в §2 Master TZ добавить Website TZ v1.0 как S6 с областью «public IA, copy, website acceptance», а таблицу WP-08 пометить superseded by S6 §1.1.

## M-2 · «Production GO» в конце Website TZ читается как разрешение публиковать · `формулировка, но дорогая`

Website TZ §20 заканчивается фазой W6 со словами `Production GO`. Master TZ §5 и §11 ставят публичный релиз в NO-GO до G7 (3–5 comparable cycles + unit economics + owner approval).

Формального противоречия нет — W6 означает готовность сайта, G7 означает коммерческое разрешение. Но «Production GO» последней строкой подробного плана исполнения — это ровно та фраза, которую исполнитель прочитает как «дошли до конца таблицы, можно выкатывать». Разница между двумя документами тут не в правилах, а в том, что одно слово стоит в позиции финиша.

**Правка:** в Website TZ §20 переименовать исход W6 в `Release-ready · вход в G7` и сослаться на Master TZ §11.

## M-3 · Аудированный snapshot отстал на девять коммитов, и пять из них — про ту самую область · `первый шаг WP-01`

Шапка Master TZ фиксирует аудит на `0d1f21ed5757…`. Текущий HEAD `release/selena-visibility-mvp` — `aac8a9e`. Между ними девять коммитов:

```
193f991  Merge PR #91 fix/perplexity-trigger-contract
f695996  Route Perplexity through trigger contract
78d133f  Merge PR #90 fix/perplexity-run-safety
4cd8e29  Align web measurement queue lease
3c5b4e3  Enforce Perplexity run safety
6c2e487  Merge PR #89 fix/perplexity-answer-section-sources
c0898f8  Recover Perplexity answer section sources
bbd762e  Merge PR #88 fix/perplexity-queue-policy-recovery
5eeb4aa  Reconcile Perplexity queue timeout
```

Пять из девяти касаются queue, lease, timeout, run safety и trigger contract — то есть **ровно той области, где §7 фиксирует `CONFLICT` по количеству attempts**. Строка «Current adapter допускает до 4 attempts» описывает дерево, в котором Codex работать не будет.

§7 сам этого требует («Проверить фактический current HEAD»), WP-00 сам этого требует («записать фактический baseline SHA на момент старта») — поэтому это не дефект документа, а первая задача, которую нельзя пропустить: **переснять reconciliation на `aac8a9e` до того, как WP-03 начнёт «приводить к max 3 attempts»**.

## M-4 · Три пункта WP-03 написаны как «проверить», а проверять нечего · `меняет оценку пакета`

Проверено на текущем дереве:

| Объект WP-03 | Формулировка в ТЗ | Факт на `aac8a9e` |
|---|---|---|
| `sv_measurement_attempts` | «Реализовать/проверить» | **Отсутствует.** Ни таблицы, ни одной ссылки в `packages/lib/src`, `apps/worker/src` |
| `sv-grid-sphere-v1` | «Проверить grid formula: 5×5, radius 3000 m, 25 points, ROUND_HALF_UP, UUIDv5» | **Идентификатора формулы нет.** Grid-слой существует под именами Visibility OS — `visibility-map.ts`, `local-cycle-matrix.ts`, `schema-visibility-os.ts` — со схемами точек и UUID, но без версии формулы и без указанных констант |
| `LOCAL_MAPS` domain | «LOCAL → LOCAL_MAPS transactional backfill» | **`LOCAL_MAPS` в коде отсутствует** — нечего backfill'ить под этим именем |
| `LOCAL_AI` domain | «добавить LOCAL_AI domain, если это ещё не применено» | **Уже есть и уже жёстко закрыт**: `local-discovery.ts` — `LOCAL_AI_DISCOVERY_POLICY`, `status: "MANUAL_ONLY"`, `backendExternalCallsAllowed: false`, `placesApiAllowed: false`, плюс тесты |

Первые три — это «построить», а не «проверить», и разница здесь в днях, а не в формулировке. Четвёртый — наоборот: требование §4.3 и §11 STOP по автоматическому Local AI **уже выполнено в коде** и его надо снять из работ, а не планировать заново.

Отдельно: grid существует под именами Visibility OS, а Visibility OS имеет собственный статус (`SELENA_VISIBILITY_OS_ACCEPTANCE_GATES_V2.md` — `APPROVED 2026-08-28`, при этом M0 в PR #48 не влит). До того как WP-03 начнёт править grid, надо решить, чей это слой: Local Delta v1.2.1 или Visibility OS. Два владельца у одной сетки — это следующий CONFLICT в §7.

## M-5 · Строка §7 про attempts подтверждается; вот точный адрес · `экономит Codex полдня`

`retryLimit` в очередях на текущем дереве:

| Файл | Что стоит |
|---|---|
| `apps/worker/src/index.ts:44, 51, 64, 92` | `retryLimit: 3` |
| `apps/worker/src/index.ts:58, 86` | `retryLimit: 1` |
| `apps/worker/src/index.ts:75, 82` | `retryLimit: 0` |
| `apps/worker/src/jobs/process-prompt.ts:60` | `retryLimit: 0` — с комментарием, объясняющим почему именно так |

То есть требование WP-03 «generic queue retryLimit=0» адресовано конкретно регистрации очередей в `index.ts`, а не адаптеру, и один правильный образец в репозитории уже написан и прокомментирован. `brightdata.ts:284` с `maxAttempts = 60` — это цикл опроса снапшота, не попытки замера; его нельзя трогать этим требованием, иначе сломается polling.

## M-6 · OD-03 без суммы блокирует G1, и рядом стоит второй незакрытый потолок · `решение владельца`

§16 честно пишет про canary budget: «конкретные суммы не поддержаны источниками; заполнить owner». Но acceptance WP-02 требует «количество provider calls точно совпадает с owner-approved canaries» — значит **без суммы WP-02 не может стартовать**, а G1 не может быть пройден. Это единственный PENDING, который держит критический путь: WP-04, WP-06 и WP-09 стоят за ним.

Рядом уже год стоит второй такой же: `SELENA_SUGGEST_BUDGET_USD` описан в `SELENA_ANONYMOUS_FUNNEL_PLAN.md` как «сейчас **не выставлен** — стоит выставить до открытия». Обе суммы — одно и то же решение одного человека про один и тот же риск (трата без владельца). Их стоит принять вместе, одним Owner Decision Record из D-00.

---

## Что этот документ подтвердил из прошлой проверки

**B-1 подтверждён независимо.** В проверке Website TZ я писал, что карточки $49/$79 продают Maps, Reviews и Social, которых нет в утверждённом каталоге. Master TZ §7 приходит к тому же с другой стороны: тринадцать datasets — `CONFIGURED_ONLY`, «код не читает их и request path не доказан», а §5 добавляет прямым текстом: «Настроенная переменная окружения или Dataset ID означает CONFIGURED_ONLY. Клиенту нельзя показывать это как доступную функцию». Два независимых документа, один вывод — эти строки из прайса уходят до G3/G4/G5.

**B-3 снимается как дефект.** Отсутствие данных AVLI — не пробел, а расписание: WP-06, окно M4, 14–24 сентября. Правило остаётся одно: блок Proof на сайте не публикуется раньше, чем WP-06 закроется по своему acceptance (100% findings с evidence ID, 0 fabricated facts).

**B-2 (палитра) этот документ не закрывает.** Ни Master TZ, ни Website TZ §14 не объясняют, почему целевая палитра navy/blue/cyan расходится с живым ivory/copper и с `DESIGN.md` кабинета. Решение владельца остаётся открытым, и оно нужно раньше, чем WP-08 дойдёт до wireframes.

---

## Границы этой проверки

Проверено статически: baseline SHA и содержимое коммитов после него, наличие/отсутствие `sv_measurement_attempts`, `LOCAL_MAPS`, `LOCAL_AI`, grid-слоя и формулы, значения `retryLimit` во всех регистрациях очередей, статус Visibility OS, согласованность двух ТЗ между собой и с каталогом RC6.

**Не проверено:** фактическое состояние staging и production на Railway, наличие 13 dataset-переменных в окружении (утверждается со слов владельца — в коде их действительно не читают, это я подтверждаю, но само наличие переменных проверить не могу), реальные счета провайдеров, применённость миграций на живой базе, RLS в рантайме.

Ни один непроверенный пункт выше не засчитан как подтверждённый.
