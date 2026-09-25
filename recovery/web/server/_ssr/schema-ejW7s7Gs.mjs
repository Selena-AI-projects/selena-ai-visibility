import { r as __exportAll } from "./rolldown-runtime-BXiOSzN2.mjs";
import { it as localPilotCycleStatuses } from "./src-BdeAuGX5.mjs";
import { A as numeric, B as foreignKey, D as timestamp, E as uuid, F as boolean, I as bigint, L as sql, M as json, N as integer, O as text, P as date, R as pgEnum, T as pgTable, a as check, c as relations, i as uniqueIndex, j as jsonb, k as smallint, n as pgView, r as index, z as unique } from "../_libs/drizzle-orm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/schema-ejW7s7Gs.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "3e239010-36fd-4c76-be84-71ac02848723", e._sentryDebugIdIdentifier = "sentry-dbid-3e239010-36fd-4c76-be84-71ac02848723");
	} catch (e) {}
})();
/**
* Better-auth Drizzle schema — tables and relations.
*
* Generated via:  pnpm run generate:auth-schema
* Source of truth: npx @better-auth/cli@latest generate
*
* The generator emits tables, columns, and relations implied by the plugins
* in the auth config (the _cli-helper.ts wrapper). Indexes created by the
* generator are included here; additional indexes added by hand in
* migrations (e.g. subscription index in 0012) are NOT represented in this
* file — drizzle-kit snapshots don't see them and would try to drop them on
* `drizzle-kit push`. They are maintained by their migration files instead.
*
* If you add a better-auth plugin that introduces new tables or columns,
* re-run the generation script (pnpm run generate:auth-schema) and
* commit the diff. If the new table needs indexes beyond what the generator
* emits, add them in a new migration — not in this file.
*/
var user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
	role: text("role"),
	banned: boolean("banned").default(false),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires"),
	stripeCustomerId: text("stripe_customer_id"),
	hasReportGeneratorAccess: boolean("has_report_generator_access").default(false)
});
var session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	activeOrganizationId: text("active_organization_id"),
	impersonatedBy: text("impersonated_by")
}, (table) => [index("session_userId_idx").on(table.userId)]);
var account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [index("account_userId_idx").on(table.userId)]);
var verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);
var organization = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	logo: text("logo"),
	createdAt: timestamp("created_at").notNull(),
	metadata: text("metadata"),
	stripeCustomerId: text("stripe_customer_id")
}, (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)]);
var member = pgTable("member", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	role: text("role").default("member").notNull(),
	createdAt: timestamp("created_at").notNull()
}, (table) => [index("member_organizationId_idx").on(table.organizationId), index("member_userId_idx").on(table.userId)]);
var invitation = pgTable("invitation", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	role: text("role"),
	status: text("status").default("pending").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	inviterId: text("inviter_id").notNull().references(() => user.id, { onDelete: "cascade" })
}, (table) => [index("invitation_organizationId_idx").on(table.organizationId), index("invitation_email_idx").on(table.email)]);
var ssoProvider = pgTable("sso_provider", {
	id: text("id").primaryKey(),
	issuer: text("issuer").notNull(),
	oidcConfig: text("oidc_config"),
	samlConfig: text("saml_config"),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	providerId: text("provider_id").notNull().unique(),
	organizationId: text("organization_id"),
	domain: text("domain").notNull()
});
var subscription = pgTable("subscription", {
	id: text("id").primaryKey(),
	plan: text("plan").notNull(),
	referenceId: text("reference_id").notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	status: text("status").default("incomplete"),
	periodStart: timestamp("period_start"),
	periodEnd: timestamp("period_end"),
	trialStart: timestamp("trial_start"),
	trialEnd: timestamp("trial_end"),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	cancelAt: timestamp("cancel_at"),
	canceledAt: timestamp("canceled_at"),
	endedAt: timestamp("ended_at"),
	seats: integer("seats"),
	billingInterval: text("billing_interval"),
	stripeScheduleId: text("stripe_schedule_id")
});
var userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	members: many(member),
	invitations: many(invitation),
	ssoProviders: many(ssoProvider)
}));
var sessionRelations = relations(session, ({ one }) => ({ user: one(user, {
	fields: [session.userId],
	references: [user.id]
}) }));
var accountRelations = relations(account, ({ one }) => ({ user: one(user, {
	fields: [account.userId],
	references: [user.id]
}) }));
var organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation)
}));
var memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id]
	})
}));
var invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [invitation.inviterId],
		references: [user.id]
	})
}));
var ssoProviderRelations = relations(ssoProvider, ({ one }) => ({ user: one(user, {
	fields: [ssoProvider.userId],
	references: [user.id]
}) }));
var svMeasurementDomains = pgTable("sv_measurement_domains", {
	domainId: text("domain_id").primaryKey().notNull(),
	unitOfMeasure: text("unit_of_measure").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}).enableRLS();
