/** Compile SDKs through their public Vue/Vite production host integrations. */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { packageDir } from "./packages.mjs";
import { VUE_RUNTIME_EXTERNALS } from "./vue-consumer-fixtures.mjs";

/** Resolve the installed SDK's declared public export, including import-only exports. */
function packageImport(entry, name, subpath) {
  let root = dirname(entry);
  while (dirname(root) !== root) {
    const path = join(root, "package.json");
    if (existsSync(path)) {
      const manifest = JSON.parse(readFileSync(path, "utf8"));
      if (manifest.name === name) {
        const exported = manifest.exports?.[subpath];
        const target =
          typeof exported === "string" ? exported : exported?.import;
        if (typeof target !== "string")
          throw new Error(`${name} does not publish ${subpath} for import`);
        return pathToFileURL(join(root, target)).href;
      }
    }
    root = dirname(root);
  }
  throw new Error(`Cannot locate the installed ${name} manifest from ${entry}`);
}

/** Match a production browser consumer while keeping every emitted asset measurable. */
export function vueNativeConsumerConfig(input, directory, minify, plugins) {
  return {
    configFile: false,
    root: directory,
    publicDir: false,
    logLevel: "silent",
    plugins,
    build: {
      write: false,
      emptyOutDir: false,
      outDir: directory,
      target: "esnext",
      minify: minify ? "oxc" : false,
      cssMinify: minify,
      cssCodeSplit: true,
      sourcemap: false,
      lib: { entry: input, formats: ["es"] },
      rolldownOptions: {
        external: (id) =>
          VUE_RUNTIME_EXTERNALS.some((pattern) => pattern.test(id)),
      },
    },
  };
}

export async function buildVueNativeConsumer(
  fixture,
  input,
  directory,
  minify,
  plugins = []
) {
  if (!["nuxt-vite", "quasar-vite"].includes(fixture.consumerHost))
    throw new Error(
      `Unsupported native consumer host: ${fixture.consumerHost}`
    );
  const fromRoot = createRequire(import.meta.url);
  const vuePlugin = fromRoot.resolve("@vitejs/plugin-vue");
  const fromVue = createRequire(vuePlugin);
  const fromKit = createRequire(join(packageDir(fixture.pkg), "package.json"));
  const [{ build }, { default: vue }] = await Promise.all([
    import(pathToFileURL(fromVue.resolve("vite")).href),
    import(pathToFileURL(vuePlugin).href),
  ]);
  let hostPlugins;
  if (fixture.consumerHost === "nuxt-vite") {
    const sdkEntry = fromKit.resolve("@nuxt/ui/components/App.vue");
    const { default: ui } = await import(
      packageImport(sdkEntry, "@nuxt/ui", "./vite")
    );
    hostPlugins = [
      vue(),
      ui({
        root: directory,
        router: false,
        colorMode: false,
        prose: true,
        autoImport: false,
        components: false,
        dts: false,
      }),
    ];
  } else {
    const manifest = fromKit.resolve("@quasar/vite-plugin/package.json");
    const { quasar, transformAssetUrls } = await import(
      packageImport(manifest, "@quasar/vite-plugin", ".")
    );
    hostPlugins = [vue({ template: { transformAssetUrls } }), quasar()];
  }
  const result = await build(
    vueNativeConsumerConfig(input, directory, minify, [
      ...hostPlugins,
      ...plugins,
    ])
  );
  return {
    output: (Array.isArray(result) ? result : [result]).flatMap(
      (bundle) => bundle.output
    ),
  };
}
