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

const requireFrom = createRequire(
  new URL("../apps/showcase/package.json", import.meta.url)
);

/**
 * The six tables. Ceilings are KiB, `Math.ceil(measured * 1.15)` from the
 * esbuild run on 2026-11-24. Angular is higher than Rolldown because esbuild
 * keeps more of the kit's primary bundle.
 */
export const ESBUILD_CEILINGS = {
  "unstyled · table": { initialKB: 77, totalKB: 77 },
  "unstyled · table + preset": { initialKB: 152, totalKB: 152 },
  "vue-unstyled · table": { initialKB: 64, totalKB: 64 },
  "vue-unstyled · table + preset": { initialKB: 138, totalKB: 138 },
  "angular · angular-unstyled table": { initialKB: 358, totalKB: 358 },
  "angular · unstyled + preset": { initialKB: 386, totalKB: 386 },
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
        // Splitting keeps every export of a shared chunk. That is esbuild's
        // chunk rule, not a module the table imported, so the comparison is
        // the one bundled graph.
        outdir,
        minify,
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
    const entryOutput = Object.entries(min.metafile.outputs).find(
      ([, info]) => info.entryPoint
    );
    if (!entryOutput) throw new Error(`esbuild emitted no entry for ${entry}`);
    const entryName = entryOutput[0].slice(entryOutput[0].lastIndexOf("/") + 1);
    const minFiles = outputFiles(min.outdir);
    const jsAndCss = (file) => file.endsWith(".js") || file.endsWith(".css");
    const gzipOf = (files) =>
      files.reduce((sum, file) => sum + gzipFile(file), 0);
    const counted = minFiles.filter(jsAndCss);
    const initialFiles = counted.filter(
      (file) => file.endsWith(`/${entryName}`) || file.endsWith(".css")
    );
    const rawText = outputFiles(raw.outdir)
      .filter((file) => file.endsWith(".js"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const css = outputFiles(raw.outdir)
      .filter((file) => file.endsWith(".css"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    return {
      initialGzip: gzipOf(initialFiles),
      totalGzip: gzipOf(counted),
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
