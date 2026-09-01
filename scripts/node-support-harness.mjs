#!/usr/bin/env node
/**
 * Build-tool/runtime split for the supported Node contract.
 *
 * `pack` runs under the repository's Node 24 + pnpm toolchain after `pnpm
 * build`. `verify` runs directly under each advertised Node version and uses
 * only that Node's npm to install and load the packed artifacts.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACK_DIR = join(ROOT, "node-support-packs");
const MANIFEST = join(PACK_DIR, "manifest.json");
const NPM_BIN = join(
  dirname(process.execPath),
  process.platform === "win32" ? "npm.cmd" : "npm"
);

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

function packageDirectories() {
  return readdirSync(join(ROOT, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((directory) =>
      existsSync(join(ROOT, "packages", directory, "package.json"))
    );
}

function pack() {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli?.includes("pnpm")) {
    throw new Error("run pack through pnpm so workspace ranges are rewritten");
  }

  rmSync(PACK_DIR, { recursive: true, force: true });
  mkdirSync(PACK_DIR, { recursive: true });
  const packages = {};

  for (const directory of packageDirectories()) {
    const packageDir = join(ROOT, "packages", directory);
    const packageJson = JSON.parse(
      readFileSync(join(packageDir, "package.json"), "utf8")
    );
    if (packageJson.private) continue;
    const output = run(
      process.execPath,
      [pnpmCli, "pack", "--pack-destination", PACK_DIR],
      packageDir,
      `pack ${packageJson.name}`
    );
    const tarball = basename(output.trim().split("\n").at(-1));
    packages[packageJson.name] = tarball;
    console.log(`packed ${packageJson.name}`);
  }

  writeFileSync(MANIFEST, JSON.stringify({ packages }, null, 2) + "\n");
  console.log(
    `node-support: prepared ${Object.keys(packages).length} published tarballs`
  );
}

function verify() {
  const { packages } = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const entries = Object.entries(packages);
  if (entries.length !== 12) {
    throw new Error(`expected 12 published tarballs, found ${entries.length}`);
  }

  const scratch = mkdtempSync(join(tmpdir(), "adapttable-node-support-"));
  process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));
  const tarballs = Object.fromEntries(
    entries.map(([name, file]) => [name, `file:${join(PACK_DIR, file)}`])
  );

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
        },
        overrides: tarballs,
      },
      null,
      2
    )
  );

  writeFileSync(
    join(scratch, "probe.mjs"),
    `const routes = [
  "@adapttable/core",
  "@adapttable/core/adapter",
  "@adapttable/core/query",
  "@adapttable/server",
  "@adapttable/i18n",
  "@adapttable/cli",
  "@adapttable/unstyled",
];
for (const route of routes) {
  const loaded = await import(route);
  if (Object.keys(loaded).length === 0) throw new Error(\`\${route} has no ESM exports\`);
}
`
  );
  writeFileSync(
    join(scratch, "probe.cjs"),
    `for (const route of [
  "@adapttable/core",
  "@adapttable/core/adapter",
  "@adapttable/core/query",
  "@adapttable/server",
  "@adapttable/i18n",
  "@adapttable/cli",
  "@adapttable/unstyled",
]) {
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

  for (const [name] of entries) {
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
    `node-support: 12 packed packages install and load on ${process.version}`
  );
}

const command = process.argv[2];
if (command === "pack") pack();
else if (command === "verify") verify();
else throw new Error("usage: node-support-harness.mjs <pack|verify>");
