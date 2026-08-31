# Selena Systems — Website Architecture & Content TZ v1.0

> **Провенанс.** Машинная конвертация из `SELENA_SYSTEMS_WEBSITE_ARCHITECTURE_CONTENT_TZ_V1.0_20260831.docx`
> (31 августа 2026, 16:16 WITA), переданного владельцем. Оригинальный `.docx` лежит рядом и остаётся
> подписанным источником: при расхождении форматирования прав `.docx`, при расхождении смысла — сверять с ним же.
> Текст ниже не редактировался, только перенесён в markdown (таблицы восстановлены из ячеек документа).
>
> **Статус:** `APPROVED TARGET · implementation and publication are acceptance-gated`.
> Проверка этого ТЗ перед публикацией — `SELENA_SYSTEMS_WEBSITE_TZ_V1.0_CLAUDE_REVIEW.md` в корне репозитория.

---

SELENA SYSTEMS / WEBSITE SPECIFICATION
Website Architecture & Content
Hospitality-first positioning, bilingual copy, product presentation and release acceptance

| Owner | Selena Systems |
|---|---|
| Version | Website Architecture & Content v1.0 |
| Date / Bali | 31 August 2026, 16:16 WITA |
| Basis | Architecture v1.2 + Delta v1.2.1 + Product Decision v1.0 + Technical Delta v1.3 |
| Status | APPROVED TARGET · implementation and publication are acceptance-gated |

> РЕШЕНИЕ: The site presents Hospitality Visibility as Selena Systems' main commercial experience while preserving AI Visibility and AI Automation as separate solutions. Public copy is written in final present tense; deployment of each claim is blocked until the corresponding capability is proven.

> PUBLIC LANGUAGE RULE: Do not use pilot, beta, coming soon, being developed or configured-only on public pages. Either publish the complete accepted capability in present tense or keep that block unpublished.

## 0. Executive decision

Извлечено: утверждённая Selena architecture остаётся evidence-first системой с независимыми measurement surfaces и общим lifecycle. Интерпретировано: сайт должен перестать показывать AI Visibility и AI Automation как две равные абстрактные услуги. Главная коммерческая история — Hospitality Visibility для ресторанов, отелей, вилл и spa; AI Visibility остаётся универсальным продуктом для других отраслей; AI Automation — отдельное направление внедрения.

| Understand · Entity & facts | Verify · Evidence | Recommend · Intent coverage | Act · Book / call / visit | Learn · Measured change |
|---|---|---|---|---|

### 0.1. Final positioning

> EN · Platform statement · Selena Systems measures AI-driven discovery: how digital systems understand, verify and recommend a business, which sources shape that decision, and what changes after the business acts.

> RU · Platform statement · Selena Systems измеряет AI-driven discovery: как цифровые системы понимают, подтверждают и рекомендуют бизнес, какие источники формируют это решение и что меняется после действий бизнеса.

> EN · Hospitality statement · For restaurants, hotels, villas and spas, Selena Systems shows whether the business is understood, trusted, recommended and ready for the next booking, order, call or visit.

> RU · Hospitality statement · Для ресторанов, отелей, вилл и spa Selena Systems показывает, понятен ли бизнес цифровым системам, достаточно ли он подтверждён, рекомендуют ли его и готов ли он принять следующее бронирование, заказ, звонок или визит.

### 0.2. What changes and what does not

| Area | Before | Target |
|---|---|---|
| Commercial centre | General AI visibility | Hospitality Visibility for HoReCa; AI Visibility retained for other sectors |
| Core promise | Is the brand mentioned? | Is the business understood, evidenced, recommended and actionable? |
| Product model | Visibility score and reports | Five independent measures, evidence, actions and rechecks |
| Social | Potential separate intelligence product | Optional module and evidence source; not a top-level tariff |
| Travel | New source candidate | Hospitality module for hotels/villas; not a universal score |
| Outcomes | Implied commercial result | Readiness / observed / assisted / attributed, according to evidence |
| Architecture | v1.2 + Delta v1.2.1 | Preserved; website is a presentation and entitlement delta, not a rewrite of the core |

### 0.3. Non-negotiable truth rules

- No composite magic score across AI Answers, Search, Maps, Reviews, Social and Travel.
- Every metric shows X of Y, market, date, source scope and UNKNOWN/invalid counts.
- No outcome attribution without booking, WhatsApp, call, POS or analytics evidence.
- No claim that a social post caused an AI recommendation unless the causal link is separately proven.
- Illustrative interface data is visibly labelled as sample data.
- Claims remain hidden until data flow, normalization, storage, evidence and UI acceptance all pass.

## 1. Information architecture

The site has one hospitality-first public narrative, three solution pages, a proof and knowledge layer, a free diagnostic, and a separate authenticated product experience. Social and Travel are modules, not top-level products.

> Selena Systems  Home  Solutions    Hospitality Visibility      Restaurants \| Hotels \| Villas \| Spas    AI Visibility    AI Automation  How it works  Pricing  Proof  Selena Lab  Free visibility check  Client Portal

### 1.1. Canonical URL map

| EN canonical | RU canonical | Page | Role | Robots |
|---|---|---|---|---|
| / | /ru/ | Home | Hospitality-first platform overview | Index |
| /hospitality-ai-visibility | /ru/hospitality-ai-visibility | Hospitality Visibility | Main HoReCa solution hub | Index |
| /hospitality-ai-visibility/restaurants | /ru/hospitality-ai-visibility/restaurants | Restaurants | Restaurant/cafe/food hall use cases | Index |
| /hospitality-ai-visibility/hotels | /ru/hospitality-ai-visibility/hotels | Hotels | Hotel discovery, Maps and Travel | Index |
| /hospitality-ai-visibility/villas | /ru/hospitality-ai-visibility/villas | Villas | Villa discovery and booking readiness | Index |
| /hospitality-ai-visibility/spas | /ru/hospitality-ai-visibility/spas | Spas | Spa/wellness local intent coverage | Index |
| /visibility | /ru/visibility | AI Visibility | Preserve current canonical route | Index |
| /ai-automation | /ru/ai-automation | AI Automation | Separate implementation direction | Index |
| /how-it-works | /ru/how-it-works | How it works | Method and evidence lifecycle | Index |
| /pricing | /ru/pricing | Pricing | Plans and optional modules | Index |
| /projects | /ru/projects | Proof | Preserve route; change navigation label | Index |
| /lab | /ru/lab | Selena Lab | Knowledge hub | Index |
| /lab/research | /ru/lab/research | Research | Measurement research | Index |
| /lab/experiments | /ru/lab/experiments | Experiments | Transparent experiments | Index |
| /lab/tools | /ru/lab/tools | Tools | Public utilities | Index |
| /lab/guides | /ru/lab/guides | Guides | Operator guidance | Index |
| /check | /ru/check | Free visibility check | Lead and diagnostic flow | Index |
| /about | /ru/about | About | Company and method | Index |
| /contact | /ru/contact | Contact | Qualified enquiry | Index |
| /data-sources | /ru/data-sources | Data sources | Source scope and limitations | Index |
| /privacy | /ru/privacy | Privacy | Legal | Index |
| /terms | /ru/terms | Terms | Legal | Index |
| Existing authenticated route | Existing RU/auth route | Client Portal | Preserve auth and tenancy boundary | Noindex |

### 1.2. Redirect and preservation rules

