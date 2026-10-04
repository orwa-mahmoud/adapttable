/**
 * The feature gap report: the subpaths a private kit still lacks against the
 * kit it is measured by, and what the feature-parity check says about its own
 * files, read from fixture kits built in a temporary directory.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkFeatureParity,
  featureGapReport,
} from "./check-feature-parity.mjs";

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  "check-feature-parity.mjs"
);
const temps = [];

after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

const KITS = [
  { name: "adapter-plain", framework: "react", role: "native" },
  { name: "adapter-verdant", framework: "angular", role: "private" },
];

const REFERENCES = { "adapter-verdant": "adapter-plain" };

const MANIFEST = {
  features: {
    filters: { id: "filters", subpath: "filters" },
    filterTypes: { id: "filter-types", subpath: "filters" },
    tree: { id: "tree", subpath: "tree" },
  },
};

/** Write a package with a manifest exporting the given subpaths. */
function writePackage(root, group, name, subpaths, files = {}) {
  const dir = join(root, "packages", group, name);
  const exports = { ".": "./index.js", "./package.json": "./package.json" };
  for (const subpath of subpaths) exports[`./${subpath}`] = `./${subpath}.js`;
  const manifest = {
    name: `@adapttable/${name.replace(/^adapter-/, "")}`,
    private: true,
    exports,
  };
  for (const [relative, body] of Object.entries({
    "package.json": JSON.stringify(manifest),
    ...files,
  })) {
    mkdirSync(dirname(join(dir, relative)), { recursive: true });
    writeFileSync(join(dir, relative), body);
  }
}

