import { babel } from "@rollup/plugin-babel";
import { defineConfig } from "tsdown";

export default defineConfig({
  banner: { js: '"use client";' },
  entry: [
    "src/index.ts",
    "src/adapter.ts",
    "src/features.ts",
    "src/formula.ts",
    "src/pivot.ts",
    "src/stream.ts",
    "src/sparkline.ts",
  ],
  format: ["esm", "cjs"],
  tsconfig: "./tsconfig.build.json",
  dts: { eager: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  deps: {
    neverBundle: ["react", "react-dom", "@adapttable/core"],
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
