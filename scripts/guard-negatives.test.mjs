/**
 * Prove the repository's own guards still fail when they should.
 *
 * A guard can stay green while verifying nothing. One that derives a
 * package's files from a subpath NAME rather than its exports map silently
 * skips a module whose filename differs from its subpath; one that reads `dist`
 * from a stage scheduled before the build audits the previous build's output.
 * That decay is invisible in a green run, because a guard that reads nothing
 * reports nothing wrong.
 *
 * So each guard here is aimed at a broken fixture and must reject it. The
 * fixtures are built in a temporary directory and removed afterwards — never a
 * defect planted in the working repository, which would be a real defect for as
 * long as the test took to run and a lie if it crashed halfway.
 *
 * `bundle-budget.mjs` already works this way (`provePlantedLeak`); this is that
 * pattern applied to the guards below.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkContract } from "./api-contract.mjs";
import { entrypoints } from "./api-entrypoints.mjs";
import { entriesOf } from "./check-doc-surface.mjs";
import { checkFeatureParity } from "./check-feature-parity.mjs";
import { checkPartsParity } from "./check-parts-parity.mjs";
import { kitRegistryErrors } from "./kits.mjs";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const temps = [];

/** A throwaway repository root. Removed when this file finishes. */
function tempRoot() {
  const dir = mkdtempSync(join(tmpdir(), "adapttable-guard-"));
  temps.push(dir);
  return dir;
}

/** Write one fixture package with the manifest it is given. */
function fixturePackage(root, name, manifest, files = {}, group = "shared") {
  const dir = join(root, "packages", group, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify(manifest, null, 2));
  for (const [relative, body] of Object.entries(files)) {
    const target = join(dir, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
  return dir;
}

after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe("check-doc-surface reads the exports map, not the subpath name", () => {
  it("finds a module whose filename differs from the subpath that exports it", () => {
    // The subpath `./ag-ui` is served by `agui.ts`, not `ag-ui.ts`; a guard that
    // derives the filename from the subpath crashes before auditing anything.
    const root = tempRoot();
    fixturePackage(
      root,
      "ai",
      {
        name: "@adapttable/ai",
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
          "./ag-ui": { types: "./dist/agui.d.ts", import: "./dist/agui.js" },
        },
      },
      { "src/index.ts": "export {};\n", "src/agui.ts": "export {};\n" }
    );

    const entries = entriesOf("ai", root);
    const agui = entries.find((entry) => entry.label === "ai/ag-ui");

    assert.ok(agui, "the ./ag-ui subpath was dropped entirely");
    // Named from the target the manifest gives, never from the key.
    assert.match(agui.entry, /ai[/\\]src[/\\]agui\.ts$/);
    assert.doesNotMatch(agui.entry, /ag-ui/);
  });

  it("does not quietly skip a subpath whose source is missing", () => {
    // A guard that resolves to a path nothing wrote must still name the entry.
    // Reporting nothing here is how it stayed green over a package it could
    // not read.
    const root = tempRoot();
    fixturePackage(
      root,
      "ai",
      {
        name: "@adapttable/ai",
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
          "./gone": { types: "./dist/gone.d.ts", import: "./dist/gone.js" },
        },
      },
      { "src/index.ts": "export {};\n" }
    );

    const labels = entriesOf("ai", root).map((entry) => entry.label);
    assert.deepEqual(labels.sort(), ["ai", "ai/gone"]);
  });
});

describe("check-doc-surface still runs as the command", () => {
  it("audits when invoked, rather than importing to nothing", () => {
    // `main()` is now behind an `import.meta.url === argv[1]` guard so a test
    // can import `entriesOf` without running the whole audit. That guard is
    // itself the failure mode this file exists for: if the comparison ever
    // stops matching, `pnpm check:docsurface` does nothing and says nothing.
    const result = spawnSync(
      process.execPath,
      [join(SCRIPTS, "check-doc-surface.mjs"), "--report"],
      { cwd: join(SCRIPTS, ".."), encoding: "utf8" }
    );

    assert.match(
      `${result.stdout}${result.stderr}`,
      /exports/,
      "the command produced no audit — the main guard no longer matches"
    );
  });
});

