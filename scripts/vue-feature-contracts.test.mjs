import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import ts from "typescript";

import {
  canonicalChromeErrors,
  canonicalFactoryErrors,
} from "./vue-feature-contracts.mjs";

const scratch = mkdtempSync(join(tmpdir(), "vue-feature-contract-tests-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

function fixture({
  importFrom = "./owner.js",
  importName = "StaticTableFeature",
  contractOwner = "./owner.js",
  contract = "export interface StaticTableFeature { id: string; mount?<TRow>(row: TRow): TRow; }",
  result = "StaticTableFeature",
  factorySource,
  routeSource,
} = {}) {
  const root = mkdtempSync(join(scratch, "case-"));
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "package.json"), '{"type":"module"}');
  writeFileSync(join(root, "contract.ts"), contract);
  writeFileSync(
    join(root, "root.ts"),
    'export type { StaticTableFeature } from "./contract.js";'
  );
  writeFileSync(
    join(root, "private.ts"),
    'export type { StaticTableFeature } from "./contract.js";'
  );
  writeFileSync(
    join(root, "other.ts"),
    "export interface StaticTableFeature { id: string; mount?<TRow>(row: TRow): TRow; }"
  );
  writeFileSync(
    join(root, "owner.ts"),
    [
      'export type { StaticTableFeature } from "./contract.js";',
      'export type { StaticTableFeature as Other } from "./other.js";',
      'export { densityChooser } from "./factory.js";',
    ].join("\n")
  );
  writeFileSync(
    join(root, "factory.ts"),
    factorySource ??
      [
        `import type { ${importName} as StaticTableFeature } from "${importFrom}";`,
        `export function densityChooser(): ${result} { throw new Error("type-only fixture"); }`,
      ].join("\n")
  );
  writeFileSync(
    join(root, "route.ts"),
    routeSource ?? 'export { densityChooser } from "./factory.js";'
  );
  const file = join(root, "consumer.ts");
  writeFileSync(
    file,
    [
      'import * as owner from "./owner.js";',
      'import * as contracts from "./root.js";',
      'import * as route from "./route.js";',
      "void [owner, contracts, route];",
    ].join("\n")
  );
  const program = ts.createProgram([file], {
    strict: true,
    noEmit: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  });
  return {
    diagnostics: ts.getPreEmitDiagnostics(program),
    errors: canonicalFactoryErrors(program, program.getSourceFile(file), {
      route: "./route.js",
      owner: "./owner.js",
      contractOwner,
      factory: "densityChooser",
    }),
  };
}

describe("canonical cross-entry contract imports", () => {
  it("proves a direct import and the same declaration across a re-export", () => {
    const result = fixture();
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(result.errors, []);
  });

  it("separates the root contract owner from the feature factory owner", () => {
    const result = fixture({
      importFrom: "./root.js",
      contractOwner: "./root.js",
    });
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(result.errors, []);
  });

  it("rejects a private route even when it aliases the exact same symbol", () => {
    const result = fixture({ importFrom: "./private.js" });
    assert.deepEqual(result.diagnostics, []);
    assert.match(result.errors.join("\n"), /must be imported from/);
  });

  it("rejects a missing public contract", () => {
    const result = fixture({
      contract: "export interface Private { id: string }",
    });
    assert.ok(result.diagnostics.length > 0);
    assert.ok(result.errors.length > 0);
  });

  it("rejects an identically shaped declaration from a different origin", () => {
    const result = fixture({ importFrom: "./other.js" });
    assert.deepEqual(result.diagnostics, []);
    assert.match(result.errors.join("\n"), /not the canonical/);
  });

  it("rejects a renamed different contract from the right owner", () => {
    const result = fixture({ importName: "Other" });
    assert.deepEqual(result.diagnostics, []);
    assert.match(result.errors.join("\n"), /must be imported from/);
  });

  it("rejects a local structurally identical copy", () => {
    const result = fixture({
      factorySource: [
        "interface StaticTableFeature { id: string; mount?<TRow>(row: TRow): TRow; }",
        'export function densityChooser(): StaticTableFeature { return { id: "density" }; }',
      ].join("\n"),
    });
    assert.deepEqual(result.diagnostics, []);
    assert.match(result.errors.join("\n"), /must be imported from/);
  });

  it("rejects an opaque result instead of the public feature contract", () => {
    const result = fixture({ result: "unknown" });
    assert.deepEqual(result.diagnostics, []);
    assert.match(
      result.errors.join("\n"),
      /must retain its named function result/
    );
  });

  it("rejects a new factory declaration with the same return type", () => {
    const result = fixture({
      routeSource: [
        'import type { StaticTableFeature } from "./owner.js";',
        'export function densityChooser(): StaticTableFeature { return { id: "density" }; }',
      ].join("\n"),
    });
    assert.deepEqual(result.diagnostics, []);
    assert.match(
      result.errors.join("\n"),
      /lost canonical declaration identity/
    );
  });
});

const chromeContracts = {
  DensityControlProps:
    'interface DensityControlProps { density: "compact" | "comfortable" }',
  FullscreenControlProps:
    "interface FullscreenControlProps { fullscreen: { active: boolean } }",
  DensityChooserSlots:
    "interface DensityChooserSlots { Control(value: string): string }",
  ViewControlButtonProps: "interface ViewControlButtonProps { label: string }",
};

