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
  test(`${component} allows only its canonical prop type`, async () => {
    assert.deepEqual(
      await restrictedImports(
        file,
        `import type { ${propType} } from "@adapttable/core/binding";`
      ),
      []
    );
    for (const source of [
      `import { ${propType} } from "@adapttable/core/binding";`,
      'import { featureSlotKey } from "@adapttable/core/binding";',
      'import type { FeatureSlotKey } from "@adapttable/core/binding";',
      'import type * as Neutral from "@adapttable/core/binding";',
      'import type { TableSource } from "@adapttable/core";',
      'import type { PdfWriterOptions } from "@adapttable/core/pdf";',
      `import { type ${propType}, featureSlotKey } from "@adapttable/core/binding";`,
    ]) {
      assert.ok((await restrictedImports(file, source)).length > 0, source);
    }
  });
}

test("the canonical prop exception does not apply to other kit files", async () => {
  const file =
    "packages/vue/adapter-vue-unstyled/src/filters/NativeFilterField.vue";
  for (const propType of ["ChecklistFilterProps", "FilterTreeBuilderProps"]) {
    assert.ok(
      (
        await restrictedImports(
          file,
          `import type { ${propType} } from "@adapttable/core/binding";`
        )
      ).length > 0
    );
  }
});
