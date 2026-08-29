import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { entrypoints } from "./api-entrypoints.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES_DIR = join(REPO_ROOT, "packages");
const ETC = join(REPO_ROOT, "etc");

const ENTRIES = entrypoints();
const packageJson = (dir) =>
  JSON.parse(readFileSync(join(PACKAGES_DIR, dir, "package.json"), "utf8"));

describe("entrypoints", () => {
  it("covers every package under packages/", () => {
    assert.deepEqual(
      [...new Set(ENTRIES.map((e) => e.dir))].sort(),
      readdirSync(PACKAGES_DIR).sort()
    );
  });

  it("reads each package's own exports map rather than a hand-written list", () => {
    for (const dir of readdirSync(PACKAGES_DIR)) {
      const advertised = Object.keys(packageJson(dir).exports ?? { ".": {} })
        .filter((key) => key === "." || !key.slice(2).includes("."))
        .sort();
      const covered = ENTRIES.filter((e) => e.dir === dir).map((e) =>
        e.isMainEntry
          ? "."
          : `./${e.report.slice(dir.length + 1, -".api.md".length)}`
      );
      assert.deepEqual(covered, advertised, `${dir} entry points`);
    }
  });

  // The regression item 19 exists to close: the CLI is published, its exports
  // map has ".", and its building blocks are documented as programmatic. It
  // was skipped as "a bin, not an API" and its surface could change unseen.
  it("includes the CLI's main entry, because the CLI is published", () => {
    const cli = ENTRIES.filter((e) => e.dir === "cli");
    assert.equal(packageJson("cli").private ?? false, false);
    assert.deepEqual(
      cli.map((e) => e.report),
      ["cli.api.md"]
    );
    assert.equal(cli[0].published, true);
  });

  it("does not treat ./package.json, styles.css or a bin as an entry point", () => {
    assert.ok(
      Object.keys(packageJson("cli").exports).includes("./package.json"),
      "the CLI still advertises ./package.json, so the filter is still load-bearing"
    );
    assert.ok(packageJson("cli").bin, "the CLI still ships a bin");
    for (const entry of ENTRIES) {
      assert.ok(
        !entry.report.includes("package.json") &&
          !entry.report.includes(".css"),
        `${entry.report} is not a typed entry point`
      );
    }
    assert.ok(!ENTRIES.some((e) => e.report === "cli-cli.api.md"));
  });

  it("marks the workspace-private adapter as unpublished and the rest as published", () => {
    const unpublished = [
      ...new Set(ENTRIES.filter((e) => !e.published).map((e) => e.dir)),
    ];
    assert.deepEqual(unpublished, ["adapter-bootstrap"]);
  });

  it("names a committed report for every entry point", () => {
    const missing = ENTRIES.filter(
      (entry) => !existsSync(join(ETC, entry.report))
    ).map((entry) => entry.report);
    assert.deepEqual(missing, []);
  });

  it("leaves no committed report without an entry point that produces it", () => {
    const produced = new Set(ENTRIES.map((entry) => entry.report));
    const orphans = readdirSync(ETC)
      .filter((file) => file.endsWith(".api.md"))
      .filter((file) => !produced.has(file));
    assert.deepEqual(orphans, []);
  });
});
