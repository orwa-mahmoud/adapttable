import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkContract, publicNames, readReport } from "./api-contract.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "api-contract-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const REPORT = [
  "## API Report File",
  "",
  "// @public",
  "export interface ColumnDef<TRow> {",
  "    key: string;",
  "}",
  "",
  "// @public @deprecated",
  "export const pinnedRowPart: typeof pinnedRowPart_2;",
  "",
  "// @internal",
  "export declare function mergeProps(): void;",
  "",
  "// @public",
  "function print_2<TRow>(onPrint: () => void): TableFeature<TRow>;",
  "export { print_2 as print }",
  "",
  "export { ColumnDef, pinnedRowPart }",
  "",
].join("\n");

const ENTRY = {
  dir: "core",
  isMainEntry: true,
  published: true,
  report: "core.api.md",
  entry: "/nowhere/index.d.ts",
};

/** A manifest that agrees with REPORT, which each test then breaks one way. */
const agreeing = () => ({
  surfaces: { core: ["ColumnDef", "pinnedRowPart", "print"] },
  entrypoints: { "core.api.md": { surface: "core" } },
});

const run = (manifest, over = {}) =>
  checkContract({
    manifest,
    entrypoints: [ENTRY],
    reports: { "core.api.md": REPORT },
    ...over,
  });

describe("readReport", () => {
  it("files a deprecated alias under the name a consumer writes", () => {
    // The declaration reads `export const pinnedRowPart: typeof
    // pinnedRowPart_2`. Recording the right-hand side would file the public
    // contract under a private local name no import can use.
    const report = readReport(REPORT);
    assert.equal(report.tagged.pinnedRowPart, "public");
    assert.ok(!("pinnedRowPart_2" in report.tagged));
    assert.deepEqual(publicNames(report), [
      "ColumnDef",
      "pinnedRowPart",
      "print",
    ]);
  });

  // The other half of the same rule, and the one that hid a real gap: a symbol
  // whose public name differs from its local one is written as an unexported
  // declaration plus `export { print_2 as print }`. Reading only the inline
  // exports drops `print` from the contract entirely; reading the local name
  // files the contract under a name no import can use.
  it("files a renamed export under its public name, not its local one", () => {
    const report = readReport(REPORT);
    assert.equal(report.tagged.print, "public");
    assert.ok(!("print_2" in report.tagged));
    assert.ok(report.exported.has("print"));
  });

  it("keeps an @internal declaration out of the public surface", () => {
    assert.equal(readReport(REPORT).tagged.mergeProps, "internal");
    assert.ok(!publicNames(readReport(REPORT)).includes("mergeProps"));
  });

  it("reads a star re-export as a forwarded target", () => {
    assert.deepEqual(
      readReport('export * from "@adapttable/unstyled/features";\n').stars,
      ["@adapttable/unstyled/features"]
    );
  });
});

describe("both directions", () => {
  it("passes when the contract and the report agree", () => {
    assert.deepEqual(run(agreeing()), []);
  });

  it("fails an @public symbol the contract does not list", () => {
    const manifest = agreeing();
    manifest.surfaces.core = ["ColumnDef", "print"];
    assert.match(
      run(manifest)[0],
      /marks 1 symbol\(s\) @public.*pinnedRowPart/
    );
  });

  // The direction that would have caught item 16: 993 classifications were
  // withdrawn and the only guard asked the other question.
  it("fails a contracted symbol that is no longer @public", () => {
    const manifest = agreeing();
    manifest.surfaces.core = [
      "ColumnDef",
      "pinnedRowPart",
      "print",
      "useDataTable",
    ];
    assert.match(run(manifest)[0], /no longer classifies.*useDataTable/);
  });

  it("fails a contracted symbol that was demoted to @internal", () => {
    const demoted = REPORT.replace(
      "// @public\nexport interface ColumnDef",
      "// @internal\nexport interface ColumnDef"
    );
    const errors = checkContract({
      manifest: agreeing(),
      entrypoints: [ENTRY],
      reports: { "core.api.md": demoted },
    });
    assert.match(errors[0], /no longer classifies.*ColumnDef/);
  });

  it("fails an entry point whose whole surface went internal", () => {
    const allInternal = REPORT.replaceAll("// @public", "// @internal");
    const errors = checkContract({
      manifest: agreeing(),
      entrypoints: [ENTRY],
      reports: { "core.api.md": allInternal },
    });
    assert.ok(errors.some((e) => /whole surface is now internal/.test(e)));
  });
});

