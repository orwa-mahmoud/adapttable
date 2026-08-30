#!/usr/bin/env node
/**
 * Run Playwright only when the diff can affect the showcase, and only the
 * spec files when those are all that changed.
 *
 * Same path set CI uses (packages, showcase, e2e, playwright.config, lockfile).
 * A docs-only push skips. A library change runs the full suite — there is no
 * safe map from `adapter-mui` to "the mui tests", because kit loops live in
 * many files. Spec-only diffs run just those files.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// `serve-showcase.mjs` builds and serves what the suite runs against, so a
// change to it changes every result the suite can produce.
const RELATED =
  /^(packages\/|apps\/showcase\/|e2e\/|playwright\.config\.ts$|scripts\/serve-showcase\.mjs$|pnpm-lock\.yaml$)/;

/** @param {string} file */
export function isE2eRelated(file) {
  return RELATED.test(file.replaceAll("\\", "/"));
}

/** @param {string} file */
export function isE2eSpec(file) {
  const path = file.replaceAll("\\", "/");
  return path.startsWith("e2e/") && path.endsWith(".spec.ts");
}

/**
 * @param {readonly string[]} files
 * @returns {{ kind: "skip" } | { kind: "full" } | { kind: "specs"; specs: string[] }}
 */
export function e2ePlan(files) {
  const related = [
    ...new Set(
      files.map((file) => file.replaceAll("\\", "/")).filter(isE2eRelated)
    ),
  ];
  if (related.length === 0) return { kind: "skip" };
  if (related.every(isE2eSpec)) {
    return { kind: "specs", specs: related };
  }
  return { kind: "full" };
}

const GIT =
  process.platform === "win32"
    ? "C:\\Program Files\\Git\\cmd\\git.exe"
    : "/usr/bin/git";
const PLAYWRIGHT = join(
  REPO_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "playwright.cmd" : "playwright"
);

function changedFiles() {
  try {
    const out = execFileSync(
      GIT,
      ["diff", "--name-only", "origin/main...HEAD"],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
      }
    );
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

function runPlaywright(args) {
  execFileSync(PLAYWRIGHT, ["test", ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
}

function main() {
  const files = changedFiles();
  if (files === null) {
    console.log(
      "e2e: could not diff against origin/main — running the full suite."
    );
    runPlaywright([]);
    return;
  }
  const plan = e2ePlan(files);
  if (plan.kind === "skip") {
    console.log(
      "e2e: no showcase/library/e2e changes vs origin/main — skipping."
    );
    return;
  }
  if (plan.kind === "specs") {
    console.log(`e2e: running ${plan.specs.length} changed spec file(s).`);
    runPlaywright(plan.specs);
    return;
  }
  console.log("e2e: library or showcase changed vs origin/main — full suite.");
  runPlaywright([]);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === thisFile) {
  main();
}
