import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";

import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import ts from "typescript";

import { entryValueGraph } from "./api-value-graph.mjs";
import { classifyForgottenExport, entryExports } from "./api-warnings.mjs";

const normalizer =
  "type Normalize<T> = (T extends any ? { [K in keyof T]: T[K]; } : { [K in keyof T as K]: T[K]; }) & {};";
const generic = `
${normalizer}
declare const implementation: <Row>(props: Normalize<{ rows: readonly Row[] }>, slots: { cell(row: Row): string }, ref: { reset(): void }) => { emit(event: "select", row: Row): void };
declare const local: typeof implementation;
export { local as d };
`;
function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-value-graph-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "value-graph-fixture", version: "1.0.0" })
  );
  return { root, entry: join(root, "entry.d.ts") };
}
function extract(
  paths,
  graph = entryValueGraph(paths.entry, paths.root),
  { allowFailure = false } = {}
) {
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: paths.root,
      mainEntryPointFilePath: paths.entry,
      apiReport: {
        enabled: true,
        includeForgottenExports: graph.size > 0,
        reportFileName: "fixture.api.md",
        reportFolder: paths.root,
        reportTempFolder: join(paths.root, "temp"),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      compiler: {
        overrideTsconfig: {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022"],
            types: [],
            strict: true,
            skipLibCheck: true,
            module: "ESNext",
            moduleResolution: "bundler",
          },
        },
      },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: join(paths.root, "package.json"),
  });
  const messages = [];
  let result;
  try {
    result = Extractor.invoke(config, {
      localBuild: true,
      messageCallback(message) {
        if (message.messageId === "ae-forgotten-export") messages.push(message);
        message.handled = true;
      },
    });
  } catch (error) {
    if (!allowFailure) throw error;
    return { graph, failed: true, error };
  }
  if (allowFailure && !result.succeeded) return { graph, failed: true };
  assert.equal(result.succeeded, true);
  const report = readFileSync(join(paths.root, "fixture.api.md"), "utf8");
  const match = graph.forReport(report);
  const verdicts = messages.map((message) => {
    const symbol = /"([A-Za-z_$][\w$]*)"/.exec(message.text)?.[1];
    const proof = match(message, symbol);
    return {
      message,
      symbol,
      proof,
      kind: classifyForgottenExport({
        symbol,
        report: "fixture.api.md",
        isMainEntry: true,
        exports: entryExports(paths.entry),
        valueAliases:
          proof?.kind === "published-value-alias"
            ? new Map([[symbol, proof.exportedAs]])
            : new Map(),
        propertyNormalizers:
          proof?.kind === "published-property-normalizer"
            ? new Map([[symbol, proof]])
            : new Map(),
      }).kind,
    };
  });
  return { report, verdicts, graph };
}

function importedGeneric(t, body = generic) {
  return fixture(t, {
    "entry.d.ts": 'export { Named as PublicTable } from "./bridge.js";',
    "bridge.d.ts":
      'import { d as local } from "./component.js"; export { local as Named };',
    "component.d.ts": body,
  });
}

test("real multi-module runtime paths retain full generic props, slots, refs and the exact normalizer", (t) => {
  const paths = importedGeneric(t);
  const result = extract(paths);
  assert.equal(result.graph.size, 1);
  assert.deepEqual(
    result.verdicts.map(({ symbol, kind }) => [symbol, kind]).sort(),
    [
      ["implementation", "published-value-alias"],
      ["Normalize", "published-property-normalizer"],
    ].sort()
  );
  assert.match(result.report, /const implementation: <Row>/);
  assert.match(result.report, /rows: readonly Row\[\]/);
  assert.match(result.report, /cell\(row: Row\): string/);
  assert.match(result.report, /reset\(\): void/);
  assert.match(result.report, /emit\(event: "select", row: Row\): void/);
  assert.match(result.report, /const PublicTable: typeof implementation/);
  const changed = extract(
    importedGeneric(
      t,
      generic.replace("rows: readonly Row[]", "rows: readonly [Row]")
    )
  );
  assert.notEqual(changed.report, result.report);
  assert.match(changed.report, /rows: readonly \[Row\]/);
});

test("actual Extractor renaming is joined through public report edges, never suffix guesses", (t) => {
  const result = extract(
    fixture(t, {
      "entry.d.ts":
        'export { d as First } from "./first.js"; export { d as Second } from "./second.js";',
      "first.d.ts": generic,
      "second.d.ts": generic.replace('"select"', '"change"'),
    })
  );
  const aliases = result.verdicts.filter(
    ({ kind }) => kind === "published-value-alias"
  );
  assert.equal(aliases.length, 2);
  assert.equal(new Set(aliases.map(({ proof }) => proof.identity)).size, 2);
  assert.ok(aliases.some(({ symbol }) => symbol !== "implementation"));
  assert.equal(
    result.verdicts.filter(
      ({ kind }) => kind === "published-property-normalizer"
    ).length,
    2
  );
  assert.ok(result.verdicts.every(({ kind }) => kind.startsWith("published-")));
});