var svMeasurementCycles = pgTable("sv_measurement_cycles", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	domainId: text("domain_id").notNull().references(() => svMeasurementDomains.domainId),
	domainCycleId: uuid("domain_cycle_id").notNull(),
	configurationLockId: uuid("configuration_lock_id").notNull().references(() => svConfigurationLocks.id),
	status: text("status").notNull().default("CREATED"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	domainCycleUnique: uniqueIndex("sv_measurement_cycles_domain_cycle_unique").on(table.domainId, table.domainCycleId),
	idDomainUnique: uniqueIndex("sv_measurement_cycles_id_domain_unique").on(table.id, table.domainId),
	idDomainOrganizationUnique: uniqueIndex("sv_measurement_cycles_id_domain_org_unique").on(table.id, table.domainId, table.organizationId),
	idDomainOrganizationLockUnique: uniqueIndex("sv_measurement_cycles_id_domain_org_lock_unique").on(table.id, table.domainId, table.organizationId, table.configurationLockId),
	configurationLockScopeReference: foreignKey({
		columns: [table.configurationLockId, table.organizationId],
		foreignColumns: [svConfigurationLocks.id, svConfigurationLocks.organizationId],
		name: "sv_measurement_cycles_configuration_lock_scope_fk"
	}),
	orgDomainIdx: index("sv_measurement_cycles_org_domain_idx").on(table.organizationId, table.domainId)
})).enableRLS();
var svMeasurementAttempts = pgTable("sv_measurement_attempts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	reservationId: uuid("reservation_id").defaultRandom().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	measurementCycleId: uuid("measurement_cycle_id").notNull(),
	domainId: text("domain_id").notNull(),
	observationRef: text("observation_ref").notNull(),
	localObservationId: uuid("local_observation_id"),
	pointId: uuid("point_id").notNull(),
	itemId: uuid("item_id").notNull(),
	executorId: text("executor_id").notNull(),
	repeatIndex: integer("repeat_index").notNull(),
	baseSlotKey: text("base_slot_key").notNull(),
	attemptIndex: integer("attempt_index").notNull(),
	executionKey: text("execution_key").notNull(),
	rowVersion: bigint("row_version", { mode: "number" }).notNull().default(1),
	submissionTokenHash: text("submission_token_hash"),
	submittedCandidateFingerprint: text("submitted_candidate_fingerprint"),
	submittedCandidateCanonical: text("submitted_candidate_canonical"),
	submittedCandidate: jsonb("submitted_candidate"),
	status: text("status").notNull().default("CLAIMED"),
	budgetState: text("budget_state").notNull().default("RESERVED"),
	reservedCostUsd: numeric("reserved_cost_usd", {
		precision: 12,
		scale: 6
	}).notNull(),
	currency: text("currency").notNull().default("USD"),
	surfaceCapUsd: numeric("surface_cap_usd", {
		precision: 12,
		scale: 6
	}).notNull(),
	monthlyCapUsd: numeric("monthly_cap_usd", {
		precision: 12,
		scale: 6
	}).notNull(),
	priceSnapshotVersion: text("price_snapshot_version").notNull(),
	spentCostUsd: numeric("spent_cost_usd", {
		precision: 12,
		scale: 6
	}).notNull().default("0"),
	releasedCostUsd: numeric("released_cost_usd", {
		precision: 12,
		scale: 6
	}).notNull().default("0"),
	claimedAt: timestamp("claimed_at", { withTimezone: true }).defaultNow().notNull(),
	leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }).notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true }),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	providerTaskId: text("provider_task_id"),
	rawRef: text("raw_ref"),
	costEventId: uuid("cost_event_id"),
	retryReason: text("retry_reason"),
	finalInvalidReason: text("final_invalid_reason"),
	reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
	reconciliationRef: text("reconciliation_ref"),
	unknownReason: text("unknown_reason"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	pilotOrgIdUnique: uniqueIndex("sv_measurement_attempts_pilot_org_id_unique").on(table.organizationId, table.id),
	localObservationReference: foreignKey({
		columns: [table.organizationId, table.localObservationId],
		foreignColumns: [svLocalRankObservations.organizationId, svLocalRankObservations.id],
		name: "sv_attempt_local_observation_org_fk"
	}),
	reservationUnique: uniqueIndex("sv_measurement_attempts_reservation_unique").on(table.reservationId),
	executionUnique: uniqueIndex("sv_measurement_attempts_execution_unique").on(table.organizationId, table.executionKey),
	slotAttemptUnique: uniqueIndex("sv_measurement_attempts_slot_attempt_unique").on(table.organizationId, table.baseSlotKey, table.attemptIndex),
	activeSlotUnique: uniqueIndex("sv_measurement_attempts_active_slot_unique").on(table.organizationId, table.baseSlotKey).where(sql`${table.status} IN ('CLAIMED', 'SUBMITTED')`),
	submissionTokenUnique: uniqueIndex("sv_measurement_attempts_submission_token_unique").on(table.submissionTokenHash).where(sql`${table.submissionTokenHash} IS NOT NULL`),
	resultIdentityUnique: uniqueIndex("sv_measurement_attempts_result_identity_unique").on(table.id, table.organizationId, table.measurementCycleId, table.reservationId, table.executionKey, table.attemptIndex),
	measurementCycleReference: foreignKey({
		columns: [
			table.measurementCycleId,
			table.domainId,
			table.organizationId
		],
		foreignColumns: [
			svMeasurementCycles.id,
			svMeasurementCycles.domainId,
			svMeasurementCycles.organizationId
		],
		name: "sv_measurement_attempts_cycle_domain_org_fk"
	}),
	costEventReference: foreignKey({
		columns: [
			table.costEventId,
			table.organizationId,
			table.measurementCycleId,
			table.domainId
		],
		foreignColumns: [
			svCostEvents.id,
			svCostEvents.organizationId,
			svCostEvents.measurementCycleId,
			svCostEvents.domainId
		],
		name: "sv_measurement_attempts_cost_event_scope_fk"
	}),
	costEventUnique: uniqueIndex("sv_measurement_attempts_cost_event_unique").on(table.costEventId).where(sql`${table.costEventId} IS NOT NULL`),
	orgCycleStatusIdx: index("sv_measurement_attempts_org_cycle_status_idx").on(table.organizationId, table.measurementCycleId, table.status),
	expiredClaimIdx: index("sv_measurement_attempts_expired_claim_idx").on(table.organizationId, table.leaseExpiresAt).where(sql`${table.status} = 'CLAIMED'`),
	domainCheck: check("sv_measurement_attempts_domain_check", sql`${table.domainId} IN ('LOCAL_MAPS', 'LOCAL_AI')`),
	attemptIndexCheck: check("sv_measurement_attempts_attempt_index_check", sql`${table.attemptIndex} BETWEEN 1 AND 3`),
	rowVersionCheck: check("sv_measurement_attempts_row_version_check", sql`${table.rowVersion} > 0`),
	submissionTokenCheck: check("sv_measurement_attempts_submission_token_check", sql`((((${table.status} = 'CLAIMED' AND ${table.submissionTokenHash} IS NULL) OR (${table.status} <> 'CLAIMED' AND ${table.submissionTokenHash} IS NOT NULL AND ${table.submissionTokenHash} ~ '^sha256:[a-f0-9]{64}$')) IS TRUE) OR (${table.status}='CANCELLED_NO_CALL' AND ${table.domainId}='LOCAL_MAPS' AND ${table.budgetState}='RELEASED' AND ${table.spentCostUsd}=0 AND ${table.releasedCostUsd}=${table.reservedCostUsd} AND ${table.submittedAt} IS NULL AND ${table.submissionTokenHash} IS NULL AND ${table.submittedCandidate} IS NULL AND ${table.submittedCandidateFingerprint} IS NULL AND ${table.submittedCandidateCanonical} IS NULL AND ${table.providerTaskId} IS NULL AND ${table.rawRef} IS NULL AND ${table.costEventId} IS NULL AND ${table.completedAt} IS NOT NULL AND ${table.retryReason} IS NULL AND ${table.finalInvalidReason} IS NULL AND ${table.unknownReason} IS NULL)) IS TRUE`),
	submittedCandidateCheck: check("sv_measurement_attempts_submitted_candidate_check", sql`((((${table.status} = 'CLAIMED' AND ${table.submittedCandidateFingerprint} IS NULL AND ${table.submittedCandidateCanonical} IS NULL AND ${table.submittedCandidate} IS NULL) OR (${table.status} <> 'CLAIMED' AND ${table.submittedCandidateFingerprint} IS NOT NULL AND ${table.submittedCandidateCanonical} IS NOT NULL AND ${table.submittedCandidate} IS NOT NULL AND ${table.submittedCandidateFingerprint} = 'sha256:' || encode(sha256(convert_to(${table.submittedCandidateCanonical}, 'UTF8')), 'hex') AND ${table.submittedCandidate} = ${table.submittedCandidateCanonical}::jsonb AND jsonb_typeof(${table.submittedCandidate}) = 'object' AND ${table.submittedCandidate} ?& array['schemaVersion', 'kind', 'mode', 'canonicalizationVersion', 'scope', 'lockSnapshotCanonical', 'requestSnapshotCanonical', 'lock', 'slot', 'keyword', 'providerRequest', 'attempt', 'budgetReservation'] AND ${table.submittedCandidate} - 'schemaVersion'::text - 'kind'::text - 'mode'::text - 'canonicalizationVersion'::text - 'scope'::text - 'lockSnapshotCanonical'::text - 'requestSnapshotCanonical'::text - 'lock'::text - 'slot'::text - 'keyword'::text - 'providerRequest'::text - 'attempt'::text - 'budgetReservation'::text = '{}'::jsonb AND ${table.submittedCandidate}->>'schemaVersion' = '1' AND ${table.submittedCandidate}->>'kind' = 'LOCAL_MAPS_LIVE_SUBMITTED_CANDIDATE' AND ${table.submittedCandidate}->>'mode' = 'LIVE_PROVIDER' AND ${table.submittedCandidate}->>'canonicalizationVersion' = 'canonical-json-code-unit-v1' AND ${table.submittedCandidate}#>>'{scope,organizationId}' = ${table.organizationId} AND ${table.submittedCandidate}#>>'{scope,measurementCycleId}' = ${table.measurementCycleId}::text AND ${table.submittedCandidate}#>>'{scope,domainId}' = 'LOCAL_MAPS' AND ${table.domainId} = 'LOCAL_MAPS' AND ${table.submittedCandidate}#>>'{attempt,attemptId}' = ${table.id}::text AND ${table.submittedCandidate}#>>'{attempt,reservationId}' = ${table.reservationId}::text AND ${table.submittedCandidate}#>>'{attempt,observationRef}' = ${table.observationRef} AND ${table.submittedCandidate}#>>'{attempt,baseSlotKey}' = ${table.baseSlotKey} AND ${table.submittedCandidate}#>>'{attempt,executionKey}' = ${table.executionKey} AND ${table.submittedCandidate}#>>'{attempt,attemptIndex}' = ${table.attemptIndex}::text AND ${table.submittedCandidate}#>>'{attempt,statusSnapshot}' = 'SUBMITTED' AND (${table.submittedCandidate}#>>'{attempt,claimedAt}')::timestamptz = ${table.claimedAt} AND (${table.submittedCandidate}#>>'{attempt,submittedAt}')::timestamptz = ${table.submittedAt} AND (${table.submittedCandidate}#>>'{attempt,leaseExpiresAt}')::timestamptz = ${table.leaseExpiresAt} AND ${table.submittedCandidate}#>>'{slot,baseSlotKey}' = ${table.baseSlotKey} AND ${table.submittedCandidate}#>>'{slot,pointId}' = ${table.pointId}::text AND ${table.submittedCandidate}#>>'{slot,keywordId}' = ${table.itemId}::text AND ${table.submittedCandidate}#>>'{keyword,id}' = ${table.itemId}::text AND ${table.submittedCandidate}#>>'{slot,repeatIndex}' = ${table.repeatIndex}::text AND ${table.submittedCandidate}#>>'{providerRequest,repeatIndex}' = ${table.repeatIndex}::text AND ${table.executorId} !~* '^(stub|noop)(-|$)' AND ${table.submittedCandidate}#>>'{providerRequest,provider,id}' = ${table.executorId} AND ${table.submittedCandidate}#>>'{lock,provider,id}' = ${table.executorId} AND ${table.submittedCandidate}#>>'{budgetReservation,currency}' = ${table.currency} AND (${table.submittedCandidate}#>>'{budgetReservation,reservedCostUsd}')::numeric(12, 6) = ${table.reservedCostUsd} AND (${table.submittedCandidate}#>>'{budgetReservation,surfaceCapUsd}')::numeric(12, 6) = ${table.surfaceCapUsd} AND (${table.submittedCandidate}#>>'{budgetReservation,monthlyCapUsd}')::numeric(12, 6) = ${table.monthlyCapUsd} AND ${table.submittedCandidate}#>>'{budgetReservation,priceSnapshotVersion}' = ${table.priceSnapshotVersion})) IS TRUE) OR (${table.status}='CANCELLED_NO_CALL' AND ${table.domainId}='LOCAL_MAPS' AND ${table.budgetState}='RELEASED' AND ${table.spentCostUsd}=0 AND ${table.releasedCostUsd}=${table.reservedCostUsd} AND ${table.submittedAt} IS NULL AND ${table.submissionTokenHash} IS NULL AND ${table.submittedCandidate} IS NULL AND ${table.submittedCandidateFingerprint} IS NULL AND ${table.submittedCandidateCanonical} IS NULL AND ${table.providerTaskId} IS NULL AND ${table.rawRef} IS NULL AND ${table.costEventId} IS NULL AND ${table.completedAt} IS NOT NULL AND ${table.retryReason} IS NULL AND ${table.finalInvalidReason} IS NULL AND ${table.unknownReason} IS NULL)) IS TRUE`),
	unknownReasonCheck: check("sv_measurement_attempts_unknown_reason_check", sql`((${table.status} = 'UNKNOWN_RECONCILIATION' AND ${table.unknownReason} IS NOT NULL AND ${table.unknownReason} IN ('COMMITTED_SNAPSHOT_INVALID', 'PROVIDER_CALL_THROWN', 'PROVIDER_RESULT_INVALID', 'FINALIZE_AMBIGUOUS', 'FINALIZE_POSTCONDITION_MISMATCH', 'ESTIMATED_ZERO_COST_UNRECONCILED', 'PROVIDER_OUTCOME_UNKNOWN')) OR (${table.status} <> 'UNKNOWN_RECONCILIATION' AND ${table.unknownReason} IS NULL)) IS TRUE`),
	executionIdentityCheck: check("sv_measurement_attempts_execution_identity_check", sql`${table.baseSlotKey} = ${table.domainId} || '|' || ${table.measurementCycleId}::text || '|' || ${table.pointId}::text || '|' || ${table.itemId}::text || '|' || ${table.executorId} || '|' || ${table.repeatIndex}::text AND ${table.executionKey} = ${table.baseSlotKey} || '|' || ${table.attemptIndex}::text`),
	inputShapeCheck: check("sv_measurement_attempts_input_shape_check", sql`${table.repeatIndex} >= 0 AND length(${table.observationRef}) > 0 AND ${table.observationRef} !~ '[[:space:]]' AND length(${table.executorId}) > 0 AND ${table.executorId} !~ '[[:space:]]' AND position('|' IN ${table.executorId}) = 0 AND length(${table.priceSnapshotVersion}) > 0 AND ${table.priceSnapshotVersion} !~ '[[:space:]]' AND ${table.leaseExpiresAt} > ${table.claimedAt}`),
	statusCheck: check("sv_measurement_attempts_status_check", sql`((${table.status} IN ('CLAIMED', 'SUBMITTED', 'SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION')) OR (${table.status}='CANCELLED_NO_CALL' AND ${table.domainId}='LOCAL_MAPS' AND ${table.budgetState}='RELEASED' AND ${table.spentCostUsd}=0 AND ${table.releasedCostUsd}=${table.reservedCostUsd} AND ${table.submittedAt} IS NULL AND ${table.submissionTokenHash} IS NULL AND ${table.submittedCandidate} IS NULL AND ${table.submittedCandidateFingerprint} IS NULL AND ${table.submittedCandidateCanonical} IS NULL AND ${table.providerTaskId} IS NULL AND ${table.rawRef} IS NULL AND ${table.costEventId} IS NULL AND ${table.completedAt} IS NOT NULL AND ${table.retryReason} IS NULL AND ${table.finalInvalidReason} IS NULL AND ${table.unknownReason} IS NULL)) IS TRUE`),
	stateShapeCheck: check("sv_measurement_attempts_state_shape_check", sql`(((${table.status} = 'CLAIMED' AND ${table.submittedAt} IS NULL AND ${table.completedAt} IS NULL AND ${table.providerTaskId} IS NULL AND ${table.rawRef} IS NULL AND ${table.costEventId} IS NULL) OR (${table.status} = 'SUBMITTED' AND ${table.submittedAt} IS NOT NULL AND ${table.submittedAt} >= ${table.claimedAt} AND ${table.completedAt} IS NULL AND ${table.providerTaskId} IS NULL AND ${table.rawRef} IS NULL AND ${table.costEventId} IS NULL) OR (${table.status} IN ('SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION') AND ${table.submittedAt} IS NOT NULL AND ${table.completedAt} IS NOT NULL AND ${table.submittedAt} >= ${table.claimedAt} AND ${table.completedAt} >= ${table.submittedAt})) OR (${table.status}='CANCELLED_NO_CALL' AND ${table.domainId}='LOCAL_MAPS' AND ${table.budgetState}='RELEASED' AND ${table.spentCostUsd}=0 AND ${table.releasedCostUsd}=${table.reservedCostUsd} AND ${table.submittedAt} IS NULL AND ${table.submissionTokenHash} IS NULL AND ${table.submittedCandidate} IS NULL AND ${table.submittedCandidateFingerprint} IS NULL AND ${table.submittedCandidateCanonical} IS NULL AND ${table.providerTaskId} IS NULL AND ${table.rawRef} IS NULL AND ${table.costEventId} IS NULL AND ${table.completedAt} IS NOT NULL AND ${table.retryReason} IS NULL AND ${table.finalInvalidReason} IS NULL AND ${table.unknownReason} IS NULL)) IS TRUE`),
	reasonShapeCheck: check("sv_measurement_attempts_reason_shape_check", sql`(${table.retryReason} IS NULL OR ${table.retryReason} IN ('EMPTY_RESPONSE', 'TRUNCATED_RESPONSE', 'TIMEOUT', 'PROVIDER_5XX', 'RATE_LIMITED', 'MALFORMED_RESPONSE')) AND (${table.finalInvalidReason} IS NULL OR ${table.finalInvalidReason} IN ('EMPTY_AFTER_3_ATTEMPTS', 'PROVIDER_UNAVAILABLE', 'RATE_LIMIT_EXHAUSTED', 'MALFORMED_AFTER_3_ATTEMPTS')) AND ((${table.status} = 'RETRYABLE_FAILURE' AND ${table.attemptIndex} < 3 AND ${table.retryReason} IS NOT NULL AND ${table.finalInvalidReason} IS NULL) OR (${table.status} = 'TERMINAL_FAILURE' AND ${table.attemptIndex} = 3 AND ((${table.retryReason} IN ('EMPTY_RESPONSE', 'TRUNCATED_RESPONSE') AND ${table.finalInvalidReason} = 'EMPTY_AFTER_3_ATTEMPTS') OR (${table.retryReason} IN ('TIMEOUT', 'PROVIDER_5XX') AND ${table.finalInvalidReason} = 'PROVIDER_UNAVAILABLE') OR (${table.retryReason} = 'RATE_LIMITED' AND ${table.finalInvalidReason} = 'RATE_LIMIT_EXHAUSTED') OR (${table.retryReason} = 'MALFORMED_RESPONSE' AND ${table.finalInvalidReason} = 'MALFORMED_AFTER_3_ATTEMPTS'))) OR (${table.status}='TERMINAL_FAILURE' AND ${table.domainId}='LOCAL_MAPS' AND ${table.attemptIndex}=1 AND ${table.retryReason} IS NOT NULL AND ${table.finalInvalidReason}='PROVIDER_UNAVAILABLE') OR (${table.status} = 'TERMINAL_FAILURE' AND ${table.retryReason} IS NULL AND ${table.finalInvalidReason} IS NULL) OR (${table.status} NOT IN ('RETRYABLE_FAILURE', 'TERMINAL_FAILURE') AND ${table.retryReason} IS NULL AND ${table.finalInvalidReason} IS NULL))`),
	reconciliationCheck: check("sv_measurement_attempts_reconciliation_check", sql`(${table.status} = 'UNKNOWN_RECONCILIATION' AND ${table.budgetState} = 'RESERVED' AND ${table.reconciledAt} IS NULL AND ${table.reconciliationRef} IS NULL) OR (${table.status} = 'UNKNOWN_RECONCILIATION' AND ${table.budgetState} IN ('SPENT', 'RELEASED') AND ${table.reconciledAt} IS NOT NULL AND ${table.reconciledAt} >= ${table.completedAt} AND ${table.reconciliationRef} ~ '[^[:space:]]') OR (${table.status} <> 'UNKNOWN_RECONCILIATION' AND ${table.reconciledAt} IS NULL AND ${table.reconciliationRef} IS NULL)`),
	budgetCheck: check("sv_measurement_attempts_budget_check", sql`((${table.currency} = 'USD' AND ${table.reservedCostUsd} >= 0 AND ${table.reservedCostUsd} <= ${table.surfaceCapUsd} AND ${table.reservedCostUsd} <= ${table.monthlyCapUsd} AND ${table.surfaceCapUsd} >= 0 AND ${table.monthlyCapUsd} >= 0 AND ${table.spentCostUsd} >= 0 AND ${table.releasedCostUsd} >= 0 AND (((${table.status} IN ('CLAIMED', 'SUBMITTED') OR ${table.status} = 'UNKNOWN_RECONCILIATION') AND ${table.budgetState} = 'RESERVED') OR (${table.status} IN ('SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE') AND ${table.budgetState} IN ('SPENT', 'RELEASED')) OR (${table.status} = 'UNKNOWN_RECONCILIATION' AND ${table.budgetState} IN ('SPENT', 'RELEASED') AND ${table.reconciledAt} IS NOT NULL)) AND ((${table.budgetState} = 'RESERVED' AND ${table.spentCostUsd} = 0 AND ${table.releasedCostUsd} = 0 AND ${table.costEventId} IS NULL) OR (${table.budgetState} = 'SPENT' AND ${table.releasedCostUsd} = greatest(${table.reservedCostUsd} - ${table.spentCostUsd}, 0) AND ${table.costEventId} IS NOT NULL) OR (${table.budgetState} = 'RELEASED' AND ${table.spentCostUsd} = 0 AND ${table.releasedCostUsd} = ${table.reservedCostUsd} AND ${table.costEventId} IS NULL))) OR (${table.status}='CANCELLED_NO_CALL' AND ${table.domainId}='LOCAL_MAPS' AND ${table.budgetState}='RELEASED' AND ${table.spentCostUsd}=0 AND ${table.releasedCostUsd}=${table.reservedCostUsd} AND ${table.submittedAt} IS NULL AND ${table.submissionTokenHash} IS NULL AND ${table.submittedCandidate} IS NULL AND ${table.submittedCandidateFingerprint} IS NULL AND ${table.submittedCandidateCanonical} IS NULL AND ${table.providerTaskId} IS NULL AND ${table.rawRef} IS NULL AND ${table.costEventId} IS NULL AND ${table.completedAt} IS NOT NULL AND ${table.retryReason} IS NULL AND ${table.finalInvalidReason} IS NULL AND ${table.unknownReason} IS NULL)) IS TRUE`)
})).enableRLS();
var svMeasurementDatasets = pgTable("sv_measurement_datasets", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").references(() => svMeasurementCycles.id),
	datasetKey: text("dataset_key").notNull(),
	version: integer("version").notNull(),
	immutable: boolean("immutable").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	orgDatasetVersionUnique: uniqueIndex("sv_measurement_datasets_org_key_version_unique").on(table.organizationId, table.datasetKey, table.version),
	idCycleOrganizationUnique: uniqueIndex("sv_measurement_datasets_id_cycle_organization_unique").on(table.id, table.cycleId, table.organizationId),
	orgCycleIdx: index("sv_measurement_datasets_org_cycle_idx").on(table.organizationId, table.cycleId)
})).enableRLS();
var svProviderDatasetCapabilities = pgTable("sv_provider_dataset_capabilities", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	provider: text("provider").notNull(),
	source: text("source").notNull(),
	surface: text("surface").notNull(),
	domain: text("domain").notNull(),
	entityType: text("entity_type").notNull(),
	datasetEnvKey: text("dataset_env_key").notNull(),
	inputSchemaVersion: text("input_schema_version").notNull(),
	outputSchemaVersion: text("output_schema_version"),
	accessClass: text("access_class").notNull(),
	capabilityStatus: text("capability_status").notNull(),
	retentionClass: text("retention_class"),
	contractVersion: text("contract_version").notNull(),
	version: integer("version").notNull(),
	contractMetadata: jsonb("contract_metadata").notNull().default({}),
	immutable: boolean("immutable").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	orgProviderSourceVersionUnique: uniqueIndex("sv_provider_dataset_capabilities_org_source_version_unique").on(table.organizationId, table.provider, table.source, table.version),
	idOrganizationUnique: uniqueIndex("sv_provider_dataset_capabilities_id_org_unique").on(table.id, table.organizationId),
	orgStatusIdx: index("sv_provider_dataset_capabilities_org_status_idx").on(table.organizationId, table.capabilityStatus),
	shapeCheck: check("sv_provider_dataset_capabilities_shape_check", sql`${table.version} > 0 AND ${table.immutable} = true AND jsonb_typeof(${table.contractMetadata}) = 'object' AND length(trim(${table.provider})) > 0 AND length(trim(${table.source})) > 0 AND length(trim(${table.surface})) > 0 AND length(trim(${table.entityType})) > 0 AND length(trim(${table.datasetEnvKey})) > 0 AND length(trim(${table.inputSchemaVersion})) > 0 AND (${table.outputSchemaVersion} IS NULL OR length(trim(${table.outputSchemaVersion})) > 0) AND length(trim(${table.accessClass})) > 0 AND (${table.retentionClass} IS NULL OR length(trim(${table.retentionClass})) > 0) AND length(trim(${table.contractVersion})) > 0`),
	domainCheck: check("sv_provider_dataset_capabilities_domain_check", sql`${table.domain} IN ('AI', 'SEARCH', 'ENTITY', 'REPUTATION', 'SOCIAL', 'TRAVEL')`),
	statusCheck: check("sv_provider_dataset_capabilities_status_check", sql`${table.capabilityStatus} IN ('CONFIGURED_ONLY', 'CANARY_ONLY', 'PILOT_ONLY', 'ALLOWED', 'BLOCKED')`),
	accessClassCheck: check("sv_provider_dataset_capabilities_access_class_check", sql`${table.accessClass} IN ('PUBLIC', 'CONNECTED', 'UPLOADED', 'DERIVED')`)
})).enableRLS();
var svProviderCanaryExecutions = pgTable("sv_provider_canary_executions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id"),
	executionIdentity: text("execution_identity").notNull(),
	source: text("source").notNull().default("GOOGLE_AI_MODE"),
	approvedCapUsd: numeric("approved_cap_usd", {
		precision: 12,
		scale: 6
	}).notNull().default("0.250000"),
	recurring: boolean("recurring").notNull().default(false),
	automaticRetries: integer("automatic_retries").notNull().default(0),
	costStatus: text("cost_status").notNull().default("UNKNOWN"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	projectOrganizationReference: foreignKey({
		name: "sv_provider_canary_executions_project_org_fk",
		columns: [table.projectId, table.organizationId],
		foreignColumns: [svProjects.id, svProjects.organizationId]
	}),
	identityUnique: uniqueIndex("sv_provider_canary_executions_identity_unique").on(table.source, table.executionIdentity),
	contractCheck: check("sv_provider_canary_executions_contract_check", sql`${table.source} = 'GOOGLE_AI_MODE' AND ${table.approvedCapUsd} = 0.250000 AND ${table.recurring} = false AND ${table.automaticRetries} = 0 AND ${table.costStatus} = 'UNKNOWN' AND length(${table.executionIdentity}) BETWEEN 8 AND 128 AND ${table.executionIdentity} = btrim(${table.executionIdentity})`)
})).enableRLS();
var svProviderDatasetSnapshotEvents = pgTable("sv_provider_dataset_snapshot_events", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull(),
	provider: text("provider").notNull().default("BRIGHT_DATA"),
	source: text("source").notNull(),
	providerDatasetId: text("provider_dataset_id").notNull(),
	snapshotId: text("snapshot_id").notNull(),
	phase: text("phase").notNull(),
	providerStatus: text("provider_status"),
	recordCount: integer("record_count"),
	observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
	eventHash: text("event_hash").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	projectOrganizationReference: foreignKey({
		columns: [table.projectId, table.organizationId],
		foreignColumns: [svProjects.id, svProjects.organizationId],
		name: "sv_provider_dataset_snapshot_events_project_org_fk"
	}),
	eventHashUnique: uniqueIndex("sv_provider_dataset_snapshot_events_event_hash_unique").on(table.organizationId, table.projectId, table.eventHash),
	snapshotObservedIdx: index("sv_provider_dataset_snapshot_events_snapshot_observed_idx").on(table.organizationId, table.projectId, table.snapshotId, table.observedAt),
	phaseObservedIdx: index("sv_provider_dataset_snapshot_events_phase_observed_idx").on(table.organizationId, table.projectId, table.phase, table.observedAt),
	shapeCheck: check("sv_provider_dataset_snapshot_events_shape_check", sql`${table.provider} = btrim(${table.provider}) AND length(${table.provider}) > 0 AND ${table.source} = btrim(${table.source}) AND length(${table.source}) > 0 AND ${table.providerDatasetId} = btrim(${table.providerDatasetId}) AND length(${table.providerDatasetId}) > 0 AND ${table.snapshotId} = btrim(${table.snapshotId}) AND length(${table.snapshotId}) > 0 AND (${table.providerStatus} IS NULL OR (${table.providerStatus} = btrim(${table.providerStatus}) AND length(${table.providerStatus}) > 0))`),
	phaseCheck: check("sv_provider_dataset_snapshot_events_phase_check", sql`${table.phase} IN ('TRIGGERED', 'RESUMED', 'PENDING', 'READY', 'DELIVERED', 'TIMEOUT', 'TERMINAL_FAILURE', 'INVALID', 'INTERRUPTED')`),
	recordCountCheck: check("sv_provider_dataset_snapshot_events_record_count_check", sql`((${table.phase} = 'DELIVERED' AND ${table.recordCount} IS NOT NULL AND ${table.recordCount} >= 0) OR (${table.phase} <> 'DELIVERED' AND ${table.recordCount} IS NULL))`),
	providerStatusCheck: check("sv_provider_dataset_snapshot_events_provider_status_check", sql`${table.phase} NOT IN ('PENDING', 'READY', 'TERMINAL_FAILURE') OR ${table.providerStatus} IS NOT NULL`),
	eventHashCheck: check("sv_provider_dataset_snapshot_events_event_hash_check", sql`${table.eventHash} ~ '^sha256:[a-f0-9]{64}$'`)
})).enableRLS();
var svSourceSnapshots = pgTable("sv_source_snapshots", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id"),
	sourceType: text("source_type").notNull(),
	sourceRef: text("source_ref").notNull(),
	contentSha256: text("content_sha256").notNull(),
	contentSha256FormatValid: boolean("content_sha256_format_valid").generatedAlwaysAs(sql`"content_sha256" ~ '^(sha256:)?[a-f0-9]{64}$'`),
	snapshot: jsonb("snapshot").notNull(),
	capabilityId: uuid("capability_id"),
	providerDatasetRef: text("provider_dataset_ref"),
	environment: text("environment"),
	rawReference: text("raw_reference"),
	inputSchemaVersion: text("input_schema_version"),
	outputSchemaVersion: text("output_schema_version"),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	immutable: boolean("immutable").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	projectContentHashUnique: uniqueIndex("sv_source_snapshots_project_content_sha256_unique").on(table.organizationId, table.projectId, table.contentSha256).where(sql`${table.projectId} IS NOT NULL AND ${table.sourceType} <> 'LOCAL_MAPS_CANARY_ONLY'`),
	legacyOrgContentHashUnique: uniqueIndex("sv_source_snapshots_legacy_org_content_sha256_unique").on(table.organizationId, table.contentSha256).where(sql`${table.projectId} IS NULL AND ${table.sourceType} <> 'LOCAL_MAPS_CANARY_ONLY'`),
	canaryHashUnique: uniqueIndex("sv_source_snapshots_canary_hash_unique").on(table.organizationId, sql`coalesce(${table.projectId}, '00000000-0000-0000-0000-000000000000'::uuid)`, table.contentSha256).where(sql`${table.sourceType} = 'LOCAL_MAPS_CANARY_ONLY'`),
	orgCapturedIdx: index("sv_source_snapshots_org_captured_idx").on(table.organizationId, table.capturedAt),
	idOrganizationUnique: uniqueIndex("sv_source_snapshots_id_organization_unique").on(table.id, table.organizationId),
	idProjectOrganizationUnique: uniqueIndex("sv_source_snapshots_id_project_org_unique").on(table.id, table.projectId, table.organizationId),
	projectOrganizationReference: foreignKey({
		columns: [table.projectId, table.organizationId],
		foreignColumns: [svProjects.id, svProjects.organizationId],
		name: "sv_source_snapshots_project_org_fk"
	}),
	capabilityScopeReference: foreignKey({
		columns: [table.capabilityId, table.organizationId],
		foreignColumns: [svProviderDatasetCapabilities.id, svProviderDatasetCapabilities.organizationId],
		name: "sv_source_snapshots_capability_org_fk"
	}),
	orgCapabilityCapturedIdx: index("sv_source_snapshots_org_capability_captured_idx").on(table.organizationId, table.capabilityId, table.capturedAt),
	providerCaptureMetadataCheck: check("sv_source_snapshots_provider_capture_metadata_check", sql`((${table.capabilityId} IS NULL AND ${table.providerDatasetRef} IS NULL AND ${table.environment} IS NULL AND ${table.rawReference} IS NULL AND ${table.inputSchemaVersion} IS NULL AND ${table.outputSchemaVersion} IS NULL) OR (${table.capabilityId} IS NOT NULL AND ${table.providerDatasetRef} = btrim(${table.providerDatasetRef}) AND length(${table.providerDatasetRef}) > 0 AND ${table.environment} IN ('ISOLATED_CANARY', 'STAGING_ACCEPTANCE', 'PRODUCTION') AND ${table.rawReference} = btrim(${table.rawReference}) AND length(${table.rawReference}) > 0 AND ${table.inputSchemaVersion} = btrim(${table.inputSchemaVersion}) AND length(${table.inputSchemaVersion}) > 0 AND (${table.outputSchemaVersion} IS NULL OR (${table.outputSchemaVersion} = btrim(${table.outputSchemaVersion}) AND length(${table.outputSchemaVersion}) > 0)))) IS TRUE`),
	providerProjectCheck: check("sv_source_snapshots_provider_project_check", sql`${table.capabilityId} IS NULL OR ${table.projectId} IS NOT NULL`)
})).enableRLS();
var svEvidenceIndex = pgTable("sv_evidence_index", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull(),
	domainId: text("domain_id").notNull().references(() => svMeasurementDomains.domainId),
	cycleId: uuid("cycle_id").notNull().references(() => svMeasurementCycles.id),
	observationRef: text("observation_ref").notNull(),
	datasetId: uuid("dataset_id").notNull(),
	sourceSnapshotId: uuid("source_snapshot_id"),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	idOrganizationUnique: uniqueIndex("sv_evidence_index_id_organization_unique").on(table.id, table.organizationId),
	formalIdentityUnique: unique("sv_evidence_index_formal_identity_unique").on(table.organizationId, table.projectId, table.domainId, table.cycleId, table.datasetId, table.sourceSnapshotId, table.observationRef).nullsNotDistinct(),
	projectOrganizationReference: foreignKey({
		columns: [table.projectId, table.organizationId],
		foreignColumns: [svProjects.id, svProjects.organizationId],
		name: "sv_evidence_index_project_org_fk"
	}),
	cycleDomainReference: foreignKey({
		columns: [
			table.cycleId,
			table.domainId,
			table.organizationId
		],
		foreignColumns: [
			svMeasurementCycles.id,
			svMeasurementCycles.domainId,
			svMeasurementCycles.organizationId
		],
		name: "sv_evidence_index_cycle_domain_fk"
	}),
	datasetScopeReference: foreignKey({
		columns: [
			table.datasetId,
			table.cycleId,
			table.organizationId
		],
		foreignColumns: [
			svMeasurementDatasets.id,
			svMeasurementDatasets.cycleId,
			svMeasurementDatasets.organizationId
		],
		name: "sv_evidence_index_dataset_cycle_org_fk"
	}),
	sourceSnapshotScopeReference: foreignKey({
		columns: [
			table.sourceSnapshotId,
			table.projectId,
			table.organizationId
		],
		foreignColumns: [
			svSourceSnapshots.id,
			svSourceSnapshots.projectId,
			svSourceSnapshots.organizationId
		],
		name: "sv_evidence_index_source_snapshot_project_org_fk"
	}),
	orgCycleIdx: index("sv_evidence_index_org_cycle_idx").on(table.organizationId, table.cycleId)
})).enableRLS();
var svEvidenceAcceptanceReceipts = pgTable("sv_evidence_acceptance_receipts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	evidenceId: uuid("evidence_id").notNull(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
	acceptedBy: text("accepted_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	evidenceOrganizationReference: foreignKey({
		columns: [table.evidenceId, table.organizationId],
		foreignColumns: [svEvidenceIndex.id, svEvidenceIndex.organizationId],
		name: "sv_evidence_acceptance_receipts_evidence_org_fk"
	}),
	orgEvidenceUnique: uniqueIndex("sv_evidence_acceptance_receipts_org_evidence_unique").on(table.organizationId, table.evidenceId),
	actorCheck: check("sv_evidence_acceptance_receipts_actor_check", sql`length(trim(${table.acceptedBy})) > 0`)
})).enableRLS();
var svEvidenceProvenance = pgView("sv_evidence_provenance", {
	organizationId: text("organization_id").notNull(),
	projectId: uuid("project_id").notNull(),
	evidenceId: uuid("evidence_id").notNull(),
	domainId: text("domain_id").notNull(),
	cycleId: uuid("cycle_id").notNull(),
	observationRef: text("observation_ref").notNull(),
	datasetId: uuid("dataset_id").notNull(),
	datasetKey: text("dataset_key").notNull(),
	datasetVersion: integer("dataset_version").notNull(),
	sourceSnapshotId: uuid("source_snapshot_id"),
	capabilityId: uuid("capability_id"),
	sourceType: text("source_type"),
	sourceRef: text("source_ref"),
	rawReference: text("raw_reference"),
	contentSha256: text("content_sha256"),
	environment: text("environment"),
	providerDatasetRef: text("provider_dataset_ref"),
	inputSchemaVersion: text("input_schema_version"),
	outputSchemaVersion: text("output_schema_version"),
	provider: text("provider"),
	source: text("source"),
	surface: text("surface"),
	capabilityDomain: text("capability_domain"),
	entityType: text("entity_type"),
	accessClass: text("access_class"),
	capabilityStatus: text("capability_status"),
	retentionClass: text("retention_class"),
	contractVersion: text("contract_version"),
	capabilityInputSchemaVersion: text("capability_input_schema_version"),
	capabilityOutputSchemaVersion: text("capability_output_schema_version"),
	evidenceCapturedAt: timestamp("evidence_captured_at", { withTimezone: true }).notNull(),
	sourceCapturedAt: timestamp("source_captured_at", { withTimezone: true })
}).existing();
var svEvidenceReadModel = pgView("sv_evidence_read_model", {
	organizationId: text("organization_id").notNull(),
	projectId: uuid("project_id").notNull(),
	evidenceId: uuid("evidence_id").notNull(),
	domainId: text("domain_id").notNull(),
	datasetVersion: integer("dataset_version").notNull(),
	sourceSnapshotId: uuid("source_snapshot_id"),
	capabilityId: uuid("capability_id"),
	sourceType: text("source_type"),
	inputSchemaVersion: text("input_schema_version"),
	outputSchemaVersion: text("output_schema_version"),
	source: text("source"),
	surface: text("surface"),
	capabilityDomain: text("capability_domain"),
	capabilityStatus: text("capability_status"),
	capabilityInputSchemaVersion: text("capability_input_schema_version"),
	capabilityOutputSchemaVersion: text("capability_output_schema_version"),
	acceptanceStatus: text("acceptance_status"),
	acceptedAt: timestamp("accepted_at", { withTimezone: true }),
	evidenceCapturedAt: timestamp("evidence_captured_at", { withTimezone: true }).notNull()
}).existing();
var svLocalRankValidityEnum = pgEnum("sv_local_rank_validity", [
	"VALID",
	"INVALID",
	"UNMEASURED"
]);
var svLocalKeywords = pgTable("sv_local_keywords", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	locationId: uuid("location_id").notNull().references(() => svBusinessLocations.id),
	text: text("text").notNull(),
	normalizedText: text("normalized_text").notNull(),
	language: text("language").notNull(),
	status: text("status").notNull().default("PROPOSED"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	locationKeywordUnique: uniqueIndex("sv_local_keywords_location_text_language_unique").on(table.locationId, table.normalizedText, table.language),
	idLocationUnique: uniqueIndex("sv_local_keywords_id_location_unique").on(table.id, table.locationId),
	orgLocationIdx: index("sv_local_keywords_org_location_idx").on(table.organizationId, table.locationId)
})).enableRLS();
var svGridDefinitions = pgTable("sv_grid_definitions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	locationId: uuid("location_id").notNull().references(() => svBusinessLocations.id),
	version: integer("version").notNull(),
	pointCount: integer("point_count").notNull(),
	spacingMeters: integer("spacing_meters").notNull(),
	shape: text("shape").notNull(),
	rows: integer("rows").notNull(),
	columns: integer("columns").notNull(),
	centerLatitude: numeric("center_latitude", {
		precision: 9,
		scale: 6
	}).notNull(),
	centerLongitude: numeric("center_longitude", {
		precision: 9,
		scale: 6
	}).notNull(),
	formulaVersion: text("formula_version").notNull(),
	immutable: boolean("immutable").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	locationVersionUnique: uniqueIndex("sv_grid_definitions_location_version_unique").on(table.locationId, table.version),
	idLocationUnique: uniqueIndex("sv_grid_definitions_id_location_unique").on(table.id, table.locationId),
	orgLocationIdx: index("sv_grid_definitions_org_location_idx").on(table.organizationId, table.locationId),
	pointCountCheck: check("sv_grid_definitions_point_count_check", sql`${table.pointCount} > 0 AND ${table.pointCount} <= 49 AND ${table.pointCount} = ${table.rows} * ${table.columns}`),
	shapeCheck: check("sv_grid_definitions_shape_check", sql`${table.shape} = 'SQUARE' AND ${table.rows} = ${table.columns} AND mod(${table.rows}, 2) = 1`),
	spacingCheck: check("sv_grid_definitions_spacing_check", sql`${table.spacingMeters} > 0`)
})).enableRLS();
var svGridPoints = pgTable("sv_grid_points", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	gridId: uuid("grid_id").notNull().references(() => svGridDefinitions.id),
	pointIndex: integer("point_index").notNull(),
	latitude: numeric("latitude", {
		precision: 9,
		scale: 6
	}).notNull(),
	longitude: numeric("longitude", {
		precision: 9,
		scale: 6
	}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	gridPointUnique: uniqueIndex("sv_grid_points_grid_point_unique").on(table.gridId, table.pointIndex),
	idGridUnique: uniqueIndex("sv_grid_points_id_grid_unique").on(table.id, table.gridId),
	orgGridIdx: index("sv_grid_points_org_grid_idx").on(table.organizationId, table.gridId),
	pointIndexCheck: check("sv_grid_points_point_index_check", sql`${table.pointIndex} >= 0`),
	latitudeCheck: check("sv_grid_points_latitude_check", sql`${table.latitude} BETWEEN -90 AND 90`),
	longitudeCheck: check("sv_grid_points_longitude_check", sql`${table.longitude} BETWEEN -180 AND 180`)
})).enableRLS();
var svLocalScanCycles = pgTable("sv_local_scan_cycles", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	measurementCycleId: uuid("measurement_cycle_id").notNull(),
	domainId: text("domain_id").notNull().default("LOCAL_MAPS"),
	configurationLockId: uuid("configuration_lock_id").notNull().references(() => svConfigurationLocks.id),
	locationId: uuid("location_id").notNull().references(() => svBusinessLocations.id),
	gridDefinitionId: uuid("grid_definition_id").notNull().references(() => svGridDefinitions.id),
	provider: text("provider").notNull(),
	repeats: integer("repeats").notNull(),
	captureDepth: integer("capture_depth").notNull(),
	expectedObservations: integer("expected_observations").notNull(),
	createdObservations: integer("created_observations").notNull().default(0),
	worstCaseCostUsd: numeric("worst_case_cost_usd", {
		precision: 12,
		scale: 6
	}).notNull(),
	costSnapshot: jsonb("cost_snapshot").notNull(),
	status: text("status", { enum: localPilotCycleStatuses }).notNull().default("CREATED"),
	executionMode: text("execution_mode").notNull().default("LEGACY_SOURCE_ONLY"),
	approvedCanaryReviewId: uuid("approved_canary_review_id"),
	providerContractDigest: text("provider_contract_digest"),
	emergencyStoppedAt: timestamp("emergency_stopped_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	statusCheck: check("sv_local_scan_cycles_status_check", sql`${table.status} IN ('CREATED', 'PREFLIGHT_BLOCKED', 'BUDGET_BLOCKED', 'APPROVED', 'CANARY_RUNNING', 'CANARY_REVIEW', 'QUEUED', 'RUNNING', 'PARTIAL_FAILURE', 'PROVIDER_BLOCKED', 'UNKNOWN_RECONCILIATION', 'STOPPED', 'CARDINALITY_INCIDENT', 'QC_REQUIRED', 'READY', 'COMPLETED', 'FAILED')`),
	pilotOrgIdUnique: uniqueIndex("sv_local_scan_cycles_pilot_org_id_unique").on(table.organizationId, table.id),
	measurementCycleUnique: uniqueIndex("sv_local_scan_cycles_measurement_cycle_unique").on(table.measurementCycleId),
	acceptedCanaryReviewUnique: uniqueIndex("sv_local_scan_cycles_accepted_canary_review_unique").on(table.organizationId, table.approvedCanaryReviewId).where(sql`${table.approvedCanaryReviewId} IS NOT NULL AND ${table.status} <> 'STOPPED'`),
	resultIdentityUnique: uniqueIndex("sv_local_scan_cycles_result_identity_unique").on(table.id, table.organizationId, table.measurementCycleId, table.configurationLockId, table.provider),
	cycleMatrixUnique: uniqueIndex("sv_local_scan_cycles_id_location_grid_unique").on(table.id, table.locationId, table.gridDefinitionId),
	measurementDomainReference: foreignKey({
		columns: [
			table.measurementCycleId,
			table.domainId,
			table.organizationId,
			table.configurationLockId
		],
		foreignColumns: [
			svMeasurementCycles.id,
			svMeasurementCycles.domainId,
			svMeasurementCycles.organizationId,
			svMeasurementCycles.configurationLockId
		],
		name: "sv_local_scan_cycles_measurement_domain_fk"
	}),
	gridLocationReference: foreignKey({
		columns: [table.gridDefinitionId, table.locationId],
		foreignColumns: [svGridDefinitions.id, svGridDefinitions.locationId],
		name: "sv_local_scan_cycles_grid_location_fk"
	}),
	orgLocationIdx: index("sv_local_scan_cycles_org_location_idx").on(table.organizationId, table.locationId),
	domainCheck: check("sv_local_scan_cycles_domain_check", sql`${table.domainId} = 'LOCAL_MAPS'`),
	cardinalityCheck: check("sv_local_scan_cycles_cardinality_check", sql`${table.expectedObservations} > 0 AND ${table.createdObservations} >= 0 AND ${table.createdObservations} <= ${table.expectedObservations}`),
	shapeCheck: check("sv_local_scan_cycles_shape_check", sql`${table.repeats} > 0 AND ${table.captureDepth} >= 0 AND ${table.worstCaseCostUsd} >= 0`)
})).enableRLS();
var svMeasurementAttemptResults = pgTable("sv_measurement_attempt_results", {
	attemptId: uuid("attempt_id").primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	measurementCycleId: uuid("measurement_cycle_id").notNull(),
	localCycleId: uuid("local_cycle_id").notNull(),
	configurationLockId: uuid("configuration_lock_id").notNull(),
	providerId: text("provider_id").notNull(),
	reservationId: uuid("reservation_id").notNull(),
	executionKey: text("execution_key").notNull(),
	attemptIndex: integer("attempt_index").notNull(),
	resultFingerprint: text("result_fingerprint").notNull(),
	resultCanonical: text("result_canonical").notNull(),
	validatedResult: jsonb("validated_result").notNull(),
	disposition: jsonb("disposition").notNull(),
	budgetIncident: text("budget_incident"),
	requiredBudgetState: text("required_budget_state").notNull(),
	providerTaskId: text("provider_task_id"),
	rawResponseReference: text("raw_response_reference"),
	rawResponseSha256: text("raw_response_sha256"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	attemptReference: foreignKey({
		columns: [
			table.attemptId,
			table.organizationId,
			table.measurementCycleId,
			table.reservationId,
			table.executionKey,
			table.attemptIndex
		],
		foreignColumns: [
			svMeasurementAttempts.id,
			svMeasurementAttempts.organizationId,
			svMeasurementAttempts.measurementCycleId,
			svMeasurementAttempts.reservationId,
			svMeasurementAttempts.executionKey,
			svMeasurementAttempts.attemptIndex
		],
		name: "sv_measurement_attempt_results_attempt_identity_fk"
	}),
	localCycleReference: foreignKey({
		columns: [
			table.localCycleId,
			table.organizationId,
			table.measurementCycleId,
			table.configurationLockId,
			table.providerId
		],
		foreignColumns: [
			svLocalScanCycles.id,
			svLocalScanCycles.organizationId,
			svLocalScanCycles.measurementCycleId,
			svLocalScanCycles.configurationLockId,
			svLocalScanCycles.provider
		],
		name: "sv_measurement_attempt_results_local_cycle_identity_fk"
	}),
	orgFingerprintUnique: uniqueIndex("sv_measurement_attempt_results_org_fingerprint_unique").on(table.organizationId, table.resultFingerprint),
	orgCreatedIdx: index("sv_measurement_attempt_results_org_created_idx").on(table.organizationId, table.createdAt),
	fingerprintCheck: check("sv_measurement_attempt_results_fingerprint_check", sql`(${table.resultFingerprint} = 'sha256:' || encode(sha256(convert_to(${table.resultCanonical}, 'UTF8')), 'hex') AND ${table.validatedResult} = ${table.resultCanonical}::jsonb) IS TRUE`),
	identityCheck: check("sv_measurement_attempt_results_identity_check", sql`(jsonb_typeof(${table.validatedResult}) = 'object' AND ${table.validatedResult} ?& array['schemaVersion', 'kind', 'mode', 'canonicalizationVersion', 'storageClass', 'organizationId', 'measurementCycleId', 'localCycleId', 'configurationLockId', 'attemptId', 'reservationId', 'executionKey', 'attemptIndex', 'lockSnapshotCanonical', 'requestSnapshotCanonical', 'provider', 'externalProviderCalls', 'completedAt', 'event', 'targetRank', 'evidenceEligible', 'provenance', 'cost'] AND ${table.validatedResult}->>'schemaVersion' = '1' AND ${table.validatedResult}->>'canonicalizationVersion' = 'canonical-json-code-unit-v1' AND ${table.validatedResult}->>'kind' = 'LOCAL_MAPS_LIVE_PROVIDER_RESULT' AND ${table.validatedResult}->>'mode' = 'LIVE_PROVIDER' AND ${table.validatedResult}->>'storageClass' = 'LIVE_ATTEMPT' AND ${table.validatedResult}->>'organizationId' = ${table.organizationId} AND ${table.validatedResult}->>'measurementCycleId' = ${table.measurementCycleId}::text AND ${table.validatedResult}->>'localCycleId' = ${table.localCycleId}::text AND ${table.validatedResult}->>'configurationLockId' = ${table.configurationLockId}::text AND ${table.validatedResult}->>'attemptId' = ${table.attemptId}::text AND ${table.validatedResult}->>'reservationId' = ${table.reservationId}::text AND ${table.validatedResult}->>'executionKey' = ${table.executionKey} AND ${table.validatedResult}->>'attemptIndex' = ${table.attemptIndex}::text AND ${table.validatedResult}#>>'{provider,id}' = ${table.providerId} AND ${table.validatedResult}->>'externalProviderCalls' = '1') IS TRUE`),
	liveShapeCheck: check("sv_measurement_attempt_results_live_shape_check", sql`(${table.validatedResult} - 'schemaVersion'::text - 'kind'::text - 'mode'::text - 'canonicalizationVersion'::text - 'storageClass'::text - 'organizationId'::text - 'measurementCycleId'::text - 'localCycleId'::text - 'configurationLockId'::text - 'attemptId'::text - 'reservationId'::text - 'executionKey'::text - 'attemptIndex'::text - 'lockSnapshotCanonical'::text - 'requestSnapshotCanonical'::text - 'provider'::text - 'externalProviderCalls'::text - 'completedAt'::text - 'event'::text - 'targetRank'::text - 'evidenceEligible'::text - 'provenance'::text - 'cost'::text = '{}'::jsonb AND jsonb_typeof(${table.validatedResult}->'schemaVersion') = 'number' AND jsonb_typeof(${table.validatedResult}->'kind') = 'string' AND jsonb_typeof(${table.validatedResult}->'mode') = 'string' AND jsonb_typeof(${table.validatedResult}->'canonicalizationVersion') = 'string' AND jsonb_typeof(${table.validatedResult}->'storageClass') = 'string' AND jsonb_typeof(${table.validatedResult}->'organizationId') = 'string' AND jsonb_typeof(${table.validatedResult}->'measurementCycleId') = 'string' AND jsonb_typeof(${table.validatedResult}->'localCycleId') = 'string' AND jsonb_typeof(${table.validatedResult}->'configurationLockId') = 'string' AND jsonb_typeof(${table.validatedResult}->'attemptId') = 'string' AND jsonb_typeof(${table.validatedResult}->'reservationId') = 'string' AND jsonb_typeof(${table.validatedResult}->'executionKey') = 'string' AND jsonb_typeof(${table.validatedResult}->'attemptIndex') = 'number' AND jsonb_typeof(${table.validatedResult}->'lockSnapshotCanonical') = 'string' AND length(${table.validatedResult}->>'lockSnapshotCanonical') > 0 AND jsonb_typeof(${table.validatedResult}->'requestSnapshotCanonical') = 'string' AND length(${table.validatedResult}->>'requestSnapshotCanonical') > 0 AND jsonb_typeof(${table.validatedResult}->'externalProviderCalls') = 'number' AND jsonb_typeof(${table.validatedResult}->'completedAt') = 'string' AND jsonb_typeof(${table.validatedResult}->'evidenceEligible') = 'boolean' AND jsonb_typeof(${table.validatedResult}->'provider') = 'object' AND ${table.validatedResult}->'provider' ?& array['id', 'version', 'providerTaskId'] AND (${table.validatedResult}->'provider') - 'id'::text - 'version'::text - 'providerTaskId'::text = '{}'::jsonb AND jsonb_typeof(${table.validatedResult}#>'{provider,id}') = 'string' AND length(${table.validatedResult}#>>'{provider,id}') > 0 AND ${table.validatedResult}#>>'{provider,id}' !~ '[[:space:]]' AND ${table.validatedResult}#>>'{provider,id}' !~* '^(stub|noop)(-|$)' AND jsonb_typeof(${table.validatedResult}#>'{provider,version}') = 'string' AND length(${table.validatedResult}#>>'{provider,version}') > 0 AND ${table.validatedResult}#>>'{provider,version}' !~ '[[:space:]]' AND jsonb_typeof(${table.validatedResult}#>'{provider,providerTaskId}') IN ('string', 'null') AND jsonb_typeof(${table.validatedResult}->'event') = 'object' AND jsonb_typeof(${table.validatedResult}->'provenance') = 'object' AND ${table.validatedResult}->'provenance' ?& array['evidenceKind', 'checkReference', 'rawResponseReference', 'rawResponseSha256', 'providerObservedAt'] AND (${table.validatedResult}->'provenance') - 'evidenceKind'::text - 'checkReference'::text - 'rawResponseReference'::text - 'rawResponseSha256'::text - 'providerObservedAt'::text = '{}'::jsonb AND ${table.validatedResult}#>>'{provenance,evidenceKind}' = 'MAPS_SERP_PROVIDER' AND jsonb_typeof(${table.validatedResult}#>'{provenance,checkReference}') IN ('string', 'null') AND (jsonb_typeof(${table.validatedResult}#>'{provenance,checkReference}') = 'null' OR (length(${table.validatedResult}#>>'{provenance,checkReference}') > 0 AND ${table.validatedResult}#>>'{provenance,checkReference}' !~ '[[:space:]]' AND ${table.validatedResult}#>>'{provenance,checkReference}' !~* '^(stub-local-maps:|stub:)')) AND jsonb_typeof(${table.validatedResult}->'cost') = 'object' AND ${table.validatedResult}->'cost' ?& array['status', 'currency', 'amountUsd', 'basis'] AND (${table.validatedResult}->'cost') - 'status'::text - 'currency'::text - 'amountUsd'::text - 'basis'::text = '{}'::jsonb AND ${table.validatedResult}#>>'{cost,currency}' = 'USD' AND ((${table.validatedResult}->'event' = '{"kind":"FOUND"}'::jsonb AND jsonb_typeof(${table.validatedResult}->'targetRank') = 'number' AND mod((${table.validatedResult}->>'targetRank')::numeric, 1) = 0 AND (${table.validatedResult}->>'targetRank')::numeric BETWEEN 1 AND 20 AND ${table.validatedResult}->>'evidenceEligible' = 'true' AND ${table.validatedResult}#>>'{cost,status}' = 'KNOWN' AND jsonb_typeof(${table.validatedResult}#>'{cost,amountUsd}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{cost,basis}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,checkReference}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseReference}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseSha256}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,providerObservedAt}') = 'string') OR (${table.validatedResult}->'event' = '{"kind":"ABSENT_WITHIN_DEPTH"}'::jsonb AND jsonb_typeof(${table.validatedResult}->'targetRank') = 'null' AND ${table.validatedResult}->>'evidenceEligible' = 'true' AND ${table.validatedResult}#>>'{cost,status}' = 'KNOWN' AND jsonb_typeof(${table.validatedResult}#>'{cost,amountUsd}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{cost,basis}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,checkReference}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseReference}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseSha256}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,providerObservedAt}') = 'string') OR ((((${table.validatedResult}#>>'{event,kind}' = 'RETRYABLE_FAILURE' AND (${table.validatedResult}->'event') - 'kind'::text - 'reason'::text = '{}'::jsonb AND ${table.validatedResult}#>>'{event,reason}' IN ('EMPTY_RESPONSE', 'TRUNCATED_RESPONSE', 'TIMEOUT', 'PROVIDER_5XX', 'RATE_LIMITED', 'MALFORMED_RESPONSE')) OR ${table.validatedResult}->'event' = '{"kind":"PROVIDER_AUTH_FAILURE"}'::jsonb) AND jsonb_typeof(${table.validatedResult}->'targetRank') = 'null' AND ${table.validatedResult}->>'evidenceEligible' = 'false' AND ${table.validatedResult}#>>'{cost,status}' = 'KNOWN' AND jsonb_typeof(${table.validatedResult}#>'{cost,amountUsd}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{cost,basis}') = 'string' AND ((jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseReference}') = 'null' AND jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseSha256}') = 'null' AND jsonb_typeof(${table.validatedResult}#>'{provenance,providerObservedAt}') = 'null') OR (jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseReference}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseSha256}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,providerObservedAt}') = 'string')))) OR (${table.validatedResult}->'event' = '{"kind":"OUTCOME_UNKNOWN"}'::jsonb AND jsonb_typeof(${table.validatedResult}->'targetRank') = 'null' AND ${table.validatedResult}->>'evidenceEligible' = 'false' AND ${table.validatedResult}#>>'{cost,status}' = 'UNKNOWN' AND jsonb_typeof(${table.validatedResult}#>'{cost,amountUsd}') = 'null' AND jsonb_typeof(${table.validatedResult}#>'{cost,basis}') = 'null' AND ((jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseReference}') = 'null' AND jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseSha256}') = 'null' AND jsonb_typeof(${table.validatedResult}#>'{provenance,providerObservedAt}') = 'null') OR (jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseReference}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,rawResponseSha256}') = 'string' AND jsonb_typeof(${table.validatedResult}#>'{provenance,providerObservedAt}') = 'string'))))) IS TRUE`),
	dispositionCheck: check("sv_measurement_attempt_results_disposition_check", sql`(jsonb_typeof(${table.disposition}) = 'object' AND ${table.disposition} ?& array['attemptStatus', 'observationValidity', 'observationOutcome', 'cycleStatus', 'retryAllowed', 'finalInvalidReason'] AND ${table.disposition} - 'attemptStatus'::text - 'observationValidity'::text - 'observationOutcome'::text - 'cycleStatus'::text - 'retryAllowed'::text - 'finalInvalidReason'::text = '{}'::jsonb AND ${table.disposition}->>'attemptStatus' IN ('SUCCEEDED', 'RETRYABLE_FAILURE', 'TERMINAL_FAILURE', 'UNKNOWN_RECONCILIATION') AND ${table.disposition}->>'observationValidity' IN ('VALID', 'INVALID', 'UNMEASURED') AND ${table.disposition}->>'observationOutcome' IN ('FOUND', 'ABSENT_WITHIN_DEPTH', 'RETRY_PENDING', 'PROVIDER_ERROR', 'PROVIDER_BLOCKED', 'PREFLIGHT_BLOCKED', 'UNKNOWN_RECONCILIATION') AND ${table.disposition}->>'cycleStatus' IN ('RUNNING', 'PARTIAL_FAILURE', 'PROVIDER_BLOCKED', 'PREFLIGHT_BLOCKED', 'STOPPED') AND jsonb_typeof(${table.disposition}->'retryAllowed') = 'boolean' AND jsonb_typeof(${table.disposition}->'finalInvalidReason') IN ('string', 'null')) IS TRUE`),
	budgetCheck: check("sv_measurement_attempt_results_budget_check", sql`(${table.requiredBudgetState} IN ('RESERVED', 'SPENT', 'RELEASED') AND (${table.budgetIncident} IS NULL OR ${table.budgetIncident} = 'REPORTED_COST_EXCEEDS_RESERVATION')) IS TRUE`),
	provenanceCheck: check("sv_measurement_attempt_results_provenance_check", sql`((${table.providerTaskId} IS NULL OR (length(${table.providerTaskId}) > 0 AND ${table.providerTaskId} !~ '[[:space:]]')) AND ((${table.rawResponseReference} IS NULL AND ${table.rawResponseSha256} IS NULL) OR (${table.rawResponseReference} IS NOT NULL AND ${table.rawResponseSha256} IS NOT NULL AND length(${table.rawResponseReference}) > 0 AND ${table.rawResponseReference} !~ '[[:space:]]' AND ${table.rawResponseReference} !~* '^(stub-local-maps:|stub:)' AND ${table.rawResponseSha256} ~ '^sha256:[a-f0-9]{64}$')) AND (${table.validatedResult}#>>'{provider,providerTaskId}') IS NOT DISTINCT FROM ${table.providerTaskId} AND (${table.validatedResult}#>>'{provenance,rawResponseReference}') IS NOT DISTINCT FROM ${table.rawResponseReference} AND (${table.validatedResult}#>>'{provenance,rawResponseSha256}') IS NOT DISTINCT FROM ${table.rawResponseSha256} AND (coalesce((${table.validatedResult}->>'evidenceEligible')::boolean, false) = false OR ${table.rawResponseReference} IS NOT NULL)) IS TRUE`)
})).enableRLS();
var svLocalRankObservations = pgTable("sv_local_rank_observations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull().references(() => svLocalScanCycles.id),
	locationId: uuid("location_id").notNull().references(() => svBusinessLocations.id),
	keywordId: uuid("keyword_id").notNull().references(() => svLocalKeywords.id),
	gridDefinitionId: uuid("grid_definition_id").notNull().references(() => svGridDefinitions.id),
	gridPointId: uuid("grid_point_id").notNull().references(() => svGridPoints.id),
	provider: text("provider").notNull(),
	repeatIndex: integer("repeat_index").notNull(),
	validity: svLocalRankValidityEnum("validity"),
	invalidReason: text("invalid_reason"),
	captureDepth: integer("capture_depth").notNull(),
	captureMode: text("capture_mode").notNull(),
	targetRank: integer("target_rank"),
	attemptCount: integer("attempt_count").notNull().default(1),
	rawReference: text("raw_reference"),
	capturedAt: timestamp("captured_at", { withTimezone: true }),
	outcome: text("outcome").notNull().default("PENDING"),
	evidenceEnvelope: jsonb("evidence_envelope"),
	evidenceCanonical: text("evidence_canonical"),
	evidenceSha256: text("evidence_sha256"),
	evidenceId: uuid("evidence_id"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	pilotOrgIdUnique: uniqueIndex("sv_local_rank_observations_pilot_org_id_unique").on(table.organizationId, table.id),
	evidenceReference: foreignKey({
		columns: [table.evidenceId, table.organizationId],
		foreignColumns: [svEvidenceIndex.id, svEvidenceIndex.organizationId],
		name: "sv_local_observation_evidence_org_fk"
	}),
	matrixUnique: uniqueIndex("sv_local_rank_observations_matrix_unique").on(table.cycleId, table.locationId, table.keywordId, table.gridPointId, table.provider, table.repeatIndex),
	cycleMatrixReference: foreignKey({
		columns: [
			table.cycleId,
			table.locationId,
			table.gridDefinitionId
		],
		foreignColumns: [
			svLocalScanCycles.id,
			svLocalScanCycles.locationId,
			svLocalScanCycles.gridDefinitionId
		],
		name: "sv_local_rank_observations_cycle_matrix_fk"
	}),
	keywordLocationReference: foreignKey({
		columns: [table.keywordId, table.locationId],
		foreignColumns: [svLocalKeywords.id, svLocalKeywords.locationId],
		name: "sv_local_rank_observations_keyword_location_fk"
	}),
	pointGridReference: foreignKey({
		columns: [table.gridPointId, table.gridDefinitionId],
		foreignColumns: [svGridPoints.id, svGridPoints.gridId],
		name: "sv_local_rank_observations_point_grid_fk"
	}),
	orgCycleIdx: index("sv_local_rank_observations_org_cycle_idx").on(table.organizationId, table.cycleId),
	captureDepthCheck: check("sv_local_rank_observations_capture_depth_check", sql`${table.captureDepth} >= 0`),
	repeatCheck: check("sv_local_rank_observations_repeat_check", sql`${table.repeatIndex} >= 0`),
	attemptCheck: check("sv_local_rank_observations_attempt_check", sql`${table.attemptCount} BETWEEN 1 AND 3`),
	rankCheck: check("sv_local_rank_observations_target_rank_check", sql`${table.targetRank} IS NULL OR (${table.targetRank} > 0 AND ${table.targetRank} <= ${table.captureDepth})`)
})).enableRLS();
var svLocalCompetitorObservations = pgTable("sv_local_competitor_observations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	observationId: uuid("observation_id").notNull().references(() => svLocalRankObservations.id),
	rank: integer("rank").notNull(),
	entityName: text("entity_name").notNull(),
	matchedEntityId: uuid("matched_entity_id").references(() => svEntities.id),
	matchStatus: text("match_status").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	observationRankUnique: uniqueIndex("sv_local_competitor_observations_rank_unique").on(table.observationId, table.rank),
	orgObservationIdx: index("sv_local_competitor_observations_org_observation_idx").on(table.organizationId, table.observationId),
	rankCheck: check("sv_local_competitor_observations_rank_check", sql`${table.rank} > 0`)
})).enableRLS();
var svLocalVisibilityMetrics = pgTable("sv_local_visibility_metrics", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull().references(() => svLocalScanCycles.id),
	keywordId: uuid("keyword_id").notNull().references(() => svLocalKeywords.id),
	formulaVersion: text("formula_version").notNull(),
	top3Coverage: numeric("top3_coverage", {
		precision: 9,
		scale: 8
	}),
	top10Coverage: numeric("top10_coverage", {
		precision: 9,
		scale: 8
	}),
	top20Coverage: numeric("top20_coverage", {
		precision: 9,
		scale: 8
	}),
	outsideTop20: numeric("outside_top20", {
		precision: 9,
		scale: 8
	}),
	averageRank: numeric("average_rank", {
		precision: 12,
		scale: 6
	}),
	foundShare: numeric("found_share", {
		precision: 9,
		scale: 8
	}),
	shareOfLocalVoice: numeric("share_of_local_voice", {
		precision: 9,
		scale: 8
	}),
	competitorComparison: jsonb("competitor_comparison").notNull().default({}),
	computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	cycleKeywordFormulaUnique: uniqueIndex("sv_local_visibility_metrics_cycle_keyword_formula_unique").on(table.cycleId, table.keywordId, table.formulaVersion),
	orgCycleIdx: index("sv_local_visibility_metrics_org_cycle_idx").on(table.organizationId, table.cycleId)
})).enableRLS();
var svVisibilityMapPoints = pgView("sv_visibility_map_points", {
	organizationId: text("organization_id").notNull(),
	projectId: uuid("project_id").notNull(),
	locationId: uuid("location_id").notNull(),
	periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
	periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
	datasetId: uuid("dataset_id").notNull(),
	measurementCycleId: uuid("measurement_cycle_id").notNull(),
	localCycleId: uuid("local_cycle_id").notNull(),
	datasetStatus: text("dataset_status").notNull(),
	gridDefinitionId: uuid("grid_definition_id").notNull(),
	gridDefinitionVersion: integer("grid_definition_version").notNull(),
	gridPointId: uuid("grid_point_id").notNull(),
	pointIndex: integer("point_index").notNull(),
	latitude: numeric("latitude", {
		precision: 9,
		scale: 6
	}).notNull(),
	longitude: numeric("longitude", {
		precision: 9,
		scale: 6
	}).notNull(),
	observationId: uuid("observation_id").notNull(),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	provider: text("provider").notNull(),
	keywordId: uuid("keyword_id").notNull(),
	keyword: text("keyword").notNull(),
	locale: text("locale").notNull(),
	deviceContext: text("device_context").notNull(),
	formulaVersion: text("formula_version").notNull(),
	repeatIndex: integer("repeat_index").notNull(),
	sourceValidity: text("source_validity").notNull(),
	invalidReason: text("invalid_reason"),
	targetRank: integer("target_rank"),
	displayStatus: text("display_status").notNull(),
	interpolated: boolean("interpolated").notNull(),
	materializationKind: text("materialization_kind").notNull(),
	refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
	isStale: boolean("is_stale").notNull()
}).existing();
var svVisibilityMapDatasets = pgView("sv_visibility_map_datasets", {
	organizationId: text("organization_id").notNull(),
	projectId: uuid("project_id").notNull(),
	locationId: uuid("location_id").notNull(),
	datasetId: uuid("dataset_id").notNull(),
	measurementCycleId: uuid("measurement_cycle_id").notNull(),
	localCycleId: uuid("local_cycle_id").notNull(),
	periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
	periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
	keywordIds: uuid("keyword_ids").array().notNull(),
	gridDefinitionId: uuid("grid_definition_id").notNull(),
	gridDefinitionVersion: integer("grid_definition_version").notNull(),
	providers: text("providers").array().notNull(),
	locales: text("locales").array().notNull(),
	deviceContexts: text("device_contexts").array().notNull(),
	formulaVersions: text("formula_versions").array().notNull(),
	datasetStatus: text("dataset_status").notNull(),
	observationCount: integer("observation_count").notNull(),
	materializationKind: text("materialization_kind").notNull(),
	refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
	isStale: boolean("is_stale").notNull()
}).existing();
var svSearchQueries = pgTable("sv_search_queries", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	queryText: text("query_text").notNull(),
	normalizedText: text("normalized_text").notNull(),
	engine: text("engine").notNull(),
	region: text("region").notNull(),
	device: text("device").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	projectQueryScopeUnique: uniqueIndex("sv_search_queries_project_scope_unique").on(table.projectId, table.normalizedText, table.engine, table.region, table.device),
	idScopeUnique: uniqueIndex("sv_search_queries_id_scope_unique").on(table.id, table.engine, table.region, table.device),
	orgProjectIdx: index("sv_search_queries_org_project_idx").on(table.organizationId, table.projectId),
	textCheck: check("sv_search_queries_text_check", sql`length(trim(${table.queryText})) > 0 AND length(trim(${table.normalizedText})) > 0`)
})).enableRLS();
var svSearchRankObservations = pgTable("sv_search_rank_observations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull(),
	domainId: text("domain_id").notNull().default("SEARCH"),
	queryId: uuid("query_id").notNull().references(() => svSearchQueries.id),
	engine: text("engine").notNull(),
	region: text("region").notNull(),
	device: text("device").notNull(),
	repeatIndex: integer("repeat_index").notNull(),
	validity: text("validity").notNull(),
	invalidReason: text("invalid_reason"),
	captureDepth: integer("capture_depth").notNull(),
	targetRank: integer("target_rank"),
	attemptCount: integer("attempt_count").notNull().default(1),
	rawReference: text("raw_reference"),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	observationScopeUnique: uniqueIndex("sv_search_rank_observations_scope_unique").on(table.cycleId, table.queryId, table.engine, table.region, table.device, table.repeatIndex),
	cycleDomainReference: foreignKey({
		columns: [table.cycleId, table.domainId],
		foreignColumns: [svMeasurementCycles.id, svMeasurementCycles.domainId],
		name: "sv_search_rank_observations_cycle_domain_fk"
	}),
	queryScopeReference: foreignKey({
		columns: [
			table.queryId,
			table.engine,
			table.region,
			table.device
		],
		foreignColumns: [
			svSearchQueries.id,
			svSearchQueries.engine,
			svSearchQueries.region,
			svSearchQueries.device
		],
		name: "sv_search_rank_observations_query_scope_fk"
	}),
	orgCycleIdx: index("sv_search_rank_observations_org_cycle_idx").on(table.organizationId, table.cycleId),
	domainCheck: check("sv_search_rank_observations_domain_check", sql`${table.domainId} = 'SEARCH'`),
	validityCheck: check("sv_search_rank_observations_validity_check", sql`${table.validity} IN ('VALID', 'INVALID', 'UNMEASURED')`),
	invalidReasonCheck: check("sv_search_rank_observations_invalid_reason_check", sql`(${table.validity} = 'VALID' AND ${table.invalidReason} IS NULL) OR (${table.validity} <> 'VALID' AND ${table.invalidReason} IS NOT NULL)`),
	rankCheck: check("sv_search_rank_observations_rank_check", sql`${table.captureDepth} >= 0 AND (${table.targetRank} IS NULL OR (${table.targetRank} > 0 AND ${table.targetRank} <= ${table.captureDepth}))`),
	retryCheck: check("sv_search_rank_observations_retry_check", sql`${table.repeatIndex} >= 0 AND ${table.attemptCount} > 0`)
})).enableRLS();
var svReputationSources = pgTable("sv_reputation_sources", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	locationId: uuid("location_id").notNull().references(() => svBusinessLocations.id),
	source: text("source").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	locationSourceUnique: uniqueIndex("sv_reputation_sources_location_source_unique").on(table.locationId, table.source),
	orgLocationIdx: index("sv_reputation_sources_org_location_idx").on(table.organizationId, table.locationId),
	sourceCheck: check("sv_reputation_sources_source_check", sql`length(trim(${table.source})) > 0`)
})).enableRLS();
var svReviewSnapshots = pgTable("sv_review_snapshots", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull(),
	domainId: text("domain_id").notNull().default("REPUTATION"),
	sourceId: uuid("source_id").notNull().references(() => svReputationSources.id),
	periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
	periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
	validity: text("validity").notNull().default("VALID"),
	invalidReason: text("invalid_reason"),
	ratingAverage: numeric("rating_average", {
		precision: 4,
		scale: 3
	}),
	reviewCount: integer("review_count"),
	newReviews: integer("new_reviews"),
	attemptCount: integer("attempt_count").notNull().default(1),
	rawReference: text("raw_reference"),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	sourcePeriodUnique: uniqueIndex("sv_review_snapshots_source_period_unique").on(table.sourceId, table.periodStart, table.periodEnd),
	idSourcePeriodUnique: uniqueIndex("sv_review_snapshots_id_source_period_unique").on(table.id, table.sourceId, table.periodStart, table.periodEnd),
	cycleDomainReference: foreignKey({
		columns: [table.cycleId, table.domainId],
		foreignColumns: [svMeasurementCycles.id, svMeasurementCycles.domainId],
		name: "sv_review_snapshots_cycle_domain_fk"
	}),
	orgCycleIdx: index("sv_review_snapshots_org_cycle_idx").on(table.organizationId, table.cycleId),
	domainCheck: check("sv_review_snapshots_domain_check", sql`${table.domainId} = 'REPUTATION'`),
	periodCheck: check("sv_review_snapshots_period_check", sql`${table.periodEnd} > ${table.periodStart}`),
	validityCheck: check("sv_review_snapshots_validity_check", sql`${table.validity} IN ('VALID', 'INVALID', 'UNMEASURED')`),
	invalidReasonCheck: check("sv_review_snapshots_invalid_reason_check", sql`(${table.validity} = 'VALID' AND ${table.invalidReason} IS NULL) OR (${table.validity} <> 'VALID' AND ${table.invalidReason} IS NOT NULL)`),
	metricCheck: check("sv_review_snapshots_metric_check", sql`(${table.ratingAverage} IS NULL OR (${table.ratingAverage} >= 0 AND ${table.ratingAverage} <= 5)) AND (${table.reviewCount} IS NULL OR ${table.reviewCount} >= 0) AND (${table.newReviews} IS NULL OR ${table.newReviews} >= 0)`),
	retryCheck: check("sv_review_snapshots_retry_check", sql`${table.attemptCount} > 0`)
})).enableRLS();
var svReviewVelocityMetrics = pgTable("sv_review_velocity_metrics", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	snapshotId: uuid("snapshot_id").notNull().references(() => svReviewSnapshots.id),
	sourceId: uuid("source_id").notNull().references(() => svReputationSources.id),
	periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
	periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
	formulaVersion: text("formula_version").notNull(),
	velocityPer30Days: numeric("velocity_per_30_days", {
		precision: 12,
		scale: 6
	}),
	computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	sourcePeriodFormulaUnique: uniqueIndex("sv_review_velocity_metrics_source_period_formula_unique").on(table.sourceId, table.periodStart, table.periodEnd, table.formulaVersion),
	snapshotScopeReference: foreignKey({
		columns: [
			table.snapshotId,
			table.sourceId,
			table.periodStart,
			table.periodEnd
		],
		foreignColumns: [
			svReviewSnapshots.id,
			svReviewSnapshots.sourceId,
			svReviewSnapshots.periodStart,
			svReviewSnapshots.periodEnd
		],
		name: "sv_review_velocity_metrics_snapshot_scope_fk"
	}),
	orgSourceIdx: index("sv_review_velocity_metrics_org_source_idx").on(table.organizationId, table.sourceId),
	periodCheck: check("sv_review_velocity_metrics_period_check", sql`${table.periodEnd} > ${table.periodStart}`),
	velocityCheck: check("sv_review_velocity_metrics_value_check", sql`${table.velocityPer30Days} IS NULL OR ${table.velocityPer30Days} >= 0`)
})).enableRLS();
var svReviewTopicObservations = pgTable("sv_review_topic_observations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	snapshotId: uuid("snapshot_id").notNull().references(() => svReviewSnapshots.id),
	topic: text("topic").notNull(),
	sentiment: text("sentiment").notNull(),
	analysisMethodVersion: text("analysis_method_version").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	snapshotTopicMethodUnique: uniqueIndex("sv_review_topic_observations_topic_method_unique").on(table.snapshotId, table.topic, table.analysisMethodVersion),
	orgSnapshotIdx: index("sv_review_topic_observations_org_snapshot_idx").on(table.organizationId, table.snapshotId),
	analysisMethodCheck: check("sv_review_topic_observations_analysis_method_check", sql`length(trim(${table.topic})) > 0 AND length(trim(${table.sentiment})) > 0 AND length(trim(${table.analysisMethodVersion})) > 0`)
})).enableRLS();
var svOutcomeMetricDefinitions = pgTable("sv_outcome_metric_definitions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	metricKey: text("metric_key").notNull(),
	version: integer("version").notNull(),
	unit: text("unit").notNull(),
	aggregation: text("aggregation").notNull().default("SUM"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	metricVersionUnique: uniqueIndex("sv_outcome_metric_definitions_key_version_unique").on(table.metricKey, table.version),
	shapeCheck: check("sv_outcome_metric_definitions_shape_check", sql`${table.version} > 0 AND length(trim(${table.metricKey})) > 0 AND length(trim(${table.unit})) > 0 AND ${table.aggregation} = 'SUM'`)
})).enableRLS();
var svOutcomeSources = pgTable("sv_outcome_sources", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	locationId: uuid("location_id").notNull().references(() => svBusinessLocations.id),
	accessClass: text("access_class").notNull(),
	sourceReference: text("source_reference").notNull(),
	evidenceIds: text("evidence_ids").array().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	idScopeUnique: uniqueIndex("sv_outcome_sources_id_scope_unique").on(table.id, table.organizationId, table.projectId, table.locationId),
	orgLocationIdx: index("sv_outcome_sources_org_location_idx").on(table.organizationId, table.locationId),
	accessClassCheck: check("sv_outcome_sources_access_class_check", sql`${table.accessClass} IN ('CONNECTED', 'UPLOADED')`),
	provenanceCheck: check("sv_outcome_sources_provenance_check", sql`length(trim(${table.sourceReference})) > 0 AND cardinality(${table.evidenceIds}) > 0`)
})).enableRLS();
var svOutcomeObservations = pgTable("sv_outcome_observations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	locationId: uuid("location_id").notNull().references(() => svBusinessLocations.id),
	sourceId: uuid("source_id").notNull().references(() => svOutcomeSources.id),
	measurementCycleId: uuid("measurement_cycle_id").notNull(),
	domainId: text("domain_id").notNull().default("OUTCOME"),
	datasetId: uuid("dataset_id").notNull(),
	metricKey: text("metric_key").notNull(),
	metricVersion: integer("metric_version").notNull(),
	value: numeric("value", {
		precision: 18,
		scale: 6
	}),
	periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
	periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
	evidenceIds: text("evidence_ids").array().notNull(),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	sourceMetricPeriodUnique: uniqueIndex("sv_outcome_observations_source_metric_period_unique").on(table.sourceId, table.metricKey, table.periodStart, table.periodEnd),
	idScopeMetricUnique: uniqueIndex("sv_outcome_observations_id_scope_metric_unique").on(table.id, table.organizationId, table.projectId, table.locationId, table.metricKey, table.metricVersion),
	sourceScopeReference: foreignKey({
		columns: [
			table.sourceId,
			table.organizationId,
			table.projectId,
			table.locationId
		],
		foreignColumns: [
			svOutcomeSources.id,
			svOutcomeSources.organizationId,
			svOutcomeSources.projectId,
			svOutcomeSources.locationId
		],
		name: "sv_outcome_observations_source_scope_fk"
	}),
	measurementDomainReference: foreignKey({
		columns: [table.measurementCycleId, table.domainId],
		foreignColumns: [svMeasurementCycles.id, svMeasurementCycles.domainId],
		name: "sv_outcome_observations_measurement_domain_fk"
	}),
	datasetCycleReference: foreignKey({
		columns: [
			table.datasetId,
			table.measurementCycleId,
			table.organizationId
		],
		foreignColumns: [
			svMeasurementDatasets.id,
			svMeasurementDatasets.cycleId,
			svMeasurementDatasets.organizationId
		],
		name: "sv_outcome_observations_dataset_cycle_fk"
	}),
	metricDefinitionReference: foreignKey({
		columns: [table.metricKey, table.metricVersion],
		foreignColumns: [svOutcomeMetricDefinitions.metricKey, svOutcomeMetricDefinitions.version],
		name: "sv_outcome_observations_metric_definition_fk"
	}),
	orgLocationIdx: index("sv_outcome_observations_org_location_idx").on(table.organizationId, table.locationId),
	domainCheck: check("sv_outcome_observations_domain_check", sql`${table.domainId} = 'OUTCOME'`),
	periodCheck: check("sv_outcome_observations_period_check", sql`${table.periodEnd} > ${table.periodStart}`),
	provenanceCheck: check("sv_outcome_observations_provenance_check", sql`cardinality(${table.evidenceIds}) > 0 AND ${table.metricVersion} > 0 AND length(trim(${table.metricKey})) > 0`),
	valueCheck: check("sv_outcome_observations_value_check", sql`${table.value} IS NULL OR ${table.value} <> 'NaN'::numeric`)
})).enableRLS();
var svActionStatusEnum = pgEnum("sv_action_status", [
	"PROPOSED",
	"APPROVED",
	"IN_PROGRESS",
	"IMPLEMENTED",
	"VERIFIED",
	"REJECTED",
	"ABANDONED"
]);
var svChangeVerificationEnum = pgEnum("sv_change_verification", [
	"DECLARED",
	"EVIDENCED",
	"DISPUTED"
]);
var svVerificationStatusEnum = pgEnum("sv_verification_status", [
	"PLANNED",
	"RUNNING",
	"COMPLETED",
	"FAILED"
]);
var svAttributionVerdictEnum = pgEnum("sv_attribution_verdict", [
	"POSITIVE_CORRELATION",
	"NEGATIVE_CORRELATION",
	"NO_OBSERVED_CHANGE",
	"MIXED_RESULT",
	"INSUFFICIENT_EVIDENCE",
	"CONFOUNDED",
	"NOT_MEASURED"
]);
var svAttributionConfidenceEnum = pgEnum("sv_attribution_confidence", [
	"HIGH",
	"MEDIUM",
	"LOW",
	"UNKNOWN"
]);
var svApprovedActions = pgTable("sv_approved_actions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	sourceKind: text("source_kind").notNull(),
	sourceRef: text("source_ref").notNull(),
	findingRef: text("finding_ref"),
	recommendationRef: text("recommendation_ref"),
	status: svActionStatusEnum("status").notNull().default("PROPOSED"),
	title: text("title").notNull(),
	evidenceIds: text("evidence_ids").array().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	idOrganizationUnique: uniqueIndex("sv_approved_actions_id_organization_unique").on(table.id, table.organizationId),
	orgProjectIdx: index("sv_approved_actions_org_project_idx").on(table.organizationId, table.projectId),
	sourceCheck: check("sv_approved_actions_source_check", sql`${table.sourceKind} IN ('CYCLE_RECOMMENDATION', 'ENGINE_ACTION', 'MANUAL') AND length(trim(${table.sourceRef})) > 0`),
	evidenceCheck: check("sv_approved_actions_evidence_check", sql`cardinality(${table.evidenceIds}) > 0 AND length(trim(${table.title})) > 0`)
})).enableRLS();
var svActionApprovals = pgTable("sv_action_approvals", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	actionId: uuid("action_id").notNull(),
	approvalVersion: integer("approval_version").notNull(),
	approvedBy: text("approved_by").notNull(),
	approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	actionVersionUnique: uniqueIndex("sv_action_approvals_action_version_unique").on(table.actionId, table.approvalVersion),
	actionOrganizationReference: foreignKey({
		columns: [table.actionId, table.organizationId],
		foreignColumns: [svApprovedActions.id, svApprovedActions.organizationId],
		name: "sv_action_approvals_action_organization_fk"
	}),
	orgActionIdx: index("sv_action_approvals_org_action_idx").on(table.organizationId, table.actionId),
	approvalCheck: check("sv_action_approvals_approval_check", sql`${table.approvalVersion} > 0 AND length(trim(${table.approvedBy})) > 0`)
})).enableRLS();
var svChangeEvents = pgTable("sv_change_events", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	actionId: uuid("action_id"),
	changeType: text("change_type").notNull(),
	detail: text("detail").notNull(),
	verification: svChangeVerificationEnum("verification").notNull().default("DECLARED"),
	evidenceIds: text("evidence_ids").array().notNull().default([]),
	occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	idOrganizationUnique: uniqueIndex("sv_change_events_id_organization_unique").on(table.id, table.organizationId),
	actionOrganizationReference: foreignKey({
		columns: [table.actionId, table.organizationId],
		foreignColumns: [svApprovedActions.id, svApprovedActions.organizationId],
		name: "sv_change_events_action_organization_fk"
	}),
	orgProjectIdx: index("sv_change_events_org_project_idx").on(table.organizationId, table.projectId),
	contentCheck: check("sv_change_events_content_check", sql`length(trim(${table.changeType})) > 0 AND length(trim(${table.detail})) > 0`),
	evidenceCheck: check("sv_change_events_evidence_check", sql`${table.verification} <> 'EVIDENCED' OR cardinality(${table.evidenceIds}) > 0`)
})).enableRLS();
var svChangeEventAssets = pgTable("sv_change_event_assets", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	changeEventId: uuid("change_event_id").notNull(),
	objectReference: text("object_reference").notNull(),
	contentSha256: text("content_sha256"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	eventOrganizationReference: foreignKey({
		columns: [table.changeEventId, table.organizationId],
		foreignColumns: [svChangeEvents.id, svChangeEvents.organizationId],
		name: "sv_change_event_assets_event_organization_fk"
	}),
	orgEventIdx: index("sv_change_event_assets_org_event_idx").on(table.organizationId, table.changeEventId),
	referenceCheck: check("sv_change_event_assets_reference_check", sql`length(trim(${table.objectReference})) > 0`)
})).enableRLS();
var svVerificationCycles = pgTable("sv_verification_cycles", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	actionId: uuid("action_id").notNull(),
	baselineCycleId: uuid("baseline_cycle_id").notNull().references(() => svMeasurementCycles.id),
	verificationMeasurementCycleId: uuid("verification_measurement_cycle_id").notNull().references(() => svMeasurementCycles.id),
	baselineDatasetId: uuid("baseline_dataset_id").notNull().references(() => svMeasurementDatasets.id),
	verificationDatasetId: uuid("verification_dataset_id").notNull().references(() => svMeasurementDatasets.id),
	attempt: integer("attempt").notNull(),
	settleDays: integer("settle_days").notNull().default(14),
	status: svVerificationStatusEnum("status").notNull().default("PLANNED"),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	actionAttemptUnique: uniqueIndex("sv_verification_cycles_action_attempt_unique").on(table.actionId, table.attempt),
	chainUnique: uniqueIndex("sv_verification_cycles_chain_unique").on(table.id, table.organizationId, table.actionId, table.baselineCycleId, table.verificationMeasurementCycleId, table.baselineDatasetId, table.verificationDatasetId),
	actionOrganizationReference: foreignKey({
		columns: [table.actionId, table.organizationId],
		foreignColumns: [svApprovedActions.id, svApprovedActions.organizationId],
		name: "sv_verification_cycles_action_organization_fk"
	}),
	baselineDatasetCycleReference: foreignKey({
		columns: [
			table.baselineDatasetId,
			table.baselineCycleId,
			table.organizationId
		],
		foreignColumns: [
			svMeasurementDatasets.id,
			svMeasurementDatasets.cycleId,
			svMeasurementDatasets.organizationId
		],
		name: "sv_verification_cycles_baseline_dataset_cycle_fk"
	}),
	verificationDatasetCycleReference: foreignKey({
		columns: [
			table.verificationDatasetId,
			table.verificationMeasurementCycleId,
			table.organizationId
		],
		foreignColumns: [
			svMeasurementDatasets.id,
			svMeasurementDatasets.cycleId,
			svMeasurementDatasets.organizationId
		],
		name: "sv_verification_cycles_verification_dataset_cycle_fk"
	}),
	orgActionIdx: index("sv_verification_cycles_org_action_idx").on(table.organizationId, table.actionId),
	shapeCheck: check("sv_verification_cycles_shape_check", sql`${table.attempt} > 0 AND ${table.settleDays} > 0 AND ${table.baselineCycleId} <> ${table.verificationMeasurementCycleId} AND ${table.baselineDatasetId} <> ${table.verificationDatasetId}`),
	completionCheck: check("sv_verification_cycles_completion_check", sql`(${table.status} = 'COMPLETED' AND ${table.completedAt} IS NOT NULL) OR ${table.status} <> 'COMPLETED'`)
})).enableRLS();
var svOutcomeAttributionWindows = pgTable("sv_outcome_attribution_windows", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	locationId: uuid("location_id").notNull().references(() => svBusinessLocations.id),
	verificationCycleId: uuid("verification_cycle_id").notNull(),
	actionId: uuid("action_id").notNull(),
	baselineCycleId: uuid("baseline_cycle_id").notNull(),
	verificationMeasurementCycleId: uuid("verification_measurement_cycle_id").notNull(),
	baselineDatasetId: uuid("baseline_dataset_id").notNull(),
	verificationDatasetId: uuid("verification_dataset_id").notNull(),
	baselineObservationId: uuid("baseline_observation_id").notNull(),
	verificationObservationId: uuid("verification_observation_id").notNull(),
	metricKey: text("metric_key").notNull(),
	metricVersion: integer("metric_version").notNull(),
	windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
	windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
	evidenceIds: text("evidence_ids").array().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	verificationMetricUnique: uniqueIndex("sv_outcome_attribution_windows_verification_metric_unique").on(table.verificationCycleId, table.metricKey, table.metricVersion),
	assessmentChainUnique: uniqueIndex("sv_outcome_attribution_windows_assessment_chain_unique").on(table.id, table.organizationId, table.verificationCycleId, table.actionId, table.baselineCycleId, table.verificationMeasurementCycleId, table.baselineDatasetId, table.verificationDatasetId, table.metricKey),
	verificationChainReference: foreignKey({
		columns: [
			table.verificationCycleId,
			table.organizationId,
			table.actionId,
			table.baselineCycleId,
			table.verificationMeasurementCycleId,
			table.baselineDatasetId,
			table.verificationDatasetId
		],
		foreignColumns: [
			svVerificationCycles.id,
			svVerificationCycles.organizationId,
			svVerificationCycles.actionId,
			svVerificationCycles.baselineCycleId,
			svVerificationCycles.verificationMeasurementCycleId,
			svVerificationCycles.baselineDatasetId,
			svVerificationCycles.verificationDatasetId
		],
		name: "sv_outcome_attribution_windows_verification_chain_fk"
	}),
	baselineObservationReference: foreignKey({
		columns: [
			table.baselineObservationId,
			table.organizationId,
			table.projectId,
			table.locationId,
			table.metricKey,
			table.metricVersion
		],
		foreignColumns: [
			svOutcomeObservations.id,
			svOutcomeObservations.organizationId,
			svOutcomeObservations.projectId,
			svOutcomeObservations.locationId,
			svOutcomeObservations.metricKey,
			svOutcomeObservations.metricVersion
		],
		name: "sv_outcome_attribution_windows_baseline_observation_fk"
	}),
	verificationObservationReference: foreignKey({
		columns: [
			table.verificationObservationId,
			table.organizationId,
			table.projectId,
			table.locationId,
			table.metricKey,
			table.metricVersion
		],
		foreignColumns: [
			svOutcomeObservations.id,
			svOutcomeObservations.organizationId,
			svOutcomeObservations.projectId,
			svOutcomeObservations.locationId,
			svOutcomeObservations.metricKey,
			svOutcomeObservations.metricVersion
		],
		name: "sv_outcome_attribution_windows_verification_observation_fk"
	}),
	orgLocationIdx: index("sv_outcome_attribution_windows_org_location_idx").on(table.organizationId, table.locationId),
	windowCheck: check("sv_outcome_attribution_windows_window_check", sql`${table.windowEnd} > ${table.windowStart} AND ${table.baselineObservationId} <> ${table.verificationObservationId} AND cardinality(${table.evidenceIds}) > 0`)
})).enableRLS();
var svAttributionAssessments = pgTable("sv_attribution_assessments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	verificationCycleId: uuid("verification_cycle_id").notNull(),
	actionId: uuid("action_id").notNull(),
	findingRef: text("finding_ref").notNull(),
	recommendationRef: text("recommendation_ref").notNull(),
	changeEventIds: uuid("change_event_ids").array().notNull(),
	baselineCycleId: uuid("baseline_cycle_id").notNull(),
	verificationMeasurementCycleId: uuid("verification_measurement_cycle_id").notNull(),
	baselineDatasetId: uuid("baseline_dataset_id").notNull(),
	verificationDatasetId: uuid("verification_dataset_id").notNull(),
	outcomeWindowId: uuid("outcome_window_id"),
	metricKey: text("metric_key").notNull(),
	formulaVersion: text("formula_version").notNull(),
	verdict: svAttributionVerdictEnum("verdict").notNull(),
	confidence: svAttributionConfidenceEnum("confidence").notNull(),
	reasonCodes: text("reason_codes").array().notNull(),
	evidenceIds: text("evidence_ids").array().notNull(),
	delta: numeric("delta", {
		precision: 18,
		scale: 6
	}),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	verificationMetricFormulaUnique: uniqueIndex("sv_attribution_assessments_verification_metric_unique").on(table.verificationCycleId, table.metricKey, table.formulaVersion),
	verificationChainReference: foreignKey({
		columns: [
			table.verificationCycleId,
			table.organizationId,
			table.actionId,
			table.baselineCycleId,
			table.verificationMeasurementCycleId,
			table.baselineDatasetId,
			table.verificationDatasetId
		],
		foreignColumns: [
			svVerificationCycles.id,
			svVerificationCycles.organizationId,
			svVerificationCycles.actionId,
			svVerificationCycles.baselineCycleId,
			svVerificationCycles.verificationMeasurementCycleId,
			svVerificationCycles.baselineDatasetId,
			svVerificationCycles.verificationDatasetId
		],
		name: "sv_attribution_assessments_verification_chain_fk"
	}),
	outcomeWindowReference: foreignKey({
		columns: [
			table.outcomeWindowId,
			table.organizationId,
			table.verificationCycleId,
			table.actionId,
			table.baselineCycleId,
			table.verificationMeasurementCycleId,
			table.baselineDatasetId,
			table.verificationDatasetId,
			table.metricKey
		],
		foreignColumns: [
			svOutcomeAttributionWindows.id,
			svOutcomeAttributionWindows.organizationId,
			svOutcomeAttributionWindows.verificationCycleId,
			svOutcomeAttributionWindows.actionId,
			svOutcomeAttributionWindows.baselineCycleId,
			svOutcomeAttributionWindows.verificationMeasurementCycleId,
			svOutcomeAttributionWindows.baselineDatasetId,
			svOutcomeAttributionWindows.verificationDatasetId,
			svOutcomeAttributionWindows.metricKey
		],
		name: "sv_attribution_assessments_outcome_window_fk"
	}),
	orgVerificationIdx: index("sv_attribution_assessments_org_verification_idx").on(table.organizationId, table.verificationCycleId),
	provenanceCheck: check("sv_attribution_assessments_provenance_check", sql`cardinality(${table.evidenceIds}) > 0 AND cardinality(${table.changeEventIds}) > 0 AND cardinality(${table.reasonCodes}) > 0 AND length(trim(${table.findingRef})) > 0 AND length(trim(${table.recommendationRef})) > 0 AND length(trim(${table.metricKey})) > 0 AND length(trim(${table.formulaVersion})) > 0`),
	confidenceCheck: check("sv_attribution_assessments_confidence_check", sql`((${table.verdict} IN ('POSITIVE_CORRELATION', 'NEGATIVE_CORRELATION', 'NO_OBSERVED_CHANGE', 'MIXED_RESULT')) AND ${table.confidence} IN ('HIGH', 'MEDIUM', 'LOW')) OR ((${table.verdict} IN ('INSUFFICIENT_EVIDENCE', 'CONFOUNDED', 'NOT_MEASURED')) AND ${table.confidence} = 'UNKNOWN')`)
})).enableRLS();
var svLocalDispatchOutbox = pgTable("sv_local_dispatch_outbox", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	localCycleId: uuid("local_cycle_id").notNull(),
	measurementCycleId: uuid("measurement_cycle_id").notNull(),
	observationId: uuid("observation_id").notNull(),
	attemptId: uuid("attempt_id").notNull().unique(),
	status: text("status").notNull().default("PENDING"),
	claimToken: uuid("claim_token"),
	leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
	enqueuedAt: timestamp("enqueued_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	cycleReference: foreignKey({
		columns: [
			table.organizationId,
			table.localCycleId,
			table.measurementCycleId
		],
		foreignColumns: [
			svLocalScanCycles.organizationId,
			svLocalScanCycles.id,
			svLocalScanCycles.measurementCycleId
		]
	}),
	observationReference: foreignKey({
		columns: [table.organizationId, table.observationId],
		foreignColumns: [svLocalRankObservations.organizationId, svLocalRankObservations.id]
	}),
	attemptReference: foreignKey({
		columns: [table.organizationId, table.attemptId],
		foreignColumns: [svMeasurementAttempts.organizationId, svMeasurementAttempts.id]
	}),
	pendingIdx: index("sv_local_dispatch_pending_idx").on(table.organizationId, table.status, table.createdAt),
	statusCheck: check("sv_local_dispatch_outbox_status_check", sql`${table.status} IN ('PENDING','CLAIMED','ENQUEUED','CANCELLED')`)
})).enableRLS();
var svLocalReportVersions = pgTable("sv_local_report_versions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	localCycleId: uuid("local_cycle_id").notNull(),
	version: integer("version").notNull(),
	contentJson: jsonb("content_json").notNull(),
	contentCanonical: text("content_canonical").notNull(),
	contentSha256: text("content_sha256").notNull(),
	status: text("status").notNull().default("DRAFT"),
	actor: text("actor").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true }),
	revokedAt: timestamp("revoked_at", { withTimezone: true })
}, (table) => ({
	cycleReference: foreignKey({
		columns: [table.organizationId, table.localCycleId],
		foreignColumns: [svLocalScanCycles.organizationId, svLocalScanCycles.id]
	}),
	versionUnique: unique().on(table.organizationId, table.localCycleId, table.version),
	cycleIdentityUnique: unique().on(table.organizationId, table.localCycleId, table.id),
	organizationIdentityUnique: unique().on(table.organizationId, table.id),
	onePublished: uniqueIndex("sv_local_report_one_published").on(table.organizationId, table.localCycleId).where(sql`${table.status} = 'PUBLISHED'`),
	versionCheck: check("sv_local_report_versions_version_check", sql`${table.version}>0`)
})).enableRLS();
var svLocalQcDecisions = pgTable("sv_local_qc_decisions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	localCycleId: uuid("local_cycle_id").notNull(),
	reportVersionId: uuid("report_version_id").notNull(),
	decision: text("decision").notNull(),
	actor: text("actor").notNull(),
	note: text("note").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	reportReference: foreignKey({
		columns: [
			table.organizationId,
			table.localCycleId,
			table.reportVersionId
		],
		foreignColumns: [
			svLocalReportVersions.organizationId,
			svLocalReportVersions.localCycleId,
			svLocalReportVersions.id
		]
	}),
	decisionCheck: check("sv_local_qc_decisions_decision_check", sql`${table.decision} IN ('ACCEPT_PARTIAL','APPROVED','REJECTED')`)
})).enableRLS();
var svLocalReportDeliveries = pgTable("sv_local_report_deliveries", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	reportVersionId: uuid("report_version_id").notNull(),
	recipientIdentity: text("recipient_identity").notNull(),
	channel: text("channel").notNull(),
	actor: text("actor").notNull(),
	status: text("status").notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
	acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true })
}, (table) => ({
	reportReference: foreignKey({
		columns: [table.organizationId, table.reportVersionId],
		foreignColumns: [svLocalReportVersions.organizationId, svLocalReportVersions.id]
	}),
	channelCheck: check("sv_local_report_deliveries_channel_check", sql`${table.channel} = 'MANUAL_SECURE_LINK'`),
	statusCheck: check("sv_local_report_deliveries_status_check", sql`${table.status} IN ('SENT','ACKNOWLEDGED','FAILED')`)
})).enableRLS();
var svLocalCanaryReviews = pgTable("sv_local_canary_reviews", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	localCycleId: uuid("local_cycle_id").notNull(),
	attemptId: uuid("attempt_id").notNull(),
	evidenceId: uuid("evidence_id").notNull(),
	actualCostUsd: numeric("actual_cost_usd", {
		precision: 12,
		scale: 6
	}).notNull(),
	providerContractDigest: text("provider_contract_digest").notNull(),
	status: text("status").notNull(),
	actor: text("actor").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	organizationIdentityUnique: unique().on(table.organizationId, table.id),
	cycleReference: foreignKey({
		columns: [table.organizationId, table.localCycleId],
		foreignColumns: [svLocalScanCycles.organizationId, svLocalScanCycles.id]
	}),
	attemptReference: foreignKey({
		columns: [table.organizationId, table.attemptId],
		foreignColumns: [svMeasurementAttempts.organizationId, svMeasurementAttempts.id]
	}),
	evidenceReference: foreignKey({
		columns: [table.evidenceId, table.organizationId],
		foreignColumns: [svSourceSnapshots.id, svSourceSnapshots.organizationId]
	}),
	acceptedAttemptUnique: uniqueIndex("sv_local_canary_reviews_accepted_attempt_unique").on(table.organizationId, table.localCycleId, table.attemptId).where(sql`${table.status} = 'ACCEPTED'`),
	statusCheck: check("sv_local_canary_reviews_status_check", sql`${table.status} IN ('PENDING','ACCEPTED','REJECTED')`)
})).enableRLS();
/** Tenant-scoped raw payload custody; body is nulled after retention while provenance remains. */
var svLocalRawEvidence = pgTable("sv_local_raw_evidence", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	sourceSnapshotId: uuid("source_snapshot_id").notNull(),
	rawResponseBody: text("raw_response_body"),
	rawResponseSha256: text("raw_response_sha256").notNull(),
	providerTaskId: text("provider_task_id"),
	retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }).notNull(),
	rawDeletedAt: timestamp("raw_deleted_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	sourceReference: foreignKey({
		columns: [table.sourceSnapshotId, table.organizationId],
		foreignColumns: [svSourceSnapshots.id, svSourceSnapshots.organizationId]
	}),
	identityUnique: unique().on(table.organizationId, table.sourceSnapshotId),
	stateCheck: check("sv_local_raw_evidence_state_check", sql`(${table.rawDeletedAt} IS NULL AND ${table.rawResponseBody} IS NOT NULL) OR (${table.rawDeletedAt} IS NOT NULL AND ${table.rawResponseBody} IS NULL)`)
})).enableRLS();
/** Local contract acceptance is distinct from Bright Data formal acceptance and human report QC. */
var svLocalEvidenceAcceptances = pgTable("sv_local_evidence_acceptances", {
	organizationId: text("organization_id").notNull().references(() => organization.id),
	observationId: uuid("observation_id").primaryKey().references(() => svLocalRankObservations.id),
	evidenceId: uuid("evidence_id").notNull(),
	evidenceSha256: text("evidence_sha256").notNull(),
	contractVersion: text("contract_version").notNull().default("LOCAL_MAPS_V1"),
	acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
	evidenceReference: foreignKey({
		columns: [table.evidenceId, table.organizationId],
		foreignColumns: [svEvidenceIndex.id, svEvidenceIndex.organizationId]
	}),
	contractCheck: check("sv_local_evidence_acceptances_contract_version_check", sql`${table.contractVersion} = 'LOCAL_MAPS_V1'`)
})).enableRLS();
var svLocalRawRetentionHealth = pgTable("sv_local_raw_retention_health", {
	organizationId: text("organization_id").primaryKey().references(() => organization.id),
	checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
	deletedCount: integer("deleted_count").notNull(),
	overdueCount: integer("overdue_count").notNull()
}, (table) => ({
	deletedCountCheck: check("sv_local_raw_retention_health_deleted_count_check", sql`${table.deletedCount} >= 0`),
	overdueCountCheck: check("sv_local_raw_retention_health_overdue_count_check", sql`${table.overdueCount} >= 0`)
})).enableRLS();
var schema_exports = /* @__PURE__ */ __exportAll({
	SYSTEM_TAGS: () => SYSTEM_TAGS,
	account: () => account,
	accountRelations: () => accountRelations,
	brandOpportunities: () => brandOpportunities,
	brands: () => brands,
	citations: () => citations,
	competitors: () => competitors,
	invitation: () => invitation,
	invitationRelations: () => invitationRelations,
	member: () => member,
	memberRelations: () => memberRelations,
	organization: () => organization,
	organizationRelations: () => organizationRelations,
	organizationSettings: () => organizationSettings,
	promptRunHourlyAggregates: () => promptRunHourlyAggregates,
	promptRuns: () => promptRuns,
	prompts: () => prompts,
	reportStatusEnum: () => reportStatusEnum,
	reports: () => reports,
	secrets: () => secrets,
	session: () => session,
	sessionRelations: () => sessionRelations,
	ssoProvider: () => ssoProvider,
	ssoProviderRelations: () => ssoProviderRelations,
	subscription: () => subscription,
	svActionApprovals: () => svActionApprovals,
	svActionStatusEnum: () => svActionStatusEnum,
	svApiIdempotencyRecords: () => svApiIdempotencyRecords,
	svApiKeys: () => svApiKeys,
	svApprovedActions: () => svApprovedActions,
	svAttributionAssessments: () => svAttributionAssessments,
	svAttributionConfidenceEnum: () => svAttributionConfidenceEnum,
	svAttributionVerdictEnum: () => svAttributionVerdictEnum,
	svAuditEvents: () => svAuditEvents,
	svBusinessLocations: () => svBusinessLocations,
	svCaptureTaskStatusEnum: () => svCaptureTaskStatusEnum,
	svCaptureTasks: () => svCaptureTasks,
	svChangeEventAssets: () => svChangeEventAssets,
	svChangeEvents: () => svChangeEvents,
	svChangeVerificationEnum: () => svChangeVerificationEnum,
	svCitationGapSnapshots: () => svCitationGapSnapshots,
	svConfigurationLocks: () => svConfigurationLocks,
	svCostEvents: () => svCostEvents,
	svCycleStatusEnum: () => svCycleStatusEnum,
	svCycles: () => svCycles,
	svEntities: () => svEntities,
	svEntityConfirmationEnum: () => svEntityConfirmationEnum,
	svEntityKindEnum: () => svEntityKindEnum,
	svEvidenceAcceptanceReceipts: () => svEvidenceAcceptanceReceipts,
	svEvidenceIndex: () => svEvidenceIndex,
	svEvidenceProvenance: () => svEvidenceProvenance,
	svEvidenceReadModel: () => svEvidenceReadModel,
	svFindingStatusEnum: () => svFindingStatusEnum,
	svFindings: () => svFindings,
	svFreeAutoDispatchClaims: () => svFreeAutoDispatchClaims,
	svGeoPrecisionEnum: () => svGeoPrecisionEnum,
	svGridDefinitions: () => svGridDefinitions,
	svGridPoints: () => svGridPoints,
	svIncidents: () => svIncidents,
	svJournalDailyClaims: () => svJournalDailyClaims,
	svJournalProviderBoundaries: () => svJournalProviderBoundaries,
	svLocalCanaryReviews: () => svLocalCanaryReviews,
	svLocalCompetitorObservations: () => svLocalCompetitorObservations,
	svLocalDispatchOutbox: () => svLocalDispatchOutbox,
	svLocalEvidenceAcceptances: () => svLocalEvidenceAcceptances,
	svLocalKeywords: () => svLocalKeywords,
	svLocalObservations: () => svLocalObservations,
	svLocalQcDecisions: () => svLocalQcDecisions,
	svLocalRankObservations: () => svLocalRankObservations,
	svLocalRankValidityEnum: () => svLocalRankValidityEnum,
	svLocalRawEvidence: () => svLocalRawEvidence,
	svLocalRawRetentionHealth: () => svLocalRawRetentionHealth,
	svLocalReportDeliveries: () => svLocalReportDeliveries,
	svLocalReportVersions: () => svLocalReportVersions,
	svLocalScanCycles: () => svLocalScanCycles,
	svLocalVisibilityMetrics: () => svLocalVisibilityMetrics,
	svLocationConfirmationEnum: () => svLocationConfirmationEnum,
	svLocationRoleEnum: () => svLocationRoleEnum,
	svMatchStatusEnum: () => svMatchStatusEnum,
	svMeasurementAttemptResults: () => svMeasurementAttemptResults,
	svMeasurementAttempts: () => svMeasurementAttempts,
	svMeasurementCycles: () => svMeasurementCycles,
	svMeasurementDatasets: () => svMeasurementDatasets,
	svMeasurementDomains: () => svMeasurementDomains,
	svMentionRoleEnum: () => svMentionRoleEnum,
	svObservationEvidenceAssets: () => svObservationEvidenceAssets,
	svObservationMentions: () => svObservationMentions,
	svOrderRequests: () => svOrderRequests,
	svOrderStatusEnum: () => svOrderStatusEnum,
	svOrderingStateEnum: () => svOrderingStateEnum,
	svOrders: () => svOrders,
	svOutcomeAttributionWindows: () => svOutcomeAttributionWindows,
	svOutcomeMetricDefinitions: () => svOutcomeMetricDefinitions,
	svOutcomeObservations: () => svOutcomeObservations,
	svOutcomeSources: () => svOutcomeSources,
	svParentRelationEnum: () => svParentRelationEnum,
	svPaymentStatusEnum: () => svPaymentStatusEnum,
	svPayments: () => svPayments,
	svPilotCycles: () => svPilotCycles,
	svPilotInvites: () => svPilotInvites,
	svProjectProfiles: () => svProjectProfiles,
	svProjectStatusEnum: () => svProjectStatusEnum,
	svProjects: () => svProjects,
	svPromptFamilies: () => svPromptFamilies,
	svProviderCanaryExecutions: () => svProviderCanaryExecutions,
	svProviderDatasetCapabilities: () => svProviderDatasetCapabilities,
	svProviderDatasetSnapshotEvents: () => svProviderDatasetSnapshotEvents,
	svPublicScans: () => svPublicScans,
	svQcRecords: () => svQcRecords,
	svQuoteStatusEnum: () => svQuoteStatusEnum,
	svQuotes: () => svQuotes,
	svRecommendationActions: () => svRecommendationActions,
	svRecommendationEvidence: () => svRecommendationEvidence,
	svRecommendationFindings: () => svRecommendationFindings,
	svRecommendationManifests: () => svRecommendationManifests,
	svRecommendationRunStatusEnum: () => svRecommendationRunStatusEnum,
	svRecommendationRuns: () => svRecommendationRuns,
	svRecommendationTasks: () => svRecommendationTasks,
	svRecommendations: () => svRecommendations,
	svReferenceOriginEnum: () => svReferenceOriginEnum,
	svReputationSources: () => svReputationSources,
	svResponseMentions: () => svResponseMentions,
	svReviewSnapshots: () => svReviewSnapshots,
	svReviewTopicObservations: () => svReviewTopicObservations,
	svReviewVelocityMetrics: () => svReviewVelocityMetrics,
	svRunPermits: () => svRunPermits,
	svRuns: () => svRuns,
	svScanStatusEnum: () => svScanStatusEnum,
	svScenarioStatusEnum: () => svScenarioStatusEnum,
	svScenarios: () => svScenarios,
	svSearchQueries: () => svSearchQueries,
	svSearchRankObservations: () => svSearchRankObservations,
	svSimulationBootstrapNonces: () => svSimulationBootstrapNonces,
	svSimulationConnectTokens: () => svSimulationConnectTokens,
	svSimulationDeliveries: () => svSimulationDeliveries,
	svSimulationDeliveryAttempts: () => svSimulationDeliveryAttempts,
	svSimulationRecipients: () => svSimulationRecipients,
	svSimulationReports: () => svSimulationReports,
	svSimulationSubscriptions: () => svSimulationSubscriptions,
	svSourceSnapshots: () => svSourceSnapshots,
	svVerificationCycles: () => svVerificationCycles,
	svVerificationStatusEnum: () => svVerificationStatusEnum,
	svVisibilityMapDatasets: () => svVisibilityMapDatasets,
	svVisibilityMapPoints: () => svVisibilityMapPoints,
	svWebsiteSnapshots: () => svWebsiteSnapshots,
	usageEvents: () => usageEvents,
	user: () => user,
	userRelations: () => userRelations,
	verification: () => verification
});
var reportStatusEnum = pgEnum("report_status", [
	"pending",
	"processing",
	"completed",
	"failed"
]);
var brands = pgTable("brands", {
	id: text("id").primaryKey().notNull(),
	name: text("name").notNull(),
	website: text("website").notNull(),
	additionalDomains: text("additional_domains").array().notNull().default([]),
	aliases: text("aliases").array().notNull().default([]),
	enabled: boolean("enabled").default(true).notNull(),
	onboarded: boolean("onboarded").default(false).notNull(),
	delayOverrideHours: integer("delay_override_hours"),
	enabledModels: text("enabled_models").array(),
	organizationId: text("organization_id").references(() => organization.id).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({ organizationIdIdx: index("brands_organization_id_idx").on(table.organizationId) })).enableRLS();
var prompts = pgTable("prompts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	brandId: text("brand_id").references(() => brands.id).notNull(),
	value: text("value").notNull(),
	enabled: boolean("enabled").default(true).notNull(),
	/**
	* Premium models this prompt is tracked on, grounded: one org premium slot
	* per entry (see PREMIUM_MODELS). Empty = standard tracking only.
	*/
	premiumModels: text("premium_models").array().notNull().default([]),
	tags: text("tags").array().notNull().default([]),
	systemTags: text("system_tags").array().notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
	brandIdIdx: index("prompts_brand_id_idx").on(table.brandId),
	brandIdEnabledIdx: index("prompts_brand_id_enabled_idx").on(table.brandId, table.enabled)
})).enableRLS();
var competitors = pgTable("competitors", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	brandId: text("brand_id").references(() => brands.id).notNull(),
	name: text("name").notNull(),
	domains: text("domains").array().notNull().default([]),
	aliases: text("aliases").array().notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}).enableRLS();