describe("api-entrypoints derives from each manifest", () => {
  it("covers a subpath no naming convention would have guessed", () => {
    const root = tempRoot();
    fixturePackage(root, "ai", {
      name: "@adapttable/ai",
      exports: {
        ".": { types: "./dist/index.d.ts" },
        "./ag-ui": { types: "./dist/agui.d.ts" },
      },
    });

    const entries = entrypoints(root);
    const agui = entries.find((entry) => entry.subpath === "./ag-ui");

    assert.ok(agui, "the ./ag-ui entry point was not derived");
    // One report per subpath, and the entry follows the manifest's own types
    // target rather than a path built from the key.
    assert.equal(agui.report, "ai-ag-ui.api.md");
    assert.match(agui.entry, /dist[/\\]agui\.d\.ts$/);
  });

  it("marks a private package unpublished instead of dropping it", () => {
    const root = tempRoot();
    fixturePackage(root, "bootstrap", {
      name: "@adapttable/bootstrap",
      private: true,
      exports: { ".": { types: "./dist/index.d.ts" } },
    });

    const entries = entrypoints(root);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].published, false);
  });
});

describe("smoke-dist fails on what it cannot read", () => {
  const run = (cwd) =>
    spawnSync(process.execPath, [join(SCRIPTS, "smoke-dist.mjs")], {
      cwd,
      encoding: "utf8",
    });

  it("rejects an exports target the build never emitted", () => {
    // The failure it exists to catch: a path in the manifest with no file
    // behind it. Packing that ships a package nobody can import.
    const root = tempRoot();
    fixturePackage(
      root,
      "core",
      {
        name: "@adapttable/core",
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        },
      },
      { "dist/index.d.ts": "export {};\n" }
    );

    const result = run(root);
    assert.notEqual(
      result.status,
      0,
      "a missing exports target was reported as clean"
    );
    assert.match(`${result.stdout}${result.stderr}`, /index\.js/);
  });

  it("names an absent dist rather than passing over it", () => {
    // Stale or absent input is the failure mode that hides in a green run: a
    // guard with nothing to read reports nothing wrong. It must say so.
    const root = tempRoot();
    fixturePackage(root, "core", {
      name: "@adapttable/core",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
      },
    });

    const result = run(root);
    assert.notEqual(result.status, 0, "an unbuilt package was reported clean");
  });
});

/*
 * Fixture kits for the kit guards: one React shell, one Vue shell read from a
 * single-file component, one Angular shell read from a component template and a
 * `host` binding, and a React native kit. Each guard must accept the set as
 * written and reject it once a part, a feature export or a surface goes
 * missing — in the non-React kits as much as in the React one.
 */

/** A framework binding or the engine: a manifest and one source file. */
function fixtureLayer(root, group, name, source = "export {};\n") {
  fixturePackage(
    root,
    name,
    { name: `@adapttable/${name}` },
    { "src/index.ts": source },
    group
  );
}

/** A kit package exporting the root entry and the given subpaths. */
function fixtureKit(root, framework, name, files, subpaths = []) {
  const exports = { ".": { types: "./dist/index.d.ts" } };
  for (const subpath of subpaths) {
    exports[`./${subpath}`] = { types: `./dist/${subpath}.d.ts` };
  }
  fixturePackage(
    root,
    name,
    { name: `@adapttable/${name.replace(/^adapter-/, "")}`, exports },
    files,
    framework
  );
}

const PARTS_KITS = [
  { name: "adapter-alpha", framework: "react", role: "shell" },
  { name: "adapter-verdant", framework: "vue", role: "shell" },
  { name: "adapter-meridian", framework: "angular", role: "shell" },
  { name: "adapter-plain", framework: "react", role: "native" },
];

