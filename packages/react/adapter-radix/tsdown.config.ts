import { babel } from "@rollup/plugin-babel";
import { defineConfig } from "tsdown";

export default defineConfig({
  // React Server Components: hook-bearing client libraries must mark
  // their built entries, or every Next.js App Router consumer has to
  // hand-write a client wrapper.
  banner: { js: '"use client";' },
  entry: [
    "src/assistant.tsx",
    "src/pinned-summary-rows.ts",

    "src/preset.ts",
    "src/row-pinning.ts",
    "src/cell-span.ts",
    "src/extra-rows.ts",
    "src/row-appearance.ts",
    "src/row-detail.tsx",
    "src/nested-table.tsx",
    "src/tree.tsx",
    "src/resizable-columns.ts",
    "src/column-groups.tsx",
    "src/export.tsx",
    "src/find-in-table.tsx",
    "src/fullscreen.tsx",
    "src/command-palette.tsx",
    "src/context-menu.tsx",
    "src/side-panel.tsx",
    "src/bulk-actions.tsx",
    "src/filters.tsx",
    "src/header-filters.tsx",
    "src/saved-views.tsx",
    "src/selection-stats.ts",
    "src/density.tsx",
    "src/print.tsx",
    "src/status-bar.tsx",
    "src/multi-sort.ts",
    "src/fit-columns.ts",
    "src/row-actions.ts",
    "src/column-selection.tsx",
    "src/index.ts",
    "src/features.ts",
    "src/row-reorder.tsx",
    "src/grouping.tsx",
    "src/grouping-panel.tsx",
    "src/editing.tsx",
    "src/virtualize.ts",
    "src/column-menu.tsx",
    "src/cell-navigation.tsx",
    "src/pivot.ts",
    "src/batch-editing.tsx",
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
    neverBundle: ["react", "react-dom", "@radix-ui/themes", "@adapttable/core"],
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
