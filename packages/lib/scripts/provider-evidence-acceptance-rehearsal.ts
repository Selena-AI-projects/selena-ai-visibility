import { strict as assert } from "node:assert";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { type AcceptProviderEvidenceInput, acceptProviderEvidence } from "../src/db/provider-evidence-acceptance";
import * as schema from "../src/db/schema";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("PROVIDER_EVIDENCE_REHEARSAL_DATABASE_URL_REQUIRED");

const pool = new Pool({ connectionString: databaseUrl, max: 8 });
const database = drizzle(pool, { schema });
const nativeObservationRef = "provider-native:shared-observation-1";

type Graph = Readonly<{
	organizationId: string;
	projectId: string;
	lockId: string;
	cycleId: string;
	datasetId: string;
	capabilityId: string;
	snapshotId: string;
	domainId: "AI" | "LOCAL_MAPS";
	source: string;
	datasetKey: string;
	providerDatasetId: string;
	providerSnapshotId: string;
	environment: "STAGING_ACCEPTANCE" | "ISOLATED_CANARY";
	capabilityDomain: "AI" | "ENTITY";
}>;

const graphA: Graph = {
	organizationId: "formal-evidence-org-a",
	projectId: "11000000-0000-4000-8000-000000000001",
	lockId: "11000000-0000-4000-8000-000000000002",
	cycleId: "11000000-0000-4000-8000-000000000003",
	datasetId: "11000000-0000-4000-8000-000000000004",
	capabilityId: "11000000-0000-4000-8000-000000000005",
	snapshotId: "11000000-0000-4000-8000-000000000006",
	domainId: "AI",
	source: "GOOGLE_AI_MODE",
	datasetKey: "google-ai-mode-answers-a",
	providerDatasetId: "formal-google-ai-a",
	providerSnapshotId: "formal-snapshot-a",
	environment: "STAGING_ACCEPTANCE",
	capabilityDomain: "AI",
};

const graphB: Graph = {
	organizationId: "formal-evidence-org-b",
	projectId: "22000000-0000-4000-8000-000000000001",
	lockId: "22000000-0000-4000-8000-000000000002",
	cycleId: "22000000-0000-4000-8000-000000000003",
	datasetId: "22000000-0000-4000-8000-000000000004",
	capabilityId: "22000000-0000-4000-8000-000000000005",
	snapshotId: "22000000-0000-4000-8000-000000000006",
	domainId: "AI",
	source: "GOOGLE_AI_MODE",
	datasetKey: "google-ai-mode-answers-b",
	providerDatasetId: "formal-google-ai-b",
	providerSnapshotId: "formal-snapshot-b",
	environment: "STAGING_ACCEPTANCE",
	capabilityDomain: "AI",
};

const localMapsGraph: Graph = {
	organizationId: graphA.organizationId,
	projectId: "11000000-0000-4000-8000-000000000011",
	lockId: "11000000-0000-4000-8000-000000000012",
	cycleId: "11000000-0000-4000-8000-000000000013",
	datasetId: "11000000-0000-4000-8000-000000000014",
	capabilityId: "11000000-0000-4000-8000-000000000015",
	snapshotId: "11000000-0000-4000-8000-000000000016",
	domainId: "LOCAL_MAPS",
	source: "GOOGLE_MAPS_PLACE",
	datasetKey: "google-maps-place-entity",
	providerDatasetId: "formal-google-maps-place",
	providerSnapshotId: "formal-maps-snapshot",
	environment: "STAGING_ACCEPTANCE",
	capabilityDomain: "ENTITY",
};

const canaryGraph: Graph = {
	organizationId: graphA.organizationId,
	projectId: "11000000-0000-4000-8000-000000000021",
	lockId: "11000000-0000-4000-8000-000000000022",
	cycleId: "11000000-0000-4000-8000-000000000023",
	datasetId: "11000000-0000-4000-8000-000000000024",
	capabilityId: "11000000-0000-4000-8000-000000000025",
	snapshotId: "11000000-0000-4000-8000-000000000026",
	domainId: "AI",
	source: "GOOGLE_AI_MODE_CANARY_FIXTURE",
	datasetKey: "google-ai-mode-canary-fixture",
	providerDatasetId: "formal-google-ai-canary",
	providerSnapshotId: "formal-canary-snapshot",
	environment: "ISOLATED_CANARY",
	capabilityDomain: "AI",
};

