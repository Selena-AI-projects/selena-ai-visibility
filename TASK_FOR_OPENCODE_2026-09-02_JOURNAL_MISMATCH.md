# Задача OpenCode: расхождение истории миграций на staging

Составлено 2 сентября 2026, 08:20 по Бали. Все факты — из логов Railway и кода
ветки `release/selena-visibility-mvp`; предположения помечены как предположения.

## Симптом

Сервис `migrate` (`cfedff9a-d176-4f08-a2c9-8d6d04504df4`, проект
`51dd0770-e622-4734-a705-ace401234bb8`, окружение staging
`90f3bf7f-5e53-4de3-a3f7-56052b706f24`), деплой
`e70d7c54-a952-4788-bc8d-85ee1dcececf`, 2026-09-02T00:03:07Z:

```
prepared 54 migrations through index 53 in bounded runtime bundle
connecting with TLS verified against SELENA_RUNTIME_DATABASE_CA_PEM
journal before: 54/1787940015000
migration failed: SELENA_MIGRATION_JOURNAL_MISMATCH
drizzle-orm migration runner exited with code 1
```

## Почему это всплыло только сейчас

Этот деплой — **первый, собранный из настоящего GitHub-источника**: у него есть
`commitHash 330bab2a991cd2864756a3e1ca4083981e9d7356` и ветка
`release/selena-visibility-mvp`. Все предыдущие деплои `migrate` имели
`repo: null, commitHash: null` — они собирались из загруженных снимков локального
кода (`railway up`). Прогон в 2026-09-01T18:00Z прошёл успешно именно потому, что
сверял хеши против файлов того же снимка.

Отсюда рабочая гипотеза: **на staging применены миграции, чей SQL отличается от
того, что лежит в git**. Проверка `assertJournalPrefix` из PR #104
(`packages/lib/scripts/apply-migrations.mjs`) впервые сверила журнал с
репозиторием и нашла несовпадение.

Известное и уже узаконенное исключение — `0045`: staging применил вариант из ветки
PR #96, и в `APPLIED_MIGRATION_HASH_ALIASES` для него прописан один
отрецензированный хеш `3b3915803095bf23f8e8b2e70134bfd71a7774d2793bf40f2e0a0bd03b1c051b`
при каноническом `321e6633…`. Значит расходится что-то ещё.

## Что нужно сделать

1. Снять из базы фактические хеши:

```sql
select created_at::text as created_at, hash
from drizzle.__drizzle_migrations
order by created_at asc;
```

   База — сервис **`Postgres`** (`280e3b59-77c3-46e0-8c2c-75955b7f9a40`), НЕ
   `Postgres-selena-v13-restore-20260901`.

2. Сверить построчно с эталоном ниже и назвать поимённо каждую миграцию, чей хеш
   в базе не совпадает с файлом ветки.

3. По каждому расхождению — решить и обосновать:
   - если различие косметическое (тот же смысл, другой текст) — добавить ещё один
     отрецензированный хеш в `APPLIED_MIGRATION_HASH_ALIASES` тем же приёмом, что
     уже применён для `0045`, с комментарием, откуда взялся вариант;
   - если разошлась суть — установить, какая схема реально в базе, и привести
     репозиторий в соответствие отдельной forward-only миграцией.

   Проверку хешей **не ослаблять** «оптом»: она только что доказала свою пользу.

4. Отдельная поломка, из-за которой потеряно несколько часов: **правки переменных
   не доезжают до контейнеров**. В интерфейсе `SELENA_MIGRATION_MAX_INDEX` = 54, а
   раннер прочитал 53 (`prepared 54 migrations through index 53`). Вчера то же
   было с `SELENA_JOURNAL_FORCE`: значение `1` в интерфейсе, а код видел иное.
   Понять механику (staged changes? кеш снимка переменных при деплое?) и описать
   владелице надёжный порядок действий.

## Эталон: хеши файлов ветки release/selena-visibility-mvp

Формат: `idx | when | sha256(файла) | tag`. Считано локально из
`git show release/selena-visibility-mvp:packages/lib/src/db/migrations/<tag>.sql`,
той же формулой, что и в `expectedJournalRows`.

