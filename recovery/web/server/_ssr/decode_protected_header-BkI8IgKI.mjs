//#region node_modules/.nitro/vite/services/ssr/assets/decode_protected_header-BkI8IgKI.js
(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "a7c63496-b0c2-4b62-992e-c44e2a830b3e", e._sentryDebugIdIdentifier = "sentry-dbid-a7c63496-b0c2-4b62-992e-c44e2a830b3e");
	} catch (e) {}
})();
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var strictDecoder = new TextDecoder("utf-8", { fatal: true });
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
	const size = buffers.reduce((acc, { length }) => acc + length, 0);
	const buf = new Uint8Array(size);
	let i = 0;
	for (const buffer of buffers) {
		buf.set(buffer, i);
		i += buffer.length;
	}
	return buf;
}
function writeUInt32BE(buf, value, offset) {
	if (value < 0 || value >= MAX_INT32) throw new RangeError(`value must be >= 0 and <= ${MAX_INT32 - 1}. Received ${value}`);
	buf.set([
		value >>> 24,
		value >>> 16,
		value >>> 8,
		value & 255
	], offset);
}
function uint64be(value) {
	const high = Math.floor(value / MAX_INT32);
	const low = value % MAX_INT32;
	const buf = /* @__PURE__ */ new Uint8Array(8);
	writeUInt32BE(buf, high, 0);
	writeUInt32BE(buf, low, 4);
	return buf;
}
function uint32be(value) {
	const buf = /* @__PURE__ */ new Uint8Array(4);
	writeUInt32BE(buf, value);
	return buf;
}
function encode$1(string) {
	const bytes = new Uint8Array(string.length);
	for (let i = 0; i < string.length; i++) {
		const code = string.charCodeAt(i);
		if (code > 127) throw new TypeError("non-ASCII string encountered in encode()");
		bytes[i] = code;
	}
	return bytes;
}
var unusable = (name, prop = "algorithm.name") => /* @__PURE__ */ new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
function checkUsage(key, usage) {
	if (usage && !key.usages.includes(usage)) throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
}
function checkModulusLength(alg, key) {
	const { modulusLength } = key.algorithm;
	if (typeof modulusLength !== "number" || modulusLength < 2048) throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
}
function checkCryptoKey(key, expected, usage) {
	const algorithm = key.algorithm;
	if (algorithm.name !== expected.name) throw unusable(expected.name);
	if (expected.hash && algorithm.hash?.name !== expected.hash) throw unusable(expected.hash, "algorithm.hash");
	if (expected.namedCurve && algorithm.namedCurve !== expected.namedCurve) throw unusable(expected.namedCurve, "algorithm.namedCurve");
	if (expected.length !== void 0 && algorithm.length !== expected.length) throw unusable(expected.length, "algorithm.length");
	checkUsage(key, usage);
}
function message(msg, actual, ...types) {
	if (types.length > 2) {
		const last = types.pop();
		msg += `one of type ${types.join(", ")}, or ${last}.`;
	} else if (types.length === 2) msg += `one of type ${types[0]} or ${types[1]}.`;
	else msg += `of type ${types[0]}.`;
	if (actual == null) msg += ` Received ${actual}`;
	else if (typeof actual === "function" && actual.name) msg += ` Received function ${actual.name}`;
	else if (typeof actual === "object" && actual != null) {
		if (actual.constructor?.name) msg += ` Received an instance of ${actual.constructor.name}`;
	}
	return msg;
}
var invalidKeyInput = (actual, ...types) => message("Key must be ", actual, ...types);
var withAlg = (alg, actual, ...types) => message(`Key for the ${alg} algorithm must be `, actual, ...types);
var JOSEError = class extends Error {
	static code = "ERR_JOSE_GENERIC";
	code = "ERR_JOSE_GENERIC";
	constructor(message, options) {
		super(message, options);
		this.name = this.constructor.name;
		Error.captureStackTrace?.(this, this.constructor);
	}
};
var JWTClaimValidationFailed = class extends JOSEError {
	static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
	code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
	claim;
	reason;
	payload;
	constructor(message, payload, claim = "unspecified", reason = "unspecified") {
		super(message, { cause: {
			claim,
			reason,
			payload
		} });
		this.claim = claim;
		this.reason = reason;
		this.payload = payload;
	}
};
var JWTExpired = class extends JOSEError {
	static code = "ERR_JWT_EXPIRED";
	code = "ERR_JWT_EXPIRED";
	claim;
	reason;
	payload;
	constructor(message, payload, claim = "unspecified", reason = "unspecified") {
		super(message, { cause: {
			claim,
			reason,
			payload
		} });
		this.claim = claim;
		this.reason = reason;
		this.payload = payload;
	}
};
var JOSEAlgNotAllowed = class extends JOSEError {
	static code = "ERR_JOSE_ALG_NOT_ALLOWED";
	code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
	static code = "ERR_JOSE_NOT_SUPPORTED";
	code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWEDecryptionFailed = class extends JOSEError {
	static code = "ERR_JWE_DECRYPTION_FAILED";
	code = "ERR_JWE_DECRYPTION_FAILED";
	constructor(message = "decryption operation failed", options) {
		super(message, options);
	}
};
var JWEInvalid = class extends JOSEError {
	static code = "ERR_JWE_INVALID";
	code = "ERR_JWE_INVALID";
};
var JWSInvalid = class extends JOSEError {
	static code = "ERR_JWS_INVALID";
	code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
	static code = "ERR_JWT_INVALID";
	code = "ERR_JWT_INVALID";
};
var JWKInvalid = class extends JOSEError {
	static code = "ERR_JWK_INVALID";
	code = "ERR_JWK_INVALID";
};
var JWKSInvalid = class extends JOSEError {
	static code = "ERR_JWKS_INVALID";
	code = "ERR_JWKS_INVALID";
};
var JWKSNoMatchingKey = class extends JOSEError {
	static code = "ERR_JWKS_NO_MATCHING_KEY";
	code = "ERR_JWKS_NO_MATCHING_KEY";
	constructor(message = "no applicable key found in the JSON Web Key Set", options) {
		super(message, options);
	}
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
	[Symbol.asyncIterator] = async function* () {};
	static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
	code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
	constructor(message = "multiple matching keys found in the JSON Web Key Set", options) {
		super(message, options);
	}
};
var JWKSTimeout = class extends JOSEError {
	static code = "ERR_JWKS_TIMEOUT";
	code = "ERR_JWKS_TIMEOUT";
	constructor(message = "request timed out", options) {
		super(message, options);
	}
};
var JWSSignatureVerificationFailed = class extends JOSEError {
	static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
	code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
	constructor(message = "signature verification failed", options) {
		super(message, options);
	}
};
function assertCryptoKey(key) {
	if (!isCryptoKey(key)) throw new Error("CryptoKey instance expected");
}
var isCryptoKey = (key) => {
	if (key?.[Symbol.toStringTag] === "CryptoKey") return true;
	try {
		return key instanceof CryptoKey;
	} catch {
		return false;
	}
};
var isKeyObject = (key) => key?.[Symbol.toStringTag] === "KeyObject";
var isKeyLike = (key) => isCryptoKey(key) || isKeyObject(key);
var generateCek = (enc) => crypto.getRandomValues(new Uint8Array(enc.cekBits >> 3));
function checkCekLength(cek, expected) {
	const actual = cek.byteLength << 3;
	if (actual !== expected) throw new JWEInvalid(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
}
var generateIv = (enc) => crypto.getRandomValues(new Uint8Array(enc.ivBits >> 3));
function checkIvLength(enc, iv) {
	if (iv.length << 3 !== enc.ivBits) throw new JWEInvalid("Invalid Initialization Vector length");
}
async function cbcKeySetup(enc, cek, usage) {
	if (!(cek instanceof Uint8Array)) throw new TypeError(invalidKeyInput(cek, "Uint8Array"));
	const keySize = enc.cekBits >> 1;
	return [
		await crypto.subtle.importKey("raw", cek.subarray(keySize >> 3), "AES-CBC", false, [usage]),
		await crypto.subtle.importKey("raw", cek.subarray(0, keySize >> 3), {
			hash: `SHA-${keySize << 1}`,
			name: "HMAC"
		}, false, ["sign"]),
		keySize
	];
}
async function cbcHmacTag(macKey, macData, keySize) {
	return new Uint8Array((await crypto.subtle.sign("HMAC", macKey, macData)).slice(0, keySize >> 3));
}
async function cbcEncrypt(enc, plaintext, cek, iv, aad) {
	const [encKey, macKey, keySize] = await cbcKeySetup(enc, cek, "encrypt");
	const ciphertext = new Uint8Array(await crypto.subtle.encrypt({
		iv,
		name: "AES-CBC"
	}, encKey, plaintext));
	return {
		ciphertext,
		tag: await cbcHmacTag(macKey, concat(aad, iv, ciphertext, uint64be(aad.length * 8)), keySize),
		iv
	};
}
async function timingSafeEqual(a, b) {
	const algorithm = {
		name: "HMAC",
		hash: "SHA-256"
	};
	const key = await crypto.subtle.generateKey(algorithm, false, ["sign", "verify"]);
	const aHmac = await crypto.subtle.sign(algorithm, key, a);
	return crypto.subtle.verify(algorithm, key, aHmac, b);
}
async function cbcDecrypt(enc, cek, ciphertext, iv, tag, aad) {
	const [encKey, macKey, keySize] = await cbcKeySetup(enc, cek, "decrypt");
	const expectedTag = await cbcHmacTag(macKey, concat(aad, iv, ciphertext, uint64be(aad.length * 8)), keySize);
	let macCheckPassed;
	try {
		macCheckPassed = await timingSafeEqual(tag, expectedTag);
	} catch {}
	if (!macCheckPassed) throw new JWEDecryptionFailed();
	let plaintext;
	try {
		plaintext = new Uint8Array(await crypto.subtle.decrypt({
			iv,
			name: "AES-CBC"
		}, encKey, ciphertext));
	} catch {}
	if (!plaintext) throw new JWEDecryptionFailed();
	return plaintext;
}
async function gcmEncrypt(enc, plaintext, cek, iv, aad) {
	const encKey = cek instanceof Uint8Array ? await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]) : (checkCryptoKey(cek, enc.subtle, "encrypt"), cek);
	const encrypted = new Uint8Array(await crypto.subtle.encrypt({
		additionalData: aad,
		iv,
		name: "AES-GCM",
		tagLength: 128
	}, encKey, plaintext));
	const tag = encrypted.slice(-16);
	return {
		ciphertext: encrypted.slice(0, -16),
		tag,
		iv
	};
}
async function gcmDecrypt(enc, cek, ciphertext, iv, tag, aad) {
	const encKey = cek instanceof Uint8Array ? await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]) : (checkCryptoKey(cek, enc.subtle, "decrypt"), cek);
	try {
		return new Uint8Array(await crypto.subtle.decrypt({
			additionalData: aad,
			iv,
			name: "AES-GCM",
			tagLength: 128
		}, encKey, concat(ciphertext, tag)));
	} catch {
		throw new JWEDecryptionFailed();
	}
}
async function encrypt(enc, plaintext, cek, iv, aad) {
	if (!isCryptoKey(cek) && !(cek instanceof Uint8Array)) throw new TypeError(invalidKeyInput(cek, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
	if (iv) checkIvLength(enc, iv);
	else iv = generateIv(enc);
	if (cek instanceof Uint8Array) checkCekLength(cek, enc.cekBits);
	return enc.cbc ? cbcEncrypt(enc, plaintext, cek, iv, aad) : gcmEncrypt(enc, plaintext, cek, iv, aad);
}
async function decrypt(enc, cek, ciphertext, iv, tag, aad) {
	if (!isCryptoKey(cek) && !(cek instanceof Uint8Array)) throw new TypeError(invalidKeyInput(cek, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
	if (!iv) throw new JWEInvalid("JWE Initialization Vector missing");
	if (!tag) throw new JWEInvalid("JWE Authentication Tag missing");
	checkIvLength(enc, iv);
	if (cek instanceof Uint8Array) checkCekLength(cek, enc.cekBits);
	return enc.cbc ? cbcDecrypt(enc, cek, ciphertext, iv, tag, aad) : gcmDecrypt(enc, cek, ciphertext, iv, tag, aad);
}
function encodeBase64(input) {
	if (Uint8Array.prototype.toBase64) return input.toBase64();
	const CHUNK_SIZE = 32768;
	const arr = [];
	for (let i = 0; i < input.length; i += CHUNK_SIZE) arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
	return btoa(arr.join(""));
}
function decodeBase64(encoded) {
	if (Uint8Array.fromBase64) return Uint8Array.fromBase64(encoded);
	const binary = atob(encoded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}
var invalid = "The input to be decoded is not correctly encoded.";
function decode(input) {
	if (Uint8Array.fromBase64) try {
		return Uint8Array.fromBase64(typeof input === "string" ? input : decoder.decode(input), { alphabet: "base64url" });
	} catch (cause) {
		throw new TypeError(invalid, { cause });
	}
	let encoded = input;
	if (encoded instanceof Uint8Array) encoded = decoder.decode(encoded);
	if (encoded.includes("+") || encoded.includes("/")) throw new TypeError(invalid);
	encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
	try {
		return decodeBase64(encoded);
	} catch {
		throw new TypeError(invalid);
	}
}
function encode(input) {
	let unencoded = input;
	if (typeof unencoded === "string") unencoded = encoder.encode(unencoded);
	if (Uint8Array.prototype.toBase64) return unencoded.toBase64({
		alphabet: "base64url",
		omitPadding: true
	});
	return encodeBase64(unencoded).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function isObject(input) {
	if (typeof input !== "object" || input === null || Object.prototype.toString.call(input) !== "[object Object]") return false;
	const prototype = Object.getPrototypeOf(input);
	if (prototype === null) return true;
	let proto = prototype;
	while (Object.getPrototypeOf(proto) !== null) proto = Object.getPrototypeOf(proto);
	return prototype === proto;
}
function isDisjoint(...headers) {
	const parameters = /* @__PURE__ */ new Set();
	for (const header of headers) {
		if (!header) continue;
		for (const parameter of Object.keys(header)) {
			if (parameters.has(parameter)) return false;
			parameters.add(parameter);
		}
	}
	return true;
}
var isJWK = (key) => isObject(key) && typeof key.kty === "string";
var isPrivateJWK = (key) => key.kty !== "oct" && (key.kty === "AKP" && typeof key.priv === "string" || typeof key.d === "string");
var isPublicJWK = (key) => key.kty !== "oct" && key.d === void 0 && key.priv === void 0;
var isSecretJWK = (key) => key.kty === "oct" && typeof key.k === "string";
var unprotected = Symbol();
function assertNotSet(value, name) {
	if (value) throw new TypeError(`${name} can only be called once`);
}
function decodeBase64url(value, label, ErrorClass) {
	try {
		return decode(value);
	} catch {
		throw new ErrorClass(`Failed to base64url decode the ${label}`);
	}
}
function encodeBase64url(value, label, ErrorClass) {
	try {
		return encode$1(value);
	} catch {
		throw new ErrorClass(`The ${label} is not a valid base64url string`);
	}
}
async function digest(algorithm, data) {
	const subtleDigest = `SHA-${algorithm.slice(-3)}`;
	return new Uint8Array(await crypto.subtle.digest(subtleDigest, data));
}
function parseJoseHeader(b64, ErrorClass, message) {
	let parsed;
	try {
		parsed = JSON.parse(strictDecoder.decode(decode(b64)));
	} catch {
		throw new ErrorClass(message);
	}
	if (!isObject(parsed)) throw new ErrorClass(message);
	return parsed;
}
async function jwkToKey(entry, jwk) {
	if (jwk.kty === "RSA" && "oth" in jwk && jwk.oth !== void 0) throw new JOSENotSupported("RSA JWK \"oth\" (Other Primes Info) Parameter value is not supported");
	if (!entry.kty.includes(jwk.kty)) throw new JOSENotSupported("Invalid or unsupported JWK \"alg\" (Algorithm) Parameter value");
	const algorithm = entry.resolve?.({
		kty: jwk.kty,
		crv: jwk.crv
	}) ?? entry.subtle;
	const isPrivate = !!(jwk.d || jwk.priv);
	const keyData = { ...jwk };
	if (keyData.kty !== "AKP") delete keyData.alg;
	delete keyData.use;
	return crypto.subtle.importKey("jwk", keyData, algorithm, jwk.ext ?? !isPrivate, jwk.key_ops ?? entry.usages[isPrivate ? 1 : 0]);
}
var tag = (key) => key[Symbol.toStringTag];
var jwkMatchesOp = (entry, key, usage) => {
	const { alg } = entry;
	if (key.use !== void 0) {
		const expected = usage === "sign" || usage === "verify" ? "sig" : "enc";
		if (key.use !== expected) throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
	}
	if (key.alg !== void 0 && key.alg !== alg) throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
	if (Array.isArray(key.key_ops)) {
		const expectedKeyOp = usage === "encrypt" || usage === "decrypt" ? entry.ops?.[usage === "encrypt" ? 0 : 1] : usage;
		if (expectedKeyOp && !key.key_ops.includes(expectedKeyOp)) throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
	}
};
function checkKeyType(entry, key, usage) {
	const { alg, secret } = entry;
	const privateKey = usage === "decrypt" || usage === "sign";
	if (secret && key instanceof Uint8Array) return [BYTES, key];
	if (isJWK(key)) {
		if (secret ? !isSecretJWK(key) : !(privateKey ? isPrivateJWK(key) : isPublicJWK(key))) throw new TypeError(secret ? `JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present` : `JSON Web Key for this operation must be a ${privateKey ? "private" : "public"} JWK`);
		jwkMatchesOp(entry, key, usage);
		return [JWK, key];
	}
	if (!isKeyLike(key)) throw new TypeError(secret ? withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array") : withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key"));
	if (secret) {
		if (key.type !== "secret") throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
	} else {
		if (key.type === "secret") throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
		const expectedType = privateKey ? "private" : "public";
		if ((key.type === "public" || key.type === "private") && key.type !== expectedType) {
			const operation = usage === "sign" ? "signing" : usage === "verify" ? "verifying" : `${usage.slice(0, -1)}tion`;
			throw new TypeError(`${tag(key)} instances for asymmetric algorithm ${operation} must be of type "${expectedType}"`);
		}
	}
	return isCryptoKey(key) ? [CRYPTO, key] : [KEYOBJECT, key];
}
var BYTES = 0;
var CRYPTO = 1;
var KEYOBJECT = 2;
var JWK = 3;
var cache;
var nist = {
	__proto__: null,
	prime256v1: "P-256",
	secp384r1: "P-384",
	secp521r1: "P-521"
};
function cached(key, alg, value) {
	cache ||= /* @__PURE__ */ new WeakMap();
	const entry = cache.get(key);
	if (value) if (entry) entry[alg] = value;
	else cache.set(key, { [alg]: value });
	return value ?? entry?.[alg];
}
var handleJWK = async (key, jwk, entry) => cached(key, entry.alg) ?? cached(key, entry.alg, await jwkToKey(entry, {
	...jwk,
	alg: entry.alg
}));
var handleKeyObject = (keyObject, entry) => {
	const hit = cached(keyObject, entry.alg);
	if (hit) return hit;
	const isPublic = keyObject.type === "public";
	const usages = entry.usages[isPublic ? 0 : 1];
	const { asymmetricKeyType } = keyObject;
	const crv = nist[keyObject.asymmetricKeyDetails?.namedCurve];
	const params = entry.resolve?.({
		crv,
		asymmetricKeyType
	}) ?? entry.subtle;
	return cached(keyObject, entry.alg, keyObject.toCryptoKey(params, isPublic, usages));
};
async function prepareKey(entry, key, usage) {
	const tagged = checkKeyType(entry, key, usage);
	switch (tagged[0]) {
		case BYTES:
		case CRYPTO: return tagged[1];
		case JWK: {
			const key = tagged[1];
			if (key.k) return decode(key.k);
			if (!Object.isFrozen(key)) {
				const { key_ops } = key;
				if (Array.isArray(key_ops)) Object.freeze(key_ops);
				Object.freeze(key);
			}
			return handleJWK(key, key, entry);
		}
		case KEYOBJECT: {
			const keyObject = tagged[1];
			if (keyObject.type === "secret") return keyObject.export();
			if ("toCryptoKey" in keyObject && typeof keyObject.toCryptoKey === "function") return handleKeyObject(keyObject, entry);
			return handleJWK(keyObject, keyObject.export({ format: "jwk" }), entry);
		}
	}
}
function table(entries) {
	const out = { __proto__: null };
	for (const alg in entries) out[alg] = {
		...entries[alg],
		alg
	};
	return out;
}
var wrap = [["encrypt", "wrapKey"], ["decrypt", "unwrapKey"]];
var derive = [[], ["deriveBits"]];
var none = [[], []];
function rsaes(bits) {
	return {
		kty: ["RSA"],
		subtle: {
			name: "RSA-OAEP",
			hash: `SHA-${bits}`
		},
		usages: wrap,
		ops: ["wrapKey", "unwrapKey"]
	};
}
function ecdh() {
	return {
		kty: ["EC", "OKP"],
		subtle: { name: "ECDH" },
		resolve: ({ kty, crv, asymmetricKeyType }) => {
			if (crv === "X25519" || asymmetricKeyType === "x25519") return { name: "X25519" };
			if (kty === "OKP") throw new JOSENotSupported("Invalid or unsupported JWK \"alg\" (Algorithm) Parameter value");
			return {
				name: "ECDH",
				namedCurve: crv
			};
		},
		usages: derive,
		ops: [void 0, "deriveBits"]
	};
}
function aeskw(bits, gcm = false) {
	return {
		kty: ["oct"],
		secret: true,
		subtle: {
			name: gcm ? "AES-GCM" : "AES-KW",
			length: bits
		},
		usages: none,
		ops: gcm ? ["encrypt", "decrypt"] : ["wrapKey", "unwrapKey"]
	};
}
function pbes2() {
	return {
		kty: ["oct"],
		secret: true,
		subtle: { name: "PBKDF2" },
		usages: none,
		ops: ["deriveBits", "deriveBits"]
	};
}
var JWE = table({
	dir: {
		kty: ["oct"],
		secret: true,
		subtle: { name: "AES-GCM" },
		usages: none,
		ops: ["encrypt", "decrypt"]
	},
	"RSA-OAEP": rsaes(1),
	"RSA-OAEP-256": rsaes(256),
	"RSA-OAEP-384": rsaes(384),
	"RSA-OAEP-512": rsaes(512),
	"ECDH-ES": ecdh(),
	"ECDH-ES+A128KW": ecdh(),
	"ECDH-ES+A192KW": ecdh(),
	"ECDH-ES+A256KW": ecdh(),
	A128KW: aeskw(128),
	A192KW: aeskw(192),
	A256KW: aeskw(256),
	A128GCMKW: aeskw(128, true),
	A192GCMKW: aeskw(192, true),
	A256GCMKW: aeskw(256, true),
	"PBES2-HS256+A128KW": pbes2(),
	"PBES2-HS384+A192KW": pbes2(),
	"PBES2-HS512+A256KW": pbes2()
});
var contentOps = ["encrypt", "decrypt"];
function contentEncryption(bits, cbc = false) {
	return {
		kty: ["oct"],
		secret: true,
		subtle: {
			name: cbc ? "AES-CBC" : "AES-GCM",
			length: bits
		},
		usages: none,
		ops: contentOps,
		cekBits: bits,
		ivBits: cbc ? 128 : 96,
		cbc
	};
}
var ENC = table({
	A128GCM: contentEncryption(128),
	A192GCM: contentEncryption(192),
	A256GCM: contentEncryption(256),
	"A128CBC-HS256": contentEncryption(256, true),
	"A192CBC-HS384": contentEncryption(384, true),
	"A256CBC-HS512": contentEncryption(512, true)
});
var unsupportedAlg = "Invalid or unsupported \"alg\" (JWE Algorithm) header value";
function jweAlgorithm(alg) {
	const entry = JWE[alg];
	if (!entry) throw new JOSENotSupported(unsupportedAlg);
	return entry;
}
function maybeJWEAlgorithm(alg) {
	return JWE[alg];
}
function jweEncryption(enc) {
	const entry = ENC[enc];
	if (!entry) throw new JOSENotSupported(`Unsupported JWE Algorithm: ${enc}`);
	return entry;
}
function checkEcdhCryptoKey(key, usage) {
	if (key.algorithm.name !== "ECDH" && key.algorithm.name !== "X25519") throw new TypeError("CryptoKey does not support this operation, its algorithm.name must be ECDH or X25519");
	checkUsage(key, usage);
}
async function aeskwCryptoKey(key, alg, usage) {
	const expected = jweAlgorithm(alg).subtle;
	const cryptoKey = key instanceof Uint8Array ? await crypto.subtle.importKey("raw", key, "AES-KW", true, [usage]) : key;
	checkCryptoKey(cryptoKey, expected, usage);
	return cryptoKey;
}
async function aeskwWrap(alg, key, cek) {
	const cryptoKey = await aeskwCryptoKey(key, alg, "wrapKey");
	const cryptoKeyCek = await crypto.subtle.importKey("raw", cek, {
		hash: "SHA-256",
		name: "HMAC"
	}, true, ["sign"]);
	return new Uint8Array(await crypto.subtle.wrapKey("raw", cryptoKeyCek, cryptoKey, "AES-KW"));
}
async function aeskwUnwrap(alg, key, encryptedKey) {
	const cryptoKey = await aeskwCryptoKey(key, alg, "unwrapKey");
	const cryptoKeyCek = await crypto.subtle.unwrapKey("raw", encryptedKey, cryptoKey, "AES-KW", {
		hash: "SHA-256",
		name: "HMAC"
	}, true, ["sign"]);
	return new Uint8Array(await crypto.subtle.exportKey("raw", cryptoKeyCek));
}
function checkRsaKey(alg, key, usage) {
	checkCryptoKey(key, jweAlgorithm(alg).subtle, usage);
	checkModulusLength(alg, key);
}
function pbes2CryptoKey(key, alg) {
	if (key instanceof Uint8Array) return crypto.subtle.importKey("raw", key, "PBKDF2", false, ["deriveBits"]);
	checkCryptoKey(key, jweAlgorithm(alg).subtle, "deriveBits");
	return key;
}
async function deriveKey(p2s, alg, p2c, key) {
	if (!(p2s instanceof Uint8Array) || p2s.length < 8) throw new JWEInvalid("PBES2 Salt Input must be 8 or more octets");
	if (!Number.isSafeInteger(p2c) || Math.sign(p2c) !== 1) throw new JWEInvalid("PBES2 Count Input must be a positive integer");
	const salt = concat(encode$1(alg), Uint8Array.of(0), p2s);
	const keylen = parseInt(alg.slice(13, 16), 10);
	const subtleAlg = {
		hash: `SHA-${alg.slice(8, 11)}`,
		iterations: p2c,
		name: "PBKDF2",
		salt
	};
	const cryptoKey = await pbes2CryptoKey(key, alg);
	return new Uint8Array(await crypto.subtle.deriveBits(subtleAlg, cryptoKey, keylen));
}
function lengthAndInput(input) {
	return concat(uint32be(input.length), input);
}
async function concatKdf(Z, L, OtherInfo) {
	const dkLen = L >> 3;
	const hashLen = 32;
	const reps = Math.ceil(dkLen / hashLen);
	const dk = new Uint8Array(reps * hashLen);
	for (let i = 1; i <= reps; i++) {
		const hashResult = await digest("sha256", concat(uint32be(i), Z, OtherInfo));
		dk.set(hashResult, (i - 1) * hashLen);
	}
	return dk.slice(0, dkLen);
}
async function ecdhesDeriveKey(publicKey, privateKey, algorithm, keyLength, apu = /* @__PURE__ */ new Uint8Array(), apv = /* @__PURE__ */ new Uint8Array()) {
	checkEcdhCryptoKey(publicKey);
	checkEcdhCryptoKey(privateKey, "deriveBits");
	const otherInfo = concat(lengthAndInput(encode$1(algorithm)), lengthAndInput(apu), lengthAndInput(apv), uint32be(keyLength));
	return concatKdf(new Uint8Array(await crypto.subtle.deriveBits({
		name: publicKey.algorithm.name,
		public: publicKey
	}, privateKey, publicKey.algorithm.name === "X25519" ? 256 : Math.ceil(parseInt(publicKey.algorithm.namedCurve.slice(-3), 10) / 8) << 3)), keyLength, otherInfo);
}
function assertEcdhKey(key) {
	assertCryptoKey(key);
	const curve = key.algorithm.namedCurve;
	if (curve !== "P-256" && curve !== "P-384" && curve !== "P-521" && key.algorithm.name !== "X25519") throw new JOSENotSupported("ECDH with the provided key is not allowed or not supported by your javascript runtime");
}
function assertEncryptedKey(encryptedKey) {
	if (encryptedKey === void 0) throw new JWEInvalid("JWE Encrypted Key missing");
}
function assertNoEncryptedKey(encryptedKey) {
	if (encryptedKey !== void 0) throw new JWEInvalid("Encountered unexpected JWE Encrypted Key");
}
async function decryptKeyManagement(alg, enc, key, encryptedKey, joseHeader, options) {
	const entry = jweAlgorithm(alg);
	if (alg === "dir") {
		assertNoEncryptedKey(encryptedKey);
		return key;
	}
	switch (entry.subtle.name) {
		case "ECDH": {
			if (alg === "ECDH-ES") assertNoEncryptedKey(encryptedKey);
			if (!isObject(joseHeader.epk)) throw new JWEInvalid(`JOSE Header "epk" (Ephemeral Public Key) missing or invalid`);
			assertEcdhKey(key);
			const epk = await jwkToKey(entry, joseHeader.epk);
			let partyUInfo;
			let partyVInfo;
			if (joseHeader.apu !== void 0) {
				if (typeof joseHeader.apu !== "string") throw new JWEInvalid(`JOSE Header "apu" (Agreement PartyUInfo) invalid`);
				partyUInfo = decodeBase64url(joseHeader.apu, "apu", JWEInvalid);
			}
			if (joseHeader.apv !== void 0) {
				if (typeof joseHeader.apv !== "string") throw new JWEInvalid(`JOSE Header "apv" (Agreement PartyVInfo) invalid`);
				partyVInfo = decodeBase64url(joseHeader.apv, "apv", JWEInvalid);
			}
			const sharedSecret = await ecdhesDeriveKey(epk, key, alg === "ECDH-ES" ? enc.alg : alg, alg === "ECDH-ES" ? enc.cekBits : parseInt(alg.slice(-5, -2), 10), partyUInfo, partyVInfo);
			if (alg === "ECDH-ES") return sharedSecret;
			assertEncryptedKey(encryptedKey);
			return aeskwUnwrap(alg.slice(-6), sharedSecret, encryptedKey);
		}
		case "RSA-OAEP":
			assertEncryptedKey(encryptedKey);
			assertCryptoKey(key);
			checkRsaKey(alg, key, "decrypt");
			return new Uint8Array(await crypto.subtle.decrypt("RSA-OAEP", key, encryptedKey));
		case "PBKDF2": {
			assertEncryptedKey(encryptedKey);
			if (typeof joseHeader.p2c !== "number") throw new JWEInvalid(`JOSE Header "p2c" (PBES2 Count) missing or invalid`);
			const p2cLimit = options?.maxPBES2Count || 1e4;
			if (joseHeader.p2c > p2cLimit) throw new JWEInvalid(`JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds`);
			if (typeof joseHeader.p2s !== "string") throw new JWEInvalid(`JOSE Header "p2s" (PBES2 Salt) missing or invalid`);
			const derived = await deriveKey(decodeBase64url(joseHeader.p2s, "p2s", JWEInvalid), alg, joseHeader.p2c, key);
			return aeskwUnwrap(alg.slice(-6), derived, encryptedKey);
		}
		case "AES-KW":
			assertEncryptedKey(encryptedKey);
			return aeskwUnwrap(alg, key, encryptedKey);
		case "AES-GCM": {
			assertEncryptedKey(encryptedKey);
			if (typeof joseHeader.iv !== "string") throw new JWEInvalid(`JOSE Header "iv" (Initialization Vector) missing or invalid`);
			if (typeof joseHeader.tag !== "string") throw new JWEInvalid(`JOSE Header "tag" (Authentication Tag) missing or invalid`);
			let iv;
			iv = decodeBase64url(joseHeader.iv, "iv", JWEInvalid);
			let tag;
			tag = decodeBase64url(joseHeader.tag, "tag", JWEInvalid);
			return decrypt(jweEncryption(alg.slice(0, -2)), key, encryptedKey, iv, tag, /* @__PURE__ */ new Uint8Array());
		}
	}
}
async function encryptKeyManagement(alg, enc, key, providedCek, providedParameters = {}) {
	let encryptedKey;
	let parameters;
	let cek;
	const entry = jweAlgorithm(alg);
	if (alg === "dir") return [
		key,
		void 0,
		void 0
	];
	switch (entry.subtle.name) {
		case "ECDH": {
			assertEcdhKey(key);
			const { apu, apv } = providedParameters;
			let ephemeralKey;
			if (providedParameters.epk) ephemeralKey = await prepareKey(entry, providedParameters.epk, "decrypt");
			else ephemeralKey = (await crypto.subtle.generateKey(key.algorithm, true, ["deriveBits"])).privateKey;
			const subtle = crypto.subtle;
			let exportableEpk = ephemeralKey;
			if (!exportableEpk.extractable) {
				if (typeof subtle.getPublicKey !== "function") throw new TypeError("CryptoKey for \"epk\" must be extractable");
				exportableEpk = await subtle.getPublicKey(ephemeralKey, []);
			}
			const { x, y, crv, kty } = await subtle.exportKey("jwk", exportableEpk);
			const sharedSecret = await ecdhesDeriveKey(key, ephemeralKey, alg === "ECDH-ES" ? enc.alg : alg, alg === "ECDH-ES" ? enc.cekBits : parseInt(alg.slice(-5, -2), 10), apu, apv);
			parameters = { epk: {
				x,
				crv,
				kty
			} };
			if (kty === "EC") parameters.epk.y = y;
			if (apu) parameters.apu = encode(apu);
			if (apv) parameters.apv = encode(apv);
			if (alg === "ECDH-ES") {
				cek = sharedSecret;
				break;
			}
			cek = providedCek || generateCek(enc);
			encryptedKey = await aeskwWrap(alg.slice(-6), sharedSecret, cek);
			break;
		}
		case "RSA-OAEP":
			cek = providedCek || generateCek(enc);
			assertCryptoKey(key);
			checkRsaKey(alg, key, "encrypt");
			encryptedKey = new Uint8Array(await crypto.subtle.encrypt("RSA-OAEP", key, cek));
			break;
		case "PBKDF2": {
			cek = providedCek || generateCek(enc);
			const { p2c = 2048, p2s = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16)) } = providedParameters;
			const derived = await deriveKey(p2s, alg, p2c, key);
			encryptedKey = await aeskwWrap(alg.slice(-6), derived, cek);
			parameters = {
				p2c,
				p2s: encode(p2s)
			};
			break;
		}
		case "AES-KW":
			cek = providedCek || generateCek(enc);
			encryptedKey = await aeskwWrap(alg, key, cek);
			break;
		case "AES-GCM": {
			cek = providedCek || generateCek(enc);
			const { iv } = providedParameters;
			const wrapped = await encrypt(jweEncryption(alg.slice(0, -2)), cek, key, iv, /* @__PURE__ */ new Uint8Array());
			encryptedKey = wrapped.ciphertext;
			parameters = {
				iv: encode(wrapped.iv),
				tag: encode(wrapped.tag)
			};
			break;
		}
	}
	return [
		cek,
		encryptedKey,
		parameters
	];
}
var JWS_RECOGNIZED = {
	__proto__: null,
	b64: true
};
var JWE_RECOGNIZED = { __proto__: null };
function validateAlgorithms(option, algorithms) {
	if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) throw new TypeError(`"${option}" option must be an array of strings`);
	if (!algorithms) return;
	return new Set(algorithms);
}
function validateCritDuplicates(Err, protectedHeader) {
	const { crit } = protectedHeader ?? {};
	if (Array.isArray(crit) && new Set(crit).size !== crit.length) throw new Err("\"crit\" (Critical) Header Parameter MUST NOT contain duplicate values");
}
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
	if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) throw new Err("\"crit\" (Critical) Header Parameter MUST be integrity protected");
	if (!protectedHeader || protectedHeader.crit === void 0) return [];
	if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) throw new Err("\"crit\" (Critical) Header Parameter MUST be an array of non-empty strings when present");
	const recognized = recognizedOption === void 0 ? recognizedDefault : {
		__proto__: null,
		...recognizedOption,
		...recognizedDefault
	};
	for (const parameter of protectedHeader.crit) {
		if (!(parameter in recognized)) throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
		if (!Object.hasOwn(joseHeader, parameter) || joseHeader[parameter] === void 0) throw new Err(`Extension Header Parameter "${parameter}" is missing`);
		if (recognized[parameter] && (!Object.hasOwn(protectedHeader, parameter) || protectedHeader[parameter] === void 0)) throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
	}
	return protectedHeader.crit;
}
function supported(name) {
	if (typeof globalThis[name] === "undefined") throw new JOSENotSupported(`JWE "zip" (Compression Algorithm) Header Parameter requires the ${name} API.`);
}
async function compress(input) {
	supported("CompressionStream");
	const cs = new CompressionStream("deflate-raw");
	const writer = cs.writable.getWriter();
	writer.write(input).catch(() => {});
	writer.close().catch(() => {});
	const chunks = [];
	const reader = cs.readable.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	return concat(...chunks);
}
async function decompress(input, maxLength) {
	supported("DecompressionStream");
	const ds = new DecompressionStream("deflate-raw");
	const writer = ds.writable.getWriter();
	writer.write(input).catch(() => {});
	writer.close().catch(() => {});
	const chunks = [];
	let length = 0;
	const reader = ds.readable.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		chunks.push(value);
		length += value.byteLength;
		if (maxLength !== Infinity && length > maxLength) throw new JWEInvalid("Decompressed plaintext exceeded the configured limit");
	}
	return concat(...chunks);
}
function shareJWE(jwe) {
	const { protected: encodedProtected, ciphertext, iv, tag, aad } = jwe;
	let parsedProt;
	if (encodedProtected) parsedProt = parseJoseHeader(encodedProtected, JWEInvalid, "JWE Protected Header is invalid");
	const protectedHeader = encodedProtected !== void 0 ? encode$1(encodedProtected) : /* @__PURE__ */ new Uint8Array();
	return [
		parsedProt,
		decodeBase64url(ciphertext, "ciphertext", JWEInvalid),
		iv !== void 0 ? decodeBase64url(iv, "iv", JWEInvalid) : void 0,
		tag !== void 0 ? decodeBase64url(tag, "tag", JWEInvalid) : void 0,
		aad !== void 0 ? concat(protectedHeader, encode$1("."), encodeBase64url(aad, "aad", JWEInvalid)) : protectedHeader
	];
}
function prepareDecrypt(options) {
	return [
		options && validateAlgorithms("keyManagementAlgorithms", options.keyManagementAlgorithms),
		options && validateAlgorithms("contentEncryptionAlgorithms", options.contentEncryptionAlgorithms),
		options
	];
}
async function decryptRecipient(jwe, token, shared, key) {
	const [keyManagementAlgorithms, contentEncryptionAlgorithms, options] = shared;
	const [parsedProt, ciphertext, iv, tag, additionalData] = token;
	const { encrypted_key: encodedKey, header, unprotected } = jwe;
	let joseHeader;
	if (header !== void 0 || unprotected !== void 0) {
		if (!isDisjoint(parsedProt, header, unprotected)) throw new JWEInvalid("JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint");
		joseHeader = {
			...parsedProt,
			...header,
			...unprotected
		};
	} else joseHeader = parsedProt ?? {};
	validateCrit(JWEInvalid, JWE_RECOGNIZED, options?.crit, parsedProt, joseHeader);
	if (joseHeader.zip !== void 0 && joseHeader.zip !== "DEF") throw new JOSENotSupported("Unsupported JWE \"zip\" (Compression Algorithm) Header Parameter value.");
	if (joseHeader.zip !== void 0 && !parsedProt?.zip) throw new JWEInvalid("JWE \"zip\" (Compression Algorithm) Header Parameter MUST be in a protected header.");
	const { alg, enc } = joseHeader;
	if (typeof alg !== "string" || !alg) throw new JWEInvalid("missing JWE Algorithm (alg) in JWE Header");
	if (typeof enc !== "string" || !enc) throw new JWEInvalid("missing JWE Encryption Algorithm (enc) in JWE Header");
	if (keyManagementAlgorithms && !keyManagementAlgorithms.has(alg) || !keyManagementAlgorithms && alg.startsWith("PBES2")) throw new JOSEAlgNotAllowed("\"alg\" (Algorithm) Header Parameter value not allowed");
	if (contentEncryptionAlgorithms && !contentEncryptionAlgorithms.has(enc)) throw new JOSEAlgNotAllowed("\"enc\" (Encryption Algorithm) Header Parameter value not allowed");
	const encEntry = jweEncryption(enc);
	let encryptedKey;
	if (encodedKey !== void 0) encryptedKey = decodeBase64url(encodedKey, "encrypted_key", JWEInvalid);
	let resolvedKey = false;
	if (typeof key === "function") {
		key = await key(parsedProt, jwe);
		resolvedKey = true;
	}
	const algEntry = jweAlgorithm(alg);
	const k = await prepareKey(alg === "dir" ? encEntry : algEntry, key, "decrypt");
	let cek;
	try {
		cek = await decryptKeyManagement(alg, encEntry, k, encryptedKey, joseHeader, options);
	} catch (err) {
		if (err instanceof TypeError || err instanceof JWEInvalid || err instanceof JOSENotSupported) throw err;
		cek = generateCek(encEntry);
	}
	let plaintext = await decrypt(encEntry, cek, ciphertext, iv, tag, additionalData);
	if (joseHeader.zip === "DEF") {
		const maxDecompressedLength = options?.maxDecompressedLength ?? 25e4;
		if (maxDecompressedLength === 0) throw new JOSENotSupported("JWE \"zip\" (Compression Algorithm) Header Parameter is not supported.");
		if (maxDecompressedLength !== Infinity && (!Number.isSafeInteger(maxDecompressedLength) || maxDecompressedLength < 1)) throw new TypeError("maxDecompressedLength must be 0, a positive safe integer, or Infinity");
		plaintext = await decompress(plaintext, maxDecompressedLength).catch((cause) => {
			if (cause instanceof JWEInvalid) throw cause;
			throw new JWEInvalid("Failed to decompress plaintext", { cause });
		});
	}
	return [
		plaintext,
		parsedProt,
		k,
		resolvedKey
	];
}
async function decryptJWE(jwe, shared, key) {
	return decryptRecipient(jwe, shareJWE(jwe), shared, key);
}
async function decryptCompact(jwe, shared, key) {
	if (jwe instanceof Uint8Array) jwe = decoder.decode(jwe);
	if (typeof jwe !== "string") throw new JWEInvalid("Compact JWE must be a string or Uint8Array");
	const { 0: protectedHeader, 1: encryptedKey, 2: iv, 3: ciphertext, 4: tag, length } = jwe.split(".");
	if (length !== 5) throw new JWEInvalid("Invalid Compact JWE");
	return decryptJWE({
		ciphertext,
		iv: iv || void 0,
		protected: protectedHeader,
		tag: tag || void 0,
		encrypted_key: encryptedKey || void 0
	}, shared, key);
}
function checkEncryptHeaders(input) {
	const [, protectedHeader, unprotectedHeader, sharedUnprotectedHeader, , , , , crit] = input;
	if (!isDisjoint(protectedHeader, unprotectedHeader, sharedUnprotectedHeader)) throw new JWEInvalid("JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint");
	const joseHeader = {
		...protectedHeader,
		...unprotectedHeader,
		...sharedUnprotectedHeader
	};
	validateCrit(JWEInvalid, JWE_RECOGNIZED, crit, protectedHeader, joseHeader);
	if (joseHeader.zip !== void 0 && joseHeader.zip !== "DEF") throw new JOSENotSupported("Unsupported JWE \"zip\" (Compression Algorithm) Header Parameter value.");
	if (joseHeader.zip !== void 0 && !protectedHeader?.zip) throw new JWEInvalid("JWE \"zip\" (Compression Algorithm) Header Parameter MUST be in a protected header.");
	const { alg, enc } = joseHeader;
	if (typeof alg !== "string" || !alg) throw new JWEInvalid("JWE \"alg\" (Algorithm) Header Parameter missing or invalid");
	if (typeof enc !== "string" || !enc) throw new JWEInvalid("JWE \"enc\" (Encryption Algorithm) Header Parameter missing or invalid");
	return [
		joseHeader,
		alg,
		enc,
		jweEncryption(enc)
	];
}
async function encryptJWE(input, checked, key) {
	const [joseHeader, alg, , encEntry] = checked;
	const [inputPlaintext, inputProtectedHeader, inputUnprotectedHeader, sharedUnprotectedHeader, aad, providedCek, inputIv, keyManagementParameters, , unprotectedParameters] = input;
	let protectedHeader = inputProtectedHeader;
	let unprotectedHeader = inputUnprotectedHeader;
	if (providedCek && (alg === "dir" || alg === "ECDH-ES")) throw new TypeError(`setContentEncryptionKey cannot be called with JWE "alg" (Algorithm) Header ${alg}`);
	const algEntry = jweAlgorithm(alg);
	const [cek, encryptedKey, parameters] = await encryptKeyManagement(alg, encEntry, await prepareKey(alg === "dir" ? encEntry : algEntry, key, "encrypt"), providedCek, keyManagementParameters);
	if (parameters) if (unprotectedParameters) unprotectedHeader = unprotectedHeader ? {
		...unprotectedHeader,
		...parameters
	} : parameters;
	else protectedHeader = protectedHeader ? {
		...protectedHeader,
		...parameters
	} : parameters;
	let protectedHeaderS;
	let protectedHeaderB;
	if (protectedHeader) {
		protectedHeaderS = encode(JSON.stringify(protectedHeader));
		protectedHeaderB = encode$1(protectedHeaderS);
	} else {
		protectedHeaderS = "";
		protectedHeaderB = /* @__PURE__ */ new Uint8Array();
	}
	let additionalData;
	let aadMember;
	if (aad?.byteLength) {
		aadMember = encode(aad);
		additionalData = concat(protectedHeaderB, encode$1("."), encode$1(aadMember));
	} else additionalData = protectedHeaderB;
	let plaintext = inputPlaintext;
	if (joseHeader.zip === "DEF") plaintext = await compress(plaintext).catch((cause) => {
		throw new JWEInvalid("Failed to compress plaintext", { cause });
	});
	const { ciphertext, tag, iv } = await encrypt(encEntry, plaintext, cek, inputIv, additionalData);
	const jwe = { ciphertext: encode(ciphertext) };
	if (iv) jwe.iv = encode(iv);
	if (tag) jwe.tag = encode(tag);
	if (encryptedKey) jwe.encrypted_key = encode(encryptedKey);
	if (aadMember) jwe.aad = aadMember;
	if (protectedHeader) jwe.protected = protectedHeaderS;
	if (sharedUnprotectedHeader) jwe.unprotected = sharedUnprotectedHeader;
	if (unprotectedHeader) jwe.header = unprotectedHeader;
	return jwe;
}
async function createJWE(input, key) {
	return encryptJWE(input, checkEncryptHeaders(input), key);
}
var FlattenedEncrypt = class {
	#plaintext;
	#protectedHeader;
	#sharedUnprotectedHeader;
	#unprotectedHeader;
	#aad;
	#cek;
	#iv;
	#keyManagementParameters;
	constructor(plaintext) {
		if (!(plaintext instanceof Uint8Array)) throw new TypeError("plaintext must be an instance of Uint8Array");
		this.#plaintext = plaintext;
	}
	setKeyManagementParameters(parameters) {
		assertNotSet(this.#keyManagementParameters, "setKeyManagementParameters");
		this.#keyManagementParameters = parameters;
		return this;
	}
	setProtectedHeader(protectedHeader) {
		assertNotSet(this.#protectedHeader, "setProtectedHeader");
		this.#protectedHeader = protectedHeader;
		return this;
	}
	setSharedUnprotectedHeader(sharedUnprotectedHeader) {
		assertNotSet(this.#sharedUnprotectedHeader, "setSharedUnprotectedHeader");
		this.#sharedUnprotectedHeader = sharedUnprotectedHeader;
		return this;
	}
	setUnprotectedHeader(unprotectedHeader) {
		assertNotSet(this.#unprotectedHeader, "setUnprotectedHeader");
		this.#unprotectedHeader = unprotectedHeader;
		return this;
	}
	setAdditionalAuthenticatedData(aad) {
		this.#aad = aad;
		return this;
	}
	setContentEncryptionKey(cek) {
		assertNotSet(this.#cek, "setContentEncryptionKey");
		this.#cek = cek;
		return this;
	}
	setInitializationVector(iv) {
		assertNotSet(this.#iv, "setInitializationVector");
		this.#iv = iv;
		return this;
	}
	async encrypt(key, options) {
		if (!this.#protectedHeader && !this.#unprotectedHeader && !this.#sharedUnprotectedHeader) throw new JWEInvalid("either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()");
		validateCritDuplicates(JWEInvalid, this.#protectedHeader);
		return createJWE([
			this.#plaintext,
			this.#protectedHeader,
			this.#unprotectedHeader,
			this.#sharedUnprotectedHeader,
			this.#aad,
			this.#cek,
			this.#iv,
			this.#keyManagementParameters,
			options?.crit,
			options ? unprotected in options : false
		], key);
	}
};
var CompactEncrypt = class {
	#flattened;
	constructor(plaintext) {
		this.#flattened = new FlattenedEncrypt(plaintext);
	}
	setContentEncryptionKey(cek) {
		this.#flattened.setContentEncryptionKey(cek);
		return this;
	}
	setInitializationVector(iv) {
		this.#flattened.setInitializationVector(iv);
		return this;
	}
	setProtectedHeader(protectedHeader) {
		this.#flattened.setProtectedHeader(protectedHeader);
		return this;
	}
	setKeyManagementParameters(parameters) {
		this.#flattened.setKeyManagementParameters(parameters);
		return this;
	}
	async encrypt(key, options) {
		const jwe = await this.#flattened.encrypt(key, options);
		return [
			jwe.protected,
			jwe.encrypted_key,
			jwe.iv,
			jwe.ciphertext,
			jwe.tag
		].join(".");
	}
};
function decodeProtectedHeader(token) {
	let protectedB64u;
	if (typeof token === "string") {
		const parts = token.split(".");
		if (parts.length === 3 || parts.length === 5) [protectedB64u] = parts;
	} else if (typeof token === "object" && token) if ("protected" in token) protectedB64u = token.protected;
	else throw new TypeError("Token does not contain a Protected Header");
	const invalid = "Invalid Token or Protected Header formatting";
	if (typeof protectedB64u !== "string" || !protectedB64u) throw new TypeError(invalid);
	return parseJoseHeader(protectedB64u, TypeError, invalid);
}
//#endregion
export { invalidKeyInput as A, prepareDecrypt as B, decoder as C, encode$1 as D, encode as E, isKeyObject as F, validateCrit as G, strictDecoder as H, isObject as I, validateCritDuplicates as K, jwkToKey as L, isDisjoint as M, isJWK as N, encodeBase64url as O, isKeyLike as P, maybeJWEAlgorithm as R, decodeProtectedHeader as S, digest as T, table as U, prepareKey as V, validateAlgorithms as W, checkCryptoKey as _, JWKInvalid as a, decode as b, JWKSNoMatchingKey as c, JWSSignatureVerificationFailed as d, JWS_RECOGNIZED as f, assertNotSet as g, JWTInvalid as h, JOSENotSupported as i, isCryptoKey as j, encoder as k, JWKSTimeout as l, JWTExpired as m, JOSEAlgNotAllowed as n, JWKSInvalid as o, JWTClaimValidationFailed as p, JOSEError as r, JWKSMultipleMatchingKeys as s, CompactEncrypt as t, JWSInvalid as u, checkModulusLength as v, decryptCompact as w, decodeBase64url as x, concat as y, parseJoseHeader as z };

//# sourceMappingURL=decode_protected_header-BkI8IgKI.mjs.map