const blockedGraph: Graph = {
	organizationId: graphB.organizationId,
	projectId: "22000000-0000-4000-8000-000000000011",
	lockId: "22000000-0000-4000-8000-000000000012",
	cycleId: "22000000-0000-4000-8000-000000000013",
	datasetId: "22000000-0000-4000-8000-000000000014",
	capabilityId: "22000000-0000-4000-8000-000000000015",
	snapshotId: "22000000-0000-4000-8000-000000000016",
	domainId: "AI",
	source: "GOOGLE_AI_MODE_BLOCKED_FIXTURE",
	datasetKey: "google-ai-mode-blocked-fixture",
	providerDatasetId: "formal-google-ai-blocked",
	providerSnapshotId: "formal-blocked-snapshot",
	environment: "STAGING_ACCEPTANCE",
	capabilityDomain: "AI",
};

function hash(seed: string): string {
	return `sha256:${seed.padStart(64, "0").slice(-64)}`;
}

async function seedOrganization(client: PoolClient, organizationId: string): Promise<void> {
	await client.query(
		"INSERT INTO organization (id, name, slug, created_at) VALUES ($1, $2, $1, clock_timestamp()) ON CONFLICT (id) DO NOTHING",
		[organizationId, organizationId],
	);
}

async function seedGraph(client: PoolClient, graph: Graph, ordinal: number): Promise<void> {
	await seedOrganization(client, graph.organizationId);
	await client.query(
		"INSERT INTO sv_measurement_domains (domain_id, unit_of_measure) VALUES ($1, 'fixture') ON CONFLICT (domain_id) DO NOTHING",
		[graph.domainId],
	);
	await client.query(
		"INSERT INTO sv_projects (id, organization_id, name, category, country, languages, status) VALUES ($1, $2, $3, 'fixture', 'ID', ARRAY['en'], 'DRAFT')",
		[graph.projectId, graph.organizationId, `Formal Evidence ${ordinal}`],
	);
	await client.query(
		"INSERT INTO sv_configuration_locks (id, organization_id, project_id, version, snapshot, engine_sha, expected_runs, budget_cap, created_by) VALUES ($1, $2, $3, 1, '{}'::jsonb, 'fixture', 1, 0, 'fixture')",
		[graph.lockId, graph.organizationId, graph.projectId],
	);
	await client.query(
		"INSERT INTO sv_measurement_cycles (id, organization_id, domain_id, domain_cycle_id, configuration_lock_id, status) VALUES ($1, $2, $3, $4, $5, 'COMPLETED')",
		[graph.cycleId, graph.organizationId, graph.domainId, graph.cycleId, graph.lockId],
	);
	await client.query(
		"INSERT INTO sv_measurement_datasets (id, organization_id, cycle_id, dataset_key, version) VALUES ($1, $2, $3, $4, 1)",
		[graph.datasetId, graph.organizationId, graph.cycleId, graph.datasetKey],
	);
	await client.query(
		`INSERT INTO sv_provider_dataset_capabilities (
			id, organization_id, provider, source, surface, domain, entity_type,
			dataset_env_key, input_schema_version, output_schema_version, access_class,
			capability_status, retention_class, contract_version, version, contract_metadata
		) VALUES ($1, $2, 'BRIGHT_DATA', $3, $3, $4, 'FIXTURE', $5,
			'fixture-input-v1', 'fixture-output-v1', 'PUBLIC', 'PILOT_ONLY',
			'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 1, '{}'::jsonb)`,
		[graph.capabilityId, graph.organizationId, graph.source, graph.capabilityDomain, `FIXTURE_DATASET_${ordinal}`],
	);
	for (const [eventIndex, phase] of ["TRIGGERED", "READY", "DELIVERED"].entries()) {
		await client.query(
			`INSERT INTO sv_provider_dataset_snapshot_events (
				organization_id, project_id, provider, source, provider_dataset_id,
				snapshot_id, phase, provider_status, record_count, observed_at, event_hash
			) VALUES ($1, $2, 'BRIGHT_DATA', $3, $4, $5, $6,
				CASE WHEN $6 = 'READY' THEN 'ready' ELSE NULL END,
				CASE WHEN $6 = 'DELIVERED' THEN 1 ELSE NULL END,
				clock_timestamp() - interval '10 minutes' + ($7::int * interval '1 second'), $8)`,
			[
				graph.organizationId,
				graph.projectId,
				graph.source,
				graph.providerDatasetId,
				graph.providerSnapshotId,
				phase,
				eventIndex,
				hash(`${ordinal}${eventIndex + 1}`),
			],
		);
	}
	await client.query(
		`INSERT INTO sv_source_snapshots (
			id, organization_id, project_id, source_type, source_ref, content_sha256, snapshot,
			capability_id, provider_dataset_ref, environment, raw_reference,
			input_schema_version, output_schema_version, captured_at
		) VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, $7, $8, $9, $10,
			'fixture-input-v1', 'fixture-output-v1', clock_timestamp() - interval '15 minutes')`,
		[
			graph.snapshotId,
			graph.organizationId,
			graph.projectId,
			graph.source,
			`private:${graph.providerSnapshotId}`,
			hash(`${ordinal === 3 ? 1 : ordinal}9`),
			graph.capabilityId,
			graph.providerDatasetId,
			graph.environment,
			`brightdata:snapshot:${graph.providerSnapshotId}`,
		],
	);
}

