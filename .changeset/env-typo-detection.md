---
"@workspace/config": patch
"@workspace/web": patch
---

Services now list any `SELENA_*` variable that is set but unread at boot, with the closest registered name, so a misspelled flag is visible instead of silently meaning "off".