| Source | Target | Rule |
|---|---|---|
| /visibility | Keep /visibility | No route change; rewrite content and metadata in place |
| /projects | Keep /projects | Navigation label becomes Proof; canonical remains /projects |
| /check | Keep /check | Preserve inbound links and form state |
| Current portal/login routes | Keep existing route | Do not introduce /portal if it breaks auth or tenant redirects |
| /services | /hospitality-ai-visibility | 301 only if crawl confirms legacy/indexed route |
| /free-ai-map | /check | 301 only if crawl confirms legacy/indexed route |
| /ru/ai-map | /ru/check | 301 only if crawl confirms legacy/indexed route |
| Any removed locale URL | Exact language equivalent | Never redirect all RU pages to /ru/ |

> PRE-LAUNCH CRAWL: Export all current URLs, status codes, titles, canonicals, hreflang and backlinks before redirects are committed. Any unknown indexed URL is mapped individually.

### 1.3. Global navigation

| Surface | Desktop | Mobile |
|---|---|---|
| Header | Logo · Solutions ▾ · How it works · Pricing · Proof · Selena Lab · Client Portal · Free visibility check | Logo · menu · persistent Free visibility check CTA |
| Solutions menu | Hospitality Visibility · AI Visibility · AI Automation | Three stacked links with one-line explanation |
| Language | EN / RU switch preserving current path | Inside menu and available on every indexed page |
| Footer | Solutions · Industries · Method · Proof · Lab · Company · Legal · Contact | Accordion groups; legal and language always visible |

## 2. Homepage — /

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Explain the category and route visitors by business need | Hospitality owners/managers first; other businesses second | Check my visibility | See how it works |

| # | Block | Content / interface | Conversion role |
|---|---|---|---|
| 1 | Hero | Positioning, two CTAs, real product UI visual | Create immediate category understanding |
| 2 | Hospitality segments | Restaurants & Cafes · Hotels · Villas · Spas & Wellness | Self-selection |
| 3 | Five questions | Understand · Recommend · Competitor · Conflicts · Priorities | Translate product into owner language |
| 4 | Five measures | Five independent cards; no combined score | Show methodology |
| 5 | Visibility modules | AI Answers · Search · Maps & Local · Reviews · Social Evidence · Travel | Show breadth without product sprawl |
| 6 | Competitor reasons | Evidence-based comparison example | Create commercial relevance |
| 7 | Workflow | Measure → Explain → Prioritise → Fix → Recheck | Show closed loop |
| 8 | Proof | AVLI · KORA · later verified cases | Establish trust |
| 9 | Pricing | Free, $49, $79, $399, $2,490 | Set clear next step |
| 10 | Final CTA | Free check + contact | Conversion |

### 2.1. Final hero copy

> EN · Hero · AI-DRIVEN DISCOVERY INTELLIGENCE FOR HOSPITALITY · Be found, chosen and bookable in AI search and maps. · Selena Systems shows restaurants, hotels, villas and spas how AI and search systems understand their business, why competitors are recommended, and what prevents the next booking, order, call or visit. · Primary CTA: Check my visibility · Secondary CTA: See how it works

> RU · Hero · AI-DRIVEN DISCOVERY INTELLIGENCE ДЛЯ HOSPITALITY · Чтобы AI не только нашёл ваш бизнес, но выбрал его и привёл клиента к бронированию. · Selena Systems показывает ресторанам, отелям, виллам и spa, как AI и поисковые системы понимают их бизнес, почему рекомендуют конкурентов и что мешает следующему бронированию, заказу, звонку или визиту. · Основной CTA: Проверить видимость · Второй CTA: Как это работает

> HERO VISUAL: Use a real product composition: recommendation coverage, competitor wins, evidence gaps and action blockers next to a local map. Label all values 'Illustrative interface data / Пример данных интерфейса'.

### 2.2. Segment cards

> EN · Hospitality segments · Restaurants & Cafes — See which dining occasions and local needs lead AI to your business — or to a competitor. · Hotels — Understand how maps, reviews, travel sources and booking paths shape discovery and choice. · Villas — Check whether your property is understood for the right guests, stays, amenities and locations. · Spas & Wellness — Measure local treatment intent, trust evidence and readiness for the next appointment.

> RU · Hospitality segments · Рестораны и кафе — Узнайте, в каких сценариях и локальных запросах AI выбирает вас — или конкурента. · Отели — Поймите, как карты, отзывы, travel-источники и бронирование влияют на обнаружение и выбор. · Виллы — Проверьте, правильно ли системы понимают объект, гостей, формат отдыха, удобства и локацию. · Spa и wellness — Измеряйте локальные намерения, доверие и готовность принять следующую запись.

### 2.3. Five business questions

> EN · Questions · Do AI and search systems understand your business correctly? · In which real customer scenarios are you recommended? · Why is a competitor chosen instead? · Where do your facts, evidence or action paths conflict? · What should you fix first — and did the result change after the fix?

> RU · Questions · Правильно ли AI и поисковые системы понимают ваш бизнес? · В каких реальных клиентских сценариях вас рекомендуют? · Почему вместо вас выбирают конкурента? · Где конфликтуют факты, доказательства или путь к действию? · Что исправить первым — и изменился ли результат после исправления?

### 2.4. Five independent measures

| Measure | Public explanation | Display rule |
|---|---|---|
| Entity Readiness | Can systems identify the business and reconcile its essential facts? | Facts found / facts checked + conflicts |
| Evidence Strength | Do reviews, pages, media and external sources support important attributes? | Supported / unproven / conflicting; source links |
| Recommendation Coverage | How often is the business recommended for relevant discovery intents? | Recommended scenarios / valid scenarios |
| Action Readiness | Can a customer book, order, call, message or navigate without a broken path? | Working actions / required actions + blockers |
| Outcome Evidence | What can be observed after discovery and intervention? | Readiness, observed, assisted or attributed |

### 2.5. Product interface example

Required caption: Illustrative interface data. Actual results depend on location, market, selected intents, sources and measurement date.

| Recommended | Competitor selected | Evidence missing | Action blockers |
|---|---|---|---|
| 12 / 40 scenarios | 9 scenarios | 7 scenarios | 3 blockers |

### 2.6. Workflow and final CTA

| Measure · The same locked scope | Explain · Evidence and competitors | Prioritise · Impact and effort | Fix · Owned action | Recheck · Comparable run |
|---|---|---|---|---|

> EN · Final CTA · Know where your next booking is being lost. · Start with a free visibility check. See what systems can understand today, which signals are missing, and what deserves attention first. · CTA: Check my visibility

> RU · Final CTA · Узнайте, где теряется следующее бронирование. · Начните с бесплатной проверки видимости: что системы понимают уже сейчас, каких сигналов не хватает и что стоит исправить первым. · CTA: Проверить видимость

## 3. Hospitality Visibility hub

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Own the Hospitality Visibility category and explain the full product | HoReCa decision-makers, agencies and multi-location operators | Check my hospitality visibility | View pricing |

> EN · Hero · HOSPITALITY VISIBILITY · Turn local discovery into a measurable path to choice and action. · Selena Systems connects business facts, local intents, maps, reviews, social evidence and booking paths to show where your hospitality brand is understood, trusted and recommended — and where customers are lost. · CTA: Check my hospitality visibility

> RU · Hero · HOSPITALITY VISIBILITY · Превратите локальное обнаружение в измеримый путь к выбору и действию. · Selena Systems связывает факты о бизнесе, локальные интенты, карты, отзывы, social evidence и пути бронирования, чтобы показать, где hospitality-бренд понятен, подтверждён и рекомендован — и где теряется клиент. · CTA: Проверить hospitality visibility

