/**
 * The parts gap report: what a private kit still lacks against the kit it is
 * measured by, read from fixture kits built in a temporary directory.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkPartsParity, partsGapReport } from "./check-parts-parity.mjs";

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  "check-parts-parity.mjs"
);
const temps = [];

after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

const KITS = [
  { name: "adapter-plain", framework: "react", role: "native" },
  { name: "adapter-verdant", framework: "angular", role: "private" },
  { name: "adapter-draft", framework: "angular", role: "private" },
];

const REFERENCES = { "adapter-verdant": "adapter-plain" };

/** The React reference: three parts of its own, one from its binding. */
const PLAIN = `export const DataTable = () => (
  <table data-adapttable-part="table">
    <tr {...getRowProps()}><td data-adapttable-part="cell" /></tr>
    <div data-adapttable-part="bulk-bar" />
  </table>
);
`;

/** The Angular kit: `table` in its root, `cell` from a secondary entry. */
const VERDANT = `<table data-adapttable-part="table">
  <tr><td [attr.data-adapttable-part]="'cell'"></td></tr>
</table>
`;

/** Write each file under the package folder, with a manifest. */
function writePackage(root, group, name, files) {
  const dir = join(root, "packages", group, name);
  const manifest = { name: `@adapttable/${name}`, private: true };
  for (const [relative, body] of Object.entries({
    "package.json": JSON.stringify(manifest),
    ...files,
  })) {
    mkdirSync(dirname(join(dir, relative)), { recursive: true });
    writeFileSync(join(dir, relative), body);
  }
}

/** Core, both bindings and the three kits, with any kit file replaced. */
function fixtureRoot(replace = {}) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-parts-report-"));
  temps.push(root);
  writePackage(root, "shared", "core", {
    "src/index.ts":
      'export const CHROME_PARTS = {\n  live: "live-region",\n};\n',
  });
  writePackage(root, "react", "react", {
    "src/index.ts":
      'export const getRowProps = () => ({ "data-adapttable-part": "row" });\n',
  });
  // The Angular binding names `row` itself, so no Angular kit lacks it.
  writePackage(root, "angular", "angular", {
    "src/row.ts": 'export const ROW = { "data-adapttable-part": "row" };\n',
  });
  const files = {
    "adapter-plain": { "src/DataTable.tsx": PLAIN },
    "adapter-verdant": {
      "src/data-table.component.html": VERDANT,
      "bulk/ng-package.json": "{}\n",
      "bulk/src/bulk.component.html": "<div></div>\n",
    },
    "adapter-draft": { "README.md": "No sources yet.\n" },
  };
  for (const kit of KITS) {
    writePackage(root, kit.framework, kit.name, {
      ...files[kit.name],
      ...replace[kit.name],
    });
  }
  return root;
}

const report = (root) =>
  partsGapReport({ root, kits: KITS, references: REFERENCES });

describe("partsGapReport", () => {
  it("lists the parts the reference renders and the private kit does not", () => {
    assert.deepEqual(report(fixtureRoot()), [
      {
        kit: "adapter-verdant",
        reference: "adapter-plain",
        missing: ["bulk-bar"],
      },
    ]);
  });

  it("stops listing a part once a secondary entry of the kit emits it", () => {
    const root = fixtureRoot({
      "adapter-verdant": {
        "bulk/src/bulk.component.html":
          '<div data-adapttable-part="bulk-bar"></div>\n',
      },
    });
    assert.deepEqual(report(root)[0].missing, []);
  });

  it("counts a part supplied by a binding's configured secondary entry", () => {
    const root = fixtureRoot({
      "adapter-plain": {
        "src/pivot.tsx": '<span data-adapttable-part="pivot-row-header" />;\n',
      },
      "adapter-verdant": {
        "src/pivot.ts":
          'export { AdaptPivotRowHeader } from "@adapttable/angular/pivot";\n',
      },
    });
    writePackage(root, "angular", "angular", {
      "pivot/ng-package.json": "{}\n",
      "pivot/rowHeader.ts":
        'export const template = `<span data-adapttable-part="pivot-row-header"></span>`;\n',
      "scratch/not-an-entry.ts":
        'export const template = `<div data-adapttable-part="bulk-bar"></div>`;\n',
      "node_modules/dependency/index.ts":
        'export const template = `<div data-adapttable-part="bulk-bar"></div>`;\n',
    });
    assert.deepEqual(report(root)[0].missing, ["bulk-bar"]);

    rmSync(join(root, "packages/angular/angular/pivot/ng-package.json"));
    assert.deepEqual(report(root)[0].missing, ["bulk-bar", "pivot-row-header"]);
  });

  it("lists a part the reference gets from its binding and the kit lacks", () => {
    const root = fixtureRoot();
    writePackage(root, "angular", "angular", { "src/row.ts": "export {};\n" });
    assert.deepEqual(report(root)[0].missing, ["bulk-bar", "row"]);
  });

  it("reports only private kits that have a reference", () => {
    const root = fixtureRoot();
    const reported = partsGapReport({
      root,
      kits: KITS,
      references: { ...REFERENCES, "adapter-plain": "adapter-verdant" },
    });
    assert.deepEqual(
      reported.map(({ kit }) => kit),
      ["adapter-verdant"]
    );
  });
});

