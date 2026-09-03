import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PACKAGES = join(ROOT, "packages");
const FLOOR = ">=22.12.0";
const README_CLAIM =
  "Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.";

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function packageManifests() {
  return readdirSync(PACKAGES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PACKAGES, entry.name, "package.json"))
    .filter(existsSync);
}

describe("supported Node contract", () => {
  it("declares one floor in the repo and every package", () => {
    const manifests = [join(ROOT, "package.json"), ...packageManifests()];
    assert.equal(manifests.length, 15);
    for (const manifest of manifests) {
      assert.equal(json(manifest).engines?.node, FLOOR, manifest);
    }
  });

  it("states the floor in every published package README", () => {
    for (const manifest of packageManifests()) {
      const pkg = json(manifest);
      if (pkg.private) continue;
      const readme = readFileSync(join(dirname(manifest), "README.md"), "utf8");
      assert.ok(readme.includes(README_CLAIM), pkg.name);
    }
  });

  it("runs packed consumers on the floor and Active LTS", () => {
    const workflow = readFileSync(
      join(ROOT, ".github/workflows/pr.yml"),
      "utf8"
    );
    assert.ok(workflow.includes('node: ["22.12.0", "24"]'));
    assert.ok(workflow.includes("node-version: ${{ matrix.node }}"));
    assert.match(
      workflow,
      /node-support:[\s\S]*node scripts\/node-support-harness\.mjs verify/
    );
  });

  it("packs once with the repository toolchain before switching runtimes", () => {
    const workflow = readFileSync(
      join(ROOT, ".github/workflows/pr.yml"),
      "utf8"
    );
    assert.ok(workflow.includes("run: pnpm node:support:pack"));
    assert.match(
      workflow,
      /name: node-support-packs[\s\S]*path: node-support-packs\//
    );
    assert.ok(workflow.includes("consumer, node-support, floors"));
  });
});