function input(graph: Graph): AcceptProviderEvidenceInput {
	return {
		organizationId: graph.organizationId,
		projectId: graph.projectId,
		domainId: graph.domainId,
		cycleId: graph.cycleId,
		datasetId: graph.datasetId,
		datasetKey: graph.datasetKey,
		datasetVersion: 1,
		sourceSnapshotId: graph.snapshotId,
		nativeObservationRef,
		expectedSource: graph.source,
		expectedOutputSchemaVersion: "fixture-output-v1",
		dryRun: false,
	};
}

async function counts(): Promise<{ evidence: number; acceptance: number; audit: number; runs: number; cost: number }> {
	const result = await pool.query<{
		evidence: string;
		acceptance: string;
		audit: string;
		runs: string;
		cost: string;
	}>(`SELECT
		(SELECT count(*) FROM sv_evidence_index WHERE organization_id LIKE 'formal-evidence-org-%') AS evidence,
		(SELECT count(*) FROM sv_evidence_acceptance_receipts WHERE organization_id LIKE 'formal-evidence-org-%') AS acceptance,
		(SELECT count(*) FROM sv_audit_events WHERE organization_id LIKE 'formal-evidence-org-%' AND event = 'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED') AS audit,
		(SELECT count(*) FROM sv_runs WHERE organization_id LIKE 'formal-evidence-org-%') AS runs,
		(SELECT count(*) FROM sv_cost_events WHERE organization_id LIKE 'formal-evidence-org-%') AS cost`);
	const row = result.rows[0];
	if (!row) throw new Error("PROVIDER_EVIDENCE_REHEARSAL_COUNTS_MISSING");
	return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as Awaited<
		ReturnType<typeof counts>
	>;
}

async function expectRejected(promise: Promise<unknown>, code: string): Promise<void> {
	await assert.rejects(promise, (error: unknown) => {
		let current: unknown = error;
		while (current instanceof Error) {
			if (current.message.includes(code)) return true;
			current = (current as Error & { cause?: unknown }).cause;
		}
		return false;
	});
}

