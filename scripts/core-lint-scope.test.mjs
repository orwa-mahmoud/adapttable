import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { ESLint } from "eslint";

import repositoryConfig from "../eslint.config.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const CORE_GLOB = "packages/shared/core/**/*.{ts,tsx}";
const REACT_RULE = /^(?:react|react-hooks|jsx-a11y)\//;
const reactScopes = repositoryConfig.filter(
  (config) => config.settings?.react?.version === "detect"
);
assert.equal(reactScopes.length, 1, "Expected one React-specific lint scope");
const reactScope = reactScopes[0];

// Reconstruct only the old core classification. Every shared rule and option
// comes from the real configuration, so the comparison cannot hide changes.
const previousConfig = repositoryConfig.map((config) =>
  config === reactScope
    ? { ...config, files: [...config.files, CORE_GLOB] }
    : config
);
const current = new ESLint({ cwd: ROOT });
const previous = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: previousConfig,
});
const shared = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: repositoryConfig.filter((config) => config !== reactScope),
});

async function configurations(file) {
  const path = resolve(ROOT, file);
  const after = await current.calculateConfigForFile(path);
  const before = await previous.calculateConfigForFile(path);
  assert.ok(after, `Missing current configuration for ${file}`);
  assert.ok(before, `Missing previous configuration for ${file}`);
  return { after, before };
}

function sharedRules(config) {
  return Object.fromEntries(
    Object.entries(config.rules).filter(([name]) => !REACT_RULE.test(name))
  );
}

describe("framework-neutral core lint scope", () => {
  for (const file of [
    "packages/shared/core/src/engine/createTableEngine.ts",
    "packages/shared/core/src/engine/createTableEngine.test.ts",
    "packages/shared/core/vitest.setup.ts",
  ]) {
    it(`removes only React-specific checks from ${file}`, async () => {
      const { after, before } = await configurations(file);
      const sharedConfig = await shared.calculateConfigForFile(
        resolve(ROOT, file)
      );
      assert.ok(sharedConfig, `Missing shared configuration for ${file}`);
      assert.equal(before.rules["react-hooks/rules-of-hooks"][0], 2);
      assert.deepEqual(after.settings, sharedConfig.settings);
      assert.notEqual(after.settings?.react?.version, "detect");
      for (const [name, rule] of Object.entries(after.rules)) {
        if (REACT_RULE.test(name)) assert.equal(rule[0], 0, name);
      }
      assert.deepEqual(sharedRules(after), sharedRules(before));
      assert.deepEqual(after.languageOptions, before.languageOptions);
      for (const name of [
        "@typescript-eslint/no-unused-vars",
        "@typescript-eslint/consistent-type-imports",
        "simple-import-sort/imports",
        "import-x/no-duplicates",
        "sonarjs/cognitive-complexity",
      ]) {
        assert.equal(after.rules[name][0], 2, name);
      }
    });
  }

  for (const file of [
    "packages/react/react/src/grouping/GroupingPanelChrome.tsx",
    "packages/react/adapter-mui/src/DataTable.tsx",
    "packages/react/adapter-unstyled/src/DataTable.tsx",
  ]) {
    it(`preserves the complete React configuration for ${file}`, async () => {
      const { after, before } = await configurations(file);
      assert.deepEqual(after.rules, before.rules);
      assert.deepEqual(after.settings, before.settings);
      assert.deepEqual(after.languageOptions, before.languageOptions);
      assert.equal(after.settings.react.version, "detect");
      assert.equal(after.rules["react-hooks/rules-of-hooks"][0], 2);
      assert.equal(after.rules["react/jsx-key"][0], 2);
      assert.equal(after.rules["jsx-a11y/alt-text"][0], 2);
    });
  }
});