test("private parameters, results and members remain failures behind the public runtime chain", (t) => {
  const paths = importedGeneric(
    t,
    `
interface Argument { id: string }
interface Result { value: string }
interface Member { extra: string }
declare const implementation: (input: Argument) => Result & { member: Member };
declare const local: typeof implementation;
export { local as d };
`
  );
  const result = extract(paths);
  assert.equal(
    result.verdicts.find(({ symbol }) => symbol === "implementation")?.kind,
    "published-value-alias"
  );
  for (const name of ["Argument", "Result", "Member"])
    assert.equal(
      result.verdicts.find(({ symbol }) => symbol === name)?.kind,
      "front-door",
      name
    );
});

for (const [name, bridge] of [
  [
    "type-only import clause",
    'import type { d as local } from "./component.js"; export { local as Named };',
  ],
  [
    "type-only import specifier",
    'import { type d as local } from "./component.js"; export { local as Named };',
  ],
  [
    "type-only export clause",
    'import { d as local } from "./component.js"; export type { local as Named };',
  ],
  [
    "type-only export specifier",
    'import { d as local } from "./component.js"; export { type local as Named };',
  ],
  ["type-only re-export", 'export type { d as Named } from "./component.js";'],
])
  test(`rejects ${name} in a real module path`, (t) => {
    const paths = importedGeneric(t);
    writeFileSync(join(paths.root, "bridge.d.ts"), bridge);
    const result = extract(paths);
    assert.equal(result.graph.size, 0);
    assert.ok(result.verdicts.some(({ kind }) => kind === "front-door"));
    assert.ok(result.verdicts.every(({ proof }) => proof === undefined));
  });

for (const [name, body] of [
  [
    "missing target",
    "declare const implementation: typeof missing; declare const local: typeof implementation; export { local as d };",
  ],
  [
    "value cycle",
    "declare const local: typeof middle; declare const middle: typeof local; export { local as d };",
  ],
  [
    "self cycle",
    "declare const implementation: typeof implementation; declare const local: typeof implementation; export { local as d };",
  ],
  [
    "duplicate declaration",
    "declare const implementation: () => void; declare const implementation: (secret: string) => void; declare const local: typeof implementation; export { local as d };",
  ],
])
  test(`does not prove a ${name}`, (t) => {
    const paths = importedGeneric(t, body);
    const graph = entryValueGraph(paths.entry, paths.root);
    assert.equal(graph.size, 0);
    const result = extract(paths, graph, { allowFailure: true });
    if (!result.failed) {
      assert.ok(result.verdicts.some(({ kind }) => kind === "front-door"));
      assert.ok(result.verdicts.every(({ proof }) => proof === undefined));
    }
  });

test("an import/re-export cycle and absent local module have no partial proof", (t) => {
  for (const files of [
    {
      "entry.d.ts": 'export { local as Public } from "./one.js";',
      "one.d.ts": 'export { local } from "./two.js";',
      "two.d.ts": 'export { local } from "./one.js";',
    },
    { "entry.d.ts": 'export { local as Public } from "./absent.js";' },
  ]) {
    const paths = fixture(t, files);
    assert.equal(entryValueGraph(paths.entry, paths.root).size, 0);
  }
});

test("same-spelled private declarations in other chunks cannot borrow runtime proof", (t) => {
  const result = extract(
    fixture(t, {
      "entry.d.ts":
        'export { d as Public } from "./good.js"; export { take } from "./bad.js";',
      "good.d.ts":
        "declare const implementation: <Row>(row: Row) => Row; declare const local: typeof implementation; export { local as d };",
      "bad.d.ts":
        "interface implementation { secret: string } declare function take(input: implementation): void; export { take };",
    })
  );
  const good = result.verdicts.filter(({ message }) =>
    message.sourceFilePath.endsWith("good.d.ts")
  );
  const bad = result.verdicts.filter(({ message }) =>
    message.sourceFilePath.endsWith("bad.d.ts")
  );
  assert.equal(good.length, 1);
  assert.equal(good[0].kind, "published-value-alias");
  assert.equal(bad.length, 1);
  assert.equal(bad[0].kind, "front-door");
  assert.equal(bad[0].proof, undefined);
});