| # | Block | Content / interface | Conversion role |
|---|---|---|---|
| 1 | Hero | Category definition and CTA | Demand capture |
| 2 | Five measures | Method cards with denominator | Credibility |
| 3 | Intent library | Occasion · atmosphere · dietary · group · location · price · availability · action | Differentiate |
| 4 | Evidence graph | Website, Maps, Reviews, Social, Travel, citations | Explain why |
| 5 | Action readiness | Booking · order · WhatsApp · call · directions | Connect visibility to business |
| 6 | Industry selector | Restaurants · Hotels · Villas · Spas | Route |
| 7 | Pricing | Relevant plans and modules | Convert |
| 8 | FAQ | Scope, UNKNOWN, systems, geography | Resolve objections |

### 3.1. Core explanation

> EN · How it works · Visibility is not a single ranking. A hospitality business can be easy to find by name and still be absent from the situations that matter: a quiet dinner, a family villa, an evening spa treatment or a hotel for remote work. · Selena Systems measures the business against a locked set of customer intents, records the evidence behind each result, explains competitor advantages and turns findings into actions that can be checked again.

> RU · How it works · Visibility — это не одна позиция. Hospitality-бизнес может легко находиться по названию и при этом отсутствовать в важных сценариях: тихий ужин, вилла для семьи, вечерняя spa-процедура или отель для удалённой работы. · Selena Systems измеряет бизнес по зафиксированному набору клиентских интентов, сохраняет доказательства каждого результата, объясняет преимущества конкурентов и превращает выводы в действия, которые можно проверить повторно.

### 3.2. FAQ copy

| Question | Approved answer |
|---|---|
| Is this SEO? | It includes search and local discovery signals, but the product measures the wider decision path across AI answers, search, maps, reviews, evidence and actions. |
| Do you guarantee rankings or bookings? | No. Selena Systems measures observable results, identifies evidence-backed blockers and verifies changes. Rankings and commercial outcomes depend on systems and market conditions outside Selena Systems' control. |
| Which sources are included? | The exact source set depends on the plan, market and business type. Every report states the systems, dates, locations, intents and evidence used. |
| What does UNKNOWN mean? | The available evidence is insufficient for a reliable conclusion. UNKNOWN is not a zero and is not treated as failure. |
| Can social content influence the result? | Social content can provide evidence about attributes, demand and reputation. Selena Systems does not claim a causal effect on recommendations unless that effect is separately demonstrated. |

## 4. Vertical landing pages

Each page follows the same conversion architecture but uses a distinct intent ontology, evidence model and action path. Pages must not be thin keyword variants.

### 4.1. Restaurants & Cafes

Canonical: /hospitality-ai-visibility/restaurants

> EN · Hero · RESTAURANT VISIBILITY · Be recommended for the occasion — not only found by name. · Measure how AI, search and maps understand your concept, menu, atmosphere, dietary options, location and booking paths. See which dining scenarios lead to you, which lead to competitors and why. · CTA: Check my restaurant

> RU · Hero · RESTAURANT VISIBILITY · Чтобы ресторан рекомендовали для нужного случая, а не только находили по названию. · Измеряйте, как AI, поиск и карты понимают концепцию, меню, атмосферу, dietary options, локацию и путь бронирования. Узнайте, какие сценарии ведут к вам, какие — к конкурентам и почему. · CTA: Проверить мой ресторан

| Intent examples | Evidence and action checks |
|---|---|
| quiet dinner · group of 12 · vegetarian options · family lunch · breakfast with AC · sunset view · nearby after an event · book a table tonight | Menu readability · Category and hours · Review themes · Atmosphere evidence · Reservation / WhatsApp / call · Directions |

- Required page blocks: problem → intent examples → measurement dimensions → competitor explanation → action readiness → proof → pricing → FAQ → CTA.
- Required unique proof: at least one vertical-specific screenshot, example or verified case section before indexation.
- Structured data: relevant LocalBusiness subtype, BreadcrumbList and FAQPage only when visible content matches markup.

### 4.2. Hotels

Canonical: /hospitality-ai-visibility/hotels

> EN · Hero · HOTEL VISIBILITY · Show up for the stay your guest is actually planning. · Connect property facts, maps, reviews, travel sources, amenities and booking paths to understand how your hotel is discovered, compared and chosen. · CTA: Check my hotel

> RU · Hero · HOTEL VISIBILITY · Появляйтесь в выборе под тот отдых, который гость действительно планирует. · Свяжите факты об объекте, карты, отзывы, travel-источники, удобства и бронирование, чтобы понять, как отель находят, сравнивают и выбирают. · CTA: Проверить мой отель

| Intent examples | Evidence and action checks |
|---|---|
| remote work stay · family with children · airport transfer · late check-in · walkable location · quiet rooms · breakfast included · available this weekend | Property identity · Amenities · Review freshness · Travel presence · Rates/offers context · Direct booking readiness |

- Required page blocks: problem → intent examples → measurement dimensions → competitor explanation → action readiness → proof → pricing → FAQ → CTA.
- Required unique proof: at least one vertical-specific screenshot, example or verified case section before indexation.
- Structured data: relevant LocalBusiness subtype, BreadcrumbList and FAQPage only when visible content matches markup.

### 4.3. Villas

Canonical: /hospitality-ai-visibility/villas

> EN · Hero · VILLA VISIBILITY · Help the right guest understand and choose your property. · Measure whether systems can connect your villa with the right location, group size, amenities, stay occasion and booking action — with evidence for every finding. · CTA: Check my villa

> RU · Hero · VILLA VISIBILITY · Помогите подходящему гостю понять и выбрать ваш объект. · Измеряйте, связывают ли системы виллу с нужной локацией, составом группы, удобствами, сценарием проживания и бронированием — с доказательством каждого вывода. · CTA: Проверить мою виллу

| Intent examples | Evidence and action checks |
|---|---|
| family villa · group retreat · private pool · near the beach · long stay · staffed villa · child-friendly · book direct | Canonical property identity · Capacity · Amenities · Location proof · Guest evidence · Enquiry / booking readiness |

- Required page blocks: problem → intent examples → measurement dimensions → competitor explanation → action readiness → proof → pricing → FAQ → CTA.
- Required unique proof: at least one vertical-specific screenshot, example or verified case section before indexation.
- Structured data: relevant LocalBusiness subtype, BreadcrumbList and FAQPage only when visible content matches markup.

### 4.4. Spas & Wellness

Canonical: /hospitality-ai-visibility/spas

> EN · Hero · SPA & WELLNESS VISIBILITY · Be understood for the treatment, time and trust a guest needs. · See whether AI, search and maps correctly understand your treatments, location, opening hours, evidence of quality and appointment paths. · CTA: Check my spa

> RU · Hero · SPA & WELLNESS VISIBILITY · Чтобы вас выбирали по нужной процедуре, времени и уровню доверия. · Проверьте, правильно ли AI, поиск и карты понимают процедуры, локацию, часы работы, доказательства качества и путь записи. · CTA: Проверить мой spa

| Intent examples | Evidence and action checks |
|---|---|
| massage near me · evening appointment · couples treatment · recovery massage · wellness package · quiet spa · same-day availability · book on WhatsApp | Service pages · Treatment naming · Practitioner/business evidence · Review themes · Hours and location · Appointment readiness |

- Required page blocks: problem → intent examples → measurement dimensions → competitor explanation → action readiness → proof → pricing → FAQ → CTA.
- Required unique proof: at least one vertical-specific screenshot, example or verified case section before indexation.
- Structured data: relevant LocalBusiness subtype, BreadcrumbList and FAQPage only when visible content matches markup.

## 5. AI Visibility — /visibility

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Preserve the broader cross-industry product | SaaS, services, B2B and non-local businesses | Check AI visibility | View pricing |