describe("the manifest's own shape", () => {
  it("fails a duplicate name inside a surface", () => {
    const manifest = agreeing();
    manifest.surfaces.core = [
      "ColumnDef",
      "pinnedRowPart",
      "print",
      "ColumnDef",
    ];
    assert.ok(run(manifest).some((e) => /lists ColumnDef twice/.test(e)));
  });

  it("fails a policy naming a surface that is not defined", () => {
    const manifest = agreeing();
    manifest.entrypoints["core.api.md"] = { surface: "nope" };
    assert.ok(
      run(manifest).some((e) => /"nope", which is not defined/.test(e))
    );
  });

  it("fails a surface no entry point uses", () => {
    const manifest = agreeing();
    manifest.surfaces.orphan = ["Whatever"];
    assert.ok(
      run(manifest).some((e) => /"orphan" is defined but no entry/.test(e))
    );
  });

  it("fails a policy whose report no entry point produces", () => {
    const manifest = agreeing();
    manifest.surfaces.ghost = ["Whatever"];
    manifest.entrypoints["ghost.api.md"] = { surface: "ghost" };
    assert.ok(
      run(manifest).some((e) =>
        /"ghost.api.md" has a policy but no entry/.test(e)
      )
    );
  });

  it("fails a published entry point with no policy at all", () => {
    const manifest = agreeing();
    delete manifest.entrypoints["core.api.md"];
    delete manifest.surfaces.core;
    assert.ok(
      run(manifest).some((e) =>
        /published typed entry point with no policy/.test(e)
      )
    );
  });

  it("does NOT demand a policy for a workspace-private package", () => {
    const errors = checkContract({
      manifest: { surfaces: {}, entrypoints: {} },
      entrypoints: [
        { ...ENTRY, published: false, report: "adapter-bootstrap.api.md" },
      ],
      reports: {},
    });
    assert.deepEqual(errors, []);
  });

  it("fails a manifest entry naming a report that is not committed", () => {
    const errors = checkContract({
      manifest: agreeing(),
      entrypoints: [ENTRY],
      reports: {},
    });
    assert.ok(
      errors.some((e) => /named by the manifest but not committed/.test(e))
    );
  });
});

describe("re-export policies", () => {
  const forwarding = 'export * from "@adapttable/unstyled/features";\n';

  it("passes when the entry forwards what its policy names", () => {
    assert.deepEqual(
      checkContract({
        manifest: {
          surfaces: {
            "forwards unstyled/features": ["@adapttable/unstyled/features"],
          },
          entrypoints: {
            "adapter-shadcn-features.api.md": {
              reexport: "forwards unstyled/features",
            },
          },
        },
        entrypoints: [
          {
            ...ENTRY,
            report: "adapter-shadcn-features.api.md",
            isMainEntry: false,
          },
        ],
        reports: { "adapter-shadcn-features.api.md": forwarding },
      }),
      []
    );
  });

  it("fails when a forwarded name stops arriving", () => {
    const errors = checkContract({
      manifest: {
        surfaces: { "kit/features": ["rowReorder", "savedViews"] },
        entrypoints: {
          "adapter-antd-features.api.md": { reexport: "kit/features" },
        },
      },
      entrypoints: [
        {
          ...ENTRY,
          report: "adapter-antd-features.api.md",
          isMainEntry: false,
        },
      ],
      reports: { "adapter-antd-features.api.md": "export { rowReorder }\n" },
    });
    assert.match(errors[0], /no longer forwards 1 name\(s\).*savedViews/);
  });

  it("fails when a re-export entry starts declaring a surface of its own", () => {
    const errors = checkContract({
      manifest: {
        surfaces: { "kit/features": ["rowReorder"] },
        entrypoints: {
          "adapter-antd-features.api.md": { reexport: "kit/features" },
        },
      },
      entrypoints: [
        {
          ...ENTRY,
          report: "adapter-antd-features.api.md",
          isMainEntry: false,
        },
      ],
      reports: {
        "adapter-antd-features.api.md":
          "// @public\nexport interface Sneaky {}\n\nexport { rowReorder }\n",
      },
    });
    assert.ok(
      errors.some((e) => /declares 1 symbol\(s\) of its own.*Sneaky/.test(e))
    );
  });
});

describe("the real gate runs this", () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));

  it("is a step in both pnpm check and pnpm verify:release", () => {
    assert.match(pkg.scripts.check, /pnpm run check:api-contract/);
    assert.match(pkg.scripts["verify:release"], /pnpm run check:api-contract/);
  });

  it("passes against the committed manifest", () => {
    const result = spawnSync(
      process.execPath,
      [join(REPO_ROOT, "scripts", "check-api-contract.mjs")],
      { encoding: "utf8" }
    );
    assert.equal(result.status, 0, result.stderr);
  });

  // The point of the item: the binary the gate runs must exit non-zero, not a
  // hand-run script that only reports.
  it("exits non-zero on a real violation", () => {
    const manifest = JSON.parse(
      readFileSync(join(REPO_ROOT, "etc", "api-contract.json"), "utf8")
    );
    manifest.surfaces.core.push("ASymbolNobodyExports");
    const tampered = join(dir, "tampered.json");
    writeFileSync(tampered, JSON.stringify(manifest));
    const result = spawnSync(
      process.execPath,
      [join(REPO_ROOT, "scripts", "check-api-contract.mjs"), tampered],
      { encoding: "utf8" }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ASymbolNobodyExports/);
  });
});
