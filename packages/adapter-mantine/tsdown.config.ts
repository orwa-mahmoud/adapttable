import { babel } from "@rollup/plugin-babel";
import { defineConfig } from "tsdown";

export default defineConfig({
  // React Server Components: hook-bearing client libraries must mark
  // their built entries, or every Next.js App Router consumer has to
  // hand-write a client wrapper.
  banner: { js: '"use client";' },
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  deps: {
    neverBundle: [
      "react",
      "react-dom",
      "@mantine/core",
      "@mantine/hooks",
      "@adapttable/core",
    ],
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
