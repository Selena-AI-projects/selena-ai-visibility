import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { svBusinessLocations, svConfigurationLocks, svEntities } from "./schema";
import { organization } from "./schema-auth";

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

export const svLocalRankValidityEnum = pgEnum("sv_local_rank_validity", ["VALID", "INVALID", "UNMEASURED"]);

export const svLocalKeywords = pgTable(
	"sv_local_keywords",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		locationId: uuid("location_id")
			.notNull()
			.references(() => svBusinessLocations.id),
		text: text("text").notNull(),
		normalizedText: text("normalized_text").notNull(),
		language: text("language").notNull(),
		status: text("status").notNull().default("PROPOSED"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		locationKeywordUnique: uniqueIndex("sv_local_keywords_location_text_language_unique").on(
			table.locationId,
			table.normalizedText,
			table.language,
		),
		idLocationUnique: uniqueIndex("sv_local_keywords_id_location_unique").on(table.id, table.locationId),
		orgLocationIdx: index("sv_local_keywords_org_location_idx").on(table.organizationId, table.locationId),
	}),
).enableRLS();

export const svGridDefinitions = pgTable(
	"sv_grid_definitions",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		locationId: uuid("location_id")
			.notNull()
			.references(() => svBusinessLocations.id),
		version: integer("version").notNull(),
		pointCount: integer("point_count").notNull(),
		spacingMeters: integer("spacing_meters").notNull(),
		shape: text("shape").notNull(),
		rows: integer("rows").notNull(),
		columns: integer("columns").notNull(),
		centerLatitude: numeric("center_latitude", { precision: 9, scale: 6 }).notNull(),
		centerLongitude: numeric("center_longitude", { precision: 9, scale: 6 }).notNull(),
		formulaVersion: text("formula_version").notNull(),
		immutable: boolean("immutable").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		locationVersionUnique: uniqueIndex("sv_grid_definitions_location_version_unique").on(
			table.locationId,
			table.version,
		),
		idLocationUnique: uniqueIndex("sv_grid_definitions_id_location_unique").on(table.id, table.locationId),
		orgLocationIdx: index("sv_grid_definitions_org_location_idx").on(table.organizationId, table.locationId),
		pointCountCheck: check(
			"sv_grid_definitions_point_count_check",
			sql`${table.pointCount} > 0 AND ${table.pointCount} <= 49 AND ${table.pointCount} = ${table.rows} * ${table.columns}`,
		),
		shapeCheck: check(
			"sv_grid_definitions_shape_check",
			sql`${table.shape} = 'SQUARE' AND ${table.rows} = ${table.columns} AND mod(${table.rows}, 2) = 1`,
		),
		spacingCheck: check("sv_grid_definitions_spacing_check", sql`${table.spacingMeters} > 0`),
	}),
).enableRLS();

export const svGridPoints = pgTable(
	"sv_grid_points",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		gridId: uuid("grid_id")
			.notNull()
			.references(() => svGridDefinitions.id),
		pointIndex: integer("point_index").notNull(),
		latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
		longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		gridPointUnique: uniqueIndex("sv_grid_points_grid_point_unique").on(table.gridId, table.pointIndex),
		idGridUnique: uniqueIndex("sv_grid_points_id_grid_unique").on(table.id, table.gridId),
		orgGridIdx: index("sv_grid_points_org_grid_idx").on(table.organizationId, table.gridId),
		pointIndexCheck: check("sv_grid_points_point_index_check", sql`${table.pointIndex} >= 0`),
		latitudeCheck: check("sv_grid_points_latitude_check", sql`${table.latitude} BETWEEN -90 AND 90`),
		longitudeCheck: check("sv_grid_points_longitude_check", sql`${table.longitude} BETWEEN -180 AND 180`),
	}),
).enableRLS();

