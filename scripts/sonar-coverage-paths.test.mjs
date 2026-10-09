/** Sonar reads coverage only from the lcov reports it is told about. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";

import { listPackages, REPO_ROOT } from "./packages.mjs";

function reportPaths() {
  const properties = readFileSync(
    join(REPO_ROOT, "sonar-project.properties"),
    "utf8"
  );
  const line = properties
    .split("\n")
    .find((entry) => entry.startsWith("sonar.javascript.lcov.reportPaths="));
  assert.ok(line, "sonar-project.properties names no lcov report paths");
  return line.slice(line.indexOf("=") + 1).split(",");
}

it("reports the coverage of every package that measures it", () => {
  const listed = new Set(reportPaths());
  const measured = listPackages()
    .filter(({ dir }) => {
      const manifest = JSON.parse(
        readFileSync(join(dir, "package.json"), "utf8")
      );
      return typeof manifest.scripts?.["test:coverage"] === "string";
    })
    .map(({ rel }) => `${rel}/coverage/lcov.info`);
  assert.deepEqual(
    measured.filter((path) => !listed.has(path)),
    [],
    "add these reports to sonar.javascript.lcov.reportPaths"
  );
  assert.deepEqual(
    [...listed].filter(
      (path) =>
        !existsSync(
          join(REPO_ROOT, path.replace(/\/coverage\/lcov\.info$/, ""))
        )
    ),
    [],
    "these report paths name no package"
  );
});
