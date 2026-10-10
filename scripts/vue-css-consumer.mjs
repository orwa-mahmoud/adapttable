/** Use the same supported CSS pipeline as the native package producer. */
import { build } from "tsdown";

import { VUE_RUNTIME_EXTERNALS } from "./vue-consumer-fixtures.mjs";

export async function buildVueCssConsumer(
  input,
  directory,
  minify,
  plugins = [],
  externals = VUE_RUNTIME_EXTERNALS
) {
  const isExternal = (id) => externals.some((pattern) => pattern.test(id));
  const bundles = await build({
    config: false,
    cwd: directory,
    entry: { entry: input },
    outDir: directory,
    format: "esm",
    platform: "browser",
    target: false,
    tsconfig: false,
    dts: false,
    clean: false,
    write: false,
    report: false,
    sourcemap: false,
    minify,
    css: { splitting: false, fileName: "styles.css", inject: false, minify },
    deps: {
      neverBundle: externals,
      alwaysBundle: (id) => !isExternal(id),
      onlyImport: externals,
    },
    inputOptions: { external: isExternal },
    plugins,
  });
  try {
    return { output: bundles.flatMap((bundle) => bundle.chunks) };
  } finally {
    for (const bundle of bundles) await bundle[Symbol.asyncDispose]();
  }
}
