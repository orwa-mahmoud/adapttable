#!/usr/bin/env node
/**
 * Build-tool/runtime split for the supported Node contract.
 *
 * `pack` runs under the repository's Node 24 + pnpm toolchain after `pnpm
 * build`. `verify` runs directly under each advertised Node version and uses
 * that Node's npm to install the packed artifacts. Plain JavaScript entries
 * load natively; Vue vendors that ship SFCs/CSS use their official Vite host
 * compilation pipeline under the same advertised Node runtime.
 *
 * Expected package names come from non-private workspace manifests, never
 * from the packed manifest being judged.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { VUE_HOST_PACKAGES, vueHostRoutes } from "./node-support-vue-host.mjs";
import {
  listPackages,
  packageDir as packageDirOf,
  REPO_ROOT as ROOT,
} from "./packages.mjs";

const PACK_DIR = join(ROOT, "node-support-packs");
const MANIFEST = join(PACK_DIR, "manifest.json");
const NPM_BIN = join(
  dirname(process.execPath),
  process.platform === "win32" ? "npm.cmd" : "npm"
);
const BASELINE_NODE_RANGE = ">=22.12.0";
const ANGULAR_22_NODE_RANGE = "^22.22.3 || ^24.15.0 || >=26.0.0";
const BASELINE_ANGULAR_RANGE = "^20.0.0";

/**
 * Required native peers beyond the adapter's direct peers. Audited against
 * Taiga 5.26.0 core/cdk/kit/styles manifests and the Maskito/ng-web-apis peer
 * metadata in pnpm-lock.yaml; kept in sync with the CLI's Taiga extras.
 * The combined consumer uses --legacy-peer-deps, so npm cannot fill these in.
 */
const TAIGA_NATIVE_PEERS = Object.freeze({
  "@taiga-ui/design-tokens": "~0.320.0",
  "@taiga-ui/polymorpheus": "^5.0.1",
  "@taiga-ui/font-watcher": "~0.6.0",
  "@maskito/angular": "^5.5.0",
  "@maskito/core": "^5.5.0",
  "@maskito/kit": "^5.5.0",
  "@maskito/phone": "^5.5.0",
  "libphonenumber-js": "^1.13.14",
  "@ng-web-apis/common": "^5.3.0",
  "@ng-web-apis/intersection-observer": "^5.3.0",
  "@ng-web-apis/mutation-observer": "^5.3.0",
  "@ng-web-apis/platform": "^5.3.0",
  "@ng-web-apis/resize-observer": "^5.3.0",
  "@ng-web-apis/screen-orientation": "^5.3.0",
  "@types/dom-speech-recognition": "^0.0.12",
});

/** Extra published subpaths kept in addition to every package root. */
export const EXTRA_PROBE_ROUTES = Object.freeze([
  "@adapttable/react/adapter",
  "@adapttable/core/query",
]);

function run(command, args, cwd, label, env = process.env) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
  } catch (error) {
    const output = [error.stdout, error.stderr, error.message]
      .map((part) => part?.toString().trim() ?? "")
      .filter(Boolean)
      .join("\n");
    throw new Error(`${label} failed\n${output.slice(-6000)}`);
  }
}

/**
 * Non-private workspace packages, in folder-name order. The packed
 * manifest is judged against these names — never the other way around.
 *
 * @param {string} [root]
 * @returns {{ name: string, directory: string, manifest: Record<string, unknown> }[]}
 */
export function publishedPackages(root = ROOT) {
  const published = [];
  for (const { name: directory, dir } of listPackages(root)) {
    const manifest = JSON.parse(
      readFileSync(join(dir, "package.json"), "utf8")
    );
    if (manifest.private) continue;
    published.push({ name: manifest.name, directory, manifest });
  }
  return published;
}

/** Sorted published package names from workspace manifests. */
export function publishedPackageNames(root = ROOT) {
  return publishedPackages(root)
    .map((entry) => entry.name)
    .sort();
}

/**
 * Require the packed name set to match the workspace published set in
 * both directions. Expected names must be supplied by the caller from
 * repository manifests — never derived from `packedNames`.
 *
 * @param {Iterable<string>} packedNames
 * @param {Iterable<string>} expectedNames
 */
