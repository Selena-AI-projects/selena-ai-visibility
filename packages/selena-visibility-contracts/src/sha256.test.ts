import { describe, expect, it } from "vitest";
import { sha256HexSync } from "./sha256";

// Reference digests from `openssl dgst -sha256`: every hash written into an
// evidence row before this implementation must still verify against it.
describe("sha256HexSync", () => {
	it.each([
		["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
		["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
		["Москва, Тверская 1 — наблюдение", "ae9a3fd6dbe8190c6f91910c4623528c3121bc744c8cb0cf3235c470af6cc725"],
		// Padding edge cases: 55 bytes fit one block with the length, 56 and 64 spill into a second.
		["a".repeat(55), "9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318"],
		["a".repeat(56), "b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a"],
		["a".repeat(64), "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb"],
		["x".repeat(1000), "44f8354494a5ba03ba1792a8d3e9c534c47a9181980fde7a3f44b06ef2ae7c7f"],
	])("matches the reference digest for %j", (text, digest) => {
		expect(sha256HexSync(text)).toBe(digest);
	});
});
