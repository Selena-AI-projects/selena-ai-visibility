import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./schema-auth";
import { svConfigurationLocks } from "./schema";

export const svMeasurementDomains = pgTable("sv_measurement_domains", {
	domainId: text("domain_id").primaryKey().notNull(),
	unitOfMeasure: text("unit_of_measure").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const svMeasurementCycles = pgTable(
	"sv_measurement_cycles",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		domainId: text("domain_id")
			.notNull()
			.references(() => svMeasurementDomains.domainId),
		domainCycleId: uuid("domain_cycle_id").notNull(),
		configurationLockId: uuid("configuration_lock_id")
			.notNull()
			.references(() => svConfigurationLocks.id),
		status: text("status").notNull().default("CREATED"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		domainCycleUnique: uniqueIndex("sv_measurement_cycles_domain_cycle_unique").on(table.domainId, table.domainCycleId),
		idDomainUnique: uniqueIndex("sv_measurement_cycles_id_domain_unique").on(table.id, table.domainId),
		orgDomainIdx: index("sv_measurement_cycles_org_domain_idx").on(table.organizationId, table.domainId),
	}),
).enableRLS();

export const svMeasurementDatasets = pgTable(
	"sv_measurement_datasets",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		cycleId: uuid("cycle_id").references(() => svMeasurementCycles.id),
		datasetKey: text("dataset_key").notNull(),
		version: integer("version").notNull(),
		immutable: boolean("immutable").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		orgDatasetVersionUnique: uniqueIndex("sv_measurement_datasets_org_key_version_unique").on(
			table.organizationId,
			table.datasetKey,
			table.version,
		),
		orgCycleIdx: index("sv_measurement_datasets_org_cycle_idx").on(table.organizationId, table.cycleId),
	}),
).enableRLS();

export const svSourceSnapshots = pgTable(
	"sv_source_snapshots",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		sourceType: text("source_type").notNull(),
		sourceRef: text("source_ref").notNull(),
		contentSha256: text("content_sha256").notNull(),
		snapshot: jsonb("snapshot").notNull(),
		capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
		immutable: boolean("immutable").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		orgContentHashUnique: uniqueIndex("sv_source_snapshots_org_content_sha256_unique").on(
			table.organizationId,
			table.contentSha256,
		),
		orgCapturedIdx: index("sv_source_snapshots_org_captured_idx").on(table.organizationId, table.capturedAt),
	}),
).enableRLS();

export const svEvidenceIndex = pgTable(
	"sv_evidence_index",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		domainId: text("domain_id")
			.notNull()
			.references(() => svMeasurementDomains.domainId),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => svMeasurementCycles.id),
		observationRef: text("observation_ref").notNull(),
		datasetId: uuid("dataset_id")
			.notNull()
			.references(() => svMeasurementDatasets.id),
		sourceSnapshotId: uuid("source_snapshot_id").references(() => svSourceSnapshots.id),
		capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		domainObservationUnique: uniqueIndex("sv_evidence_index_domain_observation_unique").on(
			table.domainId,
			table.observationRef,
		),
		cycleDomainReference: foreignKey({
			columns: [table.cycleId, table.domainId],
			foreignColumns: [svMeasurementCycles.id, svMeasurementCycles.domainId],
			name: "sv_evidence_index_cycle_domain_fk",
		}),
		orgCycleIdx: index("sv_evidence_index_org_cycle_idx").on(table.organizationId, table.cycleId),
	}),
).enableRLS();
