import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
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
  deps: { neverBundle: ["@adapttable/core"] },
});
