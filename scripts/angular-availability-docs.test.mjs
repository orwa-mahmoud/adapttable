import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { ANGULAR_KIT_DOCS } from "./angular-docs.mjs";
import { REPO_ROOT } from "./packages.mjs";

const source = (file) => readFileSync(join(REPO_ROOT, file), "utf8");
const staleAvailability =
  /(?:being prepared|Prepared) for (?:its|their) first public|After publication(?: completes)?, install|registry install command requires npm publication/;
const folder = (page) => `adapter-${page === "aria" ? "angular-aria" : page}`;

describe("published Angular kit documentation", () => {
  for (const page of ANGULAR_KIT_DOCS) {
    it(`${page} documents installation without an obsolete first-release gate`, () => {
      for (const file of [
        `docs/angular/${page}.md`,
        `packages/angular/${folder(page)}/README.md`,
      ]) {
        const text = source(file);
        assert.doesNotMatch(text, staleAvailability, file);
        assert.match(text, /available on npm/i, file);
        assert.doesNotMatch(text, /@adapttable\/[\w-]+@0\.1\.0\b/, file);
      }
    });
  }

  it("keeps the upcoming binding migration distinct from registry availability", () => {
    const text = source("docs/angular/getting-started.md");
    assert.match(text, /All nine Angular kits are available on npm/);
    assert.match(text, /upcoming 0\.5 binding require that release/);
    assert.doesNotMatch(text, staleAvailability);
  });

  it("uses the same published status in showcase installation copy and LLM source", () => {
    for (const file of [
      "apps/showcase/matrix.mjs",
      "scripts/build-llms-full.mjs",
    ]) {
      const text = source(file);
      assert.doesNotMatch(text, staleAvailability, file);
      assert.doesNotMatch(text, /After 0\.1\.0 publication completes/, file);
      assert.doesNotMatch(text, /@adapttable\/[\w-]+@0\.1\.0\b/, file);
    }
  });
});