export const svLocalScanCycles = pgTable(
	"sv_local_scan_cycles",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		measurementCycleId: uuid("measurement_cycle_id").notNull(),
		domainId: text("domain_id").notNull().default("LOCAL"),
		configurationLockId: uuid("configuration_lock_id")
			.notNull()
			.references(() => svConfigurationLocks.id),
		locationId: uuid("location_id")
			.notNull()
			.references(() => svBusinessLocations.id),
		gridDefinitionId: uuid("grid_definition_id")
			.notNull()
			.references(() => svGridDefinitions.id),
		provider: text("provider").notNull(),
		repeats: integer("repeats").notNull(),
		captureDepth: integer("capture_depth").notNull(),
		expectedObservations: integer("expected_observations").notNull(),
		createdObservations: integer("created_observations").notNull().default(0),
		worstCaseCostUsd: numeric("worst_case_cost_usd", { precision: 12, scale: 6 }).notNull(),
		costSnapshot: jsonb("cost_snapshot").notNull(),
		status: text("status").notNull().default("CREATED"),
		emergencyStoppedAt: timestamp("emergency_stopped_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		measurementCycleUnique: uniqueIndex("sv_local_scan_cycles_measurement_cycle_unique").on(table.measurementCycleId),
		cycleMatrixUnique: uniqueIndex("sv_local_scan_cycles_id_location_grid_unique").on(
			table.id,
			table.locationId,
			table.gridDefinitionId,
		),
		measurementDomainReference: foreignKey({
			columns: [table.measurementCycleId, table.domainId],
			foreignColumns: [svMeasurementCycles.id, svMeasurementCycles.domainId],
			name: "sv_local_scan_cycles_measurement_domain_fk",
		}),
		gridLocationReference: foreignKey({
			columns: [table.gridDefinitionId, table.locationId],
			foreignColumns: [svGridDefinitions.id, svGridDefinitions.locationId],
			name: "sv_local_scan_cycles_grid_location_fk",
		}),
		orgLocationIdx: index("sv_local_scan_cycles_org_location_idx").on(table.organizationId, table.locationId),
		domainCheck: check("sv_local_scan_cycles_domain_check", sql`${table.domainId} = 'LOCAL'`),
		cardinalityCheck: check(
			"sv_local_scan_cycles_cardinality_check",
			sql`${table.expectedObservations} > 0 AND ${table.createdObservations} >= 0 AND ${table.createdObservations} <= ${table.expectedObservations}`,
		),
		shapeCheck: check(
			"sv_local_scan_cycles_shape_check",
			sql`${table.repeats} > 0 AND ${table.captureDepth} >= 0 AND ${table.worstCaseCostUsd} >= 0`,
		),
	}),
).enableRLS();

