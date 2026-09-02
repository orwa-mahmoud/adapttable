import { babel } from "@rollup/plugin-babel";
import { defineConfig } from "tsdown";

export default defineConfig({
  // React Server Components: hook-bearing client libraries must mark
  // their built entries, or every Next.js App Router consumer has to
  // hand-write a client wrapper.
  banner: { js: '"use client";' },
  entry: [
    "src/preset.ts",
    "src/row-pinning.ts",
    "src/batch-editing.ts",
    "src/cell-span.ts",
    "src/extra-rows.ts",
    "src/row-appearance.ts",
    "src/row-detail.ts",
    "src/nested-table.ts",
    "src/tree.ts",
    "src/resizable-columns.ts",
    "src/column-groups.ts",
    "src/export.ts",
    "src/find-in-table.ts",
    "src/fullscreen.ts",
    "src/command-palette.ts",
    "src/context-menu.ts",
    "src/side-panel.ts",
    "src/bulk-actions.ts",
    "src/filters.ts",
    "src/header-filters.ts",
    "src/saved-views.ts",
    "src/selection-stats.ts",
    "src/density.ts",
    "src/print.ts",
    "src/status-bar.ts",
    "src/multi-sort.ts",
    "src/fit-columns.ts",
    "src/row-actions.ts",
    "src/column-selection.ts",
    "src/index.ts",
    "src/features.ts",
    "src/row-reorder.ts",
    "src/grouping.ts",
    "src/grouping-panel.ts",
    "src/editing.ts",
    "src/virtualize.ts",
    "src/column-menu.ts",
    "src/cell-navigation.ts",
    "src/pivot.ts",
  ],
  format: ["esm", "cjs"],
  // The published declarations come from `src` alone. The package's own
  // tsconfig also covers its vitest and tsdown configs so typecheck sees
  // them, and pulling those into the dts program makes it emit a stray
  // declaration beside the root's vitest.shared.ts.
  tsconfig: "./tsconfig.build.json",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  deps: {
    neverBundle: [
      "react",
      "react-dom",
      "@adapttable/unstyled",
      "@adapttable/core",
    ],
  },
  plugins: [
    babel({
      babelHelpers: "bundled",
      extensions: [".ts", ".tsx"],
      presets: ["@babel/preset-typescript"],
      plugins: [["babel-plugin-react-compiler", { target: "18" }]],
    }),
  ],
});
