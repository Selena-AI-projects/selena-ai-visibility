/**
 * /api/setup-status - Lightweight health check for local instance setup
 *
 * Returns whether the DB is reachable and migrations have run, and which
 * commit is serving. Used by the error page to distinguish "still setting up"
 * from real errors, and by a deploy smoke check to tell which build answered:
 * the package version is the same on both sides of a merge, the commit is not.
 */
import { createFileRoute } from "@tanstack/react-router";
import { db } from "@workspace/lib/db/db";

export async function setupStatusResponse(
	probe: () => Promise<unknown>,
	env: Record<string, string | undefined> = process.env,
): Promise<Response> {
	let ready = true;
	try {
		await probe();
	} catch {
		ready = false;
	}
	const sha = env.RAILWAY_GIT_COMMIT_SHA?.trim();
	return Response.json({ ready, commit: sha ? sha.slice(0, 12) : null });
}

export const Route = createFileRoute("/api/setup-status/")({
	server: {
		handlers: {
			GET: () => setupStatusResponse(() => db.query.brands.findFirst()),
		},
	},
});