const NATIVE_KITS = KITS.map((kit) =>
  kit.name === "adapter-verdant" ? { ...kit, role: "native" } : kit
);

const parity = (root, kits = NATIVE_KITS) =>
  checkPartsParity({
    root,
    kits,
    contract: ["table", "cell"],
    expectedGaps: {},
    getterParts: {},
    fallbackOnly: { "native elements": ["table", "cell", "bulk-bar"] },
    unnamedInKits: {},
  });

/** Both native kits render all the same parts, with different ownership. */
const contractRoot = () =>
  fixtureRoot({
    "adapter-verdant": {
      "bulk/src/bulk.component.html":
        '<div data-adapttable-part="bulk-bar"></div>\n',
    },
  });

describe("shared structural part factories", () => {
  const source = `export function groupRowParts(kind) {
  if (kind === "groupMore") {
    return { row: "group-more-row", cell: "group-more-cell", card: "group-more-card", label: "group-more-label" };
  }
  if (kind === "groupFooter") {
    return { row: "group-footer-row", cell: "group-footer-cell", card: "group-footer-card", label: "group-label" };
  }
  return { row: "group-row", cell: "group-cell", card: "group-card", label: "group-label" };
}`;
  const rendered = [
    "group-more-row",
    "group-more-cell",
    "group-more-card",
    "group-more-label",
    "group-footer-row",
    "group-footer-cell",
    "group-footer-card",
    "group-row",
    "group-cell",
    "group-card",
    "group-label",
  ];

  function factoryRoot(factory = source) {
    const root = contractRoot();
    writePackage(root, "shared", "core", {
      "src/groupParts.ts": factory,
    });
    writePackage(root, "react", "adapter-plain", {
      "src/Group.tsx": `export const Group = () => <>${rendered
        .map((part) => `<div data-adapttable-part="${part}" />`)
        .join("")}</>;`,
    });
    return root;
  }

  it("counts all returned group row, footer and more parts from neutral core", () => {
    assert.deepEqual(report(factoryRoot())[0].missing, []);
  });

  it("reports the exact part removed from a factory return", () => {
    assert.deepEqual(
      report(
        factoryRoot(source.replace('card: "group-card"', "card: undefined"))
      )[0].missing,
      ["group-card"]
    );
  });

  it("reads bounded values from returned records and immutable aliases", () => {
    const root = contractRoot();
    writePackage(root, "angular", "angular", {
      "src/parts.ts": `const CARD = "group-card";
const PARTS = { card: CARD };
export function groupedParts(footer) {
  return footer ? { cell: "group-footer-cell" } : PARTS;
}`,
    });
    assert.deepEqual(
      parity(root).failures.flatMap(({ lines }) => lines),
      [
        "group-card — missing from adapter-plain",
        "group-footer-cell — missing from adapter-plain",
      ]
    );
  });

  it("ignores incidental strings, nested returns and unrelated functions", () => {
    const root = contractRoot();
    writePackage(root, "angular", "angular", {
      "src/parts.ts": `export function groupedParts(kind) {
  const unused = { cell: "unused-part" };
  const callback = () => { return { cell: "callback-part" }; };
  function helper() { return { cell: "nested-part" }; }
  if (kind === "condition-part") return makeRecord("argument-part");
  return { cell: makePart("value-argument-part"), nested: { cell: "nested-object-part" } };
}
export function unrelated() { return { cell: "unrelated-part" }; }
function privateParts() { return { cell: "private-part" }; }
// export function commentParts() { return { cell: "comment-part" }; }
export const example = 'export function exampleParts() { return { cell: "string-part" }; }';`,
    });
    assert.deepEqual(parity(root).failures, []);
  });
});

