import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import ts from "typescript";

import {
  canonicalAliasErrors,
  checkExportSources,
  publishedBindingEntries,
  runtimeExportErrors,
  serverQueryHandlerErrors,
  sourceExports,
  typeOnlyValueErrors,
} from "./vue-export-contracts.mjs";

const scratch = mkdtempSync(join(tmpdir(), "vue-export-contract-tests-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

function fixtureSources(root, mutate = (text) => text) {
  const binding = join(root, "packages/vue/vue/src");
  const native = join(root, "packages/vue/adapter-vue-unstyled/src");
  mkdirSync(binding, { recursive: true });
  mkdirSync(native, { recursive: true });
  writeFileSync(
    join(binding, "../package.json"),
    JSON.stringify({
      exports: {
        ".": {},
        "./adapter": {},
        "./features": {},
        "./pdf": {},
        "./xlsx": {},
        "./package.json": "./package.json",
      },
    })
  );
  writeFileSync(
    join(binding, "index.ts"),
    'export type { StaticTableFeature } from "./features/tableFeature";\nexport type { TableQueryHandler } from "./source/useServerData";'
  );
  writeFileSync(
    join(binding, "adapter.ts"),
    'export type { DensityControlProps } from "./viewControls/contracts";'
  );
  writeFileSync(
    join(binding, "features.ts"),
    'export { densityChooser } from "./features/density";\nexport { fullscreen } from "./features/fullscreen";'
  );
  const writers = {
    pdf: [
      "buildPrintDocument",
      "buildPrintTableHtml",
      "buildTablePdf",
      "openPrintLayout",
      "pdfWriter",
      "printStyles",
      "printTable",
    ],
    xlsx: ["buildTableXlsx", "xlsxWriter"],
  };
  for (const kind of ["pdf", "xlsx"]) {
    const canonical = `@adapttable/core/${kind}`;
    const route = `@adapttable/vue/${kind}`;
    const option = kind === "pdf" ? "ExportPdfOptions" : "ExportXlsxOptions";
    const factory = kind === "pdf" ? "exportPdf" : "exportXlsx";
    const source = [
      `export type { ${option} } from "./export-${kind}";`,
      `export { ${factory} } from "./export-${kind}";`,
      `export { ${writers[kind].join(", ")} } from "${canonical}";`,
    ];
    if (kind === "pdf")
      source.push(
        `export type { PdfWriterOptions, PrintLayoutOptions, PrintPageBreak, PrintPageSize } from "${canonical}";`
      );
    writeFileSync(join(binding, `${kind}.ts`), mutate(source.join("\n")));
    writeFileSync(
      join(native, `export-${kind}.ts`),
      [
        `export type { ${option} } from "${route}";`,
        `export { ${writers[kind].join(", ")} } from "${route}";`,
      ].join("\n")
    );
  }
}

describe("canonical Vue source ownership proof", () => {
  it("preserves type-only stars and individual type-only specifiers", () => {
    assert.deepEqual(
      sourceExports(
        'export type * from "source"; export { type Options, writer } from "writer";'
      ),
      [
        { from: "source", typeOnly: true, names: "*" },
        {
          from: "writer",
          typeOnly: false,
          names: [
            { name: "Options", original: "Options", typeOnly: true },
            { name: "writer", original: "writer", typeOnly: false },
          ],
        },
      ]
    );
  });

  it("proves explicit owner exports without forwarding shared closures", () => {
    const root = join(scratch, "source-positive");
    fixtureSources(root);
    assert.doesNotThrow(() => checkExportSources(root));
  });

  it("rejects adding a CSV runtime export to an optional writer entry", () => {
    const root = join(scratch, "source-runtime-leak");
    fixtureSources(
      root,
      (text) => `${text}\nexport { exportCsv } from "./export-csv";`
    );
    assert.throws(
      () => checkExportSources(root),
      /source export origin or type-only mode changed/
    );
  });

  it("rejects wildcard forwarding from the root canonical entry", () => {
    const root = join(scratch, "source-transitive-leak");
    fixtureSources(root);
    writeFileSync(
      join(root, "packages/vue/vue/src/index.ts"),
      'export * from "@adapttable/core";'
    );
    assert.throws(
      () => checkExportSources(root),
      /canonical entries cannot forward wildcard closures/
    );
  });

  it("rejects replacing a writer option contract with a wrong origin", () => {
    const root = join(scratch, "source-wrong-origin");
    fixtureSources(root, (text) =>
      text.replace(
        /export type \{ PdfWriterOptions, PrintLayoutOptions, PrintPageBreak, PrintPageSize \} from [^;]+;/,
        'export type { PdfWriterOptions, PrintLayoutOptions, PrintPageBreak, PrintPageSize } from "./private-options";'
      )
    );
    assert.throws(
      () => checkExportSources(root),
      /source export origin or type-only mode changed/
    );
  });
});

function identityFixture(routeText) {
  const root = mkdtempSync(join(scratch, "identity-"));
  writeFileSync(join(root, "package.json"), '{"type":"module"}');
  const canonical =
    "export interface Options { filename: string }\nexport function writer(options: Options): string { return options.filename; }";
  writeFileSync(join(root, "canonical.ts"), canonical);
  writeFileSync(join(root, "other.ts"), canonical);
  writeFileSync(join(root, "route.ts"), routeText);
  const file = join(root, "consumer.ts");
  writeFileSync(
    file,
    'import type { Options, writer } from "./canonical.js";\nimport type { Options as ForwardedOptions, writer as forwardedWriter } from "./route.js";'
  );
  const program = ts.createProgram([file], {
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(
    diagnostics.map((item) =>
      ts.flattenDiagnosticMessageText(item.messageText, "\n")
    ),
    []
  );
  return canonicalAliasErrors(program, program.getSourceFile(file), [
    {
      canonical: "./canonical.js",
      route: "./route.js",
      names: ["Options", "writer"],
    },
  ]);
}

describe("canonical declaration and runtime identity", () => {
  it("accepts forwarding the actual canonical symbols", () => {
    assert.deepEqual(identityFixture('export * from "./canonical.js";'), []);
  });

  it("rejects a same-shaped type alias that shadows a canonical interface", () => {
    const errors = identityFixture(
      'import type { Options as CanonicalOptions } from "./canonical.js";\nexport type Options = CanonicalOptions;\nexport { writer } from "./canonical.js";'
    );
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Options no longer resolves to its canonical/);
  });

  it("rejects same-spelled and structurally identical wrong-origin declarations", () => {
    const errors = identityFixture('export * from "./other.js";');
    assert.equal(errors.length, 2);
    assert.ok(
      errors.every((error) =>
        error.includes("no longer resolves to its canonical")
      )
    );
  });

  it("rejects runtime writer replacement even when its signature and result match", () => {
    const writer = () => "pdf";
    const options = { writers: ["writer"], factory: "factory" };
    assert.deepEqual(
      runtimeExportErrors(
        {
          writer,
          factory() {
            return "factory";
          },
        },
        { writer },
        options,
        "entry"
      ),
      []
    );
    assert.match(
      runtimeExportErrors(
        {
          writer: () => "pdf",
          factory() {
            return "factory";
          },
        },
        { writer },
        options,
        "entry"
      )[0],
      /lost canonical runtime identity/
    );
  });

  it("rejects extra runtime values leaking through a type-only source route", () => {
    const writer = () => "pdf";
    const errors = runtimeExportErrors(
      {
        writer,
        factory() {
          return "factory";
        },
        createEngine() {
          return {};
        },
      },
      { writer },
      { writers: ["writer"], factory: "factory" },
      "entry"
    );
    assert.equal(errors.length, 1);
    assert.match(errors[0], /runtime exports differ/);
  });
});

function valuePositionFixture(forwarding) {
  const root = mkdtempSync(join(scratch, "value-position-"));
  writeFileSync(join(root, "package.json"), '{"type":"module"}');
  writeFileSync(
    join(root, "canonical.ts"),
    "export const createExportController = () => 1;"
  );
  writeFileSync(join(root, "route.ts"), forwarding);
  const file = join(root, "consumer.ts");
  writeFileSync(
    file,
    'import { createExportController as controller0 } from "./route.js";\nvoid controller0;'
  );
  const program = ts.createProgram([file], {
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
  });
  return typeOnlyValueErrors(program, file, ["./route.js"]);
}

describe("produced declaration value-position regression", () => {
  it("accepts a type-only route that rejects the core-only runtime value", () => {
    assert.deepEqual(
      valuePositionFixture('export type * from "./canonical.js";'),
      []
    );
  });

  it("rejects an ordinary star that falsely permits the same value import", () => {
    const errors = valuePositionFixture('export * from "./canonical.js";');
    assert.equal(errors.length, 1);
    assert.match(errors[0], /must reject the core-only runtime value import/);
  });
});

function dottedValueFixture(typeOnly) {
  const cell = mkdtempSync(join(scratch, "dotted-value-"));
  const packageRoot = join(cell, "node_modules/@adapttable/vue");
  mkdirSync(join(packageRoot, "dist"), { recursive: true });
  writeFileSync(join(cell, "package.json"), '{"type":"module"}');
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({
      name: "@adapttable/vue",
      type: "module",
      exports: {
        "./feature.v2": {
          import: { types: "./dist/feature.v2.d.ts" },
          require: { types: "./dist/feature.v2.d.cts" },
        },
        "./package.json": "./package.json",
      },
    })
  );
  const entries = publishedBindingEntries(cell);
  assert.deepEqual(entries, ["@adapttable/vue/feature.v2"]);
  return ["ts", "cts"].map((extension) => {
    const runtimeExtension = extension === "ts" ? "js" : "cjs";
    writeFileSync(
      join(packageRoot, `dist/canonical.d.${extension}`),
      "export declare const createExportController: () => number;"
    );
    writeFileSync(
      join(packageRoot, `dist/feature.v2.d.${extension}`),
      `export ${typeOnly ? "type " : ""}* from "./canonical.${runtimeExtension}";`
    );
    const file = join(cell, `consumer.${extension}`);
    writeFileSync(
      file,
      'import { createExportController as controller0 } from "@adapttable/vue/feature.v2";\nvoid controller0;'
    );
    const program = ts.createProgram([file], {
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: [],
    });
    return typeOnlyValueErrors(program, file, entries);
  });
}

describe("published binding entry coverage", () => {
  it("covers exact dotted typed entries and enforces their ESM/CJS value boundary", () => {
    const cell = join(scratch, "dotted-entry");
    const packageRoot = join(cell, "node_modules/@adapttable/vue");
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify({
        exports: {
          ".": {},
          "./features": {},
          "./feature.v2": {
            import: {
              types: "./dist/feature.v2.d.ts",
              default: "./dist/feature.v2.js",
            },
            require: {
              types: "./dist/feature.v2.d.cts",
              default: "./dist/feature.v2.cjs",
            },
          },
          "./package.json": "./package.json",
        },
      })
    );
    assert.deepEqual(publishedBindingEntries(cell), [
      "@adapttable/vue",
      "@adapttable/vue/features",
      "@adapttable/vue/feature.v2",
    ]);
    assert.deepEqual(dottedValueFixture(true), [[], []]);
    for (const errors of dottedValueFixture(false)) {
      assert.equal(errors.length, 1);
      assert.match(
        errors[0],
        /feature.v2.*must reject the core-only runtime value import/
      );
    }
  });
});

function serverQueryFixture(exports) {
  const root = mkdtempSync(join(scratch, "server-query-"));
  const owner = join(root, "node_modules/@adapttable/vue");
  mkdirSync(owner, { recursive: true });
  writeFileSync(
    join(owner, "package.json"),
    JSON.stringify({
      name: "@adapttable/vue",
      types: "./index.d.ts",
    })
  );
  const contract =
    "export type TableQueryHandler = (query: { page: number }) => void;";
  writeFileSync(
    join(owner, "contract.d.ts"),
    contract +
      "\nexport interface UseServerDataOptions<TRow> { rows: readonly TRow[]; onQueryChange?: TableQueryHandler }"
  );
  writeFileSync(join(owner, "copy.d.ts"), contract);
  writeFileSync(join(owner, "index.d.ts"), exports);
  const file = join(root, "consumer.ts");
  writeFileSync(
    file,
    'import type { UseServerDataOptions } from "@adapttable/vue";'
  );
  const program = ts.createProgram([file], {
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
  });
  assert.deepEqual(
    ts.getPreEmitDiagnostics(program).map((item) =>
      ts.flattenDiagnosticMessageText(item.messageText, "\n")
    ),
    []
  );
  return serverQueryHandlerErrors(program, program.getSourceFile(file));
}

describe("root server query callback identity", () => {
  it("accepts the original callback used by the public option member", () => {
    assert.deepEqual(
      serverQueryFixture(
        'export type { TableQueryHandler, UseServerDataOptions } from "./contract";'
      ),
      []
    );
  });

  it("rejects a missing root callback export", () => {
    assert.equal(
      serverQueryFixture(
        'export type { UseServerDataOptions } from "./contract";'
      ).length,
      1
    );
  });

  it("rejects an equally shaped callback from a different declaration", () => {
    assert.equal(
      serverQueryFixture(
        'export type { UseServerDataOptions } from "./contract";\nexport type { TableQueryHandler } from "./copy";'
      ).length,
      1
    );
  });

  it("rejects a public alias that only copies the actual private contract", () => {
    assert.equal(
      serverQueryFixture(
        'export type { UseServerDataOptions } from "./contract";\nimport type { TableQueryHandler as Original } from "./contract";\nexport type TableQueryHandler = Original;'
      ).length,
      1
    );
  });
});
