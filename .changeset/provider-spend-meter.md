---
"@workspace/lib": patch
"@workspace/web": patch
---

Provider spending now has a running total: the onboarding suggestion holds budget against a database-stored ceiling before the model is called, settles what the call cost, and returns the hold when the call produced nothing.
