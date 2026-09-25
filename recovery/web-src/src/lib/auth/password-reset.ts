import type { ClientConfig } from "@workspace/config/types";

type PasswordResetConfig = {
	mode?: ClientConfig["mode"];
	features?: { selfServeSignup?: boolean };
};

/** Password resets are available to cloud users and the invited self-serve pilot. */
export function canResetPassword(clientConfig?: PasswordResetConfig): boolean {
	return clientConfig?.mode === "cloud" || clientConfig?.features?.selfServeSignup === true;
}