describe("native parts contracts before publication", () => {
  it("accepts unpublished native kits with equal effective parts", () => {
    const result = parity(contractRoot());
    assert.deepEqual(result.failures, []);
    assert.match(result.summary, /2 contract parts hold in 2 kits/);
  });

  it("keeps unfinished role-private kits outside the contract", () => {
    const result = parity(fixtureRoot(), KITS);
    assert.deepEqual(result.failures, []);
    assert.match(result.summary, /2 contract parts hold in 1 kits/);
  });

  it("rejects a native-only part lost by one kit even while another preserves the union", () => {
    const result = parity(fixtureRoot());
    assert.deepEqual(
      result.failures.map(({ headline, lines }) => ({ headline, lines })),
      [
        {
          headline: "1 part(s) differ between native kits:",
          lines: ["bulk-bar — missing from adapter-verdant"],
        },
      ]
    );
  });

  it("rejects a part the other native kit receives from its binding", () => {
    const root = contractRoot();
    writePackage(root, "angular", "angular", { "src/row.ts": "export {};\n" });
    assert.deepEqual(parity(root).failures[0].lines, [
      "row — missing from adapter-verdant",
    ]);
  });

  it("compares in both directions when Angular Chrome adds a part", () => {
    const root = contractRoot();
    writePackage(root, "angular", "angular", {
      "src/extra.ts":
        'export const EXTRA_PARTS = {\n  extra: "extra-native-part",\n};\n',
    });
    assert.deepEqual(parity(root).failures[0].lines, [
      "extra-native-part — missing from adapter-plain",
    ]);
  });

  it("still checks the structural contract of an unpublished native kit", () => {
    const root = contractRoot();
    writePackage(root, "angular", "adapter-verdant", {
      "src/data-table.component.html": VERDANT.replace(
        'data-adapttable-part="table"',
        ""
      ),
    });
    assert.deepEqual(parity(root).failures[0].lines, [
      "table — adapter-verdant: not named",
    ]);
  });
});

const SCROLL_BOX_REF = `export const nameScrollBox = (node) => {
  if (node && !node.dataset.adapttablePart) {
    node.dataset.adapttablePart = "scroll-box";
  }
};`;

/** React shells inherit the scroll-box name; Angular's native kit spells it. */
function themedOwnership(themedSource = SCROLL_BOX_REF) {
  const root = contractRoot();
  writePackage(root, "react", "react", {
    "src/scrollBox.tsx": themedSource,
  });
  writePackage(root, "react", "adapter-themed", {
    "src/DataTable.tsx": PLAIN,
  });
  writePackage(root, "angular", "adapter-verdant", {
    "src/scrollBox.html": '<div data-adapttable-part="scroll-box"></div>',
  });
  return checkPartsParity({
    root,
    kits: [
      ...NATIVE_KITS,
      { name: "adapter-themed", framework: "react", role: "shell" },
    ],
    contract: ["table", "cell"],
    expectedGaps: {},
    getterParts: {},
    fallbackOnly: {},
    unnamedInKits: {},
  });
}

describe("native extras and per-framework themed parity", () => {
  const withExtras = (root, nativeExtras) =>
    checkPartsParity({
      root,
      kits: NATIVE_KITS,
      contract: ["table", "cell"],
      expectedGaps: {},
      getterParts: {},
      fallbackOnly: { "native elements": ["table", "cell", "bulk-bar"] },
      unnamedInKits: {},
      nativeExtras,
    }).failures.map(({ headline, lines }) => ({ headline, lines }));

  it("accepts a part only one native kit renders when it is listed with a reason", () => {
    assert.deepEqual(
      withExtras(fixtureRoot(), {
        "adapter-plain": {
          "bulk-bar": "only the React native kit has a bulk bar",
        },
      }),
      []
    );
  });

  it("reports a listed extra that every native kit renders or its kit no longer renders", () => {
    assert.deepEqual(
      withExtras(contractRoot(), {
        "adapter-plain": { table: "stale", ghost: "removed" },
      }),
      [
        {
          headline: "2 native extra(s) in NATIVE_EXTRAS are stale:",
          lines: [
            "table — every native kit renders it now",
            "ghost — adapter-plain no longer renders it",
          ],
        },
      ]
    );
  });

  it("holds themed kits to their own framework's themed parts", () => {
    const root = mkdtempSync(join(tmpdir(), "adapttable-parts-themed-"));
    temps.push(root);
    writePackage(root, "shared", "core", { "src/index.ts": "export {};\n" });
    writePackage(root, "react", "react", { "src/index.ts": "export {};\n" });
    writePackage(root, "angular", "angular", {
      "src/index.ts": "export {};\n",
    });
    const table = (extra = "") =>
      `export const T = () => <table data-adapttable-part="table"><td data-adapttable-part="cell" />${extra}</table>;\n`;
    const kits = [
      { name: "adapter-red", framework: "react", role: "shell" },
      { name: "adapter-blue", framework: "react", role: "shell" },
      { name: "adapter-gold", framework: "angular", role: "shell" },
      { name: "adapter-jade", framework: "angular", role: "shell" },
      { name: "adapter-onyx", framework: "angular", role: "shell" },
    ];
    for (const kit of kits) {
      const gold =
        kit.name === "adapter-onyx"
          ? ""
          : '<div data-adapttable-part="gold-only"></div>';
      writePackage(
        root,
        kit.framework,
        kit.name,
        kit.framework === "react"
          ? { "src/Table.tsx": table() }
          : {
              "src/table.component.html": `<table data-adapttable-part="table"><td data-adapttable-part="cell"></td>${gold}</table>\n`,
            }
      );
    }
    const failures = checkPartsParity({
      root,
      kits,
      contract: ["table", "cell"],
      expectedGaps: {},
      getterParts: {},
      fallbackOnly: {},
      unnamedInKits: {},
      nativeExtras: {},
    }).failures;
    assert.deepEqual(
      failures.flatMap(({ lines }) => lines),
      ["gold-only — missing from adapter-onyx"]
    );
  });
});

