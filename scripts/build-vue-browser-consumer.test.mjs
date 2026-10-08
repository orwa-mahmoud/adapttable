import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  consumerManifest,
  requireVueBrowserArtifact,
  resolvePnpm,
  verifyPackedModules,
  VUE_BROWSER_DIST,
  VUE_BROWSER_ROUTE,
} from "./build-vue-browser-consumer.mjs";
import { REPO_ROOT } from "./packages.mjs";

function scratch(t) {
  // The builder reports real paths; macOS serves the temporary directory
  // through a symlink, so the fixture root is resolved once up front.
  const root = realpathSync(mkdtempSync(join(tmpdir(), "vue-browser-test-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, path, contents = "fixture") {
  const file = join(root, path);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, contents);
  return file;
}

function installedManager(t, version = "10.33.0") {
  const root = scratch(t);
  write(
    root,
    "package.json",
    JSON.stringify({ packageManager: "pnpm@10.33.0" })
  );
  const source = `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version") console.log(${JSON.stringify(version)});
else {
  fs.writeFileSync(process.env.ADAPTTABLE_PACK_PROBE, JSON.stringify({
    args,
    cwd: process.cwd(),
    network: process.env.COREPACK_ENABLE_NETWORK,
    managerDownloads: process.env.npm_config_manage_package_manager_versions,
  }));
  process.exit(73);
}
`;
  const cli = write(root, "bin/node_modules/pnpm/bin/pnpm.cjs", source);
  write(
    root,
    "bin/node_modules/pnpm/package.json",
    JSON.stringify({
      name: "pnpm",
      version,
      bin: { pnpm: "bin/pnpm.cjs", pnpx: "bin/pnpx.cjs" },
      exports: { ".": "./package.json" },
    })
  );
  write(root, "bin/pnpm.cmd", "@echo off\r\n");
  const executable = write(
    root,
    process.platform === "win32" ? "bin/pnpm.cmd" : "bin/pnpm",
    source
  );
  chmodSync(executable, 0o755);
  const env = {
    ...process.env,
    PATH: join(root, "bin"),
    ADAPTTABLE_PACK_PROBE: join(root, "pack.json"),
  };
  delete env.npm_execpath;
  return { root, cli, env };
}

test("pnpm resolution accepts an installed pinned manager without lifecycle environment", (t) => {
  const { root, env } = installedManager(t);
  const manager = resolvePnpm(root, env);
  assert.ok(
    manager.command.startsWith(
      process.platform === "win32" ? process.execPath : root
    )
  );
  assert.equal(manager.env.COREPACK_ENABLE_NETWORK, "0");
  assert.equal(manager.env.npm_config_manage_package_manager_versions, "false");
});

test("pnpm resolution preserves lifecycle entry points and rejects missing or mismatched versions", (t) => {
  const { root, cli, env } = installedManager(t);
  const manager = resolvePnpm(root, { ...env, PATH: "", npm_execpath: cli });
  assert.equal(manager.command, process.execPath);
  assert.deepEqual(manager.args, [cli]);
  const shim = resolvePnpm(root, {
    ...env,
    PATH: "",
    npm_execpath: join(root, "bin/pnpm.cmd"),
  });
  assert.equal(shim.command, process.execPath);
  assert.deepEqual(shim.args, [cli]);
  assert.throws(
    () => resolvePnpm(root, { ...env, PATH: "" }),
    /installed executable on PATH/
  );
  const wrong = installedManager(t, "11.19.0");
  assert.throws(
    () => resolvePnpm(wrong.root, wrong.env),
    /pinned pnpm 10.33.0; found 11.19.0/
  );
});

test("command shims retain Corepack's exported manifest subpath", (t) => {
  const { root, env } = installedManager(t);
  const pnpmRoot = join(root, "bin/node_modules/pnpm");
  const corepackRoot = join(root, "bin/node_modules/corepack");
  cpSync(pnpmRoot, corepackRoot, { recursive: true });
  cpSync(pnpmRoot, join(root, "node_modules/pnpm"), { recursive: true });
  write(
    root,
    "node_modules/pnpm/bin/pnpm.cjs",
    'throw new Error("Do not execute the unrelated manager");'
  );
  rmSync(pnpmRoot, { recursive: true });
  write(
    root,
    "bin/node_modules/corepack/package.json",
    JSON.stringify({
      name: "corepack",
      version: "0.34.6",
      bin: { pnpm: "bin/pnpm.cjs" },
      exports: { "./package.json": "./package.json" },
    })
  );
  const manager = resolvePnpm(root, {
    ...env,
    PATH: "",
    npm_execpath: join(root, "bin/pnpm.cmd"),
  });
  assert.equal(manager.command, process.execPath);
  assert.deepEqual(manager.args, [join(corepackRoot, "bin/pnpm.cjs")]);
  assert.equal(manager.env.COREPACK_ENABLE_NETWORK, "0");
  assert.equal(manager.env.COREPACK_ENABLE_AUTO_PIN, "0");
  assert.equal(manager.env.npm_config_manage_package_manager_versions, "false");
});

test("the direct builder reaches pnpm pack with npm_execpath absent", (t) => {
  const { root, env } = installedManager(t);
  for (const file of ["build-vue-browser-consumer.mjs", "packages.mjs"]) {
    mkdirSync(join(root, "scripts"), { recursive: true });
    cpSync(join(REPO_ROOT, "scripts", file), join(root, "scripts", file));
  }
  write(root, "e2e/consumers/vue-native-filters/index.html");
  write(
    root,
    "packages/shared/core/package.json",
    JSON.stringify({ name: "@adapttable/core", version: "3.8.1" })
  );
  write(root, "packages/shared/core/dist/index.js");
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/build-vue-browser-consumer.mjs")],
    { cwd: root, env, encoding: "utf8" }
  );
  // The stand-in pack deliberately stops here: this regression exercises the
  // real CLI entry and manager selection without installing or building.
  assert.equal(result.status, 1);
  assert.match(result.stderr, /status: 73/);
  const probe = JSON.parse(readFileSync(env.ADAPTTABLE_PACK_PROBE, "utf8"));
  assert.equal(probe.args[0], "pack");
  assert.equal(probe.args[1], "--pack-destination");
  assert.equal(probe.cwd, join(root, "packages/shared/core"));
  assert.equal(probe.network, "0");
  assert.equal(probe.managerDownloads, "false");
});

test("consumer installs local tarballs throughout its dependency graph and exact tool versions", () => {
  const tarballs = {
    "@adapttable/core": "/packed/core.tgz",
    "@adapttable/vue": "/packed/vue.tgz",
    "@adapttable/vue-unstyled": "/packed/native.tgz",
    "@adapttable/i18n": "/packed/i18n.tgz",
  };
  const versions = {
    vue: "3.5.43",
    vite: "8.2.2",
    typescript: "6.0.3",
    virtualCore: "3.17.11",
  };
  const manifest = consumerManifest(tarballs, versions);
  for (const [name, file] of Object.entries(tarballs)) {
    assert.equal(manifest.dependencies[name], `file:${file}`);
    assert.equal(manifest.overrides[name], `file:${file}`);
  }
  assert.equal(manifest.dependencies.vue, versions.vue);
  assert.deepEqual(manifest.devDependencies, {
    vite: versions.vite,
    typescript: versions.typescript,
  });
  assert.equal(
    manifest.overrides["@tanstack/virtual-core"],
    versions.virtualCore
  );
});

test("the bundle guard rejects source aliases, absent CSS and CSS from another consumer", (t) => {
  const root = scratch(t);
  const code = write(
    root,
    "node_modules/@adapttable/vue-unstyled/dist/index.js"
  );
  const css = write(
    root,
    "node_modules/@adapttable/vue-unstyled/dist/styles.css"
  );
  const source = write(root, "packages/vue/adapter-vue-unstyled/src/index.ts");
  const foreign = write(
    root,
    "other/node_modules/@adapttable/vue-unstyled/dist/index.js"
  );
  verifyPackedModules([code, css], root, css);
  assert.throws(
    () => verifyPackedModules([code], root, css),
    /omitted.*stylesheet/
  );
  assert.throws(
    () => verifyPackedModules([code, css, source], root, css),
    /workspace source/
  );
  assert.throws(
    () => verifyPackedModules([code, css, foreign], root, css),
    /unpacked package/
  );
});

test("restored browser assets must include the consumer build receipt", (t) => {
  const root = scratch(t);
  assert.throws(
    () => requireVueBrowserArtifact(root),
    /restore packed-vue-consumer-dist/
  );
  write(root, `${VUE_BROWSER_DIST}/index.html`);
  assert.throws(() => requireVueBrowserArtifact(root), /Missing packed Vue/);
  write(root, `${VUE_BROWSER_DIST}/packed-consumer.json`, "{}");
  assert.equal(requireVueBrowserArtifact(root), join(root, VUE_BROWSER_DIST));
});

function prepareServer(t, packed = true) {
  const root = scratch(t);
  for (const file of [
    "serve-showcase.mjs",
    "build-vue-browser-consumer.mjs",
    "packages.mjs",
  ]) {
    mkdirSync(join(root, "scripts"), { recursive: true });
    cpSync(join(REPO_ROOT, "scripts", file), join(root, "scripts", file));
  }
  write(root, "apps/showcase/dist/index.html", "ordinary showcase");
  if (packed) {
    write(root, `${VUE_BROWSER_DIST}/index.html`, "packed Vue consumer");
    write(
      root,
      `${VUE_BROWSER_DIST}/assets/consumer.css`,
      ".packed {color: red}"
    );
    write(root, `${VUE_BROWSER_DIST}/packed-consumer.json`, "{}");
  }
  return root;
}

function serve(t, root) {
  const child = spawn(
    process.execPath,
    [join(root, "scripts/serve-showcase.mjs"), "--port", "0"],
    {
      cwd: root,
      env: { ...process.env, SHOWCASE_SKIP_BUILD: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, "exit");
      child.kill();
      await stopped;
    }
  });
  return child;
}