var promptRuns = pgTable("prompt_runs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	promptId: uuid("prompt_id").references(() => prompts.id).notNull(),
	brandId: text("brand_id").references(() => brands.id).notNull(),
	model: text("model").notNull(),
	provider: text("provider"),
	version: text("version").notNull(),
	webSearchEnabled: boolean("web_search_enabled").notNull(),
	rawOutput: json("raw_output").notNull(),
	webQueries: text("web_queries").array().notNull().default([]),
	brandMentioned: boolean("brand_mentioned").notNull(),
	competitorsMentioned: text("competitors_mentioned").array().notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	promptIdCreatedAtIdx: index("prompt_runs_prompt_id_created_at_idx").on(table.promptId, table.createdAt),
	createdAtIdx: index("prompt_runs_created_at_idx").on(table.createdAt),
	webSearchCreatedAtIdx: index("prompt_runs_web_search_created_at_idx").on(table.webSearchEnabled, table.createdAt),
	webSearchModelCreatedAtIdx: index("prompt_runs_web_search_model_created_at_idx").on(table.webSearchEnabled, table.model, table.createdAt),
	providerIdx: index("prompt_runs_provider_idx").on(table.provider),
	modelCreatedAtIdx: index("prompt_runs_model_created_at_idx").on(table.model, table.createdAt)
})).enableRLS();
/**
* Derived hourly rollup of prompt_runs for dashboard reads. prompt_runs stays
* the source of truth: rows here are written in the same transaction as the
* run insert, rebuilt by the 0031 migration backfill, and re-checked by the
* worker's trailing-window reconciler. Hour buckets (not days) so any
* whole-hour timezone can assemble its own local days at read time.
*/
var promptRunHourlyAggregates = pgTable("prompt_run_hourly_aggregates", {
	promptId: uuid("prompt_id").references(() => prompts.id, { onDelete: "cascade" }).notNull(),
	brandId: text("brand_id").references(() => brands.id, { onDelete: "cascade" }).notNull(),
	model: text("model").notNull(),
	provider: text("provider"),
	webSearchEnabled: boolean("web_search_enabled").notNull(),
	hourBucket: timestamp("hour_bucket", { withTimezone: true }).notNull(),
	totalRuns: integer("total_runs").notNull(),
	brandMentionedCount: integer("brand_mentioned_count").notNull()
}, (table) => ({
	bucketUnique: unique("prompt_run_hourly_aggregates_bucket_unique").on(table.promptId, table.model, table.provider, table.webSearchEnabled, table.hourBucket).nullsNotDistinct(),
	brandHourIdx: index("prompt_run_hourly_aggregates_brand_hour_idx").on(table.brandId, table.hourBucket)
})).enableRLS();
var citations = pgTable("citations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	promptRunId: uuid("prompt_run_id").references(() => promptRuns.id).notNull(),
	promptId: uuid("prompt_id").references(() => prompts.id).notNull(),
	brandId: text("brand_id").references(() => brands.id).notNull(),
	model: text("model").notNull(),
	url: text("url").notNull(),
	domain: text("domain").notNull(),
	title: text("title"),
	citationIndex: smallint("citation_index").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull()
}, (table) => ({
	brandAnalyticsIdx: index("idx_citations_brand_analytics").on(table.brandId, table.createdAt, table.url, table.domain, table.title, table.promptId, table.model),
	promptCreatedIdx: index("citations_prompt_id_created_at_idx").on(table.promptId, table.createdAt),
	domainIdx: index("citations_domain_idx").on(table.domain)
})).enableRLS();
var reports = pgTable("reports", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	brandName: text("brand_name").notNull(),
	brandWebsite: text("brand_website").notNull(),
	organizationId: text("organization_id").references(() => organization.id),
	status: reportStatusEnum().notNull().default("pending"),
	progress: integer("progress").notNull().default(0),
	rawOutput: json("raw_output"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
	createdAtIdx: index("reports_created_at_idx").on(table.createdAt),
	organizationIdx: index("reports_organization_idx").on(table.organizationId)
})).enableRLS();
var brandOpportunities = pgTable("brand_opportunities", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	brandId: text("brand_id").references(() => brands.id).notNull(),
	/** The full enriched opportunities report the page renders (OpportunitiesReport JSON). */
	report: json("report").notNull(),
	/** Model/provider that generated it, when known. */
	model: text("model"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ brandCreatedIdx: index("brand_opportunities_brand_id_created_at_idx").on(table.brandId, table.createdAt) })).enableRLS();
