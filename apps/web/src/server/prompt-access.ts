import { promptForUser } from "@/lib/auth/helpers";

/**
 * Brand access alone does not cover a prompt id taken from the request: reads
 * keyed by prompt id would otherwise return another tenant's data. A foreign
 * prompt, a prompt of another brand and a missing one are the same "not found".
 */
export async function requirePromptInBrand(userId: string, brandId: string, promptId: string) {
	const owned = await promptForUser(userId, promptId);
	if (!owned || owned.brandId !== brandId) throw new Error("Prompt not found");
	return owned;
}