> EN · Hero · AI VISIBILITY YOU CAN VERIFY · See where AI systems mention, cite and recommend your business — and the evidence behind every result. · Selena Systems measures answers across a fixed set of prompts, markets and systems, separates mentions from recommendations, records citations and turns gaps into a prioritised action plan. · CTA: Check AI visibility

> RU · Hero · ПРОВЕРЯЕМАЯ AI VISIBILITY · Узнайте, где AI-системы упоминают, цитируют и рекомендуют ваш бизнес — и увидьте доказательства каждого результата. · Selena Systems измеряет ответы по зафиксированному набору запросов, рынков и систем, отделяет упоминания от рекомендаций, сохраняет цитаты и превращает пробелы в приоритетный план действий. · CTA: Проверить AI visibility

| # | Block | Content / interface | Conversion role |
|---|---|---|---|
| 1 | Hero | Verifiable AI visibility; CTA | Clarify product |
| 2 | Measurement | Mention · recommendation · position · citation · competitor | Explain metrics |
| 3 | Prompt scope | Branded and discovery prompts; country/language/date | Method trust |
| 4 | Evidence | Answer snapshot, citation, source and run history | Verifiability |
| 5 | Gaps | Competitor and source gaps | Actionability |
| 6 | Plans | $49 / $79 / expert / implementation | Conversion |

> BOUNDARY: Do not mix Google SERP positions, Maps rank, reviews or social engagement into an AI Answer Visibility numerator. Cross-channel relationships may be explained, but the measures remain separate.

### 5.1. Approved metric language

| Allowed | Avoid |
|---|---|
| Mention coverage: X of Y valid answers | AI dominance |
| Recommendation coverage: X of Y discovery prompts | Guaranteed preference |
| Citation presence and cited domains | Sources that definitely caused the answer |
| Competitor co-mentions and recommendation gap | Share of the entire AI market |
| Observed change between compatible runs | Permanent ranking improvement |

## 6. AI Automation — /ai-automation

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Present implementation services without diluting Visibility | Operators with repetitive lead, support and content workflows | Discuss an automation | See examples |

> EN · Hero · AI AUTOMATION FOR REAL OPERATIONS · Turn repeated work into a controlled, measurable workflow. · Selena Systems designs AI-assisted processes for leads, customer communication, knowledge and internal operations — with human approval, clear ownership and measurable service outcomes. · CTA: Discuss an automation

> RU · Hero · AI AUTOMATION ДЛЯ РЕАЛЬНЫХ ОПЕРАЦИЙ · Превратите повторяющуюся работу в управляемый и измеримый процесс. · Selena Systems проектирует AI-assisted процессы для лидов, клиентских коммуникаций, базы знаний и внутренних операций — с человеческим контролем, понятной ответственностью и измеримым результатом сервиса. · CTA: Обсудить автоматизацию

| Use case | Business outcome | Control |
|---|---|---|
| Lead qualification and routing | Faster response and cleaner handoff | Approval rules, CRM log, fallback owner |
| Guest/customer enquiry triage | Consistent answers and escalation | Knowledge boundaries and human takeover |
| Review and feedback workflow | Faster classification and response preparation | No autonomous publication without approval |
| Content operations | Structured briefs, repurposing and QA | Source provenance and editorial review |
| Internal knowledge | Faster retrieval and repeatable procedures | Access control and audit trail |

> HOME PRIORITY: AI Automation appears in the Solutions menu and a compact homepage secondary block after Hospitality proof/pricing, never as an equal split in the hero.

## 7. How it works — /how-it-works

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Explain the evidence-first lifecycle and limits | Buyers, partners, technical reviewers | Start a check | Review proof |

> EN · Hero · FROM DISCOVERY TO VERIFIED ACTION · Every result starts with a locked scope and ends with evidence. · We define the business, market, systems, intents and competitors before measurement. Results are stored with source evidence, translated into prioritised actions and checked again against a compatible scope.

> RU · Hero · ОТ ОБНАРУЖЕНИЯ К ПРОВЕРЕННОМУ ДЕЙСТВИЮ · Каждый результат начинается с зафиксированного скоупа и заканчивается доказательством. · До измерения мы фиксируем бизнес, рынок, системы, интенты и конкурентов. Результаты сохраняются вместе с источниками, превращаются в приоритетные действия и проверяются повторно в сопоставимом скоупе.

| 1. Define · Entity, market, intents | 2. Measure · Locked run | 3. Explain · Evidence and gaps | 4. Act · Owner and priority | 5. Verify · Comparable recheck |
|---|---|---|---|---|

### 7.1. Method blocks

| Step | Public copy | Required product evidence |
|---|---|---|
| Define | We verify the business entity, location, market, language, intent set and competitor scope. | Configuration lock / quote summary |
| Measure | Each system is measured through its own adapter and result schema. | Run status, timestamps, source scope |
| Explain | Findings link to answers, citations, map points, facts, reviews or other accepted evidence. | Evidence IDs and visible proof |
| Prioritise | Actions are ranked by likely discovery impact, customer friction and implementation effort. | Issue, impact, evidence, action, owner, priority |
| Verify | A comparable recheck shows what changed, what did not and what remains unknown. | Compatible lock, history and before/after |

> UNKNOWN: If the evidence is incomplete, the result is UNKNOWN. Selena Systems does not convert missing data into a zero, a failure or an invented conclusion.

## 8. Pricing — /pricing

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Make the next purchase legible without creating product sprawl | Self-serve buyers and managed-service prospects | Start free | Talk to Selena |

> EN · Pricing intro · START WITH THE DECISION YOU NEED TO MAKE · Choose a focused snapshot, a competitive landscape or an expert implementation path. Every plan states its locations, systems, intents, competitors, run frequency and evidence scope before purchase.

> RU · Pricing intro · НАЧНИТЕ С РЕШЕНИЯ, КОТОРОЕ ВАМ НУЖНО ПРИНЯТЬ · Выберите точный snapshot, конкурентный landscape или экспертное внедрение. До покупки каждый план фиксирует локации, системы, интенты, конкурентов, частоту запусков и скоуп доказательств.

| Plan | Public entitlement | Best for | Primary CTA |
|---|---|---|---|
| Free | 1 business · official profile presence · basic website/entity/action readiness · critical conflicts · limited visibility preview · no recurring monitoring | First diagnosis | Run free check |
| $49 Snapshot | 1 location · up to 300 AI answers · 3 visitor systems · Profile/Reviews monthly · Maps 5×5 / 3 km / 5 keywords monthly · evidence-backed fixes | One business / one location | Choose Snapshot |
| $79 Landscape | Up to 800 AI answers · 3 visitor + 5 API systems · everything in Snapshot · competitor and source gaps · Local AI recommendation layer · bounded Social Snapshot when selected | Competitive decisions | Choose Landscape |
| $399 Expert Verified | Expert review of the measured dataset · evidence verification · prioritised 30-day action plan · owner-ready readout | Teams that need a decision, not another dashboard | Book Expert Verified |
| $2,490 Implementation + 90 days | Implementation scope · entity/site/schema/action fixes · selected relevant modules · repeat measurement · managed verification for 90 days | Businesses ready to execute | Talk to Selena |

> PLAN DISCLOSURE: The checkout/quote must display exact market, systems, locations, intents, competitors, runs, retention and module entitlements. If a capability is not accepted in production, remove it from the purchasable entitlement rather than adding transitional copy.

### 8.1. Optional modules