async function main(): Promise<void> {
	const client = await pool.connect();
	try {
		await seedGraph(client, graphA, 1);
		await seedGraph(client, graphB, 2);
		await seedGraph(client, localMapsGraph, 3);
		await seedGraph(client, canaryGraph, 4);
		await seedGraph(client, blockedGraph, 5);
	} finally {
		client.release();
	}

	const baseline = await counts();
	assert.deepEqual(baseline, { evidence: 0, acceptance: 0, audit: 0, runs: 0, cost: 0 });
	await expectRejected(
		pool.query(
			`INSERT INTO sv_evidence_index (
				organization_id, project_id, domain_id, cycle_id, observation_ref,
				dataset_id, source_snapshot_id, captured_at
			) VALUES ($1, $2, $3, $4, 'cross-project-direct-sql', $5, NULL, clock_timestamp())`,
			[
				graphA.organizationId,
				localMapsGraph.projectId,
				graphA.domainId,
				graphA.cycleId,
				graphA.datasetId,
			],
		),
		"PROVIDER_DATASET_EVIDENCE_PROJECT_MISMATCH",
	);

	const dryRun = await acceptProviderEvidence(database, { ...input(graphA), dryRun: true });
	assert.equal(dryRun.status, "DRY_RUN_ROLLED_BACK");
	assert.deepEqual(await counts(), baseline);

	const concurrent = await Promise.all([
		acceptProviderEvidence(database, input(graphA)),
		acceptProviderEvidence(database, input(graphA)),
	]);
	assert.deepEqual(concurrent.map((receipt) => receipt.status).sort(), ["ACCEPTED", "ALREADY_ACCEPTED"]);
	assert.deepEqual(await counts(), { evidence: 1, acceptance: 1, audit: 1, runs: 0, cost: 0 });

	const replay = await acceptProviderEvidence(database, input(graphA));
	assert.equal(replay.status, "ALREADY_ACCEPTED");
	assert.deepEqual(await counts(), { evidence: 1, acceptance: 1, audit: 1, runs: 0, cost: 0 });

	const crossTenant = await acceptProviderEvidence(database, input(graphB));
	assert.equal(crossTenant.status, "ACCEPTED");
	assert.deepEqual(await counts(), { evidence: 2, acceptance: 2, audit: 2, runs: 0, cost: 0 });

	await expectRejected(
		acceptProviderEvidence(database, { ...input(graphA), projectId: localMapsGraph.projectId }),
		"PROVIDER_EVIDENCE_ACCEPTANCE_SNAPSHOT_NOT_ELIGIBLE",
	);
	await expectRejected(
		acceptProviderEvidence(database, input(canaryGraph)),
		"EVIDENCE_ACCEPTANCE_ENVIRONMENT_NOT_APPROVED",
	);

	const localMaps = await acceptProviderEvidence(database, input(localMapsGraph));
	assert.equal(localMaps.status, "ACCEPTED");
	assert.deepEqual(await counts(), { evidence: 3, acceptance: 3, audit: 3, runs: 0, cost: 0 });
	const acceptedEvidence = await pool.query<{ id: string }>(
		"SELECT id::text FROM sv_evidence_index WHERE organization_id = $1 AND project_id = $2",
		[graphA.organizationId, graphA.projectId],
	);
	const acceptedEvidenceId = acceptedEvidence.rows[0]?.id;
	assert.ok(acceptedEvidenceId);
	await expectRejected(
		pool.query(
			`INSERT INTO sv_audit_events (
				organization_id, actor_id, event, subject_kind, subject_id, details
			) VALUES ($1, 'system:provider-evidence-acceptance',
				'PROVIDER_EVIDENCE_FORMALLY_ACCEPTED', 'evidence', $2,
				'{"providerCalls":0}'::jsonb)`,
			[graphA.organizationId, acceptedEvidenceId],
		),
		"FORMAL_EVIDENCE_AUDIT_DETAILS_INVALID",
	);
	assert.deepEqual(await counts(), { evidence: 3, acceptance: 3, audit: 3, runs: 0, cost: 0 });

	await pool.query(
		`INSERT INTO sv_provider_dataset_capabilities (
			organization_id, provider, source, surface, domain, entity_type, dataset_env_key,
			input_schema_version, output_schema_version, access_class, capability_status,
			retention_class, contract_version, version, contract_metadata
		) VALUES ($1, 'BRIGHT_DATA', $2, $2, 'AI', 'FIXTURE', 'FIXTURE_BLOCKED',
			'fixture-input-v1', 'fixture-output-v1', 'PUBLIC', 'BLOCKED',
			'RAW_PRIVATE_POLICY_PENDING', 'provider-dataset-v1.3', 2, '{}'::jsonb)`,
		[blockedGraph.organizationId, blockedGraph.source],
	);
	await expectRejected(
		acceptProviderEvidence(database, input(blockedGraph)),
		"EVIDENCE_ACCEPTANCE_CAPABILITY_SUPERSEDED_BY_BLOCK",
	);
	assert.deepEqual(await counts(), { evidence: 3, acceptance: 3, audit: 3, runs: 0, cost: 0 });

	for (const receipt of [dryRun, ...concurrent, replay, crossTenant, localMaps]) {
		assert.equal(receipt.providerCalls, 0);
		assert.equal(receipt.costRows, 0);
		assert.equal(receipt.recurring, false);
	}

	process.stdout.write(
		"FORMAL_EVIDENCE_ACCEPTANCE_PASS dryRun=rollback concurrent=deterministic crossTenant=isolated crossProject=blocked canary=blocked localMaps=accepted evidence=3 acceptance=3 audit=3 providerCalls=0 costRows=0 recurring=false\n",
	);
}

main().finally(() => pool.end());
