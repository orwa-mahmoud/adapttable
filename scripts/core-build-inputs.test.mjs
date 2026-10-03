import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const root = fileURLToPath(
  new URL("../packages/shared/core/", import.meta.url)
);
function config(name) {
  const file = join(root, name);
  const loaded = ts.readConfigFile(file, ts.sys.readFile);
  assert.equal(loaded.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(
    loaded.config,
    ts.sys,
    dirname(file)
  );
  assert.deepEqual(parsed.errors, []);
  return parsed;
}

it("keeps core tests and test globals in normal typechecking, outside production declaration inputs", () => {
  const normal = config("tsconfig.json");
  const build = config("tsconfig.build.json");
  const tests = normal.fileNames.filter((file) => /\.test\.tsx?$/.test(file));
  assert.ok(
    tests.length > 0,
    "the normal typecheck must still include real tests"
  );
  assert.ok(normal.options.types.includes("vitest/globals"));
  assert.ok(normal.options.types.includes("@testing-library/jest-dom"));
  for (const file of tests)
    assert.equal(build.fileNames.includes(file), false, file);
  assert.equal(build.options.types.includes("vitest/globals"), false);
  assert.equal(
    build.options.types.includes("@testing-library/jest-dom"),
    false
  );
  for (const file of normal.fileNames.filter(
    (file) =>
      relative(root, file).startsWith("src/") && !/\.test\.tsx?$/.test(file)
  )) {
    assert.ok(
      build.fileNames.includes(file),
      `Production source lost: ${file}`
    );
  }
  const entries = [
    ...readFileSync(join(root, "tsdown.config.ts"), "utf8").matchAll(
      /"(src\/[^"]+\.ts)"/g
    ),
  ].map((match) => join(root, match[1]));
  assert.equal(entries.length, 9);
  for (const entry of entries)
    assert.ok(build.fileNames.includes(entry), entry);
});

it("invalidates cached builds when the external core build runner changes", () => {
  const turbo = JSON.parse(
    readFileSync(new URL("../turbo.json", import.meta.url), "utf8")
  );
  assert.ok(turbo.globalDependencies.includes("scripts/build-library.mjs"));
});
