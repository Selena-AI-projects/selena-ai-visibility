import { beforeEach, describe, expect, it, vi } from "vitest";

const promptForUser = vi.fn();
vi.mock("@/lib/auth/helpers", () => ({ promptForUser: (...args: unknown[]) => promptForUser(...args) }));

const { requirePromptInBrand } = await import("./prompt-access");

describe("requirePromptInBrand", () => {
	beforeEach(() => promptForUser.mockReset());

	it("returns a prompt the user can reach in the requested brand", async () => {
		promptForUser.mockResolvedValue({ id: "p1", brandId: "b1" });
		await expect(requirePromptInBrand("u1", "b1", "p1")).resolves.toMatchObject({ id: "p1" });
	});

	it("rejects a prompt from another tenant", async () => {
		promptForUser.mockResolvedValue(undefined);
		await expect(requirePromptInBrand("u1", "b1", "foreign")).rejects.toThrow("Prompt not found");
	});

	it("rejects a prompt of another brand the user can also reach", async () => {
		promptForUser.mockResolvedValue({ id: "p2", brandId: "b2" });
		await expect(requirePromptInBrand("u1", "b1", "p2")).rejects.toThrow("Prompt not found");
	});
});
