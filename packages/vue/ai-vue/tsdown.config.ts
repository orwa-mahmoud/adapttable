import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts"],
  platform: "neutral",
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  deps: { neverBundle: ["@adapttable/ai", "@adapttable/vue", "vue"] },
});
