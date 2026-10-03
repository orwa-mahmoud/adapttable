import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import {
  assertPackedMatchesExpected,
  EXTRA_PROBE_ROUTES,
  kitLoadDependencies,
  packagesForRuntime,
  probePrelude,
  probeRoutes,
  publishedPackageNames,
  publishedPackages,
  supportsAngular22,
} from "./node-support-harness.mjs";
import { listPackages, REPO_ROOT as ROOT } from "./packages.mjs";

const FLOOR = ">=22.12.0";
const ANGULAR_22_FLOOR = "^22.22.3 || ^24.15.0 || >=26.0.0";
const ANGULAR_22_KITS = new Set([
  "@adapttable/angular-aria",
  "@adapttable/angular-cdk",
  "@adapttable/angular-material",
  "@adapttable/ng-bootstrap",
  "@adapttable/ng-zorro",
  "@adapttable/ngx-bootstrap",
  "@adapttable/spartan",
  "@adapttable/taiga-ui",
]);
const README_CLAIM =
  "Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.";
const PUBLISHED_SNAPSHOT = [
  "@adapttable/ai",
  "@adapttable/ai-angular",
  "@adapttable/ai-react",
  "@adapttable/angular",
  "@adapttable/angular-aria",
  "@adapttable/angular-cdk",
  "@adapttable/angular-material",
  "@adapttable/angular-unstyled",
  "@adapttable/antd",
  "@adapttable/base-ui",
  "@adapttable/chakra",
  "@adapttable/cli",
  "@adapttable/core",
  "@adapttable/i18n",
  "@adapttable/mantine",
  "@adapttable/mui",
  "@adapttable/ng-bootstrap",
  "@adapttable/ng-zorro",
  "@adapttable/ngx-bootstrap",
  "@adapttable/radix",
  "@adapttable/react",
  "@adapttable/server",
  "@adapttable/shadcn",
  "@adapttable/spartan",
  "@adapttable/taiga-ui",
  "@adapttable/unstyled",
];

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function packageManifests() {
  return listPackages().map(({ dir }) => join(dir, "package.json"));
}