var SYSTEM_TAGS = {
	BRANDED: "branded",
	UNBRANDED: "unbranded"
};
/**
* Cloud billing/entitlement state we own per organization (as opposed to the
* better-auth-managed `subscription` table). One optional row per org:
* - entitlementOverrides: sparse custom-plan overrides (see
*   entitlementOverridesSchema in @workspace/config/entitlements) — the
*   config-only lever for custom plans
* - premiumAddonQuantity: purchased extra premium slots, synced from Stripe
*   subscription items by the billing webhook
* Absent row = no overrides, no add-on. Unused outside cloud.
*/
var organizationSettings = pgTable("organization_settings", {
	organizationId: text("organization_id").primaryKey().notNull().references(() => organization.id),
	entitlementOverrides: jsonb("entitlement_overrides"),
	premiumAddonQuantity: integer("premium_addon_quantity").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}).enableRLS();
/**
* Billing-grade usage attribution: one row per provider call the
* worker makes, so every run is attributable to an org with an estimated
* cost. Written in every mode (self-hosted operators get the same spend
* visibility); estimated costs come from the tunable table in
* src/usage/cost.ts and are validated against provider invoices, not treated
* as ground truth.
*/
var usageEvents = pgTable("usage_events", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull(),
	brandId: text("brand_id").notNull(),
	promptId: uuid("prompt_id"),
	eventType: text("event_type").notNull(),
	provider: text("provider"),
	model: text("model"),
	webSearchEnabled: boolean("web_search_enabled").notNull().default(false),
	units: integer("units").notNull().default(1),
	estimatedCostUsd: numeric("estimated_cost_usd", {
		precision: 12,
		scale: 6
	}),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ orgCreatedIdx: index("usage_events_org_created_idx").on(table.organizationId, table.createdAt) })).enableRLS();
