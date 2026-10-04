import type { ClientConfig } from "@workspace/config/types";

type VerificationConfig = {
	mode?: ClientConfig["mode"];
	features?: { selfServeSignup?: boolean };
};

/**
 * Whether a fresh sign-up must confirm its email before it can sign in. This
 * mirrors the server, which turns verification on for cloud and for the
 * self-serve pilot in local mode: sending such a visitor straight to the app
 * only bounces them back to the login page with no word about the email.
 */
export function shouldAwaitVerification(clientConfig?: VerificationConfig): boolean {
	return clientConfig?.mode === "cloud" || clientConfig?.features?.selfServeSignup === true;
}
