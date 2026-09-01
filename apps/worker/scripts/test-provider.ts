#!/usr/bin/env tsx
/**
 * Integration test for scraping provider targets.
 * Exercises the same code paths as the worker against real provider APIs.
 * Validates text content, citations, and rawOutput round-trip re-extraction.
 *
 * Usage:
 *   SELENA_PROVIDER_TEST_SPEND_AUTHORIZED=true SELENA_MEASUREMENT_ENABLED=true \
 *   SELENA_EMERGENCY_STOP=false pnpm tsx scripts/test-provider.ts \
 *   --target "chatgpt:olostep:online" --output-json result.json
 */

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { getModelMeta } from "@workspace/config/models";
import { getProvider, type Provider, parseScrapeTargets, type ScrapeResult } from "@workspace/lib/providers";
import { extractCitations, extractTextContent } from "@workspace/lib/text-extraction";
import { escapeGitHubSummaryTableCell } from "./github-summary";

const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function log(message: string, color?: string) {
	console.log(`${color || ""}${message}${colors.reset}`);
}

interface ParsedArgs {
	target?: string;
	outputJson?: string;
	dump?: string;
}

export interface AuthorizedProviderTestRun {
	target: string;
	outputJson?: string;
	dump?: string;
}

type ProviderTestEnvironment = Record<string, string | undefined>;
type ProviderResolver = (id: string) => Pick<Provider, "run">;

const PROVIDER_TEST_SPEND_AUTH_ENV = "SELENA_PROVIDER_TEST_SPEND_AUTHORIZED";

function assertProviderTestEnvironment(environment: ProviderTestEnvironment): void {
	if (environment[PROVIDER_TEST_SPEND_AUTH_ENV] !== "true")
		throw new Error("PROVIDER_TEST_SPEND_AUTHORIZATION_REQUIRED");
	if (environment.SELENA_MEASUREMENT_ENABLED !== "true") throw new Error("PROVIDER_TEST_MEASUREMENT_GATE_REQUIRED");
	if (environment.SELENA_EMERGENCY_STOP !== "false") throw new Error("PROVIDER_TEST_EMERGENCY_STOP_MUST_BE_FALSE");
}

function parseArgs(argv: readonly string[]): ParsedArgs {
	let target: string | undefined;
	let outputJson: string | undefined;
	let dump: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--target" && argv[i + 1]) {
			target = argv[++i];
			continue;
		}
		if (argv[i] === "--output-json" && argv[i + 1]) {
			outputJson = argv[++i];
			continue;
		}
		if (argv[i] === "--dump" && argv[i + 1]) {
			dump = argv[++i];
			continue;
		}
		throw new Error(`PROVIDER_TEST_ARGUMENT_INVALID:${argv[i]}`);
	}
	return { target, outputJson, dump };
}

/** Authorize one manual, one-attempt provider probe before resolving a provider or credential. */
export function authorizeProviderTestRun(
	argv: readonly string[],
	environment: ProviderTestEnvironment = process.env,
): AuthorizedProviderTestRun {
	assertProviderTestEnvironment(environment);

	const { target, outputJson, dump } = parseArgs(argv);
	const targets = target
		?.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	if (targets?.length !== 1) throw new Error("PROVIDER_TEST_EXACTLY_ONE_TARGET_REQUIRED");
	if (parseScrapeTargets(target).length !== 1) throw new Error("PROVIDER_TEST_EXACTLY_ONE_TARGET_REQUIRED");
	return { target: targets[0], outputJson, dump };
}

