# Selena AI Visibility — Product Catalog Lock V1 (RC6)

Catalog version: `selena-catalog-rc6-v1`  
Source of truth: `packages/selena-visibility-contracts/src/catalog.ts`

## Locked packages

| Plan | Price | Scope | Planned answers | Verification | Purchase |
| --- | ---: | --- | ---: | --- | --- |
| Visitor Local | $49/month | 1 language, 100 scenarios, ChatGPT/Gemini measured (Perplexity being connected, not measured yet), 1 repeat | 100 × 2 × 1 = 200 until Perplexity is connected; 100 × 3 × 1 = 300 once it is | Automated — not expert verified | Self-service test checkout |
| Full AI Landscape | $79/month | Up to 2 languages, 100 total language scenarios, 7 systems measured (Perplexity being connected), 1 repeat | 100 × 7 × 1 = 700 until Perplexity is connected; 100 × 8 × 1 = 800 once it is | Automated — not expert verified | Self-service test checkout |
| Expert Verified | $399 one-time | 10 families, 2 languages, 20 scenarios, 7 systems measured (Perplexity being connected), 5 repeats | 20 × 7 × 5 = 700 until Perplexity is connected; 20 × 8 × 5 = 800 once it is | Awaiting expert review until QC record | Self-service test checkout |
| Growth 90 Days | $2,490 | Custom immutable scope; the measured systems (Perplexity being connected); cycles/scenarios/repeats/labor/cost cap required | Not assumed | Awaiting expert review | Manual approval / contact sales |

Visitor View measures ChatGPT and Gemini; Perplexity is being connected and
is not measured yet, so no plan mints a run for it. API View is Claude,
DeepSeek, Qwen, Mistral and Grok. API View uses exact model IDs from the
contract and web search is off by default. The two channels are never merged
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
