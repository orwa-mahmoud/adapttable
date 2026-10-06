import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

import {
  classifyForgottenExport,
  entryValueAliases,
  publishedValueAliases,
  summarize,
  VALUE_BACKED,
} from "./api-warnings.mjs";
import { packageDir, REPO_ROOT } from "./packages.mjs";

const CORE_SRC = join(packageDir("core"), "src");

const REACT_SRC = join(packageDir("react"), "src");

/** Every field the classifier reads, with the safe defaults a test overrides. */
const classify = (over) =>
  classifyForgottenExport({
    symbol: "Whatever",
    report: "core-features.api.md",
    isMainEntry: false,
    exports: new Set(),
    ...over,
  });

/**
 * v3 removed the main-entry aliases, and with them the class that deferred
 * the bundler's copies of them. A suffixed symbol in `core.api.md` is now a
 * finding like any other — which is the point: the deferral existed only
 * because two copies of one binding were in the rollup.
 */
describe("the alias deferral is gone", () => {
  it("treats a suffixed symbol in the main report as a finding", () => {
    assert.equal(
      classify({ symbol: "pinnedRowPart$1", report: "core.api.md" }).kind,
      "subpath"
    );
  });

  it("still calls it a front-door finding on the main entry", () => {
    assert.equal(
      classify({
        symbol: "pinnedRowPart$1",
        report: "core.api.md",
        isMainEntry: true,
      }).kind,
      "front-door"
    );
  });
});

describe("the published class", () => {
  it("defers a suffixed copy of a name the same entry exports", () => {
    const verdict = classify({
      symbol: "UseServerDataOptions$1",
      report: "adapter-shadcn.api.md",
      isMainEntry: true,
      exports: new Set(["UseServerDataOptions", "DataTable"]),
    });
    assert.deepEqual(verdict, {
      kind: "published",
      base: "UseServerDataOptions",
      suffix: "$1",
    });
  });

  it("does NOT defer one whose base the entry does not export", () => {
    assert.equal(
      classify({
        symbol: "UseServerDataOptions$1",
        report: "adapter-shadcn.api.md",
        isMainEntry: true,
        exports: new Set(["DataTable"]),
      }).kind,
      "front-door"
    );
  });

  it("does NOT defer an unsuffixed name just because the entry exports it", () => {
    assert.equal(
      classify({
        symbol: "ColumnDef",
        report: "core-pivot.api.md",
        exports: new Set(["ColumnDef"]),
      }).kind,
      "subpath"
    );
  });
});

describe("findings", () => {
  it("calls a forgotten export on a feature subpath a subpath finding", () => {
    assert.equal(
      classify({ symbol: "BulkActionContext", report: "core-features.api.md" })
        .kind,
      "subpath"
    );
  });

  it("calls a forgotten export on core/adapter a subpath finding, not an exemption", () => {
    assert.equal(
      classify({ symbol: "ConfirmRequest", report: "core-adapter.api.md" })
        .kind,
      "subpath"
    );
  });

  it("calls a forgotten export on a package's main entry a front door", () => {
    assert.equal(
      classify({
        symbol: "SavedViewsPanelChromeProps",
        report: "adapter-shadcn.api.md",
        isMainEntry: true,
      }).kind,
      "front-door"
    );
  });
});

describe("summarize", () => {
  it("names every class that occurred, with its count", () => {
    assert.equal(
      summarize({
        published: 1,
        subpath: 149,
        frontDoor: 0,
        unresolvedLink: 27,
        missingReleaseTag: 0,
        other: 0,
      }),
      "api-reports: 1 published-name copy(s), " +
        "149 on a subpath entry, 27 unresolved @link(s)."
    );
  });

  it("never says nothing while a class is held", () => {
    // The failure this replaced: a run reporting only forgotten exports while
    // 27 unresolved links sat outside every figure it printed.
    const line = summarize({ unresolvedLink: 27 });
    assert.match(line, /27 unresolved @link/);
    assert.notEqual(line, "api-reports: no warnings of any class.");
  });

  it("says so plainly when there is genuinely nothing", () => {
    assert.equal(summarize({}), "api-reports: no warnings of any class.");
  });
});

