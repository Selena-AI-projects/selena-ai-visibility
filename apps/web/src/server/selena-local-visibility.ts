import { createServerFn } from "@tanstack/react-start";
import { isLocalVisibilityEnabled } from "@workspace/lib/selena-local-execution";

export type LocalVisibilityFeatureState = {
	enabled: boolean;
	status: "LOCKED" | "UNKNOWN";
};

export function localVisibilityFeatureState(env: Record<string, string | undefined>): LocalVisibilityFeatureState {
	const enabled = isLocalVisibilityEnabled(env);
	return { enabled, status: enabled ? "UNKNOWN" : "LOCKED" };
}

export const getSelenaLocalVisibilityStateFn = createServerFn({ method: "GET" }).handler(async () =>
	localVisibilityFeatureState(process.env),
);
