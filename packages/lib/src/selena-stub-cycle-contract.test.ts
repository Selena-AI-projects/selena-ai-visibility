import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../scripts/selena-stub-cycle.ts", import.meta.url), "utf8");

describe("stub rehearsal fixture retention", () => {
	it("retains random local fixtures when append-only evidence guards are active", () => {
		expect(source).toContain("appendOnlyGuardsPresent");
		expect(source).toContain("sv_prevent_configuration_lock_mutation");
		expect(source).toContain("sv_prevent_cost_event_mutation");
		expect(source).toContain("Fixture retained: append-only cost/lock guards are active");
		expect(source).not.toContain("DISABLE TRIGGER");
	});

	it("counts cleanup rejection as a failed rehearsal before choosing the exit code", () => {
		const ending = source.slice(source.indexOf("main()"));
		expect(ending).toContain('console.error("Fixture cleanup failed:", error)');
		expect(ending).toMatch(/Fixture cleanup failed:[\s\S]*?failures \+= 1/);
		expect(ending).toContain("process.exit(failures === 0 ? 0 : 1)");
	});
});
