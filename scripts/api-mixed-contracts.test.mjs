import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkContract } from "./api-contract.mjs";

const SOURCE = "@adapttable/core/pdf";
const SUPPORT = "@adapttable/core";
const REPORT = [
  `import { writer } from '${SOURCE}';`,
  "export { writer }",
  "// @public",
  "export function factory(): void;",
  `export * from '${SOURCE}';`,
  `export * from '${SUPPORT}';`,
].join("\n");
const entry = { report: "mixed.api.md", framework: "vue", published: true };
const manifest = () => ({
  frameworks: { vue: ["direct", "canonical"] },
  surfaces: { direct: ["factory", "writer"], canonical: ["writer", "Options"] },
  entrypoints: {
    [entry.report]: {
      surface: "direct",
      reexport: "canonical",
      from: SOURCE,
      additionalFrom: [SUPPORT],
    },
  },
});
const check = (text = REPORT, contract = manifest()) =>
  checkContract({
    manifest: contract,
    entrypoints: [entry],
    reports: { [entry.report]: text },
  });

function rejects(text, pattern, contract) {
  const errors = check(text, contract);
  assert.ok(
    errors.some((error) => pattern.test(error)),
    errors.join("\n")
  );
}

describe("explicit mixed API policies", () => {
  it("keeps exact direct exports beside canonical and additional stars", () => {
    assert.deepEqual(check(), []);
  });

  it("rejects missing and demoted own declarations", () => {
    for (const replacement of [
      "",
      "// @internal\nexport function factory(): void;",
    ]) {
      rejects(
        REPORT.replace(
          "// @public\nexport function factory(): void;",
          replacement
        ),
        /no longer classifies.*factory/
      );
    }
  });

  it("rejects an additional own name", () => {
    rejects(
      REPORT + "\n// @public\nexport interface Extra {}",
      /marks 1.*Extra/
    );
  });

  it("does not let a star hide a lost explicit writer forward", () => {
    rejects(
      REPORT.replace("export { writer }", ""),
      /no longer classifies.*writer/
    );
  });

  it("rejects an additional explicit named forward", () => {
    rejects(
      REPORT + "\nexport { otherWriter }",
      /uncontracted explicit name.*otherWriter/
    );
  });

  it("rejects either required star being removed", () => {
    for (const source of [SOURCE, SUPPORT]) {
      rejects(
        REPORT.replace(`export * from '${source}';`, ""),
        /required wildcard source/
      );
    }
  });

  it("rejects a wrong canonical origin even when its name remains", () => {
    rejects(
      REPORT.replace(
        `export * from '${SOURCE}';`,
        "export * from '@adapttable/wrong/pdf';"
      ),
      /required wildcard source/
    );
  });

  it("rejects unreviewed wildcard forwarding", () => {
    rejects(
      REPORT + "\nexport * from '@adapttable/extra';",
      /unexpected wildcard source/
    );
  });

  it("rejects same-spelled canonical shadows at every release tag", () => {
    for (const tag of ["public", "internal", "beta", "alpha"]) {
      rejects(
        REPORT + `\n// @${tag}\nexport function writer(): void;`,
        /shadow.*writer/
      );
    }
  });

  it("checks every promised canonical name for a local shadow", () => {
    rejects(
      REPORT + "\n// @internal\nexport interface Options {}",
      /shadow.*Options/
    );
  });

  it("rejects unknown policy fields instead of silently ignoring them", () => {
    const contract = manifest();
    contract.entrypoints[entry.report].additionalSources = [SUPPORT];
    rejects(REPORT, /unknown policy field.*additionalSources/, contract);
  });

  it("requires an explicit canonical origin for a mixed policy", () => {
    const contract = manifest();
    delete contract.entrypoints[entry.report].from;
    rejects(REPORT, /requires a canonical from source/, contract);
  });

  it("rejects malformed and duplicate additional origins", () => {
    for (const sources of [SUPPORT, [""], [SOURCE], [SUPPORT, SUPPORT]]) {
      const contract = manifest();
      contract.entrypoints[entry.report].additionalFrom = sources;
      rejects(
        REPORT,
        /nonempty source strings|wildcard source twice/,
        contract
      );
    }
  });

  it("rejects additional origins on a pure policy", () => {
    const contract = manifest();
    delete contract.entrypoints[entry.report].reexport;
    rejects(REPORT, /additionalFrom requires a mixed policy/, contract);
  });

  it("validates and keeps both surface references live", () => {
    for (const name of ["direct", "canonical"]) {
      const contract = manifest();
      delete contract.surfaces[name];
      rejects(REPORT, /which is not defined/, contract);
    }
    const contract = manifest();
    contract.surfaces.unused = [];
    contract.frameworks.vue.push("unused");
    rejects(REPORT, /unused.*no entry point uses it/, contract);
  });

  it("checks each surface against the entry framework", () => {
    for (const name of ["direct", "canonical"]) {
      const contract = manifest();
      contract.frameworks.vue = contract.frameworks.vue.filter(
        (item) => item !== name
      );
      contract.frameworks.react = [name];
      rejects(REPORT, /vue entry point.*filed under react/, contract);
    }
  });

  it("preserves pure reexport rejection of owned declarations", () => {
    const contract = manifest();
    delete contract.entrypoints[entry.report].surface;
    delete contract.entrypoints[entry.report].additionalFrom;
    delete contract.surfaces.direct;
    contract.frameworks.vue = ["canonical"];
    rejects(REPORT, /re-export entry but declares.*factory/, contract);
  });

  it("preserves ordinary surface acceptance of named forwarding", () => {
    const contract = manifest();
    contract.entrypoints[entry.report] = { surface: "direct" };
    delete contract.surfaces.canonical;
    contract.frameworks.vue = ["direct"];
    assert.deepEqual(check(REPORT, contract), []);
  });
});
