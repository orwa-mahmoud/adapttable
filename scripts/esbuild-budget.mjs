/**
 * A second bundler for the plain and configured full unstyled tables.
 *
 * Rolldown measures every fixture. esbuild measures these six as well, with
 * its own ceiling, so a module only one of them shakes out still fails.
 * Webpack is not installed anywhere in the workspace, and adding it would be
 * a new dependency, so it is not a third bundler.
 */
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import {
  ANGULAR_CONDITIONS,
  ANGULAR_DEFINES,
  ANGULAR_MAIN_FIELDS,
} from "./angular-consumer-build.mjs";

const requireFrom = createRequire(
  new URL("../apps/showcase/package.json", import.meta.url)
);

/**
 * The six tables. Ceilings are KiB, `Math.ceil(measured * 1.15)` from the
 * split esbuild run. Initial is the entry and its static chunks. Dynamic
 * chunks, including locale alternatives, are only in the total.
 */
export const ESBUILD_CEILINGS = {
  "unstyled · table": { initialKB: 84, totalKB: 236 },
  "unstyled · table + preset": { initialKB: 158, totalKB: 310 },
  "vue-unstyled · table": { initialKB: 71, totalKB: 223 },
  "vue-unstyled · table + preset": { initialKB: 143, totalKB: 295 },
  "angular · angular-unstyled table": { initialKB: 113, totalKB: 265 },
  "angular · unstyled + preset": { initialKB: 174, totalKB: 326 },
};

/**
 * Text Rolldown deletes and esbuild keeps, because it sits in a module the
 * table already uses. Named absences such as `pdfWriter` are not in this set.
 */
const CHUNK_TEXT = new Set([
  "data-cell-selected] {",
  "data-cell-match-current] {",
  "data-changed]:not",
  "column keys must be unique",
  "virtualize only applies",
  // The shared label module keeps this sentence when esbuild splits chunks.
  "Cross-boundary row moves",
]);

let esbuildPromise;

function esbuildBuild() {
  esbuildPromise ??= import(pathToFileURL(esbuildPath()).href).then(
    (mod) => mod.default ?? mod
  );
  return esbuildPromise;
}

/** esbuild is Vite's dependency. It is not a direct dependency of this repo. */
export function esbuildPath() {
  const vitePackage = requireFrom.resolve("vite/package.json");
  return createRequire(vitePackage).resolve("esbuild");
}

function outputFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...outputFiles(path));
    else files.push(path);
  }
  return files;
}

function gzipFile(path) {
  return gzipSync(readFileSync(path)).length;
}

const COUNTED = /\.(?:js|css)$/;

/**
 * Outputs the entry loads before the first dynamic import.
 *
 * A `dynamic-import` is a later chunk — a locale alternative, a writer, a
 * feature the entry did not name up front. It belongs in the total and not
 * in the initial transfer.
 */
export function staticOutputKeys(metafile, entryKey) {
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    for (const imported of metafile.outputs[key]?.imports ?? []) {
      if (imported.external || imported.kind === "dynamic-import") continue;
      visit(imported.path);
    }
  };
  visit(entryKey);
  for (const key of [...seen]) {
    const bundle = metafile.outputs[key]?.cssBundle;
    if (bundle) seen.add(bundle);
  }
  return seen;
}

/** Initial transfer is the static closure. Total adds every counted chunk. */
export function transferBytes(metafile, entryKey, sizeOf) {
  const staticKeys = staticOutputKeys(metafile, entryKey);
  let initial = 0;
  let total = 0;
  for (const key of Object.keys(metafile.outputs)) {
    if (!COUNTED.test(key)) continue;
    const size = sizeOf(key);
    total += size;
    if (staticKeys.has(key)) initial += size;
  }
  return { initial, total, lazy: total - initial };
}

/**
 * Bundle `entry` the way the budget bundles it: the named packages stay
 * external, everything else is in the graph.
 *
 * @param {string} entry
 * @param {RegExp[]} externals
 * @param {(code: string, id: string) => Promise<{ code: string } | null | undefined>} [transform]
 *   The Angular production link, when the entry is compiled Angular.
 */
