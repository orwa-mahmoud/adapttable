import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/adapter.ts",
    "src/features.ts",
    "src/formula.ts",
    "src/pivot.ts",
    "src/stream.ts",
    "src/sparkline.ts",
    "src/pdf.ts",
    "src/xlsx.ts",
  ],
  platform: "neutral",
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  dts: { vue: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  deps: {
    neverBundle: ["vue", "@adapttable/core", /^@adapttable\/vue(?:\/.*)?$/],
  },
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
});
