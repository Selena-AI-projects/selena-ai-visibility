import { beforeEach, describe, expect, it, vi } from "vitest";

const { handlerFetch, startCredentialRefresh } = vi.hoisted(() => ({
	handlerFetch: vi.fn(),
	startCredentialRefresh: vi.fn(),
}));

vi.mock("../instrument.server.mjs", () => ({}));
vi.mock("@sentry/tanstackstart-react", () => ({
	wrapFetchWithSentry: (entry: unknown) => entry,
}));
vi.mock("@tanstack/react-start/server-entry", () => ({
	default: { fetch: handlerFetch },
	createServerEntry: (entry: unknown) => entry,
}));
vi.mock("@workspace/lib/secrets", () => ({ startCredentialRefresh }));

import serverEntry from "./server";

const fetchFromServerEntry = serverEntry.fetch.bind(serverEntry);

beforeEach(() => {
	handlerFetch.mockReset();
});

describe("web server security headers", () => {
	it("keeps an immutable redirect intact for a malformed double-slash request", async () => {
		const upstream = Response.redirect("https://staging.example.test/auth/login", 307);
		handlerFetch.mockResolvedValueOnce(upstream);

		const response = await fetchFromServerEntry(new Request("https://staging.example.test//wp-admin/install.php"));

		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("https://staging.example.test/auth/login");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(await response.text()).toBe("");
	});

	it("preserves status, body, upstream headers and multiple cookies", async () => {
		const headers = new Headers({ "content-type": "application/json", "x-upstream": "kept" });
		headers.append("set-cookie", "session=one; Path=/; HttpOnly");
		headers.append("set-cookie", "locale=en; Path=/");
		handlerFetch.mockResolvedValueOnce(
			new Response('{"error":"safe"}', { status: 422, statusText: "Unprocessable Content", headers }),
		);

		const response = await fetchFromServerEntry(new Request("https://staging.example.test/api/example"));

		expect(response.status).toBe(422);
		expect(response.statusText).toBe("Unprocessable Content");
		expect(response.headers.get("content-type")).toBe("application/json");
		expect(response.headers.get("x-upstream")).toBe("kept");
		expect(response.headers.getSetCookie()).toEqual(["session=one; Path=/; HttpOnly", "locale=en; Path=/"]);
		expect(response.headers.get("x-frame-options")).toBe("DENY");
		expect(await response.text()).toBe('{"error":"safe"}');
	});
});