var svProjectStatusEnum = pgEnum("sv_project_status", [
	"DRAFT",
	"ACTIVE",
	"ARCHIVED"
]);
var svScenarioStatusEnum = pgEnum("sv_scenario_status", [
	"PROPOSED",
	"APPROVED",
	"REJECTED"
]);
var svQuoteStatusEnum = pgEnum("sv_quote_status", [
	"DRAFT",
	"ISSUED",
	"EXPIRED",
	"ACCEPTED",
	"CANCELLED"
]);
var svOrderStatusEnum = pgEnum("sv_order_status", [
	"DRAFT",
	"CONFIGURING",
	"QUOTED",
	"AWAITING_PAYMENT",
	"PAID_REVIEW_REQUIRED",
	"APPROVED",
	"QUEUED",
	"RUNNING",
	"ANALYZING",
	"QC_REQUIRED",
	"READY",
	"DELIVERED",
	"PAYMENT_FAILED",
	"PREFLIGHT_BLOCKED",
	"BUDGET_BLOCKED",
	"PROVIDER_BLOCKED",
	"CARDINALITY_INCIDENT",
	"PARTIAL_FAILURE",
	"CANCELLED",
	"REFUND_REVIEW"
]);
var svCycleStatusEnum = pgEnum("sv_cycle_status", [
	"CREATED",
	"APPROVED",
	"QUEUED",
	"RUNNING",
	"ANALYZING",
	"QC_REQUIRED",
	"READY",
	"STOPPED",
	"FAILED",
	"CARDINALITY_INCIDENT"
]);
var svScanStatusEnum = pgEnum("sv_scan_status", [
	"PENDING",
	"COMPLETED",
	"FAILED"
]);
var svFindingStatusEnum = pgEnum("sv_finding_status", [
	"OPEN",
	"ACCEPTED",
	"DISMISSED"
]);
var svPaymentStatusEnum = pgEnum("sv_payment_status", [
	"PENDING",
	"SUCCEEDED",
	"FAILED",
	"CANCELLED"
]);
var svApiKeys = pgTable("sv_api_keys", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	name: text("name").notNull(),
	keyHash: text("key_hash").notNull().unique(),
	permissions: text("permissions").array().notNull().default([]),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	orgIdx: index("sv_api_keys_org_idx").on(table.organizationId),
	activeIdx: index("sv_api_keys_active_idx").on(table.organizationId, table.revokedAt)
})).enableRLS();
/** Immutable response cache for mutating Local API requests. Rows are retained
* for seven days so retries can replay the exact response without repeating a
* write; expired rows may be purged by a bounded cleanup job. */
var svApiIdempotencyRecords = pgTable("sv_api_idempotency_records", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	operation: text("operation").notNull(),
	resourceId: text("resource_id").notNull(),
	idempotencyKey: text("idempotency_key").notNull(),
	bodyHash: text("body_hash").notNull(),
	responseStatus: smallint("response_status").notNull(),
	responseBody: jsonb("response_body").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
}, (table) => ({
	identityUnique: uniqueIndex("sv_api_idempotency_identity_unique").on(table.organizationId, table.operation, table.resourceId, table.idempotencyKey),
	expiresIdx: index("sv_api_idempotency_expires_idx").on(table.organizationId, table.expiresAt),
	operationCheck: check("sv_api_idempotency_operation_check", sql`${table.operation} ~ '^[a-z][a-z0-9-]{1,63}$'`),
	bodyHashCheck: check("sv_api_idempotency_body_hash_check", sql`${table.bodyHash} ~ '^sha256:[a-f0-9]{64}$'`),
	keyLengthCheck: check("sv_api_idempotency_key_length_check", sql`length(${table.idempotencyKey}) BETWEEN 8 AND 128 AND ${table.idempotencyKey} = btrim(${table.idempotencyKey})`),
	responseStatusCheck: check("sv_api_idempotency_response_status_check", sql`${table.responseStatus} BETWEEN 200 AND 299`),
	expiryCheck: check("sv_api_idempotency_expiry_check", sql`${table.expiresAt} > ${table.createdAt} AND ${table.expiresAt} <= ${table.createdAt} + interval '7 days'`)
})).enableRLS();
var svProjects = pgTable("sv_projects", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	name: text("name").notNull(),
	category: text("category").notNull(),
	country: text("country").notNull(),
	region: text("region"),
	languages: text("languages").array().notNull().default([]),
	status: svProjectStatusEnum().notNull().default("DRAFT"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	orgIdx: index("sv_projects_org_idx").on(table.organizationId),
	orgNameUnique: uniqueIndex("sv_projects_org_name_unique").on(table.organizationId, table.name),
	idOrganizationUnique: uniqueIndex("sv_projects_id_organization_unique").on(table.id, table.organizationId)
})).enableRLS();
var svPromptFamilies = pgTable("sv_prompt_families", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	intentType: text("intent_type").notNull(),
	source: text("source").notNull(),
	status: svScenarioStatusEnum().notNull().default("PROPOSED"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ projectIdx: index("sv_prompt_families_project_idx").on(table.projectId) })).enableRLS();
