import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { checkFeatureParity } from "./check-feature-parity.mjs";
import { checkPartsParity } from "./check-parts-parity.mjs";
import { vueBindingSources } from "./vue-binding-structure.mjs";

const roots = [];
after(() =>
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
);

const KIT = { name: "adapter-verdant", framework: "vue", role: "shell" };
const TABLE = `<script setup lang="ts">
import { Desktop as Frame, useModel } from "@adapttable/vue/adapter";
const model = useModel();
</script>
<template><Frame :model="model" /><div data-adapttable-part="toolbar" /></template>`;
const STRUCTURE = `import { h } from "vue";
import { mergeVueAttrs } from "./attrs";
export function Desktop(props) {
  const header = (leaf) => h("th", mergeVueAttrs(leaf.attrs, { "data-adapttable-part": "header-cell" }));
  const row = (entry) => h("tr", mergeVueAttrs(entry.attrs, {}), entry.cells.map((cell) => h("td", { "data-adapttable-part": "cell" })));
  return h("table", { "data-adapttable-part": "table" }, [
    h("thead", { "data-adapttable-part": "thead" }, props.model.headers.map(header)),
    h("tbody", { "data-adapttable-part": "tbody" }, props.model.rows.map(row)),
  ]);
}
export function UnusedChrome() { return h("div", { "data-adapttable-part": "decoy" }); }
`;
const MODEL = `import { rowAttributes as rowAttrs, headerCellAttributes } from "@adapttable/core/binding";
export function useModel() {
  return { rows: [{ attrs: rowAttrs("id", 0) }], headers: [{ attrs: headerCellAttributes({}) }] };
}`;

function write(root, file, source) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), source);
}
function fixture({
  table = TABLE,
  structure = STRUCTURE,
  model = MODEL,
  adapter = 'export { Desktop } from "./structure"; export { useModel } from "./model";',
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "vue-structure-"));
  roots.push(root);
  for (const [group, name, manifest] of [
    ["shared", "core", { name: "@adapttable/core" }],
    [
      "vue",
      "vue",
      { name: "@adapttable/vue", exports: { ".": {}, "./adapter": {} } },
    ],
    [
      "vue",
      KIT.name,
      {
        name: "@adapttable/verdant",
        exports: { ".": {}, "./preset": {}, "./filters": {} },
      },
    ],
  ])
    write(
      root,
      `packages/${group}/${name}/package.json`,
      JSON.stringify(manifest)
    );
  write(
    root,
    "packages/shared/core/src/index.ts",
    'export function rowAttributes() { return { "data-adapttable-part": "row" }; }'
  );
  write(root, "packages/vue/vue/src/adapter.ts", adapter);
  write(root, "packages/vue/vue/src/structure.ts", structure);
  write(root, "packages/vue/vue/src/model.ts", model);
  write(
    root,
    "packages/vue/vue/src/attrs.ts",
    "export function mergeVueAttrs(...attrs) { return Object.assign({}, ...attrs); }"
  );
  write(root, `packages/vue/${KIT.name}/src/DataTable.vue`, table);
  return root;
}
const parts = (root, contract) =>
  checkPartsParity({
    root,
    kits: [KIT],
    expectedGaps: {},
    fallbackOnly: {},
    unnamedInKits: {},
    ...(contract ? { contract } : {}),
  }).failures.flatMap(({ lines }) => lines);
const features = (root) =>
  checkFeatureParity({
    root,
    kits: [KIT],
    manifest: { features: { filters: { subpath: "filters" } } },
  }).problems;