export const svLocalRankObservations = pgTable(
	"sv_local_rank_observations",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => svLocalScanCycles.id),
		locationId: uuid("location_id")
			.notNull()
			.references(() => svBusinessLocations.id),
		keywordId: uuid("keyword_id")
			.notNull()
			.references(() => svLocalKeywords.id),
		gridDefinitionId: uuid("grid_definition_id")
			.notNull()
			.references(() => svGridDefinitions.id),
		gridPointId: uuid("grid_point_id")
			.notNull()
			.references(() => svGridPoints.id),
		provider: text("provider").notNull(),
		repeatIndex: integer("repeat_index").notNull(),
		validity: svLocalRankValidityEnum("validity").notNull(),
		invalidReason: text("invalid_reason"),
		captureDepth: integer("capture_depth").notNull(),
		captureMode: text("capture_mode").notNull(),
		targetRank: integer("target_rank"),
		attemptCount: integer("attempt_count").notNull().default(1),
		rawReference: text("raw_reference"),
		capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		matrixUnique: uniqueIndex("sv_local_rank_observations_matrix_unique").on(
			table.cycleId,
			table.locationId,
			table.keywordId,
			table.gridPointId,
			table.provider,
			table.repeatIndex,
		),
		cycleMatrixReference: foreignKey({
			columns: [table.cycleId, table.locationId, table.gridDefinitionId],
			foreignColumns: [svLocalScanCycles.id, svLocalScanCycles.locationId, svLocalScanCycles.gridDefinitionId],
			name: "sv_local_rank_observations_cycle_matrix_fk",
		}),
		keywordLocationReference: foreignKey({
			columns: [table.keywordId, table.locationId],
			foreignColumns: [svLocalKeywords.id, svLocalKeywords.locationId],
			name: "sv_local_rank_observations_keyword_location_fk",
		}),
		pointGridReference: foreignKey({
			columns: [table.gridPointId, table.gridDefinitionId],
			foreignColumns: [svGridPoints.id, svGridPoints.gridId],
			name: "sv_local_rank_observations_point_grid_fk",
		}),
		orgCycleIdx: index("sv_local_rank_observations_org_cycle_idx").on(table.organizationId, table.cycleId),
		captureDepthCheck: check("sv_local_rank_observations_capture_depth_check", sql`${table.captureDepth} >= 0`),
		repeatCheck: check("sv_local_rank_observations_repeat_check", sql`${table.repeatIndex} >= 0`),
		attemptCheck: check("sv_local_rank_observations_attempt_check", sql`${table.attemptCount} > 0`),
		rankCheck: check(
			"sv_local_rank_observations_target_rank_check",
			sql`${table.targetRank} IS NULL OR (${table.targetRank} > 0 AND ${table.targetRank} <= ${table.captureDepth})`,
		),
		invalidReasonCheck: check(
			"sv_local_rank_observations_invalid_reason_check",
			sql`(${table.validity} = 'VALID' AND ${table.invalidReason} IS NULL) OR (${table.validity} <> 'VALID' AND ${table.invalidReason} IS NOT NULL)`,
		),
	}),
).enableRLS();

export const svLocalCompetitorObservations = pgTable(
	"sv_local_competitor_observations",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		observationId: uuid("observation_id")
			.notNull()
			.references(() => svLocalRankObservations.id),
		rank: integer("rank").notNull(),
		entityName: text("entity_name").notNull(),
		matchedEntityId: uuid("matched_entity_id").references(() => svEntities.id),
		matchStatus: text("match_status").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		observationRankUnique: uniqueIndex("sv_local_competitor_observations_rank_unique").on(
			table.observationId,
			table.rank,
		),
		orgObservationIdx: index("sv_local_competitor_observations_org_observation_idx").on(
			table.organizationId,
			table.observationId,
		),
		rankCheck: check("sv_local_competitor_observations_rank_check", sql`${table.rank} > 0`),
	}),
).enableRLS();

export const svLocalVisibilityMetrics = pgTable(
	"sv_local_visibility_metrics",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => svLocalScanCycles.id),
		keywordId: uuid("keyword_id")
			.notNull()
			.references(() => svLocalKeywords.id),
		formulaVersion: text("formula_version").notNull(),
		top3Coverage: numeric("top3_coverage", { precision: 9, scale: 8 }),
		top10Coverage: numeric("top10_coverage", { precision: 9, scale: 8 }),
		top20Coverage: numeric("top20_coverage", { precision: 9, scale: 8 }),
		outsideTop20: numeric("outside_top20", { precision: 9, scale: 8 }),
		averageRank: numeric("average_rank", { precision: 12, scale: 6 }),
		foundShare: numeric("found_share", { precision: 9, scale: 8 }),
		shareOfLocalVoice: numeric("share_of_local_voice", { precision: 9, scale: 8 }),
		competitorComparison: jsonb("competitor_comparison").notNull().default({}),
		computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		cycleKeywordFormulaUnique: uniqueIndex("sv_local_visibility_metrics_cycle_keyword_formula_unique").on(
			table.cycleId,
			table.keywordId,
			table.formulaVersion,
		),
		orgCycleIdx: index("sv_local_visibility_metrics_org_cycle_idx").on(table.organizationId, table.cycleId),
	}),
).enableRLS();