/** Core, both bindings and both kits, with any Angular kit file replaced. */
function fixtureRoot({ subpaths = ["filters"], files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-feature-report-"));
  temps.push(root);
  writePackage(root, "shared", "core", []);
  writePackage(root, "react", "react", []);
  writePackage(root, "angular", "angular", []);
  writePackage(root, "react", "adapter-plain", ["filters", "tree", "preset"], {
    "src/DataTable.tsx":
      "export const Th = (leaf) => <th {...leaf.headerProps} />;\n",
  });
  writePackage(root, "angular", "adapter-verdant", subpaths, {
    "src/dataTable.ts":
      'import { injectDataTable } from "@adapttable/angular";\n',
    // A secondary entry reaches its primary entry by package name.
    "filters/ng-package.json": "{}\n",
    "filters/index.ts":
      'export { AdaptDataTable } from "@adapttable/verdant";\n',
    ...files,
  });
  return root;
}

const report = (root) =>
  featureGapReport({
    root,
    kits: KITS,
    references: REFERENCES,
    manifest: MANIFEST,
  });

const MISSING_HEADER =
  "@adapttable/verdant: never passes core's header-cell props to its header element";

describe("featureGapReport", () => {
  it("lists each subpath the reference exports and the kit does not, with its features", () => {
    assert.deepEqual(report(fixtureRoot()), [
      {
        kit: "adapter-verdant",
        reference: "adapter-plain",
        subpaths: [
          { subpath: "./preset", features: [] },
          { subpath: "./tree", features: ["tree"] },
        ],
        problems: [MISSING_HEADER],
      },
    ]);
  });

  it("stops listing a subpath once the kit exports it", () => {
    const [gap] = report(fixtureRoot({ subpaths: ["filters", "tree"] }));
    assert.deepEqual(gap.subpaths, [{ subpath: "./preset", features: [] }]);
  });

  it("reads a secondary entry, where another kit's import is a problem", () => {
    const [gap] = report(
      fixtureRoot({
        files: {
          "filters/index.ts":
            'export { DataTable } from "@adapttable/plain";\n',
        },
      })
    );
    assert.deepEqual(gap.problems, [
      "angular/adapter-verdant/filters/index.ts: imports sibling kit @adapttable/plain",
      MISSING_HEADER,
    ]);
  });

  it("holds an Angular root table to the features-barrel rule", () => {
    const [gap] = report(
      fixtureRoot({
        files: {
          "src/dataTable.ts": 'import * as features from "./features";\n',
        },
      })
    );
    assert.deepEqual(gap.problems, [
      "angular/adapter-verdant/src/dataTable.ts: root table imports the features aggregate barrel",
      MISSING_HEADER,
    ]);
  });
});

const ANGULAR_SOURCE_PATH = "src/components/desktopTable.ts";
const ANGULAR_TEMPLATE_PATH = "src/components/desktopTable.html";
const ANGULAR_HEADER_SOURCE = `@Component({
  templateUrl: "./desktopTable.html",
})
export class AdaptDesktopTable {
  protected readonly headerCells = computed(() => {
    const view = this.view();
    const panel = view.groupingPanel?.().state;
    const cells = new Map<string, Attrs>();
    view.table.columns().forEach((column, index) => {
      const base = view.grid
        ? view.grid.headerCellAttrs(column, index)
        : view.table.headerCellAttrs(column);
      cells.set(
        column.key,
        panel === undefined || column.groupable === false
          ? base
          : { ...base, ...panel.headerDragProps(column.key) }
      );
    });
    return cells;
  });
}
`;
const ANGULAR_HEADER_TEMPLATE = `<ng-template #leafHeader let-column>
  <th data-adapttable-part="header-cell"
    [adaptAttrs]="headerCells().get(column.key)!">
    <span [adaptHeader]="column"></span>
  </th>
</ng-template>
`;
const NATIVE_KITS = KITS.map((kit) => ({ ...kit, role: "native" }));

const parity = (root, kits = NATIVE_KITS) =>
  checkFeatureParity({ root, kits, manifest: MANIFEST });

/** The finished but unpublished Angular kit, with its real header assembly. */
const contractRoot = ({ files = {}, subpaths } = {}) =>
  fixtureRoot({
    subpaths: subpaths ?? ["filters", "tree", "preset"],
    files: {
      [ANGULAR_SOURCE_PATH]: ANGULAR_HEADER_SOURCE,
      [ANGULAR_TEMPLATE_PATH]: ANGULAR_HEADER_TEMPLATE,
      ...files,
    },
  });

const SHARED_HEADER_WRAPPER = `import { AdaptDesktopTableModel as SharedModel } from "@adapttable/angular";
@Component({ templateUrl: "./desktopTable.html" })
export class AdaptDesktopTable extends SharedModel {}`;

function inheritedHeaderRoot({
  wrapper = SHARED_HEADER_WRAPPER,
  base = ANGULAR_HEADER_SOURCE,
  template = ANGULAR_HEADER_TEMPLATE,
} = {}) {
  const root = contractRoot({
    files: {
      [ANGULAR_SOURCE_PATH]: wrapper,
      [ANGULAR_TEMPLATE_PATH]: template,
    },
  });
  writePackage(root, "angular", "angular", [], {
    "src/index.ts":
      'export { AdaptDesktopTableModel } from "./layout/desktopTableModel";',
    "src/layout/desktopTableModel.ts": base.replace(
      "class AdaptDesktopTable",
      "class AdaptDesktopTableModel"
    ),
  });
  return root;
}

describe("inherited Angular header contracts", () => {
  it("follows an aliased binding base and verifies the native template", () => {
    assert.deepEqual(parity(inheritedHeaderRoot()).problems, []);
  });
  for (const [name, options] of [
    [
      "an unused model import",
      { wrapper: SHARED_HEADER_WRAPPER.replace(" extends SharedModel", "") },
    ],
    [
      "a local override dropping the inherited attrs",
      {
        wrapper: SHARED_HEADER_WRAPPER.replace(
          "{}",
          "{ headerCells = computed(() => new Map()); }"
        ),
      },
    ],
    [
      "a base copying attrs by name",
      {
        base: ANGULAR_HEADER_SOURCE.replace(
          "view.table.headerCellAttrs(column)",
          '{ scope: view.table.headerCellAttrs(column)["scope"] }'
        ),
      },
    ],
    [
      "a template copying attrs by name",
      {
        template: '<th [attr.role]="headerCells().get(column.key).role"></th>',
      },
    ],
    [
      "an unexported base",
      { base: ANGULAR_HEADER_SOURCE.replace("export class", "class") },
    ],
  ]) {
    it(`rejects ${name}`, () => {
      assert.deepEqual(parity(inheritedHeaderRoot(options)).problems, [
        MISSING_HEADER,
      ]);
    });
  }
});

describe("Angular feature contracts before publication", () => {
  it("accepts a private native kit preserving grid and table attrs through its paired template", () => {
    assert.deepEqual(parity(contractRoot()), {
      problems: [],
      kits: 2,
      subpaths: 3,
    });
  });

  it("checks every feature export of an unpublished native kit", () => {
    assert.deepEqual(parity(contractRoot({ subpaths: ["preset"] })), {
      problems: [
        "@adapttable/verdant: missing export ./filters",
        "@adapttable/verdant: missing export ./tree",
      ],
      kits: 2,
      subpaths: 3,
    });
  });

  it("leaves an unfinished role-private kit outside feature contracts", () => {
    assert.deepEqual(parity(fixtureRoot(), KITS), {
      problems: [],
      kits: 1,
      subpaths: 3,
    });
  });

  it("accepts a direct whole-object Angular header binding", () => {
    const root = contractRoot({
      files: {
        [ANGULAR_SOURCE_PATH]: "export {};\n",
        [ANGULAR_TEMPLATE_PATH]: '<th [adaptAttrs]="leaf.headerProps"></th>',
      },
    });
    assert.deepEqual(parity(root).problems, []);
  });

  for (const [name, before, after] of [
    [
      "grid attrs copied by name",
      "view.grid.headerCellAttrs(column, index)",
      '{ role: view.grid.headerCellAttrs(column, index)["role"] }',
    ],
    [
      "table attrs copied by name",
      "view.table.headerCellAttrs(column)",
      '{ scope: view.table.headerCellAttrs(column)["scope"] }',
    ],
    [
      "table attrs omitted from grouped headers",
      "{ ...base, ...panel.headerDragProps(column.key) }",
      "{ ...panel.headerDragProps(column.key) }",
    ],
    [
      "ungrouped headers copying named fields",
      "? base",
      '? { role: base["role"] }',
    ],
    [
      "a component pointing at a different template",
      "./desktopTable.html",
      "./unboundHeader.html",
    ],
  ]) {
    it(`rejects ${name}`, () => {
      const root = contractRoot({
        files: {
          [ANGULAR_SOURCE_PATH]: ANGULAR_HEADER_SOURCE.replace(before, after),
        },
      });
      assert.deepEqual(parity(root).problems, [MISSING_HEADER]);
    });
  }

  for (const [name, template] of [
    [
      "named fields from the merged record",
      "<th [attr.role]=\"headerCells().get(column.key)!['role']\"></th>",
    ],
    ["an unused getter", '<th data-adapttable-part="header-cell"></th>'],
    [
      "a whole binding on a span instead of its header cell",
      '<th><span [adaptAttrs]="headerCells().get(column.key)!"></span></th>',
    ],
    [
      "a commented-out whole binding",
      `<!-- ${ANGULAR_HEADER_TEMPLATE} -->\n<th></th>`,
    ],
  ]) {
    it(`rejects ${name}`, () => {
      assert.deepEqual(
        parity(contractRoot({ files: { [ANGULAR_TEMPLATE_PATH]: template } }))
          .problems,
        [MISSING_HEADER]
      );
    });
  }

  it("does not count an unused assembly in a different component", () => {
    const root = contractRoot({
      files: {
        [ANGULAR_SOURCE_PATH]: "export {};\n",
        "src/components/unusedHeader.ts": ANGULAR_HEADER_SOURCE,
      },
    });
    assert.deepEqual(parity(root).problems, [MISSING_HEADER]);
  });

  it("holds an unpublished shell kit to the same header and subpath rules", () => {
    const root = contractRoot({
      subpaths: ["preset"],
      files: { [ANGULAR_TEMPLATE_PATH]: "<th></th>" },
    });
    const kits = NATIVE_KITS.map((kit) =>
      kit.framework === "angular" ? { ...kit, role: "shell" } : kit
    );
    assert.deepEqual(parity(root, kits).problems, [
      "@adapttable/verdant: missing export ./filters",
      "@adapttable/verdant: missing export ./tree",
      MISSING_HEADER,
    ]);
  });
});

describe("check-feature-parity --report", () => {
  it("prints no private-kit report after both Angular kits join the contracts", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "--report"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  });
});
