/**
 * A production Angular consumer, built the way `ng build` builds one.
 *
 * Angular packages ship partially compiled: their components carry
 * `ɵɵngDeclare*` calls that only the Angular linker turns into runnable code,
 * and an application's own templates compile only under the Angular compiler.
 * Bundling the raw FESM files measures neither, so this takes the steps the
 * CLI's application builder takes:
 *
 * 1. `ngc` compiles the consumer in full AOT mode with strict templates,
 *    type-checking every template against the packed declarations.
 * 2. The CLI's own JavaScript transformer (`@angular/build`) links each
 *    partially compiled file and applies its advanced optimizations, with the
 *    package's `sideEffects` field deciding what may be marked pure.
 * 3. Rolldown — the bundler every other budget fixture uses — resolves with
 *    the CLI's conditions and main fields, applies its production defines,
 *    treats `forwardRef` as pure and minifies.
 *
 * Only the minifier differs from the CLI (oxc via Rolldown, not esbuild), so
 * bytes compare across this repo's fixtures, and before/after a change, but
 * not with a CLI build byte for byte. Every tool is the workspace's installed
 * copy, resolved from the Angular binding that builds with it.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";

import { Rolldown } from "tsdown";

import { bindingDir } from "./kits.mjs";

const angular = createRequire(join(bindingDir("angular"), "package.json"));
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const COMPILER_MANIFEST = angular.resolve("@angular/compiler-cli/package.json");
const NGC = join(
  dirname(COMPILER_MANIFEST),
  readJson(COMPILER_MANIFEST).bin.ngc
);

/** The installed toolchain, recorded with every Angular result. */
export const ANGULAR_TOOLCHAIN = Object.freeze({
  compiler: readJson(COMPILER_MANIFEST).version,
  build: readJson(angular.resolve("@angular/build/package.json")).version,
  core: readJson(angular.resolve("@angular/core/package.json")).version,
});

/** `ng build`'s browser resolution for an AOT production build. */
export const ANGULAR_CONDITIONS = Object.freeze([
  "es2015",
  "es2020",
  `angular:linked-${ANGULAR_TOOLCHAIN.core}`,
  "module",
  "production",
]);
export const ANGULAR_MAIN_FIELDS = Object.freeze([
  "es2020",
  "es2015",
  "browser",
  "module",
  "main",
]);

/** The globals `ng build` defines once script optimization is on. */
export const ANGULAR_DEFINES = Object.freeze({
  ngDevMode: "false",
  ngJitMode: "false",
  ngServerMode: "false",
  ngHmrMode: "false",
});

/** The consumer's compiler settings: full AOT, strict templates. */
export const ANGULAR_COMPILER_OPTIONS = Object.freeze({
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2022", "DOM"],
    module: "ESNext",
    moduleResolution: "Bundler",
    strict: true,
    skipLibCheck: true,
    types: [],
    useDefineForClassFields: false,
    declaration: false,
    sourceMap: false,
    pretty: false,
  },
  angularCompilerOptions: {
    compilationMode: "full",
    strictTemplates: true,
    strictInjectionParameters: true,
    strictInputAccessModifiers: true,
  },
});

/** The component class every Angular fixture exports, and its selector. */
export const CONSUMER_COMPONENT = "ConsumerApp";
export const CONSUMER_SELECTOR = "consumer-app";

const BOOTSTRAP = `import { bootstrapApplication } from "@angular/platform-browser";
import { ${CONSUMER_COMPONENT} } from "./app";

bootstrapApplication(${CONSUMER_COMPONENT}).catch((error: unknown) => {
  console.error(error);
});
`;

const DIAGNOSTIC = /^(.+?)\(\d+,\d+\): error ((?:TS|NG)-?\d+: .*)$/;

/** Write each consumer's sources and the one tsconfig that compiles them. */
function writeAngularProject(source, out, consumers) {
  mkdirSync(source, { recursive: true });
  for (const { id, code } of consumers) {
    mkdirSync(join(source, id), { recursive: true });
    writeFileSync(join(source, id, "app.ts"), code);
    writeFileSync(join(source, id, "main.ts"), BOOTSTRAP);
  }
  const { compilerOptions, angularCompilerOptions } = ANGULAR_COMPILER_OPTIONS;
  writeFileSync(
    join(source, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { ...compilerOptions, rootDir: source, outDir: out },
      angularCompilerOptions,
      files: consumers.flatMap(({ id }) => [`${id}/app.ts`, `${id}/main.ts`]),
    })
  );
}