| Module | How it appears | Commercial rule |
|---|---|---|
| Social Intelligence | Profiles, content and bounded conversation evidence inside Visibility/Evidence; separate module detail in plan drawer | Add-on or included allowance; never a sixth top-level plan |
| Travel Visibility | Hotel/villa travel presence and accepted offer/source fields | Relevant to hotels/villas only; optional entitlement |
| Additional locations | Location selector and portfolio roll-up | Per-location or portfolio quote |
| Additional markets/languages | Separate locked measurement scope | Quoted by scope and provider cost |
| Outcome connectors | Observed/assisted/attributed outcome views | Enabled only for accepted analytics, booking, call or messaging connectors |

### 8.2. Pricing FAQ

| Question | Approved answer |
|---|---|
| Is Social Monitoring included? | The $49 plan does not include full Social Monitoring. A bounded Social Snapshot may be included in $79 when explicitly shown in the entitlement. Ongoing social collection is an optional module. |
| Is Travel included for every business? | No. Travel Visibility is relevant to hotels and some villas. It does not affect restaurant, spa or general AI Visibility measures. |
| What happens when a source is unavailable? | The run shows the affected scope as unavailable or UNKNOWN. The denominator and evidence record remain visible; Selena Systems does not silently reduce the measurement. |
| Do unused runs roll over? | The checkout displays the applicable policy for the selected plan. The product must not publish a rollover promise until billing and budget logic support it. |

## 9. Proof — /projects

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Demonstrate method and verified change | Prospects who need evidence | View a case | Start a check |

> EN · Hero · PROOF, NOT PROMISES · See what was measured, why the finding was made, what changed and what remained unknown. · Every Selena Systems case separates observed data, interpretation, intervention and verified result.

> RU · Hero · ДОКАЗАТЕЛЬСТВА, А НЕ ОБЕЩАНИЯ · Посмотрите, что было измерено, почему сделан вывод, что изменилось и что осталось неизвестным. · Каждый кейс Selena Systems разделяет наблюдаемые данные, интерпретацию, действие и проверенный результат.

| Case | Role | Required publication gate |
|---|---|---|
| AVLI | Operating restaurant: current recommendation, evidence, competitors and action readiness | Accepted dataset, evidence-linked findings, owner permission, before/after when claimed |
| KORA | Pre-opening readiness: entity, facts, source presence and booking/action preparation | No fabricated reviews/rank/outcomes; readiness evidence and owner permission |
| Selena Systems | AI Visibility and intervention history | Compatible runs and source evidence |
| Other Bali | Content/discovery ecosystem proof | Clear separation between internal project and client result |
| PetID / DOKI / REMHAOS | Product and automation evidence | Verified scope, permission and truthful outcome labels |

### 9.1. Case template

- Context — business, market, dates and question.
- Locked scope — systems, locations, intents, competitors and exclusions.
- Observed — raw/normalized result and valid denominator.
- Interpreted — explanation tied to evidence.
- Action — owner, implementation date and affected surface.
- Recheck — compatible before/after, unchanged results and UNKNOWN.
- Outcome evidence — readiness, observed, assisted or attributed; never implied.

> CASE LABELS: Use visible labels: Observed / Интерпретировано / Action / Verified change / Unknown. Never collapse interpretation into a factual claim.

## 10. Selena Lab — /lab

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Build category authority and expose methodology | Operators, marketers, researchers and partners | Explore research | Use a tool |

> EN · Hero · SELENA LAB · Research, experiments and tools for AI-driven discovery. · Selena Lab documents how AI answers, search, maps, reviews and evidence shape business discovery — including methods, limitations and reproducible examples.

> RU · Hero · SELENA LAB · Исследования, эксперименты и инструменты для AI-driven discovery. · Selena Lab показывает, как AI-ответы, поиск, карты, отзывы и evidence формируют обнаружение бизнеса — с методами, ограничениями и воспроизводимыми примерами.

| Section | Purpose | Required content |
|---|---|---|
| Research | Durable category and methodology work | Research question, sample, dates, systems, method, limitations, findings |
| Experiments | Transparent tests and before/after studies | Hypothesis, scope, intervention, result, uncertainty |
| Tools | Free utilities that create useful diagnostic value | Input disclosure, output limits, privacy note, CTA |
| Guides | Actionable operator education | Business problem, evidence, steps, exclusions, next measurement |

> HIDDEN: School remains hidden from primary navigation until it has an approved curriculum, ownership and product role.

## 11. Free visibility check — /check

| Purpose | Audience | Primary CTA | Secondary CTA |
|---|---|---|---|
| Deliver immediate value and create a qualified project | Any business, with hospitality routing | Run free check | Create project |

> EN · Hero · FREE VISIBILITY CHECK · See what AI and search systems can understand about your business today. · Check your official presence, website and action paths, identify critical conflicts and receive the first three fixes worth investigating. · CTA: Run free check

> RU · Hero · БЕСПЛАТНАЯ ПРОВЕРКА ВИДИМОСТИ · Узнайте, что AI и поисковые системы могут понять о вашем бизнесе уже сегодня. · Проверьте официальное присутствие, сайт и пути к действию, найдите критические конфликты и получите первые три исправления, которые стоит изучить. · CTA: Запустить проверку

### 11.1. Form

| Field | Rule | Validation / privacy |
|---|---|---|
| Business type | Restaurant · Hotel · Villa · Spa · Other | Required; selects workflow |
| Business name | Official public name | Required; trim and normalize |
| Website | Canonical URL | Required unless user confirms no website |
| Country / location | Country plus city/area; address for local workflows | Required for local comparison |
| Official profile URL | Google/Maps or relevant official profile | Optional; identity confirmation |
| Email | Deliver result and create account | Consent copy; never pre-checked marketing opt-in |

### 11.2. Result

| Section | Free output | Not implied |
|---|---|---|
| Entity Readiness | Name, type, location and essential fact availability | No full entity audit |
| Website Readiness | Indexable/readable public essentials and action paths | No complete technical SEO audit |
| Official presence | Found / not confirmed / conflicting | No ownership claim without evidence |
| Action Readiness | Booking, order, call, WhatsApp or directions presence | No transaction attribution |
| Visibility preview | Limited source/intent preview with visible scope | No recurring monitoring |
| Priority fixes | Three evidence-linked issues to investigate | No guaranteed ranking or booking lift |

> EN · Result CTA · Your preview shows what is visible now. Create a project to lock the full scope, compare competitors and measure again after the fixes. · CTA: Create project

> RU · Result CTA · Preview показывает текущую картину. Создайте проект, чтобы зафиксировать полный скоуп, сравнить конкурентов и повторить измерение после исправлений. · CTA: Создать проект

## 12. About, Contact and Data Sources

### 12.1. About — /about

> EN · Core copy · Selena Systems builds evidence-first products for AI-driven discovery and operational automation. · We measure how digital systems understand, verify and recommend businesses, connect every conclusion to its source and help teams test whether an intervention changed the result. · Our hospitality work is local-first: entity facts, real customer intents, maps, reviews, social evidence and action readiness are evaluated together without collapsing them into one opaque score.

> RU · Core copy · Selena Systems создаёт evidence-first продукты для AI-driven discovery и операционной автоматизации. · Мы измеряем, как цифровые системы понимают, подтверждают и рекомендуют бизнес, связываем каждый вывод с источником и помогаем проверить, изменило ли действие результат. · В hospitality мы работаем local-first: факты о бизнесе, реальные клиентские интенты, карты, отзывы, social evidence и готовность к действию оцениваются вместе, но не превращаются в один непрозрачный score.

### 12.2. Contact — /contact

> EN · Hero · Tell us what decision you need to make. · Share your business type, market, locations and the visibility or automation problem you want to solve. We will respond with the smallest useful scope.