describe("native-only accounting uses effective themed parts", () => {
  it("accepts a name provided by themed Chrome and another framework's native kit", () => {
    assert.deepEqual(themedOwnership().failures, []);
  });

  it("still rejects an unaccounted native part when themed Chrome stops naming it", () => {
    const result = themedOwnership("export {};");
    assert.deepEqual(
      result.failures.find(({ headline }) => headline.includes("alone:"))
        ?.lines,
      ["scroll-box"]
    );
  });
});

/** A body entry forwards Angular's canonical row attrs to its desktop row. */
function angularRowsRoot(getter = "table.rowAttrs(row, index)") {
  const root = contractRoot();
  writePackage(root, "angular", "adapter-verdant", {
    "src/dataTable.ts": `export interface Entry { readonly rowAttrs: Attrs; }
export const entry = (table, grid, reorder, row, index) => ({
  rowAttrs: ${getter},
});
`,
    "src/data-table.component.html": VERDANT.replace(
      "<tr>",
      '<tr [adaptAttrs]="entry.rowAttrs">'
    ),
  });
  return root;
}

const rowParity = (root) =>
  checkPartsParity({
    root,
    kits: NATIVE_KITS,
    contract: ["row"],
    expectedGaps: {},
    fallbackOnly: { "native elements": ["table", "cell", "bulk-bar"] },
    unnamedInKits: {},
  });

function inheritedRowsRoot(
  extendsBase = true,
  body = "table.rowAttrs(row, index)"
) {
  const root = angularRowsRoot("{}");
  writePackage(root, "angular", "angular", {
    "src/index.ts":
      'export { AdaptDataTableShell } from "./layout/dataTableShell";',
    "src/layout/dataTableShell.ts": `export class AdaptDataTableShell {
      view = () => ({ rowAttrs: ${body} });
    }`,
  });
  writePackage(root, "angular", "adapter-verdant", {
    "src/dataTable.ts": `import { AdaptDataTableShell } from "@adapttable/angular";
      export class AdaptDataTable ${extendsBase ? "extends AdaptDataTableShell" : ""} {}`,
  });
  return root;
}

describe("inherited Angular row contracts", () => {
  it("follows a kit's actual binding shell base to the canonical getter", () => {
    assert.deepEqual(rowParity(inheritedRowsRoot()).failures, []);
  });
  it("follows a runtime alias through the adapter entry's shared src file", () => {
    const root = inheritedRowsRoot();
    writePackage(root, "angular", "angular", {
      "package.json": JSON.stringify({
        name: "@adapttable/angular",
        exports: { ".": "./index.js", "./adapter": "./adapter.js" },
      }),
      "ng-package.json": JSON.stringify({ lib: { entryFile: "src/index.ts" } }),
      "adapter/ng-package.json": JSON.stringify({
        lib: { entryFile: "../src/adapter.ts" },
      }),
      "src/adapter.ts":
        'export { AdaptDataTableShell as Shell } from "./layout/dataTableShell";',
    });
    writePackage(root, "angular", "adapter-verdant", {
      "src/dataTable.ts":
        'import { Shell as Base } from "@adapttable/angular/adapter"; export class AdaptDataTable extends Base {}',
    });
    assert.deepEqual(rowParity(root).failures, []);
    writePackage(root, "angular", "angular", {
      "src/adapter.ts":
        'export type { AdaptDataTableShell as Shell } from "./layout/dataTableShell";',
    });
    assert.deepEqual(rowParity(root).failures[0].lines, [
      "row — adapter-verdant: neither names it nor calls rowAttrs",
    ]);
  });
  for (const [name, root] of [
    ["an unused shell import", () => inheritedRowsRoot(false)],
    [
      "a base dropping the canonical getter",
      () => inheritedRowsRoot(true, "{}"),
    ],
  ]) {
    it(`rejects ${name}`, () => {
      assert.deepEqual(rowParity(root()).failures[0].lines, [
        "row — adapter-verdant: neither names it nor calls rowAttrs",
      ]);
    });
  }
});