describe("the value-backed class", () => {
  it("defers only the exact report-and-symbol pairs listed", () => {
    for (const [report, symbol] of VALUE_BACKED) {
      assert.equal(
        classify({ symbol, report, isMainEntry: report === "core.api.md" })
          .kind,
        "value-backed",
        `${report} ${symbol}`
      );
    }
  });

  it("does NOT defer the same symbol on a report it is not listed for", () => {
    assert.equal(
      classify({ symbol: "FILTER_TYPES", report: "core-stream.api.md" }).kind,
      "subpath"
    );
  });

  it("does NOT defer a different symbol on a listed report", () => {
    assert.equal(
      classify({ symbol: "SomethingElse", report: "core-query.api.md" }).kind,
      "subpath"
    );
  });

  // The class claims each of these is a runtime value that a public type is
  // derived from. If that stops being true, the reason for the deferral is
  // gone and this fails rather than quietly carrying on.
  it("every listed symbol really is a value a public type is built from", () => {
    // The editable-cell controller moved to the React binding in v3; the
    // constants themselves stayed neutral.
    const sources = [
      join(CORE_SRC, "filters/filterDefs.ts"),
      join(CORE_SRC, "formula/evaluate.ts"),
      join(CORE_SRC, "editing/cellEditing.ts"),
      join(REACT_SRC, "editing/editableCellController.ts"),
    ].map((f) => readFileSync(f, "utf8"));
    const all = sources.join("\n");
    for (const symbol of new Set(VALUE_BACKED.map(([, s]) => s))) {
      const declaresValue = new RegExp(
        `^export (?:declare )?(?:const|function) ${symbol}\\b`,
        "m"
      ).test(all);
      assert.ok(declaresValue, `${symbol} is declared as a value`);
      assert.ok(
        all.includes(`typeof ${symbol}`) ||
          all.includes(`ReturnType<typeof ${symbol}>`),
        `${symbol} has a public type derived from it`
      );
    }
  });
});

const publicValueFixture = `
declare const implementation: <TRow extends { id: string }>(props: {
  rows: readonly TRow[];
  render: (row: TRow) => string;
}) => {
  $slots: { cell: (row: TRow) => string };
  exposed: { reset(): void };
};
declare const local: typeof implementation;
export { local as PublicTable };
`;

function classifyValueSource(source, symbol = "implementation") {
  return classify({
    symbol,
    isMainEntry: true,
    valueAliases: publishedValueAliases(source),
  });
}

describe("the structurally proved published-value-alias class", () => {
  it("proves an aliased runtime export without depending on compiler names", () => {
    assert.deepEqual(
      [...publishedValueAliases(publicValueFixture)],
      [["implementation", "PublicTable"]]
    );
    assert.deepEqual(classifyValueSource(publicValueFixture), {
      kind: "published-value-alias",
      base: "implementation",
      suffix: "",
      exportedAs: "PublicTable",
    });
    const renamed = publicValueFixture.replaceAll(
      "implementation",
      "OtherValue"
    );
    assert.equal(
      classifyValueSource(renamed, "OtherValue").kind,
      "published-value-alias"
    );
  });

  it("proves direct and default runtime exports and multiple exact typeof hops", () => {
    assert.deepEqual(
      [
        ...publishedValueAliases(`
        declare function original<T>(value: T): T;
        declare const middle: typeof original;
        export declare const PublicValue: typeof middle;
      `),
      ],
      [
        ["middle", "PublicValue"],
        ["original", "PublicValue"],
      ]
    );
    assert.deepEqual(
      [
        ...publishedValueAliases(`
        declare class Original { value: string; }
        declare const local: typeof Original;
        export default local;
      `),
      ],
      [["Original", "default"]]
    );
  });

  it("does not use type-only exports as runtime proof", () => {
    for (const ending of [
      "export type { local as PublicTable };",
      "export { type local as PublicTable };",
    ]) {
      assert.equal(
        classifyValueSource(
          publicValueFixture.replace("export { local as PublicTable };", ending)
        ).kind,
        "front-door"
      );
    }
  });

  it("requires a published local runtime value and a declared local target", () => {
    for (const source of [
      "declare const implementation: () => void; declare const local: typeof implementation;",
      "declare const implementation: () => void; export type PublicValue = typeof implementation;",
      "export declare const local: typeof missing;",
      "import { implementation } from 'external'; export declare const local: typeof implementation;",
      "declare const local: typeof implementation; export { local } from 'external';",
      "export { default as PublicValue } from 'external';",
    ]) {
      assert.deepEqual([...publishedValueAliases(source)], []);
    }
  });

  it("rejects cycles rather than publishing a partial chain", () => {
    for (const source of [
      "declare const local: typeof local; export { local };",
      "declare const one: typeof two; declare const two: typeof one; export { one };",
      "declare const one: typeof two; declare const two: typeof missing; export { one };",
    ]) {
      assert.deepEqual([...publishedValueAliases(source)], []);
    }
  });

  it("does not reinterpret parameter, return or member types as value aliases", () => {
    for (const declaration of [
      "export declare const PublicValue: (arg: typeof implementation) => void;",
      "export declare const PublicValue: () => typeof implementation;",
      "export declare const PublicValue: { value: typeof implementation };",
      "export declare const PublicValue: Array<typeof implementation>;",
      "export declare const PublicValue: typeof implementation.member;",
      "export declare const PublicValue: (typeof implementation)['member'];",
      "export declare const PublicValue: typeof implementation<string>;",
    ]) {
      const source = `declare const implementation: unknown; ${declaration}`;
      assert.equal(classifyValueSource(source).kind, "front-door", declaration);
    }
  });

  it("still fails genuine parameter, result and member type holes behind a proven alias", () => {
    const source = `
      interface Argument { id: string; }
      interface Result { value: string; }
      interface Member { extra: string; }
      declare const implementation: (input: Argument) => Result & { member: Member };
      declare const local: typeof implementation;
      export { local as PublicValue };
    `;
    assert.equal(classifyValueSource(source).kind, "published-value-alias");
    for (const symbol of ["Argument", "Result", "Member"]) {
      assert.equal(
        classifyValueSource(source, symbol).kind,
        "front-door",
        symbol
      );
    }
  });

  it("fails closed for malformed or unreadable declarations", () => {
    assert.deepEqual(
      [...publishedValueAliases("export declare const broken: typeof ;")],
      []
    );
    assert.deepEqual(
      [...entryValueAliases(join(tmpdir(), "nonexistent-alias-entry.d.ts"))],
      []
    );
  });

  it("counts the distinct class and retains the export name as evidence", () => {
    assert.equal(
      summarize({ publishedValueAlias: 2 }),
      "api-reports: 2 published-value-alias(es)."
    );
    const generator = readFileSync(
      join(REPO_ROOT, "scripts/api-reports.mjs"),
      "utf8"
    );
    assert.match(
      generator,
      /includeForgottenExports:\s*shouldRetainEntryDeclarations\(\{\s*dir,\s*includeForgottenExports,\s*hasValueAliases: valueAliases.size > 0,\s*\}\)/
    );
    assert.match(generator, /counts.publishedValueAlias \+= 1/);
    assert.match(generator, /published-value-alias evidence:/);
    assert.match(generator, /is nameable as typeof \$\{exportedAs\}/);
  });
});

