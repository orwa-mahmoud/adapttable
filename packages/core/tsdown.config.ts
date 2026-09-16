import { defineConfig } from "tsdown";

export default defineConfig({
  tsconfig: "./tsconfig.build.json",
  entry: [
    "src/index.ts",
    "src/xlsx.ts",
    "src/pdf.ts",
    "src/pivot.ts",
    "src/formula.ts",
    "src/stream.ts",
    "src/query.ts",
  ],
  format: ["esm", "cjs"],
  dts: { eager: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
});
