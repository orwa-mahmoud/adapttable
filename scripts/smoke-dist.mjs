#!/usr/bin/env node
/**
 * Pre-release smoke check for the built package artifacts.
 *
 * `publint` validates the `exports`/`types` map statically; this is a fast
 * post-build gate that asserts every entrypoint the `exports` / `main` /
 * `module` / `types` fields advertise actually exists on disk under each
 * library package's `dist/`. Catches the common pre-release issue of an
 * `exports` target pointing at a file the build didn't emit (wrong path,
 * missing dist, stale config) before packing.
 *
 * It then walks the packages meant to run on a server through their whole
 * graph — see SERVER_SAFE — because what an entry imports is as much a part of
 * where it can run as what the entry itself says.
 *
 * Run after `pnpm build`:
 *   node scripts/smoke-dist.mjs
 *
 * For the full install-into-a-fresh-app test (dual-package hazard, real
 * consumer resolution), pack with `pnpm pack` and install into a throwaway
 * Vite app manually — that step needs network + a temp project.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import ts from "typescript";

const PACKAGES_DIR = join(process.cwd(), "packages");

/** Every package under `packages/` — all of them ship a runtime `dist`. */
const LIB_PACKAGES = readdirSync(PACKAGES_DIR);

function readPackageJson(pkg) {
  return JSON.parse(
    readFileSync(join(PACKAGES_DIR, pkg, "package.json"), "utf8")
  );
}

/** Flatten one `exports` condition entry into its string targets. */
function conditionTargets(entry, into) {
  if (typeof entry === "string") {
    into.add(entry);
    return;
  }
  if (!entry || typeof entry !== "object") return;
  for (const value of Object.values(entry)) {
    conditionTargets(value, into);
  }
}

/**
 * Resolve every target a package advertises: the `exports` map, the legacy
 * fields, and `bin`.
 *
 * A binary is an entry point like any other — `npx adapttable init` runs it,
 * and a `bin` pointing at a file the build did not emit is as broken as an
 * `exports` target that does. It is not a TYPED entry point, so extraction
 * ignores it; reaching it from here is what keeps its own graph honest and
 * stops the reachability walk from calling it dead weight.
 */
function exportTargets(pkgJson) {
  const targets = new Set();
  for (const entry of Object.values(pkgJson.exports ?? {})) {
    conditionTargets(entry, targets);
  }
  if (pkgJson.main) targets.add(pkgJson.main);
  if (pkgJson.module) targets.add(pkgJson.module);
  if (pkgJson.types) targets.add(pkgJson.types);
  conditionTargets(pkgJson.bin, targets);
  return [...targets];
}

/**
 * The built entries that are NOT client modules, and what each one promises.
 *
 * Every hook-bearing entry needs the `"use client"` directive or a Next.js App
 * Router build fails on the first `useState` with an error that points at the
 * application rather than at us. These are the deliberate exceptions: marking
 * one as a client module is what would break it, because the directive is a
 * boundary and a boundary in the wrong place keeps code OUT of where it
 * belongs.
 *
 * `only` narrows the rule to one entry of a package that is otherwise a client
 * library. `reactFree` is the stronger promise on top: nothing the entry
 * imports, however deeply, may reach React — the property a process without
 * React installed depends on, and the one that has to be checked through the
 * graph rather than at the entry.
 */
const SERVER_SAFE = [
  {
    // Plain data and pure functions, so a directive would be wrong. It does
    // import `@adapttable/core` for the default labels, though, which makes it
    // a locale pack for a React table rather than something a bare Node
    // service can load — it has never promised otherwise.
    pkg: "i18n",
    reactFree: false,
  },
  {
    // The reason the package exists: a route handler parsing a shared link has
    // no DOM, and no reason to install a UI library to read a query string.
    pkg: "server",
    reactFree: true,
  },
  {
    // `@adapttable/core/query` is the entry `@adapttable/server` reads the URL
    // codecs from. Holding it to the same rule checks the promise at the source
    // as well as at the consumer, so core cannot break a backend by growing a
    // hook into a chunk the two of them share.
    pkg: "core",
    only: /^\.\/dist\/query\.(js|cjs)$/,
    reactFree: true,
  },
  {
    // The scaffolder runs under `npx` before the project it is creating
    // exists, so React is not installed at that moment and never has to be.
    // The graph promise is the load-bearing one here: `adapttable init`
    // reaching a hook-bearing module would make the tool that sets up a table
    // require the table.
    pkg: "cli",
    reactFree: true,
  },
];

/**
 * What a React-free entry may never reach, however indirectly.
 *
 * React is the whole list, and one import is enough: `@adapttable/core`
 * declares it as a NON-optional peer, so reaching any hook-bearing entry turns
 * a plain Node service into an application that must install a UI library
 * before it can boot.
 */
const CLIENT_ONLY_DEPS = [/^react($|\/)/, /^react-dom($|\/)/];

/** The server-safe rule covering one built entry, if any covers it. */
function serverSafeRule(pkg, target) {
  return SERVER_SAFE.find(
    (rule) => rule.pkg === pkg && (!rule.only || rule.only.test(target))
  );
}

