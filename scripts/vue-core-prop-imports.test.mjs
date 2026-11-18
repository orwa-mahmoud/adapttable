import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import { ESLint } from "eslint";

import { REPO_ROOT } from "./packages.mjs";

const eslint = new ESLint({ cwd: REPO_ROOT });
async function restrictedImports(file, source) {
  const results = await eslint.lintText(
    `<script setup lang="ts">\n${source}\n</script>\n<template><div /></template>`,
    { filePath: join(REPO_ROOT, file) }
  );
  const messages = results.flatMap((result) => result.messages);
  assert.equal(
    messages.some((message) => message.fatal),
    false
  );
  return messages.filter(
    (message) => message.ruleId === "no-restricted-imports"
  );
}

for (const [component, propType] of [
  ["NativeChecklistFilter.vue", "ChecklistFilterProps"],
  ["NativeFilterTree.vue", "FilterTreeBuilderProps"],
]) {
  const file = `packages/vue/adapter-vue-unstyled/src/filters/${component}`;
  test(`${component} takes its prop type from the Vue binding`, async () => {
    assert.deepEqual(
      await restrictedImports(
        file,
        `import type { ${propType} } from "@adapttable/vue/adapter";`
      ),
      []
    );
    for (const source of [
      `import type { ${propType} } from "@adapttable/core/binding";`,
      `import { ${propType} } from "@adapttable/core/binding";`,
      'import type { TableSource } from "@adapttable/core";',
    ]) {
      assert.ok((await restrictedImports(file, source)).length > 0, source);
    }
  });
}

test("an AI binding takes core types from its framework binding", async () => {
  const results = await eslint.lintText(
    'import type { ActionAiOptions } from "@adapttable/core";\nexport type A = ActionAiOptions;\n',
    {
      filePath: join(
        REPO_ROOT,
        "packages/react/ai-react/src/react.approval.test.tsx"
      ),
    }
  );
  assert.ok(
    results
      .flatMap((result) => result.messages)
      .some((message) => message.ruleId === "no-restricted-imports")
  );
});
