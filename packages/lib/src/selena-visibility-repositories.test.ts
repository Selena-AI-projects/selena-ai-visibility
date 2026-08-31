import type { SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import * as schema from "./db/schema";
import {
	createSelenaRepositories,
	cycleProgressAfterRunCompletion,
	type SelenaRepositoryContext,
} from "./selena-visibility-repositories";

const context: SelenaRepositoryContext = {
	actorId: "actor-1",
	tenantId: "tenant-1",
	role: "owner",
	authType: "session",
	permissions: ["client:write"],
};

const input = {
	projectId: "11111111-1111-4111-8111-111111111111",
	snapshot: { measurementScope: {} },
	engineSha: "engine-1",
	expectedRuns: 1,
	budgetCap: "0",
};

function allocationDb(options: { latest?: number; projectOwned?: boolean; insertWins?: boolean } = {}) {
	const inserted: Record<string, unknown>[] = [];
	const conflictTargets: unknown[][] = [];
	const events: string[] = [];
	const execute = vi.fn(async (statement: unknown) => {
		const query = new PgDialect().sqlToQuery(statement as SQL);
		events.push(query.sql.includes("set_config") ? "tenant-context" : "advisory-lock");
	});
	let selectCall = 0;
	const tx = {
		execute,
		select: vi.fn(() => {
			selectCall += 1;
			if (selectCall === 1) {
				const projectQuery = {
					from: () => projectQuery,
					where: () => projectQuery,
					limit: async () => {
						events.push("project-check");
						return options.projectOwned === false ? [] : [{ id: input.projectId }];
					},
				};
				return projectQuery;
			}
			const versionQuery = {
				from: () => versionQuery,
				where: async () => {
					events.push("read-version");
					return [{ version: options.latest ?? 0 }];
				},
			};
			return versionQuery;
		}),
		insert: vi.fn(() => {
			let row: Record<string, unknown> = {};
			const insertQuery = {
				values: (value: Record<string, unknown>) => {
					events.push("insert");
					row = value;
					inserted.push(value);
					return insertQuery;
				},
				onConflictDoNothing: (options: { target: unknown[] }) => {
					conflictTargets.push(options.target);
					return insertQuery;
				},
				returning: async () => (options.insertWins === false ? [] : [{ id: "lock-1", createdAt: new Date(0), ...row }]),
			};
			return insertQuery;
		}),
	};
	const transaction = vi.fn(async (work: (runner: typeof tx) => Promise<unknown>) => work(tx));
	const db = { transaction } as unknown as NodePgDatabase<typeof schema>;
	return { db, execute, events, inserted, conflictTargets, transaction };
}

function observationReviewDb(options: { reviewed?: boolean; failAudit?: boolean } = {}) {
	const observation = {
		id: "22222222-2222-4222-8222-222222222222",
		organizationId: context.tenantId,
		captureTaskId: "33333333-3333-4333-8333-333333333333",
		reviewStatus: options.reviewed ? "ACCEPTED" : "SUBMITTED_FOR_REVIEW",
		validity: options.reviewed ? "VALID" : null,
		invalidReason: null as string | null,
		reviewedBy: options.reviewed ? context.actorId : null,
		reviewedAt: options.reviewed ? new Date(0) : null,
	};
	const task = {
		id: observation.captureTaskId,
		organizationId: context.tenantId,
		status: options.reviewed ? "ACCEPTED" : "SUBMITTED_FOR_REVIEW",
		updatedAt: new Date(0),
	};
	const audits: Array<{
		organizationId: string;
		event: string;
		subjectId: string;
		details: Record<string, unknown>;
	}> = [];
	const lockCalls: Array<{ mode: string; table: unknown }> = [];
	const whereStatements: Array<{ statement: unknown; table: unknown }> = [];
	const dialect = new PgDialect();
	const compiled = (statement: unknown) => dialect.sqlToQuery(statement as SQL);
	const columnValue = (statement: unknown, column: string) => {
		const query = compiled(statement);
		const match = query.sql.match(new RegExp(`"${column}" = \\$([0-9]+)`));
		return match ? query.params[Number(match[1]) - 1] : undefined;
	};
	const jsonTextValue = (statement: unknown, key: string) => {
		const query = compiled(statement);
		const match = query.sql.match(new RegExp(`->> '${key}' = \\$([0-9]+)`));
		return match ? query.params[Number(match[1]) - 1] : undefined;
	};

	const tx = {
		execute: vi.fn(async () => undefined),
		select: vi.fn(() => {
			let table: unknown;
			let predicate: unknown;
			const query = {
				from: (value: unknown) => {
					table = value;
					return query;
				},
				where: (statement: unknown) => {
					predicate = statement;
					whereStatements.push({ statement, table });
					return query;
				},
				for: (mode: string) => {
					lockCalls.push({ mode, table });
					return query;
				},
				limit: async () => {
					if (!predicate) return [];
					if (table === schema.svLocalObservations) {
						const id = columnValue(predicate, "id");
						const organizationId = columnValue(predicate, "organization_id");
						return id === observation.id && organizationId === observation.organizationId ? [{ ...observation }] : [];
					}
					if (table === schema.svCaptureTasks) {
						const id = columnValue(predicate, "id");
						const organizationId = columnValue(predicate, "organization_id");
						return id === task.id && organizationId === task.organizationId ? [{ ...task }] : [];
					}
					if (table === schema.svAuditEvents) {
						const organizationId = columnValue(predicate, "organization_id");
						const event = columnValue(predicate, "event");
						const subjectId = columnValue(predicate, "subject_id");
						const idempotencyKey = jsonTextValue(predicate, "idempotencyKey");
						return audits.filter(
							(audit) =>
								organizationId === audit.organizationId &&
								event === audit.event &&
								subjectId === audit.subjectId &&
								idempotencyKey === audit.details.idempotencyKey,
						);
					}
					return [];
				},
			};
			return query;
		}),
		update: vi.fn((table: unknown) => {
			let values: Record<string, unknown> = {};
			let predicate: unknown;
			const query = {
				set: (value: Record<string, unknown>) => {
					values = value;
					return query;
				},
				where: (statement: unknown) => {
					predicate = statement;
					whereStatements.push({ statement, table });
					return query;
				},
				returning: async () => {
					if (!predicate) return [];
					if (table === schema.svLocalObservations) {
						const id = columnValue(predicate, "id");
						const organizationId = columnValue(predicate, "organization_id");
						const reviewStatus = columnValue(predicate, "review_status");
						if (
							id !== observation.id ||
							organizationId !== observation.organizationId ||
							reviewStatus !== observation.reviewStatus
						)
							return [];
						Object.assign(observation, values);
						return [{ ...observation }];
					}
					if (table === schema.svCaptureTasks) {
						const id = columnValue(predicate, "id");
						const organizationId = columnValue(predicate, "organization_id");
						const status = columnValue(predicate, "status");
						if (id !== task.id || organizationId !== task.organizationId || status !== task.status) return [];
						Object.assign(task, values);
						return [{ id: task.id }];
					}
					return [];
				},
			};
			return query;
		}),
		insert: vi.fn((table: unknown) => ({
			values: async (value: {
				organizationId: string;
				event: string;
				subjectId: string;
				details: Record<string, unknown>;
			}) => {
				if (table !== schema.svAuditEvents) throw new Error("TEST_UNEXPECTED_INSERT");
				if (options.failAudit) throw new Error("TEST_AUDIT_FAILURE");
				audits.push(value);
			},
		})),
	};
	const transaction = vi.fn(async (work: (runner: typeof tx) => Promise<unknown>) => {
		const before = {
			observation: { ...observation },
			task: { ...task },
			audits: [...audits],
		};
		try {
			return await work(tx);
		} catch (error) {
			Object.assign(observation, before.observation);
			Object.assign(task, before.task);
			audits.splice(0, audits.length, ...before.audits);
			throw error;
		}
	});
	const db = { transaction } as unknown as NodePgDatabase<typeof schema>;
	return { audits, db, lockCalls, observation, task, transaction, whereStatements };
}

describe("configuration lock allocation", () => {
	it("allocates max plus one under one transaction and accepts the matching expected version", async () => {
		const fake = allocationDb({ latest: 4 });
		const lock = await createSelenaRepositories(fake.db).locks.allocate(context, {
			...input,
			expectedVersion: 5,
		});

		expect(fake.transaction).toHaveBeenCalledTimes(1);
		expect(fake.execute).toHaveBeenCalledTimes(2);
		expect(fake.events).toEqual(["tenant-context", "project-check", "advisory-lock", "read-version", "insert"]);
		const statement = fake.execute.mock.calls[1]?.[0];
		expect(statement && new PgDialect().sqlToQuery(statement as SQL).sql).toContain("pg_advisory_xact_lock");
		expect(lock.version).toBe(5);
		expect(fake.inserted).toEqual([
			expect.objectContaining({
				projectId: input.projectId,
				organizationId: context.tenantId,
				createdBy: context.actorId,
				version: 5,
			}),
		]);
		expect(fake.inserted[0]).not.toHaveProperty("expectedVersion");
		expect(fake.conflictTargets[0]).toEqual([
			schema.svConfigurationLocks.projectId,
			schema.svConfigurationLocks.version,
		]);
	});

	it("rejects a stale expected version without inserting or retrying", async () => {
		const fake = allocationDb({ latest: 4 });
		await expect(
			createSelenaRepositories(fake.db).locks.allocate(context, { ...input, expectedVersion: 4 }),
		).rejects.toThrow("SELENA_CONFIGURATION_LOCK_VERSION_CONFLICT");

		expect(fake.transaction).toHaveBeenCalledTimes(1);
		expect(fake.inserted).toHaveLength(0);
	});

	it("fails closed when the int4 version space is exhausted", async () => {
		const fake = allocationDb({ latest: 2_147_483_647 });
		await expect(createSelenaRepositories(fake.db).locks.allocate(context, input)).rejects.toThrow(
			"SELENA_CONFIGURATION_LOCK_VERSION_EXHAUSTED",
		);
		expect(fake.inserted).toHaveLength(0);
	});

	it("turns an unexpected unique loser into a stable conflict without retrying", async () => {
		const fake = allocationDb({ latest: 1, insertWins: false });
		await expect(createSelenaRepositories(fake.db).locks.allocate(context, input)).rejects.toThrow(
			"SELENA_CONFIGURATION_LOCK_VERSION_CONFLICT",
		);
		expect(fake.transaction).toHaveBeenCalledTimes(1);
		expect(fake.inserted).toHaveLength(1);
	});

	it("checks project tenancy inside the transaction before reading or inserting locks", async () => {
		const fake = allocationDb({ projectOwned: false });
		await expect(createSelenaRepositories(fake.db).locks.allocate(context, input)).rejects.toThrow(
			"Not found: project is outside AuthContext tenant",
		);
		expect(fake.transaction).toHaveBeenCalledTimes(1);
		expect(fake.inserted).toHaveLength(0);
	});
});

describe("manual observation review", () => {
	it("commits one locked observation/task transition and replays the same idempotency key", async () => {
		const fake = observationReviewDb();
		const repository = createSelenaRepositories(fake.db);
		const input = { decision: "ACCEPTED" as const, idempotencyKey: "review-key-1" };

		const first = await repository.observations.review(context, fake.observation.id, input);
		const replay = await repository.observations.review(context, fake.observation.id, input);

		expect(first.reviewStatus).toBe("ACCEPTED");
		expect(replay.reviewStatus).toBe("ACCEPTED");
		expect(fake.observation.reviewStatus).toBe("ACCEPTED");
		expect(fake.task.status).toBe("ACCEPTED");
		expect(fake.audits).toHaveLength(1);
		expect(fake.lockCalls).toEqual([
			{ mode: "update", table: schema.svLocalObservations },
			{ mode: "update", table: schema.svCaptureTasks },
			{ mode: "update", table: schema.svLocalObservations },
			{ mode: "update", table: schema.svCaptureTasks },
		]);
		const compiledPredicates = fake.whereStatements.map(({ statement }) =>
			new PgDialect().sqlToQuery(statement as SQL),
		);
		expect(
			compiledPredicates.some(
				({ sql, params }) => sql.includes('"organization_id"') && params.includes(context.tenantId),
			),
		).toBe(true);
		expect(
			compiledPredicates.some(
				({ sql, params }) => sql.includes("->> 'idempotencyKey'") && params.includes(input.idempotencyKey),
			),
		).toBe(true);
		expect(
			compiledPredicates.some(
				({ sql, params }) => sql.includes('"review_status"') && params.includes("SUBMITTED_FOR_REVIEW"),
			),
		).toBe(true);
		expect(
			compiledPredicates.some(({ sql, params }) => sql.includes('"status"') && params.includes("SUBMITTED_FOR_REVIEW")),
		).toBe(true);
	});

	it("rejects a changed decision for an already-used idempotency key", async () => {
		const fake = observationReviewDb();
		const repository = createSelenaRepositories(fake.db);
		await repository.observations.review(context, fake.observation.id, {
			decision: "ACCEPTED",
			idempotencyKey: "review-key-1",
		});

		await expect(
			repository.observations.review(context, fake.observation.id, {
				decision: "REJECTED",
				idempotencyKey: "review-key-1",
			}),
		).rejects.toThrow("OBSERVATION_REVIEW_IDEMPOTENCY_CONFLICT");
		expect(fake.observation.reviewStatus).toBe("ACCEPTED");
		expect(fake.task.status).toBe("ACCEPTED");
	});

	it("rejects a changed reason for an already-used idempotency key", async () => {
		const fake = observationReviewDb();
		const repository = createSelenaRepositories(fake.db);
		await repository.observations.review(context, fake.observation.id, {
			decision: "REJECTED",
			reason: "wrong location",
			idempotencyKey: "review-key-1",
		});

		await expect(
			repository.observations.review(context, fake.observation.id, {
				decision: "REJECTED",
				reason: "wrong language",
				idempotencyKey: "review-key-1",
			}),
		).rejects.toThrow("OBSERVATION_REVIEW_IDEMPOTENCY_CONFLICT");
		expect(fake.observation.reviewStatus).toBe("REJECTED");
		expect(fake.task.status).toBe("REJECTED");
		expect(fake.audits).toHaveLength(1);
	});

	it("does not replay an audit receipt for another idempotency key", async () => {
		const fake = observationReviewDb();
		const repository = createSelenaRepositories(fake.db);
		await repository.observations.review(context, fake.observation.id, {
			decision: "ACCEPTED",
			idempotencyKey: "review-key-1",
		});

		await expect(
			repository.observations.review(context, fake.observation.id, {
				decision: "ACCEPTED",
				idempotencyKey: "review-key-2",
			}),
		).rejects.toThrow("OBSERVATION_ALREADY_REVIEWED");
	});

	it("does not expose an observation across the tenant fence", async () => {
		const fake = observationReviewDb();
		await expect(
			createSelenaRepositories(fake.db).observations.review({ ...context, tenantId: "tenant-2" }, fake.observation.id, {
				decision: "ACCEPTED",
				idempotencyKey: "review-key-1",
			}),
		).rejects.toThrow("Not found: observation is outside AuthContext tenant");
		expect(fake.observation.reviewStatus).toBe("SUBMITTED_FOR_REVIEW");
	});

	it("rolls observation and task state back when the audit write fails", async () => {
		const fake = observationReviewDb({ failAudit: true });
		await expect(
			createSelenaRepositories(fake.db).observations.review(context, fake.observation.id, {
				decision: "ACCEPTED",
				idempotencyKey: "review-key-1",
			}),
		).rejects.toThrow("TEST_AUDIT_FAILURE");

		expect(fake.observation.reviewStatus).toBe("SUBMITTED_FOR_REVIEW");
		expect(fake.task.status).toBe("SUBMITTED_FOR_REVIEW");
		expect(fake.audits).toHaveLength(0);
	});

	it("does not rewrite a final observation without its original replay receipt", async () => {
		const fake = observationReviewDb({ reviewed: true });
		await expect(
			createSelenaRepositories(fake.db).observations.review(context, fake.observation.id, {
				decision: "REJECTED",
			}),
		).rejects.toThrow("OBSERVATION_ALREADY_REVIEWED");
		expect(fake.observation.reviewStatus).toBe("ACCEPTED");
		expect(fake.task.status).toBe("ACCEPTED");
	});
});

describe("cycleProgressAfterRunCompletion", () => {
	it("advances an active cycle without completing it", () => {
		expect(cycleProgressAfterRunCompletion({ status: "QUEUED", completedRuns: 0, expectedRuns: 3 })).toEqual({
			status: "RUNNING",
			completedRuns: 1,
			cycleDone: false,
		});
	});

	it("moves an active cycle to QC when the expected run count completes", () => {
		expect(cycleProgressAfterRunCompletion({ status: "RUNNING", completedRuns: 2, expectedRuns: 3 })).toEqual({
			status: "QC_REQUIRED",
			completedRuns: 3,
			cycleDone: true,
		});
	});

	it("does not revive a stopped cycle when an in-flight run finishes late", () => {
		expect(cycleProgressAfterRunCompletion({ status: "STOPPED", completedRuns: 2, expectedRuns: 3 })).toEqual({
			status: "STOPPED",
			completedRuns: 3,
			cycleDone: true,
		});
	});

	it.each(["INVALID", "FAILED"] as const)(
		"stops a Perplexity cycle when a %s run reports a contract rejection",
		(runStatus) => {
			expect(
				cycleProgressAfterRunCompletion({
					status: "RUNNING",
					completedRuns: 0,
					expectedRuns: 25,
					systemId: "Perplexity",
					runStatus,
					invalidReason: "PROVIDER_HTTP_400",
				}),
			).toEqual({ status: "STOPPED", completedRuns: 1, cycleDone: false });
		},
	);

	it.each(["TIMEOUT", "SNAPSHOT_NOT_READY", "EMPTY_RESPONSE", "MALFORMED_RESPONSE", "PROVIDER_HTTP_502"])(
		"keeps a Perplexity cycle running through an isolated %s failure",
		(invalidReason) => {
			expect(
				cycleProgressAfterRunCompletion({
					status: "RUNNING",
					completedRuns: 0,
					expectedRuns: 25,
					systemId: "Perplexity",
					runStatus: "INVALID",
					invalidReason,
				}),
			).toEqual({ status: "RUNNING", completedRuns: 1, cycleDone: false });
		},
	);

	it("keeps a successful Perplexity cycle running and does not widen the breaker to other systems", () => {
		expect(
			cycleProgressAfterRunCompletion({
				status: "RUNNING",
				completedRuns: 0,
				expectedRuns: 25,
				systemId: "Perplexity",
				runStatus: "SUCCEEDED",
			}),
		).toMatchObject({ status: "RUNNING" });
		expect(
			cycleProgressAfterRunCompletion({
				status: "RUNNING",
				completedRuns: 0,
				expectedRuns: 25,
				systemId: "ChatGPT",
				runStatus: "INVALID",
			}),
		).toMatchObject({ status: "RUNNING" });
	});

	it.each(["ANALYZING", "QC_REQUIRED", "READY", "FAILED", "CARDINALITY_INCIDENT"] as const)(
		"preserves the forward-only %s state",
		(status) => {
			expect(cycleProgressAfterRunCompletion({ status, completedRuns: 1, expectedRuns: 3 })).toEqual({
				status,
				completedRuns: 2,
				cycleDone: false,
			});
		},
	);
});
