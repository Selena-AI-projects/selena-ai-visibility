// Stands in for Resend (RESEND_BASE_URL) during the acceptance run. Every
// request is logged and answered locally; nothing leaves the machine.
import fs from "node:fs";
import http from "node:http";

const out = process.env.SINK_LOG;
const port = Number(process.env.SINK_PORT ?? 3191);
let sequence = 0;

http
	.createServer((request, response) => {
		let body = "";
		request.on("data", (chunk) => {
			body += chunk;
		});
		request.on("end", () => {
			const id = `sink-email-${++sequence}`;
			let parsed = body;
			try {
				parsed = JSON.parse(body);
			} catch {}
			fs.appendFileSync(
				out,
				`${JSON.stringify({ at: new Date().toISOString(), method: request.method, path: request.url, id, body: parsed })}\n`,
			);
			response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id }));
		});
	})
	.listen(port, "127.0.0.1", () => console.log(`sink listening on ${port}`));
