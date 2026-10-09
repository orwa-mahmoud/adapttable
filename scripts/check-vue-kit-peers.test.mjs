import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import {
  KIT_PEER_RUNS,
  kitFloor,
  kitPeerConfig,
} from "./check-vue-kit-peers.mjs";
import { packageDir, REPO_ROOT } from "./packages.mjs";

const HOOK = join(REPO_ROOT, "scripts/vue-peer-resolve.mjs");
const vueRoot = realpathSync(join(packageDir("vue"), "node_modules/vue"));

describe("Vue kit peer runs", () => {
  it("runs every styled Vue kit, through test files that exist", () => {
    const kits = readdirSync(join(REPO_ROOT, "packages/vue"))
      .filter(
        (dir) => dir.startsWith("adapter-") && dir !== "adapter-vue-unstyled"
      )
      .sort();
    assert.deepEqual(Object.keys(KIT_PEER_RUNS).sort(), kits);
    for (const [folder, runs] of Object.entries(KIT_PEER_RUNS))
      for (const file of runs.flatMap((run) => run.files))
        assert.ok(
          existsSync(join(packageDir(folder), file)),
          `${folder}: ${file}`
        );
  });

  it("reads each kit's floor from its own Vue peer range", () => {
    assert.equal(kitFloor("adapter-nuxt-ui"), "3.5.18");
    assert.equal(kitFloor("adapter-element-plus"), "3.5.0");
  });

  it("routes Vue, its runtime packages and the SFC compiler to the selected install", () => {
    const config = kitPeerConfig("adapter-quasar", vueRoot);
    assert.match(
      config,
      new RegExp(
        `import base from ${JSON.stringify(join(packageDir("adapter-quasar"), "vitest.config.ts"))}`
      )
    );
    for (const name of ["runtime-core", "runtime-dom", "reactivity", "shared"])
      assert.ok(config.includes(`^@vue/${name}$`), name);
    assert.ok(config.includes(JSON.stringify(vueRoot).slice(1, -1)));
    assert.match(
      config,
      /plugin\.api\.options = \{ \.\.\.plugin\.api\.options, compiler \}/
    );
    assert.match(config, /pool: "forks"/);
  });
});

describe("Vue peer resolution hook", () => {
  /** A Vue install whose modules name themselves. */
  function fakeInstall() {
    const root = mkdtempSync(join(tmpdir(), "vue-peer-hook-"));
    const modules = join(root, "node_modules");
    for (const [name, marker] of [
      ["vue", "selected vue"],
      ["@vue/shared", "selected shared"],
    ]) {
      mkdirSync(join(modules, name), { recursive: true });
      writeFileSync(
        join(modules, name, "package.json"),
        JSON.stringify({ name, version: "0.0.0", main: "index.js" })
      );
      writeFileSync(
        join(modules, name, "index.js"),
        `module.exports = { marker: ${JSON.stringify(marker)} };`
      );
    }
    return { root, vue: join(modules, "vue") };
  }
  // Run where the binding's own Vue is installed, so an unhooked require
  // resolves the workspace's Vue.
  const load = (env, code) =>
    spawnSync(
      process.execPath,
      [`--import=${pathToFileURL(HOOK).href}`, "-e", code],
      {
        cwd: packageDir("vue"),
        encoding: "utf8",
        env: { ...process.env, ...env },
      }
    );

  it("sends CommonJS requires of vue and @vue/* to the configured install", () => {
    const install = fakeInstall();
    try {
      const result = load(
        { ADAPTTABLE_VUE_PEER_ROOT: install.vue },
        "process.stdout.write(require('vue').marker + ' / ' + require('@vue/shared').marker)"
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "selected vue / selected shared");
    } finally {
      rmSync(install.root, { recursive: true, force: true });
    }
  });

  it("leaves resolution alone when no install is configured", () => {
    const result = load(
      { ADAPTTABLE_VUE_PEER_ROOT: "" },
      "process.stdout.write(require('vue').version)"
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^3\.\d+\.\d+$/);
  });
});
