# T-SEL-06 — Review/SMS: найти и проверить

Задача из очереди координатора (`Selena-AI-projects/selena-OS`, ветка
`claude/consolidate-services-single-domain-040sci`). Очередь не редактировалась.

| Поле | Значение |
|---|---|
| Статус | NOT_FOUND → BLOCKED_DECISION |
| Базы поиска (2026-09-27) | `selena-ai-visibility` @ `39dda8f`, `SELENA-AI-COMPANY` @ `2fab794`, `selena-OS` @ `b437efc` |

## Где искали

| Где | Как | Результат |
|---|---|---|
| Код и документы трёх репозиториев | `git grep -i` по `sms`, `смс`, `twilio`, `review request` | SMS-кода нет. Совпадения только в названиях медиафайлов сайта и в маршрутах `canary-review` / `report` Local Maps: это проверка отчёта оператором, не отзывы |
| PR организации | поиск `SMS org:Selena-AI-projects` | 0 |
| Ветки | имена по `sms`, `review`, `reput` | `codex/visibility-os-m3-search-reputation`: схема замеров Search/Reputation в `_pending-os/M3_search_reputation.sql`, не слита; SMS и отправки нет. `fix/content-review-flow` в selena-OS — редакционный review Content OS |

## Что нужно от владельца

Где описан Review/SMS? Варианты: другой репозиторий, документ или решение, которое ещё не превращено в задачу. Без спецификации проверять нечего. Строить функцию с нуля — это новая задача, а не проверка.
