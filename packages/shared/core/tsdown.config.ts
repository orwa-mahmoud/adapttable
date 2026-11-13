import { fileURLToPath } from "node:url";

import { defineConfig, type TsdownPlugin, type UserConfig } from "tsdown";

import { stripDevWarnings } from "../../../scripts/strip-dev-warnings.mjs";

/**
 * The two builds the package ships. The production build is the default
 * export condition and carries no development warning: every `devWarn`
 * statement and its message is compiled out. The development build, under
 * the `development` condition bundlers select in development, keeps them.
 */
interface Flavor {
  readonly outDir: string;
  readonly production: boolean;
}

const PRODUCTION: Flavor = { outDir: "dist", production: true };
const DEVELOPMENT: Flavor = { outDir: "dist/dev", production: false };

const SOURCE_DIR = fileURLToPath(new URL("src/", import.meta.url));

/** The package's own source modules, whose warnings a production build drops. */
function isSourceModule(id: string): boolean {
  return (
    id.startsWith(SOURCE_DIR) && /\.tsx?$/.test(id) && !id.endsWith(".d.ts")
  );
}

function flavorPlugins(flavor: Flavor): TsdownPlugin[] {
  return flavor.production
    ? [stripDevWarnings({ callee: "devWarn", include: isSourceModule })]
    : [];
}

/**
 * The server tier's engine, as the bindings load it: `#server-engine`, the
 * package's private import that `package.json` maps to its own file.
 */
const SERVER_ENGINE = "#server-engine";

/**
 * The engine's module, and the one file that loads it on demand.
 *
 * Every table holds a server tier, and a module both chunks of a bundle import
 * statically cannot move into a lazy chunk. So the engine ships as a file of
 * its own with its dependencies inside it, and the loader's dynamic import
 * points at that file instead of at the shared module graph. Importing the
 * few helpers it shares with the base table from the package entry instead
 * costs more than the copy: the entry chunk then has to export them.
 */
const ENGINE_SOURCE = "src/source/serverSource.ts";
const ENGINE_LOADER = /[\\/]source[\\/]lazyServerSource\.ts$/;
const ENGINE_IMPORT = "./serverSource";

/**
 * Point the loader's dynamic import at the engine's own file. The build fails
 * when the loader is in the graph and its import was not rewritten, because
 * the import would then resolve into the shared graph and load nothing on
 * demand.
 */
function serverEnginePlugin(): TsdownPlugin {
  let loaderSeen = false;
  let rewritten = false;
  return {
    name: "adapttable:server-engine",
    transform(_code, id) {
      if (ENGINE_LOADER.test(id)) loaderSeen = true;
      return null;
    },
    resolveId(source, importer, extra) {
      if (
        extra.kind === "dynamic-import" &&
        source === ENGINE_IMPORT &&
        importer !== undefined &&
        ENGINE_LOADER.test(importer)
      ) {
        rewritten = true;
        return { id: SERVER_ENGINE, external: true };
      }
      return null;
    },
    buildEnd(error) {
      // A build that already failed reports its own error.
      if (error) return;
      if (loaderSeen && !rewritten) {
        throw new Error(
          `The server engine loader no longer imports "${ENGINE_IMPORT}"; ${SERVER_ENGINE} would load nothing on demand.`
        );
      }
    },
  };
}

const outExtensions: UserConfig["outExtensions"] = ({ format }) => ({
  js: format === "es" ? ".js" : ".cjs",
  dts: format === "es" ? ".d.ts" : ".d.cts",
});

const library = (flavor: Flavor) =>
  defineConfig({
    tsconfig: "./tsconfig.build.json",
    outDir: flavor.outDir,
    entry: [
      "src/index.ts",
      "src/binding.ts",
      "src/xlsx.ts",
      "src/pdf.ts",
      "src/pivot.ts",
      "src/formula.ts",
      "src/stream.ts",
      "src/query.ts",
      "src/conformance.ts",
      "src/engine.ts",
      "src/grouping.ts",
      "src/editing.ts",
      "src/selection.ts",
    ],
    format: ["esm", "cjs"],
    // Both builds share the production build's declarations.
    dts: flavor.production ? { eager: true } : false,
    sourcemap: true,
    // The production build runs first and clears `dist/`, the development
    // build's folder included.
    clean: flavor.production,
    treeshake: true,
    // One chunk per label group, so a table that reads the base strings does
    // not import every feature's strings with them. CommonJS loads the server
    // engine's CommonJS file with `require`.
    outputOptions: {
      codeSplitting: {
        groups: [
          {
            name: (id) => {
              const group = /labelGroups[\\/](\w+)\.ts$/.exec(id);
              return group ? `labels-${group[1]}` : null;
            },
            test: /labelGroups[\\/]\w+\.ts$/,
          },
        ],
      },
      dynamicImportInCjs: false,
    },
    outExtensions,
    plugins: [serverEnginePlugin(), ...flavorPlugins(flavor)],
  });

const serverEngine = (flavor: Flavor) =>
  defineConfig({
    tsconfig: "./tsconfig.build.json",
    outDir: flavor.outDir,
    entry: { serverEngine: ENGINE_SOURCE },
    format: ["esm", "cjs"],
    dts: false,
    sourcemap: true,
    // The library build writes the rest of `dist/` first.
    clean: false,
    treeshake: true,
    outputOptions: { codeSplitting: false },
    outExtensions,
    plugins: flavorPlugins(flavor),
  });

export default [
  library(PRODUCTION),
  library(DEVELOPMENT),
  serverEngine(PRODUCTION),
  serverEngine(DEVELOPMENT),
];
