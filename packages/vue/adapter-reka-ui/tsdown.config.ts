import { defineConfig } from "tsdown";
import Vue from "unplugin-vue/rolldown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/filters.ts",
    "src/grouping.ts",
    "src/density.ts",
    "src/fullscreen.ts",
    "src/header-filters.ts",
    "src/row-actions.ts",
    "src/row-detail.ts",
    "src/tree.ts",
    "src/editing.ts",
    "src/batch-editing.ts",
  ],
  platform: "neutral",
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  plugins: [Vue({ isProduction: true })],
  css: { fileName: "styles.css", splitting: false, inject: false },
  dts: { vue: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  deps: { neverBundle: ["vue", "reka-ui", /^@adapttable\/vue(?:\/.*)?$/] },
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
});
