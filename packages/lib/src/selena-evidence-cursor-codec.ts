import { createHmac, timingSafeEqual } from "node:crypto";
import { type EvidenceCursorCodec, type EvidenceCursorPayload, MAX_CURSOR_TTL_MS } from "./selena-evidence-read-models";

// Kept apart from the read models: the HMAC needs node:crypto, and the read
// models are projected on the client as well.
function cursorMac(key: string, payload: string): Buffer {
	return createHmac("sha256", key).update(payload).digest();
}

export function createHmacEvidenceCursorCodec(options: {
	signingKey: string;
	verificationKeys?: readonly string[];
	now?: () => number;
	ttlMs?: number;
}): EvidenceCursorCodec {
	if (Buffer.byteLength(options.signingKey) < 32) throw new Error("EVIDENCE_CURSOR_SIGNING_KEY_TOO_SHORT");
	const verificationKeys = [options.signingKey, ...(options.verificationKeys ?? [])];
	if (verificationKeys.some((key) => Buffer.byteLength(key) < 32))
		throw new Error("EVIDENCE_CURSOR_VERIFICATION_KEY_TOO_SHORT");
	const now = options.now ?? Date.now;
	const ttlMs = options.ttlMs ?? MAX_CURSOR_TTL_MS;
	if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_CURSOR_TTL_MS)
		throw new Error("EVIDENCE_CURSOR_TTL_INVALID");
	return {
		async seal(payload) {
			const issuedAtMs = now();
			const fullPayload: EvidenceCursorPayload = {
				...payload,
				issuedAt: new Date(issuedAtMs).toISOString(),
				expiresAt: new Date(issuedAtMs + ttlMs).toISOString(),
			};
			const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
			return `${encoded}.${cursorMac(options.signingKey, encoded).toString("base64url")}`;
		},
		async verifyAndDecode(cursor) {
			const [encoded, encodedSignature, extra] = cursor.split(".");
			if (!encoded || !encodedSignature || extra !== undefined) throw new Error("INVALID_EVIDENCE_CURSOR");
			let supplied: Buffer;
			try {
				supplied = Buffer.from(encodedSignature, "base64url");
			} catch {
				throw new Error("INVALID_EVIDENCE_CURSOR");
			}
			const verified = verificationKeys.some((key) => {
				const expected = cursorMac(key, encoded);
				return supplied.length === expected.length && timingSafeEqual(supplied, expected);
			});
			if (!verified) throw new Error("INVALID_EVIDENCE_CURSOR");
			try {
				return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
			} catch {
				throw new Error("INVALID_EVIDENCE_CURSOR");
			}
		},
	};
}
