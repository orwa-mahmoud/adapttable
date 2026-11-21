import { fileURLToPath } from "node:url";

import { defineConfig } from "tsdown";

import {
  devWarningPlugins,
  type Flavor,
  FLAVORS,
} from "../../../scripts/dev-build.mjs";

const SOURCE_DIR = fileURLToPath(new URL("src/", import.meta.url));

const library = (flavor: Flavor) =>
  defineConfig({
    outDir: flavor.outDir,
    entry: [
      "src/index.ts",
      "src/adapter.ts",
      "src/features.ts",
      "src/formula.ts",
      "src/pivot.ts",
      "src/stream.ts",
      "src/sparkline.ts",
      "src/pdf.ts",
      "src/xlsx.ts",
    ],
    platform: "neutral",
    format: ["esm", "cjs"],
    tsconfig: "./tsconfig.build.json",
    // Both builds share the production build's declarations.
    dts: flavor.production ? { vue: true } : false,
    sourcemap: true,
    clean: flavor.production,
    treeshake: true,
    deps: {
      neverBundle: ["vue", "@adapttable/core", /^@adapttable\/vue(?:\/.*)?$/],
    },
    outExtensions: ({ format }) => ({
      js: format === "es" ? ".js" : ".cjs",
      dts: format === "es" ? ".d.ts" : ".d.cts",
    }),
    plugins: devWarningPlugins(flavor, SOURCE_DIR),
  });

export default FLAVORS.map(library);
