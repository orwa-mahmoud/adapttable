import assert from "node:assert/strict";
import { it } from "node:test";

import { checkContract, publicNames, readReport } from "./api-contract.mjs";

const ALIASES = [
  "DENSITY_URL_WRITE_DEBOUNCE_MS",
  "LAYOUT_URL_WRITE_DEBOUNCE_MS",
];
const imported =
  "import { URL_SLICE_WRITE_DEBOUNCE_MS } from '@adapttable/core';\n";
const declared = "// @public\nconst URL_SLICE_WRITE_DEBOUNCE_MS: number;\n";
const exportsFor = (names) =>
  names
    .map((name) => `export { URL_SLICE_WRITE_DEBOUNCE_MS as ${name} }\n`)
    .join("");

function check(text, names, mixed = false) {
  const surfaces = {
    own: names,
    ...(mixed ? { canonical: ["ColumnDef"] } : {}),
  };
  return checkContract({
    manifest: {
      frameworks: { neutral: Object.keys(surfaces) },
      surfaces,
      entrypoints: {
        "aliases.api.md": {
          surface: "own",
          ...(mixed ? { reexport: "canonical", from: "@adapttable/core" } : {}),
        },
      },
    },
    entrypoints: [
      { framework: "neutral", report: "aliases.api.md", published: true },
    ],
    reports: {
      "aliases.api.md":
        text + (mixed ? "export * from '@adapttable/core';\n" : ""),
    },
  });
}

it("retains every public alias of the same imported local", () => {
  const report = readReport(imported + exportsFor(ALIASES));
  assert.deepEqual([...report.exported], ALIASES);
  assert.deepEqual([...report.forwarded], ALIASES);
  assert.deepEqual(publicNames(report), []);
  assert.deepEqual(check(imported + exportsFor(ALIASES), ALIASES, true), []);
});

it("carries a declared local's release tag to every public alias", () => {
  const report = readReport(declared + exportsFor(ALIASES));
  assert.deepEqual(publicNames(report), ALIASES);
  assert.deepEqual([...report.exported], ALIASES);
  assert.deepEqual([...report.forwarded], []);
  assert.deepEqual(check(declared + exportsFor(ALIASES), ALIASES), []);
});

for (const omitted of ALIASES) {
  it(`rejects removal of the ${omitted} alias`, () => {
    for (const prefix of [imported, declared]) {
      const errors = check(
        prefix + exportsFor(ALIASES.filter((name) => name !== omitted)),
        ALIASES
      );
      assert.equal(errors.length, 1);
      assert.ok(errors[0].includes(omitted));
      assert.match(errors[0], /no longer classifies 1 contracted symbol/);
    }
  });
}

it("rejects an unapproved declared alias before an approved one", () => {
  const errors = check(
    declared + exportsFor(["unapproved", ...ALIASES]),
    ALIASES
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /marks 1 symbol.*unapproved/);
});

it("rejects an unapproved forwarded alias in a mixed surface", () => {
  const errors = check(
    imported + exportsFor(["unapproved", ...ALIASES]),
    ALIASES,
    true
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /forwards 1 uncontracted explicit name.*unapproved/);
});

it("preserves distinct locals and type-only named aliases", () => {
  const report = readReport(
    "// @public\ninterface First {}\n// @public\ninterface Second {}\n" +
      "export { type First as PublicFirst, type First as OtherFirst, Second as PublicSecond }\n"
  );
  assert.deepEqual(publicNames(report), [
    "OtherFirst",
    "PublicFirst",
    "PublicSecond",
  ]);
  assert.deepEqual([...report.forwarded], []);
});
