import { defineConfig } from "tsdown";
import Vue from "unplugin-vue/rolldown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/density.ts",
    "src/fullscreen.ts",
    "src/grouping.ts",
    "src/tree.ts",
    "src/row-detail.ts",
    "src/nested-table.ts",
    "src/editing.ts",
    "src/batch-editing.ts",
    "src/filters.ts",
    "src/header-filters.ts",
    "src/cell-navigation.ts",
    "src/column-selection.ts",
    "src/find-in-table.ts",
    "src/status-bar.ts",
    "src/selection-stats.ts",
    "src/column-menu.ts",
  ],
  platform: "neutral",
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  plugins: [Vue({ isProduction: true })],
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
