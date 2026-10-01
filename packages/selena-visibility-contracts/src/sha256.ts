// This package is shared with the browser bundle, where node:crypto does not
// exist, and Web Crypto's digest is async, which would ripple through every
// synchronous hashing contract. A plain SHA-256 keeps the hashes stable and
// the package free of runtime built-ins, as the SHA-1 in visibility-os already is.

const ROUND_CONSTANTS = new Uint32Array([
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
	0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
	0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
	0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
	0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
	0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
	0xc67178f2,
]);

const rotateRight = (value: number, bits: number): number => ((value >>> bits) | (value << (32 - bits))) >>> 0;

function sha256Bytes(input: Uint8Array): Uint8Array {
	const bitLength = input.length * 8;
	const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
	const padded = new Uint8Array(paddedLength);
	padded.set(input);
	padded[input.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
	view.setUint32(paddedLength - 4, bitLength >>> 0, false);

	const state = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);
	const words = new Uint32Array(64);

	for (let offset = 0; offset < paddedLength; offset += 64) {
		for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
		for (let index = 16; index < 64; index += 1) {
			const w15 = words[index - 15] as number;
			const w2 = words[index - 2] as number;
			const s0 = rotateRight(w15, 7) ^ rotateRight(w15, 18) ^ (w15 >>> 3);
			const s1 = rotateRight(w2, 17) ^ rotateRight(w2, 19) ^ (w2 >>> 10);
			words[index] = ((words[index - 16] as number) + s0 + (words[index - 7] as number) + s1) >>> 0;
		}

		let [a, b, c, d, e, f, g, h] = state as unknown as [number, number, number, number, number, number, number, number];
		for (let index = 0; index < 64; index += 1) {
			const bigSigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
			const choose = (e & f) ^ (~e & g);
			const t1 = (h + bigSigma1 + choose + (ROUND_CONSTANTS[index] as number) + (words[index] as number)) >>> 0;
			const bigSigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
			const majority = (a & b) ^ (a & c) ^ (b & c);
			const t2 = (bigSigma0 + majority) >>> 0;
			h = g;
			g = f;
			f = e;
			e = (d + t1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (t1 + t2) >>> 0;
		}
		state[0] = (state[0] as number) + a;
		state[1] = (state[1] as number) + b;
		state[2] = (state[2] as number) + c;
		state[3] = (state[3] as number) + d;
		state[4] = (state[4] as number) + e;
		state[5] = (state[5] as number) + f;
		state[6] = (state[6] as number) + g;
		state[7] = (state[7] as number) + h;
	}

	const digest = new Uint8Array(32);
	const digestView = new DataView(digest.buffer);
	for (let index = 0; index < 8; index += 1) digestView.setUint32(index * 4, state[index] as number, false);
	return digest;
}

/** The SHA-256 of the UTF-8 encoding of `text`, as lowercase hex. */
export function sha256HexSync(text: string): string {
	return Array.from(sha256Bytes(new TextEncoder().encode(text)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
