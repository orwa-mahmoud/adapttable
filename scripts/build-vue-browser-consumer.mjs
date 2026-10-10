#!/usr/bin/env node
/** Build an isolated tarball consumer for the existing browser suite. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
  basename,
  delimiter,
  dirname,
  isAbsolute,
  join,
  relative,
} from "node:path";
import { pathToFileURL } from "node:url";

import { packageDir, REPO_ROOT } from "./packages.mjs";

export const VUE_BROWSER_ROUTE = "/__consumers/vue-native-filters/";
export const VUE_BROWSER_DIST = "e2e/consumers/dist/vue-native-filters";
const FIXTURE = "e2e/consumers/vue-native-filters";
const PACKAGES = ["core", "vue", "adapter-vue-unstyled", "i18n"];
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

function packageLookupRank(manifest, name, lookupPaths) {
  const rank = lookupPaths.findIndex((directory) => {
    try {
      const root = realpathSync(join(directory, name));
      const path = relative(root, manifest);
      return !path.startsWith("..") && !isAbsolute(path);
    } catch {
      return false;
    }
  });
  return rank === -1 ? Number.POSITIVE_INFINITY : rank;
}

function packageManagerScript(executable) {
  if (!executable.endsWith(".cmd")) return executable;
  // Windows command shims cannot be execFile'd. Read the installed package's
  // declared bin entry instead of guessing its global installation layout.
  const require = createRequire(executable);
  const candidates = [];
  for (const [name, specifier] of [
    ["pnpm", "pnpm"],
    ["corepack", "corepack/package.json"],
  ]) {
    let manifest;
    try {
      manifest = require.resolve(specifier);
    } catch {
      continue;
    }
    const bin = readJson(manifest).bin?.pnpm;
    if (typeof bin === "string")
      candidates.push({
        manifest,
        bin,
        rank: packageLookupRank(
          manifest,
          name,
          require.resolve.paths(name) ?? []
        ),
      });
  }
  // Compare both supported packages in Node's lookup order: a nearby Corepack
  // shim must not be captured by an unrelated globally installed pnpm.
  candidates.sort((left, right) => left.rank - right.rank);
  const selected = candidates[0];
  if (selected)
    return realpathSync(join(dirname(selected.manifest), selected.bin));
  throw new Error(
    "The pnpm command shim has no resolvable installed package bin"
  );
}

/** Both lifecycle scripts and clean `pnpm exec`/direct Node entry points. */
export function resolvePnpm(root = REPO_ROOT, environment = process.env) {
  const pin = /^pnpm@(\d+\.\d+\.\d+)$/.exec(
    readJson(join(root, "package.json")).packageManager
  )?.[1];
  assert.ok(
    pin,
    "The repository must pin an exact pnpm packageManager version"
  );
  const lifecycle = environment.npm_execpath;
  let executable =
    lifecycle &&
    isAbsolute(lifecycle) &&
    /^pnpm\.(?:cjs|mjs|js|cmd)$/.test(basename(lifecycle))
      ? lifecycle
      : undefined;
  if (!executable) {
    const names =
      process.platform === "win32" ? ["pnpm.exe", "pnpm.cmd"] : ["pnpm"];
    const candidates = (environment.PATH ?? "")
      .split(delimiter)
      .filter(isAbsolute)
      .flatMap((directory) => names.map((name) => join(directory, name)));
    for (const file of candidates) {
      try {
        accessSync(file, constants.X_OK);
        if (statSync(file).isFile()) {
          executable = realpathSync(file);
          break;
        }
      } catch {
        // A PATH directory need not contain pnpm. Never install it implicitly.
      }
    }
  }
  assert.ok(
    executable,
    `pnpm ${pin} is required: run with its installed executable on PATH`
  );
  executable = packageManagerScript(executable);
  const javascript = /\.(?:cjs|mjs|js)$/.test(executable);
  const command = javascript ? process.execPath : executable;
  const args = javascript ? [executable] : [];
  const env = {
    ...environment,
    COREPACK_ENABLE_NETWORK: "0",
    COREPACK_ENABLE_AUTO_PIN: "0",
    npm_config_manage_package_manager_versions: "false",
  };
  const version = execFileSync(command, [...args, "--version"], {
    cwd: root,
    env,
    encoding: "utf8",
  }).trim();
  assert.equal(
    version,
    pin,
    `Use the repository's pinned pnpm ${pin}; found ${version}`
  );
  return { command, args, env };
}

export function requireVueBrowserArtifact(root = REPO_ROOT) {
  const directory = join(root, VUE_BROWSER_DIST);
  assert.ok(
    existsSync(join(directory, "index.html")) &&
      existsSync(join(directory, "packed-consumer.json")),
    "Missing packed Vue browser consumer. Run pnpm build:e2e:vue-consumer after building the packages, or restore packed-vue-consumer-dist."
  );
  return directory;
}