describe("Angular structural row getter", () => {
  for (const getter of ["table.rowAttrs", "grid.rowAttrs"]) {
    it(`accepts a row assembled from ${getter} and bound whole`, () => {
      assert.deepEqual(
        rowParity(angularRowsRoot(`${getter}(row, index)`)).failures,
        []
      );
    });
  }

  for (const [name, getter] of [
    ["only a record property and template binding remain", "{}"],
    ["only reorder attrs are called", "reorder.rowAttrs(row, index)"],
  ]) {
    it(`rejects a missing canonical row getter when ${name}`, () => {
      assert.deepEqual(rowParity(angularRowsRoot(getter)).failures[0].lines, [
        "row — adapter-verdant: neither names it nor calls rowAttrs",
      ]);
    });
  }

  it("rejects a row getter whose binding no longer supplies the row part", () => {
    const root = angularRowsRoot();
    writePackage(root, "angular", "angular", { "src/row.ts": "export {};\n" });
    assert.deepEqual(rowParity(root).failures[0].lines, [
      "row — angular: rowAttrs no longer emit it, so no kit spreads it",
    ]);
  });
});

/** The reference's extra rendered names, from a kit or its binding. */
function expressionGap(source, layer = "kit", extension = "tsx") {
  const root = contractRoot();
  writePackage(root, "react", layer === "kit" ? "adapter-plain" : "react", {
    [`src/expressions.${extension}`]: source,
  });
  return report(root)[0].missing;
}

describe("part helpers and conditional part names", () => {
  for (const [name, source, expected] of [
    [
      "a helper that returns its parameter as the part",
      'function part(name, names) { return { "data-adapttable-part": name, class: names }; }\nexport const View = () => h("div", part("helper-part", {}));',
      ["helper-part"],
    ],
    [
      "a helper that hands its parameter to a kit slot",
      'function button(props, label, part) { return props.slots.Button({ label, part }); }\nexport const View = (props) => button(props, "Close", "slot-part");',
      ["slot-part"],
    ],
    [
      "a helper that forwards its parameter to another part helper",
      'const part = (name) => ({ "data-adapttable-part": name });\nfunction control(name) { return h("button", { ...part(name) }); }\nexport const View = () => control("forwarded-part");',
      ["forwarded-part"],
    ],
    [
      "both branches of a conditional part",
      'export const View = (up) => h("button", { "data-adapttable-part": up ? "move-up" : "move-down" });',
      ["move-down", "move-up"],
    ],
    [
      "a helper that does not return its parameter as the part",
      'function label(name) { return { title: name }; }\nexport const View = () => h("div", label("not-a-part"));',
      [],
    ],
    [
      "a component prop that names one of its elements",
      'export const View = () => h(Select, { value: "", optionPart: "option-part" });',
      ["option-part"],
    ],
    [
      "a part-named key in an object no call receives",
      'export const config = { menuPart: "unhanded-part" };',
      [],
    ],
    [
      "a same-named helper from another package",
      'import { part } from "@elsewhere/parts";\nexport const View = () => h("div", part("foreign-part"));',
      [],
    ],
  ]) {
    it(`reads ${name}`, () => {
      assert.deepEqual(
        [...expressionGap(source, "kit", "ts")].sort(),
        expected
      );
    });
  }
});

describe("Vue single-file component scripts", () => {
  /** The parts a Vue kit's files name, as a private Vue kit's gap against it. */
  function vueGap(files) {
    const root = mkdtempSync(join(tmpdir(), "adapttable-parts-sfc-"));
    temps.push(root);
    writePackage(root, "shared", "core", { "src/index.ts": "export {};\n" });
    writePackage(root, "vue", "vue", { "src/index.ts": "export {};\n" });
    writePackage(root, "vue", "adapter-plain", files);
    writePackage(root, "vue", "adapter-draft", {
      "src/index.ts": "export {};\n",
    });
    return partsGapReport({
      root,
      kits: [
        { name: "adapter-plain", framework: "vue", role: "native" },
        { name: "adapter-draft", framework: "vue", role: "private" },
      ],
      references: { "adapter-draft": "adapter-plain" },
    })[0].missing;
  }

  it("reads part props and helpers in an SFC's script blocks", () => {
    assert.deepEqual(
      vueGap({
        "src/Menu.vue": [
          '<script setup lang="ts">',
          'const part = (name: string) => ({ "data-adapttable-part": name });',
          'const view = () => [h(Select, { menuPart: "sfc-menu" }), h("li", part("sfc-item"))];',
          "</script>",
          "<template><div /></template>",
        ].join("\n"),
      }),
      ["sfc-item", "sfc-menu"]
    );
  });

  it("ignores part-like text outside an SFC's script blocks", () => {
    assert.deepEqual(
      vueGap({
        "src/Note.vue": [
          '<script setup lang="ts">',
          "const label = 1;",
          "</script>",
          '<template><p>{{ label }} h(Select, { menuPart: "template-text" })</p></template>',
          '<docs>h(Select, { menuPart: "docs-text" })</docs>',
        ].join("\n"),
      }),
      []
    );
  });
});

