# T-SEL-01 — падение /app/selena-admin (#201): состояние на staging

Задача из очереди координатора (`Selena-AI-projects/selena-OS`, ветка
`claude/consolidate-services-single-domain-040sci`, `docs/ops/autonomy/QUEUE.md`).
Здесь только проверка развёртывания. Очередь не редактировалась.

| Поле | Значение |
|---|---|
| Репозиторий / база | `selena-ai-visibility`, `release/selena-visibility-mvp` @ `39dda8f` (merge #201) |
| Статус | DONE_CODE, TESTED_LOCAL (из #201) + **развёрнуто на staging**; VERIFIED_STAGING — нет |
| Проверено 2026-09-27 | CI #201: 8 из 8 зелёные — Build (включая guard на `getTypeParser` в браузерных ассетах), E2E ×2, Scheduling Policy, smoke, license, CLA |
| | Railway staging: `web` и `worker` развёрнуты из `39dda8f`, статус SUCCESS, 19:23 и 19:24 UTC |
| | HTTP-лог staging `web` с 19:23 UTC пуст: после деплоя страницу никто не открывал |
| Не проверено | Рендер `/app/selena-admin` в браузере на staging |
| Блокер | BLOCKED_EXTERNAL: `*.selenasystems.com` закрыт egress-политикой этой сессии (403 от прокси); входа оператора нет; чтение deploy-логов staging отклонено классификатором прав |
| Следующий шаг | Владелец открывает `/app/selena-admin` на staging. Страница с данными заказов без экрана «Something went wrong» → VERIFIED_STAGING |
