import { fileURLToPath } from "node:url";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { embedBinaries, externalizeResvg } from "@workspace/og/vite-plugin";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };
import { nodeBuiltinsInertOnClient } from "./vite-node-builtins-inert";

const tslibEsm = fileURLToPath(import.meta.resolve("tslib/tslib.es6.mjs"));

export default defineConfig({
	build: {
		sourcemap: "hidden",
	},
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
	},
	optimizeDeps: nodeBuiltinsInertOnClient.optimizeDeps,
	resolve: {
		tsconfigPaths: true,
		alias: {
			"@/": fileURLToPath(new URL("./src/", import.meta.url)),
			tslib: tslibEsm,
		},
	},
	plugins: [
		nodeBuiltinsInertOnClient.plugin(),
		embedBinaries(),
		externalizeResvg(),
		devtools(),
		tailwindcss(),
		tanstackStart(),
		nitro({
			traceDeps: ["@resvg/resvg-js"],
			sourcemap: true,
			alias: {
				tslib: tslibEsm,
			},
			noExternals: ["@opentelemetry/instrumentation", "@opentelemetry/api", "@prisma/instrumentation"],
			rollupConfig: {
				external: ["fsevents"],
			},
		}),
		viteReact(),
		...sentryTanstackStart(),
	],
});