describe("rendered JSX part expressions", () => {
  it("reads every literal branch of a nullish conditional on a Chrome element", () => {
    assert.deepEqual(
      expressionGap(
        `export const Speaker = ({ part, mine }) => (
  <span data-adapttable-part={
    part ?? (mine ? "assistant-user-mark" : "assistant-message-mark")
  } />
);`,
        "binding"
      ),
      ["assistant-message-mark", "assistant-user-mark"]
    );
  });

  it("reads a native card's default part from a nullish expression", () => {
    assert.deepEqual(
      expressionGap(
        'export const Card = ({ part }) => <li data-adapttable-part={part ?? "card"} />;'
      ),
      ["card"]
    );
  });

  it("follows only the immutable constant referenced by a rendered attribute", () => {
    assert.deepEqual(
      expressionGap(`const FIELD_PART = "filter-field";
const UNUSED_PART = "unused-field";
const LABEL_PART = "unrelated-label";
export const Field = () => (
  <fieldset data-adapttable-part={FIELD_PART} aria-label={LABEL_PART} />
);`),
      ["filter-field"]
    );
  });

  it("follows constant aliases without counting an unused alias", () => {
    assert.deepEqual(
      expressionGap(`const FIELD_PART = "filter-field" as const;
const ALIAS = FIELD_PART;
const UNUSED_ALIAS = "unrendered-field";
export const Field = () => <fieldset data-adapttable-part={ALIAS} />;`),
      ["filter-field"]
    );
  });

  it("follows const declarations inside an async parse context", () => {
    assert.deepEqual(
      expressionGap(`export async function Field() {
  const FIELD_PART = "filter-field";
  return <fieldset data-adapttable-part={FIELD_PART} />;
}`),
      ["filter-field"]
    );
  });

  for (const [imported, tag] of [
    ["LiveRegion", "LiveRegion"],
    ["LiveRegion as Announcement", "Announcement"],
  ]) {
    it(`reads the binding's ${tag} forwarded part`, () => {
      assert.deepEqual(
        expressionGap(`import { ${imported} } from "@adapttable/react/adapter";
export const Rename = () => <${tag} part="header-rename-announcer">{message}</${tag}>;`),
        ["header-rename-announcer"]
      );
    });
  }

  for (const [name, source] of [
    [
      "unrelated part props",
      'export const Other = () => <Widget part="unrelated-widget-part" />;',
    ],
    [
      "an unrelated component named LiveRegion",
      `import { LiveRegion } from "other-library";
export const Other = () => <LiveRegion part="unrelated-live-region" />;`,
    ],
    [
      "a shadowed LiveRegion import",
      `import { LiveRegion } from "@adapttable/react/adapter";
export const Other = ({ LiveRegion }) => <LiveRegion part="shadowed-live-region" />;`,
    ],
    [
      "arbitrary function-argument strings",
      'export const button = reviewButton(props, "argument-only-part");',
    ],
    [
      "arguments of a part-producing function",
      'export const Other = () => <div data-adapttable-part={choosePart("argument-only-part")} />;',
    ],
    [
      "the test of a conditional expression",
      'export const Other = ({ yes, no }) => <div data-adapttable-part={"condition-only-part" ? yes : no} />;',
    ],
    [
      "a mutable variable used as the part",
      'let PART = "mutable-part"; export const Other = () => <div data-adapttable-part={PART} />;',
    ],
    [
      "an unused constant shadowed by a component prop",
      `const FIELD_PART = "shadowed-constant";
export const Other = ({ FIELD_PART }) => <div data-adapttable-part={FIELD_PART} />;`,
    ],
    [
      "unused constants and unrelated object props",
      'const PART = "unused-part"; export const props = { part: "unrelated-property" };',
    ],
    [
      "a commented-out forwarded component",
      `import { LiveRegion } from "@adapttable/react/adapter";
// <LiveRegion part="comment-only-part" />
export const Other = () => null;`,
    ],
    [
      "a boolean part attribute",
      "export const Other = () => <div data-adapttable-part />;",
    ],
    [
      "cyclic constant references",
      "const FIRST = SECOND; const SECOND = FIRST; export const Other = () => <div data-adapttable-part={FIRST} />;",
    ],
  ]) {
    it(`does not infer a rendered name from ${name}`, () => {
      assert.deepEqual(expressionGap(source), []);
    });
  }
});

