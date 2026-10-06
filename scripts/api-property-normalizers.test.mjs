import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import ts from "typescript";

import {
  classifyForgottenExport,
  entryPropertyNormalizers,
  isClosedPropertyNormalizer,
  publishedPropertyNormalizers,
  publishedValueAliases,
  summarize,
} from "./api-warnings.mjs";
const normalizer =
  "type Normalize<T> = (T extends any ? { [K in keyof T]: T[K]; } : { [K in keyof T as K]: T[K]; }) & {};";
const value =
  "declare const implementation: <R>(props: Normalize<R>) => R; declare const alias: typeof implementation; export { alias as Component };";
const fixture = (definition = normalizer, body = value) =>
  `${definition}\n${body}`;
const classified = (source, symbol) =>
  classifyForgottenExport({
    symbol,
    report: "test.api.md",
    isMainEntry: true,
    exports: new Set(),
    valueAliases: publishedValueAliases(source),
    propertyNormalizers: publishedPropertyNormalizers(source),
  });
test("proves only a complete bound normalizer used by a published value alias", () => {
  assert.deepEqual(
    [...publishedPropertyNormalizers(fixture())],
    [["Normalize", { exportedAs: "Component", referencedBy: "implementation" }]]
  );
  assert.equal(
    classified(fixture(), "Normalize").kind,
    "published-property-normalizer"
  );
  const renamed = fixture()
    .replaceAll("Normalize", "DisplayObject")
    .replaceAll("T", "Input")
    .replaceAll("K", "Property");
  assert.ok(publishedPropertyNormalizers(renamed).has("DisplayObject"));
  assert.equal(entryPropertyNormalizers("/missing/entry.d.ts").size, 0);
  assert.match(
    summarize({ publishedPropertyNormalizer: 1 }),
    /1 published property normalizer/
  );
});
const rejected = [
  [
    "required semantic field",
    normalizer.replace("& {}", "& { required: string }"),
  ],
  [
    "optional semantic field",
    normalizer.replace("& {}", "& { hint?: string }"),
  ],
  [
    "hidden field dependency",
    normalizer.replace("& {}", "& { hidden: Domain }"),
  ],
  ["value substitution", normalizer.replaceAll("T[K]", "string")],
  ["hidden value dependency", normalizer.replaceAll("T[K]", "Domain")],
  ["hidden indexed value", normalizer.replaceAll("T[K]", "Domain[K]")],
  ["wrong indexed key", normalizer.replaceAll("T[K]", 'T["secret"]')],
  [
    "removed keys",
    normalizer.replaceAll("keyof T", 'Exclude<keyof T, "secret">'),
  ],
  ["added keys", normalizer.replaceAll("keyof T", 'keyof T | "new"')],
  ["unknown keys", normalizer.replaceAll("keyof T", "string")],
  ["renamed keys", normalizer.replace("as K", 'as "fixed"')],
  [
    "filtered keys",
    normalizer.replace("as K", 'as K extends "secret" ? never : K'),
  ],
  ["templated keys", normalizer.replace("as K", "as `prefix_${K & string}`")],
  ["mutable coercion", normalizer.replace("{ [K", "{ -readonly [K")],
  ["readonly coercion", normalizer.replace("{ [K", "{ readonly [K")],
  ["optional coercion", normalizer.replace("]: T[K]", "]?: T[K]")],
  ["required coercion", normalizer.replace("]: T[K]", "]-?: T[K]")],
  ["generic constraint", normalizer.replace("<T>", "<T extends Domain>")],
  ["generic default", normalizer.replace("<T>", "<T = Domain>")],
  ["additional generic", normalizer.replace("<T>", "<T, Other>")],
  [
    "literal conditional domain",
    normalizer.replace("extends any", "extends Domain"),
  ],
  [
    "conditional narrowing",
    normalizer.replace("extends any", "extends object"),
  ],
  [
    "changed branch identity",
    normalizer.replace("extends any", "extends unknown"),
  ],
  [
    "private alternate branch",
    normalizer.replace("{ [K in keyof T as K]: T[K]; }", "Domain"),
  ],
  ["extra intersection", normalizer.replace("& {}", "& {} & Domain")],
  ["union branch", normalizer.replace("& {}", "| {}")],
  ["indirect helper", "type Normalize<T> = Other<T>;"],
  ["unbound identifier", normalizer.replace("<T>", "<Input>")],
];
for (const [name, definition] of rejected)
  test(`rejects ${name}`, () => {
    assert.equal(publishedPropertyNormalizers(fixture(definition)).size, 0);
    assert.equal(
      classified(fixture(definition), "Normalize").kind,
      "front-door"
    );
  });
