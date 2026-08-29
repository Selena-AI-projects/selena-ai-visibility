/**
 * Publishes a measurement's per-question detail to the marketing site.
 *
 * The journal on the site used to be filled by a person reading a log and
 * typing numbers into a file. That is how the wrong Search Console baseline
 * reached the public pages and stayed there: a human between two systems is a
 * place where numbers change. This script removes the human from the copying
 * and leaves them where they belong — approving the pull request it opens.
 *
 * It writes a file per measurement rather than editing one: a measurement is
 * an event, and a series that overwrites itself cannot be compared with what
 * it replaced.
 *
 * Usage:
 *   DATABASE_URL=postgres://... GITHUB_TOKEN=... \
 *   SELENA_JOURNAL_TENANT=<organization id> \
 *   SELENA_JOURNAL_PROJECTS=korafoodhall \
 *   pnpm -C apps/worker exec tsx src/scripts/publish-journal-detail.ts
 */

import { db } from "@workspace/lib/db/db";
import * as schema from "@workspace/lib/db/schema";
import { journalScenario, journalScenarioSlugs } from "@workspace/lib/selena-journal-scenarios";
import { and, desc, eq, inArray } from "drizzle-orm";

const SITE_REPO = process.env.SELENA_JOURNAL_SITE_REPO?.trim() || "parkourcafe/SELENA-AI-COMPANY";
const SITE_BASE = process.env.SELENA_JOURNAL_SITE_BASE?.trim() || "main";

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		console.error(`${name} is required`);
		process.exit(2);
	}
	return value;
}

const tenantId = required("SELENA_JOURNAL_TENANT");
const token = required("GITHUB_TOKEN");
required("DATABASE_URL");

const requested = (process.env.SELENA_JOURNAL_PROJECTS ?? "").trim();
const slugs =
	requested === "" || requested === "all" ? journalScenarioSlugs : requested.split(",").map((s) => s.trim());
const unknown = slugs.filter((slug) => !journalScenarioSlugs.includes(slug));
if (unknown.length > 0) {
	console.error(`Unknown project(s): ${unknown.join(", ")}`);
	process.exit(2);
}

type Cell = {
	systemId: string;
	answered: boolean;
	mentioned: boolean | null;
	/** Per system, not per question: "who beat us" differs on every surface. */
	namedInstead: string[];
	citedDomains: string[];
};
type Question = { text: string; cells: Cell[]; namedInstead: string[]; citedDomains: string[] };
type Detail = {
	date: string;
	configVersion: string;
	systems: { systemId: string; channel: "VISITOR" | "API" }[];
	questions: Question[];
};

/** Most-frequent first, so the reader meets the name that keeps winning. */
function byFrequency(counts: Map<string, number>, limit: number): string[] {
	return [...counts.entries()]
		.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
		.slice(0, limit)
		.map(([name]) => name);
}

