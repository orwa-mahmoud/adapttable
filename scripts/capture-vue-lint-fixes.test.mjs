import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { captureVueLintFixes } from "./capture-vue-lint-fixes.mjs";

const CHANGED = "packages/vue/vue/src/actions/lifecycle.ts";
const UNCHANGED = "packages/vue/vue/src/adapter.ts";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "vue-lint-diagnostics-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of [CHANGED, UNCHANGED]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), "original source\n");
  }
  return { root, outputFile: join(root, "reports/fixes.json") };
}

test("capture retains only changed proposals and leaves source bytes untouched", (t) => {
  const paths = fixture(t);
  const report = captureVueLintFixes({
    ...paths,
    sourceCommit: "test-commit",
    run: (command, args, options) => {
      assert.equal(command, process.execPath);
      assert.equal(
        args[0],
        join(paths.root, "node_modules/eslint/bin/eslint.js")
      );
      assert.deepEqual(args.slice(1, 4), ["--fix-dry-run", "--format", "json"]);
      assert.equal(args.includes("--fix"), false);
      assert.equal(args.slice(4).length, 72);
      assert.equal(options.cwd, paths.root);
      return {
        status: 0,
        stdout: JSON.stringify([
          {
            filePath: join(paths.root, CHANGED),
            output: "official proposed source\n",
            messages: [],
            errorCount: 0,
            warningCount: 0,
          },
          {
            filePath: join(paths.root, UNCHANGED),
            output: "original source\n",
          },
          { filePath: join(paths.root, UNCHANGED) },
        ]),
      };
    },
  });
  assert.equal(report.sourceCommit, "test-commit");
  assert.equal(report.proposals.length, 1);
  assert.equal(report.proposals[0].filePath, CHANGED);
  assert.equal(
    report.proposals[0].sourceSha256,
    createHash("sha256").update("original source\n").digest("hex")
  );
  assert.deepEqual(JSON.parse(readFileSync(paths.outputFile, "utf8")), report);
  for (const file of [CHANGED, UNCHANGED]) {
    assert.equal(
      readFileSync(join(paths.root, file), "utf8"),
      "original source\n"
    );
  }
});

test("remaining lint failures retain their exit status and diagnostics", (t) => {
  const paths = fixture(t);
  const messages = [
    { ruleId: "example/rule", severity: 2, message: "Still bad" },
  ];
  const report = captureVueLintFixes({
    ...paths,
    run: () => ({
      status: 1,
      stdout: JSON.stringify([
        {
          filePath: join(paths.root, CHANGED),
          output: "official proposed source\n",
          messages,
          errorCount: 1,
          warningCount: 0,
        },
      ]),
    }),
  });
  assert.equal(report.eslintExitCode, 1);
  assert.deepEqual(report.proposals[0].messages, messages);
});

test("tool failures do not create a misleading proposal artifact", (t) => {
  const paths = fixture(t);
  assert.throws(
    () =>
      captureVueLintFixes({
        ...paths,
        run: () => ({ status: 2, stdout: "[]" }),
      }),
    /ESLint dry run failed: 2/
  );
  assert.equal(existsSync(paths.outputFile), false);
});

test("out-of-scope results cannot enter the retained artifact", (t) => {
  const paths = fixture(t);
  assert.throws(
    () =>
      captureVueLintFixes({
        ...paths,
        run: () => ({
          status: 0,
          stdout: JSON.stringify([
            { filePath: join(paths.root, "package.json"), output: "changed" },
          ]),
        }),
      }),
    /Unexpected ESLint result path/
  );
  assert.equal(existsSync(paths.outputFile), false);
});