function vlq(value) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let number = value < 0 ? -value * 2 + 1 : value * 2;
  let result = "";
  do {
    const digit = number % 32;
    number = Math.floor(number / 32);
    result += alphabet[digit + (number ? 32 : 0)];
  } while (number);
  return result;
}
function mapped(paths, name, duplicate = false, sourceName = "origin.vue") {
  const file = join(paths.root, name);
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const points = new Map();
  function visit(node) {
    const position = source.getLineAndCharacterOfPosition(
      node.getStart(source)
    );
    if (!points.has(position.line)) points.set(position.line, new Set());
    points.get(position.line).add(position.character);
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(source, visit);
  const mappings = [];
  for (
    let line = 0;
    line < source.getLineAndCharacterOfPosition(source.end).line + 1;
    line++
  ) {
    let previous = 0;
    const segments = [];
    for (const column of [...(points.get(line) ?? [])].sort((a, b) => a - b)) {
      segments.push(`${vlq(column - previous)}AAA`);
      if (duplicate) segments.push("AAAC", "AAAD");
      previous = column;
    }
    mappings.push(segments.join(","));
  }
  writeFileSync(join(paths.root, "origin.vue"), "x\n");
  writeFileSync(
    `${file}.map`,
    JSON.stringify({
      version: 3,
      file: name,
      sources: [sourceName],
      names: [],
      mappings: mappings.join(";"),
    })
  );
}

test("coincident source-map origins still keep a same-spelled private chunk failing", (t) => {
  const paths = fixture(t, {
    "entry.d.ts":
      'export { d as Public } from "./good.js"; export { take } from "./bad.js";',
    "good.d.ts":
      "declare const implementation: <Row>(row: Row) => Row; declare const local: typeof implementation; export { local as d };",
    "bad.d.ts":
      "interface implementation { secret: string } declare function take(input: implementation): void; export { take };",
  });
  mapped(paths, "good.d.ts");
  mapped(paths, "bad.d.ts");
  const result = extract(paths);
  assert.ok(
    result.verdicts.every(({ message }) =>
      message.sourceFilePath.endsWith("origin.vue")
    )
  );
  assert.equal(
    result.verdicts.filter(({ kind }) => kind === "published-value-alias")
      .length,
    1
  );
  assert.equal(
    result.verdicts.filter(({ kind }) => kind === "front-door").length,
    1
  );
});

test("missing or ambiguous declaration maps never fall back to name-only proof", (t) => {
  for (const mode of ["missing", "ambiguous", "outside", "inexact"]) {
    const paths = importedGeneric(
      t,
      generic + "\n//# sourceMappingURL=component.d.ts.map\n"
    );
    if (mode === "ambiguous") mapped(paths, "component.d.ts", true);
    if (mode === "outside") {
      const outside = join(dirname(paths.root), `${basename(paths.root)}.vue`);
      writeFileSync(outside, "x\n");
      t.after(() => rmSync(outside));
      mapped(paths, "component.d.ts", false, `../${basename(outside)}`);
    }
    if (mode === "inexact") {
      mapped(paths, "component.d.ts");
      const file = `${join(paths.root, "component.d.ts")}.map`;
      const map = JSON.parse(readFileSync(file, "utf8"));
      map.mappings = "AAAA";
      writeFileSync(file, JSON.stringify(map));
    }
    const result = extract(paths);
    assert.ok(result.verdicts.length > 0);
    assert.ok(result.verdicts.every(({ proof }) => proof === undefined));
  }
});

test("a renamed report cannot replace the retained generic value with an opaque signature", (t) => {
  const paths = importedGeneric(t);
  const { graph, report, verdicts } = extract(paths);
  const message = verdicts.find(
    ({ kind }) => kind === "published-value-alias"
  ).message;
  const source = ts.createSourceFile(
    "report.d.ts",
    /```ts\r?\n([\s\S]*?)\r?\n```/.exec(report)[1],
    ts.ScriptTarget.Latest,
    true
  );
  const declaration = source.statements.find(
    (node) =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations[0].name.text === "implementation"
  ).declarationList.declarations[0];
  const weakened = report.replace(declaration.type.getText(source), "any");
  assert.equal(graph.forReport(weakened)(message), undefined);
  assert.equal(
    graph.forReport(report.replace("typeof implementation", "typeof missing"))(
      message
    ),
    undefined
  );
});

test("a closed helper in another chunk cannot lend proof to a same-spelled domain helper", (t) => {
  const result = extract(
    fixture(t, {
      "entry.d.ts":
        'export { d as First } from "./good.js"; export { d as Second } from "./bad.js";',
      "good.d.ts": generic,
      "bad.d.ts": generic.replace(
        normalizer,
        "type Normalize<T> = T & { secret: string };"
      ),
    })
  );
  assert.equal(
    result.verdicts.filter(({ kind }) => kind === "published-value-alias")
      .length,
    2
  );
  assert.equal(
    result.verdicts.filter(
      ({ kind }) => kind === "published-property-normalizer"
    ).length,
    1
  );
  const privateHelpers = result.verdicts.filter(
    ({ kind }) => kind === "front-door"
  );
  assert.equal(privateHelpers.length, 1);
  assert.ok(privateHelpers[0].message.sourceFilePath.endsWith("bad.d.ts"));
});

test("a whole function alias retains parameters and generic bounds", (t) => {
  const paths = importedGeneric(
    t,
    `
    declare function implementation<Row extends { id: string }>(row: Row): Row;
    declare const local: typeof implementation;
    export { local as d };
  `
  );
  const { graph, report, verdicts } = extract(paths);
  const message = verdicts.find(
    ({ kind }) => kind === "published-value-alias"
  ).message;
  assert.equal(
    graph.forReport(report.replace("row: Row", "row: any"))(message),
    undefined
  );
  assert.equal(
    graph.forReport(report.replace("id: string", "id: any"))(message),
    undefined
  );
});

test("relative imports escaping the package and external package imports prove nothing", (t) => {
  const paths = fixture(t, {
    "pkg/entry.d.ts": 'export { local as Public } from "../outside.js";',
    "outside.d.ts":
      "declare const implementation: () => void; declare const local: typeof implementation; export { local };",
  });
  const entry = join(paths.root, "pkg", "entry.d.ts");
  assert.equal(entryValueGraph(entry, dirname(entry)).size, 0);
  writeFileSync(
    entry,
    'import { local } from "external"; export { local as Public };'
  );
  assert.equal(entryValueGraph(entry, dirname(entry)).size, 0);
});

test("a local type/value namespace collision cannot defer the private type", (t) => {
  const paths = importedGeneric(
    t,
    `
    interface implementation { secret: string }
    declare const implementation: <Row>(row: Row) => Row;
    declare const local: typeof implementation;
    declare function take(input: implementation): void;
    export { local as d, take };
  `
  );
  writeFileSync(
    join(paths.root, "bridge.d.ts"),
    'export { d as Named, take } from "./component.js";'
  );
  writeFileSync(
    paths.entry,
    'export { Named as PublicTable, take } from "./bridge.js";'
  );
  const result = extract(paths);
  assert.equal(result.graph.size, 0);
  assert.ok(result.verdicts.some(({ kind }) => kind === "front-door"));
  assert.ok(result.verdicts.every(({ proof }) => proof === undefined));
});

test("multiple closed helpers are paired by complete reference positions, including same-origin unrelated helpers", (t) => {
  const paths = importedGeneric(
    t,
    `
    ${normalizer}
    ${normalizer.replaceAll("Normalize", "Other")}
    ${normalizer.replaceAll("Normalize", "Unrelated")}
    declare const implementation: <Row>(first: Normalize<{ first: Row }>, second: Other<{ second: Row }>) => Row;
    declare const local: typeof implementation;
    declare function privateUse(input: Unrelated<{ secret: string }>): void;
    export { local as d, privateUse };
  `
  );
  writeFileSync(
    join(paths.root, "bridge.d.ts"),
    'export { d as Named, privateUse } from "./component.js";'
  );
  writeFileSync(
    paths.entry,
    'export { Named as PublicTable, privateUse } from "./bridge.js";'
  );
  mapped(paths, "component.d.ts");
  const { graph, verdicts } = extract(paths);
  const helpers = graph.paths[0].edges[0].normalizers;
  for (const name of ["Normalize", "Other"]) {
    const verdict = verdicts.find(({ symbol }) => symbol === name);
    assert.equal(verdict.kind, "published-property-normalizer", name);
    assert.equal(
      verdict.proof.identity,
      helpers.find(({ helper }) => helper.name === name).helper.id
    );
  }
  const unrelated = verdicts.find(({ symbol }) => symbol === "Unrelated");
  assert.equal(unrelated.kind, "front-door");
  assert.equal(unrelated.proof, undefined);
});

test("malformed declarations and fresh reports fail closed through public syntactic diagnostics", (t) => {
  const invalid = importedGeneric(t, generic + "\ntype Broken = ;");
  assert.equal(entryValueGraph(invalid.entry, invalid.root).size, 0);
  const valid = importedGeneric(t);
  const { graph, report, verdicts } = extract(valid);
  const message = verdicts.find(
    ({ kind }) => kind === "published-value-alias"
  ).message;
  const malformed = report.replace(
    /\r?\n```[\r\n]*$/,
    "\ntype Broken = ;\n```\n"
  );
  assert.notEqual(malformed, report);
  assert.equal(graph.forReport(malformed)(message), undefined);
});
