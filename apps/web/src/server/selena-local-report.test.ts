import type { LocalReportContent } from "@workspace/lib/selena-local-report-publication";
import { describe, expect, it, vi } from "vitest";
import { createSelenaLocalReportRouteHandlers, type LocalReportAuth } from "./selena-local-report";

const cycleId = "00000000-0000-4000-8000-000000000001";
const origin = "https://app.example.invalid";

const customer: LocalReportAuth = {
	actorId: "user-a",
	tenantId: "org-a",
	role: "owner",
	authType: "session",
	permissions: ["client:read", "client:write"],
	platformOperator: false,
};
const operator: LocalReportAuth = { ...customer, actorId: "staff", platformOperator: true };

const content: LocalReportContent = {
	schemaVersion: 1,
	localCycleId: cycleId,
	measurementCycleId: "00000000-0000-4000-8000-000000000002",
	provider: "dataforseo-google-maps",
	generatedAt: "2026-09-26T00:00:00.000Z",
	status: "COMPLETE",
	totals: { expected: 9, terminal: 1, valid: 1, invalid: 0, unknown: 0, blocked: 0, pending: 0 },
	observations: [
		{
			id: "00000000-0000-4000-8000-000000000003",
			pointIndex: 0,
			latitude: -8.5,
			longitude: 115.26,
			keyword: "=hotel ubud",
			language: "en",
			outcome: "FOUND",
			validity: "VALID",
			targetRank: 2,
			capturedAt: "2026-09-26T00:00:00.000Z",
			reason: null,
			evidenceId: "00000000-0000-4000-8000-000000000004",
		},
	],
};

type Call = (input: Record<string, unknown>) => Promise<unknown>;

function handlers(auth: LocalReportAuth | Error, store: { mutate?: Call; read?: Call } = {}) {
	const mutate = vi.fn<Call>(store.mutate ?? (async () => ({ ok: true })));
	const read = vi.fn<Call>(store.read ?? (async () => null));
	const routes = createSelenaLocalReportRouteHandlers({
		authenticate: async () => {
			if (auth instanceof Error) throw auth;
			return auth;
		},
		store: { mutate, read } as never,
		requestId: () => "request-1",
	});
	return { routes, mutate, read };
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
	return new Request(`${origin}${path}`, {
		method: "POST",
		headers: { origin, "idempotency-key": "key-00000001", "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

async function code(response: Response) {
	return ((await response.json()) as { error: { code: string } }).error.code;
}

describe("Local report routes", () => {
	it("refuses a mutation without this site's Origin before touching the store", async () => {
		const { routes, mutate } = handlers(operator);
		for (const headers of [{ origin: "https://evil.example" }, { origin: "" }]) {
			const response = await routes.qc(post("/qc", {}, headers), cycleId);
			expect(response.status).toBe(403);
		}
		expect(mutate).not.toHaveBeenCalled();
	});

	it("answers 401 to an anonymous caller", async () => {
		const { routes } = handlers(new Error("Unauthorized: authenticated session required"));
		const response = await routes.report(new Request(`${origin}/report`), cycleId);
		expect(response.status).toBe(401);
		expect(await code(response)).toBe("UNAUTHENTICATED");
	});

	it("keeps QC, publishing and delivery for Selena operators, even from a tenant owner", async () => {
		const { routes, mutate } = handlers(customer);
		for (const route of [routes.canaryReview, routes.createReport, routes.qc, routes.publish, routes.deliver]) {
			const response = await route(post("/x", {}), cycleId);
			expect(response.status).toBe(403);
			expect(await code(response)).toBe("LOCAL_PLATFORM_OPERATOR_REQUIRED");
		}
		const preview = await routes.preview(new Request(`${origin}/report`), cycleId);
		expect(preview.status).toBe(403);
		expect(mutate).not.toHaveBeenCalled();
	});

	it("lets the report recipient acknowledge delivery without operator rights", async () => {
		const { routes, mutate } = handlers(customer);
		const response = await routes.acknowledge(post("/ack", { deliveryId: cycleId }), cycleId);
		expect(response.status).toBe(200);
		expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ operation: "acknowledge", tenantId: "org-a" }));
	});

	it("scopes a mutation to the session tenant and binds the key to the exact body", async () => {
		const { routes, mutate } = handlers(operator);
		await routes.qc(post("/qc", { note: "a", decision: "APPROVED" }), cycleId);
		await routes.qc(post("/qc", { decision: "APPROVED", note: "a" }), cycleId);
		await routes.qc(post("/qc", { decision: "REJECTED", note: "a" }), cycleId);
		const hashes = mutate.mock.calls.map(([input]) => input.bodyHash);
		expect(hashes[0]).toBe(hashes[1]);
		expect(hashes[2]).not.toBe(hashes[0]);
		expect(mutate.mock.calls[0][0]).toMatchObject({ tenantId: "org-a", cycleId, idempotencyKey: "key-00000001" });
	});

	it("requires an Idempotency-Key and a signed-in session for mutations", async () => {
		const { routes } = handlers(operator);
		const noKey = await routes.qc(post("/qc", {}, { "idempotency-key": "" }), cycleId);
		expect(noKey.status).toBe(400);
		const apiKey = handlers({ ...operator, authType: "api_key" });
		expect((await apiKey.routes.qc(post("/qc", {}), cycleId)).status).toBe(403);
	});

	it("answers 404 for another tenant's cycle, a malformed id, or a disabled feature", async () => {
		for (const message of ["LOCAL_CYCLE_NOT_FOUND", "LOCAL_VISIBILITY_DISABLED"]) {
			const { routes } = handlers(operator, {
				mutate: async () => {
					throw new Error(message);
				},
			});
			expect((await routes.publish(post("/publish", {}), cycleId)).status).toBe(404);
		}
		const { routes, mutate } = handlers(operator);
		expect((await routes.publish(post("/publish", {}), "not-a-uuid")).status).toBe(404);
		expect(mutate).not.toHaveBeenCalled();
		expect((await routes.report(new Request(`${origin}/report`), cycleId)).status).toBe(404);
	});

	it("rejects a reused key with a different body and a recipient outside the tenant", async () => {
		const conflict = handlers(operator, {
			mutate: async () => {
				throw new Error("IDEMPOTENCY_BODY_CONFLICT");
			},
		});
		expect((await conflict.routes.qc(post("/qc", {}), cycleId)).status).toBe(409);
		const outsider = handlers(operator, {
			mutate: async () => {
				throw new Error("LOCAL_MEMBERSHIP_REQUIRED");
			},
		});
		expect((await outsider.routes.deliver(post("/deliver", {}), cycleId)).status).toBe(403);
	});

	it("serves the published report as a spreadsheet-safe CSV and a sandboxed print page", async () => {
		const { routes } = handlers(customer, { read: async () => ({ content, externalAudits: [] }) });
		const csv = await routes.report(new Request(`${origin}/report?download=csv`), cycleId);
		expect(csv.headers.get("content-disposition")).toContain("attachment");
		expect(await csv.text()).toContain(`"'=hotel ubud"`);
		const print = await routes.report(new Request(`${origin}/report?download=print`), cycleId);
		expect(print.headers.get("content-security-policy")).toContain("sandbox");
		expect(print.headers.get("content-type")).toContain("text/html");
	});
});
