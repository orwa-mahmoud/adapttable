import { defineConfig } from "tsdown";
import Vue from "unplugin-vue/rolldown";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "neutral",
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  deps: { neverBundle: ["vue", "@adapttable/vue"] },
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
});
