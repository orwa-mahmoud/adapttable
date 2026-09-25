#!/usr/bin/env node
/**
 * Build-tool/runtime split for the supported Node contract.
 *
 * `pack` runs under the repository's Node 24 + pnpm toolchain after `pnpm
 * build`. `verify` runs directly under each advertised Node version and uses
 * only that Node's npm to install and load the packed artifacts.
 *
 * Expected package names come from non-private workspace manifests, never
 * from the packed manifest being judged.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

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

/**
 * Kit peers needed to load adapter roots. Workspace packages and React
 * are already installed as tarballs / explicit deps. When MUI is a peer,
 * Emotion is required to evaluate `@mui/material`.
 *
 * @param {ReturnType<typeof publishedPackages>} packages
 */
export function kitLoadDependencies(packages) {
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
  return deps;
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
  const count = expected.length;
  console.log(`node-support: verifying ${count} published packages`);

  const scratch = mkdtempSync(join(tmpdir(), "adapttable-node-support-"));
  process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));
  const tarballs = Object.fromEntries(
    packedNames.map((name) => [name, `file:${join(PACK_DIR, packages[name])}`])
  );
  const routes = probeRoutes(expected);

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
          ...kitLoadDependencies(publishedPackages()),
        },
        overrides: tarballs,
      },
      null,
      2
    )
  );

  writeFileSync(
    join(scratch, "probe.mjs"),
    `const routes = ${JSON.stringify(routes, null, 2)};
for (const route of routes) {
  const loaded = await import(route);
  if (Object.keys(loaded).length === 0) throw new Error(\`\${route} has no ESM exports\`);
}
`
  );
  writeFileSync(
    join(scratch, "probe.cjs"),
    `const routes = ${JSON.stringify(routes, null, 2)};
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
      "--legacy-peer-deps",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    scratch,
    "npm install"
  );
  run(process.execPath, ["probe.mjs"], scratch, "ESM probe");
  run(process.execPath, ["probe.cjs"], scratch, "CommonJS probe");

  for (const name of expected) {
    const installed = JSON.parse(
      readFileSync(
        join(scratch, "node_modules", ...name.split("/"), "package.json"),
        "utf8"
      )
    );
    if (installed.engines?.node !== ">=22.12.0") {
      throw new Error(`${name} packed engines.node is not >=22.12.0`);
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