export function assertPackedMatchesExpected(packedNames, expectedNames) {
  const packed = new Set(packedNames);
  const expected = new Set(expectedNames);
  const missing = [...expected].filter((name) => !packed.has(name)).sort();
  const unexpected = [...packed].filter((name) => !expected.has(name)).sort();
  if (missing.length === 0 && unexpected.length === 0) return;
  const parts = [];
  if (missing.length) {
    parts.push(`missing published package(s): ${missing.join(", ")}`);
  }
  if (unexpected.length) {
    parts.push(`unexpected packed package(s): ${unexpected.join(", ")}`);
  }
  throw new Error(parts.join("; "));
}

/**
 * Every published package root, plus retained core subpath probes.
 *
 * @param {Iterable<string>} publishedNames
 */
export function probeRoutes(publishedNames) {
  return [...new Set([...publishedNames, ...EXTRA_PROBE_ROUTES])].sort();
}

/** Angular 22's Node range; older supported runtimes use Angular 20. */
export function supportsAngular22(nodeVersion) {
  const [major, minor, patch] = nodeVersion
    .replace(/^v/, "")
    .split(".")
    .map(Number);
  return (
    major >= 26 ||
    (major === 24 && minor >= 15) ||
    (major === 22 && (minor > 22 || (minor === 22 && patch >= 3)))
  );
}

/**
 * Match the workspace's exact engine contracts without an installed semver
 * dependency. A new contract must gain runtime coverage before being used.
 */
function supportsPackageRuntime(entry, nodeVersion) {
  const range = entry.manifest.engines?.node;
  if (range === ANGULAR_22_NODE_RANGE) return supportsAngular22(nodeVersion);
  if (range === BASELINE_NODE_RANGE) {
    const [major, minor] = nodeVersion.replace(/^v/, "").split(".").map(Number);
    return major > 22 || (major === 22 && minor >= 12);
  }
  throw new Error(`${entry.name} has an untested Node engine range: ${range}`);
}

/** Select every package whose declared Node engine supports this runtime. */
export function packagesForRuntime(packages, nodeVersion) {
  return packages.filter((entry) => supportsPackageRuntime(entry, nodeVersion));
}

/**
 * Kit peers needed to load adapter roots. Workspace packages and React
 * are already installed as tarballs / explicit deps. When MUI is a peer,
 * Emotion is required to evaluate `@mui/material`.
 *
 * @param {ReturnType<typeof publishedPackages>} packages
 */
export function kitLoadDependencies(
  packages,
  nodeVersion = process.versions.node
) {
  const published = new Set(packages.map((entry) => entry.name));
  const skip = new Set(["react", "react-dom", ...published]);
  /** @type {Record<string, string>} */
  const deps = {};
  for (const entry of packages) {
    const peers = entry.manifest.peerDependencies ?? {};
    for (const [name, range] of Object.entries(peers)) {
      if (skip.has(name)) continue;
      deps[name] = range;
    }
  }
  if (deps["@mui/material"]) {
    deps["@emotion/react"] ??= "^11.0.0";
    deps["@emotion/styled"] ??= "^11.0.0";
  }
  if (deps["@taiga-ui/core"]) {
    for (const [name, range] of Object.entries(TAIGA_NATIVE_PEERS)) {
      deps[name] ??= range;
    }
  }
  // Angular's packages ship partially compiled: outside an app build they
  // load only with the compiler present to finish them, and `@angular/core`
  // needs RxJS, its own peer.
  if (deps["@angular/core"]) {
    deps["@angular/compiler"] ??= deps["@angular/core"];
    deps.rxjs ??= "^7.4.0";
  }
  if (deps["element-plus"]) {
    // Preserve an explicit real-Popper co-install regression on every runtime.
    deps["@popperjs/core"] ??= "^2.11.8";
  }
  if (packages.some((entry) => VUE_HOST_PACKAGES.includes(entry.name))) {
    deps.vite = "^8.3.0";
  }
  if (deps["@nuxt/ui"]) deps["@vitejs/plugin-vue"] = "^6.0.9";
  useCompatibleAngularPeers(deps, packages, nodeVersion);
  return deps;
}

/**
 * npm 10 legacy peer resolution can collapse Element Plus's declared alias
 * onto a co-installed real @popperjs/core. The official alias tarball preserves
 * that vendor edge; scope it to the verified vendor release, not future ones.
 */
export function kitLoadOverrides(tarballs, deps) {
  return {
    ...tarballs,
    ...(deps["element-plus"]
      ? {
          "element-plus@2.14.7": {
            // npm requires an override of a direct dependency to retain its
            // requested spec, including the generated peer range's caret.
            ".": "$element-plus",
            "@popperjs/core":
              "https://registry.npmjs.org/@sxzz/popperjs-es/-/popperjs-es-2.11.8.tgz",
          },
        }
      : {}),
  };
}

