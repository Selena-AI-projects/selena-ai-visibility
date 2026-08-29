---
"@workspace/selena-visibility-contracts": patch
"@workspace/web": patch
---

Added `SELENA_SELF_SERVE_SIGNUP_ENABLED`, which opens registration without moving the deployment to cloud mode; each new account is provisioned its own workspace. Added `SELENA_ANONYMOUS_SUGGEST_ENABLED` and its daily caps, which will govern question suggestion before sign-up.