describe("DOM dataset part assignments", () => {
  for (const extension of ["ts", "tsx"]) {
    it(`reads an actual scroll-ref assignment from ${extension} source`, () => {
      assert.deepEqual(expressionGap(SCROLL_BOX_REF, "binding", extension), [
        "scroll-box",
      ]);
    });
  }

  it("reads bounded fallback values assigned to the DOM dataset", () => {
    assert.deepEqual(
      expressionGap(
        'export const ref = (node, part) => { node.dataset.adapttablePart = part ?? "scroll-box"; };'
      ),
      ["scroll-box"]
    );
  });

  for (const [name, source] of [
    [
      "a commented assignment",
      '// node.dataset.adapttablePart = "comment-only-part";',
    ],
    [
      "an assignment inside a string",
      "export const example = 'node.dataset.adapttablePart = \"string-only-part\";';",
    ],
    [
      "a dataset comparison",
      'export const matches = node.dataset.adapttablePart === "comparison-only-part";',
    ],
    [
      "another object's similarly named property",
      'state.adapttablePart = "unrelated-part";',
    ],
    ["an unrelated dataset key", 'node.dataset.otherPart = "unrelated-part";'],
    [
      "an arbitrary function argument",
      'markPart(node.dataset, "argument-only-part");',
    ],
  ]) {
    it(`does not count ${name}`, () => {
      assert.deepEqual(expressionGap(source), []);
    });
  }
});

/** The Angular reference's additional rendered names, measured in reverse. */
function angularExpressionGap(source = "export {};", template = "") {
  const root = contractRoot();
  writePackage(root, "angular", "adapter-verdant", {
    "src/expressions.ts": source,
    "src/expressions.html": template,
  });
  const kits = KITS.map((kit) => ({
    ...kit,
    role: kit.name === "adapter-verdant" ? "native" : "private",
  }));
  return partsGapReport({
    root,
    kits,
    references: { "adapter-plain": "adapter-verdant" },
  })[0].missing;
}

const ANGULAR_REGION = `<div
  [adaptLiveRegion]="rename.announcement()"
  part="column-rename-announcer"
></div>`;
const ANGULAR_GROUP_ROW = `<tr
  [attr.data-adapttable-part]="last ? 'header-row' : 'header-group-row'"
></tr>`;

/** The directive is imported by the component that owns the template. */
const angularComponent = (
  template,
  imports = "AdaptLiveRegion",
  module = "@adapttable/angular"
) => `
import { Component } from "@angular/core";
import { AdaptLiveRegion } from "${module}";
@Component({
  imports: [${imports}],
  template: \`${template}\`,
})
export class Example {}
`;

