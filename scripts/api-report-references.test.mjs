import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { missingDeferredReportTargets } from "./api-report-references.mjs";

const report = (code) => "## API Report\n\n```ts\n" + code + "\n```\n";
const check = (code, bases = ["StaticTableFeature"]) =>
  missingDeferredReportTargets(report(code), new Set(bases));

describe("deferred generated references in API reports", () => {
  it("rejects the extracted assistant alias with no declaration or import", () => {
    assert.deepEqual(
      check(`
      export type StaticTableFeature = StaticTableFeature_2;
      export function createFeature(): StaticTableFeature;
    `),
      [
        {
          symbol: "StaticTableFeature_2",
          reason: "missing import or declaration",
        },
      ]
    );
  });
  it("does not use an unrelated suffix as evidence for the missing target", () => {
    assert.equal(
      check(`
      interface StaticTableFeature_99 { id: string }
      export type StaticTableFeature = StaticTableFeature_2;
    `)[0]?.symbol,
      "StaticTableFeature_2"
    );
  });
  it("accepts exact renamed imports and retained local definitions", () => {
    for (const definition of [
      `import type { StaticTableFeature as StaticTableFeature_2 } from "@adapttable/vue/features";`,
      `interface StaticTableFeature_2 { readonly id: string }`,
    ])
      assert.deepEqual(
        check(
          `${definition}\nexport type StaticTableFeature = StaticTableFeature_2;`
        ),
        []
      );
  });
  it("accepts full generic contracts and lexical generic shadowing", () => {
    assert.deepEqual(
      check(`
      interface StaticTableFeature_2<T> { mount: (row: T) => void }
      export type StaticTableFeature<T> = StaticTableFeature_2<T>;
    `),
      []
    );
    assert.deepEqual(
      check(`
      export type StaticTableFeature<StaticTableFeature_2> = StaticTableFeature_2;
    `),
      []
    );
  });
  it("follows exact aliases and rejects cycles without rejecting structural recursion", () => {
    assert.equal(
      check(`
      export type StaticTableFeature = StaticTableFeature_2;
      type StaticTableFeature_2 = StaticTableFeature;
    `)[0]?.reason,
      "alias cycle"
    );
    assert.deepEqual(
      check(`
      export type StaticTableFeature = StaticTableFeature_2;
      interface StaticTableFeature_2 { next?: StaticTableFeature }
    `),
      []
    );
  });
  it("checks typeof targets as well as type-only references", () => {
    assert.equal(
      check(`export type Factory = typeof render_2;`, ["render"])[0]?.symbol,
      "render_2"
    );
    assert.deepEqual(
      check(
        `
      declare function render_2<T>(row: T): T;
      export type Factory = typeof render_2;
    `,
        ["render"]
      ),
      []
    );
  });
  it("resolves standard language globals without treating local aliases as globals", () => {
    assert.deepEqual(
      check(`
      type StaticTableFeature_2<T> = Readonly<T>;
      export type StaticTableFeature<T> = StaticTableFeature_2<T>;
    `),
      []
    );
    assert.equal(
      check(
        `
      type Date = Date_2;
      type Date_2 = Date;
    `,
        ["Date"]
      )[0]?.reason,
      "alias cycle"
    );
  });
  it("does not hide a dangling intermediate alias", () => {
    assert.equal(
      check(`
      type StaticTableFeature_2 = Missing;
      export type StaticTableFeature = StaticTableFeature_2;
    `)[0]?.symbol,
      "Missing"
    );
  });
  it("fails closed on malformed reports and ignores unrelated warning classes", () => {
    assert.equal(
      missingDeferredReportTargets("not a report", new Set(["A"]))[0]?.reason,
      "missing or invalid TypeScript"
    );
    assert.deepEqual(
      missingDeferredReportTargets("not a report", new Set()),
      []
    );
    assert.deepEqual(check("export type Other = Other_2;"), []);
  });
});