const VERDANT_TEMPLATE = `<template>
  <table data-adapttable-part="table">
    <tr :data-adapttable-part="'row'">
      <td v-bind="{ 'data-adapttable-part': 'cell' }" />
    </tr>
    <div v-bind:data-adapttable-part="'bulk-bar'" />
  </table>
</template>
`;

const MERIDIAN_TEMPLATE = `<table data-adapttable-part="table">
  <tr [attr.data-adapttable-part]="'row'">
    <td [attr.data-adapttable-part]="'cell'"></td>
  </tr>
</table>
`;

const MERIDIAN_COMPONENT = `@Component({
  selector: "at-bulk-bar",
  host: { "[attr.data-adapttable-part]": "'bulk-bar'" },
  template: "",
})
export class BulkBar {}
`;

/** A React kit whose row comes from the binding's getter. */
const reactTable = (
  extra = ""
) => `import { getRowProps } from "@adapttable/react";

export const DataTable = () => (
  <table data-adapttable-part="table">
    <tr {...getRowProps()}>
      <td data-adapttable-part="cell" />
    </tr>
    <div data-adapttable-part="bulk-bar" />${extra}
  </table>
);
`;

/** The four kits, their bindings and core, with any file replaced. */
function partsRoot(replace = {}) {
  const root = tempRoot();
  fixtureLayer(
    root,
    "shared",
    "core",
    'export const CHROME_PARTS = {\n  announcer: "live-region",\n};\n'
  );
  fixtureLayer(
    root,
    "react",
    "react",
    'export const getRowProps = () => ({ "data-adapttable-part": "row" });\n'
  );
  fixtureLayer(root, "vue", "vue");
  fixtureLayer(root, "angular", "angular");
  const files = {
    "adapter-alpha": { "src/DataTable.tsx": reactTable() },
    "adapter-verdant": {
      "src/DataTable.vue": VERDANT_TEMPLATE,
      // A test's markup is not the kit's: a name here is never an emitted part.
      "src/DataTable.spec.ts": '<div data-adapttable-part="from-a-test" />\n',
    },
    "adapter-meridian": {
      "src/data-table.component.html": MERIDIAN_TEMPLATE,
      "src/bulk-bar.component.ts": MERIDIAN_COMPONENT,
    },
    "adapter-plain": {
      "src/DataTable.tsx": reactTable(
        '\n    <span data-adapttable-part="plain-spinner" />'
      ),
    },
  };
  for (const kit of PARTS_KITS) {
    fixtureKit(root, kit.framework, kit.name, {
      ...files[kit.name],
      ...replace[kit.name],
    });
  }
  return root;
}

/** The parts check over the fixture, with its own contract and lists. */
const partsParity = (root, over = {}) =>
  checkPartsParity({
    root,
    kits: PARTS_KITS,
    contract: ["table", "row", "cell"],
    expectedGaps: {},
    getterParts: { react: { row: ["getRowProps"] } },
    fallbackOnly: { spinner: ["plain-spinner"] },
    unnamedInKits: {},
    ...over,
  });