async function detailFor(slug: string): Promise<Detail | null> {
	const scenario = journalScenario(slug);
	// The journal identifies a project by the brand it measures — the same key
	// the measurement run creates it under, so the two cannot drift apart.
	const [project] = await db
		.select({ id: schema.svProjects.id })
		.from(schema.svProjects)
		.where(and(eq(schema.svProjects.organizationId, tenantId), eq(schema.svProjects.name, scenario.brand)))
		.limit(1);
	if (!project) {
		console.log(`${slug}: no project in this tenant`);
		return null;
	}

	// The lock carries the question set's version, so this finds the newest
	// measurement of THIS set rather than the newest measurement of anything.
	const [lock] = await db
		.select({ id: schema.svConfigurationLocks.id })
		.from(schema.svConfigurationLocks)
		.where(
			and(
				eq(schema.svConfigurationLocks.organizationId, tenantId),
				eq(schema.svConfigurationLocks.projectId, project.id),
				eq(schema.svConfigurationLocks.engineSha, scenario.version),
			),
		)
		.orderBy(desc(schema.svConfigurationLocks.createdAt))
		.limit(1);
	if (!lock) {
		console.log(`${slug}: ${scenario.version} was never measured`);
		return null;
	}

	const cycles = await db
		.select({ id: schema.svCycles.id })
		.from(schema.svCycles)
		.where(and(eq(schema.svCycles.organizationId, tenantId), eq(schema.svCycles.lockId, lock.id)));
	if (cycles.length === 0) {
		console.log(`${slug}: the lock has no cycle`);
		return null;
	}

	const runs = await db
		.select({
			scenarioId: schema.svRuns.scenarioId,
			systemId: schema.svRuns.systemId,
			channel: schema.svRuns.channel,
			validity: schema.svRuns.validity,
			mention: schema.svRuns.mention,
			competitors: schema.svRuns.competitors,
			citations: schema.svRuns.citations,
			finishedAt: schema.svRuns.finishedAt,
		})
		.from(schema.svRuns)
		.where(
			and(
				eq(schema.svRuns.organizationId, tenantId),
				inArray(
					schema.svRuns.cycleId,
					cycles.map((cycle) => cycle.id),
				),
			),
		);
	if (runs.length === 0) {
		console.log(`${slug}: the cycle has no runs`);
		return null;
	}

	const scenarioIds = [...new Set(runs.map((run) => run.scenarioId))];
	const scenarioRows = await db
		.select({ id: schema.svScenarios.id, text: schema.svScenarios.text })
		.from(schema.svScenarios)
		.where(inArray(schema.svScenarios.id, scenarioIds));
	const textById = new Map(scenarioRows.map((row) => [row.id, row.text]));

	// Column order is the question set's order of systems, visitor first: what
	// a person is shown belongs before what a model remembers.
	const systems: Detail["systems"] = [];
	for (const run of runs) {
		if (!run.systemId) continue;
		const channel = run.channel === "API_VIEW" ? "API" : "VISITOR";
		if (!systems.some((system) => system.systemId === run.systemId)) {
			systems.push({ systemId: run.systemId, channel });
		}
	}
	systems.sort((left, right) =>
		left.channel === right.channel ? left.systemId.localeCompare(right.systemId) : left.channel === "VISITOR" ? -1 : 1,
	);

	// The published order is the question set's, not the database's: the set is
	// what a re-measurement repeats, so the table has to read the same way twice.
	const questions: Question[] = [];
	for (const text of scenario.questions) {
		const scenarioId = scenarioRows.find((row) => row.text === text)?.id;
		if (!scenarioId) continue;
		const mine = runs.filter((run) => run.scenarioId === scenarioId);
		const cells: Cell[] = systems.map((system) => {
			const run = mine.find((candidate) => candidate.systemId === system.systemId);
			// VALID is the only reading we count. Anything else is an answer we
			// did not get, and an answer we did not get is not an absent brand.
			const answered = run?.validity === "VALID";
			const citations = answered ? ((run?.citations ?? []) as { domain?: string }[]) : [];
			// Only where the brand was absent: "named instead" is a comparison,
			// and a competitor standing beside the brand is not one.
			const competitors = answered && !run?.mention ? ((run?.competitors ?? []) as { name?: string }[]) : [];
			return {
				systemId: system.systemId,
				answered,
				mentioned: answered ? (run?.mention ?? null) : null,
				namedInstead: [...new Set(competitors.map((c) => c.name).filter((n): n is string => !!n))].slice(0, 6),
				citedDomains: [...new Set(citations.map((c) => c.domain).filter((d): d is string => !!d))].slice(0, 6),
			};
		});
		// The question-level roll-up stays for a reader who wants the shape of
		// the whole row at once; the cells are where the evidence lives.
		const competitorCounts = new Map<string, number>();
		const domainCounts = new Map<string, number>();
		for (const cell of cells) {
			for (const name of cell.namedInstead) competitorCounts.set(name, (competitorCounts.get(name) ?? 0) + 1);
			for (const domain of cell.citedDomains) domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
		}
		questions.push({
			text,
			cells,
			namedInstead: byFrequency(competitorCounts, 6),
			citedDomains: byFrequency(domainCounts, 6),
		});
	}

	const finished = runs
		.map((run) => run.finishedAt)
		.filter((value): value is Date => value !== null)
		.sort((left, right) => right.getTime() - left.getTime())[0];
	if (!finished) {
		console.log(`${slug}: no run ever finished`);
		return null;
	}

	return {
		date: finished.toISOString().slice(0, 10),
		configVersion: scenario.version,
		systems,
		questions,
	};
}

async function github(path: string, init?: RequestInit): Promise<Response> {
	return fetch(`https://api.github.com${path}`, {
		...init,
		headers: {
			authorization: `Bearer ${token}`,
			accept: "application/vnd.github+json",
			"content-type": "application/json",
			...(init?.headers ?? {}),
		},
	});
}