export function consumerManifest(tarballs, versions) {
  const packages = Object.fromEntries(
    Object.entries(tarballs).map(([name, file]) => [name, `file:${file}`])
  );
  return {
    name: "adapttable-vue-browser-consumer",
    private: true,
    type: "module",
    dependencies: { ...packages, vue: versions.vue },
    devDependencies: { vite: versions.vite, typescript: versions.typescript },
    overrides: { ...packages, "@tanstack/virtual-core": versions.virtualCore },
  };
}

/** Package modules must come from the installed tarballs, including CSS. */
export function verifyPackedModules(ids, cell, css) {
  const packageRoot = realpathSync(join(cell, "node_modules/@adapttable"));
  let cssIncluded = false;
  for (const id of ids) {
    const file = id.split("?")[0];
    if (!file || !isAbsolute(file) || !existsSync(file)) continue;
    const actual = realpathSync(file);
    if (actual === css) cssIncluded = true;
    const normalized = actual.replaceAll("\\", "/");
    if (
      !normalized.includes("/packages/") &&
      !normalized.includes("/@adapttable/")
    )
      continue;
    const path = relative(packageRoot, actual).replaceAll("\\", "/");
    assert.ok(
      !path.startsWith("../") && !isAbsolute(path) && path.includes("/dist/"),
      `Consumer resolved workspace source or an unpacked package: ${id}`
    );
  }
  assert.ok(cssIncluded, "Consumer omitted the exported native stylesheet");
}

export async function buildVueBrowserConsumer() {
  const pnpm = resolvePnpm();
  const scratch = mkdtempSync(join(tmpdir(), "adapttable-vue-browser-"));
  try {
    const packs = join(scratch, "packs");
    const cell = join(scratch, "consumer");
    mkdirSync(packs);
    cpSync(join(REPO_ROOT, FIXTURE), cell, { recursive: true });
    const tarballs = {};
    const packed = {};
    for (const name of PACKAGES) {
      const directory = packageDir(name);
      const manifest = readJson(join(directory, "package.json"));
      assert.ok(existsSync(join(directory, "dist")), `Build ${name} first`);
      const output = execFileSync(
        pnpm.command,
        [...pnpm.args, "pack", "--pack-destination", packs],
        { cwd: directory, env: pnpm.env, encoding: "utf8" }
      );
      const file = output.trim().split("\n").at(-1).trim();
      tarballs[manifest.name] = file;
      packed[manifest.name] = {
        version: manifest.version,
        sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
      };
    }
    const showcase = createRequire(
      join(REPO_ROOT, "apps/showcase/package.json")
    );
    const tooling = createRequire(import.meta.url);
    const binding = createRequire(join(packageDir("vue"), "package.json"));
    const versions = {
      vue: readJson(showcase.resolve("vue/package.json")).version,
      vite: readJson(showcase.resolve("vite/package.json")).version,
      typescript: readJson(tooling.resolve("typescript/package.json")).version,
      virtualCore: readJson(
        binding.resolve("@tanstack/virtual-core/package.json")
      ).version,
    };
    writeJson(join(cell, "package.json"), consumerManifest(tarballs, versions));
    const npm = join(
      dirname(process.execPath),
      process.platform === "win32" ? "npm.cmd" : "npm"
    );
    execFileSync(
      npm,
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
      ],
      { cwd: cell, stdio: "inherit" }
    );
    const consumer = createRequire(join(cell, "package.json"));
    execFileSync(
      process.execPath,
      [
        consumer.resolve("typescript/bin/tsc"),
        "--noEmit",
        "-p",
        join(cell, "tsconfig.json"),
      ],
      { cwd: cell, stdio: "inherit" }
    );
    const css = realpathSync(
      consumer.resolve("@adapttable/vue-unstyled/styles.css")
    );
    assert.ok(
      readFileSync(css, "utf8").trim(),
      "Empty packed native stylesheet"
    );
    const { build } = await import(
      pathToFileURL(consumer.resolve("vite")).href
    );
    await build({
      configFile: false,
      root: cell,
      base: VUE_BROWSER_ROUTE,
      build: { outDir: join(scratch, "dist"), emptyOutDir: true },
      plugins: [
        {
          name: "verify-packed-vue-consumer",
          generateBundle() {
            verifyPackedModules(this.getModuleIds(), cell, css);
          },
        },
      ],
    });
    writeJson(join(scratch, "dist/packed-consumer.json"), {
      route: VUE_BROWSER_ROUTE,
      packages: packed,
      versions,
    });
    const destination = join(REPO_ROOT, VUE_BROWSER_DIST);
    rmSync(destination, { recursive: true, force: true });
    cpSync(join(scratch, "dist"), destination, { recursive: true });
    requireVueBrowserArtifact();
    console.log(`Packed Vue consumer ready at ${VUE_BROWSER_ROUTE}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await buildVueBrowserConsumer();
