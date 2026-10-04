// The invited client's path through the product, driven in a browser against
// the harness started by run.sh: sign-up → project → free request → queue →
// worker → operator QC → report in the client's own cabinet, the access the
// operator's actions must refuse to others, and a measurement QC rejects.
//
// It writes nothing to the database except the one fixture a person would
// set by hand (the operator's platform role); everything else goes through
// the pages. Each check lands in steps.json; the process fails on any FAIL.
//
// HARNESS_PLAN (set by run.sh) names the plan both invited clients redeem;
// every run count and price below is derived from it.
import fs from "node:fs";
import { chromium } from "@playwright/test";
import pg from "pg";

const APP = process.env.APP_URL;
const OUT = process.env.EVIDENCE_DIR;
const SINK_LOG = process.env.SINK_LOG;
const codes = JSON.parse(process.env.HARNESS_CODES);
const PASSWORD = "Harness-Synthetic-Pass-2026!";

// A copy of packages/selena-visibility-contracts/src/catalog.ts for the two
// plans a pilot seat can pay for: `systems` are the sv_runs.system_id values
// in the catalog's order, `nominal` the quote price, `search` the value
// /app/selena-order accepts in ?plan=. Kept literal so a catalog change
// fails this scenario instead of silently moving its expectations.
const PLANS = {
	snapshot: {
		planId: "visibility-snapshot",
		search: "snapshot",
		nominal: "49.00",
		systems: ["ChatGPT", "Gemini", "Perplexity"],
		repeats: 1,
	},
	landscape: {
		planId: "full-discovery-landscape",
		search: "landscape",
		nominal: "79.00",
		systems: [
			"ChatGPT",
			"Gemini",
			"Perplexity",
			"anthropic/claude-haiku-4.5",
			"deepseek/deepseek-v3.2",
			"qwen/qwen3.5-9b",
			"mistralai/mistral-small-2603",
			"x-ai/grok-4.5",
		],
		repeats: 1,
	},
};
const plan = PLANS[process.env.HARNESS_PLAN ?? "snapshot"];
if (!plan) throw new Error(`HARNESS_PLAN must be one of ${Object.keys(PLANS).join(", ")}`);
/** The questions createProject() writes into the profile and approves. */
const QUESTIONS = 3;
const expectedRuns = QUESTIONS * plan.systems.length * plan.repeats;

/** «9 прогонов», «24 прогона»: the step texts stay grammatical for either plan. */
function runsText(count) {
	const tens = count % 100;
	const ones = count % 10;
	if (tens >= 11 && tens <= 14) return `${count} прогонов`;
	if (ones === 1) return `${count} прогон`;
	if (ones >= 2 && ones <= 4) return `${count} прогона`;
	return `${count} прогонов`;
}
fs.mkdirSync(`${OUT}/screens`, { recursive: true });

const people = {
	operator: { name: "Harness Operator", email: "operator@ops-harness.example" },
	client: { name: "Harness Client", email: "client@studio-lumen-harness.example" },
	rival: { name: "Harness Rival", email: "rival@other-harness.example" },
	rejected: { name: "Harness harness-fail Client", email: "client@studio-nord-harness.example" },
};

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const q = async (text, values = []) => (await db.query(text, values)).rows;

const steps = [];
function check(id, step, pass, observed) {
	steps.push({ id, step, status: pass ? "PASS" : "FAIL", observed });
	console.log(`${pass ? "PASS" : "FAIL"} ${id} ${step} — ${typeof observed === "string" ? observed : JSON.stringify(observed)}`);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function session() {
	const context = await browser.newContext({ viewport: { width: 1360, height: 950 }, locale: "ru-RU" });
	await context.addInitScript(() => window.localStorage.setItem("selena-workspace-locale", "ru"));
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(String(error)));
	page.on("dialog", (dialog) => dialog.accept());
	return { context, page, errors };
}

