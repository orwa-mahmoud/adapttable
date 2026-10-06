#!/usr/bin/env node
/** Built declarations and ownership regressions on current and minimum Vue.
 * Requires the normal workspace build first. No source aliases enter the
 * isolated ESM/SFC/CJS cells; runtime source regressions run separately.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  declaredFloor,
  installFloor,
  verifyVueResolution,
} from "./check-vue-peer-types.mjs";
import {
  diagnosticProblems,
  invalidFixtures,
  VUE_TYPE_EXPECTATIONS,
} from "./check-vue-types.mjs";
import { packageDir, REPO_ROOT } from "./packages.mjs";
import {
  builtVueProfile,
  prepareVueCell,
  readJson,
  VUE_PACKAGES,
  writeJson,
} from "./vue-peer-consumers.mjs";
import {
  assertVueRuntimeCases,
  assertVueRuntimeCells,
} from "./vue-runtime-results.mjs";

const require = createRequire(import.meta.url);
function run(args, cwd, env = process.env) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `Process terminated: ${result.signal}`);
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

export function checkConsumer(cell, vueRoot, name, mode) {
  const config = builtVueProfile(REPO_ROOT, cell, name, mode);
  const version = readJson(join(vueRoot, "package.json")).version;
  verifyVueResolution(config, join(cell, "consumer.ts"), vueRoot, version);
  const file = join(cell, `${name}-${mode}.json`);
  writeJson(file, config);
  const result = run(
    [
      "--max-old-space-size=2048",
      require.resolve("vue-tsc/bin/vue-tsc.js"),
      "--noEmit",
      "--pretty",
      "false",
      "-p",
      file,
    ],
    cell
  );
  if (mode === "negative") {
    const fixtureDir = join(cell, name, "test/types/invalid");
    const manifest = readJson(join(packageDir(name), "package.json"));
    const problems = diagnosticProblems({
      files: invalidFixtures(fixtureDir),
      expectations: VUE_TYPE_EXPECTATIONS[manifest.name],
      output: result.output,
      status: result.status,
      cwd: cell,
      fixtureDir,
    });
    assert.deepEqual(problems, [], problems.join("\n"));
  } else {
    assert.equal(result.status, 0, result.output);
    assert.equal(result.output.trim(), "");
  }
  console.log(`Built Vue ${version}: ${name} ${mode} consumers passed`);
}

export function checkRuntime(cell, vueRoot, built) {
  const version = readJson(join(vueRoot, "package.json")).version;
  const kind = built ? "built" : "source";
  const reportFile = join(cell, `${kind}-runtime.json`);
  rmSync(reportFile, { force: true });
  const result = run(
    [
      "--max-old-space-size=2048",
      join(dirname(require.resolve("vitest/package.json")), "vitest.mjs"),
      "run",
      "--config",
      join(REPO_ROOT, "scripts/vue-peer-runtime.mjs"),
      "--reporter=default",
      "--reporter=json",
      `--outputFile.json=${reportFile}`,
    ],
    built ? cell : REPO_ROOT,
    {
      ...process.env,
      ADAPTTABLE_VUE_PEER_ROOT: vueRoot,
      ADAPTTABLE_VUE_PEER_VERSION: version,
      ADAPTTABLE_VUE_PEER_CELL: built ? cell : "",
    }
  );
  assert.equal(result.status, 0, result.output);
  assertVueRuntimeCases(readJson(reportFile), built ? cell : REPO_ROOT, kind);
  console.log(result.output.trim());
  console.log(
    `Vue ${version}: ${built ? "isolated built" : "source ownership"} runtime passed`
  );
  return { cell: kind, root: realpathSync(vueRoot), version };
}

export function checkVueBuiltPeers(floorRoot) {
  const scratch = mkdtempSync(join(tmpdir(), "adapttable-vue-built-peers-"));
  try {
    const floor = declaredFloor();
    for (const name of VUE_PACKAGES)
      assert.equal(
        readJson(join(packageDir(name), "package.json")).peerDependencies.vue,
        `^${floor}`
      );
    const minimumRoot = floorRoot ?? installFloor(scratch, floor);
    assert.equal(readJson(join(minimumRoot, "package.json")).version, floor);
    const currentRoot = realpathSync(
      join(packageDir("vue"), "node_modules/vue")
    );
    const peers = [
      { label: "current", root: currentRoot },
      { label: "floor", root: realpathSync(minimumRoot) },
    ].map((peer) => ({
      ...peer,
      version: readJson(join(peer.root, "package.json")).version,
    }));
    const completed = [];
    for (const { label, root: vueRoot } of peers) {
      const cell = join(scratch, label);
      const entries = prepareVueCell(cell, vueRoot);
      console.log(`${label}: checking ${entries.length} published Vue entries`);
      const exports = run(
        [
          "--max-old-space-size=2048",
          join(REPO_ROOT, "scripts/vue-export-contracts.mjs"),
          "--cell",
          cell,
        ],
        REPO_ROOT
      );
      assert.equal(exports.status, 0, exports.output);
      console.log(`${label}: ${exports.output.trim()}`);
      for (const name of VUE_PACKAGES) {
        checkConsumer(cell, vueRoot, name, "positive");
        const manifest = readJson(join(packageDir(name), "package.json"));
        if (
          VUE_TYPE_EXPECTATIONS[manifest.name] ||
          existsSync(join(cell, name, "test/types/invalid"))
        )
          checkConsumer(cell, vueRoot, name, "negative");
      }
      checkConsumer(cell, vueRoot, "all", "cjs");
      completed.push({ peer: label, ...checkRuntime(cell, vueRoot, true) });
      completed.push({ peer: label, ...checkRuntime(cell, vueRoot, false) });
    }
    assertVueRuntimeCells(completed, peers);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  assert.ok(
    args.length === 0 || (args.length === 2 && args[0] === "--vue-root"),
    "Usage: check-vue-built-peers.mjs [--vue-root /path/to/node_modules/vue]"
  );
  checkVueBuiltPeers(args[1] && resolve(args[1]));
}