function formatLatency(ms: number): string {
	if (ms < 10_000) return `${(ms / 1000).toFixed(3)}s`;
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds}s`;
	return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
}

// One prompt is one provider attempt. Quality failure never authorizes another call.
const TEST_PROMPT = "What is a well-reviewed speaker that was released last month?";
const MIN_TEXT_LENGTH = 50;

// Provider/model combos where web queries aren't reported even though web search happens
function hasRealWebQueries(queries: string[]): boolean {
	return queries.length > 0 && !queries.every((q) => q === "unavailable");
}

interface ValidationIssue {
	field: string;
	message: string;
	severity: "error" | "warning";
}

export interface TargetResult {
	target: string;
	status: "pass" | "fail";
	latency: number;
	retries: number;
	error?: string;
	textLength: number;
	rawOutputBytes: number;
	citations: number;
	webQueries: number;
	webSearch: boolean;
	sampleOutput: string;
	issues: ValidationIssue[];
	timestamp: string;
}

function validateResult(result: ScrapeResult, providerId: string, webSearch: boolean): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	if (!result.textContent || result.textContent.length < MIN_TEXT_LENGTH) {
		issues.push({
			field: "textContent",
			message: `Text too short (${result.textContent?.length ?? 0} chars, need ${MIN_TEXT_LENGTH}+)`,
			severity: "error",
		});
	}

	if (result.textContent?.startsWith("No text content") || result.textContent?.startsWith("Error extracting")) {
		issues.push({
			field: "textContent",
			message: `Extraction returned placeholder: "${result.textContent.slice(0, 60)}"`,
			severity: "error",
		});
	}

	if (result.rawOutput == null) {
		issues.push({ field: "rawOutput", message: "rawOutput is null", severity: "error" });
	}

	if (result.rawOutput != null) {
		const reExtracted = extractTextContent(result.rawOutput, providerId);
		if (
			reExtracted.startsWith("No text content") ||
			reExtracted.startsWith("Unknown") ||
			reExtracted.startsWith("Error")
		) {
			issues.push({
				field: "rawOutput re-extraction",
				message: `extractTextContent(rawOutput, "${providerId}") returned: "${reExtracted.slice(0, 80)}"`,
				severity: "error",
			});
		}

		const reExtractedCitations = extractCitations(result.rawOutput, providerId);
		if (result.citations.length > 0 && reExtractedCitations.length === 0) {
			issues.push({
				field: "rawOutput citation re-extraction",
				message: `Provider returned ${result.citations.length} citations but extractCitations(rawOutput, "${providerId}") found 0`,
				severity: "warning",
			});
		}
	}

	if (result.citations.length === 0) {
		issues.push({
			field: "citations",
			message: webSearch
				? "No citations returned (expected when online)"
				: "No citations returned (may be expected for some engines/prompts)",
			severity: webSearch ? "error" : "warning",
		});
	}

	if (webSearch && !hasRealWebQueries(result.webQueries)) {
		const isUnavailable = result.webQueries.some((q) => q === "unavailable");
		issues.push({
			field: "webQueries",
			message: isUnavailable
				? "Web queries unavailable (not exposed by this provider)"
				: "No web queries returned (expected when online)",
			severity: isUnavailable ? "warning" : "error",
		});
	}

	for (const [i, cit] of result.citations.entries()) {
		if (!cit.url?.startsWith("http")) {
			issues.push({ field: `citations[${i}].url`, message: `Invalid URL: "${cit.url}"`, severity: "error" });
		}
		if (!cit.domain) {
			issues.push({ field: `citations[${i}].domain`, message: "Missing domain", severity: "error" });
		}
	}

	return issues;
}

export async function runProviderTargetOnce(
	target: string,
	dumpDir?: string,
	resolveProvider: ProviderResolver = getProvider,
	environment: ProviderTestEnvironment = process.env,
): Promise<{ result: TargetResult; logs: string }> {
	assertProviderTestEnvironment(environment);
	if (parseScrapeTargets(target).length !== 1) throw new Error("PROVIDER_TEST_EXACTLY_ONE_TARGET_REQUIRED");
	const buffered: string[] = [];
	const tlog = (message: string, color?: string) => {
		buffered.push(`${color || ""}${message}${colors.reset}`);
	};

	const [config] = parseScrapeTargets(target);
	const providerId = config.provider;
	const provider = resolveProvider(providerId);
	const meta = getModelMeta(config.model);
	const versionStr = config.version ? ` (${config.version})` : "";

	tlog(`\nTesting: ${meta.label} via ${providerId}${versionStr}`, colors.bright);
	tlog(`Web search: ${config.webSearch ? "enabled" : "disabled"}`, colors.dim);
	tlog(`Test prompt: "${TEST_PROMPT}"`, colors.dim);
	tlog(`Validating: text content (${MIN_TEXT_LENGTH}+ chars), citations, rawOutput re-extraction\n`, colors.dim);

	const attemptStart = Date.now();
	let result: ScrapeResult;
	const retries = 0;
	try {
		result = await provider.run(config.model, TEST_PROMPT, {
			webSearch: config.webSearch,
			version: config.version,
		});
	} catch (error) {
		const latency = Date.now() - attemptStart;
		const errorMsg = error instanceof Error ? error.message : String(error);
		tlog(`FAIL (${formatLatency(latency)})`, colors.red);
		tlog(`  Error: ${errorMsg}`, colors.red);
		return {
			result: {
				target,
				status: "fail",
				latency,
				retries: 0,
				error: errorMsg,
				textLength: 0,
				rawOutputBytes: 0,
				citations: 0,
				webQueries: 0,
				webSearch: config.webSearch,
				sampleOutput: "",
				issues: [],
				timestamp: new Date().toISOString(),
			},
			logs: buffered.join("\n"),
		};
	}

	const latency = Date.now() - attemptStart;
	const rawJson = JSON.stringify(result.rawOutput ?? null, null, 2);
	const rawOutputBytes = Buffer.byteLength(rawJson);
	const issues = validateResult(result, providerId, config.webSearch);
	const hasErrors = issues.some((i) => i.severity === "error");

	if (dumpDir) {
		mkdirSync(dumpDir, { recursive: true });
		const filename = `${dumpDir}/${target.replace(/[/:]/g, "-")}.json`;
		writeFileSync(filename, rawJson);
		tlog(`Dumped raw output to ${filename}`, colors.dim);
	}

	tlog(`Latency:      ${formatLatency(latency)}`, colors.dim);
	tlog(`Text:         ${result.textContent?.length ?? 0} chars`, colors.dim);
	tlog(`Raw output:   ${(rawOutputBytes / 1024).toFixed(1)} KB`, colors.dim);
	tlog(`Citations:    ${result.citations.length}`, colors.blue);
	tlog(`Web queries:  ${result.webQueries.length}`, colors.dim);

	if (result.textContent) {
		tlog("\nSample output:", colors.dim);
		tlog(`  ${result.textContent.slice(0, 300).replace(/\n/g, "\n  ")}`, colors.dim);
	}

	if (issues.length > 0) {
		tlog("\nIssues:", colors.bright);
		for (const issue of issues) {
			const color = issue.severity === "error" ? colors.red : colors.yellow;
			const prefix = issue.severity === "error" ? "ERROR" : "WARN";
			tlog(`  ${prefix}: [${issue.field}] ${issue.message}`, color);
		}
	}

	tlog("");

	if (hasErrors) {
		tlog("FAIL", colors.red);
	} else {
		tlog("PASS", colors.green);
	}

	return {
		result: {
			target,
			status: hasErrors ? "fail" : "pass",
			latency,
			retries,
			textLength: result.textContent?.length ?? 0,
			rawOutputBytes,
			citations: result.citations.length,
			webQueries: result.webQueries.length,
			webSearch: config.webSearch,
			sampleOutput: result.textContent?.slice(0, 500) ?? "",
			issues,
			timestamp: new Date().toISOString(),
		},
		logs: buffered.join("\n"),
	};
}

function writeGitHubSummary(results: TargetResult[]) {
	if (!process.env.GITHUB_STEP_SUMMARY) return;

	const passed = results.filter((r) => r.status === "pass").length;
	const failed = results.filter((r) => r.status === "fail").length;
	const total = results.length;
	const overallStatus = failed > 0 ? `:x: ${failed} failed` : `:white_check_mark: All passed`;

	const lines: string[] = [
		`## Provider Test Results — ${overallStatus} (${passed}/${total})`,
		"",
		"| Status | Target | Latency | Error | Text | Raw Output | Citations | Web Queries | Web Search | Sample Output |",
		"|--------|--------|---------|-------|------|------------|-----------|-------------|------------|---------------|",
	];

	for (const r of results) {
		const status = r.status === "pass" ? ":white_check_mark:" : ":x:";
		const error = r.error ? escapeGitHubSummaryTableCell(r.error.slice(0, 100)) : "";
		const rawKB = `${(r.rawOutputBytes / 1024).toFixed(1)} KB`;
		const sample = r.sampleOutput
			? `<details><summary>Show</summary><pre>${escapeGitHubSummaryTableCell(r.sampleOutput)}</pre></details>`
			: "";
		lines.push(
			`| ${status} | <code>${escapeGitHubSummaryTableCell(r.target)}</code> | ${formatLatency(r.latency)} | ${error} | ${r.textLength} | ${rawKB} | ${r.citations} | ${r.webQueries} | ${r.webSearch ? "enabled" : "disabled"} | ${sample} |`,
		);
	}

	const allIssues = results.flatMap((r) => r.issues.map((i) => ({ target: r.target, ...i })));

	if (allIssues.length > 0) {
		lines.push("", "### Validation Issues", "");
		lines.push("| Severity | Target | Field | Issue |");
		lines.push("|----------|--------|-------|-------|");
		for (const i of allIssues) {
			const icon = i.severity === "error" ? ":x:" : ":warning:";
			lines.push(
				`| ${icon} | <code>${escapeGitHubSummaryTableCell(i.target)}</code> | <code>${escapeGitHubSummaryTableCell(i.field)}</code> | ${escapeGitHubSummaryTableCell(i.message)} |`,
			);
		}
	}

	lines.push("");
	appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
}