var svScenarios = pgTable("sv_scenarios", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	familyId: uuid("family_id").notNull().references(() => svPromptFamilies.id),
	text: text("text").notNull(),
	language: text("language").notNull(),
	status: svScenarioStatusEnum().notNull().default("PROPOSED"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	familyIdx: index("sv_scenarios_family_idx").on(table.familyId),
	orgIdx: index("sv_scenarios_org_idx").on(table.organizationId)
})).enableRLS();
var svConfigurationLocks = pgTable("sv_configuration_locks", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	version: integer("version").notNull(),
	legacyCollisionOrdinal: integer("legacy_collision_ordinal").notNull().default(0),
	snapshot: jsonb("snapshot").notNull(),
	engineSha: text("engine_sha").notNull(),
	expectedRuns: integer("expected_runs").notNull(),
	budgetCap: numeric("budget_cap", {
		precision: 12,
		scale: 6
	}).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	projectVersionUnique: uniqueIndex("sv_locks_project_version_unique").on(table.projectId, table.version, table.legacyCollisionOrdinal),
	idOrganizationUnique: uniqueIndex("sv_configuration_locks_id_organization_unique").on(table.id, table.organizationId),
	idProjectOrganizationUnique: uniqueIndex("sv_configuration_locks_id_project_org_unique").on(table.id, table.projectId, table.organizationId),
	projectOrganizationReference: foreignKey({
		columns: [table.projectId, table.organizationId],
		foreignColumns: [svProjects.id, svProjects.organizationId],
		name: "sv_configuration_locks_project_organization_fk"
	}),
	versionCheck: check("sv_configuration_locks_version_check", sql`${table.version} > 0`),
	legacyCollisionOrdinalCheck: check("sv_configuration_locks_legacy_collision_ordinal_check", sql`${table.legacyCollisionOrdinal} >= 0`)
})).enableRLS();
/** Durable fail-closed spend serialization for the manually-invoked owner journal. */
var svJournalDailyClaims = pgTable("sv_journal_daily_claims", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull(),
	configurationLockId: uuid("configuration_lock_id"),
	questionSetVersion: text("question_set_version").notNull(),
	utcDay: date("utc_day", { mode: "string" }).notNull(),
	attempt: integer("attempt").notNull(),
	status: text("status").notNull().default("CLAIMED"),
	claimedAt: timestamp("claimed_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true }),
	abandonedAt: timestamp("abandoned_at", { withTimezone: true }),
	reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
	reconciliationReason: text("reconciliation_reason"),
	reconciledBy: text("reconciled_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull()
}, (table) => ({
	identityUnique: uniqueIndex("sv_journal_daily_claims_identity_unique").on(table.organizationId, table.projectId, table.questionSetVersion, table.utcDay, table.attempt),
	unresolvedUnique: uniqueIndex("sv_journal_daily_claims_unresolved_unique").on(table.organizationId, table.projectId).where(sql`${table.status} IN ('CLAIMED', 'EXECUTING', 'HOLD')`),
	lockUnique: uniqueIndex("sv_journal_daily_claims_lock_unique").on(table.configurationLockId).where(sql`${table.configurationLockId} IS NOT NULL`),
	projectOrganizationReference: foreignKey({
		columns: [table.projectId, table.organizationId],
		foreignColumns: [svProjects.id, svProjects.organizationId],
		name: "sv_journal_daily_claims_project_organization_fk"
	}),
	lockProjectOrganizationReference: foreignKey({
		columns: [
			table.configurationLockId,
			table.projectId,
			table.organizationId
		],
		foreignColumns: [
			svConfigurationLocks.id,
			svConfigurationLocks.projectId,
			svConfigurationLocks.organizationId
		],
		name: "sv_journal_daily_claims_lock_project_org_fk"
	}),
	attemptCheck: check("sv_journal_daily_claims_attempt_check", sql`${table.attempt} > 0`),
	statusCheck: check("sv_journal_daily_claims_status_check", sql`${table.status} IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD', 'COMPLETED', 'ABANDONED', 'RECONCILED')`),
	utcDayCheck: check("sv_journal_daily_claims_utc_day_check", sql`${table.utcDay} = (${table.claimedAt} AT TIME ZONE 'UTC')::date`),
	executionLinkCheck: check("sv_journal_daily_claims_execution_link_check", sql`${table.status} IN ('CLAIMED', 'NO_SPEND', 'ABANDONED') OR ${table.configurationLockId} IS NOT NULL`),
	completionCheck: check("sv_journal_daily_claims_completion_check", sql`((${table.status} IN ('CLAIMED', 'EXECUTING', 'NO_SPEND', 'HOLD') AND ${table.completedAt} IS NULL AND ${table.abandonedAt} IS NULL AND ${table.reconciledAt} IS NULL AND ${table.reconciliationReason} IS NULL AND ${table.reconciledBy} IS NULL) OR (${table.status} = 'COMPLETED' AND ${table.completedAt} IS NOT NULL AND ${table.completedAt} >= ${table.claimedAt} AND ${table.abandonedAt} IS NULL AND ${table.reconciledAt} IS NULL AND ${table.reconciliationReason} IS NULL AND ${table.reconciledBy} IS NULL) OR (${table.status} = 'ABANDONED' AND ${table.completedAt} IS NULL AND ${table.abandonedAt} IS NOT NULL AND ${table.abandonedAt} >= ${table.claimedAt} AND ${table.reconciledAt} IS NULL AND ${table.reconciliationReason} IS NULL AND ${table.reconciledBy} IS NULL) OR (${table.status} = 'RECONCILED' AND ${table.completedAt} IS NULL AND ${table.abandonedAt} IS NULL AND ${table.reconciledAt} IS NOT NULL AND ${table.reconciledAt} >= ${table.claimedAt} AND length(btrim(${table.reconciliationReason})) > 0 AND length(btrim(${table.reconciledBy})) > 0))`)
})).enableRLS();
var svQuotes = pgTable("sv_quotes", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	lockId: uuid("lock_id").notNull().references(() => svConfigurationLocks.id),
	status: svQuoteStatusEnum().notNull().default("DRAFT"),
	priceAmount: numeric("price_amount", {
		precision: 12,
		scale: 2
	}).notNull(),
	currency: text("currency").notNull(),
	expectedRuns: integer("expected_runs").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	orgIdx: index("sv_quotes_org_idx").on(table.organizationId),
	projectIdx: index("sv_quotes_project_idx").on(table.projectId)
})).enableRLS();
var svOrders = pgTable("sv_orders", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	quoteId: uuid("quote_id").notNull().references(() => svQuotes.id),
	lockId: uuid("lock_id").notNull().references(() => svConfigurationLocks.id),
	status: svOrderStatusEnum().notNull().default("DRAFT"),
	orderCap: numeric("order_cap", {
		precision: 12,
		scale: 6
	}).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	orgIdx: index("sv_orders_org_idx").on(table.organizationId),
	statusIdx: index("sv_orders_status_idx").on(table.status)
})).enableRLS();
var svCycles = pgTable("sv_cycles", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	orderId: uuid("order_id").notNull().references(() => svOrders.id),
	lockId: uuid("lock_id").notNull().references(() => svConfigurationLocks.id),
	status: svCycleStatusEnum().notNull().default("CREATED"),
	expectedRuns: integer("expected_runs").notNull(),
	createdRuns: integer("created_runs").notNull().default(0),
	completedRuns: integer("completed_runs").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	orderIdx: index("sv_cycles_order_idx").on(table.orderId),
	orgIdx: index("sv_cycles_org_idx").on(table.organizationId)
})).enableRLS();
var svPublicScans = pgTable("sv_public_scans", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").references(() => svProjects.id),
	website: text("website").notNull(),
	status: svScanStatusEnum().notNull().default("PENDING"),
	result: jsonb("result"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true })
}, (table) => ({
	projectIdx: index("sv_public_scans_project_idx").on(table.projectId),
	createdIdx: index("sv_public_scans_created_idx").on(table.createdAt)
})).enableRLS();
var svPayments = pgTable("sv_payments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	orderId: uuid("order_id").notNull().references(() => svOrders.id),
	provider: text("provider").notNull().default("test"),
	providerEventId: text("provider_event_id").notNull(),
	status: svPaymentStatusEnum().notNull().default("PENDING"),
	amount: numeric("amount", {
		precision: 12,
		scale: 2
	}).notNull(),
	currency: text("currency").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	eventUnique: uniqueIndex("sv_payments_provider_event_unique").on(table.provider, table.providerEventId),
	orgIdx: index("sv_payments_org_idx").on(table.organizationId)
})).enableRLS();
var svFindings = pgTable("sv_findings", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull().references(() => svCycles.id),
	domainId: text("domain_id"),
	locationId: uuid("location_id"),
	severity: text("severity").notNull(),
	category: text("category").notNull(),
	title: text("title").notNull(),
	detail: text("detail").notNull(),
	status: svFindingStatusEnum().notNull().default("OPEN"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	cycleIdx: index("sv_findings_cycle_idx").on(table.cycleId),
	orgIdx: index("sv_findings_org_idx").on(table.organizationId)
})).enableRLS();
var svRecommendations = pgTable("sv_recommendations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull().references(() => svCycles.id),
	findingId: uuid("finding_id").references(() => svFindings.id),
	domainId: text("domain_id"),
	locationId: uuid("location_id"),
	priority: text("priority").notNull(),
	title: text("title").notNull(),
	action: text("action").notNull(),
	rationale: text("rationale").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	cycleIdx: index("sv_recommendations_cycle_idx").on(table.cycleId),
	orgIdx: index("sv_recommendations_org_idx").on(table.organizationId)
})).enableRLS();
var svProjectProfiles = pgTable("sv_project_profiles", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	brandName: text("brand_name").notNull(),
	primaryDomain: text("primary_domain").notNull(),
	publicProfiles: jsonb("public_profiles").notNull().default([]),
	competitorSnapshot: jsonb("competitor_snapshot").notNull().default([]),
	scenarioSnapshot: jsonb("scenario_snapshot").notNull().default([]),
	mapsLocation: jsonb("maps_location"),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
	confirmedBy: text("confirmed_by"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	projectUnique: uniqueIndex("sv_project_profiles_project_unique").on(table.projectId),
	orgIdx: index("sv_project_profiles_org_idx").on(table.organizationId)
})).enableRLS();
var svWebsiteSnapshots = pgTable("sv_website_snapshots", {
	id: text("id").primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	website: text("website").notNull(),
	contentHash: text("content_hash").notNull(),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	snapshot: jsonb("snapshot").notNull(),
	immutable: boolean("immutable").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	hashUnique: uniqueIndex("sv_website_snapshots_project_hash_unique").on(table.projectId, table.contentHash),
	orgIdx: index("sv_website_snapshots_org_idx").on(table.organizationId),
	projectIdx: index("sv_website_snapshots_project_idx").on(table.projectId)
})).enableRLS();
var svRunPermits = pgTable("sv_run_permits", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull().references(() => svCycles.id),
	dispatchKey: text("dispatch_key").notNull(),
	channel: text("channel").notNull(),
	scenarioId: text("scenario_id").notNull(),
	systemId: text("system_id"),
	status: text("status").notNull().default("issued"),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	dispatchUnique: uniqueIndex("sv_run_permits_dispatch_key_unique").on(table.dispatchKey),
	orgCycleIdx: index("sv_run_permits_org_cycle_idx").on(table.organizationId, table.cycleId)
})).enableRLS();
var svRuns = pgTable("sv_runs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull().references(() => svCycles.id),
	permitId: uuid("permit_id").notNull().references(() => svRunPermits.id),
	dispatchKey: text("dispatch_key").notNull(),
	channel: text("channel").notNull(),
	scenarioId: text("scenario_id").notNull(),
	systemId: text("system_id"),
	status: text("status").notNull().default("queued"),
	validity: text("validity"),
	invalidReason: text("invalid_reason"),
	costUsd: numeric("cost_usd", {
		precision: 12,
		scale: 6
	}),
	costBasis: text("cost_basis"),
	tokenInput: integer("token_input"),
	tokenOutput: integer("token_output"),
	system: text("system"),
	model: text("model"),
	language: text("language"),
	region: text("region"),
	mention: boolean("mention"),
	position: smallint("position"),
	ownedCitation: boolean("owned_citation"),
	citations: jsonb("citations"),
	competitors: jsonb("competitors"),
	factualErrors: jsonb("factual_errors"),
	extractorVersion: text("extractor_version"),
	captureMode: text("capture_mode"),
	rawResponseReference: text("raw_response_reference"),
	canonicalPayload: jsonb("canonical_payload"),
	startedAt: timestamp("started_at", { withTimezone: true }),
	finishedAt: timestamp("finished_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	dispatchUnique: uniqueIndex("sv_runs_dispatch_key_unique").on(table.dispatchKey),
	orgCycleIdx: index("sv_runs_org_cycle_idx").on(table.organizationId, table.cycleId)
})).enableRLS();
/** A committed pre-transport fence: spend is possible, never proven. */
var svJournalProviderBoundaries = pgTable("sv_journal_provider_boundaries", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull(),
	journalClaimId: uuid("journal_claim_id").notNull().references(() => svJournalDailyClaims.id),
	configurationLockId: uuid("configuration_lock_id").notNull(),
	cycleId: uuid("cycle_id").notNull().references(() => svCycles.id),
	permitId: uuid("permit_id").notNull().references(() => svRunPermits.id),
	runId: uuid("run_id").notNull().references(() => svRuns.id),
	dispatchKey: text("dispatch_key").notNull(),
	channel: text("channel").notNull(),
	systemId: text("system_id"),
	boundaryKind: text("boundary_kind").notNull().default("PRE_TRANSPORT"),
	providerCallUpperBound: integer("provider_call_upper_bound").notNull().default(1),
	crossedAt: timestamp("crossed_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull()
}, (table) => ({
	claimPermitUnique: uniqueIndex("sv_journal_provider_boundaries_claim_permit_unique").on(table.journalClaimId, table.permitId),
	runUnique: uniqueIndex("sv_journal_provider_boundaries_run_unique").on(table.runId),
	organizationClaimIdx: index("sv_journal_provider_boundaries_org_claim_idx").on(table.organizationId, table.journalClaimId),
	projectOrganizationReference: foreignKey({
		columns: [table.projectId, table.organizationId],
		foreignColumns: [svProjects.id, svProjects.organizationId],
		name: "sv_journal_provider_boundaries_project_org_fk"
	}),
	lockProjectOrganizationReference: foreignKey({
		columns: [
			table.configurationLockId,
			table.projectId,
			table.organizationId
		],
		foreignColumns: [
			svConfigurationLocks.id,
			svConfigurationLocks.projectId,
			svConfigurationLocks.organizationId
		],
		name: "sv_journal_provider_boundaries_lock_project_org_fk"
	}),
	boundaryKindCheck: check("sv_journal_provider_boundaries_kind_check", sql`${table.boundaryKind} = 'PRE_TRANSPORT'`),
	providerCallUpperBoundCheck: check("sv_journal_provider_boundaries_call_bound_check", sql`${table.providerCallUpperBound} = 1`)
})).enableRLS();
var svResponseMentions = pgTable("sv_response_mentions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").notNull().references(() => svCycles.id),
	runId: uuid("run_id").notNull().references(() => svRuns.id),
	entityType: text("entity_type").notNull(),
	name: text("name").notNull(),
	ordinalPosition: smallint("ordinal_position"),
	matchMethod: text("match_method").notNull().default("exact_term"),
	extractorVersion: text("extractor_version").notNull(),
	captureMode: text("capture_mode"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	runIdx: index("sv_response_mentions_run_idx").on(table.runId),
	orgCycleIdx: index("sv_response_mentions_org_cycle_idx").on(table.organizationId, table.cycleId)
})).enableRLS();
var svCitationGapSnapshots = pgTable("sv_citation_gap_snapshots", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	cycleId: uuid("cycle_id").notNull().references(() => svCycles.id),
	configurationLockId: uuid("configuration_lock_id").notNull().references(() => svConfigurationLocks.id),
	topicId: uuid("topic_id"),
	sourceDomain: text("source_domain").notNull(),
	sourceUrls: text("source_urls").array().notNull().default([]),
	ownedCitationCount: integer("owned_citation_count").notNull(),
	competitorCitationCount: integer("competitor_citation_count").notNull(),
	competitorNames: text("competitor_names").array().notNull().default([]),
	engineCount: integer("engine_count").notNull(),
	scenarioCount: integer("scenario_count").notNull(),
	repeatStability: numeric("repeat_stability", {
		precision: 6,
		scale: 4
	}),
	firstSeen: timestamp("first_seen", { withTimezone: true }),
	lastSeen: timestamp("last_seen", { withTimezone: true }),
	gapType: text("gap_type"),
	priorityBand: text("priority_band").notNull(),
	formulaVersion: text("formula_version").notNull(),
	evidenceRunIds: uuid("evidence_run_ids").array().notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	cycleSourceUnique: uniqueIndex("sv_citation_gap_cycle_source_unique").on(table.cycleId, table.sourceDomain, table.formulaVersion),
	orgCycleIdx: index("sv_citation_gap_org_cycle_idx").on(table.organizationId, table.cycleId),
	projectIdx: index("sv_citation_gap_project_idx").on(table.projectId)
})).enableRLS();
var svIncidents = pgTable("sv_incidents", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	orderId: uuid("order_id").references(() => svOrders.id),
	cycleId: uuid("cycle_id").references(() => svCycles.id),
	kind: text("kind").notNull(),
	severity: text("severity").notNull().default("high"),
	detail: text("detail").notNull(),
	dispatchKey: text("dispatch_key"),
	status: text("status").notNull().default("OPEN"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true })
}, (table) => ({
	orgCreatedIdx: index("sv_incidents_org_created_idx").on(table.organizationId, table.createdAt),
	orderIdx: index("sv_incidents_order_idx").on(table.orderId)
})).enableRLS();
var svCostEvents = pgTable("sv_cost_events", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	cycleId: uuid("cycle_id").references(() => svCycles.id),
	measurementCycleId: uuid("measurement_cycle_id"),
	domainId: text("domain_id").notNull().default("AI"),
	runId: uuid("run_id").references(() => svRuns.id),
	provider: text("provider").notNull(),
	amountUsd: numeric("amount_usd", {
		precision: 12,
		scale: 6
	}).notNull(),
	basis: text("basis").notNull(),
	kind: text("kind").notNull().default("measurement"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	idOrganizationCycleDomainUnique: uniqueIndex("sv_cost_events_id_org_cycle_domain_unique").on(table.id, table.organizationId, table.measurementCycleId, table.domainId),
	orgCycleIdx: index("sv_cost_events_org_cycle_idx").on(table.organizationId, table.cycleId),
	orgDomainIdx: index("sv_cost_events_org_domain_idx").on(table.organizationId, table.domainId),
	measurementCycleIdx: index("sv_cost_events_measurement_cycle_idx").on(table.measurementCycleId),
	runIdx: index("sv_cost_events_run_idx").on(table.runId),
	domainShapeCheck: check("sv_cost_events_domain_shape_check", sql`${table.domainId} = 'AI' OR (${table.measurementCycleId} IS NOT NULL AND ${table.cycleId} IS NULL AND ${table.runId} IS NULL)`)
})).enableRLS();
var svRecommendationRunStatusEnum = pgEnum("sv_recommendation_run_status", [
	"RUNNING",
	"READY",
	"FAILED"
]);
var svRecommendationRuns = pgTable("sv_recommendation_runs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	idempotencyKey: text("idempotency_key").notNull(),
	datasetId: text("dataset_id").notNull(),
	inputHash: text("input_hash").notNull(),
	rulepackVersion: text("rulepack_version").notNull(),
	status: svRecommendationRunStatusEnum().notNull().default("RUNNING"),
	groundingStatus: text("grounding_status").notNull().default("PENDING"),
	actionPlan: jsonb("action_plan"),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true })
}, (table) => ({
	idempotencyUnique: uniqueIndex("sv_recommendation_runs_org_idempotency_unique").on(table.organizationId, table.idempotencyKey),
	projectIdx: index("sv_recommendation_runs_project_idx").on(table.projectId),
	orgIdx: index("sv_recommendation_runs_org_idx").on(table.organizationId)
})).enableRLS();
var svRecommendationManifests = pgTable("sv_recommendation_manifests", {
	id: text("id").primaryKey().notNull(),
	runId: uuid("run_id").notNull().references(() => svRecommendationRuns.id),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	datasetId: text("dataset_id").notNull(),
	inputHash: text("input_hash").notNull(),
	snapshotIds: text("snapshot_ids").array().notNull().default([]),
	evidenceIds: text("evidence_ids").array().notNull().default([]),
	rulepackVersion: text("rulepack_version").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	runUnique: uniqueIndex("sv_recommendation_manifests_run_unique").on(table.runId),
	orgIdx: index("sv_recommendation_manifests_org_idx").on(table.organizationId)
})).enableRLS();
var svRecommendationEvidence = pgTable("sv_recommendation_evidence", {
	id: text("id").notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	runId: uuid("run_id").notNull().references(() => svRecommendationRuns.id),
	snapshotId: text("snapshot_id").notNull(),
	kind: text("kind").notNull(),
	accessClass: text("access_class").notNull(),
	sourceRef: text("source_ref").notNull(),
	capturedAt: text("captured_at").notNull(),
	subject: text("subject").notNull(),
	text: text("text").notNull(),
	metadata: jsonb("metadata").notNull().default({})
}, (table) => ({
	pk: uniqueIndex("sv_recommendation_evidence_run_id_unique").on(table.runId, table.id),
	orgIdx: index("sv_recommendation_evidence_org_idx").on(table.organizationId)
})).enableRLS();
var svRecommendationFindings = pgTable("sv_recommendation_findings", {
	id: text("id").notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	runId: uuid("run_id").notNull().references(() => svRecommendationRuns.id),
	category: text("category").notNull(),
	statement: text("statement").notNull(),
	evidenceIds: text("evidence_ids").array().notNull(),
	confidence: text("confidence").notNull(),
	confidenceScore: numeric("confidence_score", {
		precision: 5,
		scale: 4
	}).notNull(),
	severity: text("severity").notNull(),
	unknown: boolean("unknown").notNull(),
	ruleId: text("rule_id").notNull()
}, (table) => ({
	pk: uniqueIndex("sv_recommendation_findings_run_id_unique").on(table.runId, table.id),
	orgIdx: index("sv_recommendation_findings_org_idx").on(table.organizationId)
})).enableRLS();
var svRecommendationActions = pgTable("sv_recommendation_actions", {
	id: text("id").notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	runId: uuid("run_id").notNull().references(() => svRecommendationRuns.id),
	findingId: text("finding_id").notNull(),
	title: text("title").notNull(),
	action: text("action").notNull(),
	rationale: text("rationale").notNull(),
	evidenceIds: text("evidence_ids").array().notNull(),
	priority: text("priority").notNull(),
	effort: text("effort").notNull(),
	confidence: text("confidence").notNull(),
	blocked: boolean("blocked").notNull(),
	blockReason: text("block_reason")
}, (table) => ({
	pk: uniqueIndex("sv_recommendation_actions_run_id_unique").on(table.runId, table.id),
	orgIdx: index("sv_recommendation_actions_org_idx").on(table.organizationId)
})).enableRLS();
var svRecommendationTasks = pgTable("sv_recommendation_tasks", {
	id: text("id").notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	runId: uuid("run_id").notNull().references(() => svRecommendationRuns.id),
	recommendationId: text("recommendation_id").notNull(),
	title: text("title").notNull(),
	horizon: text("horizon").notNull(),
	owner: text("owner").notNull(),
	steps: text("steps").array().notNull(),
	evidenceIds: text("evidence_ids").array().notNull(),
	verificationPlan: text("verification_plan").array().notNull()
}, (table) => ({
	pk: uniqueIndex("sv_recommendation_tasks_run_id_unique").on(table.runId, table.id),
	orgIdx: index("sv_recommendation_tasks_org_idx").on(table.organizationId)
})).enableRLS();
var svEntityKindEnum = pgEnum("sv_entity_kind", [
	"MASTER_BRAND",
	"SUBBRAND",
	"CONCEPT",
	"LOCATION_BRAND"
]);
var svParentRelationEnum = pgEnum("sv_parent_relation", [
	"SUBBRAND_OF",
	"CONCEPT_WITHIN",
	"LOCATION_OF",
	"UNSPECIFIED"
]);
var svEntityConfirmationEnum = pgEnum("sv_entity_confirmation", [
	"PROPOSED",
	"CLIENT_CONFIRMED",
	"ANALYST_CONFIRMED",
	"REJECTED"
]);
var svGeoPrecisionEnum = pgEnum("sv_geo_precision", [
	"CITY",
	"ADDRESS",
	"COORDINATE",
	"UNKNOWN"
]);
var svReferenceOriginEnum = pgEnum("sv_reference_origin", [
	"USER_PROVIDED",
	"PUBLIC_SITE",
	"ANALYST_ENTERED"
]);
var svLocationRoleEnum = pgEnum("sv_location_role", [
	"PRIMARY",
	"SECONDARY",
	"WITHIN"
]);
var svLocationConfirmationEnum = pgEnum("sv_location_confirmation", [
	"PROPOSED",
	"CONFIRMED",
	"REJECTED"
]);
var svEntities = pgTable("sv_entities", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	parentEntityId: uuid("parent_entity_id").references(() => svEntities.id),
	entityKind: svEntityKindEnum("entity_kind").notNull(),
	parentRelation: svParentRelationEnum("parent_relation"),
	confirmationStatus: svEntityConfirmationEnum("confirmation_status").notNull().default("PROPOSED"),
	name: text("name").notNull(),
	aliases: text("aliases").array().notNull().default([]),
	prelaunch: boolean("prelaunch").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ orgProjectIdx: index("sv_entities_org_project_idx").on(table.organizationId, table.projectId) })).enableRLS();