async function publish(files: { path: string; content: string }[], branch: string): Promise<string> {
	const baseRef = await github(`/repos/${SITE_REPO}/git/ref/heads/${SITE_BASE}`);
	if (!baseRef.ok) throw new Error(`GITHUB_BASE_REF_FAILED: ${baseRef.status} ${await baseRef.text()}`);
	const { object } = (await baseRef.json()) as { object: { sha: string } };

	const created = await github(`/repos/${SITE_REPO}/git/refs`, {
		method: "POST",
		body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: object.sha }),
	});
	// 422 is the branch already existing, which happens on a second run of the
	// same day and is not a failure.
	if (!created.ok && created.status !== 422)
		throw new Error(`GITHUB_BRANCH_FAILED: ${created.status} ${await created.text()}`);

	for (const file of files) {
		const existing = await github(`/repos/${SITE_REPO}/contents/${file.path}?ref=${branch}`);
		const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined;
		const put = await github(`/repos/${SITE_REPO}/contents/${file.path}`, {
			method: "PUT",
			body: JSON.stringify({
				message: `record the measurement of ${file.path.split("/")[2]}`,
				content: Buffer.from(file.content, "utf8").toString("base64"),
				branch,
				...(sha ? { sha } : {}),
			}),
		});
		if (!put.ok) throw new Error(`GITHUB_WRITE_FAILED ${file.path}: ${put.status} ${await put.text()}`);
		console.log(`  wrote ${file.path}`);
	}

	const pull = await github(`/repos/${SITE_REPO}/pulls`, {
		method: "POST",
		body: JSON.stringify({
			title: `Опубликовать замеры от ${branch.replace("journal/", "")}`,
			head: branch,
			base: SITE_BASE,
			body:
				"Файлы записаны прогоном замера, не человеком.\n\n" +
				files.map((file) => `- \`${file.path}\``).join("\n") +
				"\n\nВ клетке — назвали, не назвали или ответа не было. Прочерк не ноль.\n\n" +
				"---\n_Generated by [Claude Code](https://claude.ai/code)_",
		}),
	});
	if (pull.ok) {
		const { html_url } = (await pull.json()) as { html_url: string };
		return html_url;
	}
	// A pull request already open for this branch is the same answer.
	if (pull.status === 422) return `https://github.com/${SITE_REPO}/pulls`;
	throw new Error(`GITHUB_PULL_FAILED: ${pull.status} ${await pull.text()}`);
}

/**
 * The detail as text, for a result that is held back from the journal.
 *
 * Written to be read by a person in a deploy log and pasted onward, so it
 * stays narrow and puts the two columns that carry the finding — how many
 * systems named the brand, and who they named instead — on the question's own
 * line. A dash is not a zero: a system that never answered is counted apart
 * from one that answered without the brand.
 */
function readable(brand: string, detail: Detail): string {
	const lines: string[] = [
		"",
		`── ${brand} · ${detail.date} · ${detail.configVersion} ${"─".repeat(8)}`,
		`${detail.systems.length} systems: ${detail.systems.map((s) => s.systemId).join(", ")}`,
		"",
	];

	let named = 0;
	let answers = 0;
	let mentions = 0;
	for (const [index, question] of detail.questions.entries()) {
		const answered = question.cells.filter((cell) => cell.answered);
		const hits = answered.filter((cell) => cell.mentioned === true).length;
		const silent = question.cells.length - answered.length;
		answers += answered.length;
		mentions += hits;
		if (hits > 0) named += 1;
		const instead = question.namedInstead.slice(0, 3).join(", ");
		lines.push(
			`${String(index + 1).padStart(2)}. ${hits}/${answered.length}${silent ? ` (${silent} без ответа)` : ""}  ${question.text}`,
		);
		if (instead) lines.push(`      вместо: ${instead}`);
	}

	const domains = new Map<string, number>();
	for (const question of detail.questions) {
		for (const cell of question.cells) {
			for (const domain of cell.citedDomains) domains.set(domain, (domains.get(domain) ?? 0) + 1);
		}
	}
	const top = [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

	lines.push("");
	lines.push(
		`ИТОГО: назван в ${named} из ${detail.questions.length} вопросов, ${mentions} упоминаний в ${answers} ответах`,
	);
	if (top.length > 0) {
		lines.push("Источники, на которые ссылались:");
		for (const [domain, count] of top) lines.push(`  ${String(count).padStart(3)} × ${domain}`);
	}
	lines.push("─".repeat(60));
	return lines.join("\n");
}

async function main(): Promise<void> {
	const files: { path: string; content: string }[] = [];
	for (const slug of slugs) {
		const scenario = journalScenario(slug);
		// Measuring someone else's business is research; publishing it is a claim
		// about them, and the recorded yes is what separates the two.
		if (scenario.ownership === "third-party" && !scenario.consent) {
			console.log(`${scenario.brand}: third-party without a recorded consent — measured, not published`);
			// The result still has to reach the person who ordered the run, or the
			// money bought nothing. Printing it keeps the consent rule intact —
			// the rule is about publishing to the journal, not about looking.
			const held = await detailFor(slug);
			if (held) console.log(readable(scenario.brand, held));
			continue;
		}
		const detail = await detailFor(slug);
		if (!detail) continue;
		files.push({
			path: `data/journal/${slug}/${detail.date}.json`,
			content: `${JSON.stringify(detail, null, 2)}\n`,
		});
		const named = detail.questions.filter((question) => question.cells.some((cell) => cell.mentioned === true)).length;
		console.log(`${scenario.brand}: ${detail.questions.length} questions, named in ${named}`);
	}

	if (files.length === 0) {
		console.log("Nothing to publish.");
		return;
	}

	const date = files[0]?.path.split("/")[3]?.replace(".json", "") ?? "latest";
	console.log(await publish(files, `journal/${date}`));
}

main().then(
	() => process.exit(0),
	(error) => {
		console.error(error);
		process.exit(1);
	},
);
