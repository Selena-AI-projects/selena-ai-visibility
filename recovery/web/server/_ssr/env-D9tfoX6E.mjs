import { c as PROVIDERS_DOCS_URL } from "./constants-ChC5ZOH6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/scrape-targets-Syqlt5qT.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "b7aceddd-359e-4052-adac-38ce9dc09567", e._sentryDebugIdIdentifier = "sentry-dbid-b7aceddd-359e-4052-adac-38ce9dc09567");
	} catch (e) {}
})();
/** Modes with startup env validation. */
var VALIDATED_MODES = [
	"local",
	"demo",
	"whitelabel",
	"cloud"
];
var ENV_REGISTRY = [
	{
		name: "DATABASE_URL",
		scope: "server",
		requiredBy: VALIDATED_MODES,
		description: "PostgreSQL connection string."
	},
	{
		name: "SELENA_RUNTIME_DATABASE_CA_PEM",
		scope: "server",
		requiredBy: "optional",
		description: "PEM-encoded CA certificate bundle for runtime PostgreSQL clients. When set, certificate verification is mandatory."
	},
	{
		name: "APP_URL",
		scope: "server",
		requiredBy: ["cloud"],
		description: "Public base URL of the web app. Required in cloud (used for auth, email links, and Stripe redirects); written by `elmo init` for local."
	},
	{
		name: "AUTH_TRUSTED_ORIGINS",
		scope: "server",
		requiredBy: "optional",
		description: "Comma-separated additional HTTP(S) origins accepted by Better Auth."
	},
	{
		name: "BETTER_AUTH_SECRET",
		scope: "server",
		requiredBy: VALIDATED_MODES,
		description: "Session cookie encryption secret."
	},
	{
		name: "AUTH0_DOMAIN",
		scope: "server",
		requiredBy: "optional",
		description: "Auth0 tenant domain (used for whitelabel logout redirects)."
	},
	{
		name: "AUTH0_CLIENT_ID",
		scope: "server",
		requiredBy: ["whitelabel"],
		description: "Auth0 client ID."
	},
	{
		name: "AUTH0_CLIENT_SECRET",
		scope: "server",
		requiredBy: ["whitelabel"],
		description: "Auth0 client secret."
	},
	{
		name: "AUTH0_AUDIENCE",
		scope: "server",
		requiredBy: "optional",
		description: "Auth0 API audience."
	},
	{
		name: "AUTH0_SCOPE",
		scope: "server",
		requiredBy: "optional",
		description: "Auth0 OAuth scopes."
	},
	{
		name: "AUTH0_MGMT_API_DOMAIN",
		scope: "server",
		requiredBy: ["whitelabel"],
		description: "Auth0 Management API domain."
	},
	{
		name: "UPSTASH_REDIS_REST_URL",
		scope: "server",
		requiredBy: "optional",
		wwwOnly: true,
		description: "Upstash Redis REST URL (www caching: status, GitHub stars/releases)."
	},
	{
		name: "UPSTASH_REDIS_REST_TOKEN",
		scope: "server",
		requiredBy: "optional",
		wwwOnly: true,
		description: "Upstash Redis REST token."
	},
	{
		name: "UPSTASH_REDIS_ENDPOINT",
		scope: "server",
		requiredBy: "optional",
		wwwOnly: true,
		description: "Upstash Redis endpoint."
	},
	{
		name: "DATAFORSEO_LOGIN",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "dataforseo",
		description: "DataForSEO account login."
	},
	{
		name: "DATAFORSEO_PASSWORD",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "dataforseo",
		description: "DataForSEO account password."
	},
	{
		name: "OPENAI_API_KEY",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "openai-api",
		description: "OpenAI API key."
	},
	{
		name: "ANTHROPIC_API_KEY",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "anthropic-api",
		description: "Anthropic API key."
	},
	{
		name: "MISTRAL_API_KEY",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "mistral-api",
		description: "Mistral API key."
	},
	{
		name: "SCRAPE_TARGETS",
		scope: "server",
		requiredBy: VALIDATED_MODES,
		description: "Comma-separated model:provider[:version][:online] entries. Example: chatgpt:olostep:online,google-ai-mode:olostep:online,copilot:olostep:online"
	},
	{
		name: "OLOSTEP_API_KEY",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "olostep",
		description: "Olostep API key."
	},
	{
		name: "BRIGHTDATA_API_TOKEN",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "brightdata",
		description: "BrightData API token."
	},
	{
		name: "OXYLABS_USERNAME",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "oxylabs",
		description: "Oxylabs Web Scraper API username."
	},
	{
		name: "OXYLABS_PASSWORD",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "oxylabs",
		description: "Oxylabs Web Scraper API password."
	},
	{
		name: "CLORO_API_KEY",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "cloro",
		description: "Cloro API key."
	},
	{
		name: "OPENROUTER_API_KEY",
		scope: "server",
		requiredBy: "dynamic-scrape-targets",
		provider: "openrouter",
		description: "OpenRouter API key."
	},
	{
		name: "OPENROUTER_MAX_TOKENS",
		scope: "server",
		requiredBy: "optional",
		description: "Optional OpenRouter API View output cap, from 1 to 4000 tokens; defaults to 1200."
	},
	{
		name: "JINA_API_KEY",
		scope: "server",
		requiredBy: "optional",
		description: "Optional Jina Reader API key for website-excerpt fetching. When set, requests are authenticated (tracked by key, not IP), which raises the rate limit and avoids the anonymous 'bad network reputation' 401 block."
	},
	{
		name: "ELMO_ENCRYPTION_KEY",
		scope: "server",
		requiredBy: ["local"],
		description: "Base64-encoded 32-byte key used to encrypt provider credentials stored in the database. Generate one with: openssl rand -base64 32"
	},
	{
		name: "ELMO_ENCRYPTION_KEY_OLD",
		scope: "server",
		requiredBy: "optional",
		description: "Previous ELMO_ENCRYPTION_KEY values, comma-separated, kept readable while rotating. Set only during a rotation."
	},
	{
		name: "DEPLOYMENT_MODE",
		scope: "server",
		requiredBy: VALIDATED_MODES,
		description: "Deployment mode: local, demo, whitelabel, or cloud."
	},
	{
		name: "ADMIN_AUTH0_SUB",
		scope: "server",
		requiredBy: "optional",
		description: "Auth0 subject claim granted admin access."
	},
	{
		name: "ADMIN_API_KEYS",
		scope: "server",
		requiredBy: "optional",
		description: "Comma-separated bearer tokens accepted by the admin API."
	},
	{
		name: "DEFAULT_BRAND_DOMAINS",
		scope: "server",
		requiredBy: "optional",
		description: "Comma-separated domains added as default brands."
	},
	{
		name: "CLOUD_SIGNUP_ALLOWLIST",
		scope: "server",
		requiredBy: "optional",
		description: "Comma-separated allowlist gating cloud self-serve signup. Entries are exact emails or '@domain' suffixes; '*' opens it to everyone. Empty denies all signups (cloud fails closed)."
	},
	{
		name: "ENVIRONMENT",
		scope: "server",
		requiredBy: "optional",
		description: "Environment name reported to Sentry (e.g. production)."
	},
	{
		name: "VITE_DEPLOYMENT_MODE",
		scope: "client",
		requiredBy: "optional",
		description: "Client-visible copy of DEPLOYMENT_MODE."
	},
	{
		name: "SELENA_SELF_SERVE_SIGNUP_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to open registration to the pilot guest list in local mode, each guest in their own workspace. Off by default, where only the first signup on an empty database is allowed. On its own it opens nothing: SELENA_PILOT_SIGNUP_ALLOWLIST and SELENA_PILOT_SEAT_CAP decide who may register."
	},
	{
		name: "SELENA_PILOT_SIGNUP_ALLOWLIST",
		scope: "server",
		requiredBy: "optional",
		description: "Comma-separated exact email addresses invited to the pilot. Wildcards and '@domain' entries are ignored on purpose — a closed pilot admits named guests, not a domain. Unset admits nobody."
	},
	{
		name: "SELENA_PILOT_SEAT_CAP",
		scope: "server",
		requiredBy: "optional",
		description: "How many pilot accounts may exist, stated independently of the guest list so the two must agree. A guest list longer than this cap is refused rather than trusted. Unset admits nobody."
	},
	{
		name: "SELENA_LOCAL_PROVIDER_EXECUTION_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Only exact 'true' permits Local provider execution; defaults to false. Also requires visibility and an open emergency stop."
	},
	{
		name: "SELENA_LOCAL_EMERGENCY_STOP",
		scope: "server",
		requiredBy: "optional",
		description: "Local execution emergency stop defaults to true. Only exact 'false' opens it; report reads remain independent."
	},
	{
		name: "SELENA_LOCAL_DISPATCH_ORGANIZATION_ID",
		scope: "server",
		requiredBy: "optional",
		description: "Explicit single-organization scope for the Local transactional outbox dispatcher; unset disables dispatch."
	},
	{
		name: "SELENA_LOCAL_OUTBOX_LEASE_MS",
		scope: "server",
		requiredBy: "optional",
		description: "Transactional outbox claim lease in milliseconds; must be a positive deployment value."
	},
	{
		name: "SELENA_LOCAL_OUTBOX_DISPATCH_INTERVAL_MS",
		scope: "server",
		requiredBy: "optional",
		description: "Transactional outbox dispatcher interval; the approved pilot value is 5000 ms."
	},
	{
		name: "SELENA_LOCAL_PROVIDER_LEASE_DURATION_MS",
		scope: "server",
		requiredBy: "optional",
		description: "Lease duration for one Local provider attempt; missing values fail closed."
	},
	{
		name: "SELENA_LOCAL_MAPS_PROVIDER_ID",
		scope: "server",
		requiredBy: "optional",
		description: "Owner-approved live Google Maps rank provider identity."
	},
	{
		name: "SELENA_LOCAL_MAPS_PROVIDER_ENDPOINT",
		scope: "server",
		requiredBy: "optional",
		description: "Owner-approved live Maps provider endpoint; no call is made when unset."
	},
	{
		name: "SELENA_LOCAL_MAPS_PROVIDER_VERSION",
		scope: "server",
		requiredBy: "optional",
		description: "Provider API/version frozen into the Local configuration lock."
	},
	{
		name: "SELENA_LOCAL_MAPS_PROVIDER_API_KEY",
		scope: "server",
		requiredBy: "optional",
		description: "Secret for the owner-approved live Maps provider; never logged or persisted."
	},
	{
		name: "SELENA_LOCAL_MAPS_PROVIDER_TIMEOUT_MS",
		scope: "server",
		requiredBy: "optional",
		description: "Bounded timeout for one live Maps provider request."
	},
	{
		name: "SELENA_LOCAL_DATAFORSEO_ENDPOINT",
		scope: "server",
		requiredBy: "optional",
		description: "Optional DataForSEO Local Maps endpoint override; defaults to the documented Google Maps live endpoint."
	},
	{
		name: "SELENA_LOCAL_DATAFORSEO_VERSION",
		scope: "server",
		requiredBy: "optional",
		description: "Owner-approved DataForSEO contract/version frozen into a Local configuration lock."
	},
	{
		name: "SELENA_LOCAL_DATAFORSEO_PER_ATTEMPT_USD",
		scope: "server",
		requiredBy: "optional",
		description: "Owner-approved worst-case USD price for one DataForSEO Local Maps attempt."
	},
	{
		name: "SELENA_LOCAL_DATAFORSEO_TIMEOUT_MS",
		scope: "server",
		requiredBy: "optional",
		description: "Bounded timeout for one DataForSEO Local Maps request."
	},
	{
		name: "SELENA_LOCAL_VISIBILITY_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to expose the Local Visibility surface. Unset and every other value keep the surface and provider execution disabled."
	},
	{
		name: "VITE_APP_NAME",
		scope: "client",
		requiredBy: ["whitelabel"],
		description: "Application display name (e.g., 'Acme AI Search')."
	},
	{
		name: "VITE_APP_ICON",
		scope: "client",
		requiredBy: ["whitelabel"],
		description: "Application icon URL (must be an external URL, e.g., 'https://cdn.example.com/icon.png')."
	},
	{
		name: "VITE_APP_URL",
		scope: "client",
		requiredBy: ["whitelabel"],
		description: "Application URL (e.g., 'https://ai.example.com/')."
	},
	{
		name: "VITE_APP_PARENT_NAME",
		scope: "client",
		requiredBy: ["whitelabel"],
		description: "Parent application name (e.g., 'Acme')."
	},
	{
		name: "VITE_APP_PARENT_URL",
		scope: "client",
		requiredBy: ["whitelabel"],
		description: "Parent application URL (e.g., 'https://app.example.com/')."
	},
	{
		name: "VITE_OPTIMIZATION_URL_TEMPLATE",
		scope: "client",
		requiredBy: ["whitelabel"],
		description: "URL template for optimization with placeholders {brandId}, {prompt}, {webQuery} (e.g., 'https://app.example.com/optimize?org_id={brandId}&prompt={prompt}&web_query={webQuery}')."
	},
	{
		name: "VITE_PLAUSIBLE_DOMAIN",
		scope: "client",
		requiredBy: "optional",
		description: "Plausible analytics domain."
	},
	{
		name: "VITE_CLARITY_PROJECT_ID",
		scope: "client",
		requiredBy: "optional",
		description: "Microsoft Clarity project ID."
	},
	{
		name: "VITE_ONBOARDING_REDIRECT_URL_TEMPLATE",
		scope: "client",
		requiredBy: "optional",
		description: "Redirect URL template (with {brandId} placeholder) for sending users back to the parent app after onboarding."
	},
	{
		name: "VITE_AUTH0_DOMAIN",
		scope: "client",
		requiredBy: "optional",
		description: "Auth0 domain exposed to the client."
	},
	{
		name: "VITE_AUTH0_CLIENT_ID",
		scope: "client",
		requiredBy: "optional",
		description: "Auth0 client ID exposed to the client."
	},
	{
		name: "BLOB_READ_WRITE_TOKEN",
		scope: "server",
		requiredBy: "optional",
		wwwOnly: true,
		description: "Vercel Blob token (www competitor screenshots)."
	},
	{
		name: "DBOS_SYSTEM_DATABASE_URL",
		scope: "server",
		requiredBy: "optional",
		description: "Override for the DBOS system database URL (read by the DBOS runtime)."
	},
	{
		name: "SENTRY_DSN",
		scope: "server",
		requiredBy: "optional",
		description: "Sentry DSN for server-side error reporting."
	},
	{
		name: "SENTRY_ORG",
		scope: "server",
		requiredBy: "optional",
		description: "Sentry org slug for sourcemap upload at build time."
	},
	{
		name: "SENTRY_PROJECT",
		scope: "server",
		requiredBy: "optional",
		description: "Sentry project slug for sourcemap upload at build time."
	},
	{
		name: "SENTRY_AUTH_TOKEN",
		scope: "server",
		requiredBy: "optional",
		description: "Sentry auth token for sourcemap upload at build time."
	},
	{
		name: "VITE_SENTRY_DSN",
		scope: "client",
		requiredBy: "optional",
		description: "Sentry DSN for browser error reporting."
	},
	{
		name: "VITE_POSTHOG_KEY",
		scope: "client",
		requiredBy: "optional",
		description: "PostHog project API key override."
	},
	{
		name: "VITE_CHART_COLORS",
		scope: "client",
		requiredBy: "optional",
		description: "Comma-separated chart color palette override."
	},
	{
		name: "DISABLE_TELEMETRY",
		scope: "server",
		requiredBy: "optional",
		description: "Set to any value to disable telemetry."
	},
	{
		name: "SELENA_ANSWER_RETENTION_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to let the worker delete raw answer texts whose retention window (CABINET_MODEL §4a) has passed. Unset means off: deleting customer evidence is an owner decision."
	},
	{
		name: "SELENA_LOCAL_CURSOR_HMAC_SECRET",
		scope: "server",
		requiredBy: "optional",
		description: "Owner-managed HMAC secret for tenant-bound Local API pagination cursors. Paginated Local reads fail closed when it is unavailable."
	},
	{
		name: "SELENA_EVIDENCE_S3_ENDPOINT",
		scope: "server",
		requiredBy: "optional",
		description: "HTTPS endpoint of the S3-compatible store holding raw evidence objects. Unset means signed evidence links answer 'unavailable'."
	},
	{
		name: "SELENA_EVIDENCE_S3_BUCKET",
		scope: "server",
		requiredBy: "optional",
		description: "Bucket of the raw evidence store."
	},
	{
		name: "SELENA_EVIDENCE_S3_REGION",
		scope: "server",
		requiredBy: "optional",
		description: "Region used in SigV4 signing for the raw evidence store."
	},
	{
		name: "SELENA_EVIDENCE_S3_ACCESS_KEY_ID",
		scope: "server",
		requiredBy: "optional",
		credential: true,
		description: "Access key id for signing raw evidence links."
	},
	{
		name: "SELENA_EVIDENCE_S3_SECRET_ACCESS_KEY",
		scope: "server",
		requiredBy: "optional",
		credential: true,
		description: "Secret key for signing raw evidence links. Never sent to a client; only signatures derived from it are."
	},
	{
		name: "STRIPE_SECRET_KEY",
		scope: "server",
		requiredBy: ["cloud"],
		description: "Stripe secret API key (sk_...) for subscription billing."
	},
	{
		name: "STRIPE_WEBHOOK_SECRET",
		scope: "server",
		requiredBy: ["cloud"],
		description: "Stripe webhook signing secret (whsec_...) for verifying billing webhooks."
	},
	{
		name: "RESEND_API_KEY",
		scope: "server",
		requiredBy: ["cloud"],
		description: "Resend API key for transactional email."
	},
	{
		name: "GOOGLE_CLIENT_ID",
		scope: "server",
		requiredBy: ["cloud"],
		description: "Google OAuth client ID for cloud social sign-in."
	},
	{
		name: "GOOGLE_CLIENT_SECRET",
		scope: "server",
		requiredBy: ["cloud"],
		description: "Google OAuth client secret."
	},
	{
		name: "SELENA_EMERGENCY_STOP",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to refuse every provider call — measurement, canary and suggestion alike. Unset means the stop is not engaged; the per-path gates still decide on their own."
	},
	{
		name: "SELENA_MEASUREMENT_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to let approved orders execute against providers. Anything else, a misspelling included, keeps paid execution off."
	},
	{
		name: "SELENA_MEASUREMENT_ADAPTER",
		scope: "server",
		requiredBy: "optional",
		description: "Names the adapter an approved run may use, from the owner-approved allowlist. Unset runs the inert noop adapter, which spends nothing."
	},
	{
		name: "SELENA_MEASUREMENT_APPROVED_COMMIT_SHA",
		scope: "server",
		requiredBy: "optional",
		description: "Commit the owner approved measurement for. The deployment gate refuses to execute any other one."
	},
	{
		name: "SELENA_MEASUREMENT_APPROVED_ENVIRONMENT",
		scope: "server",
		requiredBy: "optional",
		description: "Environment name that measurement approval covers."
	},
	{
		name: "SELENA_RECURRING_JOBS_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to let pg-boss keep recurring schedules. Anything else removes every managed schedule at boot."
	},
	{
		name: "SELENA_PGBOSS_OWNER_MANAGED_SCHEMA",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' when the pg-boss schema is owned and migrated by the owner instead of created by the worker."
	},
	{
		name: "SELENA_PAYMENTS_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to accept payment writes. Off by design while there is no live checkout."
	},
	{
		name: "SELENA_PAYMENT_MODE",
		scope: "server",
		requiredBy: "optional",
		description: "Which payment path is in effect. Fixture mode while live payments are off."
	},
	{
		name: "SELENA_STAGING_SIMULATION_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to accept the staging verification simulation. Refused outright in a production environment regardless of this value; production Telegram delivery stays on HOLD either way."
	},
	{
		name: "SELENA_SIMULATION_SIGNING_SECRET",
		scope: "server",
		requiredBy: "optional",
		description: "HMAC secret for simulated payment events and Telegram connect tokens. Without it the simulation cannot accept an event or mint a link."
	},
	{
		name: "SELENA_SIMULATION_CONNECT_TTL_MINUTES",
		scope: "server",
		requiredBy: "optional",
		description: "How long a staging connect link stays valid, in minutes. Left unset the product default applies; a rehearsal may lengthen it so the exercise does not fail on a round trip."
	},
	{
		name: "SELENA_TELEGRAM_BOT_TOKEN",
		scope: "server",
		requiredBy: "optional",
		description: "Staging Telegram bot credential. Never stored in the database and redacted from any error this code reports."
	},
	{
		name: "SELENA_TELEGRAM_BOT_USERNAME",
		scope: "server",
		requiredBy: "optional",
		description: "Staging Telegram bot username, used to build the connect deep link."
	},
	{
		name: "SELENA_TELEGRAM_WEBHOOK_SECRET",
		scope: "server",
		requiredBy: "optional",
		description: "Value Telegram echoes in X-Telegram-Bot-Api-Secret-Token, so an update that did not come from Telegram is refused."
	},
	{
		name: "SELENA_PROVIDER_BUDGET_USD",
		scope: "server",
		requiredBy: "optional",
		description: "Ceiling for one order's worst-case provider cost, checked at preflight. Not a running total — cumulative spending is metered in sv_provider_spend_budgets, where the runtime cannot raise it."
	},
	{
		name: "SELENA_FREE_AI_VISIBILITY_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to allow one verified-email user claim per registrable domain for the isolated free AI Visibility check. Defaults off."
	},
	{
		name: "SELENA_FREE_AUTO_DISPATCH_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to let a request that a pilot seat already made free start its own measurement instead of waiting on the order desk."
	},
	{
		name: "SELENA_FREE_AUTO_DISPATCH_MAX_PER_DAY",
		scope: "server",
		requiredBy: "optional",
		description: "Daily ceiling on free auto-dispatch across every account, because a leaked code is used from fresh ones. Default 3."
	},
	{
		name: "SELENA_FREE_AUTO_DISPATCH_MAX_PER_PROJECT_PER_DAY",
		scope: "server",
		requiredBy: "optional",
		description: "Daily ceiling on free auto-dispatch for one project. Default 1."
	},
	{
		name: "SELENA_ANONYMOUS_SUGGEST_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to let a visitor with no account request a profile suggestion."
	},
	{
		name: "SELENA_ANONYMOUS_SUGGEST_MAX_PER_DAY",
		scope: "server",
		requiredBy: "optional",
		description: "Daily ceiling on anonymous suggestions across every visitor."
	},
	{
		name: "SELENA_ANONYMOUS_SUGGEST_MAX_PER_VISITOR_PER_DAY",
		scope: "server",
		requiredBy: "optional",
		description: "Daily ceiling on anonymous suggestions for one visitor."
	},
	{
		name: "SELENA_BRIGHTDATA_ENDPOINT",
		scope: "server",
		requiredBy: "optional",
		description: "Overrides the Bright Data dataset endpoint. Unset uses the vendor default."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_CHATGPT",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the ChatGPT surface. A dataset id names a public collector, not a secret; unset means the surface is not registered and the family is refused before a permit is claimed."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_GEMINI",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Gemini surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_PERPLEXITY",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Perplexity surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_GOOGLE_AI",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Google AI Mode surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_GOOGLE_SERP",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Google search results surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_PLACE",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Google Maps place surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_REVIEWS",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Google Maps reviews surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_GOOGLE_HOTELS",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Google Hotels surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_PROFILES",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Instagram profile surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_POSTS",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Instagram post surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_REELS",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Instagram reel surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_INSTAGRAM_COMMENTS",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Instagram comment surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_TIKTOK_PROFILES",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the TikTok profile surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_TIKTOK_POSTS",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the TikTok post surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_REDDIT_POSTS",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the Reddit post surface."
	},
	{
		name: "SELENA_BRIGHTDATA_DATASET_YOUTUBE_VIDEOS",
		scope: "server",
		requiredBy: "optional",
		description: "Collector id for the YouTube video surface."
	},
	{
		name: "SELENA_GOOGLE_AI_MODE_CANARY_OWNER_APPROVED",
		scope: "server",
		requiredBy: "optional",
		description: "Owner approval for one Google AI Mode canary execution. Unset refuses the run."
	},
	{
		name: "SELENA_GOOGLE_AI_MODE_CANARY_ORGANIZATION_ID",
		scope: "server",
		requiredBy: "optional",
		description: "Organization the approved canary is attributed to."
	},
	{
		name: "SELENA_GOOGLE_AI_MODE_CANARY_PROJECT_ID",
		scope: "server",
		requiredBy: "optional",
		description: "Project the approved canary is attributed to."
	},
	{
		name: "SELENA_GOOGLE_AI_MODE_CANARY_INPUT_JSON",
		scope: "server",
		requiredBy: "optional",
		description: "Exact input the approved canary sends, as JSON. Nothing is inferred when it is absent."
	},
	{
		name: "SELENA_GOOGLE_AI_MODE_CANARY_COST_PREFLIGHT_JSON",
		scope: "server",
		requiredBy: "optional",
		description: "Cost preflight the owner approved for the canary, as JSON."
	},
	{
		name: "SELENA_GOOGLE_AI_MODE_CANARY_REDACTION_APPROVED",
		scope: "server",
		requiredBy: "optional",
		description: "Owner approval for the redaction applied to the canary's stored payload."
	},
	{
		name: "SELENA_JOURNAL_PUBLISH_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to let the worker publish the build journal. Unset means it is written and not published."
	},
	{
		name: "SELENA_JOURNAL_PROJECTS",
		scope: "server",
		requiredBy: "optional",
		description: "Projects the journal publisher covers."
	},
	{
		name: "SELENA_JOURNAL_SITE_REPO",
		scope: "server",
		requiredBy: "optional",
		description: "Repository the published journal is written to."
	},
	{
		name: "SELENA_JOURNAL_SITE_BASE",
		scope: "server",
		requiredBy: "optional",
		description: "Base path the published journal is served under."
	},
	{
		name: "SELENA_JOURNAL_FORCE",
		scope: "server",
		requiredBy: "optional",
		description: "Set to 'true' to republish a journal entry that is already present."
	},
	{
		name: "SELENA_SUGGEST_LLM",
		scope: "server",
		requiredBy: "optional",
		description: "Names the budget class that pays for the onboarding suggestion's LLM call. Unset is off, and so is any value other than 'free_budget': the button is free to the customer and is a real round trip on a live key."
	},
	{
		name: "SELENA_JOURNAL_MAX_COST_USD",
		scope: "server",
		requiredBy: "optional",
		description: "Ceiling the measure-journal entrypoint refuses to start above. Required by that script, which has no default."
	},
	{
		name: "SELENA_SEARCH_VISIBILITY_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Feature flag for the Search Visibility surface. The surface has no runtime adapter, so the shared guard refuses it even when this is set."
	},
	{
		name: "SELENA_REPUTATION_ENABLED",
		scope: "server",
		requiredBy: "optional",
		description: "Feature flag for the Reputation surface. The surface has no runtime adapter, so the shared guard refuses it even when this is set."
	},
	{
		name: "RESEND_FROM_EMAIL",
		scope: "server",
		requiredBy: ["cloud"],
		description: "Sender address for transactional email, in the form: Elmo <notifications@updates.example.com>. The domain must be verified in Resend."
	}
];
var CREDENTIAL_ENV_NAMES = new Set(ENV_REGISTRY.filter((spec) => spec.credential || spec.requiredBy === "dynamic-scrape-targets" && spec.provider).map((spec) => spec.name));
/**
* The single module that parses and formats the SCRAPE_TARGETS env var.
*
* Format: model:provider[:version][:online]
* - model: AI model to track (chatgpt, google-ai-mode, copilot, etc.)
* - provider: How to reach it (olostep, brightdata, direct, openrouter, dataforseo)
* - version: Specific version slug, required for direct/openrouter (may contain colons for OpenRouter variants)
* - :online: Append to enable web search. Omit = no web search.
*/
/**
* Parse the SCRAPE_TARGETS env var into structured ModelConfig objects.
*
* Parsing: split on ":". First = model, second = provider. If last segment is "online",
* pop it (websearch = true). Remaining middle segments rejoined with ":" = version slug.
* This naturally handles OpenRouter variant suffixes like ":free".
*/
function parseScrapeTargets(envValue) {
	if (!envValue || !envValue.trim()) throw new Error(`SCRAPE_TARGETS environment variable is required. Set it to configure which AI models to track. Example:
  SCRAPE_TARGETS=chatgpt:olostep:online,google-ai-mode:olostep:online,copilot:olostep:online
See ${PROVIDERS_DOCS_URL} for details.`);
	return envValue.split(",").map((raw) => {
		const trimmed = raw.trim();
		if (!trimmed) throw new Error("Invalid SCRAPE_TARGETS: empty entry (check for trailing commas)");
		const parts = trimmed.split(":");
		if (parts.length < 2) throw new Error(`Invalid SCRAPE_TARGETS entry: "${trimmed}" (need at least model:provider)`);
		const model = parts[0];
		const provider = parts[1];
		const webSearch = parts[parts.length - 1] === "online";
		const versionParts = parts.slice(2, webSearch ? -1 : void 0);
		return {
			model,
			provider,
			version: versionParts.length > 0 ? versionParts.join(":") : void 0,
			webSearch
		};
	});
}
/** Provider:model targets shown on the public status page. */
var STATUS_TARGETS = [
	"chatgpt:olostep:online",
	"google-ai-mode:olostep:online",
	"google-ai-overview:olostep:online",
	"gemini:olostep:online",
	"copilot:olostep:online",
	"perplexity:olostep:online",
	"chatgpt:brightdata",
	"chatgpt:brightdata:online",
	"google-ai-mode:brightdata:online",
	"gemini:brightdata:online",
	"perplexity:brightdata:online",
	"copilot:brightdata:online",
	"google-ai-overview:brightdata:online",
	"chatgpt:oxylabs",
	"chatgpt:oxylabs:online",
	"google-ai-mode:oxylabs:online",
	"google-ai-overview:oxylabs:online",
	"perplexity:oxylabs:online",
	"chatgpt:cloro:online",
	"perplexity:cloro:online",
	"copilot:cloro:online",
	"gemini:cloro:online",
	"google-ai-mode:cloro:online",
	"google-ai-overview:cloro:online",
	"google-ai-mode:dataforseo:online",
	"google-ai-overview:dataforseo:online",
	"chatgpt:dataforseo:online",
	"gemini:dataforseo:online",
	"perplexity:dataforseo:online",
	"chatgpt:dataforseo:gpt-5.5:online",
	"gemini:dataforseo:gemini-2.5-flash:online",
	"chatgpt:openai-api:gpt-5-mini",
	"chatgpt:openai-api:gpt-5-mini:online",
	"claude:anthropic-api:claude-sonnet-5",
	"claude:anthropic-api:claude-sonnet-5:online",
	"claude:openrouter:anthropic/claude-sonnet-5",
	"claude:openrouter:anthropic/claude-sonnet-5:online",
	"chatgpt:openrouter:openai/gpt-5-mini",
	"chatgpt:openrouter:openai/gpt-5-mini:online",
	"gemini:openrouter:google/gemini-2.5-flash",
	"gemini:openrouter:google/gemini-2.5-flash:online",
	"deepseek:openrouter:deepseek/deepseek-v3.2",
	"qwen:openrouter:qwen/qwen3-235b-a22b",
	"kimi:openrouter:moonshotai/kimi-k3",
	"grok:openrouter:x-ai/grok-4.5",
	"grok:openrouter:x-ai/grok-4.5:online",
	"mistral:openrouter:mistralai/mistral-medium-3.1",
	"perplexity:openrouter:perplexity/sonar:online",
	"mistral:mistral-api:mistral-medium-latest",
	"mistral:mistral-api:mistral-medium-latest:online"
];
/**
* Which providers can serve each trackable model, derived from STATUS_TARGETS so
* the answer is limited to combinations the scheduled provider workflow actually
* exercises. Used to tell a self-hosted operator what they would need in order
* to track a platform they have not configured yet.
*/
function providersByModel() {
	const byModel = /* @__PURE__ */ new Map();
	for (const target of parseScrapeTargets(STATUS_TARGETS.join(","))) {
		const providers = byModel.get(target.model) ?? /* @__PURE__ */ new Set();
		providers.add(target.provider);
		byModel.set(target.model, providers);
	}
	return new Map([...byModel].map(([model, providers]) => [model, [...providers].sort()]));
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/env-D9tfoX6E.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "45438a3a-fb67-4bad-86e1-58e22bfed442", e._sentryDebugIdIdentifier = "sentry-dbid-45438a3a-fb67-4bad-86e1-58e22bfed442");
	} catch (e) {}
})();
/**
* Check if an environment variable has a non-empty value
*/
var hasValue = (value) => typeof value === "string" && value.trim().length > 0;
/**
* Create a requirement checker that requires all specified keys to have values
*/
var requireAll = (keys) => (env) => keys.every((key) => hasValue(env[key]));
/**
* Create a simple env requirement for a single key
*/
function createEnvRequirement(key, description) {
	return {
		id: key,
		label: key,
		description,
		isSatisfied: requireAll([key])
	};
}
/**
* Requirements for every registry var hard-required by the given mode.
*/
function buildStaticRequirements(mode) {
	return ENV_REGISTRY.filter((spec) => Array.isArray(spec.requiredBy) && spec.requiredBy.includes(mode)).map((spec) => createEnvRequirement(spec.name, spec.description));
}
/**
* Build env requirements for exactly the provider keys referenced by SCRAPE_TARGETS.
*/
function buildProviderKeyRequirements(env = process.env) {
	let providers;
	try {
		providers = [...new Set(parseScrapeTargets(env.SCRAPE_TARGETS).map((target) => target.provider))];
	} catch {
		return [];
	}
	const requirements = [];
	for (const provider of providers) {
		const keys = ENV_REGISTRY.filter((spec) => spec.requiredBy === "dynamic-scrape-targets" && spec.provider === provider).map((spec) => spec.name);
		if (keys.length === 0) continue;
		requirements.push({
			id: `PROVIDER_${provider.toUpperCase().replace(/-/g, "_")}`,
			label: keys.join(" + "),
			description: `Required by SCRAPE_TARGETS provider "${provider}".`,
			isSatisfied: requireAll(keys)
		});
	}
	return requirements;
}
var ENV_REQUIREMENTS = {
	local: [...buildStaticRequirements("local"), ...buildProviderKeyRequirements()],
	demo: [...buildStaticRequirements("demo"), ...buildProviderKeyRequirements()],
	whitelabel: [...buildStaticRequirements("whitelabel"), ...buildProviderKeyRequirements()],
	cloud: [...buildStaticRequirements("cloud"), ...buildProviderKeyRequirements()]
};
/**
* Get the deployment mode from environment variables
*
* Defaults to "local" for OSS builds. The build system should set
* DEPLOYMENT_MODE appropriately for each environment.
*/
var VALID_MODES = [
	"local",
	"demo",
	"whitelabel",
	"cloud"
];
function getDeploymentModeFromEnv(env = process.env) {
	const mode = env.DEPLOYMENT_MODE?.toLowerCase();
	if (!mode) throw new Error("DEPLOYMENT_MODE environment variable is required");
	if (!VALID_MODES.includes(mode)) throw new Error(`Invalid DEPLOYMENT_MODE: "${mode}". Must be one of: ${VALID_MODES.join(", ")}`);
	return mode;
}
function getEnvRequirements(mode) {
	return ENV_REQUIREMENTS[mode];
}
function getEnvValidationState(env = process.env) {
	const mode = getDeploymentModeFromEnv(env);
	const requirements = getEnvRequirements(mode);
	const missing = requirements.filter((requirement) => !requirement.isSatisfied(env)).map((requirement) => ({
		id: requirement.id,
		label: requirement.label,
		description: requirement.description
	}));
	return {
		mode,
		requirements,
		missing,
		isValid: missing.length === 0
	};
}
function formatMissingEnvVars(keys) {
	return keys.length === 1 ? `Missing required environment variable: ${keys[0]}` : `Missing required environment variables: ${keys.join(", ")}`;
}
/**
* Require one or more environment variables, throwing a single error that names
* every missing key. Returns the resolved values keyed by the requested names.
*/
function requireEnvVars(keys, env = process.env) {
	const missing = keys.filter((key) => !hasValue(env[key]));
	if (missing.length > 0) throw new Error(formatMissingEnvVars(missing));
	return Object.fromEntries(keys.map((key) => [key, env[key]]));
}
/**
* Get an optional environment variable with a default value
*/
function getEnv(key, defaultValue, env = process.env) {
	const value = env[key];
	return hasValue(value) ? value : defaultValue;
}
/**
* Variables the deployment sets that no code reads.
*
* Every Selena gate is fail-closed on the exact string, which is the right
* default and also the reason a typo is invisible: `SELENA_EMERGENCE_STOP` is
* not a broken stop, it is no stop at all, and nothing complains. Boot prints
* the ones it does not recognise, with the closest name it does, so the
* mistake is found by reading the log rather than by discovering later that a
* ceiling was never in force.
*
* Names outside the product runtime — the migration runner's own settings, and
* whatever the host injects — are not the app's to know about, so they are not
* reported.
*/
var MIGRATION_RUNNER_ENV_NAMES = /* @__PURE__ */ new Set([
	"SELENA_MIGRATIONS_DIR",
	"SELENA_MIGRATION_MAX_INDEX",
	"SELENA_MIGRATION_APPROVED_SHA",
	"SELENA_MIGRATION_APPROVAL_REQUIRED",
	"SELENA_MIGRATION_SOURCE_SHA",
	"SELENA_BOUNDED_MIGRATIONS_DIR"
]);
function editDistance(left, right) {
	const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let i = 1; i <= left.length; i += 1) {
		let diagonal = previous[0];
		previous[0] = i;
		for (let j = 1; j <= right.length; j += 1) {
			const candidate = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
			diagonal = previous[j];
			previous[j] = candidate;
		}
	}
	return previous[right.length];
}
/** The registered name a misspelling most likely meant, when one is close enough. */
function nearestKnownEnvName(name) {
	let best = null;
	for (const spec of ENV_REGISTRY) {
		const distance = editDistance(name, spec.name);
		if (!best || distance < best.distance) best = {
			name: spec.name,
			distance
		};
	}
	return best && best.distance <= Math.max(2, Math.floor(name.length / 3)) ? best.name : null;
}
function unknownSelenaEnvNames(env = process.env) {
	const known = new Set(ENV_REGISTRY.map((spec) => spec.name));
	return Object.keys(env).filter((name) => name.startsWith("SELENA_")).filter((name) => !known.has(name) && !MIGRATION_RUNNER_ENV_NAMES.has(name)).sort();
}
/**
* Prints rather than throws. An unrecognised variable is usually a typo and
* sometimes a leftover from a previous release; neither is worth refusing to
* start a service over, and both are worth seeing.
*/
function reportUnknownSelenaEnv(env = process.env, log = console.warn) {
	for (const name of unknownSelenaEnvNames(env)) {
		const suggestion = nearestKnownEnvName(name);
		log(`[env] ${name} is set but nothing reads it${suggestion ? ` — did you mean ${suggestion}?` : ""}`);
	}
}
//#endregion
export { requireEnvVars as a, providersByModel as c, reportUnknownSelenaEnv as i, getEnv as n, CREDENTIAL_ENV_NAMES as o, getEnvValidationState as r, parseScrapeTargets as s, getDeploymentModeFromEnv as t };

//# sourceMappingURL=env-D9tfoX6E.mjs.map