const sessions = {};
const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png`, fullPage: true });
const bodyText = async (page) => (await page.locator("body").innerText()).replace(/\n{2,}/g, "\n");
const go = (page, path) => page.goto(`${APP}${path}`, { waitUntil: "networkidle" });

function verificationLink(email) {
	const mails = fs.existsSync(SINK_LOG)
		? fs.readFileSync(SINK_LOG, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line))
		: [];
	const mail = mails.filter((entry) => JSON.stringify(entry.body?.to ?? "").includes(email)).at(-1);
	const html = `${mail?.body?.html ?? ""} ${mail?.body?.text ?? ""}`;
	return html.match(/https?:\/\/[^"'\s<>]+verify-email[^"'\s<>]*/)?.[0]?.replaceAll("&amp;", "&") ?? null;
}

async function waitFor(what, read, ok, timeoutMs = 120_000) {
	const started = Date.now();
	let value;
	while (Date.now() - started < timeoutMs) {
		value = await read();
		if (ok(value)) return value;
		await new Promise((resolve) => setTimeout(resolve, 1500));
	}
	throw new Error(`timed out waiting for ${what}: ${JSON.stringify(value)}`);
}

async function register(role) {
	const person = people[role];
	const s = await session();
	await go(s.page, "/auth/register");
	await s.page.fill('input[name="name"], input#name', person.name);
	await s.page.fill('input[type="email"]', person.email);
	const passwords = s.page.locator('input[type="password"]');
	for (let index = 0; index < (await passwords.count()); index++) await passwords.nth(index).fill(PASSWORD);
	await s.page.locator('button[type="submit"]').click();
	const link = await waitFor(`verification mail for ${role}`, async () => verificationLink(person.email), Boolean, 30_000);
	await s.page.goto(link, { waitUntil: "networkidle" });
	await s.page.waitForURL(/\/app/, { timeout: 30_000 }).catch(() => {});
	sessions[role] = s;
	return s.page.url();
}

/** A fresh browser that signs in through the login page, as a returning client would. */
async function signIn(role) {
	await new Promise((resolve) => setTimeout(resolve, 4_000));
	const s = await session();
	await go(s.page, "/auth/login");
	await s.page.fill('input[type="email"]', people[role].email);
	await s.page.fill('input[type="password"]', PASSWORD);
	await s.page.locator('button[type="submit"]').click();
	await s.page.waitForURL(/\/app/, { timeout: 30_000 });
	return s;
}

async function createProject(page, projectName, brand, domain) {
	await go(page, "/app/selena");
	// A workspace without projects opens on the form; otherwise it is behind a button.
	if (!(await page.getByLabel("Название проекта").isVisible().catch(() => false)))
		await page.getByRole("button", { name: "Новый проект" }).click();
	await page.getByLabel("Название проекта").fill(projectName);
	await page.getByLabel("Категория бизнеса").fill("Massage studio");
	await page.getByLabel("Код страны").fill("UZ");
	await page.getByLabel("Город или регион").fill("Tashkent");
	await page.getByLabel("Языки").fill("ru");
	await page.getByRole("button", { name: "Создать проект" }).click();
	await page.getByLabel("Публичное название бренда").waitFor();
	await page.getByLabel("Публичное название бренда").fill(brand);
	await page.getByLabel("Основной сайт").fill(domain);
	await page.getByLabel("Конкуренты").fill("Relax Point Tashkent, Body Balance Studio");
	await page
		.getByLabel("Вопросы клиентов")
		.fill(
			`RU: где сделать хороший массаж в Ташкенте?\nRU: лучшая массажная студия в Ташкенте для спортсменов\nRU: что известно о ${brand} в Ташкенте?`,
		);
	await page.getByRole("button", { name: "Подтвердить профиль бренда" }).click();
	await page.waitForTimeout(2500);
	await page.reload({ waitUntil: "networkidle" });
	await page.getByRole("button", { name: "Подобрать вопросы из профиля" }).click();
	await page.waitForTimeout(2500);
	await page.getByRole("button", { name: "Утвердить отмеченные" }).click();
	await page.waitForTimeout(2500);
	const [project] = await q("select id from sv_projects where name = $1", [projectName]);
	return project.id;
}

async function submitRequest(page, projectId, code, contact) {
	await go(page, `/app/selena-order?plan=${plan.search}&project=${projectId}`);
	await page.getByLabel("Ваше имя").fill("Harness Client");
	await page.getByLabel("Как с вами связаться").fill(contact);
	await page.getByLabel("Промокод").fill(code);
	return page.getByRole("button", { name: "Отправить заявку" });
}

const orgOf = async (email) =>
	(
		await q(
			'select m.organization_id as id, o.name from "user" u join member m on m.user_id = u.id join organization o on o.id = m.organization_id where u.email = $1',
			[email],
		)
	)[0];

const orderState = async (organizationId) =>
	(
		await q(
			`select
				(select count(*)::int from sv_order_requests where organization_id = $1) as requests,
				(select count(*)::int from sv_orders where organization_id = $1) as orders,
				(select count(*)::int from sv_run_permits where organization_id = $1) as permits,
				(select count(*)::int from sv_runs where organization_id = $1) as runs,
				(select count(*)::int from pgboss.job where name = 'selena-measure' and data ->> 'organizationId' = $1) as jobs,
				(select string_agg(distinct status::text, ',') from sv_orders where organization_id = $1) as order_status,
				(select string_agg(distinct status::text, ',') from sv_cycles where organization_id = $1) as cycle_status,
				(select string_agg(distinct status, ',') from sv_order_requests where organization_id = $1) as request_status`,
			[organizationId],
		)
	)[0];

/** Every server call one session makes from here on, for replaying under another session. */
function capture(page) {
	const calls = [];
	page.on("request", (request) => {
		if (request.url().includes("/_serverFn/"))
			calls.push({
				url: request.url(),
				method: request.method(),
				body: request.postData(),
				headers: Object.fromEntries(Object.entries(request.headers()).filter(([key]) => key !== "cookie")),
			});
	});
	return calls;
}

/**
 * Replays another session's calls. A call whose answer to its owner carries
 * the client's data is `sensitive`: it must be refused to everyone else. The
 * page's own session and workspace reads answer every caller about itself,
 * so for those only the absence of the client's data is required.
 */
async function replay(role, calls, leakPattern, owner) {
	const results = [];
	for (const call of calls) {
		const send = (as) =>
			sessions[as].context.request
				.fetch(call.url, { method: call.method, data: call.body ?? undefined, headers: call.headers })
				.then(async (response) => ({ status: response.status(), text: await response.text() }));
		const sensitive = call.method === "POST" || leakPattern.test((await send(owner)).text);
		const { status, text } = await send(role);
		results.push({
			role,
			fn: `${call.method} ${call.url.split("/_serverFn/")[1].slice(0, 12)}`,
			sensitive,
			status,
			refusal: (text.match(/(Unauthorized|Forbidden|Not found)[^"\\]*/) ?? [])[0] ?? null,
			leaks: leakPattern.test(text),
		});
	}
	return results;
}

const refusedWhereSensitive = (rows) => rows.length > 0 && rows.every((row) => !row.leaks && (!row.sensitive || row.refusal));

try {
	// 1. Four people sign up through the pilot allowlist and verify by email.
	for (const role of Object.keys(people)) {
		// Better Auth allows three sign-ups per ten seconds per caller, and every
		// browser here is one caller to it.
		if (Object.keys(sessions).length > 0) await new Promise((resolve) => setTimeout(resolve, 11_000));
		const landed = await register(role);
		check(`S1-${role}`, `Регистрация и подтверждение почты: ${role}`, /\/app/.test(landed), landed.replace(APP, ""));
	}
	await q(`update "user" set role = 'admin' where email = $1`, [people.operator.email]);
	// The session carries the role it was issued with; the new role applies from the next sign-in.
	await sessions.operator.context.close();
	sessions.operator = await signIn("operator");
	const roles = await q(
		`select u.email, u.role as platform, m.role as workspace from "user" u join member m on m.user_id = u.id order by u.email`,
	);
	fs.writeFileSync(`${OUT}/accounts.json`, JSON.stringify(roles, null, 1));
	check("S2", "Платформенная роль оператора (fixture), у остальных — только роль в своём пространстве", roles.filter((row) => row.platform === "admin").length === 1, roles);

	// 2. The client builds the project and sends the free request four ways.
	const client = sessions.client;
	const clientOrg = await orgOf(people.client.email);
	const projectId = await createProject(client.page, "Studio Lumen (HARNESS)", "Studio Lumen", "http://studio-lumen-harness.example/");
	const approved = await q(`select count(*)::int as n from sv_scenarios where organization_id = $1 and status = 'APPROVED'`, [clientOrg.id]);
	check("S3", `Проект, профиль и ${QUESTIONS} утверждённых вопроса`, approved[0].n === QUESTIONS, `APPROVED ${approved[0].n}`);

	const submissions = capture(client.page);
	const button = await submitRequest(client.page, projectId, codes.main, people.client.email);
	await button.dblclick();
	await client.page.waitForTimeout(6000);
	const afterDoubleClick = await bodyText(client.page);
	await shot(client.page, "S4_order_double_click");
	const resubmit = await submitRequest(client.page, projectId, codes.main, people.client.email);
	await resubmit.click();
	await client.page.waitForTimeout(5000);
	const orderCall = submissions.find((call) => call.method === "POST" && (call.body ?? "").includes("contactChannel"));
	await Promise.all(
		[0, 1].map(() =>
			client.context.request.fetch(orderCall.url, { method: "POST", data: orderCall.body, headers: orderCall.headers }),
		),
	);
	const afterSubmissions = await orderState(clientOrg.id);
	check(
		"S4",
		"Двойной клик + повторная отправка + 2 параллельных повтора вызова → одна заявка, один заказ",
		afterSubmissions.requests === 1 && afterSubmissions.orders === 1 && afterSubmissions.permits === expectedRuns,
		{ ...afterSubmissions, screen: afterDoubleClick.match(/Промокод принят[^\n]*/)?.[0] ?? null },
	);
	const payment = await q(
		`select q.price_amount::text as nominal, p.amount::text as paid from sv_orders o join sv_quotes q on q.id = o.quote_id join sv_payments p on p.order_id = o.id where o.organization_id = $1`,
		[clientOrg.id],
	);
	check("S5", `Номинал тарифа ${plan.planId} и фактическая оплата пилотного места`, payment[0]?.nominal === plan.nominal && payment[0]?.paid === "0.00", payment[0]);

	// 3. The harness worker executes the queued permits.
	const measured = await waitFor(
		"the client's cycle to reach QC",
		() => orderState(clientOrg.id),
		(state) => state.cycle_status === "QC_REQUIRED",
	);
	const runs = await q(`select status::text, canonical_payload ->> 'provider' as provider, count(*)::int as n from sv_runs where organization_id = $1 group by 1, 2`, [clientOrg.id]);
	check("S6", `Очередь → harness worker (stub) → ${runsText(expectedRuns)} → цикл QC_REQUIRED`, measured.runs === expectedRuns, { ...measured, byStatus: runs });
	await go(client.page, "/app/selena");
	const cabinetInReview = await bodyText(client.page);
	await shot(client.page, "S6_client_cabinet_in_review");
	check("S7", "Кабинет клиента до QC: статус по-русски, отчёт не открыт", /На проверке качества|отчёт не готов/i.test(cabinetInReview), cabinetInReview.match(/[^\n]*(проверке качества|отчёт не готов)[^\n]*/i)?.[0] ?? null);

	// 4. The operator serves the order from the desk; others replay those calls.
	const operator = sessions.operator;
	const operatorCalls = capture(operator.page);
	await go(operator.page, "/app/selena-admin");
	const queue = await bodyText(operator.page);
	check("S8", "Оператор видит заказ клиента с названием его пространства", queue.includes(clientOrg.name), clientOrg.name);
	await operator.page.locator("tr", { hasText: "Studio Lumen (HARNESS)" }).getByRole("button", { name: "Выбрать" }).click();
	await operator.page.getByRole("button", { name: "Разобрать ответы" }).click();
	await operator.page.waitForTimeout(2500);
	await operator.page.getByLabel("Объём проверки").fill(`${expectedRuns}/${expectedRuns} harness stub answers read (not real AI)`);
	await operator.page.getByLabel("Заметки").fill("Harness acceptance QC");
	await operator.page.getByRole("button", { name: "Записать QC" }).click();
	await waitFor("the order to be READY", () => orderState(clientOrg.id), (state) => state.order_status === "READY", 30_000);
	await shot(operator.page, "S9_operator_qc_recorded");
	const audit = await q(
		`select event, details ->> 'action' as action, details ->> 'crossTenant' as cross_tenant, count(*)::int as n
		 from sv_audit_events where organization_id = $1 and event in ('OPERATOR_ACTION', 'QC_RECORD_CREATED') group by 1, 2, 3 order by 1, 2`,
		[clientOrg.id],
	);
	check("S9", "QC approved оператором → READY; аудит в организации клиента с crossTenant", audit.some((row) => row.event === "OPERATOR_ACTION" && row.cross_tenant === "true"), audit);
	const qcBefore = (await q(`select count(*)::int as n from sv_qc_records`))[0].n;
	const denials = [
		...(await replay("client", operatorCalls, /Relax Point|Studio Lumen \(HARNESS\)/, "operator")),
		...(await replay("rival", operatorCalls, /Relax Point|Studio Lumen \(HARNESS\)/, "operator")),
	];
	const qcAfter = (await q(`select count(*)::int as n from sv_qc_records`))[0].n;
	fs.writeFileSync(`${OUT}/operator-replays.json`, JSON.stringify(denials, null, 1));
	check(
		"D1",
		"Клиент и администратор другого пространства повторяют вызовы оператора → отказ, данных нет, QC не записан",
		refusedWhereSensitive(denials) && denials.some((row) => row.sensitive) && qcAfter === qcBefore,
		{
			calls: denials.length,
			sensitive: denials.filter((row) => row.sensitive).length,
			refusals: [...new Set(denials.filter((row) => row.sensitive).map((row) => row.refusal))],
			qcBefore,
			qcAfter,
		},
	);

	// 5. The client signs in again and reads the report; the numbers are the runs'.
	const returning = await signIn("client");
	sessions.clientAgain = returning;
	const reportCalls = capture(returning.page);
	await go(returning.page, "/app/selena-report");
	await returning.page.waitForTimeout(2000);
	const report = await returning.page.locator("body").innerText();
	fs.writeFileSync(`${OUT}/client-report.txt`, report);
	await shot(returning.page, "S10_client_report_ready");
	await returning.page.emulateMedia({ media: "print" });
	await returning.page.pdf({ path: `${OUT}/client-report.pdf`, format: "A4", printBackground: true });
	const rows = await q(
		`select r.system_id as system, r.status::text as status,
			(select m.ordinal_position from sv_response_mentions m where m.run_id = r.id and m.entity_type = 'BRAND') as brand_position,
			(select count(*)::int from sv_response_mentions m where m.run_id = r.id) as mentions,
			(select coalesce(json_agg(c ->> 'domain'), '[]') from jsonb_array_elements(coalesce(r.canonical_payload -> 'measurement' -> 'citations', '[]')) c) as domains
		 from sv_runs r where r.organization_id = $1`,
		[clientOrg.id],
	);
	fs.writeFileSync(`${OUT}/client-runs.json`, JSON.stringify(rows, null, 1));
	const expected = [`получено ответов: ${rows.filter((row) => row.status === "SUCCEEDED").length} из ${rows.length}`];
	// The report prints the same rows for a Visitor surface and an API model;
	// only the heading differs, and these expectations carry no heading.
	for (const system of plan.systems) {
		const own = rows.filter((row) => row.system === system);
		const named = own.filter((row) => row.brand_position !== null);
		const mentions = own.reduce((sum, row) => sum + row.mentions, 0);
		expected.push(`${named.length} из ${own.length}`);
		expected.push(`${Math.round((100 * named.length) / mentions)}%`);
		if (named.length) expected.push((named.reduce((sum, row) => sum + row.brand_position, 0) / named.length).toFixed(1));
	}
	expected.push(`Studio Lumen — вы\n${rows.filter((row) => row.brand_position !== null).length} из ${rows.length}`);
	const citations = new Map();
	for (const row of rows) for (const domain of row.domains) citations.set(domain, (citations.get(domain) ?? 0) + 1);
	for (const [domain, count] of citations) expected.push([domain, `цитируется ${count}`]);
	const matched = expected.map((value) =>
		Array.isArray(value)
			? { value: value.join(" · "), found: report.includes(value[0]) && report.includes(value[1]) }
			: { value, found: report.includes(value) },
	);
	fs.writeFileSync(`${OUT}/report-vs-runs.json`, JSON.stringify(matched, null, 1));
	check("S10", "Повторный вход клиента: отчёт в своём кабинете, числа = прогонам", matched.every((row) => row.found), {
		values: matched.length,
		missing: matched.filter((row) => !row.found).map((row) => row.value),
	});
	const reportDenials = await replay("rival", reportCalls, /Relax Point|studio-lumen-harness/, "clientAgain");
	fs.writeFileSync(`${OUT}/report-replays.json`, JSON.stringify(reportDenials, null, 1));
	check(
		"D2",
		"Клиент другого пространства повторяет вызовы отчёта → данных клиента нет, вызовы по его проекту отклонены",
		// Calls without an object id answer the caller about its own workspace;
		// the ones naming the client's project must be refused.
		reportDenials.every((row) => !row.leaks) && reportDenials.some((row) => row.refusal),
		{
			calls: reportDenials.length,
			leaks: reportDenials.filter((row) => row.leaks).length,
			refusals: [...new Set(reportDenials.map((row) => row.refusal).filter(Boolean))],
		},
	);

	// 6. A second invited client whose measurement gets no answers; QC rejects it.
	const rejected = sessions.rejected;
	const rejectedOrg = await orgOf(people.rejected.email);
	const rejectedProject = await createProject(rejected.page, "Studio Nord (HARNESS)", "Studio Nord", "http://studio-nord-harness.example/");
	await (await submitRequest(rejected.page, rejectedProject, codes.rejected, people.rejected.email)).click();
	await rejected.page.waitForTimeout(5000);
	const failed = await waitFor(
		"the rejected client's cycle to reach QC",
		() => orderState(rejectedOrg.id),
		(state) => state.cycle_status === "QC_REQUIRED",
	);
	check("R1", `Второй клиент: ${runsText(expectedRuns)} без ответа (контролируемый таймаут harness) → QC_REQUIRED`, failed.runs === expectedRuns, failed);
	await go(operator.page, "/app/selena-admin");
	const row = operator.page.locator("tr", { hasText: "Studio Nord (HARNESS)" });
	await row.getByRole("button", { name: "Выбрать" }).click();
	await operator.page.getByLabel("Объём проверки").fill(`${expectedRuns}/${expectedRuns} runs failed (harness timeout)`);
	await operator.page.getByRole("button", { name: "Записать QC" }).click();
	await operator.page.waitForTimeout(2500);
	const refusal = await bodyText(operator.page);
	await shot(operator.page, "R2_operator_qc_approve_refused");
	check("R2", "QC «approved» без единого ответа отклонён понятным сообщением", refusal.includes("Ни один прогон этого цикла не вернул ответ"), refusal.match(/Ни один прогон[^\n]*/)?.[0] ?? null);
	await operator.page.getByLabel("Решение").selectOption("rejected");
	await operator.page.getByLabel("Заметки").fill("No answers came back; nothing to publish.");
	await operator.page.getByRole("button", { name: "Записать QC" }).click();
	const closed = await waitFor("the rejected order to close", () => orderState(rejectedOrg.id), (state) => state.order_status === "CANCELLED", 30_000);
	check("R3", "QC «rejected» закрывает заказ и цикл; заявка помечена", closed.cycle_status === "STOPPED" && closed.request_status === "QC_REJECTED", closed);

	for (const attempt of [1, 2]) {
		const back = await signIn("rejected");
		await go(back.page, "/app/selena");
		const notice = back.page.getByTestId("measurement-not-accepted");
		const noticeText = (await notice.innerText().catch(() => "")).replace(/\n+/g, " | ");
		const cabinet = await bodyText(back.page);
		await shot(back.page, `R4_rejected_client_cabinet_login${attempt}`);
		check(
			`R4-${attempt}`,
			`Вход №${attempt} после отказа QC: статус, причина и следующий шаг по-русски; не «на проверке»`,
			noticeText.includes("Замер не принят") &&
				noticeText.includes("Проверка качества отклонила замер") &&
				noticeText.includes("Повторный замер сам не запускается") &&
				!/На проверке качества/.test(cabinet),
			noticeText,
		);
		if (attempt === 2) {
			await go(back.page, "/app/selena-report");
			const reportPage = await bodyText(back.page);
			await shot(back.page, "R5_rejected_client_report_page");
			check(
				"R5",
				"Страница отчёта у отклонённого замера: тот же статус, причина и следующий шаг, отчёта нет",
				reportPage.includes("Замер не принят") &&
					reportPage.includes("Проверка качества отклонила замер") &&
					reportPage.includes("Повторный замер сам не запускается") &&
					!reportPage.includes("получено ответов:"),
				reportPage.match(/Замер не принят[\s\S]{0,400}/)?.[0]?.replace(/\n+/g, " | ") ?? null,
			);
			const jobsBefore = (await orderState(rejectedOrg.id)).jobs;
			await (await submitRequest(back.page, rejectedProject, codes.rejected, people.rejected.email)).click();
			await back.page.waitForTimeout(5000);
			const resubmitText = await bodyText(back.page);
			await shot(back.page, "R6_rejected_code_resubmitted");
			const after = await orderState(rejectedOrg.id);
			check(
				"R6",
				"Повтор того же промокода после отказа: новых прогонов, заказов и платных вызовов нет",
				after.orders === 1 && after.runs === expectedRuns && after.jobs === jobsBefore && after.permits === expectedRuns,
				{ ...after, screen: resubmitText.match(/Замер по этому промокоду закрыт[^\n]*/)?.[0] ?? null },
			);
		}
		await back.context.close();
	}

	// 7. Nothing left the machine: the only adapter that ran is the stub, the only mail the sink's.
	const providers = await q(
		`select status::text, canonical_payload ->> 'provider' as provider, count(*)::int as n, sum(cost_usd)::text as cost from sv_runs group by 1, 2 order by 1`,
	);
	const spend = {
		budgets: await q(`select scope, cap_usd::text from sv_provider_spend_budgets`),
		reservations: await q(
			`select status, count(*)::int as n, sum(estimated_usd)::text as estimated, sum(actual_usd)::text as actual
			 from sv_provider_spend_reservations group by 1 order by 1`,
		),
	};
	fs.writeFileSync(`${OUT}/spend.json`, JSON.stringify(spend, null, 1));
	check(
		"N1",
		"Внешних вызовов нет: ответы только от stub по цене 0, прогоны без ответа без провайдера",
		providers.every((row) => (row.status === "SUCCEEDED" ? row.provider === "stub" && Number(row.cost) === 0 : row.provider === null)),
		{ providers, spend },
	);
	const pageErrors = Object.fromEntries(Object.entries(sessions).map(([role, s]) => [role, s.errors]));
	check("N2", "Нет ошибок JavaScript на страницах", Object.values(pageErrors).every((errors) => errors.length === 0), pageErrors);
} catch (error) {
	check("X", "Сценарий прерван", false, String(error?.stack ?? error));
	for (const [role, s] of Object.entries(sessions))
		await s.page.screenshot({ path: `${OUT}/screens/X_${role}_at_failure.png`, fullPage: true }).catch(() => {});
} finally {
	fs.writeFileSync(`${OUT}/steps.json`, JSON.stringify(steps, null, 1));
	await browser.close();
	await db.end();
	const failedSteps = steps.filter((step) => step.status === "FAIL");
	console.log(`\n${steps.length - failedSteps.length}/${steps.length} checks passed`);
	process.exitCode = failedSteps.length ? 1 : 0;
}