> RU · Hero · Расскажите, какое решение вам нужно принять. · Укажите тип бизнеса, рынок, локации и задачу по visibility или automation. Мы предложим минимальный полезный скоуп.

| Contact field | Required |
|---|---|
| Name and work email | Yes |
| Business / website | Yes |
| Business type | Yes |
| Market and locations | Yes for visibility |
| Goal and timeline | Yes |
| Budget band | Optional |

### 12.3. Data Sources — /data-sources

> EN · Intro · Every Selena Systems result states the source, market, date, measurement scope and evidence available for verification. · Source availability and returned fields can vary by country, provider and time. Missing or conflicting data is shown as unavailable or UNKNOWN; it is not silently replaced or estimated.

> RU · Intro · Каждый результат Selena Systems показывает источник, рынок, дату, скоуп измерения и доступные доказательства. · Доступность источников и возвращаемые поля могут зависеть от страны, провайдера и времени. Отсутствующие или противоречивые данные отмечаются как недоступные или UNKNOWN, а не заменяются молча и не придумываются.

| Module | Examples | Disclosure |
|---|---|---|
| AI Answers | Selected conversational answer systems | Prompt, market, language, date, answer status, citations |
| Search | Selected search result surfaces | Query, locale, device/mode when applicable, result type |
| Maps & Local | Place facts and rank measurements | Place identity and rank evidence are separate |
| Reviews | Accepted review sources | Review-level or versioned aggregate; raw evidence retained by policy |
| Social | Selected profiles, content and bounded conversations | Workflow, date range, profile/content limits, retention |
| Travel | Selected hotel/travel source fields | Only fields returned and validated are shown |

## 13. Client Portal architecture

> PUBLIC / APP BOUNDARY: The marketing site explains the value. The authenticated portal contains measured data, evidence, actions, entitlements and history. Do not reproduce a fake dashboard as a marketing-only interaction.

> Client Portal  Overview  Visibility  Evidence  Competitors  Actions  Outcomes

| Section | Primary content | Critical states |
|---|---|---|
| Overview | Recommendation coverage · competitor wins · evidence gaps · action blockers · changes | Loading · valid · partial · UNKNOWN · locked · failed |
| Visibility | AI Answers · Search · Maps & Local · Intent Coverage · source/date/market selectors | No mixed denominator; surface-specific legend |
| Evidence | Entity facts · Website · Reviews · Social · Travel · citations · raw/normalized references | Accepted · rejected · conflicting · stale · unavailable |
| Competitors | Where competitor appears · why selected · evidence strength · source gap | Observed vs interpreted labels |
| Actions | Issue · impact · evidence · fix · owner · priority · status · recheck | Open · in progress · completed · verified · not changed |
| Outcomes | Action Readiness · Observed · Assisted · Attributed | Hide unavailable levels; never promote readiness to attribution |

### 13.1. Overview wireframe content

| Row | Components |
|---|---|
| Context bar | Project · location · market · date/run · plan · data status |
| Decision summary | Recommended X/Y · competitor selected · evidence missing · action blockers |
| Five measures | Independent cards with denominator, UNKNOWN and trend eligibility |
| Intent coverage | Scenario groups and top missed intents |
| Competitor reasons | Evidence-backed reasons, not generic tips |
| Priority actions | Top five actions with owner, status and recheck |
| History | Compatible measurements and intervention markers |

### 13.2. Visibility interaction rules

- Selectors: location, market, language, run, source, intent group and keyword/prompt.
- Maps heatmap: 3×3/5×5 grid as entitled; rank/invalid/unknown legend; point drawer with coordinates, provider evidence and attempt status.
- AI Answers: answer, mention/recommendation state, position when meaningful, competitors, citations and source snapshot.
- Search: organic/SERP result types remain separate from AI Answers.
- Every export uses the same dataset version and repeats scope metadata.

### 13.3. Actions and Outcomes

| Level | Definition | UI wording |
|---|---|---|
| Action Readiness | A usable booking/order/call/message/directions path exists | Ready / blocked / unknown |
| Observed Action | A measurable action event occurred | Observed; not attributed |
| Assisted Outcome | The Selena-related path is present in a multi-touch journey | Assisted; method disclosed |
| Attributed Outcome | Accepted connector and attribution rule support the claim | Attributed; source and window shown |

## 14. Visual design system

Preserve the disciplined Selena blue/cyan identity, then add a restrained warm hospitality accent. The visual language is evidence, maps and decisions — not generic AI decoration.

| Token | Use | Direction |
|---|---|---|
| Navy | Headings, core UI, authority | Deep ink/navy; high contrast |
| Blue | Primary CTA and navigation | Existing Selena blue |
| Cyan/teal | Evidence, accepted states, method accents | Precise, not neon |
| Warm accent | Hospitality highlights and selected CTA moments | Sand/gold; restrained |
| Green | Verified positive state | Never used for UNKNOWN |
| Amber | Partial/attention | Explain reason |
| Red | Failed/blocker | Reserved for real error or blocker |
| Gray | Unavailable/secondary metadata | Readable contrast |

### 14.1. Visual assets

| Use | Required | Avoid |
|---|---|---|
| Product | Real maps, answer evidence, source cards, action list and history | Decorative fake dashboards |
| Hospitality | Real property/restaurant photography supporting the story | Generic luxury stock as the main proof |
| AI | System names, answer/citation UI and method diagrams | Robots, glowing brains, neon circuitry |
| Proof | Case-specific screenshots with scope/date labels | Unlabelled sample metrics |
| Motion | Subtle state transitions and map/intent reveal | Constant parallax, autoplay video, distracting counters |

### 14.2. Typography and components

- Use a highly readable sans-serif system with Cyrillic and Latin parity; test mixed-language lines.
- Body copy is never below 16 px on public pages; critical metadata is never below 13 px.
- Hero H1 uses a controlled max width and avoids more than three lines at 390 px.
- Cards have descriptive headings, one decision per card and visible focus states.
- Metrics always include label, numerator/denominator, scope and status — never a number alone.

## 15. Mobile, accessibility and performance

| Area | Acceptance |
|---|---|
| Navigation | Keyboard-accessible desktop menu; mobile drawer with focus trap, Escape close and persistent CTA |
| Responsive | 320/360/390/768/1024/1440 widths; no horizontal scroll; tables become labelled cards or controlled scroll regions |
| Map | Map has list/table alternative, accessible point labels and non-colour status legend |
| Forms | Visible labels, input purpose/autocomplete, inline errors, error summary, consent and success state |
| Contrast | WCAG 2.2 AA for text, controls, focus and status; status never communicated by colour alone |
| Keyboard | All interactive elements operable; logical order; skip link; no keyboard trap |
| Screen reader | Landmarks, heading order, meaningful link text, alt text, table headers and live progress announcements |
| Motion | prefers-reduced-motion respected; no essential content depends on animation |
| Performance | Core Web Vitals measured on mobile; avoid heavy hero video; responsive images and deferred non-critical scripts |
| Locale | Language switch preserves page; html lang, hreflang and translated validation messages are correct |

### 15.1. Mobile content order

- Hero statement and primary CTA.
- Illustrative product decision summary with explicit sample label.
- Business type selector.
- Five business questions and five measures.
- Workflow and proof.
- Pricing comparison as stacked plan cards.
- Final CTA, contact and legal disclosure.

## 16. SEO and GEO specification

The site must be indexable as a coherent knowledge system: one canonical answer per user question, explicit entities, source methodology, proof and consistent bilingual relationships. GEO content quality does not replace technical SEO.