describe("check-parts-parity reads each kit in its own framework", () => {
  it("accepts React, Vue and Angular kits that name the same parts", () => {
    // The Vue kit names `row` only through a template binding and the Angular
    // kit only through `[attr.…]` — neither framework has a getter route, so a
    // scanner blind to templates fails both on the contract.
    const { failures, summary } = partsParity(partsRoot());
    assert.deepEqual(failures, []);
    assert.equal(
      summary,
      "parts-parity: the 3 contract parts hold in 4 kits; 4 part names agree " +
        "across 3 adapters; 2 more come from core's chrome; 0 structural " +
        "parts are still unnamed outside adapter-plain."
    );
  });

  it("rejects a Vue template that drops a part the other kits name", () => {
    const template = VERDANT_TEMPLATE.replace(
      `    <div v-bind:data-adapttable-part="'bulk-bar'" />\n`,
      ""
    );
    const { failures } = partsParity(
      partsRoot({ "adapter-verdant": { "src/DataTable.vue": template } })
    );
    assert.equal(failures.length, 1);
    assert.match(failures[0].headline, /rendered by some adapters and not/);
    assert.deepEqual(failures[0].lines, [
      "bulk-bar — missing from adapter-verdant",
    ]);
  });

  it("rejects a Vue kit missing a contract part, with no getter to fall back on", () => {
    const template = VERDANT_TEMPLATE.replace(
      `:data-adapttable-part="'row'"`,
      ""
    );
    const { failures } = partsParity(
      partsRoot({ "adapter-verdant": { "src/DataTable.vue": template } })
    );
    assert.match(failures[0].headline, /structural contract part/);
    assert.deepEqual(failures[0].lines, ["row — adapter-verdant: not named"]);
  });

  it("rejects an Angular kit whose host binding is gone", () => {
    const { failures } = partsParity(
      partsRoot({
        "adapter-meridian": {
          "src/bulk-bar.component.ts": MERIDIAN_COMPONENT.replace(
            `  host: { "[attr.data-adapttable-part]": "'bulk-bar'" },\n`,
            ""
          ),
        },
      })
    );
    assert.deepEqual(failures[0].lines, [
      "bulk-bar — missing from adapter-meridian",
    ]);
  });

  it("rejects a native-only part nobody accounted for", () => {
    const { failures } = partsParity(partsRoot(), { fallbackOnly: {} });
    assert.equal(
      failures[0].headline,
      "1 part(s) are emitted by adapter-plain alone:"
    );
    assert.deepEqual(failures[0].lines, ["plain-spinner"]);
  });

  it("rejects a kit package the registry does not list", () => {
    const root = partsRoot();
    fixtureKit(root, "vue", "adapter-stray", {
      "src/DataTable.vue": "<template><table /></template>\n",
    });
    const { failures } = partsParity(root);
    assert.match(failures[0].headline, /kit registry problem/);
    assert.deepEqual(failures[0].lines, [
      'packages/vue/adapter-stray: a kit package that scripts/kits.mjs does not register under "vue"',
    ]);
  });
});

describe("the kit registry holds to the packages on disk", () => {
  it("names a kit filed under the wrong framework and a missing binding", () => {
    const root = tempRoot();
    fixtureLayer(root, "react", "react");
    fixtureKit(root, "vue", "adapter-verdant", {});
    const errors = kitRegistryErrors(root, [
      { name: "adapter-verdant", framework: "react", role: "shell" },
    ]);
    assert.deepEqual(errors, [
      "adapter-verdant: no package at packages/react/adapter-verdant",
      'packages/vue/adapter-verdant: a kit package that scripts/kits.mjs does not register under "vue"',
    ]);

    const vue = kitRegistryErrors(root, [
      { name: "adapter-verdant", framework: "vue", role: "shell" },
    ]);
    assert.deepEqual(vue, [
      "vue: kits are built on it but its binding packages/vue/vue is missing",
    ]);
  });

  it("holds the private role to the package manifest", () => {
    const root = tempRoot();
    fixtureLayer(root, "react", "react");
    fixtureKit(root, "react", "adapter-alpha", {});
    assert.deepEqual(
      kitRegistryErrors(root, [
        { name: "adapter-alpha", framework: "react", role: "private" },
      ]),
      ['adapter-alpha: role "private" but package.json is published']
    );
  });
});

const FEATURE_KITS = [
  { name: "adapter-alpha", framework: "react", role: "shell" },
  { name: "adapter-verdant", framework: "vue", role: "shell" },
  { name: "adapter-plain", framework: "react", role: "native" },
  {
    name: "adapter-tint",
    framework: "react",
    role: "derived",
    base: "adapter-plain",
  },
];

