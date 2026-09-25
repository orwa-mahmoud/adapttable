import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import {
  assertPackedMatchesExpected,
  EXTRA_PROBE_ROUTES,
  kitLoadDependencies,
  probeRoutes,
  publishedPackageNames,
  publishedPackages,
} from "./node-support-harness.mjs";
import { listPackages, REPO_ROOT as ROOT } from "./packages.mjs";

const FLOOR = ">=22.12.0";
const README_CLAIM =
  "Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.";
const PUBLISHED_SNAPSHOT = [
  "@adapttable/ai",
  "@adapttable/ai-react",
  "@adapttable/antd",
  "@adapttable/base-ui",
  "@adapttable/chakra",
  "@adapttable/cli",
  "@adapttable/core",
  "@adapttable/i18n",
  "@adapttable/mantine",
  "@adapttable/mui",
  "@adapttable/radix",
  "@adapttable/react",
  "@adapttable/server",
  "@adapttable/shadcn",
  "@adapttable/unstyled",
];

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function packageManifests() {
  return listPackages().map(({ dir }) => join(dir, "package.json"));
}

describe("supported Node contract", () => {
  it("declares one floor in the repo and every package", () => {
    const manifests = [join(ROOT, "package.json"), ...packageManifests()];
    assert.equal(manifests.length, 17);
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

  it("derives the packed set from non-private manifests, not a count", () => {
    const names = publishedPackageNames();
    assert.deepEqual(names, PUBLISHED_SNAPSHOT);
    assert.equal(names.length, 15);
    assert.ok(!names.includes("@adapttable/bootstrap"));
  });

  it("fails a planted missing package with the name involved", () => {
    const packed = PUBLISHED_SNAPSHOT.filter(
      (name) => name !== "@adapttable/ai"
    );
    assert.throws(
      () => assertPackedMatchesExpected(packed, publishedPackageNames()),
      /missing published package\(s\): @adapttable\/ai/
    );
  });

  it("fails a planted extra package with the name involved", () => {
    const packed = [...PUBLISHED_SNAPSHOT, "@adapttable/bootstrap"];
    assert.throws(
      () => assertPackedMatchesExpected(packed, publishedPackageNames()),
      /unexpected packed package\(s\): @adapttable\/bootstrap/
    );
  });

  it("does not treat the packed manifest as the source of expectation", () => {
    const packedOnly = ["@adapttable/core", "@adapttable/unstyled"];
    assert.doesNotThrow(() =>
      assertPackedMatchesExpected(packedOnly, packedOnly)
    );
    assert.throws(
      () => assertPackedMatchesExpected(packedOnly, publishedPackageNames()),
      /missing published package\(s\): @adapttable\/ai/
    );
  });

  it("probes every published root plus retained core subpaths", () => {
    const names = publishedPackageNames();
    const routes = probeRoutes(names);
    for (const name of names) {
      assert.ok(routes.includes(name), name);
    }
    for (const extra of EXTRA_PROBE_ROUTES) {
      assert.ok(routes.includes(extra), extra);
    }
    assert.ok(routes.includes("@adapttable/react"));
    assert.ok(
      ["@adapttable/antd", "@adapttable/mui", "@adapttable/shadcn"].every(
        (name) => routes.includes(name)
      )
    );
  });

  it("pins published @adapttable runtime deps to exact versions", () => {
    const exact = /^\d+\.\d+\.\d+$/;
    for (const path of packageManifests()) {
      const pkg = json(path);
      if (pkg.publishConfig?.access !== "public") continue;
      for (const [name, range] of Object.entries(pkg.dependencies ?? {})) {
        if (!name.startsWith("@adapttable/")) continue;
        assert.match(
          range,
          exact,
          `${pkg.name} dependency ${name} must be exact, got ${range}`
        );
      }
    }
  });

  it("installs kit peers so every adapter root can load", () => {
    const deps = kitLoadDependencies(publishedPackages());
    assert.ok(deps["@mui/material"]);
    assert.ok(deps["@emotion/react"]);
    assert.ok(deps.antd);
    assert.equal(deps.react, undefined);
    assert.equal(deps["@adapttable/core"], undefined);
  });
});
