import { defineConfig } from "tsdown";
import Vue from "unplugin-vue/rolldown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/cell-span.ts",
    "src/density.ts",
    "src/fullscreen.ts",
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
  deps: {
    neverBundle: [
      "vue",
      /^element-plus(?:\/.*)?$/,
      /^@adapttable\/vue(?:\/.*)?$/,
    ],
  },
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
});
