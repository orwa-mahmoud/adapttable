import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  diagnosticProblems,
  invalidFixtures,
  parseDiagnostics,
  VUE_TYPE_EXPECTATIONS,
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

  it("counts repeated intended diagnostics exactly", () => {
    const repeated = {
      ...options,
      output: `${output}\n${output}`,
      expectations: {
        "WrongValue.vue": [{ ...expectations["WrongValue.vue"][0], count: 2 }],
      },
    };
    assert.deepEqual(diagnosticProblems(repeated), []);
    assert.match(
      diagnosticProblems({ ...repeated, output })[0],
      /expected 2 occurrence.*got 1/
    );
    assert.match(
      diagnosticProblems({ ...options, output: `${output}\n${output}` })[0],
      /expected 1 occurrence.*got 2/
    );
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

  it("discovers every SFC and TypeScript consumer, including nested fixtures", (t) => {
    const root = mkdtempSync(join(tmpdir(), "adapttable-vue-fixtures-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "nested"));
    writeFileSync(join(root, "WrongValue.vue"), "<template><div /></template>");
    writeFileSync(
      join(root, "nested/WrongRows.vue"),
      "<template><div /></template>"
    );
    writeFileSync(join(root, "tsconfig.json"), "{}");
    writeFileSync(
      join(root, "WrongFeature.ts"),
      "export const invalid = true;"
    );
    assert.deepEqual(invalidFixtures(root), [
      "WrongFeature.ts",
      "WrongValue.vue",
      "nested/WrongRows.vue",
    ]);
  });
});

const captured = JSON.parse(
  readFileSync(
    new URL("./fixtures/vue-type-suffix-diagnostics.json", import.meta.url),
    "utf8"
  )
);
const nativeExpectations = Object.fromEntries(
  captured.map(({ file }) => {
    const fixture = file.slice("test/types/invalid/".length);
    return [
      fixture,
      VUE_TYPE_EXPECTATIONS["@adapttable/vue-unstyled"][fixture],
    ];
  })
);

function replayCaptured(diagnostics = captured) {
  return diagnosticProblems({
    cwd,
    fixtureDir,
    files: Object.keys(nativeExpectations),
    expectations: nativeExpectations,
    // The failure log omits coordinates; this parser discards them.
    output: diagnostics
      .map(
        ({ file, code, message }) => `${file}(1,1): error TS${code}: ${message}`
      )
      .join("\n"),
    status: 2,
  });
}

function withSuffix(suffix) {
  return captured.map((diagnostic) => ({
    ...diagnostic,
    message: diagnostic.message
      .replaceAll("TableFeature$1", `TableFeature${suffix}`)
      .replaceAll("ComposedFeature$1", `ComposedFeature${suffix}`),
  }));
}

describe("emitted native feature diagnostic names", () => {
  it("accepts all five exact CI file/code/message records", () => {
    assert.equal(captured.length, 5);
    assert.deepEqual(replayCaptured(), []);
  });

  it("accepts original names and positive numeric collision suffixes", () => {
    for (const suffix of ["", "$1", "$2", "$12", "$100"])
      assert.deepEqual(replayCaptured(withSuffix(suffix)), [], suffix);
  });

  it("rejects nonnumeric, zero, padded and compound suffixes", () => {
    for (const suffix of ["$x", "$0", "$01", "$1x", "$1$2", "_1"])
      assert.equal(replayCaptured(withSuffix(suffix)).length, 10, suffix);
  });

  it("retains the exact TS2322 code for every fixture", () => {
    for (let index = 0; index < captured.length; index++) {
      const changed = captured.map((diagnostic, current) =>
        current === index ? { ...diagnostic, code: 2345 } : diagnostic
      );
      const problems = replayCaptured(changed);
      assert.equal(problems.length, 2);
      assert.match(problems[0], /unexpected TS2345/);
      assert.match(problems[1], /missing expected TS2322/);
    }
  });

  it("rejects different source or target row contracts", () => {
    for (const mutate of [
      (message) =>
        message
          .replaceAll("Invoice", "OtherInvoice")
          .replaceAll("<number>", "<boolean>")
          .replaceAll("{ id: number; }", "{ id: boolean; }"),
      (message) =>
        message
          .replaceAll("Person", "OtherPerson")
          .replaceAll("NoInfer<Row>", "NoInfer<OtherRow>"),
    ]) {
      assert.equal(
        replayCaptured(
          captured.map((diagnostic) => ({
            ...diagnostic,
            message: mutate(diagnostic.message),
          }))
        ).length,
        10
      );
    }
  });

  it("rejects different feature shapes even with valid numeric suffixes", () => {
    assert.equal(
      replayCaptured(
        captured.map((diagnostic) => ({
          ...diagnostic,
          message: diagnostic.message.replace(
            /TableFeature\$1<[^>]+>/g,
            (type) => `Readonly<${type}>`
          ),
        }))
      ).length,
      10
    );
  });

  it("still rejects duplicate, missing and unrelated diagnostics", () => {
    assert.equal(replayCaptured([...captured, captured[0]]).length, 1);
    assert.match(
      replayCaptured([...captured, captured[0]])[0],
      /expected 1 occurrence.*got 2/
    );
    assert.equal(replayCaptured(captured.slice(1)).length, 1);
    assert.match(
      replayCaptured(captured.slice(1))[0],
      /missing expected TS2322/
    );
    const unrelated = {
      file: "src/index.ts",
      code: 2307,
      message: "Cannot find module 'missing'.",
    };
    assert.equal(replayCaptured([...captured, unrelated]).length, 1);
    assert.match(
      replayCaptured([...captured, unrelated])[0],
      /src\/index.ts: unexpected TS2307/
    );
  });
});
