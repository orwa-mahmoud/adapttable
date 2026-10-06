import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FIXTURES, PLAIN_ADAPTER_CEILING_KB } from "./consumer-fixtures.mjs";
import { KITS } from "./kits.mjs";
import {
  PDF_WRITER_MARKER,
  VUE_CONSUMER_SPECS,
  VUE_LAYOUT_GRAPH_SPECS,
  VUE_RUNTIME_EXTERNALS,
  vueConsumerCoverageProblems,
  vueConsumerFixtures,
  vueEmittedCss,
  vueForeignImport,
  vueGraphProblems,
  XLSX_WRITER_MARKER,
} from "./vue-consumer-fixtures.mjs";

const vue = FIXTURES.filter((fixture) => fixture.framework === "vue");
const fixture = (name) => {
  const found = vue.find((entry) => entry.name === name);
  assert.ok(found, name);
  return found;
};

describe("packed Vue consumers", () => {
  it("registers every distinct real entry and matches existing comparable ceilings", () => {
    assert.equal(VUE_CONSUMER_SPECS.length, 11);
    assert.deepEqual(
      vue.map((entry) => entry.name),
      VUE_CONSUMER_SPECS.map((entry) => entry.name)
    );
    assert.deepEqual(vueConsumerCoverageProblems(FIXTURES), []);
    for (const entry of vue) {
      assert.equal(entry.kind, "vue-consumer");
      assert.ok(entry.functionality);
      if (entry.hardBaseCeiling) {
        assert.equal(entry.budgetKB, PLAIN_ADAPTER_CEILING_KB);
        assert.equal("item1BaselineKB" in entry, false);
      } else {
        const comparable = FIXTURES.find(
          (candidate) => candidate.name === entry.comparable
        );
        assert.ok(comparable);
        assert.equal(entry.budgetKB, comparable.budgetKB);
      }
    }
    assert.throws(
      () => vueConsumerFixtures([], PLAIN_ADAPTER_CEILING_KB),
      /Missing comparable/
    );
  });

  it("fails if a Vue entry disappears, duplicates or a registered kit lacks coverage", () => {
    assert.ok(
      vueConsumerCoverageProblems(
        FIXTURES.filter((entry) => entry !== vue[0])
      ).some((error) => error.includes("exactly one"))
    );
    assert.ok(
      vueConsumerCoverageProblems([...FIXTURES, vue[0]]).some((error) =>
        error.includes("exactly one")
      )
    );
    assert.ok(
      vueConsumerCoverageProblems(FIXTURES, [
        ...KITS,
        { name: "adapter-vue-new", framework: "vue", role: "native" },
      ]).some((error) => error.includes("adapter-vue-new"))
    );
    assert.deepEqual(
      vueConsumerCoverageProblems(FIXTURES, [
        ...KITS,
        { name: "adapter-vue-private", framework: "vue", role: "private" },
      ]),
      []
    );
  });

  it("requires own writers and rejects planted sibling or base writer leaks", () => {
    const base = fixture("vue-unstyled · table");
    const pdf = fixture("vue-unstyled · + export-pdf");
    const xlsx = fixture("vue-unstyled · + export-xlsx");
    const graph = (code) => ({ code, imports: new Set() });
    assert.ok(
      vueGraphProblems(
        base,
        graph("const DataTable = {}; function pdfWriter() {}")
      ).some((error) => error.includes(`leaked ${PDF_WRITER_MARKER}`))
    );
    assert.ok(
      vueGraphProblems(pdf, graph("DataTable export-progress-surface")).some(
        (error) => error.includes(`missing ${PDF_WRITER_MARKER}`)
      )
    );
    assert.ok(
      vueGraphProblems(
        pdf,
        graph(
          "DataTable export-progress-surface function pdfWriter() {} function xlsxWriter() {}"
        )
      ).some((error) => error.includes(`leaked ${XLSX_WRITER_MARKER}`))
    );
    assert.deepEqual(
      vueGraphProblems(
        xlsx,
        graph("DataTable export-progress-surface function xlsxWriter() {}")
      ),
      []
    );
    assert.ok(
      fixture("vue-unstyled · features barrel").present.includes(
        PDF_WRITER_MARKER
      )
    );
    assert.ok(
      fixture("vue-unstyled · features barrel").present.includes(
        XLSX_WRITER_MARKER
      )
    );
  });

  it("covers both view controls and rejects optional writers and AI", () => {
    for (const [entry, factory, marker] of [
      ["density", "densityChooser", "density-toggle"],
      ["fullscreen", "fullscreen", "fullscreen-toggle"],
    ]) {
      const consumer = fixture(`vue-unstyled · + ${entry}`);
      const code = `DataTable ${factory} ${marker}`;
      assert.deepEqual(
        vueGraphProblems(consumer, { code, imports: new Set() }),
        []
      );
      for (const leak of [PDF_WRITER_MARKER, XLSX_WRITER_MARKER, "tableAgent"])
        assert.ok(
          vueGraphProblems(consumer, {
            code: `${code} ${leak}`,
            imports: new Set(),
          }).some((error) => error.includes("leaked"))
        );
      for (const imported of [
        "@adapttable/ai",
        "@adapttable/ai-vue",
        "/cell/node_modules/@adapttable/ai-vue/dist/index.js",
        "/repo/packages/shared/ai/dist/index.js",
        "/repo/packages/vue/ai-vue/dist/index.js",
      ])
        assert.ok(
          vueGraphProblems(consumer, {
            code,
            imports: new Set([imported]),
          }).some((error) => error.includes("optional AI runtime"))
        );
    }
  });

  it("detects bare and resolved cross-kit/framework imports and counts AdaptTable code", () => {
    const base = fixture("vue-unstyled · table");
    for (const source of [
      "react",
      "react/jsx-runtime",
      "@angular/core",
      "@adapttable/react/adapter",
      "/repo/packages/react/react/dist/index.js",
      "@adapttable/ng-zorro",
      "/repo/packages/react/adapter-unstyled/dist/index.js",
    ])
      assert.ok(vueForeignImport(source, base), source);
    for (const source of [
      "vue",
      "@adapttable/core",
      "@adapttable/vue/adapter",
      "@adapttable/vue-unstyled/export",
    ])
      assert.equal(vueForeignImport(source, base), undefined, source);
    const other = {
      name: "adapter-vue-other",
      framework: "vue",
      role: "native",
    };
    assert.match(
      vueForeignImport("@adapttable/vue-other", base, [...KITS, other]),
      /another kit/
    );
    assert.ok(
      vueGraphProblems(base, {
        code: "DataTable",
        imports: new Set(["react"]),
      }).some((error) => error.includes("another framework"))
    );
    for (const source of [
      "@adapttable/core",
      "@adapttable/vue",
      "@adapttable/vue-unstyled",
      "@tanstack/virtual-core",
      "react",
    ])
      assert.equal(
        VUE_RUNTIME_EXTERNALS.some((pattern) => pattern.test(source)),
        false,
        source
      );
    assert.equal(
      VUE_RUNTIME_EXTERNALS.some((pattern) => pattern.test("vue")),
      true
    );
    assert.equal(
      VUE_RUNTIME_EXTERNALS.some((pattern) =>
        pattern.test("vue/server-renderer")
      ),
      true
    );
  });
});