```
 0 | 1770853000310 | 041ee58e46b4646eb9f230447cfc8be7db57593bc7fcd749aa644ef1a886ae59 | 0000_hot_excalibur
 1 | 1771495206934 | 592bf65cb2d585bcd693c35d1963e4e4f28e1e88257fa01721f78534da8ea16c | 0001_sturdy_ares
 2 | 1773081311430 | 420a6c278d51cd31521fc45a71b82eed99fc410b667d4d7d4f0367be3adfab79 | 0002_legal_ultimatum
 3 | 1773081457906 | 33372c33bfd599485bde1369aba150b529be620587dd549e8d36b9a4bcc3c3af | 0003_phase3-constraints-and-indices
 4 | 1773100369290 | 7ffce75dc5fe3163c883ecfabbd2bebfba38d7e0e185ffa78694282c1bd3d1de | 0004_nebulous_gunslinger
 5 | 1773125217919 | 0659babc1857218f4c3cbc89f40eb47f9c28ec0b4875145364d044e0cb9f5cb8 | 0005_known_warhawk
 6 | 1773200000000 | 573abe8fc9711a84f0b7ce1bf533b6494afce5f641144cfe2ec4bd1f5b860d68 | 0006_multi_domain_aliases
 7 | 1775800000000 | c76cb4a13366a3b9a5470927570463d4baabe5e73526d5e1af9a0138ea9f9a60 | 0007_report_progress
 8 | 1776000000000 | 3f7fb9bc9331d00010a07d785426eff55793df96d618b55c5ae84ee8fb18c4c6 | 0008_provider_engines
 9 | 1780782746840 | 7a5105f1a2c0fd58f06ec795b01d34132e2d65315404dc4ef47f365136a11772 | 0009_brand_opportunities
10 | 1784000000000 | 3787a076245eee6e357ba3fbf717f7648e403df14b4a3f404ed82cf0fc8220f7 | 0010_scope_brands_to_orgs
11 | 1785181564412 | 43e1e38d6e98aee7c6303b15b806e87f9b18a1377fd91f8cf792157c45253d54 | 0011_secrets
12 | 1785900686908 | 805cd9274f5ef82caa7fbc7848d99c2a6cbee753a32687e585cb02b8874f7218 | 0012_billing_foundations
13 | 1785954515007 | 12a7df86d52b3e89031d9f60bf70d0196e69d29950d03d84c254e345a6005c06 | 0013_usage_events
14 | 1786004156368 | 8166e8b4258e17dd2afeb981cd99aaf51fb9fa3767bb2800d8c449901c4a91bb | 0014_membership_uniqueness
15 | 1786724700000 | 8016a092e4ca574316bbda3df593972879760ec89b01251f6b75cd78dd5296fa | 0015_selena_visibility_client
16 | 1786725600000 | 47e5bfb3152ef9effd33471986166419c0d8b4f48e33f72bb18e403147edaaa5 | 0016_selena_scan_findings_payments
17 | 1786726200000 | 111e2f1925a08eae5f469b984a90e2b049ad5cfa384b94792febd39b08c53a52 | 0017_selena_project_profiles
18 | 1786726800000 | b082ba258d04aca5da313983a0e878547d50e2fa171f261b897101edfc446b03 | 0018_selena_measurement_runs
19 | 1786727400000 | 8c1044333172c647f8cbd8ebb7103d88699a1e36755fae9b708c24c6f78550a4 | 0019_recommendation_engine
20 | 1786728000000 | 49902bcfaa09c6ab06cd65cc5d4bfe9687017a410d9012dc1c7ba9a934e8d048 | 0020_selena_website_snapshots
21 | 1786728600000 | b639a9522b3e1b2b9791c1bd38ba056006b3360edb4b99025cb011f3a6540a9e | 0021_selena_local_discovery_entities
22 | 1786729200000 | da62fff784382e8600656c087c880127dba8394e52c6c22fa276b952569313cf | 0022_selena_manual_pilot
23 | 1786729800000 | 0735530f78c8f581aad9ee6078986d360f79151f67045edd9ec642ae03e100a3 | 0023_selena_dispatch_qc
24 | 1786730400000 | c661c625cc6e502ba7b0bd4a96fa0ed3e1bf82db0d5f38287ccfb0899231897a | 0024_selena_run_outcomes
25 | 1786816800000 | b8cad92d3620ad1f54f44fb5e2e38a30feae85ea06c137532e6a4f417a7dedcc | 0025_selena_run_measurement
26 | 1786903200000 | 734a0c2befcc2b2091b013844b4b1b2312af08434feeb3e22fbc1ef02f5c9300 | 0026_selena_incidents_cost_ledger
27 | 1786989600000 | f175f7f7945aeaa717967ea589d55333e77dba05daec9e8bca7cf5b259d239b0 | 0027_selena_permit_system_id
28 | 1787076000000 | 6f09e2ec9c0072aff11860e4c1a525b7d0a36617e0672c75ed622336a3043b56 | 0028_selena_response_mentions
29 | 1787162400000 | d7b5333ac7437524e7ffaa8d3b0b6ca3a6111c66167580ea372ff1f637254d71 | 0029_selena_citation_gap_snapshots
30 | 1787248800000 | 84da33ada2a58c61ba1f6beedb990c3ce9c5a3ec6e32482ce9738741e3a7c5f4 | 0030_selena_capture_mode
31 | 1787335200000 | 460c9e90a0f6ca8ea77185c723c95a50d4022a41d39e1d7cb98eeaaa74cc9ea2 | 0031_prompt_run_hourly_aggregates
32 | 1787421600000 | c2a0034ca92b457f1f11276e65945e0631b19090f0b9314ed542c6bb8f327d25 | 0032_suggest_cost_metering
33 | 1787508000000 | 68de3ef7f8c0a5c5aa68ce3e375b59adc6c42cde3a7609250e143d192020253e | 0033_reports_organization
34 | 1787594400000 | d300f78e67c7787289743bbd63d7aa7f31a5f689a1b0af132b8ab22cba794f37 | 0034_tenant_rls_policies
35 | 1787680800000 | 9321be3d0c9c4ea25f62d04a73a689b4252be2009dafd4a6df0344703ebd9175 | 0035_selena_profile_maps_location
36 | 1787767200000 | 784e113ace02c7144b2240da1d531a01a7af99a7a2613367f7c149d9a9d096d0 | 0036_selena_order_requests
37 | 1787853600000 | 358e537c2d7a55911abdd0d5e6a74a473f7d68019df642a82950ae59aac9012c | 0037_visibility_os_measurement_registry
38 | 1787940000000 | e8f5b106bbb89e677c50618e7055617dea346d5ab091fba04818fe4f1d5eaeb9 | 0038_visibility_os_local_visibility
39 | 1787940001000 | d5c6b7e74ab4b979eb03719093e91f9984e884d86762b95a6c8f4fc74df502ba | 0039_visibility_os_search_reputation
40 | 1787940002000 | 61b7341dc5460b4f634cf1e181be501a44a224bd9a8bc3719210dfd02d883485 | 0040_visibility_os_action_evidence_loop
41 | 1787940003000 | 679742ce83222bb33a7052e1ffbc2a14f525c3fa20f13f1d7a356295e1e784ce | 0041_visibility_os_visibility_map
42 | 1787940004000 | afb387c846f1eb81a18514960aa64116ef3a2135dc226e679d90fd44bcc22915 | 0042_visibility_os_outcome_layer
43 | 1787940005000 | ceb19abb858340384f8241a7fd75b71a8783e70fc5d37db5c223974c2dc399b8 | 0043_visibility_os_local_domain_attempts_expand
44 | 1787940006000 | e88a59323270982fdd5b8a87bdfd244a8a1ebaad4aebe5be62dffee83e59deff | 0044_visibility_os_local_live_persistence
45 | 1787940007000 | 321e66332583c968a582525470460e000b1788c1a524d24d80d5e4a90c622fec | 0045_visibility_os_domain_and_lock_hardening
46 | 1787940008000 | ed9ca2f670203ae04dfd3d8c221906650823c440f5eda01f603f3298ca5319a7 | 0046_selena_journal_daily_claims
47 | 1787940009000 | 2a9dadf9981f996a0f459f40f69842e2b3071654dada49b7f3853e56317776da | 0047_visibility_os_local_attempt_count_cap
48 | 1787940010000 | dff15a8e06f8a46386e43dab320706c123b71b8e841a6f302359bffa1e85a05c | 0048_selena_api_idempotency_records
49 | 1787940011000 | bddf094b7e1aa018fcc098800bb55c241312a0761ee690bf95b6386422ed6dc3 | 0049_visibility_os_claimed_submit_lease
50 | 1787940012000 | 7564ceb48a04b93dc736e586da2cde8c1b2f6acbcb67cd14932a9c745886357f | 0050_visibility_os_jsonb_text_operator_casts
51 | 1787940013000 | d66be78072020b4be7303db0a030f2f158759c94a4285f8f3af08d02f8b5a395 | 0051_visibility_os_provider_evidence_provenance
52 | 1787940014000 | 8e8e663516d0ec16c7c70c9b0d42235b0782c3d3dd86b5d3ebea15e8924c0961 | 0052_provider_dataset_snapshot_journal
53 | 1787940015000 | 8cd84e76292f30e427860fd19fed85222f122b03619d26254f47229401d89c87 | 0053_configuration_lock_legacy_collision_ordinal
54 | 1787940016000 | c4f93e53d27f309505cdddf4c046df502d9630dfa80580a93faa7e46edca56bc | 0054_journal_daily_claim_execution_lease
```

## Границы

- Платный замер не запускать: он стоит около 8 центов и его ведёт Claude-сессия.
- `HOLD` в `sv_journal_daily_claims` не трогать автоматически — это осознанная
  фиксация человеком.
- Работа через PR в `release/selena-visibility-mvp`; в `main` не мержим.
- Правила репозитория: `npx` запрещён, supply-chain-контролы pnpm не ослаблять.

## Состояние вокруг задачи

- Журнал базы: 54 записи (индексы 0–53). `0054` не применена — её и блокирует
  расхождение.
- Заявка `sv_journal_daily_claims` за 1 сентября висит в `EXECUTING` с 14:05Z:
  прогон убила смена пароля базы. Код из PR #107 закроет её сам как `ABANDONED`,
  но только после применения `0054`.
- `measure` (`b61d97b0-2ebf-486c-ad54-0b2ef16073ef`) к GitHub подключён,
  автосборка по пушу намеренно отключена через `watchPatterns`, чтобы мерж не
  обрывал идущий замер.
- Полный контекст суток — `HANDOFF_2026-09-01_EVENING_MEASURE.md` и
  `HANDOFF_2026-09-01_MIGRATIONS.md` в этой же ветке.