| Page | Primary topic | Title pattern | Structured data |
|---|---|---|---|
| Home | AI-driven discovery intelligence for hospitality | Hospitality AI Visibility & Local Discovery \| Selena Systems | Organization · WebSite · Breadcrumb where applicable |
| Hospitality hub | Hospitality visibility / local AI discovery | Hospitality Visibility for Restaurants, Hotels, Villas & Spas | Service · BreadcrumbList · FAQPage |
| Restaurants | Restaurant AI and local visibility | Restaurant AI Visibility, Maps & Recommendation Intelligence | Service · Restaurant/LocalBusiness · FAQPage |
| Hotels | Hotel AI, maps and travel visibility | Hotel AI Visibility, Maps, Reviews & Booking Readiness | Service · Hotel · FAQPage |
| Villas | Villa discovery and booking readiness | Villa AI Visibility, Local Discovery & Booking Readiness | Service · LodgingBusiness when valid · FAQPage |
| Spas | Spa local AI visibility | Spa AI Visibility, Maps & Appointment Readiness | Service · HealthAndBeautyBusiness when valid · FAQPage |
| AI Visibility | Verifiable AI answer visibility | AI Visibility Measurement with Citations & Competitors | Service · FAQPage |
| AI Automation | Controlled AI automation | AI Automation for Leads, Support & Operations | Service |
| How it works | Evidence-first measurement method | How Selena Systems Measures AI-Driven Discovery | HowTo only if markup matches visible steps |
| Pricing | Selena Systems pricing | AI & Hospitality Visibility Pricing | Offer/Service where technically correct |
| Proof | Verified case evidence | Selena Systems Proof: Measured Visibility & Verified Change | CollectionPage · Article per case |
| Lab | AI-driven discovery research | Selena Lab: AI Search, Maps & Evidence Research | CollectionPage |

### 16.1. On-page requirements

- One unique H1, descriptive title and meta description per locale; no translated duplicate titles.
- Self-referencing canonical and reciprocal en/ru hreflang plus x-default where appropriate.
- Visible author/method/date/updated information for research, experiments, guides and proof.
- Entity consistency: Selena Systems organization, product names, business verticals and data-source terminology remain stable.
- FAQs answer real objections and appear in visible HTML; no schema-only content.
- Internal links connect vertical page → method → pricing → proof → check, and Lab content back to the relevant solution.
- Images include meaningful alt text, dimensions, responsive sources and contextual captions for evidence screenshots.
- No indexation of portal, private reports, thin filters, empty Lab categories or generated search pages.

### 16.2. GEO answer blocks

| Question | Canonical answer owner |
|---|---|
| What is hospitality visibility? | /hospitality-ai-visibility |
| How do I know why AI recommends a competitor? | /how-it-works + relevant vertical page |
| What is restaurant AI visibility? | /hospitality-ai-visibility/restaurants |
| Does social content affect local visibility? | /hospitality-ai-visibility + /data-sources |
| What does Selena Systems measure? | / + /how-it-works |
| How is UNKNOWN handled? | /how-it-works + /data-sources |
| Can AI visibility be tied to bookings? | /how-it-works + Outcomes methodology |

## 17. Analytics and conversion measurement

| Event | Required properties | Why |
|---|---|---|
| view_solution | solution, vertical, locale, referrer | Understand category demand |
| select_business_type | type, page, locale | Measure routing |
| cta_click | cta_id, page, placement, plan, locale | Attribution without ambiguous button labels |
| check_start | business_type, source_page, locale | Diagnostic funnel |
| check_submit | business_type, country, has_site, consent_state | Completion and quality |
| check_result_view | result_status, sections_available | Result delivery |
| create_project | source_page, check_id, plan | Product activation |
| pricing_view | plan, module, locale | Plan interest |
| checkout_start | quote_id, plan, currency, entitlement_version | Commercial funnel |
| contact_submit | solution, business_type, market, timeline | Managed lead quality |
| proof_view | case_id, vertical, result_label | Proof engagement |
| language_switch | from, to, path | Locale quality |

> PRIVACY: Do not place raw prompt text, review/comment content, personal identifiers, full URLs with tokens or evidence payloads into analytics properties.

### 17.1. Marketing outcome labels

- Website conversions are marketing events, not proof that Selena caused a client booking.
- Case pages may state observed or attributed outcomes only under the same evidence labels used in the product.
- Cookie/consent behaviour must match the analytics and advertising tools actually deployed.

## 18. Content and claim governance

| Claim type | Owner | Required evidence | Review cadence |
|---|---|---|---|
| Product capability | Product + Engineering | Accepted end-to-end path and UI state | Every release |
| Data source | Provider/Measurement owner | Adapter, schema, cost, retention and source disclosure | Provider/schema change |
| Metric | Product analytics | Definition, denominator, UNKNOWN and comparability rules | Versioned methodology |
| Pricing/entitlement | Commercial + Product | Plan caps, cost model, billing enforcement | Every plan change |
| Case result | Evidence reviewer + client owner | Scope, evidence, permission, result label | Before publish/update |
| Research claim | Selena Lab editor | Method, sample, dates, limitations, sources | Before publish/update |

### 18.1. Forbidden public patterns

| Do not publish | Use instead |
|---|---|
| Pilot / beta / being developed / coming soon | Publish accepted final capability in present tense, or hide the block |
| AI Visibility Score: 44 | Recommended in 12 of 40 valid scenarios; scope and date shown |
| We make AI choose your business | We measure recommendations, identify evidence-backed blockers and verify changes |
| Social signals cause AI rankings | Social content can provide relevant evidence; causal effects require separate proof |
| Track bookings from AI | Outcome Readiness / Observed / Assisted / Attributed according to connected evidence |
| All sources included | Exact source set is stated for the selected plan, market and run |

| Public claim | Publish only when | If gate is not met |
|---|---|---|
| We show why competitors are recommended | Competitor result, accepted evidence links, interpretation boundary and source/date are visible | Publish observed comparison only; suppress causal phrasing |

| Public claim | Publish only when | If gate is not met |
|---|---|---|
| We show what changed after a fix | Compatible before/after locks, intervention date and stable metric definition exist | Show current state and action status; hide change claim |

| Public claim | Publish only when | If gate is not met |
|---|---|---|
| We connect visibility to bookings or leads | Accepted connector, event mapping, attribution rule/window and consent are active | Show Action Readiness or Observed Actions only |

## 19. Technical implementation requirements

This website specification does not authorize provider wiring, database changes or public entitlement changes by itself. Implementation must consume accepted product read models and capability flags.

| Domain | Requirement |
|---|---|
| Framework/routing | Preserve canonical routes; localized route parity; deterministic redirects; no locale catch-all that hides 404s |
| Content | Versioned bilingual content source with EN/RU completeness checks and stable component IDs |
| Capabilities | Every public data block reads an accepted capability flag; no UI claim derived from env-variable presence |
| Pricing | Cards and checkout read the same versioned entitlement registry; plan caps are not duplicated in static copy |
| Product samples | Sample mode is explicit and cannot be confused with a real project; no production tenant data in marketing pages |
| Forms | Server-side validation, rate limiting, spam controls, consent logging and safe error responses |
| Portal | Existing authentication, RLS/tenant boundary and noindex remain intact; marketing deployment cannot expose report data |
| Evidence | Signed/authorized evidence URLs; no token leakage; expiry and error state handled |
| SEO | SSR/static HTML for core copy; metadata, sitemap, robots, canonical and hreflang generated from one route registry |
| Analytics | Consent-aware typed event schema; no PII/evidence payloads |
| Monitoring | 404/redirect, form, checkout, capability, page performance and structured-data alerts |

### 19.1. Capability publication contract