const FEATURE_MANIFEST = { features: { filters: { subpath: "filters" } } };

const REACT_HEADER = `import { useDataTable } from "@adapttable/react";
import { createTable } from "@adapttable/core";

export const Head = ({ leaf }) => <th {...leaf.headerProps} />;
`;

const verdantComponent = ({
  header = `<th v-bind="leaf.headerProps"></th>`,
  imports = "",
} = {}) => `<!-- Another kit reads: import { DataTable } from "@adapttable/alpha"; -->
<template>
  <a href="https://example.com/docs">docs</a>
  ${header}
</template>
<script setup lang="ts">
// A reader of another kit writes: import { DataTable } from "@adapttable/alpha";
import { useDataTable } from "@adapttable/vue";
import { createTable } from "@adapttable/core";
${imports}</script>
`;

/** The feature-parity fixture, with any kit's files or subpaths replaced. */
function featureRoot({ files = {}, subpaths = {}, extra = [] } = {}) {
  const root = tempRoot();
  fixtureLayer(root, "shared", "core");
  fixtureLayer(root, "react", "react");
  fixtureLayer(root, "vue", "vue");
  const defaults = {
    "adapter-alpha": { "src/DataTable.tsx": REACT_HEADER },
    "adapter-verdant": { "src/DataTable.vue": verdantComponent() },
    "adapter-plain": { "src/DataTable.tsx": REACT_HEADER },
    "adapter-tint": {
      "src/DataTable.tsx": 'export { DataTable } from "@adapttable/plain";\n',
    },
  };
  for (const kit of [...FEATURE_KITS, ...extra]) {
    fixtureKit(
      root,
      kit.framework,
      kit.name,
      files[kit.name] ?? defaults[kit.name] ?? {},
      subpaths[kit.name] ?? ["filters", "preset"]
    );
  }
  return root;
}

const featureParity = (root, kits = FEATURE_KITS) =>
  checkFeatureParity({ root, kits, manifest: FEATURE_MANIFEST });

describe("check-feature-parity reads each kit in its own framework", () => {
  it("accepts a Vue kit that binds header props whole and imports its own layers", () => {
    // The commented imports of a sibling kit — an HTML comment and a script
    // comment — are examples, not imports, and must not count.
    assert.deepEqual(featureParity(featureRoot()), {
      problems: [],
      kits: 4,
      subpaths: 2,
    });
  });

  it("rejects a Vue kit missing a feature export", () => {
    const { problems } = featureParity(
      featureRoot({ subpaths: { "adapter-verdant": ["preset"] } })
    );
    assert.deepEqual(problems, [
      "@adapttable/verdant: missing export ./filters",
    ]);
  });

  it("rejects a Vue kit whose script imports a sibling kit", () => {
    const { problems } = featureParity(
      featureRoot({
        files: {
          "adapter-verdant": {
            "src/DataTable.vue": verdantComponent({
              imports: 'import { DataTable } from "@adapttable/alpha";\n',
            }),
          },
        },
      })
    );
    assert.deepEqual(problems, [
      "vue/adapter-verdant/src/DataTable.vue: imports sibling kit @adapttable/alpha",
    ]);
  });

  it("rejects a Vue root table that imports the features barrel", () => {
    const { problems } = featureParity(
      featureRoot({
        files: {
          "adapter-verdant": {
            "src/DataTable.vue": verdantComponent({
              imports: 'import * as features from "./features";\n',
            }),
          },
        },
      })
    );
    assert.deepEqual(problems, [
      "vue/adapter-verdant/src/DataTable.vue: root table imports the features aggregate barrel",
    ]);
  });

  it("rejects a Vue template that reads header props by name", () => {
    const { problems } = featureParity(
      featureRoot({
        files: {
          "adapter-verdant": {
            "src/DataTable.vue": verdantComponent({
              header: `<th :role="leaf.headerProps['role']"></th>`,
            }),
          },
        },
      })
    );
    assert.deepEqual(problems, [
      "vue/adapter-verdant/src/DataTable.vue: reads named fields off leaf.headerProps without spreading it",
      "@adapttable/verdant: never passes core's header-cell props to its header element",
    ]);
  });

  it("names a framework that has no header rule instead of passing its kit", () => {
    const meridian = {
      name: "adapter-meridian",
      framework: "angular",
      role: "shell",
    };
    const root = featureRoot({
      files: {
        "adapter-meridian": {
          "src/data-table.component.html":
            '<th [attr.role]="leaf.headerProps.role"></th>\n',
        },
      },
      extra: [meridian],
    });
    fixtureLayer(root, "angular", "angular");
    const { problems } = featureParity(root, [...FEATURE_KITS, meridian]);
    assert.deepEqual(problems, [
      "@adapttable/meridian: no header-props rule for angular in scripts/check-feature-parity.mjs",
    ]);
  });
});

