import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { selectApiReports } from "./api-report-selection.mjs";
import { REPO_ROOT } from "./packages.mjs";

const entries = [
  { dir: "core", report: "core.api.md" },
  { dir: "vue", report: "vue.api.md" },
  { dir: "vue", report: "vue-adapter.api.md" },
  { dir: "vue", report: "vue-features.api.md" },
  { dir: "adapter-vue-unstyled", report: "adapter-vue-unstyled.api.md" },
];

describe("scoped API reports", () => {
  it("keeps unfiltered checks and local regeneration on every entry", () => {
    assert.deepEqual(selectApiReports(entries), {
      local: false,
      includeForgottenExports: false,
      packages: [],
      reports: [],
      targets: entries,
    });
    assert.deepEqual(selectApiReports(entries, ["--local"]), {
      local: true,
      includeForgottenExports: false,
      packages: [],
      reports: [],
      targets: entries,
    });
  });

  it("selects every entry in each requested package and preserves discovery order", () => {
    assert.deepEqual(
      selectApiReports(entries, [
        "--package",
        "adapter-vue-unstyled",
        "--local",
        "--package",
        "vue",
      ]),
      {
        local: true,
        includeForgottenExports: false,
        packages: ["adapter-vue-unstyled", "vue"],
        reports: [],
        targets: entries.slice(1),
      }
    );
  });

  it("does not extract duplicate package requests twice", () => {
    assert.deepEqual(
      selectApiReports(entries, ["--package", "vue", "--package", "vue"]),
      {
        local: false,
        includeForgottenExports: false,
        packages: ["vue"],
        reports: [],
        targets: entries.slice(1, 4),
      }
    );
  });

  it("selects exact reports without changing discovery order", () => {
    const selected = selectApiReports(entries, [
      "--package",
      "vue",
      "--report",
      "vue-features.api.md",
      "--report",
      "vue-adapter.api.md",
      "--report",
      "vue-features.api.md",
      "--include-forgotten-exports",
    ]);
    assert.deepEqual(selected, {
      local: false,
      includeForgottenExports: true,
      packages: ["vue"],
      reports: ["vue-features.api.md", "vue-adapter.api.md"],
      targets: entries.slice(2, 4),
    });
  });

  it("fails closed for missing, unknown, and cross-package report selections", () => {
    for (const args of [
      ["--report"],
      ["--report", "--include-forgotten-exports"],
      ["--report", ""],
    ]) {
      assert.throws(
        () => selectApiReports(entries, args),
        /requires an exact report filename/
      );
    }
    for (const args of [
      ["--report", "missing.api.md"],
      ["--package", "vue", "--report", "core.api.md"],
      ["--report", "../vue.api.md"],
      ["--report", "vue.api.md", "--report", "missing.api.md"],
      [
        "--include-forgotten-exports",
        "--package",
        "vue",
        "--report",
        "core.api.md",
      ],
    ]) {
      assert.throws(
        () => selectApiReports(entries, args),
        /No API report in selected packages/
      );
    }
  });

  it("retains an unfiltered default when only report retention is requested", () => {
    const selected = selectApiReports(entries, ["--include-forgotten-exports"]);
    assert.equal(selected.includeForgottenExports, true);
    assert.deepEqual(selected.targets, entries);
    assert.deepEqual(selected.reports, []);
  });

  it("rejects unknown packages instead of reporting a vacuous pass", () => {
    for (const args of [
      ["--package", "missing"],
      ["--package", "vue", "--package", "missing"],
      ["--package", "@adapttable/vue"],
    ]) {
      assert.throws(
        () => selectApiReports(entries, args),
        /No API report entries/
      );
    }
  });

  it("rejects missing values and misspelled options", () => {
    for (const args of [
      ["--package"],
      ["--package", "--local"],
      ["--package", ""],
    ]) {
      assert.throws(
        () => selectApiReports(entries, args),
        /requires a package folder/
      );
    }
    assert.throws(
      () => selectApiReports(entries, ["--packages", "vue"]),
      /Unknown API report argument/
    );
  });

  it("wires strict selection into the real generator before extraction", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/api-reports.mjs", "--package", "definitely-not-a-package"],
      { cwd: REPO_ROOT, encoding: "utf8" }
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /No API report entries for package folder/);
    assert.doesNotMatch(result.stdout, /every committed report matches/);
  });

  it("keeps the normal CI report command unfiltered", () => {
    const manifest = JSON.parse(
      readFileSync(join(REPO_ROOT, "package.json"), "utf8")
    );
    assert.equal(manifest.scripts["api:check"], "node scripts/api-reports.mjs");
    const workflow = readFileSync(
      join(REPO_ROOT, ".github/workflows/pr.yml"),
      "utf8"
    );
    assert.match(workflow, /run: pnpm api:check\n/);
    assert.doesNotMatch(workflow, /api:check --package/);
  });
});
