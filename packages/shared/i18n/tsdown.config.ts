import { readdirSync } from "node:fs";
import { basename } from "node:path";

import { defineConfig } from "tsdown";

/** Each bundled language is its own entry, `@adapttable/i18n/locales/<tag>`. */
const localeEntries = Object.fromEntries(
  readdirSync("src/locales")
    .filter((file) => file.endsWith(".ts") && !file.includes(".test."))
    .map((file) => [`locales/${basename(file, ".ts")}`, `src/locales/${file}`])
);

export default defineConfig({
  entry: { index: "src/index.ts", catalog: "src/catalog.ts", ...localeEntries },
  format: ["esm", "cjs"],
  // The published declarations come from `src` alone. The package's own
  // tsconfig also covers its vitest and tsdown configs so typecheck sees
  // them, and pulling those into the dts program makes it emit a stray
  // declaration beside the root's vitest.shared.ts.
  tsconfig: "./tsconfig.build.json",
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  deps: { neverBundle: ["@adapttable/core"] },
});