function chromeFixture(target, mode, importTypeSlot = false) {
  const root = mkdtempSync(join(scratch, "chrome-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "@adapttable/vue",
      type: "module",
      exports: { ".": "./root.ts" },
    })
  );
  writeFileSync(
    join(root, "root.ts"),
    "export interface FeatureSlotKey<TProps> { readonly id: string; readonly __props?: (value: TProps) => void }"
  );
  const contracts = Object.values(chromeContracts)
    .map((declaration) => "export " + declaration)
    .join("\n");
  writeFileSync(join(root, "contracts.ts"), contracts);
  writeFileSync(join(root, "other.ts"), contracts);
  writeFileSync(
    join(root, "private.ts"),
    "export type { " +
      Object.keys(chromeContracts).join(", ") +
      ' } from "./contracts.js";'
  );
  writeFileSync(
    join(root, "adapter.ts"),
    [
      "export type { " +
        Object.keys(chromeContracts)
          .filter((name) => mode !== "missing" || name !== target)
          .join(", ") +
        ' } from "./contracts.js";',
      'export { DensityChooserChrome, FullscreenButtonChrome, DENSITY_CONTROL, FULLSCREEN_CONTROL } from "./chrome.js";',
    ].join("\n")
  );
  const imports = Object.keys(chromeContracts).flatMap((name) => {
    if (name === target && mode === "local") return [chromeContracts[name]];
    const origin =
      name === target && mode === "private"
        ? "./private.js"
        : name === target && mode === "wrong-origin"
          ? "./other.js"
          : "./adapter.js";
    return [`import type { ${name} } from "${origin}";`];
  });
  if (mode === "slot-private")
    imports.push(
      `import type { ${target} as PrivateSlotProps } from "./private.js";`
    );
  let declarations = [
    "interface SlotKey<TProps> { readonly render: (props: TProps) => string }",
    "export function DensityChooserChrome(props: DensityControlProps & { readonly slots: DensityChooserSlots }): string { return 'density'; }",
    "export function FullscreenButtonChrome(props: FullscreenControlProps & { readonly slots: { readonly Button: (props: ViewControlButtonProps) => string } }): string { return 'fullscreen'; }",
  ].join("\n");
  if (mode === "opaque") declarations = declarations.replace(target, "unknown");
  for (const [value, props] of [
    ["DENSITY_CONTROL", "DensityControlProps"],
    ["FULLSCREEN_CONTROL", "FullscreenControlProps"],
  ])
    declarations += `\nexport declare const ${value}: ${importTypeSlot ? 'import("@adapttable/vue").FeatureSlotKey' : "SlotKey"}<${mode === "slot-private" && props === target ? "PrivateSlotProps" : mode === "slot-opaque" && props === target ? "unknown" : props}>;`;
  writeFileSync(
    join(root, "chrome.ts"),
    imports.join("\n") + "\n" + declarations
  );
  writeFileSync(
    join(root, "route.ts"),
    'export { DensityChooserChrome, FullscreenButtonChrome, DENSITY_CONTROL, FULLSCREEN_CONTROL } from "./chrome.js";'
  );
  const file = join(root, "consumer.ts");
  writeFileSync(
    file,
    [
      'import * as adapter from "./adapter.js";',
      'import * as route from "./route.js";',
      "void [adapter, route];",
    ].join("\n")
  );
  const program = ts.createProgram([file], {
    strict: true,
    noEmit: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  });
  return {
    diagnostics: ts.getPreEmitDiagnostics(program),
    errors: canonicalChromeErrors(program, program.getSourceFile(file), {
      route: "./route.js",
      owner: "./adapter.js",
    }),
  };
}

describe("canonical emitted Chrome and nested slot contracts", () => {
  it("proves all four direct owner imports and exact symbols", () => {
    const result = chromeFixture();
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(result.errors, []);
  });

  it("accepts the produced import-type FeatureSlotKey syntax", () => {
    const result = chromeFixture(undefined, undefined, true);
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(result.errors, []);
  });

  for (const contract of ["DensityControlProps", "FullscreenControlProps"]) {
    for (const mode of ["slot-private", "slot-opaque"]) {
      it(`rejects ${mode} ${contract} inside an import-type slot key`, () => {
        const result = chromeFixture(contract, mode, true);
        assert.deepEqual(result.diagnostics, []);
        assert.ok(result.errors.length > 0);
        assert.ok(
          result.errors.every(
            (error) =>
              error.includes("CONTROL slot") && error.includes(contract)
          )
        );
      });
    }
  }

  for (const contract of Object.keys(chromeContracts)) {
    for (const mode of [
      "private",
      "wrong-origin",
      "local",
      "missing",
      "opaque",
    ]) {
      it(`rejects ${mode} ${contract} in its actual parameter position`, () => {
        const result = chromeFixture(contract, mode);
        if (mode === "missing") assert.ok(result.diagnostics.length > 0);
        else assert.deepEqual(result.diagnostics, []);
        assert.ok(
          result.errors.some((error) => error.includes(contract)),
          result.errors.join("\n")
        );
        assert.ok(
          result.errors.every((error) => error.includes(contract)),
          "A negative must fail for the planted contract, not an unrelated prop"
        );
      });
    }
  }

  for (const contract of ["DensityControlProps", "FullscreenControlProps"]) {
    it(`rejects a private ${contract} on the slot key even when Chrome is canonical`, () => {
      const result = chromeFixture(contract, "slot-private");
      assert.deepEqual(result.diagnostics, []);
      assert.ok(result.errors.length > 0);
      assert.ok(
        result.errors.every(
          (error) => error.includes("CONTROL slot") && error.includes(contract)
        )
      );
    });
  }
});
