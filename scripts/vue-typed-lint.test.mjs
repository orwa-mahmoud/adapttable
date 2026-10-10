import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

import { lintVuePackage } from "./vue-typed-lint.mjs";

const roots = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "vue-typed-lint-test-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), '{"name":"test-vue-kit"}');
  await writeFile(join(root, "tsconfig.json"), "{}");
  await mkdir(join(root, ".sfc-types"));
  await writeFile(join(root, ".sfc-types", "stale.vue.d.ts"), "stale");
  return root;
}
const exists = async (path) =>
  access(path).then(
    () => true,
    () => false
  );

for (const invocation of ["direct", "symlink"]) {
  test(`${invocation} CLI invocation runs lint and reports an outside-repository error`, async () => {
    const cwd = await fixture();
    const script = fileURLToPath(
      new URL("./vue-typed-lint.mjs", import.meta.url)
    );
    let entry = script;
    if (invocation === "symlink") {
      entry = join(cwd, "linked lint runner.mjs");
      await symlink(script, entry);
    }
    const result = spawnSync(process.execPath, [entry], {
      cwd,
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /The Vue package must be inside the repository/
    );
    assert.equal(
      await readFile(join(cwd, ".sfc-types", "stale.vue.d.ts"), "utf8"),
      "stale"
    );
  });
}

for (const invocation of ["eval", "stdin", "module"]) {
  test(`importing from ${invocation} has no CLI side effects`, async () => {
    const cwd = await fixture();
    const script = new URL("./vue-typed-lint.mjs", import.meta.url).href;
    const source = `import { lintVuePackage } from ${JSON.stringify(script)};\nprocess.stdout.write(typeof lintVuePackage);\n`;
    let args;
    if (invocation === "module") {
      const importer = join(cwd, "importer.mjs");
      await writeFile(importer, source);
      args = [importer];
    } else {
      args =
        invocation === "stdin"
          ? ["--input-type=module", "-"]
          : ["--input-type=module", "--eval", source];
    }
    const result = spawnSync(process.execPath, args, {
      cwd,
      encoding: "utf8",
      input: invocation === "stdin" ? source : undefined,
      timeout: 10_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "function");
    assert.equal(result.stderr, "");
    assert.equal(
      await readFile(join(cwd, ".sfc-types", "stale.vue.d.ts"), "utf8"),
      "stale"
    );
  });
}

test("removes stale declarations and generates exact fresh types before ordinary lint", async () => {
  const cwd = await fixture();
  const calls = [];
  const status = await lintVuePackage(
    { cwd, root: cwd },
    async (tool, args, directory) => {
      calls.push(tool);
      assert.equal(directory, cwd);
      assert.equal(
        await exists(join(cwd, ".sfc-types", "stale.vue.d.ts")),
        false
      );
      if (tool === "vue-tsc") {
        assert.equal(args[0], "--project");
        const config = JSON.parse(await readFile(args[1], "utf8"));
        assert.equal(config.extends, join(cwd, "tsconfig.json"));
        assert.deepEqual(config.compilerOptions.rootDirs, [cwd]);
        assert.equal(config.compilerOptions.noEmitOnError, true);
        assert.equal(config.compilerOptions.emitDeclarationOnly, true);
        assert.equal(config.compilerOptions.incremental, false);
        await mkdir(config.compilerOptions.outDir, { recursive: true });
        await writeFile(
          join(config.compilerOptions.outDir, "fresh.vue.d.ts"),
          "fresh"
        );
      } else {
        assert.deepEqual(args, ["."]);
        assert.equal(
          await readFile(join(cwd, ".sfc-types", "fresh.vue.d.ts"), "utf8"),
          "fresh"
        );
      }
      return 0;
    }
  );
  assert.equal(status, 0);
  assert.deepEqual(calls, ["vue-tsc", "eslint"]);
  assert.equal(await exists(join(cwd, ".sfc-types", "tsconfig.json")), false);
});

test("generation failure removes partial output and never starts ESLint", async () => {
  const cwd = await fixture();
  const calls = [];
  const status = await lintVuePackage({ cwd, root: cwd }, async (tool) => {
    calls.push(tool);
    await writeFile(join(cwd, ".sfc-types", "partial.vue.d.ts"), "partial");
    return 2;
  });
  assert.equal(status, 2);
  assert.deepEqual(calls, ["vue-tsc"]);
  assert.equal(await exists(join(cwd, ".sfc-types")), false);
});

test("a failed compiler launch also clears output and blocks lint", async () => {
  const cwd = await fixture();
  await assert.rejects(
    lintVuePackage({ cwd, root: cwd }, async () => {
      throw new Error("compiler unavailable");
    }),
    /compiler unavailable/
  );
  assert.equal(await exists(join(cwd, ".sfc-types")), false);
});

test("forwards lint arguments and preserves a lint failure", async () => {
  const cwd = await fixture();
  const status = await lintVuePackage(
    { cwd, root: cwd, lintArgs: ["--", "src", "--fix"] },
    async (tool, args) => {
      if (tool === "vue-tsc") {
        await mkdir(join(cwd, ".sfc-types", ".emit"));
        return 0;
      }
      assert.deepEqual(args, ["src", "--fix"]);
      return 1;
    }
  );
  assert.equal(status, 1);
  assert.equal(await exists(join(cwd, ".sfc-types", "tsconfig.json")), false);
});

test("requires an actual package project before running a tool", async () => {
  const cwd = await fixture();
  await rm(join(cwd, "tsconfig.json"));
  let ran = false;
  await assert.rejects(
    lintVuePackage({ cwd, root: cwd }, async () => {
      ran = true;
      return 0;
    })
  );
  assert.equal(ran, false);
});

test("keeps Vue project-service extensions consistent without relaxing unsafe rules", async () => {
  const eslint = new ESLint();
  for (const name of ["src/density.ts", "src/DataTable.vue"]) {
    const config = await eslint.calculateConfigForFile(
      `packages/vue/adapter-vuetify/${name}`
    );
    assert.deepEqual(config.languageOptions.parserOptions.extraFileExtensions, [
      ".vue",
    ]);
    assert.equal(config.rules["@typescript-eslint/no-unsafe-argument"][0], 2);
    assert.equal(config.rules["@typescript-eslint/no-unsafe-return"][0], 2);
  }
  assert.equal(
    await eslint.isPathIgnored(
      "packages/vue/adapter-vuetify/.sfc-types/src/DataTable.vue.d.ts"
    ),
    true
  );
});
