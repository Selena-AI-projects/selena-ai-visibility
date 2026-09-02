import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("private evidence application boundary", () => {
	it("does not return or render storage/provider locators in run explorer", () => {
		const server = readFileSync(new URL("../../server/selena-run-explorer.ts", import.meta.url), "utf8");
		const workspace = readFileSync(new URL("../../routes/_authed/app/selena.tsx", import.meta.url), "utf8");
		expect(server).not.toContain("rawResponseReference: run.rawResponseReference");
		expect(workspace).not.toContain("detail.rawResponseReference");
	});

	it("keeps mediated raw evidence access in its dedicated server boundary", () => {
		const rawEvidence = readFileSync(new URL("../../server/selena-raw-evidence.ts", import.meta.url), "utf8");
		expect(rawEvidence).toContain("presignEvidenceUrl");
		expect(rawEvidence).toContain("evidenceObjectKey(run.rawResponseReference)");
	});
});