> source capability accepted+ normalized data contract accepted+ persistence and evidence accepted+ entitlement and cost accepted+ UI states accepted= block may be published and soldotherwise = block disabled or absent

- A Railway Dataset ID is configuration, not product availability.
- Website content uses capabilities, never direct environment-variable checks.
- UNKNOWN, partial, locked, unavailable and failed are first-class UI states.
- No generic if/else chain per source in presentation code; use a module/source registry with typed capabilities.

### 19.2. Report/export consistency

- Dashboard, CSV, XLSX, DOCX and PDF projections use one dataset version and identical scope metadata.
- If an export format is unavailable, do not show a dead button or substitute window.print() under a different label.
- Exports include project, location, market, source, intent/keyword, requested/completed dates, status, evidence reference and schema version as applicable.

## 20. Codex implementation plan and acceptance

> EXECUTION RULE: No big-bang redesign. Each phase ends with screenshots, route tests, content diff, accessibility/performance evidence and a short acceptance report.

| Phase | Scope | Required evidence | Release |
|---|---|---|---|
| W0 — inventory | Crawl current EN/RU site, routes, metadata, components, analytics and portal links | URL inventory, redirect proposal, screenshots, preserved routes | No public change |
| W1 — foundations | Route registry, i18n content model, design tokens, header/footer, capability gates | Unit/type tests, locale parity, visual regression baseline | Can merge behind flag |
| W2 — core pages | Home, Hospitality hub, four vertical pages, How it works | Desktop/mobile screenshots, copy acceptance, no dead links | Publish only accepted static claims |
| W3 — commercial | Pricing, check flow, contact, proof templates | Entitlement parity, form security, analytics, consent, checkout gates | Commercial owner GO |
| W4 — product samples | Real accepted screenshots/read models; sample labels | No tenant leakage, state matrix, evidence links | Capability-by-capability |
| W5 — SEO/GEO | Metadata, canonicals, hreflang, schema, sitemap, redirects, Lab links | Automated crawl and rich-results validation | SEO owner GO |
| W6 — release | Browser/a11y/performance/security verification | Acceptance report, rollback, monitoring and owner sign-off | Production GO |

### 20.1. Codex acceptance checklist

- All canonical EN/RU routes return 200, reciprocal hreflang and correct canonical; redirects are one hop.
- Header, mobile menu, footer, language switch and Client Portal link work without breaking current auth.
- Home hierarchy matches this specification and has one primary hospitality narrative.
- No public string contains pilot, beta, coming soon, being developed or configured-only.
- No unsupported claim is visible when its capability flag is OFF.
- Every visible metric includes denominator/scope/date/status and sample values are labelled.
- Pricing cards match the versioned entitlement registry and checkout/quote summary.
- Free check validates input, handles errors, records consent and never returns invented success.
- Portal/private routes are noindex and remain tenant-safe.
- Keyboard, screen reader, contrast, reduced motion and 320–1440 responsive checks pass.
- No critical Lighthouse/Core Web Vitals regression against the agreed baseline.
- No console errors, broken images, dead CTAs, duplicate titles/H1s or orphan indexed pages.
- Automated browser screenshots cover every template in EN and RU at mobile and desktop widths.
- Build, typecheck, unit, integration, route, link, structured-data and browser tests pass in the approved CI environment.

### 20.2. Required implementation artifacts

- Current-site inventory and redirect matrix.
- Content map showing each approved EN/RU string and component ID.
- Route registry and locale parity report.
- Capability/claim matrix tied to accepted product features.
- Pricing entitlement parity report.
- Desktop/mobile visual regression set.
- Accessibility report and resolved critical/serious findings.
- SEO crawl, hreflang, canonical and structured-data report.
- Analytics event validation with PII review.
- Production release, rollback and monitoring checklist.

## 21. Claude independent verification

Claude review is read-only and independent. It verifies the delivered repository/preview against this document and the accepted Architecture/Delta; it does not silently rewrite scope or approve missing evidence.

> REVIEW PROMPT · Claude verification brief · Review the Selena Systems website implementation against Website Architecture & Content v1.0, Product Decision v1.0, Architecture v1.2, Implementation Delta v1.2.1 and Technical Delta v1.3. · Inspect source, built preview and browser output. Do not infer capability from environment variables or planned adapters. · Return VERIFIED / PARTIAL / NOT_STARTED for every acceptance item, with file path, route, screenshot or test evidence. · Check positioning, EN/RU parity, route preservation, claim gates, pricing entitlements, sample labels, UNKNOWN handling, accessibility, responsive behaviour, SEO/GEO, analytics privacy and portal isolation. · Treat any public unsupported capability, hidden scope reduction, broken auth/tenant path, misleading outcome attribution or unlabelled sample data as NO-GO. · Final verdict must be one of: GO, CONDITIONAL GO with exact blockers, or NO-GO. Separate website readiness from runtime/provider/product readiness.

### 21.1. Claude evidence matrix

| Review area | Minimum proof | Automatic NO-GO |
|---|---|---|
| Positioning | Hero/nav/screenshots in EN/RU | Equal-split hero or hospitality hidden |
| Claims | Capability matrix + rendered pages with flags OFF/ON | Unsupported claim visible |
| Pricing | UI/API/registry comparison | Card differs from enforced entitlement |
| Routes | Automated crawl and redirect graph | Broken canonical, redirect chain, lost indexed route |
| Product UI | State screenshots and evidence links | Unknown shown as zero; sample shown as real |
| Accessibility | Automated + keyboard/screen-reader evidence | Critical blocker or inaccessible form/menu |
| Security/privacy | Portal/noindex, form and analytics inspection | Tenant data leak, secret/token/PII exposure |
| Release | CI, rollback and monitoring evidence | No reproducible build or rollback path |

## 22. Final release gates

| Gate | PASS condition | Owner |
|---|---|---|
| G1 — Positioning | Hospitality-first hierarchy and exact public language approved in EN/RU | Product owner |
| G2 — Content truth | Every claim has capability/evidence mapping; unsupported blocks absent | Product + Engineering |
| G3 — Pricing | Caps, cost, billing and entitlement enforcement match public cards | Commercial + Product |
| G4 — Proof | AVLI/KORA or other cases meet permission and evidence standards | Evidence reviewer + client owner |
| G5 — Product | Live UI states, data flow and evidence links accepted for every published module | Engineering + Product |
| G6 — Experience | Responsive, accessibility, browser and performance acceptance pass | Design + QA |
| G7 — SEO/GEO | Crawl, redirects, canonical, hreflang, schema and indexation pass | SEO owner |
| G8 — Release | Staging, monitoring, rollback and independent review approved | Release owner |

> FINAL GO RULE: The target website is designed as the finished product. Production publication is incremental and evidence-gated: a complete accepted block goes live; an incomplete block remains absent. Transitional weakness is managed through release controls, not through weaker public positioning.

## 23. Source hierarchy

- Selena AI Visibility SaaS Architecture TZ v1.2 — technical foundation.
- Selena AI Visibility SaaS Implementation Delta v1.2.1 — accepted implementation boundary and tariffs.
- Selena Systems Product Decision HoReCa Local-First v1.0 — product hierarchy, measures and vertical decision.
- Selena AI Visibility SaaS Technical Delta v1.3 — source modules, capability gates and implementation order.
- This Website Architecture & Content v1.0 — normative target for public information architecture, copy, visual product presentation and website acceptance.

> CONFLICT RULE: If public copy conflicts with an accepted data capability or tariff entitlement, the technical truth and owner-approved entitlement win. Update the copy before publication; never weaken the runtime boundary to match marketing.
