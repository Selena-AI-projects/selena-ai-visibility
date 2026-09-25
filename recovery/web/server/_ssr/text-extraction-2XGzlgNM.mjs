//#region node_modules/.nitro/vite/services/ssr/assets/text-extraction-2XGzlgNM.js
/**
* Functions for extracting text content and citations from stored rawOutput.
*
* Each provider stores rawOutput in a different format. These functions handle
* re-reading that stored data for display in the UI (prompt detail pages, reports).
*
* For new prompt runs, the Provider.run() method normalizes output into ScrapeResult
* at write time, so these functions are primarily for reading historical data.
*/
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "cc4de388-0477-4789-b159-29e8fd226e1b", e._sentryDebugIdIdentifier = "sentry-dbid-cc4de388-0477-4789-b159-29e8fd226e1b");
	} catch (e) {}
})();
function extractTextFromOpenAI(rawOutput) {
	try {
		if (rawOutput?.output && Array.isArray(rawOutput.output)) {
			const messageOutputs = rawOutput.output.filter((item) => item.type === "message");
			if (messageOutputs.length > 0) {
				const texts = [];
				for (const messageOutput of messageOutputs) if (messageOutput.content && Array.isArray(messageOutput.content)) {
					for (const c of messageOutput.content) if (c.type === "output_text" && c.text) texts.push(c.text);
				}
				if (texts.length > 0) return texts.join("\n");
			}
		}
		if (rawOutput?.choices?.[0]?.message?.content) return rawOutput.choices[0].message.content;
		if (typeof rawOutput?.text === "string") return rawOutput.text;
		return "No text content found in OpenAI output.";
	} catch (error) {
		console.error("Error extracting text from OpenAI output:", error);
		return "Error extracting text content.";
	}
}
function extractTextFromAnthropic(rawOutput) {
	try {
		if (rawOutput && Array.isArray(rawOutput.content)) return rawOutput.content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
		return "No text content found in Anthropic output.";
	} catch (error) {
		console.error("Error extracting text from Anthropic output:", error);
		return "Error extracting text content.";
	}
}
function extractTextFromGoogle(rawOutput) {
	return extractTextFromDataforseo(rawOutput);
}
/**
* The `dataforseo` provider routes to three different DataForSEO products, so
* stored rows under that one provider id carry three shapes. The LLM Scraper is
* the one that renders its answer as top-level `markdown` and cites through
* top-level `sources`; neither the LLM Responses nor the SERP results have
* either field.
*/
function isDataforseoScraperResult(result) {
	return typeof result?.markdown === "string" || Array.isArray(result?.sources);
}
function extractTextFromDataforseo(rawOutput) {
	try {
		const result = rawOutput?.tasks?.[0]?.result?.[0];
		if (result) {
			if (isDataforseoScraperResult(result)) return extractTextFromDataforseoScraper(rawOutput);
			const items = result.items || [];
			if (items.some((item) => Array.isArray(item?.sections))) return extractTextFromDataforseoLlm(rawOutput);
			const aiOverviewItems = items.filter((item) => item.type === "ai_overview");
			if (aiOverviewItems.length > 0 && aiOverviewItems[0].markdown) return aiOverviewItems[0].markdown;
		}
		return "No AI overview content found.";
	} catch (error) {
		console.error("Error extracting text from DataForSEO output:", error);
		return "Error extracting text content.";
	}
}
/**
* Text extraction for DataForSEO's AI Optimization "LLM Responses" API
* (chatgpt / perplexity / gemini), which has a different shape from the SERP
* Google AI Mode response handled by extractTextFromDataforseo:
*   tasks[].result[].items[].sections[].{type:"text", text}
* The reasoning items (type "reasoning") are skipped; only message text is kept.
*/
function extractTextFromDataforseoLlm(rawOutput) {
	try {
		const result = rawOutput?.tasks?.[0]?.result?.[0];
		if (!result) return "No text content found in DataForSEO LLM output.";
		const texts = [];
		for (const item of result.items ?? []) {
			if (item?.type === "reasoning") continue;
			for (const section of item?.sections ?? []) if (typeof section?.text === "string" && section.text.trim()) texts.push(section.text.trim());
		}
		if (texts.length) return texts.join("\n");
		return "No text content found in DataForSEO LLM output.";
	} catch (error) {
		console.error("Error extracting text from DataForSEO LLM output:", error);
		return "Error extracting text content.";
	}
}
/**
* Text extraction for DataForSEO's AI Optimization "LLM Scraper" API
* (chatgpt / gemini). The scraped answer arrives pre-rendered as markdown at
* tasks[].result[].markdown; items[] carries the same content split into typed
* blocks (text, tables, product cards), so the top-level field is preferred.
*/
function extractTextFromDataforseoScraper(rawOutput) {
	try {
		const result = rawOutput?.tasks?.[0]?.result?.[0];
		const markdown = result?.markdown;
		if (typeof markdown === "string" && markdown.trim()) return markdown;
		const texts = [];
		for (const item of result?.items ?? []) if (typeof item?.markdown === "string" && item.markdown.trim()) texts.push(item.markdown.trim());
		if (texts.length) return texts.join("\n");
		return "No text content found in DataForSEO Scraper output.";
	} catch (error) {
		console.error("Error extracting text from DataForSEO Scraper output:", error);
		return "Error extracting text content.";
	}
}
/**
* Citation extraction for DataForSEO's AI Optimization "LLM Scraper" API.
* tasks[].result[].sources is the deduplicated set the answer actually cited;
* items[].sources repeats those same entries. ChatGPT's `search_results` is
* deliberately ignored — those are results the model was shown, not sources it
* cited.
*/
function extractCitationsFromDataforseoScraper(rawOutput) {
	try {
		const citations = [];
		const seen = /* @__PURE__ */ new Set();
		let idx = 0;
		const result = rawOutput?.tasks?.[0]?.result?.[0];
		const sources = [...result?.sources ?? [], ...(result?.items ?? []).flatMap((i) => i?.sources ?? [])];
		for (const source of sources) {
			const url = source?.url;
			if (!url || typeof url !== "string" || !url.startsWith("http")) continue;
			if (seen.has(url)) continue;
			seen.add(url);
			const c = parseCitationUrl(url, source.title, idx);
			if (c) {
				citations.push(c);
				idx++;
			}
		}
		return citations;
	} catch {
		return [];
	}
}
function extractTextFromMistral(rawOutput) {
	try {
		if (Array.isArray(rawOutput?.outputs)) {
			const texts = [];
			for (const entry of rawOutput.outputs) for (const chunk of entry?.content ?? []) if (chunk?.type === "text" && typeof chunk.text === "string") texts.push(chunk.text);
			if (texts.length) return texts.join("\n");
		}
		if (rawOutput?.choices?.[0]?.message?.content) return rawOutput.choices[0].message.content;
		return "No text content found in Mistral output.";
	} catch {
		return "Error extracting text content.";
	}
}
function extractTextFromOpenRouter(rawOutput) {
	try {
		if (rawOutput?.choices?.[0]?.message?.content) return rawOutput.choices[0].message.content;
		if (rawOutput?.output && Array.isArray(rawOutput.output)) {
			const texts = [];
			for (const msg of rawOutput.output.filter((i) => i.type === "message")) for (const c of msg.content ?? []) if (c.type === "output_text" && c.text) texts.push(c.text);
			if (texts.length) return texts.join("\n");
		}
		return "No text content found in OpenRouter output.";
	} catch {
		return "Error extracting text content.";
	}
}
function extractTextFromOlostep(rawOutput) {
	try {
		const jsonStr = rawOutput?.json_content ?? rawOutput?.result?.json_content;
		const parsed = typeof jsonStr === "string" ? JSON.parse(jsonStr) : rawOutput;
		if (parsed?.result?.markdown_content) return parsed.result.markdown_content;
		if (parsed?.answer_markdown) return parsed.answer_markdown;
		if (parsed?.result?.text_content) return parsed.result.text_content;
		if (typeof parsed?.answer === "string") return parsed.answer;
		return "No text content found in Olostep output.";
	} catch {
		return "Error extracting text content.";
	}
}
function collectAioSnippets(node, out, depth = 0) {
	if (node == null || depth > 8) return;
	if (Array.isArray(node)) {
		for (const child of node) collectAioSnippets(child, out, depth + 1);
		return;
	}
	if (typeof node === "string") {
		if (node.trim()) out.push(node.trim());
		return;
	}
	if (typeof node === "object") {
		if (typeof node.snippet === "string" && node.snippet.trim()) out.push(node.snippet.trim());
		else if (typeof node.text === "string" && node.text.trim()) out.push(node.text.trim());
		for (const key of [
			"list",
			"texts",
			"items",
			"blocks",
			"paragraphs"
		]) if (Array.isArray(node[key])) collectAioSnippets(node[key], out, depth + 1);
	}
}
function extractBrightdataAiOverviewText(record) {
	const aio = record?.ai_overview;
	if (!aio || typeof aio !== "object") return null;
	for (const key of [
		"markdown",
		"text",
		"aio_text",
		"content",
		"answer"
	]) if (typeof aio[key] === "string" && aio[key].trim()) return aio[key].trim();
	for (const listKey of [
		"texts",
		"items",
		"text_blocks",
		"blocks",
		"paragraphs"
	]) {
		if (!Array.isArray(aio[listKey])) continue;
		const snippets = [];
		collectAioSnippets(aio[listKey], snippets);
		if (snippets.length) return snippets.join("\n");
	}
	return null;
}
function extractTextFromBrightdata(rawOutput) {
	try {
		const record = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;
		if (!record) return "No content in BrightData output.";
		const aiOverview = extractBrightdataAiOverviewText(record);
		if (aiOverview) return aiOverview;
		for (const key of [
			"answer_text_markdown",
			"answer_text",
			"answer",
			"response_raw",
			"response",
			"text",
			"content"
		]) if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
		return "No text content found in BrightData output.";
	} catch {
		return "Error extracting text content.";
	}
}
function oxylabsAiOverviews(content) {
	const aio = content?.results?.ai_overviews ?? content?.ai_overviews;
	return Array.isArray(aio) ? aio : [];
}
function extractOxylabsAiOverviewText(content) {
	const parts = [];
	const push = (v) => {
		if (typeof v === "string" && v.trim()) parts.push(v.trim());
	};
	for (const overview of oxylabsAiOverviews(content)) {
		for (const answer of overview?.answer_text ?? []) {
			if (typeof answer === "string") push(answer);
			for (const fragment of answer?.fragments ?? []) push(fragment?.text);
		}
		if (parts.length === 0) push(overview?.text ?? overview?.markdown);
	}
	return parts.length > 0 ? parts.join("\n\n") : null;
}
function extractTextFromOxylabs(rawOutput) {
	try {
		const content = rawOutput?.results?.[0]?.content;
		if (!content) return "No content in Oxylabs output.";
		const aiOverview = extractOxylabsAiOverviewText(content);
		if (aiOverview) return aiOverview;
		for (const key of [
			"markdown_text",
			"answer_results_md",
			"response_text",
			"answer_text",
			"answer"
		]) if (typeof content[key] === "string" && content[key].trim()) return content[key].trim();
		return "No text content found in Oxylabs output.";
	} catch {
		return "Error extracting text content.";
	}
}
/**
* The answer object inside a Cloro task `response`, or null when there isn't
* one. Chatbot tasks (ChatGPT, Perplexity, Copilot, Gemini) and Google AI Mode
* put the answer at the top level; the Google AI Overview task nests it under
* `aioverview`, which is null when Google showed no overview.
*/
function cloroAnswer(rawOutput) {
	const answer = rawOutput && typeof rawOutput === "object" && "aioverview" in rawOutput ? rawOutput.aioverview : rawOutput;
	return answer && typeof answer === "object" ? answer : null;
}
function extractTextFromCloro(rawOutput) {
	try {
		const answer = cloroAnswer(rawOutput);
		if (!answer) return "No content in Cloro output.";
		for (const key of ["text", "markdown"]) if (typeof answer[key] === "string" && answer[key].trim()) return answer[key].trim();
		return "No text content found in Cloro output.";
	} catch {
		return "Error extracting text content.";
	}
}
/**
* Extract text content from stored rawOutput.
* Dispatches based on provider (how data was fetched), falling back to engine
* (for old data where provider column may be null).
*/
function extractTextContent(rawOutput, providerOrEngine) {
	switch (providerOrEngine) {
		case "openai-api":
		case "openai":
		case "chatgpt": return extractTextFromOpenAI(rawOutput);
		case "anthropic-api":
		case "anthropic":
		case "claude": return extractTextFromAnthropic(rawOutput);
		case "mistral-api": return extractTextFromMistral(rawOutput);
		case "dataforseo":
		case "google":
		case "google-ai-mode":
		case "google-ai-overview": return extractTextFromDataforseo(rawOutput);
		case "openrouter": return extractTextFromOpenRouter(rawOutput);
		case "olostep": return extractTextFromOlostep(rawOutput);
		case "brightdata": return extractTextFromBrightdata(rawOutput);
		case "oxylabs": return extractTextFromOxylabs(rawOutput);
		case "cloro": return extractTextFromCloro(rawOutput);
		default: return tryGenericExtraction(rawOutput);
	}
}
function tryGenericExtraction(rawOutput) {
	if (!rawOutput) return "No content.";
	if (typeof rawOutput === "string") return rawOutput;
	if (rawOutput?.choices?.[0]?.message?.content) return rawOutput.choices[0].message.content;
	if (rawOutput?.answer_markdown) return rawOutput.answer_markdown;
	if (rawOutput?.answer_text) return rawOutput.answer_text;
	if (rawOutput?.content?.[0]?.text) return rawOutput.content[0].text;
	return "Unknown provider format - cannot extract text content.";
}
function parseCitationUrl(url, title, idx) {
	try {
		const parsed = new URL(url);
		return {
			url,
			title: title || void 0,
			domain: parsed.hostname.replace(/^www\./, ""),
			citationIndex: idx
		};
	} catch {
		return null;
	}
}
function extractCitationsFromOpenAI(rawOutput) {
	try {
		const citations = [];
		let idx = 0;
		if (rawOutput?.output && Array.isArray(rawOutput.output)) {
			for (const msg of rawOutput.output.filter((i) => i.type === "message")) for (const content of msg.content ?? []) if (content.type === "output_text" && Array.isArray(content.annotations)) {
				for (const ann of content.annotations) if (ann.type === "url_citation" && ann.url) {
					const c = parseCitationUrl(ann.url, ann.title, idx);
					if (c) {
						citations.push(c);
						idx++;
					}
				}
			}
		}
		return citations;
	} catch {
		return [];
	}
}
function extractCitationsFromGoogle(rawOutput) {
	return extractCitationsFromDataforseo(rawOutput);
}
function extractCitationsFromDataforseo(rawOutput) {
	try {
		const citations = [];
		let idx = 0;
		const result = rawOutput?.tasks?.[0]?.result?.[0];
		if (isDataforseoScraperResult(result)) return extractCitationsFromDataforseoScraper(rawOutput);
		const items = result?.items ?? [];
		if (items.some((item) => Array.isArray(item?.sections))) return extractCitationsFromDataforseoLlm(rawOutput);
		for (const aiOverview of items.filter((i) => i.type === "ai_overview")) for (const ref of aiOverview.references ?? []) if (ref.url) {
			const c = parseCitationUrl(ref.url, ref.title, idx);
			if (c) {
				citations.push(c);
				idx++;
			}
		}
		return citations;
	} catch {
		return [];
	}
}
/**
* Citation extraction for DataForSEO's AI Optimization "LLM Responses" API.
* Sources live at tasks[].result[].items[].sections[].annotations[].{title,url}.
* annotations is null when web_search was disabled, and may be empty when web
* search ran but cited nothing. Duplicate URLs are de-duped.
*/
function extractCitationsFromDataforseoLlm(rawOutput) {
	try {
		const citations = [];
		const seen = /* @__PURE__ */ new Set();
		let idx = 0;
		const result = rawOutput?.tasks?.[0]?.result?.[0];
		for (const item of result?.items ?? []) for (const section of item?.sections ?? []) for (const ann of section?.annotations ?? []) {
			const url = ann?.url;
			if (!url || typeof url !== "string" || !url.startsWith("http")) continue;
			if (seen.has(url)) continue;
			seen.add(url);
			const c = parseCitationUrl(url, ann.title, idx);
			if (c) {
				citations.push(c);
				idx++;
			}
		}
		return citations;
	} catch {
		return [];
	}
}
function stripAioTitleNoise(title) {
	const marker = title.toLowerCase().indexOf("opens in new tab");
	if (marker === -1) return title.trim();
	return title.slice(0, marker).replace(/[.\s]+$/, "").trim();
}
function extractCitationsFromBrightdata(rawOutput) {
	try {
		const record = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;
		if (!record) return [];
		const citations = [];
		const seen = /* @__PURE__ */ new Set();
		let idx = 0;
		const push = (url, title) => {
			if (typeof url !== "string" || !url.startsWith("http") || seen.has(url)) return;
			seen.add(url);
			const c = parseCitationUrl(url, typeof title === "string" ? title : void 0, idx);
			if (c) {
				citations.push(c);
				idx++;
			}
		};
		const aio = record.ai_overview;
		if (aio && typeof aio === "object") for (const field of [
			"references",
			"source_links",
			"sources",
			"links"
		]) {
			if (!Array.isArray(aio[field])) continue;
			for (const item of aio[field]) push(typeof item === "string" ? item : item?.href ?? item?.url ?? item?.link, typeof item?.title === "string" ? stripAioTitleNoise(item.title) : item?.name);
		}
		for (const field of [
			"citations",
			"links_attached",
			"sources"
		]) {
			if (!Array.isArray(record[field])) continue;
			for (const item of record[field]) push(typeof item === "string" ? item : item?.url, item?.title);
		}
		return citations;
	} catch {
		return [];
	}
}
function extractCitationsFromOxylabs(rawOutput) {
	try {
		const content = rawOutput?.results?.[0]?.content;
		if (!content) return [];
		const citations = [];
		const seen = /* @__PURE__ */ new Set();
		let idx = 0;
		const pushUrl = (url, title) => {
			if (typeof url !== "string" || !url.startsWith("http") || seen.has(url)) return;
			seen.add(url);
			const c = parseCitationUrl(url, typeof title === "string" ? title : void 0, idx);
			if (c) {
				citations.push(c);
				idx++;
			}
		};
		const sourceArrays = [];
		for (const field of [
			"citations",
			"external_links",
			"links",
			"sources"
		]) if (Array.isArray(content[field])) sourceArrays.push(content[field]);
		const perpSources = content?.additional_results?.sources_results;
		if (Array.isArray(perpSources)) sourceArrays.push(perpSources);
		for (const arr of sourceArrays) for (const item of arr) if (typeof item === "string") pushUrl(item, void 0);
		else if (Array.isArray(item?.urls)) for (const u of item.urls) pushUrl(u, item?.title ?? item?.name);
		else pushUrl(item?.url ?? item?.link, item?.title ?? item?.name);
		for (const overview of oxylabsAiOverviews(content)) {
			for (const answer of overview?.answer_text ?? []) for (const fragment of answer?.fragments ?? []) for (const ref of fragment?.references ?? []) pushUrl(ref?.url, ref?.source);
			for (const item of overview?.source_panel?.items ?? []) pushUrl(item?.url ?? item?.link, item?.title ?? item?.source);
		}
		return citations;
	} catch {
		return [];
	}
}
function extractCitationsFromCloro(rawOutput) {
	try {
		const answer = cloroAnswer(rawOutput);
		if (!answer) return [];
		const citations = [];
		const seen = /* @__PURE__ */ new Set();
		let idx = 0;
		const push = (url, title) => {
			if (typeof url !== "string" || !url.startsWith("http") || seen.has(url)) return;
			seen.add(url);
			const c = parseCitationUrl(url, typeof title === "string" ? title : void 0, idx);
			if (c) {
				citations.push(c);
				idx++;
			}
		};
		for (const field of ["sources", "citationPills"]) {
			if (!Array.isArray(answer[field])) continue;
			for (const item of answer[field]) push(item?.url ?? item?.link, item?.label ?? item?.title);
		}
		return citations;
	} catch {
		return [];
	}
}
//#endregion
export { extractTextFromOxylabs as _, extractCitationsFromDataforseoScraper as a, extractCitationsFromOxylabs as c, extractTextFromBrightdata as d, extractTextFromCloro as f, extractTextFromOpenAI as g, extractTextFromGoogle as h, extractCitationsFromDataforseoLlm as i, extractTextContent as l, extractTextFromDataforseoScraper as m, extractCitationsFromBrightdata as n, extractCitationsFromGoogle as o, extractTextFromDataforseoLlm as p, extractCitationsFromCloro as r, extractCitationsFromOpenAI as s, cloroAnswer as t, extractTextFromAnthropic as u };

//# sourceMappingURL=text-extraction-2XGzlgNM.mjs.map