describe("the API contract describes a binding's packages as data", () => {
  const REPORTS = {
    "core.api.md": "// @public\nexport declare function createTable(): void;\n",
    "adapter-verdant.api.md":
      "// @public\nexport declare const DataTable: unknown;\n",
  };

  /** Core under `shared` and a Vue kit under `vue`, both with a root entry. */
  function contractRoot() {
    const root = tempRoot();
    fixturePackage(root, "core", {
      name: "@adapttable/core",
      exports: { ".": { types: "./dist/index.d.ts" } },
    });
    fixtureKit(root, "vue", "adapter-verdant", {});
    return root;
  }

  const manifest = () => ({
    frameworks: { neutral: ["core"], vue: ["adapter-verdant"] },
    surfaces: { core: ["createTable"], "adapter-verdant": ["DataTable"] },
    entrypoints: {
      "core.api.md": { surface: "core" },
      "adapter-verdant.api.md": { surface: "adapter-verdant" },
    },
  });

  const check = (contract) =>
    checkContract({
      manifest: contract,
      entrypoints: entrypoints(contractRoot()),
      reports: REPORTS,
    });

  it("accepts a Vue kit's surface filed under vue", () => {
    assert.deepEqual(check(manifest()), []);
  });

  it("rejects a Vue kit whose surface is missing from the contract", () => {
    const contract = manifest();
    delete contract.surfaces["adapter-verdant"];
    delete contract.entrypoints["adapter-verdant.api.md"];
    contract.frameworks.vue = [];
    assert.deepEqual(check(contract), [
      '"adapter-verdant.api.md" is a published typed entry point with no policy',
    ]);
  });

  it("rejects a Vue kit's surface filed under another framework", () => {
    const contract = manifest();
    contract.frameworks = { neutral: ["core", "adapter-verdant"] };
    assert.deepEqual(check(contract), [
      '"adapter-verdant.api.md" is a vue entry point but names surface "adapter-verdant", which is filed under neutral',
    ]);
  });

  it("rejects a contracted symbol the Vue kit no longer exports", () => {
    const contract = manifest();
    contract.surfaces["adapter-verdant"].push("useVerdant");
    assert.equal(check(contract).length, 1);
    assert.match(check(contract)[0], /no longer classifies.*useVerdant/);
  });
});

describe("the kit guards still run as commands", () => {
  // Both are behind an `import.meta.url === argv[1]` guard so a test can call
  // them over fixtures; if that comparison stops matching, the gate step runs
  // nothing and says nothing.
  for (const [script, audit] of [
    ["check-parts-parity.mjs", /parts-parity: |part\(s\)|kit registry/],
    ["check-feature-parity.mjs", /feature parity: /],
  ]) {
    it(`${script} audits when invoked`, () => {
      const result = spawnSync(process.execPath, [join(SCRIPTS, script)], {
        cwd: join(SCRIPTS, ".."),
        encoding: "utf8",
      });
      assert.match(`${result.stdout}${result.stderr}`, audit);
    });
  }
});