describe("lexical reference resolution", () => {
  it("keeps sibling and nested generics from hiding a missing outer name", () => {
    for (const code of [
      "export interface StaticTableFeature { valid: <StaticTableFeature_2>(x: StaticTableFeature_2) => void; broken: StaticTableFeature_2 }",
      "export type StaticTableFeature<T> = T extends infer StaticTableFeature_2 ? StaticTableFeature_2 : StaticTableFeature_2;",
      "export type StaticTableFeature<T> = { [StaticTableFeature_2 in keyof T]: T[StaticTableFeature_2] } & { broken: StaticTableFeature_2 };",
    ])
      assert.equal(check(code)[0]?.symbol, "StaticTableFeature_2");
  });
  it("recognizes mapped and infer names only where they are bound", () => {
    for (const code of [
      "export type StaticTableFeature<T> = { [StaticTableFeature_2 in keyof T]: T[StaticTableFeature_2] };",
      "export type StaticTableFeature<T> = T extends infer StaticTableFeature_2 ? StaticTableFeature_2 : never;",
      "export type StaticTableFeature = <StaticTableFeature_2>(value: StaticTableFeature_2) => StaticTableFeature_2;",
      "export declare function StaticTableFeature(StaticTableFeature_2: string): typeof StaticTableFeature_2;",
    ])
      assert.deepEqual(check(code), []);
  });
  it("does not confuse type, value or namespace declarations", () => {
    for (const code of [
      "export type StaticTableFeature<StaticTableFeature_2> = typeof StaticTableFeature_2;",
      "interface StaticTableFeature_2 {} export type StaticTableFeature = typeof StaticTableFeature_2;",
      "declare const StaticTableFeature_2: string; export type StaticTableFeature = StaticTableFeature_2;",
      "interface StaticTableFeature_2 {} export type StaticTableFeature = StaticTableFeature_2.Member;",
      "type StaticTableFeature_2 = typeof Readonly; export type StaticTableFeature = StaticTableFeature_2;",
    ])
      assert.ok(check(code).length > 0, code);
  });
  it("follows aliases in their declaration scopes", () => {
    assert.equal(
      check(
        "type StaticTableFeature_2 = Missing; export type StaticTableFeature<Missing> = StaticTableFeature_2;"
      )[0]?.symbol,
      "Missing"
    );
    assert.deepEqual(
      check(
        "type StaticTableFeature_2<T> = T; export type StaticTableFeature = StaticTableFeature_2<string>;"
      ),
      []
    );
  });
  it("uses real language globals including DOM and utility types", () => {
    for (const type of [
      "Readonly<{ id: string }>",
      "Promise<string>",
      "Event",
      "typeof Symbol",
      "Iterator<string>",
      "Uppercase<'value'>",
    ])
      assert.deepEqual(
        check(
          `type StaticTableFeature_2 = ${type}; export type StaticTableFeature = StaticTableFeature_2;`
        ),
        []
      );
  });
  it("accepts exact imports and checks generated namespace and heritage roots", () => {
    for (const declaration of [
      "import StaticTableFeature_2 from 'external';",
      "import { Other as StaticTableFeature_2 } from 'external';",
      "import StaticTableFeature_2 = require('external');",
    ])
      assert.deepEqual(
        check(
          `${declaration} export type StaticTableFeature = StaticTableFeature_2;`
        ),
        []
      );
    assert.deepEqual(
      check(
        "import * as StaticTableFeature_2 from 'external'; export type StaticTableFeature = StaticTableFeature_2.Member;"
      ),
      []
    );
    for (const code of [
      "export interface StaticTableFeature extends StaticTableFeature_2 {}",
      "export class StaticTableFeature extends StaticTableFeature_2 {}",
      "export type StaticTableFeature = StaticTableFeature_2.Member;",
      "export type StaticTableFeature = typeof StaticTableFeature_2.member;",
    ])
      assert.equal(check(code)[0]?.symbol, "StaticTableFeature_2");
  });
  it("rejects missing and cyclic typeof chains", () => {
    assert.equal(
      check(
        "declare const StaticTableFeature_2: typeof missing; export type StaticTableFeature = typeof StaticTableFeature_2;"
      )[0]?.symbol,
      "missing"
    );
    assert.equal(
      check(
        "declare const StaticTableFeature_2: typeof other; declare const other: typeof StaticTableFeature_2; export type StaticTableFeature = typeof StaticTableFeature_2;"
      )[0]?.reason,
      "alias cycle"
    );
  });
});

describe("local namespace aliases", () => {
  it("requires exact local namespace members", () => {
    assert.equal(
      check(
        "declare namespace StaticTableFeature_2 { interface Other {} } export type StaticTableFeature = StaticTableFeature_2.Member;"
      )[0]?.symbol,
      "StaticTableFeature_2.Member"
    );
    assert.deepEqual(
      check(
        "declare namespace StaticTableFeature_2 { interface Member { id: string } } export type StaticTableFeature = StaticTableFeature_2.Member;"
      ),
      []
    );
  });
  it("does not treat internal import-equals aliases as external imports", () => {
    assert.equal(
      check(
        "import StaticTableFeature_2 = missing; export type StaticTableFeature = StaticTableFeature_2;"
      )[0]?.symbol,
      "missing"
    );
    assert.equal(
      check(
        "import StaticTableFeature_2 = other; import other = StaticTableFeature_2; export type StaticTableFeature = StaticTableFeature_2;"
      )[0]?.reason,
      "alias cycle"
    );
  });
});
