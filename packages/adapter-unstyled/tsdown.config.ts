import { babel } from "@rollup/plugin-babel";
import { defineConfig } from "tsdown";

export default defineConfig({
  // React Server Components: hook-bearing client libraries must mark
  // their built entries, or every Next.js App Router consumer has to
  // hand-write a client wrapper.
  banner: { js: '"use client";' },
  entry: [
    "src/index.ts",
    "src/features.ts",
    "src/row-reorder.ts",
    "src/saved-views.ts",
    "src/grouping.ts",
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
  deps: { neverBundle: ["react", "react-dom", "@adapttable/core"] },
  plugins: [
    babel({
      babelHelpers: "bundled",
      extensions: [".ts", ".tsx"],
      presets: ["@babel/preset-typescript"],
      plugins: [["babel-plugin-react-compiler", { target: "18" }]],
    }),
  ],
});