function printUsage(): void {
	console.log(`
Usage: pnpm tsx scripts/test-provider.ts --target <model:provider[:version][:online]> [--output-json <path>] [--dump <path>]

Runs exactly one target and one provider attempt. Execution also requires:
  SELENA_PROVIDER_TEST_SPEND_AUTHORIZED=true
  SELENA_MEASUREMENT_ENABLED=true
  SELENA_EMERGENCY_STOP=false
`);
}

async function main() {
	const argv = process.argv.slice(2);
	if (argv.includes("--help") || argv.includes("-h")) {
		printUsage();
		return;
	}
	const { target, outputJson, dump } = authorizeProviderTestRun(argv);
	const { result, logs } = await runProviderTargetOnce(target, dump);
	process.stdout.write(`${logs}\n`);
	const results = [result];

	const passed = results.filter((r) => r.status === "pass").length;
	const failed = results.filter((r) => r.status === "fail").length;
	log(`Result: ${passed} passed, ${failed} failed`, failed > 0 ? colors.red : colors.green);

	if (outputJson) {
		writeFileSync(outputJson, JSON.stringify(results, null, 2));
	}
	writeGitHubSummary(results);

	if (failed > 0) process.exit(1);
}

const isDirectRun = process.argv[1]?.endsWith("/test-provider.ts") || process.argv[1]?.endsWith("/test-provider.js");
if (isDirectRun) {
	main().catch((err) => {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	});
}
