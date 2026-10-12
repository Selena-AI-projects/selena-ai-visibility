# Selena AI Visibility — Product Catalog Lock V1 (RC6)

Catalog version: `selena-catalog-rc6-v1`  
Source of truth: `packages/selena-visibility-contracts/src/catalog.ts`

## Locked packages

| Plan | Price | Scope | Planned answers | Verification | Purchase |
| --- | ---: | --- | ---: | --- | --- |
| Visitor Local | $49/month | 1 language, 100 scenarios, ChatGPT and Gemini (Visitor View) + Perplexity (API), 1 repeat | 100 × 3 × 1 = 300 | Automated — not expert verified | Self-service test checkout |
| Full AI Landscape | $79/month | Up to 2 languages, 100 total language scenarios, 8 systems (2 Visitor View + Perplexity (API) and 5 API models), 1 repeat | 100 × 8 × 1 = 800 | Automated — not expert verified | Self-service test checkout |
| Expert Verified | $399 one-time | 10 families, 2 languages, 20 scenarios, the same 8 systems, 5 repeats | 20 × 8 × 5 = 800 | Awaiting expert review until QC record | Self-service test checkout |
| Growth 90 Days | $2,490 | Custom immutable scope; the same 8 systems; cycles/scenarios/repeats/labor/cost cap required | Not assumed | Awaiting expert review | Manual approval / contact sales |

Visitor View measures ChatGPT and Gemini. Perplexity's website as a visitor
sees it is being connected and is not measured yet, so no plan mints a Visitor
View run for it. API View is Perplexity (API) — system id `perplexity/sonar`,
measured through DataForSEO's live Sonar response, which runs its own web
search — and Claude, DeepSeek, Qwen, Mistral and Grok, the five OpenRouter
models. API View uses exact model IDs from the contract and web search is off
by default for the five OpenRouter models. Locks written under
`selena-catalog-v4` carry Perplexity (API); v2 and v3 locks read as they were
sold, and approving an undispatched lock that names Visitor View Perplexity is
refused. The two channels are never merged
into one opaque metric; divergence is calculated only for comparable results.

## Safety and commercial lock

Every quote/order snapshot stores catalog version, plan, scope, price, currency,
model IDs, cardinality, retry reserve and Configuration Lock hash. A catalog
change cannot mutate an existing order. Overflow at one answer, order/provider
cap exceedance, duplicate dispatch, maintenance/direct-dispatch conflict, or
more than one technical-invalid retry stops safely before transport.

Staging uses fixture pricing only: payments, provider calls, measurement jobs
and recurring maintenance remain off. Growth cannot be purchased without a
locked custom scope, cycle count, scenarios, languages, systems, repeats, labor
cap, provider cost cap, margin floor and admin approval.

Google Places is excluded from the MVP. Public business/review signals are
described only as available from approved public sources, Website Collector,
uploaded evidence or optional connected accounts. Instagram is optional and
gated by ToS, attribution, retention and OAuth requirements.