/** `ngc`'s combined output, empty when the compile succeeded. */
function ngcOutput(source) {
  try {
    execFileSync(process.execPath, [NGC, "-p", "tsconfig.json"], {
      cwd: source,
      encoding: "utf8",
      stdio: "pipe",
    });
    return "";
  } catch (error) {
    return `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  }
}

/**
 * Attribute each diagnostic line to the consumer it names. A diagnostic that
 * names no consumer — the tsconfig itself, or a packed declaration — is a
 * broken setup, so it throws instead of being scored against a fixture.
 */
function consumerDiagnostics(source, output, results) {
  const ids = [...results.keys()];
  for (const line of output.split("\n").filter((text) => text.trim())) {
    const match = DIAGNOSTIC.exec(line);
    const id = match && relative(source, join(source, match[1])).split(sep)[0];
    const only = ids.length === 1 ? ids[0] : undefined;
    const owner = results.has(id) ? id : only;
    if (!owner) throw new Error(`ngc: ${line}`);
    results.get(owner).problems.push(match ? match[2] : line.trim());
  }
}

/**
 * Compile `{ id, code }` consumers in one AOT run, each as its own `app.ts`
 * beside a `main.ts` that bootstraps it. Returns each id's bootstrap entry
 * and its compiler errors.
 */
/**
 * The compile imports `@angular/platform-browser` to bootstrap, and only some
 * kits declare it as a peer, so a packed install may not have linked it. Link
 * it from the Angular binding when it is missing; everything else resolves
 * from the install.
 */
function linkPlatformBrowser(dir) {
  const link = join(dir, "node_modules", "@angular", "platform-browser");
  if (existsSync(link)) return;
  const copy = join(
    bindingDir("angular"),
    "node_modules",
    "@angular",
    "platform-browser"
  );
  symlinkSync(copy, link, "dir");
}

export function compileAngularConsumers(dir, consumers) {
  // macOS links the temp directory through /var → /private/var, and ngc
  // rejects a rootDir whose real path differs from the path it was given.
  const root = realpathSync(dir);
  linkPlatformBrowser(root);
  const source = join(root, "angular");
  const out = join(root, "angular-out");
  writeAngularProject(source, out, consumers);
  const results = new Map(
    consumers.map(({ id }) => [
      id,
      { entry: join(out, id, "main.js"), problems: [] },
    ])
  );
  consumerDiagnostics(source, ngcOutput(source), results);
  for (const result of results.values()) {
    if (!result.problems.length && !existsSync(result.entry)) {
      result.problems.push("ngc emitted no bootstrap entry");
    }
  }
  return results;
}

/** The nearest `package.json` above `file`, or undefined. */
function owningManifest(file, manifests) {
  let directory = dirname(file);
  while (directory !== dirname(directory)) {
    if (!manifests.has(directory)) {
      const path = join(directory, "package.json");
      manifests.set(directory, existsSync(path) ? readJson(path) : null);
    }
    const manifest = manifests.get(directory);
    if (manifest?.name) return { manifest, directory };
    directory = dirname(directory);
  }
  return undefined;
}

function globToRegExp(pattern) {
  const body = pattern
    .replace(/^\.\//, "")
    .replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`)
    .replaceAll("**/", "(?:.*/)?")
    .replaceAll("*", "[^/]*");
  return new RegExp(pattern.includes("/") ? `^${body}$` : `(?:^|/)${body}$`);
}

/**
 * The package `sideEffects` verdict the CLI asks the bundler for: false when
 * the package declares the file side-effect free, otherwise undefined.
 */
export function declaredSideEffects(file, manifests = new Map()) {
  const owner = owningManifest(file, manifests);
  const declared = owner?.manifest.sideEffects;
  if (declared === false) return false;
  if (!Array.isArray(declared)) return undefined;
  const path = relative(owner.directory, file).split(sep).join("/");
  return declared.some((pattern) => globToRegExp(pattern).test(path))
    ? undefined
    : false;
}

const SCRIPT = /\.[cm]?js$/;
const NODE_MODULES = /[\\/]node_modules[\\/]/;

/** One file's linked and optimized text, computed at most once per run. */
function cachedTransform(transformer, manifests, results, linked, id, code) {
  if (!results.has(id)) {
    const sideEffects = declaredSideEffects(id, manifests);
    results.set(
      id,
      transformer
        .transformData(id, code, {
          skipLinker: !NODE_MODULES.test(id),
          sideEffects: async () => sideEffects,
        })
        .then((data) => Buffer.from(data).toString("utf8"))
    );
    if (code.includes("ɵɵngDeclare")) linked.add(id);
  }
  return results.get(id);
}

/**
 * The CLI's JavaScript transformer as a Rolldown plugin. Package files are
 * linked; the compiled consumer, already AOT output, is only optimized.
 * Results are cached by file for the life of the transformer, so a run that
 * builds many fixtures over one install links each package file once.
 */
export function angularTransformer() {
  const { JavaScriptTransformer } = angular("@angular/build/private");
  const transformer = new JavaScriptTransformer({
    sourcemap: false,
    advancedOptimizations: true,
    jit: false,
  });
  const manifests = new Map();
  const results = new Map();
  const linked = new Set();
  return {
    linked,
    plugin: {
      name: "adapttable-angular-transformer",
      async transform(code, id) {
        if (!SCRIPT.test(id)) return null;
        const transformed = await cachedTransform(
          transformer,
          manifests,
          results,
          linked,
          id,
          code
        );
        return { code: transformed, map: null };
      },
    },
    close: () => transformer.close(),
  };
}

/**
 * Bundle a compiled bootstrap entry with `ng build`'s production settings.
 * `externals` names what an application already ships; an empty list is the
 * complete application.
 */
export async function bundleAngularConsumer(entry, options) {
  const { dir, externals, transformer, plugins = [] } = options;
  const bundle = await Rolldown.rolldown({
    input: entry,
    cwd: dir,
    platform: "browser",
    external: (id) => externals.some((pattern) => pattern.test(id)),
    resolve: {
      conditionNames: [...ANGULAR_CONDITIONS],
      mainFields: [...ANGULAR_MAIN_FIELDS],
    },
    transform: { define: { ...ANGULAR_DEFINES } },
    treeshake: { manualPureFunctions: ["forwardRef"] },
    plugins: [transformer.plugin, ...plugins],
    logLevel: "silent",
  });
  try {
    return await Promise.all([
      bundle.generate({ format: "esm", minify: true }),
      bundle.generate({ format: "esm" }),
    ]);
  } finally {
    await bundle.close();
  }
}

/** `ɵɵngDeclare*` calls left in emitted code: each one is an unlinked component. */
export function unlinkedDeclarations(output) {
  return output
    .filter((file) => file.type === "chunk")
    .reduce(
      (count, chunk) =>
        count + (chunk.code.match(/ɵɵngDeclare\w+/g) ?? []).length,
      0
    );
}
