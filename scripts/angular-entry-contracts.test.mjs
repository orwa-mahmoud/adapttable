import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import ts from "typescript";

import {
  angularConsumerOwnershipErrors,
  angularEntryGraphErrors,
  angularOwnership,
  angularSourceOwnershipErrors,
} from "./angular-entry-contracts.mjs";
import { REPO_ROOT } from "./packages.mjs";
import {
  canonicalAliasErrors,
  sourceExports,
} from "./vue-export-contracts.mjs";

const dir = join(REPO_ROOT, "packages/angular/angular");
const ownership = angularOwnership(REPO_ROOT);

describe("Angular canonical entries", () => {
  it("retains the reviewed public union once at its canonical owner", () => {
    assert.deepEqual(angularSourceOwnershipErrors(REPO_ROOT), []);
    const names = Object.values(ownership).flat();
    assert.equal(new Set(names).size, names.length);
    assert.equal(names.length, 826);
  });

  it("routes returned types through their owner without moving ownership", () => {
    const adapter = join(dir, "src/adapter.ts");
    const features = join(dir, "src/features.ts");
    const plant = (file, statement) =>
      angularSourceOwnershipErrors(
        REPO_ROOT,
        new Map([[file, `${readFileSync(file, "utf8")}\n${statement}\n`]])
      );
    assert.ok(
      plant(adapter, 'export { ColumnDef } from "@adapttable/angular";').some(
        (error) => error === "adapter: unexpected ColumnDef"
      ),
      "a value re-export claims ownership"
    );
    assert.ok(
      plant(
        features,
        'export type { AdaptDataTableShell } from "@adapttable/angular";'
      ).some(
        (error) =>
          error ===
          "features: AdaptDataTableShell is not owned by @adapttable/angular"
      ),
      "a route must name the entry that owns the type"
    );
    assert.ok(
      plant(
        adapter,
        'export type { ColumnDef as RowColumn } from "@adapttable/angular";'
      ).some(
        (error) =>
          error === "adapter: RowColumn is not owned by @adapttable/angular"
      ),
      "a route keeps the owner's name"
    );
  });

  it("has an acyclic packaging graph including type-only edges", () => {
    assert.deepEqual(angularEntryGraphErrors(REPO_ROOT), []);
  });

  it("rejects a planted root-to-features type-only backedge", () => {
    const file = join(dir, "src/slotContracts.ts");
    const overrides = new Map([
      [
        file,
        `${readFileSync(file, "utf8")}\nimport type { GroupingExtras } from "@adapttable/angular/features";\n`,
      ],
    ]);
    assert.ok(
      angularEntryGraphErrors(REPO_ROOT, overrides).some((error) =>
        error.includes("root: forbidden named edge to features")
      )
    );
  });

  it("rejects relative factory closure and runtime factory imports in adapter", () => {
    const file = join(dir, "src/layout/dataTableShell.ts");
    for (const statement of [
      'import type { GroupingExtras } from "../features/grouping";',
      'import { grouping } from "@adapttable/angular/features";',
    ]) {
      const overrides = new Map([
        [file, `${readFileSync(file, "utf8")}\n${statement}\n`],
      ]);
      assert.ok(
        angularEntryGraphErrors(REPO_ROOT, overrides).some(
          (error) =>
            error.includes("relative cross-entry edge to features") ||
            error.includes("runtime dependency on feature factories")
        )
      );
    }
  });

  it("rejects mixed and renamed imports or exports from the wrong owner", () => {
    const wrong = `
      import { injectBulkActionRunner, injectBulkBarRunner as runBar } from "@adapttable/angular";
      export { AdaptDataTableShell as Shell } from "@adapttable/angular";
      import { grouping } from "@adapttable/angular/adapter";
    `;
    const errors = angularConsumerOwnershipErrors(wrong, ownership);
    assert.equal(errors.length, 3);
    assert.ok(errors.some((error) => error.startsWith("injectBulkBarRunner:")));
    assert.ok(errors.some((error) => error.startsWith("AdaptDataTableShell:")));
    assert.ok(errors.some((error) => error.startsWith("grouping:")));
    assert.deepEqual(
      angularConsumerOwnershipErrors(
        `
      import { injectBulkActionRunner, AdaptCellTemplate } from "@adapttable/angular";
      import { injectBulkBarRunner, AdaptDataTableShell } from "@adapttable/angular/adapter";
      export { grouping as grouped } from "@adapttable/angular/features";
    `,
        ownership
      ),
      []
    );
  });

  it("keeps the application directive and DI tokens at their original declarations", () => {
    const pairs = [
      {
        canonical: "./src/cellTemplate",
        route: "@adapttable/angular",
        names: ["AdaptCellTemplate"],
      },
      {
        canonical: "./src/featureState",
        route: "@adapttable/angular",
        names: ["ADAPTTABLE_FEATURE_STATE", "createFeatureState"],
      },
      {
        canonical: "./src/slotContracts",
        route: "@adapttable/angular",
        names: ["ADAPTTABLE_SLOT_TABLE", "SlotTable"],
      },
      {
        canonical: "./src/url/tableUrlState",
        route: "@adapttable/angular",
        names: ["ADAPTTABLE_URL_ADAPTER"],
      },
      {
        canonical: "./src/slots",
        route: "@adapttable/angular/adapter",
        names: ["AdaptSlot"],
      },
      {
        canonical: "./src/actions/tableContextMenu",
        route: "@adapttable/angular/adapter",
        names: ["ADAPTTABLE_CONTEXT_MENU"],
      },
      {
        canonical: "./src/features/grouping",
        route: "@adapttable/angular/features",
        names: ["grouping", "GroupingExtras"],
      },
    ];
    const file = join(dir, "entry-identity-fixture.ts");
    const routes = [
      ...new Set(pairs.flatMap((pair) => [pair.route, pair.canonical])),
      "./entry-lookalike",
    ];
    const lookalike = join(dir, "entry-lookalike.ts");
    const copy =
      'import type { SlotTable as Original } from "./src/slotContracts"; export interface SlotTable extends Original {}';
    const text = routes
      .map((route, index) => `import * as Route${index} from "${route}";`)
      .join("\n");
    const config = ts.readConfigFile(
      join(dir, "tsconfig.json"),
      ts.sys.readFile
    );
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dir);
    const host = ts.createCompilerHost(parsed.options);
    const original = host.getSourceFile.bind(host);
    const fileExists = host.fileExists.bind(host);
    host.fileExists = (name) => name === lookalike || fileExists(name);
    const overrides = new Map([
      [file, text],
      [lookalike, copy],
    ]);
    host.getSourceFile = (
      name,
      languageVersion,
      onError,
      shouldCreateNewSourceFile
    ) =>
      overrides.has(name)
        ? ts.createSourceFile(name, overrides.get(name), languageVersion, true)
        : original(name, languageVersion, onError, shouldCreateNewSourceFile);
    const program = ts.createProgram([file], parsed.options, host);
    assert.deepEqual(
      canonicalAliasErrors(program, program.getSourceFile(file), pairs),
      []
    );
    assert.equal(
      canonicalAliasErrors(program, program.getSourceFile(file), [
        {
          canonical: "./src/slotContracts",
          route: "./entry-lookalike",
          names: ["SlotTable"],
        },
      ]).length,
      1
    );
  });

  it("exposes the original core RowEditIcons type from root signature closure", () => {
    const exports = sourceExports(
      readFileSync(join(dir, "src/index.ts"), "utf8")
    );
    const entry = exports.find(
      (edge) =>
        edge.names !== "*" &&
        edge.names.some((name) => name.name === "RowEditIcons")
    );
    assert.equal(entry.from, "@adapttable/core/binding");
    assert.ok(
      entry.names.find((name) => name.name === "RowEditIcons").typeOnly
    );
  });
});
