import { babel } from "@rollup/plugin-babel";
import { defineConfig, type UserConfig } from "tsdown";

/** Everything both passes below share: one toolchain, one output shape. */
const common: UserConfig = {
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  deps: { neverBundle: ["react", "react-dom", "@tanstack/react-query"] },
  plugins: [
    babel({
      babelHelpers: "bundled",
      extensions: [".ts", ".tsx"],
      presets: ["@babel/preset-typescript"],
      plugins: [["babel-plugin-react-compiler", { target: "18" }]],
    }),
  ],
};

/**
 * Two passes, because `"use client"` is a boundary and a boundary belongs in
 * exactly one place.
 *
 * The client pass carries the directive on every chunk: hook-bearing entries
 * must mark themselves or a Next.js App Router consumer has to hand-write a
 * client wrapper for each one.
 *
 * `./query` is built on its own, unmarked. It is the React-free half of the
 * model — the URL codecs a route handler decodes a shared link with — and a
 * directive there would keep the code OUT of the one place it belongs. Its own
 * pass is what makes that structural rather than hopeful: a separate bundle
 * cannot share a chunk with a hook, so nothing downstream of `useState` can
 * reach `@adapttable/server` however the chunking changes. The graph is
 * asserted React-free and directive-free by `scripts/smoke-dist.mjs`.
 *
 * tsdown cleans the shared `dist` once for both passes, before either runs.
 */
export default defineConfig([
  {
    ...common,
    banner: { js: '"use client";' },
    entry: [
      "src/index.ts",
      "src/adapter.ts",
      "src/xlsx.ts",
      "src/pdf.ts",
      "src/sparkline.ts",
      "src/pivot.ts",
      "src/formula.ts",
      "src/features.ts",
    ],
  },
  { ...common, entry: ["src/query.ts"] },
]);