describe("supported Node contract", () => {
  it("declares the baseline floor and every Angular 22 native kit floor", () => {
    const manifests = [join(ROOT, "package.json"), ...packageManifests()];
    assert.equal(manifests.length, 29);
    for (const manifest of manifests) {
      const pkg = json(manifest);
      const floor = ANGULAR_22_KITS.has(pkg.name) ? ANGULAR_22_FLOOR : FLOOR;
      assert.equal(pkg.engines?.node, floor, manifest);
    }
  });

  it("states the floor in every published package README", () => {
    for (const manifest of packageManifests()) {
      const pkg = json(manifest);
      if (pkg.private) continue;
      const readme = readFileSync(join(dirname(manifest), "README.md"), "utf8");
      const claim = ANGULAR_22_KITS.has(pkg.name)
        ? "Requires Node.js **22.22.3+ on Node 22, 24.15.0+ on Node 24, or Node 26+**"
        : README_CLAIM;
      assert.ok(readme.includes(claim), pkg.name);
    }
  });

  it("runs packed consumers on the floor and Active LTS", () => {
    const workflow = readFileSync(
      join(ROOT, ".github/workflows/pr.yml"),
      "utf8"
    );
    assert.ok(workflow.includes('node: ["22.12.0", "22.22.3", "24"]'));
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
    assert.equal(names.length, 26);
    assert.ok(!names.includes("@adapttable/bootstrap"));
    assert.ok(!names.includes("@adapttable/primeng"));
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

  it("rejects each missing Angular 22 kit and each private kit in the packed set", () => {
    const expected = publishedPackageNames();
    for (const name of ANGULAR_22_KITS) {
      assert.throws(
        () =>
          assertPackedMatchesExpected(
            PUBLISHED_SNAPSHOT.filter((packed) => packed !== name),
            expected
          ),
        { message: `missing published package(s): ${name}` }
      );
    }
    for (const name of ["@adapttable/bootstrap", "@adapttable/primeng"]) {
      assert.throws(
        () =>
          assertPackedMatchesExpected([...PUBLISHED_SNAPSHOT, name], expected),
        { message: `unexpected packed package(s): ${name}` }
      );
    }
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
    const deps = kitLoadDependencies(publishedPackages(), "24.15.0");
    assert.ok(deps["@mui/material"]);
    assert.ok(deps["@emotion/react"]);
    assert.ok(deps.antd);
    assert.equal(deps.react, undefined);
    assert.equal(deps["@adapttable/core"], undefined);
  });

  it("installs and preloads the Angular compiler for the Angular binding", () => {
    const deps = kitLoadDependencies(publishedPackages(), "24.15.0");
    assert.equal(deps["@angular/compiler"], deps["@angular/core"]);
    assert.ok(deps.rxjs);
    assert.deepEqual(probePrelude(deps), ["@angular/compiler"]);
    assert.deepEqual(probePrelude({ antd: "^5.0.0" }), []);
  });
});

describe("Angular-aware packed runtime coverage", () => {
  it("honors Angular 22's exact Node version boundaries", () => {
    for (const version of [
      "22.12.0",
      "22.22.2",
      "23.0.0",
      "24.14.9",
      "25.0.0",
    ]) {
      assert.equal(supportsAngular22(version), false, version);
    }
    for (const version of [
      "22.22.3",
      "v22.22.3",
      "22.23.0",
      "24.15.0",
      "26.0.0",
    ]) {
      assert.equal(supportsAngular22(version), true, version);
    }
  });

  it("tests every package on Angular 22's floor and Node 24", () => {
    const packages = publishedPackages();
    assert.deepEqual(
      packages.map((entry) => entry.name).sort(),
      PUBLISHED_SNAPSHOT
    );
    for (const version of ["22.22.3", "24.15.0", "26.0.0"]) {
      assert.deepEqual(packagesForRuntime(packages, version), packages);
    }
  });

  it("keeps all baseline packages and Angular 20 on Node 22.12", () => {
    const packages = packagesForRuntime(publishedPackages(), "22.12.0");
    assert.deepEqual(
      packages.map((entry) => entry.name).sort(),
      PUBLISHED_SNAPSHOT.filter((name) => !ANGULAR_22_KITS.has(name))
    );
    const deps = kitLoadDependencies(packages, "22.12.0");
    assert.equal(deps["@angular/core"], "^20.0.0");
    assert.equal(deps["@angular/compiler"], "^20.0.0");
    assert.deepEqual(
      Object.keys(deps)
        .filter((name) => name.startsWith("@angular/"))
        .sort(),
      [
        "@angular/common",
        "@angular/compiler",
        "@angular/core",
        "@angular/router",
      ]
    );
    for (const name of [
      "ng-zorro-antd",
      "@ng-bootstrap/ng-bootstrap",
      "ngx-bootstrap",
      "@spartan-ng/brain",
      "@taiga-ui/core",
    ]) {
      assert.equal(deps[name], undefined, name);
    }
  });

  it("selects by declared engine range rather than package name", () => {
    const packages = [
      {
        name: "@adapttable/new-baseline",
        manifest: { engines: { node: FLOOR } },
      },
      {
        name: "@adapttable/new-angular-kit",
        manifest: { engines: { node: ANGULAR_22_FLOOR } },
      },
    ];
    for (const version of [
      "22.12.0",
      "22.22.2",
      "23.0.0",
      "24.14.9",
      "25.0.0",
    ]) {
      assert.deepEqual(
        packagesForRuntime(packages, version),
        [packages[0]],
        version
      );
    }
    for (const version of ["22.22.3", "24.15.0", "26.0.0"]) {
      assert.deepEqual(
        packagesForRuntime(packages, version),
        packages,
        version
      );
    }
    assert.deepEqual(packagesForRuntime(packages, "22.11.9"), []);
  });

  it("fails closed when a new Node engine range has no runtime coverage", () => {
    for (const range of [undefined, ">=22.0.0", ">=28.0.0"]) {
      assert.throws(
        () =>
          packagesForRuntime(
            [
              {
                name: "@adapttable/new-kit",
                manifest: { engines: { node: range } },
              },
            ],
            "24.15.0"
          ),
        {
          message: `@adapttable/new-kit has an untested Node engine range: ${range}`,
        }
      );
    }
  });

  it("rejects every Angular 22 kit on an incompatible runtime without relaxing its peers", () => {
    const kits = publishedPackages().filter((entry) =>
      ANGULAR_22_KITS.has(entry.name)
    );
    assert.deepEqual(
      kits.map((entry) => entry.name).sort(),
      [...ANGULAR_22_KITS].sort()
    );
    for (const kit of kits) {
      for (const version of ["22.12.0", "22.22.2", "24.14.9", "25.0.0"]) {
        assert.throws(() => kitLoadDependencies([kit], version), {
          message: `${kit.name} requires Node ${ANGULAR_22_FLOOR}; cannot probe on Node ${version}`,
        });
      }
      const deps = kitLoadDependencies([kit], "24.15.0");
      for (const [name, range] of Object.entries(
        kit.manifest.peerDependencies
      )) {
        if (name.startsWith("@angular/"))
          assert.equal(deps[name], range, `${kit.name}: ${name}`);
      }
    }
  });

  it("cannot hide an incompatible Angular peer behind a later compatible package", () => {
    const packages = [
      {
        name: "@adapttable/strict-kit",
        manifest: {
          engines: { node: FLOOR },
          peerDependencies: { "@angular/core": "^22.0.0" },
        },
      },
      {
        name: "@adapttable/flexible-kit",
        manifest: {
          engines: { node: FLOOR },
          peerDependencies: { "@angular/core": "^20.0.0 || ^22.0.0" },
        },
      },
    ];
    assert.throws(() => kitLoadDependencies(packages, "22.12.0"), {
      message:
        "@adapttable/strict-kit peer @angular/core@^22.0.0 cannot use Angular 20 on Node 22.12.0",
    });
  });
});