export async function measureEsbuild(entry, externals, transform) {
  const esbuild = await esbuildBuild();
  const dir = mkdtempSync(join(tmpdir(), "esbuild-budget-"));
  const external = {
    name: "budget-externals",
    setup(build) {
      build.onResolve({ filter: /^[^.]/ }, (args) => {
        if (
          args.path.startsWith("node:") ||
          externals.some((pattern) => pattern.test(args.path))
        ) {
          return { path: args.path, external: true };
        }
        return null;
      });
    },
  };
  try {
    const built = async (minify) => {
      const outdir = join(dir, minify ? "min" : "raw");
      const result = await esbuild.build({
        absWorkingDir: dirname(entry),
        entryPoints: [entry],
        bundle: true,
        format: "esm",
        splitting: true,
        outdir,
        minify,
        ...(transform && {
          define: { ...ANGULAR_DEFINES },
          conditions: [...ANGULAR_CONDITIONS],
          mainFields: [...ANGULAR_MAIN_FIELDS],
        }),
        metafile: true,
        write: true,
        plugins: [
          external,
          transform && {
            name: "budget-transform",
            setup(build) {
              build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
                const source = readFileSync(args.path, "utf8");
                const result = await transform(source, args.path);
                return { contents: result?.code ?? source, loader: "js" };
              });
            },
          },
        ].filter(Boolean),
        logLevel: "silent",
      });
      return { outdir, metafile: result.metafile };
    };
    const [min, raw] = await Promise.all([built(true), built(false)]);
    const entryBase = entry.slice(entry.lastIndexOf("/") + 1);
    const entryOutput = Object.entries(min.metafile.outputs).find(
      ([, info]) => {
        const point = info.entryPoint ?? "";
        const name = point.slice(point.lastIndexOf("/") + 1);
        return name === entryBase;
      }
    );
    if (!entryOutput) throw new Error(`esbuild emitted no entry for ${entry}`);
    const cwd = dirname(entry);
    const sizeOf = (key) =>
      gzipFile(key.startsWith("/") ? key : join(cwd, key));
    const transfer = transferBytes(min.metafile, entryOutput[0], sizeOf);
    const readOutput = (metafile, key) => {
      const path = key.startsWith("/") ? key : join(cwd, key);
      return readFileSync(path, "utf8");
    };
    const rawEntry = Object.entries(raw.metafile.outputs).find(([, info]) => {
      const point = info.entryPoint ?? "";
      return point.slice(point.lastIndexOf("/") + 1) === entryBase;
    });
    if (!rawEntry)
      throw new Error(`esbuild emitted no readable entry for ${entry}`);
    const rawStatic = staticOutputKeys(raw.metafile, rawEntry[0]);
    const rawText = [...rawStatic]
      .filter((key) => key.endsWith(".js"))
      .map((key) => readOutput(raw.metafile, key))
      .join("\n");
    const css = [...rawStatic]
      .filter((key) => key.endsWith(".css"))
      .map((key) => readOutput(raw.metafile, key))
      .join("\n");
    return {
      initialGzip: transfer.initial,
      totalGzip: transfer.total,
      lazyGzip: transfer.lazy,
      js: rawText,
      css,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The same marker rule as the Rolldown budget, on esbuild's readable output. */
export function esbuildMarkerProblems(fixture, built) {
  const code = built.js
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  const named = (name) => new RegExp(`\\b${name}`).test(code);
  return {
    leaked: [
      ...(fixture.absent ?? [])
        .filter((marker) => !CHUNK_TEXT.has(marker))
        .filter(named),
      ...(fixture.absentCss ?? [])
        .filter((marker) => built.css.includes(marker))
        .map((marker) => `CSS ${marker}`),
    ],
    missing: [
      ...(fixture.present ?? []).filter((name) => !named(name)),
      ...(fixture.presentCss ?? [])
        .filter((marker) => !built.css.includes(marker))
        .map((marker) => `CSS ${marker}`),
    ],
  };
}
