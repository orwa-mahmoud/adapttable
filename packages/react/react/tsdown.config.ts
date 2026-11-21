import { fileURLToPath } from "node:url";

import { babel } from "@rollup/plugin-babel";
import { defineConfig } from "tsdown";

import {
  devWarningPlugins,
  type Flavor,
  FLAVORS,
} from "../../../scripts/dev-build.mjs";

const SOURCE_DIR = fileURLToPath(new URL("src/", import.meta.url));

const library = (flavor: Flavor) =>
  defineConfig({
    banner: { js: '"use client";' },
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
    format: ["esm", "cjs"],
    tsconfig: "./tsconfig.build.json",
    // Both builds share the production build's declarations.
    dts: flavor.production ? { eager: true } : false,
    sourcemap: true,
    clean: flavor.production,
    treeshake: true,
    outExtensions: ({ format }) => ({
      js: format === "es" ? ".js" : ".cjs",
      dts: format === "es" ? ".d.ts" : ".d.cts",
    }),
    deps: {
      neverBundle: ["react", "react-dom", "@adapttable/core"],
    },
    plugins: [
      ...devWarningPlugins(flavor, SOURCE_DIR),
      babel({
        babelHelpers: "bundled",
        extensions: [".ts", ".tsx"],
        presets: ["@babel/preset-typescript"],
        plugins: [["babel-plugin-react-compiler", { target: "18" }]],
      }),
    ],
  });

export default FLAVORS.map(library);