describe("Vue binding structural ownership", () => {
  it("follows rendered import aliases through binding barrels and attribute APIs", () => {
    const root = fixture();
    assert.deepEqual(parts(root), []);
    assert.deepEqual(features(root), []);
  });

  it("accepts kebab-case template components and render-function aliases", () => {
    assert.deepEqual(
      parts(
        fixture({
          table: TABLE.replace(
            "Desktop as Frame",
            "Desktop as TableFrame"
          ).replace("<Frame ", "<table-frame "),
        })
      ),
      []
    );
    assert.deepEqual(
      parts(
        fixture({
          table: TABLE.replace(
            "const model = useModel();",
            'import { h as render } from "vue";\nconst model = useModel();\nexport const View = () => render(Frame, { model });'
          ).replace('<Frame :model="model" />', ""),
        })
      ),
      []
    );
  });

  it("parses both script blocks and quoted markup boundaries", () => {
    const table = `<script lang="ts" data-note="a > b">
import { Desktop as Frame } from "@adapttable/vue/adapter";
</script>
<script setup lang="ts" generic="TRow extends { id: string }">
import { useModel } from "@adapttable/vue/adapter";
const model = useModel();
</script>
<template><Frame :model="model" data-note="a > b" /><div data-adapttable-part="toolbar" /></template>`;
    assert.deepEqual(parts(fixture({ table })), []);
    assert.deepEqual(features(fixture({ table })), []);
  });

  it("does not mistake comments, custom blocks or attribute text for rendered components", () => {
    const table = TABLE.replace(
      "Desktop as Frame, useModel",
      "Desktop as Frame, useModel, UnusedChrome"
    ).replace(
      '<Frame :model="model" />',
      `<Frame :model="model" data-note="<UnusedChrome />" />
<!-- <UnusedChrome /> -->
<div>{{ "<UnusedChrome />" }}</div>`
    ).concat(`
<docs><UnusedChrome /></docs>
<!-- <script>import { UnusedChrome } from "@adapttable/vue/adapter";</script> -->`);
    const root = fixture({
      table,
      adapter:
        'export { Desktop, UnusedChrome } from "./structure"; export { useModel } from "./model";',
    });
    assert.deepEqual(parts(root), []);
    assert(parts(root, ["decoy"]).includes(`decoy — ${KIT.name}: not named`));
  });

  it("ignores component text in scripts and commented-out script blocks", () => {
    for (const table of [
      TABLE.replace('<Frame :model="model" />', "").replace(
        "const model = useModel();",
        'const model = useModel(); const sample = "<Frame />";'
      ),
      TABLE.replace("<script setup", "<!-- <script setup").replace(
        "</script>",
        "</script> -->"
      ),
    ]) {
      const root = fixture({ table });
      assert(parts(root).includes(`table — ${KIT.name}: not named`));
    }
  });

  for (const part of ["table", "thead", "tbody", "cell", "header-cell"]) {
    it(`rejects a rendered binding that drops ${part}`, () => {
      const root = fixture({
        structure: STRUCTURE.replace(
          `"data-adapttable-part": "${part}"`,
          `"data-removed": "${part}"`
        ),
      });
      assert(parts(root).includes(`${part} — ${KIT.name}: not named`));
    });
  }

  it("does not borrow parts from an unused sibling component", () => {
    assert(
      parts(fixture(), ["decoy"]).includes(`decoy — ${KIT.name}: not named`)
    );
  });

  it("rejects unused, commented and type-only imports", () => {
    for (const table of [
      TABLE.replace('<Frame :model="model" />', ""),
      TABLE.replace(
        '<Frame :model="model" />',
        '<!-- <Frame :model="model" /> -->'
      ),
      TABLE.replace("Desktop as Frame", "type Desktop as Frame"),
      TABLE.replace('<Frame :model="model" />', "").replace(
        "const model =",
        "type Rendered = typeof Frame; const model ="
      ),
    ]) {
      const root = fixture({ table });
      assert(parts(root).includes(`table — ${KIT.name}: not named`));
      assert(
        features(root).some((problem) => problem.includes("never passes"))
      );
    }
  });

  it("requires the public binding entry to really export the component", () => {
    const root = fixture({ adapter: 'export { useModel } from "./model";' });
    assert(parts(root).includes(`table — ${KIT.name}: not named`));
  });

  it("never follows another package's same-named component", () => {
    const root = fixture({
      table: TABLE.replace(
        "@adapttable/vue/adapter",
        "@adapttable/unrelated/adapter"
      ),
    });
    assert(parts(root).includes(`table — ${KIT.name}: not named`));
  });

  it("terminates cyclic barrels and still finds the real named export", () => {
    const root = fixture({
      adapter:
        'export * from "./loop"; export * from "./structure"; export * from "./model";',
    });
    write(root, "packages/vue/vue/src/loop.ts", 'export * from "./adapter";');
    assert.deepEqual(parts(root), []);
  });

  it("rejects missing row attribute calls and partial row/header forwarding", () => {
    const root = fixture({ model: MODEL.replace('rowAttrs("id", 0)', "{}") });
    assert(
      parts(root).some((problem) => problem.startsWith(`row — ${KIT.name}:`))
    );
    const row = fixture({
      structure: STRUCTURE.replace(
        "mergeVueAttrs(entry.attrs, {})",
        "{ role: entry.attrs.role }"
      ),
    });
    assert(
      parts(row).some((problem) => problem.startsWith(`row — ${KIT.name}:`))
    );
    const header = fixture({
      structure: STRUCTURE.replace(
        'mergeVueAttrs(leaf.attrs, { "data-adapttable-part": "header-cell" })',
        '{ role: leaf.attrs.role, "data-adapttable-part": "header-cell" }'
      ),
    });
    assert(
      features(header).some((problem) => problem.includes("never passes"))
    );
  });

  it("rejects missing neutral header calls and lookalikes from another module", () => {
    for (const model of [
      MODEL.replace("headerCellAttributes({})", "{}"),
      MODEL.replace("@adapttable/core/binding", "another-library"),
    ]) {
      assert(
        features(fixture({ model })).some((problem) =>
          problem.includes("never passes")
        )
      );
    }
  });

  it("keeps real missing feature exports visible", () => {
    const root = fixture();
    write(
      root,
      `packages/vue/${KIT.name}/package.json`,
      JSON.stringify({
        name: "@adapttable/verdant",
        exports: { ".": {}, "./preset": {} },
      })
    );
    assert.deepEqual(features(root), [
      "@adapttable/verdant: missing export ./filters",
    ]);
  });

  it("rejects render lookalikes, shadowed imports, and unused attribute records", () => {
    for (const structure of [
      STRUCTURE.replace('from "vue"', 'from "another-library"'),
      STRUCTURE.replace(
        "function Desktop(props)",
        "function Desktop(props, h)"
      ),
      STRUCTURE.replace('{ "data-adapttable-part": "table" }', "{}") +
        '\nconst sample = { "data-adapttable-part": "table" };',
    ]) {
      assert(
        parts(fixture({ structure })).includes(`table — ${KIT.name}: not named`)
      );
    }
  });

  it("rejects a neutral row API that stops emitting its part", () => {
    const root = fixture();
    write(
      root,
      "packages/shared/core/src/index.ts",
      "export function rowAttributes() { return {}; }"
    );
    assert(parts(root).some((problem) => problem.startsWith("row — vue:")));
  });

  it("follows a renamed export without crediting its original name", () => {
    const adapter =
      'export { Desktop as Renamed } from "./structure"; export { useModel } from "./model";';
    assert.deepEqual(
      parts(
        fixture({
          adapter,
          table: TABLE.replace("Desktop as Frame", "Renamed as Frame"),
        })
      ),
      []
    );
    assert(
      parts(fixture({ adapter })).includes(`table — ${KIT.name}: not named`)
    );
  });

  it("rejects a called model that discards both neutral getter results", () => {
    const model = MODEL.replace(
      'return { rows: [{ attrs: rowAttrs("id", 0) }], headers: [{ attrs: headerCellAttributes({}) }] };',
      'rowAttrs("id", 0); headerCellAttributes({}); return { rows: [{ attrs: {} }], headers: [{ attrs: {} }] };'
    );
    assert.notEqual(model, MODEL);
    const root = fixture({ model });
    assert(
      parts(root).some((problem) => problem.startsWith(`row — ${KIT.name}:`))
    );
    assert(features(root).some((problem) => problem.includes("never passes")));
  });

  it("rejects an imported merger that replaces the binding attrs", () => {
    const root = fixture();
    write(
      root,
      "packages/vue/vue/src/attrs.ts",
      "export function mergeVueAttrs(binding, host) { Object.assign({}, binding); return host; }"
    );
    assert(
      parts(root).some((problem) => problem.startsWith(`row — ${KIT.name}:`))
    );
    assert(features(root).some((problem) => problem.includes("never passes")));
  });

  it("rejects a local alias to a merger that drops attrs", () => {
    const root = fixture({
      structure: STRUCTURE.replace(
        'import { mergeVueAttrs } from "./attrs";',
        'import { mergeVueAttrs as importedMerger } from "./attrs"; const mergeVueAttrs = importedMerger;'
      ),
    });
    write(
      root,
      "packages/vue/vue/src/attrs.ts",
      "export const mergeVueAttrs = (_binding, host) => host;"
    );
    assert(
      parts(root).some((problem) => problem.startsWith(`row — ${KIT.name}:`))
    );
    assert(features(root).some((problem) => problem.includes("never passes")));
  });

  it("follows a preserving local merger alias through its returned expression", () => {
    const root = fixture({
      structure: STRUCTURE.replace(
        'import { mergeVueAttrs } from "./attrs";',
        'import { mergeVueAttrs as importedMerger } from "./attrs"; const mergeVueAttrs = importedMerger;'
      ),
    });
    assert.deepEqual(parts(root), []);
    assert.deepEqual(features(root), []);
  });

  it("does not substitute an unrelated receiver's same-named attribute methods", () => {
    const model = `import { rowAttributes, headerCellAttributes } from "@adapttable/core/binding";
      function good() { return { rowAttrs: () => rowAttributes("id", 0), headerCellAttrs: () => headerCellAttributes({}) }; }
      function empty() { return { rowAttrs: () => ({}), headerCellAttrs: () => ({}) }; }
      export function useModel() { empty(); const table = good(); return { rows: [{ attrs: table.rowAttrs() }], headers: [{ attrs: table.headerCellAttrs() }] }; }`;
    const positive = fixture({ model });
    assert.deepEqual(parts(positive), []);
    assert.deepEqual(features(positive), []);
    const negative = fixture({
      model: model.replace(
        "empty(); const table = good();",
        "good(); const table = empty();"
      ),
    });
    assert(
      parts(negative).some((problem) =>
        problem.startsWith(`row — ${KIT.name}:`)
      )
    );
    assert(
      features(negative).some((problem) => problem.includes("never passes"))
    );
  });

  it("rejects attrs from an unrelated record even when valid model attrs exist", () => {
    const root = fixture({
      structure: STRUCTURE.replace(
        "const header =",
        "const unrelated = { attrs: {} }; const header ="
      )
        .replace("mergeVueAttrs(leaf.attrs,", "mergeVueAttrs(unrelated.attrs,")
        .replace(
          "mergeVueAttrs(entry.attrs,",
          "mergeVueAttrs(unrelated.attrs,"
        ),
    });
    assert(
      parts(root).some((problem) => problem.startsWith(`row — ${KIT.name}:`))
    );
    assert(features(root).some((problem) => problem.includes("never passes")));
  });

  it("checks the key/value copy in a converter instead of trusting its name", () => {
    const converter = `function convert(attrs) { const output = {}; for (const [key, value] of Object.entries(attrs)) { output[key] = value; } return output; } export function mergeVueAttrs(binding, host) { return Object.assign({}, convert(binding), host); }`;
    const positive = fixture();
    write(positive, "packages/vue/vue/src/attrs.ts", converter);
    assert.deepEqual(parts(positive), []);
    assert.deepEqual(features(positive), []);
    for (const assignment of [
      'output["lost"] = true;',
      'if (key === "role") output[key] = value;',
    ]) {
      const root = fixture();
      write(
        root,
        "packages/vue/vue/src/attrs.ts",
        converter.replace("output[key] = value;", assignment)
      );
      assert(
        parts(root).some((problem) => problem.startsWith(`row — ${KIT.name}:`))
      );
      assert(
        features(root).some((problem) => problem.includes("never passes"))
      );
    }
  });

  it("does not treat a shadowed getter parameter as the neutral API", () => {
    const root = fixture({
      model: MODEL.replace(
        "function useModel()",
        "function useModel(rowAttrs)"
      ),
    });
    assert(
      parts(root).some((problem) => problem.startsWith(`row — ${KIT.name}:`))
    );
  });

  it("returns only the used declaration, excluding a sibling's comments and parts", () => {
    const root = fixture();
    const sources = vueBindingSources(
      [join(root, `packages/vue/${KIT.name}/src/DataTable.vue`)],
      root
    );
    assert(!sources.some(({ source }) => source.includes("UnusedChrome")));
    assert(
      sources.some(({ source }) => source.includes("headerCellAttributes"))
    );
  });
});
