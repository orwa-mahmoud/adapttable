import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  dts: { eager: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "esm" ? ".js" : ".cjs",
    dts: format === "esm" ? ".d.ts" : ".d.cts",
  }),
  deps: {
    neverBundle: ["vue", "@adapttable/core"],
  },
});