function extractAliasReport(root, source, report) {
  const entry = join(root, "index.d.ts");
  writeFileSync(entry, source);
  const aliases = entryValueAliases(entry);
  const configuration = ExtractorConfig.prepare({
    configObject: {
      projectFolder: root,
      mainEntryPointFilePath: entry,
      compiler: {
        overrideTsconfig: {
          compilerOptions: {
            lib: ["ES2022"],
            types: [],
            skipLibCheck: true,
            strict: true,
          },
        },
      },
      apiReport: {
        enabled: true,
        includeForgottenExports: aliases.size > 0,
        reportFileName: report,
        reportFolder: root,
        reportTempFolder: join(root, "temp"),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: join(root, "package.json"),
  });
  const forgotten = [];
  const result = Extractor.invoke(configuration, {
    localBuild: true,
    messageCallback(message) {
      if (message.messageId === "ae-forgotten-export")
        forgotten.push(message.text);
    },
  });
  assert.equal(result.succeeded, true);
  assert.ok(forgotten.some((message) => message.includes('"implementation"')));
  return readFileSync(join(root, report), "utf8");
}

describe("reported generic value-alias signatures", () => {
  it("retains the underlying generic props, slots and handle and detects their changes", (t) => {
    const root = mkdtempSync(join(tmpdir(), "adapttable-value-alias-report-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "alias-fixture", version: "1.0.0" })
    );
    const first = extractAliasReport(root, publicValueFixture, "first.api.md");
    assert.match(first, /implementation: <TRow extends/);
    assert.match(first, /rows: readonly TRow\[\]/);
    assert.match(first, /\$slots:/);
    assert.match(first, /cell: \(row: TRow\) => string/);
    assert.match(first, /reset\(\): void/);
    assert.match(first, /PublicTable: typeof implementation/);
    const changed = extractAliasReport(
      root,
      publicValueFixture.replace(
        "rows: readonly TRow[]",
        "rows: readonly [TRow]"
      ),
      "second.api.md"
    );
    assert.match(changed, /rows: readonly \[TRow\]/);
    assert.notEqual(changed, first);
  });
});
