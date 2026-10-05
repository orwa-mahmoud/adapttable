import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ESLint, Linter } from "eslint";
import tseslint from "typescript-eslint";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ruleId = "@typescript-eslint/no-require-imports";

describe("CommonJS Vue consumer lint", () => {
  it("permits typed import-equals without permitting direct require calls", async () => {
    const eslint = new ESLint({ cwd: root });
    const config = await eslint.calculateConfigForFile(
      join(root, "scripts/vue-peer-consumer-fixtures/specialized.cts")
    );
    assert.equal(config.rules[ruleId][0], 2);
    assert.equal(config.rules["@typescript-eslint/no-unsafe-return"][0], 2);
    const linter = new Linter();
    const options = {
      files: ["**/*.cts"],
      languageOptions: { parser: tseslint.parser },
      plugins: { "@typescript-eslint": tseslint.plugin },
      rules: { [ruleId]: config.rules[ruleId] },
    };
    const filename = "consumer.cts";
    assert.deepEqual(
      linter.verify(
        'import table = require("@adapttable/vue-unstyled");',
        options,
        filename
      ),
      []
    );
    const direct = linter.verify(
      'const table = require("@adapttable/vue-unstyled");',
      options,
      filename
    );
    assert.equal(direct.length, 1);
    assert.equal(direct[0].ruleId, ruleId);
    const source = await eslint.calculateConfigForFile(
      join(root, "packages/vue/vue/src/index.ts")
    );
    assert.notEqual(source.rules[ruleId][1]?.allowAsImport, true);
  });
});
