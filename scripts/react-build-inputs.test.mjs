import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const packages = [
  "react",
  "adapter-antd",
  "adapter-base-ui",
  "adapter-chakra",
  "adapter-mantine",
  "adapter-mui",
  "adapter-radix",
  "adapter-unstyled",
  "adapter-shadcn",
];
function config(root, name) {
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

for (const name of packages)
  it(`${name} keeps full test/typecheck coverage and every production input`, () => {
    const root = fileURLToPath(
      new URL(`../packages/react/${name}/`, import.meta.url)
    );
    const normal = config(root, "tsconfig.json");
    const build = config(root, "tsconfig.build.json");
    const tests = normal.fileNames.filter((file) => /\.test\.tsx?$/.test(file));
    assert.ok(tests.length > 0);
    assert.ok(normal.options.types.includes("vitest/globals"));
    assert.ok(normal.options.types.includes("@testing-library/jest-dom"));
    if (name === "react") assert.ok(normal.options.paths["@adapttable/core"]);
    assert.deepEqual(build.options.types, ["node"]);
    assert.deepEqual(build.options.paths, {});
    for (const file of tests) assert.ok(!build.fileNames.includes(file), file);
    const production = normal.fileNames.filter(
      (file) =>
        file.startsWith(join(root, "src")) && !/\.test\.tsx?$/.test(file)
    );
    assert.deepEqual([...build.fileNames].sort(), production.sort());
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    );
    assert.ok(
      manifest.scripts.build.startsWith(
        "node ../../../scripts/build-library.mjs"
      )
    );
    const bundler = readFileSync(join(root, "tsdown.config.ts"), "utf8");
    assert.ok(
      bundler.includes('"babel-plugin-react-compiler"'),
      "the original JS transform must remain configured"
    );
    const entries = [...bundler.matchAll(/"(src\/[^"]+\.tsx?)"/g)].map(
      (match) => join(root, match[1])
    );
    assert.ok(entries.length > 0);
    for (const entry of entries)
      assert.ok(build.fileNames.includes(entry), entry);
    if (name === "adapter-base-ui")
      assert.ok(
        manifest.scripts.build.endsWith(" && cp src/styles.css dist/styles.css")
      );
  });
