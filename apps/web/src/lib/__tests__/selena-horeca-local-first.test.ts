import type { HorecaLocalFirstReadModel } from "@workspace/selena-visibility-contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SelenaHorecaLocalFirst } from "../../components/selena-horeca-local-first";
import { buildHorecaLocalFirstPreview, HORECA_PREVIEW_AREAS } from "../selena-horeca-local-first";

function visibleText(html: string): string {
	return html
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

describe("HoReCa local-first customer preview", () => {
	it("keeps the six business navigation areas in the approved order", () => {
		expect(HORECA_PREVIEW_AREAS.map((area) => area.id)).toEqual([
			"overview",
			"visibility",
			"evidence",
			"competitors",
			"actions",
			"outcomes",
		]);
	});

	it("does not unlock Local AI when Local Maps is enabled", () => {
		const modules = buildHorecaLocalFirstPreview(true, "2026-08-31T05:00:00.000Z").modules;
		expect(modules.find((module) => module.moduleId === "LOCAL_MAPS")?.state).toBe("UNKNOWN");
		expect(modules.find((module) => module.moduleId === "LOCAL_AI")?.state).toBe("LOCKED");
	});

	it("does not expose CONFIGURED_ONLY or a composite score", () => {
		const preview = buildHorecaLocalFirstPreview(false, "2026-08-31T05:00:00.000Z");
		const modules = preview.modules;
		expect(modules.some((module) => (module.state as string) === "CONFIGURED_ONLY")).toBe(false);
		expect(preview).not.toHaveProperty("compositeScore");
	});

	it("keeps each measurement surface in an independent row", () => {
		const ids = buildHorecaLocalFirstPreview(false, "2026-08-31T05:00:00.000Z").modules.map(
			(module) => module.moduleId,
		);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toEqual([
			"AI_ANSWERS",
			"SEARCH",
			"LOCAL_MAPS",
			"LOCAL_AI",
			"REPUTATION",
			"SOCIAL",
			"TRAVEL",
			"OUTCOMES",
		]);
	});

	it("keeps unapproved Social and Travel modules hidden", () => {
		const modules = buildHorecaLocalFirstPreview(false, "2026-08-31T05:00:00.000Z").modules;
		expect(modules.find((module) => module.moduleId === "SOCIAL")?.state).toBe("HIDDEN");
		expect(modules.find((module) => module.moduleId === "TRAVEL")?.state).toBe("HIDDEN");
	});

	it("renders the five Local-first business signals in equivalent English and Russian views", () => {
		const preview = buildHorecaLocalFirstPreview(false, "2026-08-31T05:00:00.000Z");
		const english = renderToStaticMarkup(SelenaHorecaLocalFirst({ locale: "en", model: preview }));
		const russian = renderToStaticMarkup(SelenaHorecaLocalFirst({ locale: "ru", model: preview }));
		for (const label of [
			"Visibility coverage",
			"Readiness evidence",
			"Competitor observations",
			"Evidence gaps",
			"Action blockers",
		]) {
			expect(english).toContain(label);
		}
		for (const label of [
			"Охват видимости",
			"Доказательства готовности",
			"Наблюдения о конкурентах",
			"Пробелы в доказательствах",
			"Блокеры действий",
		]) {
			expect(russian).toContain(label);
		}
		expect(english).toContain("Phase: Not confirmed");
		expect(english).toContain("AI answer visibility is measured separately from search and maps.");
		expect(russian).toContain("Не измерено — принятые данные не подключены.");
		expect(russian).toContain("Этап: Не подтверждено");
		expect(russian).toContain("Видимость в ответах AI измеряется отдельно от поиска и карт.");
		expect(russian).not.toContain("Not measured — no accepted data is connected.");
		expect(russian).not.toContain("AI answer visibility is measured separately from search and maps.");
	});

	it("renders accepted measurements and linked decision records from the read model", () => {
		const preview = buildHorecaLocalFirstPreview(false, "2026-08-31T05:00:00.000Z");
		const model: HorecaLocalFirstReadModel = {
			...preview,
			modules: preview.modules.map((module) =>
				module.moduleId === "LOCAL_MAPS"
					? {
							...module,
							state: "ACTIVE",
							summary: {
								kind: "MEASURED_SHARE",
								sampleBasis: "ACCEPTED_ONLY",
								numerator: 3,
								denominator: 5,
								invalidCount: 1,
								capturedAt: "2026-08-31T04:00:00.000Z",
								datasetVersion: "local-v1",
							},
							evidenceIds: ["evidence-1"],
							configurationLockReference: "comparison-basis-1",
							limitations: ["Five accepted checks only."],
						}
					: module,
			),
			evidence: [
				{
					id: "evidence-1",
					domain: "MAPS",
					accessClass: "PUBLIC",
					sourceLabel: "Accepted local sample",
					capturedAt: "2026-08-31T04:00:00.000Z",
					sourceReference: "source:local-sample",
					snapshotReference: "snapshot:local-sample",
					acceptance: { status: "ACCEPTED", acceptedAt: "2026-08-31T04:30:00.000Z" },
				},
			],
			findings: [
				{
					id: "finding-1",
					area: "EVIDENCE",
					statement: "The local sample was accepted.",
					status: "OBSERVED",
					evidenceIds: ["evidence-1"],
				},
				{
					id: "finding-gap",
					area: "EVIDENCE",
					statement: "The address still conflicts across accepted sources.",
					status: "CONFLICT",
					evidenceIds: ["evidence-1"],
				},
			],
			competitors: [
				{
					id: "competitor-1",
					competitorLabel: "Named comparison",
					surface: "LOCAL_MAPS",
					reason: "Observed in the same accepted sample.",
					evidenceIds: ["evidence-1"],
				},
			],
			actions: [
				{
					id: "action-1",
					findingIds: ["finding-1"],
					action: "Verify the location facts.",
					owner: "Business owner",
					priority: "NOW",
					status: "READY",
					evidenceIds: ["evidence-1"],
					verificationPlan: "Repeat the accepted check after correction.",
				},
				{
					id: "action-blocked",
					findingIds: ["finding-gap"],
					action: "Resolve the address conflict.",
					owner: "Business owner",
					priority: "NOW",
					status: "BLOCKED",
					evidenceIds: ["evidence-1"],
					verificationPlan: "Recheck both accepted sources after owner confirmation.",
				},
			],
			outcomes: [
				{
					id: "outcome-1",
					level: "OBSERVED",
					statement: "Direction requests were observed.",
					status: "MEASURED",
					evidenceIds: ["evidence-1"],
					integrationProofReference: null,
				},
				{
					id: "outcome-readiness",
					level: "READINESS",
					statement: "The directions path is ready for verification.",
					status: "MEASURED",
					evidenceIds: ["evidence-1"],
					integrationProofReference: null,
				},
			],
		};

		const html = renderToStaticMarkup(SelenaHorecaLocalFirst({ locale: "en", model }));
		const text = visibleText(html);
		for (const signal of [
			"Visibility coverage 1",
			"Readiness evidence 1",
			"Competitor observations 1",
			"Evidence gaps 1",
			"Action blockers 1",
		]) {
			expect(text).toContain(signal);
		}
		expect(html).toContain("Observed in 3 of 5 accepted checks");
		expect(html).toContain("Accepted local sample");
		expect(html).toContain("The local sample was accepted.");
		expect(html).toContain("Named comparison");
		expect(html).toContain("Verify the location facts.");
		expect(html).toContain("Direction requests were observed.");
		expect(text).toContain("Public source");
		expect(text).toContain("Conflict");
		expect(text).toContain("Priority: Now · Status: Ready");
		expect(text).toContain("Priority: Now · Status: Blocked");
		expect(text).toContain("Observed outcome · Measured");
		expect(text).toContain("Readiness · Measured");

		const russianHtml = renderToStaticMarkup(SelenaHorecaLocalFirst({ locale: "ru", model }));
		const russianText = visibleText(russianHtml);
		expect(russianText).toContain("Публичный источник");
		expect(russianText).toContain("Конфликт");
		expect(russianText).toContain("Приоритет: Сейчас · Статус: Готово");
		expect(russianText).toContain("Приоритет: Сейчас · Статус: Заблокировано");
		expect(russianText).toContain("Наблюдаемый результат · Измерено");
		expect(russianText).toContain("Готовность · Измерено");
		expect(russianText).not.toContain("Priority: now");
		expect(russianText).not.toContain("observed · measured");
		expect(russianText).not.toContain("readiness · measured");
	});

	it("does not render Social or Travel records while those modules are hidden", () => {
		const preview = buildHorecaLocalFirstPreview(false, "2026-08-31T05:00:00.000Z");
		const model: HorecaLocalFirstReadModel = {
			...preview,
			evidence: [
				{
					id: "social-evidence",
					domain: "SOCIAL",
					accessClass: "PUBLIC",
					sourceLabel: "Hidden social source",
					capturedAt: "2026-08-31T04:00:00.000Z",
					sourceReference: "source:hidden-social",
					snapshotReference: "snapshot:hidden-social",
					acceptance: { status: "ACCEPTED", acceptedAt: "2026-08-31T04:30:00.000Z" },
				},
			],
			competitors: [
				{
					id: "travel-competitor",
					competitorLabel: "Hidden travel comparison",
					surface: "TRAVEL",
					reason: "Must remain hidden.",
					evidenceIds: ["social-evidence"],
				},
			],
		};

		const html = renderToStaticMarkup(SelenaHorecaLocalFirst({ locale: "en", model }));
		const russianHtml = renderToStaticMarkup(SelenaHorecaLocalFirst({ locale: "ru", model }));
		expect(html).not.toContain("Hidden social source");
		expect(html).not.toContain("Hidden travel comparison");
		expect(visibleText(html)).not.toMatch(/social|travel/i);
		expect(visibleText(russianHtml)).not.toMatch(/социальн|турист/i);
	});
});