/** Does this built file open with the `"use client"` directive? */
function hasClientDirective(file) {
  return /^\s*["']use client["']/.test(
    readFileSync(file, "utf8").slice(0, 200)
  );
}

/** Every workspace package's directory, by the name it publishes under. */
const PKG_DIR_BY_NAME = new Map(
  LIB_PACKAGES.map((pkg) => [
    readPackageJson(pkg).name,
    join(PACKAGES_DIR, pkg),
  ])
);

/**
 * Every specifier a built file imports, from TypeScript's own scanner rather
 * than a regex: these files carry the source's doc comments, and this package
 * documents itself with `import` examples. A comment is not an import.
 */
function importsOf(file) {
  return ts
    .preProcessFile(readFileSync(file, "utf8"), true, true)
    .importedFiles.map((found) => found.fileName);
}

/**
 * The first `exports` branch a given set of conditions allows.
 *
 * `types` is skipped: a `.d.ts` is not what runs, and following it would
 * report the type graph rather than the module graph.
 */
function pickCondition(node, conditions) {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return undefined;
  for (const [key, value] of Object.entries(node)) {
    if (key === "types") continue;
    if (key !== "default" && !conditions.has(key)) continue;
    const hit = pickCondition(value, conditions);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Resolve one specifier the way the importing file's own loader would: a
 * relative path against its directory, a workspace package through its
 * `exports` map, and anything else left as the external it is.
 *
 * @returns `{ file }` for something on disk, `{ external }` for a bare
 *   specifier this repo does not publish, `{ unresolved }` when a workspace
 *   subpath has no `exports` entry at all.
 */
function resolveImport(spec, fromFile) {
  if (spec.startsWith(".")) return { file: resolve(dirname(fromFile), spec) };
  const scoped = spec.startsWith("@");
  const name = spec
    .split("/")
    .slice(0, scoped ? 2 : 1)
    .join("/");
  const pkgDir = PKG_DIR_BY_NAME.get(name);
  if (!pkgDir) return { external: name };
  // A `.cjs` file is loaded by require, whatever its package type says.
  const conditions = new Set([
    "node",
    fromFile.endsWith(".cjs") ? "require" : "import",
  ]);
  const pkgJson = JSON.parse(
    readFileSync(join(pkgDir, "package.json"), "utf8")
  );
  const subpath = `.${spec.slice(name.length)}`;
  const target = pickCondition(pkgJson.exports?.[subpath], conditions);
  if (!target) return { unresolved: spec };
  return { file: join(pkgDir, target) };
}

/**
 * Every local file one package's entries reach, and every external specifier
 * the whole graph asks for.
 *
 * Walking is the point. `deps.neverBundle` keeps `@adapttable/*` specifiers in
 * the shipped artifact, so a package's own entry can be perfectly clean while
 * the module one line below it drags a client boundary and a React peer into a
 * backend. Following the `exports` maps is what makes that visible here rather
 * than in a consumer's install.
 */
function serverGraph(entryFiles) {
  const files = new Set();
  const externals = new Set();
  const unresolved = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.pop();
    if (files.has(file)) continue;
    files.add(file);
    for (const spec of importsOf(file)) {
      const found = resolveImport(spec, file);
      if (found.external) externals.add(found.external);
      else if (found.unresolved) unresolved.add(found.unresolved);
      else if (!existsSync(found.file)) unresolved.add(spec);
      else queue.push(found.file);
    }
  }
  return { files, externals, unresolved };
}

let failures = 0;

for (const pkg of LIB_PACKAGES) {
  const pkgDir = join(PACKAGES_DIR, pkg);
  const pkgJson = readPackageJson(pkg);
  if (!pkgJson.exports && !pkgJson.main) continue;

  const targets = exportTargets(pkgJson);
  const missing = targets.filter((target) => {
    const distPath = target.replace(/^\.\//, "");
    return !existsSync(join(pkgDir, distPath));
  });

  const shortName = pkg.replace(/^adapter-/, "");
  if (missing.length > 0) {
    failures += 1;
    console.error(
      `✗ @adapttable/${shortName}: build did not emit advertised targets:\n  ` +
        missing.join("\n  ")
    );
  } else {
    console.log(
      `✓ @adapttable/${shortName}: ${targets.length} export target(s) present`
    );
  }

  // The client-boundary directive: present on everything that ships hooks,
  // deliberately absent on the entries meant to run on a server.
  const runtimeEntries = targets
    .filter((target) => /\.(js|cjs|mjs)$/.test(target))
    .map((target) => ({
      target,
      file: join(pkgDir, target.replace(/^\.\//, "")),
    }))
    .filter(({ file }) => existsSync(file));

  const misdirected = { absent: [], present: [] };
  for (const { target, file } of runtimeEntries) {
    const wanted = serverSafeRule(pkg, target) ? "absent" : "present";
    if (hasClientDirective(file) !== (wanted === "present")) {
      misdirected[wanted].push(target);
    }
  }
  for (const [wanted, entries] of Object.entries(misdirected)) {
    if (entries.length === 0) continue;
    failures += 1;
    console.error(
      `✗ @adapttable/${shortName}: "use client" should be ${wanted} on:\n  ` +
        entries.join("\n  ")
    );
  }

  // Everything those entries reach, for the ones that promise to run where
  // React is not installed. An entry's own directive says nothing about the
  // module one line below it.
  const reactFree = runtimeEntries.filter(
    ({ target }) => serverSafeRule(pkg, target)?.reactFree
  );
  if (reactFree.length === 0) continue;
  const { files, externals, unresolved } = serverGraph(
    reactFree.map(({ file }) => file)
  );
  const clientModules = [...files].filter((file) => hasClientDirective(file));
  const clientDeps = [...externals].filter((spec) =>
    CLIENT_ONLY_DEPS.some((re) => re.test(spec))
  );
  const show = (file) => relative(PACKAGES_DIR, file);

  if (clientModules.length > 0) {
    failures += 1;
    console.error(
      `✗ @adapttable/${shortName}: runs on a server, but its graph reaches ` +
        `${clientModules.length} client module(s):\n  ` +
        clientModules.map(show).join("\n  ")
    );
  }
  if (clientDeps.length > 0) {
    failures += 1;
    console.error(
      `✗ @adapttable/${shortName}: runs on a server, but its graph imports ` +
        `${clientDeps.join(", ")}. A backend without React installed cannot ` +
        `load it — resolution fails before the first parse.`
    );
  }
  if (unresolved.size > 0) {
    failures += 1;
    console.error(
      `✗ @adapttable/${shortName}: graph specifier(s) resolve to nothing on ` +
        `disk:\n  ${[...unresolved].join("\n  ")}`
    );
  }
  if (clientModules.length + clientDeps.length + unresolved.size === 0) {
    console.log(
      `  └ server-safe: ${files.size} module(s) in the graph, no client ` +
        `boundary, no React`
    );
  }
}

// A package's declaration program must stay inside its own `src`. When it
// reaches a file above the package — a vitest config importing the root's
// shared config, say — the dts build writes a stray declaration into the
// repository root, which is invisible until formatting or a diff trips over
// it. Each package builds through its own `tsconfig.build.json` to prevent
// that; this is the tripwire if one ever loses it.
const strayRootTypes = readdirSync(process.cwd()).filter(
  (name) => name.endsWith(".d.ts") || name.endsWith(".d.ts.map")
);
if (strayRootTypes.length > 0) {
  failures += 1;
  console.error(
    `✗ the build wrote declaration file(s) into the repository root:\n  ` +
      `${strayRootTypes.join("\n  ")}\n  ` +
      `A package's dts program is reaching outside its own src — check that ` +
      `its tsdown config still points at tsconfig.build.json.`
  );
}

/**
 * Everything in `dist` should be something an entry can reach.
 *
 * A build restored from turbo's cache writes its own outputs but does not remove
 * files an earlier build left behind, so tsdown's `clean` never runs and chunks
 * whose content hash has since moved survive in the directory — where `pack`
 * would ship them as dead weight. Nothing else here notices: `publint` and the
 * entry check above both ask whether what the manifest points AT exists, never
 * what else is sitting beside it.
 */
function distFiles(dir, into = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) distFiles(full, into);
    // Runtime modules only. Declaration chunks reference each other through
    // specifiers that resolve to the RUNTIME sibling, so the walker below
    // cannot see them and would report every one as unreachable. An orphaned
    // build leaves both kinds behind, so the runtime half is enough to catch it.
    else if (/\.(js|cjs|mjs)$/.test(name)) into.push(full);
  }
  return into;
}

for (const pkg of LIB_PACKAGES) {
  const pkgDir = join(PACKAGES_DIR, pkg);
  const distDir = join(pkgDir, "dist");
  if (!existsSync(distDir)) continue;
  const pkgJson = readPackageJson(pkg);
  if (!pkgJson.exports && !pkgJson.main) continue;

  const roots = exportTargets(pkgJson)
    .map((target) => join(pkgDir, target.replace(/^\.\//, "")))
    .filter((file) => existsSync(file));
  if (roots.length === 0) continue;
  const { files: reachable } = serverGraph(roots);
  const orphans = distFiles(distDir)
    .filter((file) => !reachable.has(file))
    .map((file) => relative(pkgDir, file));
  if (orphans.length === 0) continue;
  failures += 1;
  console.error(
    `✗ @adapttable/${pkg.replace(/^adapter-/, "")}: ${orphans.length} file(s) ` +
      `in dist that no entry reaches:\n  ${orphans.join("\n  ")}\n  ` +
      `A cached build does not clean the directory it restores into — run ` +
      `\`pnpm --filter <pkg> clean\` and build again.`
  );
}

if (failures > 0) {
  console.error(`\nsmoke-dist: ${failures} package(s) failed.`);
  process.exit(1);
}
console.log("\nsmoke-dist: all library package entrypoints built.");