/** Vue adapters expose a table and feature entries, all of which must load. */
export function vueKits(packages) {
  return packages.filter(
    (entry) =>
      entry.directory.startsWith("adapter-") &&
      entry.manifest.peerDependencies?.vue
  );
}

export function runtimeProbeRoutes(packages) {
  return [
    ...new Set([
      ...probeRoutes(packages.map((entry) => entry.name)),
      ...vueKits(packages).flatMap((entry) =>
        vueHostRoutes(entry.name, entry.manifest)
      ),
    ]),
  ].sort();
}

function assertElementAlias(scratch, deps) {
  if (!deps["element-plus"]) return;
  const fromConsumer = createRequire(join(scratch, "package.json"));
  const vendorPath = fromConsumer.resolve("element-plus/package.json");
  const vendor = JSON.parse(readFileSync(vendorPath, "utf8"));
  if (vendor.version !== "2.14.7") return;
  const fromVendor = createRequire(vendorPath);
  const aliasPath = fromVendor.resolve("@popperjs/core/package.json");
  const alias = JSON.parse(readFileSync(aliasPath, "utf8"));
  const realPath = fromConsumer.resolve("@popperjs/core/package.json");
  const real = JSON.parse(readFileSync(realPath, "utf8"));
  if (
    vendor.dependencies["@popperjs/core"] !== "npm:@sxzz/popperjs-es@^2.11.8" ||
    alias.name !== "@sxzz/popperjs-es" ||
    alias.version !== "2.11.8" ||
    real.name !== "@popperjs/core" ||
    realPath === aliasPath
  ) {
    throw new Error(
      "Element Plus alias and co-installed real Popper must retain their distinct vendor identities"
    );
  }
}

/** Keep the Angular peer major compatible with the probed Node runtime. */
function useCompatibleAngularPeers(deps, packages, nodeVersion) {
  if (supportsAngular22(nodeVersion)) return;
  for (const entry of packages) {
    if (!supportsPackageRuntime(entry, nodeVersion)) {
      throw new Error(
        `${entry.name} requires Node ${entry.manifest.engines.node}; cannot probe on Node ${nodeVersion}`
      );
    }
    for (const [name, range] of Object.entries(
      entry.manifest.peerDependencies ?? {}
    )) {
      if (!name.startsWith("@angular/")) continue;
      // Check each package before the merged peer map can hide an incompatible
      // peer. Only the binding's declared Angular 20 alternative may be used.
      if (
        !range
          .split("||")
          .some((part) => part.trim() === BASELINE_ANGULAR_RANGE)
      ) {
        throw new Error(
          `${entry.name} peer ${name}@${range} cannot use Angular 20 on Node ${nodeVersion}`
        );
      }
    }
  }
  for (const name of Object.keys(deps)) {
    if (name.startsWith("@angular/")) deps[name] = BASELINE_ANGULAR_RANGE;
  }
}

/**
 * Modules a probe loads before the routes: the Angular compiler, when an
 * Angular package is published, so its partially compiled classes can
 * finish compiling as they load.
 *
 * @param {Record<string, string>} deps What {@link kitLoadDependencies} installs.
 */
export function probePrelude(deps) {
  return deps["@angular/compiler"] ? ["@angular/compiler"] : [];
}

function pack() {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli?.includes("pnpm")) {
    throw new Error("run pack through pnpm so workspace ranges are rewritten");
  }

  rmSync(PACK_DIR, { recursive: true, force: true });
  mkdirSync(PACK_DIR, { recursive: true });
  const expected = publishedPackageNames();
  const packages = {};

  for (const { name, directory } of publishedPackages()) {
    const packageDir = packageDirOf(directory);
    const output = run(
      process.execPath,
      [pnpmCli, "pack", "--pack-destination", PACK_DIR],
      packageDir,
      `pack ${name}`
    );
    const tarball = basename(output.trim().split("\n").at(-1));
    packages[name] = tarball;
    console.log(`packed ${name}`);
  }

  assertPackedMatchesExpected(Object.keys(packages), expected);
  writeFileSync(MANIFEST, JSON.stringify({ packages }, null, 2) + "\n");
  console.log(
    `node-support: prepared ${Object.keys(packages).length} published tarballs`
  );
}

