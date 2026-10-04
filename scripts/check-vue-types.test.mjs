import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  diagnosticProblems,
  invalidFixtures,
  parseDiagnostics,
} from "./check-vue-types.mjs";

const cwd = join(tmpdir(), "adapttable-vue-type-consumer");
const fixtureDir = join(cwd, "test/types/invalid");
const output =
  "test/types/invalid/WrongValue.vue(3,1): error TS2322: Type 'string' is not assignable to type 'number'.";
const expectations = {
  "WrongValue.vue": [
    { code: 2322, message: /Type 'string' is not assignable to type 'number'/ },
  ],
};
const options = {
  cwd,
  fixtureDir,
  files: ["WrongValue.vue"],
  expectations,
  output,
  status: 2,
};

describe("Vue negative type fixture harness", () => {
  it("requires the intended diagnostic from every fixture", () => {
    assert.deepEqual(diagnosticProblems(options), []);
    const missing = diagnosticProblems({
      ...options,
      files: [...options.files, "WrongRow.vue"],
      expectations: {
        ...expectations,
        "WrongRow.vue": [{ code: 2322, message: /wrong row/ }],
      },
    });
    assert.equal(missing.length, 1);
    assert.match(missing[0], /WrongRow.vue: missing expected TS2322/);
  });

  it("fails when an invalid fixture compiles or the compiler crashes", () => {
    for (const status of [0, 1, null]) {
      const problems = diagnosticProblems({ ...options, status, output: "" });
      assert.match(problems[0], /expected diagnostic exit 2/);
      assert.match(problems[1], /missing expected TS2322/);
    }
  });

  it("does not accept a wrong diagnostic code or message", () => {
    for (const badOutput of [
      output.replace("TS2322", "TS2307"),
      output.replace("Type 'string'", "Type 'boolean'"),
    ]) {
      const problems = diagnosticProblems({ ...options, output: badOutput });
      assert.equal(problems.length, 2);
      assert.match(problems[0], /unexpected TS/);
      assert.match(problems[1], /missing expected TS2322/);
    }
  });

  it("rejects unrelated source errors even when every negative fixture fails", () => {
    const problems = diagnosticProblems({
      ...options,
      output:
        output +
        "\nsrc/index.ts(4,2): error TS2307: Cannot find module 'missing'.",
    });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /src\/index.ts: unexpected TS2307/);
  });

  it("does not confuse a matching basename outside the fixture directory", () => {
    const problems = diagnosticProblems({
      ...options,
      output: output.replace("test/types/invalid", "src"),
    });
    assert.equal(problems.length, 2);
    assert.match(problems[0], /src\/WrongValue.vue: unexpected TS2322/);
    assert.match(problems[1], /missing expected TS2322/);
  });

  it("rejects unregistered fixtures and deleted registered fixtures", () => {
    assert.match(
      diagnosticProblems({ ...options, files: ["Extra.vue"] }).join("\n"),
      /Extra.vue: no expected diagnostic registered\nWrongValue.vue: fixture is missing/
    );
    assert.match(
      diagnosticProblems({ ...options, files: [] })[0],
      /No invalid Vue fixtures found/
    );
  });

  it("rejects global compiler diagnostics and unrecognized output", () => {
    const problems = diagnosticProblems({
      ...options,
      output:
        output + "\nerror TS18003: No inputs were found.\nCompiler crashed.",
    });
    assert.equal(problems.length, 2);
    assert.match(problems[0], /Unexpected compiler output: error TS18003/);
    assert.match(problems[1], /Unexpected compiler output: Compiler crashed/);
  });

  it("retains multiline diagnostic detail and normalizes compiler paths", () => {
    assert.deepEqual(
      parseDiagnostics(
        "test\\types\\invalid\\WrongRows.vue(7,9): error TS2322: Wrong row.\r\n" +
          "  Property 'name' is missing.\r\n"
      ),
      {
        diagnostics: [
          {
            file: "test/types/invalid/WrongRows.vue",
            code: 2322,
            message: "Wrong row.\n  Property 'name' is missing.",
          },
        ],
        unexpected: [],
      }
    );
  });

  it("accepts absolute compiler paths", () => {
    assert.deepEqual(
      diagnosticProblems({
        ...options,
        output: output.replace("test/types/invalid", fixtureDir),
      }),
      []
    );
  });

  it("discovers every SFC, including nested fixtures", (t) => {
    const root = mkdtempSync(join(tmpdir(), "adapttable-vue-fixtures-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "nested"));
    writeFileSync(join(root, "WrongValue.vue"), "<template><div /></template>");
    writeFileSync(
      join(root, "nested/WrongRows.vue"),
      "<template><div /></template>"
    );
    writeFileSync(join(root, "tsconfig.json"), "{}");
    assert.deepEqual(invalidFixtures(root), [
      "WrongValue.vue",
      "nested/WrongRows.vue",
    ]);
  });
});