var svBusinessLocations = pgTable("sv_business_locations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	entityId: uuid("entity_id").notNull().references(() => svEntities.id),
	displayName: text("display_name").notNull(),
	countryCode: text("country_code").notNull(),
	adminArea: text("admin_area"),
	locality: text("locality"),
	addressText: text("address_text"),
	timezone: text("timezone"),
	latitude: numeric("latitude", {
		precision: 9,
		scale: 6
	}),
	longitude: numeric("longitude", {
		precision: 9,
		scale: 6
	}),
	geoPrecision: svGeoPrecisionEnum("geo_precision").notNull().default("UNKNOWN"),
	googleMapsUrlReference: text("google_maps_url_reference"),
	googlePlaceIdReference: text("google_place_id_reference"),
	localProfile: jsonb("local_profile"),
	localProfileConfirmedAt: timestamp("local_profile_confirmed_at", { withTimezone: true }),
	referenceOrigin: svReferenceOriginEnum("reference_origin").notNull().default("USER_PROVIDED"),
	locationRole: svLocationRoleEnum("location_role").notNull().default("PRIMARY"),
	confirmationStatus: svLocationConfirmationEnum("confirmation_status").notNull().default("PROPOSED"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	entityIdx: index("sv_business_locations_entity_idx").on(table.entityId),
	orgIdx: index("sv_business_locations_org_idx").on(table.organizationId)
})).enableRLS();
var svCaptureTaskStatusEnum = pgEnum("sv_capture_task_status", [
	"PENDING_CAPTURE",
	"AWAITING_MANUAL_CAPTURE",
	"SUBMITTED_FOR_REVIEW",
	"ACCEPTED",
	"REJECTED",
	"NEEDS_CORRECTION",
	"INSUFFICIENT_EVIDENCE",
	"SURFACE_UNAVAILABLE"
]);
var svOrderingStateEnum = pgEnum("sv_ordering_state", [
	"EXPLICIT_ORDER",
	"UNORDERED",
	"UNKNOWN"
]);
var svMentionRoleEnum = pgEnum("sv_mention_role", [
	"TARGET",
	"PARENT",
	"CHILD",
	"COMPETITOR",
	"OTHER"
]);
var svMatchStatusEnum = pgEnum("sv_match_status", [
	"EXACT_ALIAS",
	"REVIEWED_MATCH",
	"UNRESOLVED"
]);
var svPilotCycles = pgTable("sv_pilot_cycles", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	lockId: uuid("lock_id").notNull().references(() => svConfigurationLocks.id),
	status: text("status").notNull().default("CREATED"),
	expectedObservations: integer("expected_observations").notNull(),
	createdObservations: integer("created_observations").notNull().default(0),
	captureProtocolVersion: text("capture_protocol_version").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	orgIdx: index("sv_pilot_cycles_org_idx").on(table.organizationId),
	projectIdx: index("sv_pilot_cycles_project_idx").on(table.projectId)
})).enableRLS();
var svCaptureTasks = pgTable("sv_capture_tasks", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	pilotCycleId: uuid("pilot_cycle_id").notNull().references(() => svPilotCycles.id),
	scenarioId: uuid("scenario_id").notNull().references(() => svScenarios.id),
	contextHash: text("context_hash").notNull(),
	contextSnapshot: jsonb("context_snapshot").notNull(),
	repeatIndex: integer("repeat_index").notNull(),
	queryTextSnapshot: text("query_text_snapshot").notNull(),
	targetEntityIdsSnapshot: jsonb("target_entity_ids_snapshot").notNull().default([]),
	status: svCaptureTaskStatusEnum().notNull().default("PENDING_CAPTURE"),
	idempotencyKey: text("idempotency_key"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	matrixUnique: uniqueIndex("sv_capture_tasks_matrix_unique").on(table.pilotCycleId, table.scenarioId, table.contextHash, table.repeatIndex),
	idempotencyUnique: uniqueIndex("sv_capture_tasks_org_idempotency_unique").on(table.organizationId, table.idempotencyKey),
	orgIdx: index("sv_capture_tasks_org_idx").on(table.organizationId)
})).enableRLS();
var svLocalObservations = pgTable("sv_local_observations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	captureTaskId: uuid("capture_task_id").notNull().references(() => svCaptureTasks.id),
	capturedBy: text("captured_by").notNull(),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
	reviewStatus: text("review_status").notNull().default("SUBMITTED_FOR_REVIEW"),
	validity: text("validity"),
	invalidReason: text("invalid_reason"),
	orderingState: svOrderingStateEnum("ordering_state").notNull().default("UNKNOWN"),
	transcript: text("transcript").notNull(),
	queryText: text("query_text").notNull(),
	contentSha256: text("content_sha256").notNull(),
	version: integer("version").notNull().default(1),
	supersedesObservationId: uuid("supersedes_observation_id").references(() => svLocalObservations.id),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	taskUnique: uniqueIndex("sv_local_observations_task_unique").on(table.captureTaskId),
	orgIdx: index("sv_local_observations_org_idx").on(table.organizationId)
})).enableRLS();
var svObservationMentions = pgTable("sv_observation_mentions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	observationId: uuid("observation_id").notNull().references(() => svLocalObservations.id),
	rawMentionText: text("raw_mention_text").notNull(),
	matchedEntityId: uuid("matched_entity_id").references(() => svEntities.id),
	mentionRole: svMentionRoleEnum("mention_role").notNull(),
	matchStatus: svMatchStatusEnum("match_status").notNull(),
	matchConfidence: numeric("match_confidence", {
		precision: 5,
		scale: 4
	}),
	explicitPosition: integer("explicit_position"),
	orderingBasis: text("ordering_basis"),
	factualError: boolean("factual_error").notNull().default(false),
	evidenceLocator: text("evidence_locator")
}, (table) => ({
	observationIdx: index("sv_observation_mentions_observation_idx").on(table.observationId),
	orgIdx: index("sv_observation_mentions_org_idx").on(table.organizationId)
})).enableRLS();
var svObservationEvidenceAssets = pgTable("sv_observation_evidence_assets", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	observationId: uuid("observation_id").notNull().references(() => svLocalObservations.id),
	assetType: text("asset_type").notNull(),
	mimeType: text("mime_type").notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	sha256: text("sha256").notNull(),
	sequenceIndex: integer("sequence_index").notNull(),
	privateObjectReference: text("private_object_reference").notNull(),
	uploadedBy: text("uploaded_by").notNull(),
	capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	observationIdx: index("sv_observation_evidence_assets_observation_idx").on(table.observationId),
	orgIdx: index("sv_observation_evidence_assets_org_idx").on(table.organizationId)
})).enableRLS();
var svAuditEvents = pgTable("sv_audit_events", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	actorId: text("actor_id").notNull(),
	event: text("event").notNull(),
	subjectKind: text("subject_kind").notNull(),
	subjectId: text("subject_id").notNull(),
	details: jsonb("details").notNull().default({}),
	at: timestamp("at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ orgAtIdx: index("sv_audit_events_org_at_idx").on(table.organizationId, table.at) })).enableRLS();
var svQcRecords = pgTable("sv_qc_records", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	orderId: uuid("order_id").notNull().references(() => svOrders.id),
	cycleId: uuid("cycle_id").references(() => svCycles.id),
	reviewer: text("reviewer").notNull(),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
	scope: text("scope").notNull(),
	decision: text("decision").notNull(),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ orgOrderIdx: index("sv_qc_records_org_order_idx").on(table.organizationId, table.orderId) })).enableRLS();