test("does not infer helper eligibility from a spelling, sibling declaration, or type-only export", () => {
  assert.equal(
    publishedPropertyNormalizers(
      "type __VLS_PrettifyLocal<T> = T & { secret: string };\n" + value
    ).size,
    0
  );
  assert.equal(
    publishedPropertyNormalizers(
      fixture(normalizer, "export interface Public { value: string };")
    ).size,
    0
  );
  assert.equal(
    publishedPropertyNormalizers(
      fixture(
        normalizer,
        value.replace("export { alias", "export type { alias")
      )
    ).size,
    0
  );
  assert.equal(
    publishedPropertyNormalizers(
      fixture(
        normalizer,
        "declare const hidden: (props: Normalize<string>) => void; declare const publicValue: () => void; declare const alias: typeof publicValue; export {alias};"
      )
    ).size,
    0
  );
  assert.equal(
    publishedPropertyNormalizers(fixture() + "\ntype broken = ;").size,
    0
  );
  assert.equal(
    isClosedPropertyNormalizer(
      ts.createSourceFile("x.ts", "interface Public {}", 99, true).statements[0]
    ),
    false
  );
});
test("rejects shadowed bindings and duplicate declarations instead of trusting their spelling", () => {
  assert.equal(
    publishedPropertyNormalizers(fixture(normalizer.replaceAll("K", "T"))).size,
    0
  );
  assert.equal(
    publishedPropertyNormalizers(
      fixture(normalizer + "\ninterface Normalize { secret: Domain; }")
    ).size,
    0
  );
  assert.equal(
    publishedPropertyNormalizers(
      fixture(normalizer + "\ntype Normalize<T> = Domain;")
    ).size,
    0
  );
  assert.equal(
    publishedPropertyNormalizers(
      fixture(normalizer, value.replace("<R>", "<R, Normalize>"))
    ).size,
    0
  );
});
const componentFixture = readFileSync(
  new URL("./fixtures/generic-component-normalizer.txt", import.meta.url),
  "utf8"
);
test("proves the minimal generic component fixture independently of a compiler prefix", () => {
  assert.deepEqual(
    [...publishedPropertyNormalizers(componentFixture)],
    [["Normalize", { exportedAs: "Table", referencedBy: "generic" }]]
  );
});
function temporaryPackage(t) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-property-normalizer-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "normalizer-fixture", version: "1.0.0" })
  );
  return root;
}
function extract(root, name, source) {
  const path = join(root, `${name}.d.ts`);
  writeFileSync(path, source);
  const reports = root;
  const messages = [];
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: root,
      mainEntryPointFilePath: path,
      apiReport: {
        enabled: true,
        includeForgottenExports: true,
        reportFileName: `${name}.api.md`,
        reportFolder: reports,
        reportTempFolder: join(reports, "temp"),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      compiler: {
        overrideTsconfig: {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            skipLibCheck: true,
            types: [],
          },
        },
      },
      messages: {
        extractorMessageReporting: {
          "ae-forgotten-export": { logLevel: "warning" },
          default: { logLevel: "warning" },
        },
      },
    },
    configObjectFullPath: undefined,
    packageJsonFullPath: join(root, "package.json"),
  });
  const result = Extractor.invoke(config, {
    localBuild: true,
    showVerboseMessages: false,
    messageCallback: (message) => {
      if (message.messageId === "ae-forgotten-export")
        messages.push(message.text);
    },
  });
  assert.equal(result.succeeded, true);
  return {
    report: readFileSync(join(reports, `${name}.api.md`), "utf8"),
    messages,
  };
}
test("AE still reports private parameter/result types and retains exact helper plus generic signature", (t) => {
  const source = fixture(
    normalizer + "\ninterface Domain { privateValue: string; }",
    value
      .replace("props: Normalize<R>", "props: Normalize<R & Domain>")
      .replace("=> R;", "=> Domain;")
  );
  const result = extract(temporaryPackage(t), "private-domain", source);
  assert.ok(result.messages.some((message) => message.includes('"Domain"')));
  assert.equal(classified(source, "Domain").kind, "front-door");
  assert.match(result.report, /type Normalize<T> = \(T extends any/);
  assert.match(result.report, /props: Normalize<R & Domain>/);
  assert.match(result.report, /privateValue: string/);
});
test("reports retain normalizers and all generic props, slots, emits and exposed members", (t) => {
  const root = temporaryPackage(t);
  const result = extract(root, "generic-component", componentFixture);
  assert.match(result.report, /type Normalize<T> = \(T extends any/);
  assert.match(result.report, /const generic: <Row>/);
  assert.match(result.report, /readonly rows: readonly Row\[\]/);
  assert.match(result.report, /readonly rowKey: \(row: Row\) => string/);
  assert.match(result.report, /slots: CellSlots<Row>/);
  assert.match(result.report, /event: "update:selection", ids: string\[\]/);
  assert.match(result.report, /expose: \(handle: Exposed<Row>\) => void/);
  const privateNames = result.messages
    .map((message) => /"([^"]+)"/.exec(message)?.[1])
    .filter(Boolean);
  assert.deepEqual(privateNames.sort(), ["Normalize", "generic"].sort());
  assert.ok(
    privateNames.every((name) =>
      classified(componentFixture, name).kind.startsWith("published-")
    )
  );
  const changed = extract(
    root,
    "changed-component",
    componentFixture
      .replace(
        "readonly rows: readonly Row[]",
        "readonly rows?: readonly Row[]"
      )
      .replace(
        "cell: (context: { readonly row: Row }) => string",
        "cell: (context: { readonly row: Row; readonly index: number }) => string"
      )
  );
  assert.match(changed.report, /readonly rows\?: readonly Row\[\]/);
  assert.match(changed.report, /readonly index: number/);
  assert.notEqual(changed.report, result.report);
});
test("keeps the normalizer warning visible and counts its distinct structural evidence", () => {
  const generator = readFileSync(
    new URL("./api-reports.mjs", import.meta.url),
    "utf8"
  );
  assert.match(
    generator,
    /includeForgottenExports: includeForgottenExports \|\| valueAliases.size > 0/
  );
  assert.match(generator, /counts.publishedPropertyNormalizer \+= 1/);
  assert.match(generator, /published-property-normalizer evidence:/);
  const handler = generator.slice(
    generator.indexOf('if (kind === "published-property-normalizer")'),
    generator.indexOf('if (kind === "value-backed")')
  );
  assert.doesNotMatch(handler, /message\.logLevel\s*=/);
  assert.match(handler, /exact definition retained/);
});