it("includes emitted drawer CSS only in the three drawer-capable Vue consumers", () => {
  assert.deepEqual(
    vue.filter((entry) => entry.styleEntryFile).map((entry) => entry.name),
    [
      "vue-unstyled · preset",
      "vue-unstyled · table + preset",
      "vue-unstyled · features barrel",
    ]
  );
  for (const entry of vue.filter((entry) => entry.styleEntryFile)) {
    assert.equal(entry.styleEntryFile, "styles.css");
    assert.match(entry.code, /import "STYLE"/);
    const code = entry.present.join(" ");
    assert.ok(
      vueGraphProblems(entry, { code, imports: new Set() }).some((problem) =>
        problem.includes("missing CSS filters-backdrop")
      )
    );
    const css = vueEmittedCss([
      { type: "chunk", fileName: "fake.js", code: "filters-backdrop" },
      {
        type: "asset",
        fileName: "styles.css",
        source: new TextEncoder().encode(
          "[data-adapttable-filter-dialog]::backdrop{} [data-adapttable-part=filters-backdrop]{}"
        ),
      },
    ]);
    assert.deepEqual(
      vueGraphProblems(entry, { code, imports: new Set(), css }),
      []
    );
    assert.equal(
      vueEmittedCss([{ type: "chunk", fileName: "fake.js", code: css }]),
      ""
    );
  }
});

describe("optional Vue layout graphs", () => {
  it("keeps headless and named shell consumers separate from optional rendering", () => {
    const root = fixture("vue · simple table");
    const shell = VUE_LAYOUT_GRAPH_SPECS.find(
      (entry) => entry.name === "vue · headless adapter shell"
    );
    assert.ok(shell);
    assert.equal(shell.entryFile, "adapter.js");
    assert.equal(shell.code, 'export { useDataTableShell } from "PKG";');
    for (const entry of [root, shell]) {
      assert.ok(entry.absent.includes("DataTableSurfaceChrome"));
      assert.ok(
        vueGraphProblems(entry, {
          code: `${entry.present.join(" ")} function DataTableSurfaceChrome() {}`,
          imports: new Set(),
        }).some((problem) => problem.includes("leaked DataTableSurfaceChrome"))
      );
    }
    assert.deepEqual(
      vueGraphProblems(shell, {
        code: "useDataTableShell DesktopTableChrome MobileCardsChrome",
        imports: new Set(),
      }),
      []
    );
  });

  it("requires the real helper when explicitly selected without adding a size budget", () => {
    const surface = VUE_LAYOUT_GRAPH_SPECS.find(
      (entry) => entry.name === "vue · optional table surface"
    );
    assert.ok(surface);
    assert.equal(surface.entryFile, "adapter.js");
    assert.equal(surface.code, 'export { DataTableSurfaceChrome } from "PKG";');
    assert.equal("budgetKB" in surface, false);
    assert.deepEqual(
      vueGraphProblems(surface, {
        code: "function DataTableSurfaceChrome() {}",
        imports: new Set(),
      }),
      []
    );
    assert.ok(
      vueGraphProblems(surface, {
        code: "function useDataTableShell() {}",
        imports: new Set(),
      }).some((problem) => problem.includes("missing DataTableSurfaceChrome"))
    );
  });
});
