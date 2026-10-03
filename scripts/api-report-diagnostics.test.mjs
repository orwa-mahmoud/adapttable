import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { finishApiReportOutput } from "./api-report-diagnostics.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "api-report-diagnostics-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = mkdtempSync(join(root, "output-"));
  writeFileSync(join(output, "fresh.api.md"), "generated declarations\n");
  writeFileSync(join(output, "seeded.api.md"), "old committed declarations\n");
  writeFileSync(join(output, "other.txt"), "not a report");
  return {
    output,
    diagnosticsDirectory: join(root, "diagnostics"),
    reports: ["fresh.api.md"],
  };
}

test("failed checks preserve only freshly extracted reports and clean scratch output", (t) => {
  const paths = fixture(t);
  finishApiReportOutput({ ...paths, success: false });
  assert.equal(
    readFileSync(join(paths.diagnosticsDirectory, "fresh.api.md"), "utf8"),
    "generated declarations\n"
  );
  assert.equal(
    existsSync(join(paths.diagnosticsDirectory, "seeded.api.md")),
    false
  );
  assert.equal(
    existsSync(join(paths.diagnosticsDirectory, "other.txt")),
    false
  );
  assert.equal(existsSync(paths.output), false);
});

test("successful checks retain normal cleanup without diagnostic artifacts", (t) => {
  const paths = fixture(t);
  finishApiReportOutput({ ...paths, success: true });
  assert.equal(existsSync(paths.output), false);
  assert.equal(existsSync(paths.diagnosticsDirectory), false);
});

test("failed checks without the opt-in path retain normal cleanup", (t) => {
  const paths = fixture(t);
  finishApiReportOutput({
    ...paths,
    diagnosticsDirectory: undefined,
    success: false,
  });
  assert.equal(existsSync(paths.output), false);
  assert.equal(existsSync(paths.diagnosticsDirectory), false);
});

test("capture errors propagate while scratch output is still cleaned", (t) => {
  const paths = fixture(t);
  assert.throws(
    () =>
      finishApiReportOutput({
        ...paths,
        reports: ["../other.txt"],
        success: false,
      }),
    /Unexpected API report filename/
  );
  assert.equal(existsSync(paths.output), false);
});
