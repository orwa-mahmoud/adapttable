/** Build both module formats without keeping TypeScript and bundler heaps alive together. */
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { constants, tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import remapping from "@jridgewell/remapping";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

function declarationExtension(type) {
  if (type === "mts") return ".d.mts";
  if (type === "cts") return ".d.cts";
  return ".d.ts";
}

/** The declaration-only bundler keeps the original entries and public formats. */
export function declarationConfig(
  original,
  { packageDir, typesDir, extension }
) {
  const entries = Array.isArray(original.entry)
    ? original.entry.map((file) => [
        basename(file).replace(/\.[cm]?tsx?$/, ""),
        file,
      ])
    : Object.entries(original.entry);
  const inputRoot = join(packageDir, "src");
  const entry = Object.fromEntries(
    entries.map(([name, file]) => {
      const source = relative(inputRoot, resolve(packageDir, file));
      if (
        isAbsolute(source) ||
        source === ".." ||
        source.startsWith(`..${sep}`)
      ) {
        throw new Error(`Library declaration entry is outside src: ${file}`);
      }
      const declaration = source.replace(/\.(mts|cts|tsx?)$/, (_, type) =>
        declarationExtension(type)
      );
      if (source === declaration)
        throw new Error(`Library entry is not TypeScript: ${file}`);
      return [name, join(typesDir, declaration)];
    })
  );
  if (![".d.ts", ".d.cts"].includes(extension))
    throw new Error("Unsupported declaration extension");
  return {
    ...original,
    cwd: packageDir,
    inputOptions: { ...original.inputOptions, cwd: typesDir },
    entry,
    // Declaration syntax uses ESM exports even for the .d.cts module contract.
    format: ["esm"],
    dts: { ...original.dts, eager: false, dtsInput: true, emitDtsOnly: true },
    outDir: join(packageDir, "dist"),
    clean: false,
    outputOptions: {
      ...original.outputOptions,
      entryFileNames: `[name]${extension}`,
      chunkFileNames: `[name]-[hash]${extension}`,
    },
  };
}

/** Resolve each map's paths before composing maps from different directories. */
function absoluteMap(map, filename) {
  const base = pathToFileURL(`${dirname(filename)}${sep}`);
  const sourceRoot = map.sourceRoot
    ? new URL(`${map.sourceRoot.replace(/\/$/, "")}/`, base)
    : base;
  return {
    ...map,
    sourceRoot: undefined,
    sources: map.sources.map((source) => new URL(source, sourceRoot).href),
  };
}

function within(directory, filename) {
  const name = relative(directory, filename);
  return !isAbsolute(name) && name !== ".." && !name.startsWith(`..${sep}`);
}

/** Compose through TypeScript's maps to retain original-source navigation. */
export function inlineDeclarationSources(outDir, typesDir, packageDir) {
  const sourceDir = join(packageDir, "src");
  for (const file of readdirSync(outDir, { recursive: true })) {
    if (!/\.d\.(?:ts|cts)\.map$/.test(file)) continue;
    const mapFile = join(outDir, file);
    const bundled = absoluteMap(
      JSON.parse(readFileSync(mapFile, "utf8")),
      mapFile
    );
    const composed = remapping(bundled, (url) => {
      const source = fileURLToPath(url);
      if (within(sourceDir, source)) return null;
      if (!within(typesDir, source)) {
        throw new Error(
          `Unexpected declaration-map source outside staging: ${source}`
        );
      }
      const declarationMapFile = `${source}.map`;
      return absoluteMap(
        JSON.parse(readFileSync(declarationMapFile, "utf8")),
        declarationMapFile
      );
    });
    const sources = composed.sources.map((url) => fileURLToPath(url));
    if (sources.some((source) => !within(sourceDir, source))) {
      throw new Error(
        `Declaration map did not resolve to implementation sources: ${file}`
      );
    }
    writeFileSync(
      mapFile,
      JSON.stringify({
        ...composed,
        file: bundled.file,
        sourceRoot: undefined,
        sources: sources.map((source) =>
          relative(dirname(mapFile), source).split(sep).join("/")
        ),
        sourcesContent: sources.map((source) => readFileSync(source, "utf8")),
      })
    );
  }
}

function packageBin(name, command) {
  const file = join(ROOT, "node_modules", name, "package.json");
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  const bin =
    typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[command];
  if (!bin) throw new Error(`Missing executable ${command} in ${name}`);
  return resolve(dirname(file), bin);
}

function runNode(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      RAYON_NUM_THREADS: process.env.RAYON_NUM_THREADS ?? "1",
      UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE ?? "1",
    },
  });
}

/** Serial phases fail closed: no partial dist or scratch types survive an error. */
export function buildLibrary({
  packageDir = process.cwd(),
  tempParent = tmpdir(),
  run = runNode,
  tools,
} = {}) {
  const executables = tools ?? {
    tsdown: packageBin("tsdown", "tsdown"),
    tsc: packageBin("typescript", "tsc"),
  };
  const scratch = mkdtempSync(join(tempParent, "adapttable-library-build-"));
  const typesDir = join(scratch, "types");
  const outDir = join(packageDir, "dist");
  const phase = (name, script, args) => {
    console.log(`${basename(packageDir)} build: ${name}`);
    const result = run(script, args, packageDir);
    if (result.error) throw result.error;
    if (result.status !== 0) {
      const termination = result.signal ? ` (${result.signal})` : "";
      const error = new Error(
        `Library build failed during ${name}${termination}`
      );
      error.exitCode =
        result.status ??
        (result.signal ? 128 + (constants.signals[result.signal] ?? 1) : 1);
      throw error;
    }
  };
  try {
    phase("JavaScript (ESM and CJS)", executables.tsdown, [
      "--no-dts",
      "--concurrency",
      "1",
    ]);
    phase("TypeScript declarations", executables.tsc, [
      "-p",
      "tsconfig.build.json",
      "--noEmit",
      "false",
      "--emitDeclarationOnly",
      "--declarationMap",
      "true",
      "--rootDir",
      "src",
      "--outDir",
      typesDir,
    ]);
    for (const extension of [".d.ts", ".d.cts"]) {
      const config = join(scratch, `bundle${extension}.mts`);
      writeFileSync(
        config,
        `import original from ${JSON.stringify(pathToFileURL(join(packageDir, "tsdown.config.ts")).href)};\nimport { declarationConfig } from ${JSON.stringify(import.meta.url)};\nexport default declarationConfig(original, ${JSON.stringify({ packageDir, typesDir, extension })});\n`
      );
      phase(`${extension} bundle`, executables.tsdown, [
        "--config",
        config,
        "--concurrency",
        "1",
      ]);
    }
    inlineDeclarationSources(outDir, typesDir, packageDir);
  } catch (error) {
    rmSync(outDir, { recursive: true, force: true });
    throw error;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    buildLibrary();
  } catch (error) {
    console.error(error);
    process.exitCode = error.exitCode ?? 1;
  }
}
