/// <reference types="vite/client" />

// Every var here must have an entry in packages/config/src/env-registry.ts
// (enforced by env-registry.test.ts).

interface ImportMetaEnv {
	// Deployment mode
	readonly VITE_DEPLOYMENT_MODE: string;

	// Branding (whitelabel only - local/demo use server-side defaults)
	readonly VITE_APP_NAME?: string;
	readonly VITE_APP_ICON?: string;
	readonly VITE_APP_URL?: string;
	readonly VITE_APP_PARENT_NAME?: string;
	readonly VITE_APP_PARENT_URL?: string;
	readonly VITE_OPTIMIZATION_URL_TEMPLATE?: string;
	readonly VITE_ONBOARDING_REDIRECT_URL_TEMPLATE?: string;
	readonly VITE_CHART_COLORS?: string;

	// Auth0 (whitelabel)
	readonly VITE_AUTH0_DOMAIN?: string;
	readonly VITE_AUTH0_CLIENT_ID?: string;

	// Analytics
	readonly VITE_PLAUSIBLE_DOMAIN?: string;
	readonly VITE_CLARITY_PROJECT_ID?: string;
	readonly VITE_POSTHOG_KEY?: string;

	// Sentry
	readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Server-side environment variables (accessed via process.env in server functions)
// and Vite define globals
declare global {
	// App version injected by Vite define
	const __APP_VERSION__: string;
	namespace NodeJS {
		interface ProcessEnv {
			readonly DEPLOYMENT_MODE: string;
			readonly SELENA_LOCAL_VISIBILITY_ENABLED?: string;
			readonly SELENA_SELF_SERVE_SIGNUP_ENABLED?: string;
			readonly SELENA_PILOT_SIGNUP_ALLOWLIST?: string;
			readonly SELENA_PILOT_SEAT_CAP?: string;
			readonly SELENA_RUNTIME_DATABASE_CA_PEM?: string;
			readonly DATABASE_URL: string;
			readonly APP_URL?: string;
			readonly AUTH_TRUSTED_ORIGINS?: string;
			readonly SCRAPE_TARGETS?: string;
			readonly OPENAI_API_KEY: string;
			readonly ANTHROPIC_API_KEY: string;
			readonly MISTRAL_API_KEY?: string;
			readonly OPENROUTER_API_KEY?: string;
			readonly OPENROUTER_MAX_TOKENS?: string;
			readonly OLOSTEP_API_KEY?: string;
			readonly BRIGHTDATA_API_TOKEN?: string;
			readonly OXYLABS_USERNAME?: string;
			readonly OXYLABS_PASSWORD?: string;
			readonly CLORO_API_KEY?: string;
			readonly JINA_API_KEY?: string;
			readonly ELMO_ENCRYPTION_KEY?: string;
			readonly ELMO_ENCRYPTION_KEY_OLD?: string;
			readonly DATAFORSEO_LOGIN: string;
			readonly DATAFORSEO_PASSWORD: string;
			readonly BETTER_AUTH_SECRET?: string;
			readonly AUTH0_DOMAIN?: string;
			readonly AUTH0_AUDIENCE?: string;
			readonly AUTH0_SCOPE?: string;
			readonly AUTH0_MGMT_API_DOMAIN?: string;
			readonly AUTH0_CLIENT_ID?: string;
			readonly AUTH0_CLIENT_SECRET?: string;
			readonly ADMIN_AUTH0_SUB?: string;
			readonly ADMIN_API_KEYS?: string;
			readonly DEFAULT_BRAND_DOMAINS?: string;
			readonly CLOUD_SIGNUP_ALLOWLIST?: string;
			readonly ENVIRONMENT?: string;
			readonly DBOS_SYSTEM_DATABASE_URL?: string;
			readonly SENTRY_DSN?: string;
			readonly SENTRY_ORG?: string;
			readonly SENTRY_PROJECT?: string;
			readonly SENTRY_AUTH_TOKEN?: string;
			readonly DISABLE_TELEMETRY?: string;
			readonly SELENA_ANSWER_RETENTION_ENABLED?: string;
			readonly SELENA_SUGGEST_LLM?: string;
			readonly SELENA_JOURNAL_MAX_COST_USD?: string;
			readonly SELENA_SEARCH_VISIBILITY_ENABLED?: string;
			readonly SELENA_REPUTATION_ENABLED?: string;
			readonly SELENA_EMERGENCY_STOP?: string;
			readonly SELENA_MEASUREMENT_ENABLED?: string;
			readonly SELENA_MEASUREMENT_ADAPTER?: string;
			readonly SELENA_MEASUREMENT_APPROVED_COMMIT_SHA?: string;
			readonly SELENA_MEASUREMENT_APPROVED_ENVIRONMENT?: string;
			readonly SELENA_RECURRING_JOBS_ENABLED?: string;
			readonly SELENA_PGBOSS_OWNER_MANAGED_SCHEMA?: string;
			readonly SELENA_PAYMENTS_ENABLED?: string;
			readonly SELENA_PAYMENT_MODE?: string;
			readonly SELENA_PROVIDER_BUDGET_USD?: string;
			readonly SELENA_FREE_AUTO_DISPATCH_ENABLED?: string;
			readonly SELENA_FREE_AUTO_DISPATCH_MAX_PER_DAY?: string;
			readonly SELENA_FREE_AUTO_DISPATCH_MAX_PER_PROJECT_PER_DAY?: string;
			readonly SELENA_ANONYMOUS_SUGGEST_ENABLED?: string;
			readonly SELENA_ANONYMOUS_SUGGEST_MAX_PER_DAY?: string;
			readonly SELENA_ANONYMOUS_SUGGEST_MAX_PER_VISITOR_PER_DAY?: string;
			readonly SELENA_BRIGHTDATA_ENDPOINT?: string;
			readonly SELENA_BRIGHTDATA_DATASET_CHATGPT?: string;
			readonly SELENA_BRIGHTDATA_DATASET_GEMINI?: string;
			readonly SELENA_BRIGHTDATA_DATASET_PERPLEXITY?: string;
			readonly SELENA_BRIGHTDATA_DATASET_GOOGLE_AI?: string;
			readonly SELENA_BRIGHTDATA_DATASET_GOOGLE_SERP?: string;
			readonly SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_PLACE?: string;
			readonly SELENA_BRIGHTDATA_DATASET_GOOGLE_MAPS_REVIEWS?: string;
			readonly SELENA_BRIGHTDATA_DATASET_GOOGLE_HOTELS?: string;
			readonly SELENA_BRIGHTDATA_DATASET_INSTAGRAM_PROFILES?: string;
			readonly SELENA_BRIGHTDATA_DATASET_INSTAGRAM_POSTS?: string;
			readonly SELENA_BRIGHTDATA_DATASET_INSTAGRAM_REELS?: string;
			readonly SELENA_BRIGHTDATA_DATASET_INSTAGRAM_COMMENTS?: string;
			readonly SELENA_BRIGHTDATA_DATASET_TIKTOK_PROFILES?: string;
			readonly SELENA_BRIGHTDATA_DATASET_TIKTOK_POSTS?: string;
			readonly SELENA_BRIGHTDATA_DATASET_REDDIT_POSTS?: string;
			readonly SELENA_BRIGHTDATA_DATASET_YOUTUBE_VIDEOS?: string;
			readonly SELENA_GOOGLE_AI_MODE_CANARY_OWNER_APPROVED?: string;
			readonly SELENA_GOOGLE_AI_MODE_CANARY_ORGANIZATION_ID?: string;
			readonly SELENA_GOOGLE_AI_MODE_CANARY_PROJECT_ID?: string;
			readonly SELENA_GOOGLE_AI_MODE_CANARY_INPUT_JSON?: string;
			readonly SELENA_GOOGLE_AI_MODE_CANARY_COST_PREFLIGHT_JSON?: string;
			readonly SELENA_GOOGLE_AI_MODE_CANARY_REDACTION_APPROVED?: string;
			readonly SELENA_JOURNAL_PUBLISH_ENABLED?: string;
			readonly SELENA_JOURNAL_PROJECTS?: string;
			readonly SELENA_JOURNAL_SITE_REPO?: string;
			readonly SELENA_JOURNAL_SITE_BASE?: string;
			readonly SELENA_JOURNAL_FORCE?: string;
			readonly SELENA_LOCAL_CURSOR_HMAC_SECRET?: string;
			readonly SELENA_EVIDENCE_S3_ENDPOINT?: string;
			readonly SELENA_EVIDENCE_S3_BUCKET?: string;
			readonly SELENA_EVIDENCE_S3_REGION?: string;
			readonly SELENA_EVIDENCE_S3_ACCESS_KEY_ID?: string;
			readonly SELENA_EVIDENCE_S3_SECRET_ACCESS_KEY?: string;
			readonly STRIPE_SECRET_KEY?: string;
			readonly STRIPE_WEBHOOK_SECRET?: string;
			readonly RESEND_API_KEY?: string;
			readonly GOOGLE_CLIENT_ID?: string;
			readonly GOOGLE_CLIENT_SECRET?: string;
			readonly RESEND_FROM_EMAIL?: string;
		}
	}
}

export {};