function verify() {
  const expected = publishedPackageNames();
  const { packages } = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const packedNames = Object.keys(packages);
  assertPackedMatchesExpected(packedNames, expected);
  const published = publishedPackages();
  const compatible = packagesForRuntime(published, process.versions.node);
  const runtimeNames = compatible.map((entry) => entry.name).sort();
  const count = runtimeNames.length;
  console.log(
    `node-support: verifying ${count} runtime-compatible published packages`
  );
  for (const { name, manifest } of published.filter(
    (entry) => !runtimeNames.includes(entry.name)
  )) {
    console.log(
      `${name} requires Node ${manifest.engines.node}; tested on Node 22.22.3 and Node 24`
    );
  }

  const scratch = mkdtempSync(join(tmpdir(), "adapttable-node-support-"));
  process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));
  const tarballs = Object.fromEntries(
    runtimeNames.map((name) => [name, `file:${join(PACK_DIR, packages[name])}`])
  );
  const hostNames = runtimeNames.filter((name) =>
    VUE_HOST_PACKAGES.includes(name)
  );
  const routes = runtimeProbeRoutes(compatible).filter(
    (route) =>
      !hostNames.some((name) => route === name || route.startsWith(`${name}/`))
  );
  const loadDependencies = kitLoadDependencies(compatible);
  const prelude = probePrelude(loadDependencies);

  writeFileSync(
    join(scratch, "package.json"),
    JSON.stringify(
      {
        name: "adapttable-node-support",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: {
          ...tarballs,
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          ...loadDependencies,
        },
        overrides: kitLoadOverrides(tarballs, loadDependencies),
      },
      null,
      2
    )
  );

  writeFileSync(
    join(scratch, "probe.mjs"),
    `const routes = ${JSON.stringify(routes, null, 2)};
for (const module of ${JSON.stringify(prelude)}) await import(module);
for (const route of routes) {
  const loaded = await import(route);
  if (Object.keys(loaded).length === 0) throw new Error(\`\${route} has no ESM exports\`);
}
`
  );
  writeFileSync(
    join(scratch, "probe.cjs"),
    `const routes = ${JSON.stringify(routes, null, 2)};
for (const module of ${JSON.stringify(prelude)}) require(module);
for (const route of routes) {
  const loaded = require(route);
  if (Object.keys(loaded).length === 0) throw new Error(\`\${route} has no CommonJS exports\`);
}
`
  );

  run(
    NPM_BIN,
    [
      "install",
      "--engine-strict",
      // This combined load probe supplies native peer closure explicitly;
      // peer-floor compatibility has its own separate harness.
      "--legacy-peer-deps",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    scratch,
    "npm install"
  );
  assertElementAlias(scratch, loadDependencies);
  run(process.execPath, ["probe.mjs"], scratch, "ESM probe");
  run(process.execPath, ["probe.cjs"], scratch, "CommonJS probe");

  for (const script of [
    "node-support-vue-host.mjs",
    "node-support-vue-ssr.mjs",
  ]) {
    copyFileSync(join(ROOT, "scripts", script), join(scratch, script));
  }
  const nativeVueKits = vueKits(compatible)
    .map((entry) => entry.name)
    .filter((name) => !hostNames.includes(name));
  if (nativeVueKits.length) {
    process.stdout.write(
      run(
        process.execPath,
        ["node-support-vue-ssr.mjs", ...nativeVueKits],
        scratch,
        "Vue native SSR"
      )
    );
  }
  if (hostNames.length) {
    const expectedHostRoutes = Object.fromEntries(
      compatible
        .filter((entry) => hostNames.includes(entry.name))
        .map((entry) => [entry.name, vueHostRoutes(entry.name, entry.manifest)])
    );
    writeFileSync(
      join(scratch, "node-support-vue-routes.json"),
      JSON.stringify(expectedHostRoutes)
    );
    process.stdout.write(
      run(
        process.execPath,
        [
          "node-support-vue-host.mjs",
          "--routes",
          "node-support-vue-routes.json",
          ...hostNames,
        ],
        scratch,
        "Vue host import/require and SSR"
      )
    );
  }

  for (const { name, manifest } of compatible) {
    const installed = JSON.parse(
      readFileSync(
        join(scratch, "node_modules", ...name.split("/"), "package.json"),
        "utf8"
      )
    );
    if (installed.engines?.node !== manifest.engines?.node) {
      throw new Error(`${name} packed engines.node differs from its manifest`);
    }
  }

  console.log(
    `node-support: ${count} packed packages install and load on ${process.version}`
  );
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const command = process.argv[2];
  if (command === "pack") pack();
  else if (command === "verify") verify();
  else throw new Error("usage: node-support-harness.mjs <pack|verify>");
}