var svOrderRequests = pgTable("sv_order_requests", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectId: uuid("project_id").notNull().references(() => svProjects.id),
	planId: text("plan_id").notNull(),
	contactName: text("contact_name").notNull(),
	contactChannel: text("contact_channel").notNull(),
	comment: text("comment"),
	promoCode: text("promo_code"),
	promoApplied: boolean("promo_applied").default(false).notNull(),
	status: text("status").default("NEW").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ orgCreatedIdx: index("sv_order_requests_org_created_idx").on(table.organizationId, table.createdAt) })).enableRLS();
var svPilotInvites = pgTable("sv_pilot_invites", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	codeHash: text("code_hash").notNull(),
	planId: text("plan_id").notNull(),
	label: text("label"),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
	redeemedByOrganizationId: text("redeemed_by_organization_id"),
	redeemedByUserId: text("redeemed_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ codeHashKey: unique("sv_pilot_invites_code_hash_key").on(table.codeHash) })).enableRLS();
var svFreeAutoDispatchClaims = pgTable("sv_free_auto_dispatch_claims", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	utcDay: date("utc_day").notNull(),
	organizationId: text("organization_id").notNull(),
	projectId: uuid("project_id").notNull(),
	requestId: uuid("request_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	requestKey: unique("sv_free_auto_dispatch_claims_request_key").on(table.requestId),
	dayIdx: index("sv_free_auto_dispatch_claims_day_idx").on(table.utcDay),
	dayProjectIdx: index("sv_free_auto_dispatch_claims_day_project_idx").on(table.utcDay, table.projectId)
})).enableRLS();
var secrets = pgTable("secrets", {
	name: text("name").primaryKey().notNull(),
	encryptedValue: text("encrypted_value").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
}).enableRLS();
/**
* The five tables below carry the staging simulation: a payment event that
* charges nothing, a subscription that authorises nothing, a Telegram
* recipient bound by a single-use link, a sample report that is not a
* measurement, and the delivery of one digest.
*
* Every row states its own environment, mode, source status and
* not-a-measurement flag, and a CHECK constraint pins each to its only
* permitted value. A row that reached production, or that claimed to be a
* measurement, could not have been inserted.
*/
var svSimulationSubscriptions = pgTable("sv_simulation_subscriptions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectRef: text("project_ref").notNull(),
	customerRef: text("customer_ref").notNull(),
	planId: text("plan_id").notNull(),
	status: text("status").notNull().default("ACTIVE"),
	provider: text("provider").notNull(),
	providerEventId: text("provider_event_id").notNull(),
	amountUsd: numeric("amount_usd", {
		precision: 12,
		scale: 2
	}).notNull(),
	currency: text("currency").notNull(),
	environment: text("environment").notNull().default("staging"),
	mode: text("mode").notNull().default("test"),
	sourceStatus: text("source_status").notNull().default("sample"),
	notAMeasurement: boolean("not_a_measurement").notNull().default(true),
	correlationId: text("correlation_id").notNull(),
	activatedAt: timestamp("activated_at", { withTimezone: true }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	eventUnique: uniqueIndex("sv_simulation_subscriptions_event_unique").on(table.organizationId, table.provider, table.providerEventId),
	orgIdx: index("sv_simulation_subscriptions_org_idx").on(table.organizationId),
	projectIdx: index("sv_simulation_subscriptions_project_idx").on(table.organizationId, table.projectRef),
	environmentCheck: check("sv_simulation_subscriptions_environment_check", sql`${table.environment} = 'staging'`),
	modeCheck: check("sv_simulation_subscriptions_mode_check", sql`${table.mode} = 'test'`),
	sourceStatusCheck: check("sv_simulation_subscriptions_source_status_check", sql`${table.sourceStatus} = 'sample'`),
	notAMeasurementCheck: check("sv_simulation_subscriptions_not_a_measurement_check", sql`${table.notAMeasurement} = true`),
	statusCheck: check("sv_simulation_subscriptions_status_check", sql`${table.status} IN ('ACTIVE', 'PAUSED', 'CANCELLED')`),
	currencyCheck: check("sv_simulation_subscriptions_currency_check", sql`${table.currency} = 'USD'`)
})).enableRLS();
/** Only the SHA-256 of a connect token is stored, so the database never holds a
* credential that could bind a recipient. `consumed_at` is the single-use latch. */
var svSimulationConnectTokens = pgTable("sv_simulation_connect_tokens", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectRef: text("project_ref").notNull(),
	userId: text("user_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	nonce: text("nonce").notNull(),
	environment: text("environment").notNull().default("staging"),
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	correlationId: text("correlation_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	tokenHashUnique: uniqueIndex("sv_simulation_connect_tokens_hash_unique").on(table.tokenHash),
	projectIdx: index("sv_simulation_connect_tokens_project_idx").on(table.organizationId, table.projectRef),
	environmentCheck: check("sv_simulation_connect_tokens_environment_check", sql`${table.environment} = 'staging'`),
	hashCheck: check("sv_simulation_connect_tokens_hash_check", sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`),
	expiryCheck: check("sv_simulation_connect_tokens_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`)
})).enableRLS();
/** The bound recipient. The chat id exists here only as ciphertext: a digest of
* a numeric Telegram id is guessable offline, so there is no hash column to undo
* what the ciphertext protects. */
var svSimulationRecipients = pgTable("sv_simulation_recipients", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectRef: text("project_ref").notNull(),
	channel: text("channel").notNull().default("telegram"),
	chatIdCiphertext: text("chat_id_ciphertext").notNull(),
	status: text("status").notNull().default("BOUND"),
	environment: text("environment").notNull().default("staging"),
	boundAt: timestamp("bound_at", { withTimezone: true }).defaultNow().notNull(),
	unboundAt: timestamp("unbound_at", { withTimezone: true }),
	unboundReason: text("unbound_reason"),
	correlationId: text("correlation_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	activeUnique: uniqueIndex("sv_simulation_recipients_active_unique").on(table.organizationId, table.projectRef, table.channel).where(sql`${table.status} = 'BOUND'`),
	projectIdx: index("sv_simulation_recipients_project_idx").on(table.organizationId, table.projectRef),
	environmentCheck: check("sv_simulation_recipients_environment_check", sql`${table.environment} = 'staging'`),
	statusCheck: check("sv_simulation_recipients_status_check", sql`${table.status} IN ('PENDING', 'BOUND', 'UNBOUND')`),
	unboundCheck: check("sv_simulation_recipients_unbound_check", sql`(${table.status} = 'UNBOUND') = (${table.unboundAt} IS NOT NULL)`)
})).enableRLS();
/** The saved sample report. It is the workspace copy a digest links to, and its
* existence is the precondition delivery checks. */
var svSimulationReports = pgTable("sv_simulation_reports", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectRef: text("project_ref").notNull(),
	subscriptionId: uuid("subscription_id").notNull().references(() => svSimulationSubscriptions.id),
	periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
	periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
	payload: jsonb("payload").notNull(),
	environment: text("environment").notNull().default("staging"),
	mode: text("mode").notNull().default("test"),
	sourceStatus: text("source_status").notNull().default("sample"),
	notAMeasurement: boolean("not_a_measurement").notNull().default(true),
	providerCalls: integer("provider_calls").notNull().default(0),
	correlationId: text("correlation_id").notNull(),
	persistedAt: timestamp("persisted_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	periodUnique: uniqueIndex("sv_simulation_reports_period_unique").on(table.organizationId, table.projectRef, table.periodStart),
	projectIdx: index("sv_simulation_reports_project_idx").on(table.organizationId, table.projectRef),
	environmentCheck: check("sv_simulation_reports_environment_check", sql`${table.environment} = 'staging'`),
	modeCheck: check("sv_simulation_reports_mode_check", sql`${table.mode} = 'test'`),
	sourceStatusCheck: check("sv_simulation_reports_source_status_check", sql`${table.sourceStatus} = 'sample'`),
	notAMeasurementCheck: check("sv_simulation_reports_not_a_measurement_check", sql`${table.notAMeasurement} = true`),
	providerCallsCheck: check("sv_simulation_reports_provider_calls_check", sql`${table.providerCalls} = 0`),
	periodCheck: check("sv_simulation_reports_period_check", sql`${table.periodEnd} > ${table.periodStart}`)
})).enableRLS();
/** One delivery per saved report. `attempts_made` is capped in the database so
* a sixth attempt cannot be written even by a caller that ignored the schedule. */
var svSimulationDeliveries = pgTable("sv_simulation_deliveries", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	projectRef: text("project_ref").notNull(),
	reportId: uuid("report_id").notNull().references(() => svSimulationReports.id),
	recipientId: uuid("recipient_id").notNull().references(() => svSimulationRecipients.id),
	status: text("status").notNull().default("PENDING"),
	attemptsMade: integer("attempts_made").notNull().default(0),
	nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
	claimedAt: timestamp("claimed_at", { withTimezone: true }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true }),
	lastError: text("last_error"),
	environment: text("environment").notNull().default("staging"),
	mode: text("mode").notNull().default("test"),
	correlationId: text("correlation_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	reportUnique: uniqueIndex("sv_simulation_deliveries_report_unique").on(table.reportId),
	projectIdx: index("sv_simulation_deliveries_project_idx").on(table.organizationId, table.projectRef),
	environmentCheck: check("sv_simulation_deliveries_environment_check", sql`${table.environment} = 'staging'`),
	modeCheck: check("sv_simulation_deliveries_mode_check", sql`${table.mode} = 'test'`),
	statusCheck: check("sv_simulation_deliveries_status_check", sql`${table.status} IN ('PENDING', 'SENDING', 'DELIVERED', 'RETRY_SCHEDULED', 'FAILED', 'UNBOUND')`),
	attemptCapCheck: check("sv_simulation_deliveries_attempt_cap_check", sql`${table.attemptsMade} BETWEEN 0 AND 5`),
	deliveredCheck: check("sv_simulation_deliveries_delivered_check", sql`(${table.status} = 'DELIVERED') = (${table.deliveredAt} IS NOT NULL)`),
	claimedCheck: check("sv_simulation_deliveries_claimed_check", sql`${table.status} <> 'SENDING' OR ${table.claimedAt} IS NOT NULL`)
})).enableRLS();
/** Spent bootstrap nonces: what makes one bootstrap signature usable once. The
* rows carry no tenant and no secret, and each call sweeps those older than the
* window a signature stays fresh for. */
var svSimulationBootstrapNonces = pgTable("sv_simulation_bootstrap_nonces", {
	nonce: text("nonce").primaryKey().notNull(),
	usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	usedIdx: index("sv_simulation_bootstrap_nonces_used_idx").on(table.usedAt),
	shapeCheck: check("sv_simulation_bootstrap_nonces_shape_check", sql`${table.nonce} ~ '^[a-f0-9]{32,128}$'`)
}));
/** Append-only attempt log: one row per send, whatever its outcome. */
var svSimulationDeliveryAttempts = pgTable("sv_simulation_delivery_attempts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: text("organization_id").notNull().references(() => organization.id),
	deliveryId: uuid("delivery_id").notNull().references(() => svSimulationDeliveries.id),
	attempt: integer("attempt").notNull(),
	outcome: text("outcome").notNull(),
	detail: text("detail"),
	correlationId: text("correlation_id").notNull(),
	attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
	attemptUnique: uniqueIndex("sv_simulation_delivery_attempts_unique").on(table.deliveryId, table.attempt),
	attemptRangeCheck: check("sv_simulation_delivery_attempts_range_check", sql`${table.attempt} BETWEEN 1 AND 5`),
	outcomeCheck: check("sv_simulation_delivery_attempts_outcome_check", sql`${table.outcome} IN ('SUCCESS', 'TEMPORARY_FAILURE', 'RECIPIENT_GONE')`)
})).enableRLS();
//#endregion
export { svPilotCycles as $, svIncidents as A, svLocalRawEvidence as B, svCostEvents as C, svSourceSnapshots as Ct, svEvidenceReadModel as D, user as Dt, svEvidenceIndex as E, svWebsiteSnapshots as Et, svLocalEvidenceAcceptances as F, svMeasurementAttempts as G, svLocalReportVersions as H, svLocalKeywords as I, svObservationEvidenceAssets as J, svMeasurementCycles as K, svLocalObservations as L, svJournalProviderBoundaries as M, svLocalCanaryReviews as N, svFindings as O, svLocalDispatchOutbox as P, svPayments as Q, svLocalQcDecisions as R, svConfigurationLocks as S, svSimulationSubscriptions as St, svEntities as T, svVisibilityMapPoints as Tt, svLocalScanCycles as U, svLocalReportDeliveries as V, svMeasurementAttemptResults as W, svOrderRequests as X, svObservationMentions as Y, svOrders as Z, svApiKeys as _, svSimulationConnectTokens as _t, competitors as a, svRecommendationActions as at, svCaptureTasks as b, svSimulationRecipients as bt, organization as c, svRecommendationManifests as ct, prompts as d, svRecommendations as dt, svProjectProfiles as et, reports as f, svResponseMentions as ft, svApiIdempotencyRecords as g, svSimulationBootstrapNonces as gt, subscription as h, svScenarios as ht, citations as i, svQuotes as it, svJournalDailyClaims as j, svGridPoints as k, organizationSettings as l, svRecommendationRuns as lt, secrets as m, svRuns as mt, brandOpportunities as n, svPromptFamilies as nt, invitation as o, svRecommendationEvidence as ot, schema_exports as p, svRunPermits as pt, svMeasurementDatasets as q, brands as r, svQcRecords as rt, member as s, svRecommendationFindings as st, SYSTEM_TAGS as t, svProjects as tt, promptRuns as u, svRecommendationTasks as ut, svAuditEvents as v, svSimulationDeliveries as vt, svCycles as w, svVisibilityMapDatasets as wt, svCitationGapSnapshots as x, svSimulationReports as xt, svBusinessLocations as y, svSimulationDeliveryAttempts as yt, svLocalRankObservations as z };

//# sourceMappingURL=schema-ejW7s7Gs.mjs.map