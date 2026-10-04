import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { classify } from "./ci-detect.mjs";
import { gitBinary } from "./git-binary.mjs";
import { integrationFiles } from "./integration-diff.mjs";

describe("integration branch comparisons", () => {
  it("keeps package and browser checks after a tooling-only checkpoint", () => {
    const cwd = mkdtempSync(join(tmpdir(), "adapttable-integration-diff-"));
    const git = (...args) =>
      execFileSync(gitBinary(), args, { cwd, encoding: "utf8" }).trim();
    const commit = (message) => {
      git("add", ".");
      git(
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-m",
        message
      );
    };
    try {
      git("init", "--initial-branch=main");
      writeFileSync(join(cwd, "README.md"), "Fixture\n");
      commit("baseline");
      git("update-ref", "refs/remotes/origin/main", "HEAD");
      git("switch", "-c", "feat/vue-foundation-and-adapters");
      mkdirSync(join(cwd, "packages/shared/core/src"), { recursive: true });
      writeFileSync(
        join(cwd, "packages/shared/core/src/index.ts"),
        "export {};\n"
      );
      commit("add library source");
      const before = git("rev-parse", "HEAD");
      mkdirSync(join(cwd, "scripts"));
      writeFileSync(join(cwd, "scripts/check.mjs"), "export {};\n");
      commit("update tooling");

      assert.deepEqual(git("diff", "--name-only", before, "HEAD").split("\n"), [
        "scripts/check.mjs",
      ]);
      const files = integrationFiles(cwd);
      assert.deepEqual(files, [
        "packages/shared/core/src/index.ts",
        "scripts/check.mjs",
      ]);
      const flags = classify(files);
      assert.equal(flags.runUnit, true);
      assert.equal(flags.runPackage, true);
      assert.equal(flags.runPlaywright, true);
      assert.equal(flags.needBuild, true);

      git("switch", "main");
      writeFileSync(join(cwd, "README.md"), "Main advanced independently\n");
      commit("advance main");
      git("update-ref", "refs/remotes/origin/main", "HEAD");
      git("switch", "feat/vue-foundation-and-adapters");
      assert.deepEqual(integrationFiles(cwd), files);
      git("update-ref", "-d", "refs/remotes/origin/main");
      assert.throws(() => integrationFiles(cwd));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("uses full history and preserves main-push and pull-request classification", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const workflow = readFileSync(
      join(root, ".github/workflows/pr.yml"),
      "utf8"
    );
    const detect = workflow.slice(
      workflow.indexOf("  detect:"),
      workflow.indexOf("  build:")
    );
    assert.match(detect, /fetch-depth: 0/);
    assert.match(
      detect,
      /\[ "\$EVENT" = "push" \] && \[ "\$GITHUB_REF" = "refs\/heads\/feat\/vue-foundation-and-adapters" \]/
    );
    assert.match(detect, /node scripts\/integration-diff\.mjs/);
    assert.match(detect, /git diff --name-only "\$BEFORE" HEAD/);
    assert.match(detect, /pulls\/\$\{PR_NUMBER\}\/files/);
  });
});