test("the existing server mounts packed assets independently from public showcase output", async (t) => {
  const root = prepareServer(t);
  const child = serve(t, root);
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Server did not start")),
      10_000
    );
    t.after(() => clearTimeout(timer));
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      const match = /on (http:\/\/localhost:\d+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`Server exited: ${code}`)));
  });
  const response = await fetch(`${origin}${VUE_BROWSER_ROUTE}?mobile&rtl`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "packed Vue consumer");
  const css = await fetch(`${origin}${VUE_BROWSER_ROUTE}assets/consumer.css`);
  assert.equal(css.status, 200);
  assert.equal(css.headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal(await css.text(), ".packed {color: red}");
  assert.equal(await (await fetch(origin)).text(), "ordinary showcase");
  for (const path of [
    `${VUE_BROWSER_ROUTE}missing`,
    `${VUE_BROWSER_ROUTE}%2e%2e%2findex.html`,
    "/__consumers/vue-native-filters-other/",
  ])
    assert.equal((await fetch(`${origin}${path}`)).status, 404, path);
});

test("a missing CI packed artifact fails server startup without a source fallback", async (t) => {
  const child = serve(t, prepareServer(t, false));
  let error = "";
  child.stderr.on("data", (chunk) => {
    error += chunk.toString();
  });
  const [code] = await once(child, "exit");
  assert.equal(code, 1);
  assert.match(error, /Missing packed Vue browser consumer/);
});

test("both browser workflows build and restore the isolated artifact, and the fixture is typechecked separately", () => {
  for (const [workflow, copies] of [
    ["pr.yml", 2],
    ["e2e-nightly.yml", 3],
  ]) {
    const source = readFileSync(
      join(REPO_ROOT, ".github/workflows", workflow),
      "utf8"
    );
    assert.match(source, /run: pnpm build:e2e:vue-consumer/);
    assert.equal(
      source.match(/name: packed-vue-consumer-dist/g)?.length,
      copies
    );
    assert.equal(
      source.match(/path: e2e\/consumers\/dist\/vue-native-filters\//g)?.length,
      copies
    );
  }
  const config = JSON.parse(
    readFileSync(join(REPO_ROOT, "e2e/tsconfig.json"), "utf8")
  );
  assert.deepEqual(config.exclude, ["./consumers"]);
  const fixture = JSON.parse(
    readFileSync(
      join(REPO_ROOT, "e2e/consumers/vue-native-filters/tsconfig.json"),
      "utf8"
    )
  );
  assert.equal(fixture.compilerOptions.strict, true);
  assert.equal(fixture.compilerOptions.skipLibCheck, false);
  assert.equal(fixture.compilerOptions.paths, undefined);
});
