# What the Oxylabs canary of 2026-09-07 actually returned

Nothing. The run bought no answer, and the reason it bought none is worth
more than the answers would have been.

Deployment `3f3d4f90-7909-4c74-b460-461afe89f1ad` on the `measure` service,
staging, commit `95d304a6c42c4826c95229ada50a23c1ff3a9548`, adapter
`oxylabs-perplexity`, ceiling `$0.50` against a planned `$0.2500`. Its whole
runtime log:

```
Measuring 1 project(s) through oxylabs-perplexity
KORA Food Hall — 25 questions × 1 systems (~$0.2500)
  6/25 … 25/25
  cycle 63e3103d-4d41-4716-ba86-9dd786ef0b1c: 0 valid of 25 asked, 0 mention rows, 25 did not complete
  coverage below four fifths — read the counts, not a rate
korafoodhall: SELENA_JOURNAL_INCOMPLETE_CYCLE: outcomes=0/25, ledger=25, cycle=25/25 STOPPED
```

Twenty-five permits resolved in four tenths of a second. Nothing that talks to
a provider is that fast, so the failure is a refusal, not a measurement.

## What refused

The cycle ended `STOPPED`, and only one thing moves a Perplexity cycle to
`STOPPED`: `isPerplexityContractRejection`, whose whole definition is
`/^PROVIDER_HTTP_4\d\d$/`. Oxylabs answered the submission with a 4xx.

Which 4xx is not in this record, because the script printed counts and no
reasons. 401, 402 and 403 are all consistent with what was logged, and they
point at different things — a credential that differs from the copy the
2026-09-06 probe used, an account without balance, a subscription that does
not cover the source. That question is answered on the Oxylabs account, not
in this repository.

The breaker did its work: after the first 4xx the cycle went `STOPPED` and
`assertTransportAllowed` refused the rest before building a request, so the
provider saw at most the first concurrent group of six, not twenty-five.

## Spend

Real spend at the provider is almost certainly zero: a refused submission
creates no job, and there is nothing for an invoice to name.

The ledger disagrees, and that is a defect this run exposed. The adapter
attached the `$0.01` estimate to a submission the provider had refused, on
the wrong side of the boundary its own comment draws — a charge may exist
once a job exists, and here none did. Fixed in the same change as this
record: a 4xx on submission now carries no cost, while a 5xx and a
submission that never came back keep theirs, because those are the cases
where a job may exist behind the error.

## What this run did not test

The wall detector. No answer was reached, so no row was classified
`PROVIDER_AUTH_WALL`, and the code merged the same morning is still unproven
against live Oxylabs output. The canary's first question — is a wall recorded
as a wall — remains open.

## Before the next attempt

1. The Oxylabs account: whether `OXYLABS_USERNAME` and `OXYLABS_PASSWORD` on
   the `measure` service are the pair the 09-06 probe used, and whether the
   account can serve the `perplexity` source at all.
2. The daily claim from this attempt went to settlement rather than
   `COMPLETED`; a repeat is blocked until that state is read, which is the
   guard working.
3. `SELENA_EMERGENCY_STOP=true` and `SELENA_MEASUREMENT_ENABLED=false` were
   restored immediately after the run and confirmed by deployment
   `a9654238-44fd-4f33-b646-c3ba4b532d59`, whose log is `Starting Container`
   then `PROVIDER_CALLS_STOPPED`.