describe("rendered Angular part expressions and directives", () => {
  it("reads both branches of an external template's part binding", () => {
    assert.deepEqual(angularExpressionGap("export {};", ANGULAR_GROUP_ROW), [
      "header-group-row",
      "header-row",
    ]);
  });

  it("reads conditional part bindings from an actual inline component template", () => {
    assert.deepEqual(
      angularExpressionGap(angularComponent(ANGULAR_GROUP_ROW)),
      ["header-group-row", "header-row"]
    );
  });

  it("follows the registered AdaptLiveRegion directive's literal part", () => {
    assert.deepEqual(angularExpressionGap(angularComponent(ANGULAR_REGION)), [
      "column-rename-announcer",
    ]);
  });

  for (const module of ["@adapttable/angular", "@adapttable/angular/adapter"]) {
    it(`follows a registered runtime alias from ${module}`, () => {
      const source = angularComponent(ANGULAR_REGION, "Region", module).replace(
        "import { AdaptLiveRegion }",
        "import { AdaptLiveRegion as Region }"
      );
      assert.deepEqual(angularExpressionGap(source), [
        "column-rename-announcer",
      ]);
    });

    for (const [name, source] of [
      ["an unused directive", angularComponent(ANGULAR_REGION, "", module)],
      [
        "a type-only import declaration",
        angularComponent(ANGULAR_REGION, "AdaptLiveRegion", module).replace(
          "import { AdaptLiveRegion }",
          "import type { AdaptLiveRegion }"
        ),
      ],
      [
        "a type-only import specifier",
        angularComponent(ANGULAR_REGION, "AdaptLiveRegion", module).replace(
          "import { AdaptLiveRegion }",
          "import { type AdaptLiveRegion }"
        ),
      ],
      [
        "a shadowed local alias",
        angularComponent(ANGULAR_REGION, "Region", module).replace(
          "import { AdaptLiveRegion }",
          "import { AdaptLiveRegion as Region }"
        ) + "\nfunction unrelated(Region) {}",
      ],
    ]) {
      it(`does not infer a directive part from ${name} in ${module}`, () => {
        assert.deepEqual(angularExpressionGap(source), []);
      });
    }
  }

  for (const module of [
    "@adapttable/angular/private",
    "@adapttable/angular/src/adapter",
    "@adapttable/angular/adapter/private",
    "@adapttable/angular/features",
  ]) {
    it(`rejects a directive lookalike imported from ${module}`, () => {
      assert.deepEqual(
        angularExpressionGap(
          angularComponent(ANGULAR_REGION, "AdaptLiveRegion", module)
        ),
        []
      );
    });
  }

  it("follows a registered directive into its paired external template", () => {
    const source = angularComponent("").replace(
      "template: ``,",
      'templateUrl: "./expressions.html",'
    );
    assert.deepEqual(angularExpressionGap(source, ANGULAR_REGION), [
      "column-rename-announcer",
    ]);
  });

  it("reads bounded expressions on the directive's part input", () => {
    const template = `<div [adaptLiveRegion]="announcement"
  [part]="enabled ? 'enabled-announcer' : 'disabled-announcer'"></div>`;
    assert.deepEqual(angularExpressionGap(angularComponent(template)), [
      "disabled-announcer",
      "enabled-announcer",
    ]);
  });

  it("reads unquoted literal values and single-quoted bound expressions", () => {
    const template = `<div adaptLiveRegion="ready" part=column-rename-announcer></div>
<div [adaptLiveRegion]="announcement"
  [part]='enabled ? "enabled-announcer" : "disabled-announcer"'></div>`;
    assert.deepEqual(angularExpressionGap(angularComponent(template)), [
      "column-rename-announcer",
      "disabled-announcer",
      "enabled-announcer",
    ]);
  });

  it("does not confuse a comparison inside an attribute with the tag end", () => {
    const template = `<tr [attr.rowspan]="span > 1 ? span : null"
  [attr.data-adapttable-part]="last ? 'header-row' : 'header-group-row'"></tr>`;
    assert.deepEqual(angularExpressionGap("export {};", template), [
      "header-group-row",
      "header-row",
    ]);
  });

  for (const [name, source, template = ""] of [
    [
      "a part attribute without the directive",
      angularComponent('<div part="unrelated-part"></div>'),
    ],
    [
      "a part attribute on another element",
      angularComponent(
        '<div [adaptLiveRegion]="announcement"></div><span part="unrelated-part"></span>'
      ),
    ],
    [
      "a directive omitted from the component imports",
      angularComponent(ANGULAR_REGION, ""),
    ],
    [
      "an unrelated directive with the same name",
      angularComponent(ANGULAR_REGION).replace(
        '"@adapttable/angular"',
        '"other-library"'
      ),
    ],
    [
      "commented template markup",
      angularComponent(`<!-- ${ANGULAR_REGION}${ANGULAR_GROUP_ROW} -->`),
    ],
    [
      "commented external markup",
      "export {};",
      `<!-- ${ANGULAR_REGION}${ANGULAR_GROUP_ROW} -->`,
    ],
    [
      "template strings passed to an unrelated function",
      `import { Component } from "@angular/core";
import { AdaptLiveRegion } from "@adapttable/angular";
renderTemplate(\`${ANGULAR_REGION}${ANGULAR_GROUP_ROW}\`);`,
    ],
    [
      "function arguments inside the element's part expression",
      angularComponent(
        "<div [attr.data-adapttable-part]=\"choosePart('argument-only-part')\"></div>"
      ),
    ],
    [
      "function arguments inside the directive's part expression",
      angularComponent(
        '<div [adaptLiveRegion]="announcement" [part]="choosePart(\'argument-only-part\')"></div>'
      ),
    ],
    [
      "an external directive without an owning component",
      "export {};",
      ANGULAR_REGION,
    ],
    [
      "a component paired with a different template",
      angularComponent("").replace(
        "template: ``,",
        'templateUrl: "./different.html",'
      ),
      ANGULAR_REGION,
    ],
    [
      "another component's registered directive",
      `${angularComponent("")}
@Component({ imports: [], template: \`${ANGULAR_REGION}\` })
export class Other {}`,
    ],
  ]) {
    it(`does not infer a rendered name from ${name}`, () => {
      assert.deepEqual(angularExpressionGap(source, template), []);
    });
  }
});

describe("check-parts-parity --report", () => {
  it("prints no private-kit report after both Angular kits join the contracts", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "--report"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  });
});
