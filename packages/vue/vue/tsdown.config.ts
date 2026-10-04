import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/adapter.ts", "src/features.ts"],
  platform: "neutral",
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  dts: { vue: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  deps: { neverBundle: ["vue", "@adapttable/core"] },
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
});
