#!/usr/bin/env node
/**
 * Run Playwright only when the diff can affect the showcase or docs, and only the
 * spec files when those are all that changed.
 *
 * Same path set CI uses (packages, sites, e2e, playwright.config, lockfile).
 * A canonical docs change also exercises the built Astro guides. A library
 * change runs the full suite — there is no
 * safe map from `adapter-mui` to "the mui tests", because kit loops live in
 * many files. Spec-only diffs run just those files.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gitBinary } from "./git-binary.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The two real sites and their route/source inventories are browser inputs.
// Keep this matcher shared with CI so a docs-only push cannot silently skip
// the guide and framework-switch contracts.
const RELATED =
  /^(packages\/(shared|react|angular)\/|apps\/(showcase|docs)\/|docs\/|e2e\/|playwright\.config\.ts$|scripts\/(serve-showcase|angular-docs|docs-files|site|build-llms-full)\.mjs$|pnpm-lock\.yaml$)/;

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

const PLAYWRIGHT = join(
  REPO_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "playwright.cmd" : "playwright"
);

/** Per-PR projects. Extra browsers and visual baselines are nightly-only. */
export const DEFAULT_E2E_PROJECTS = [
  "--project=chromium",
  "--project=chromium-dev",
];

/** Visual specs live under e2e/visual/ and only match chromium-visual. */
export const VISUAL_E2E_PROJECTS = ["--project=chromium-visual"];

/** @param {readonly string[]} args */
export function projectsFor(args) {
  if (
    args.length > 0 &&
    args.every((file) => {
      const path = file.replaceAll("\\", "/");
      return path.startsWith("e2e/visual/") || path.includes("/visual/");
    })
  ) {
    return VISUAL_E2E_PROJECTS;
  }
  return DEFAULT_E2E_PROJECTS;
}

function changedFiles() {
  try {
    const out = execFileSync(
      gitBinary(),
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
  execFileSync(PLAYWRIGHT, ["test", ...projectsFor(args), ...args], {
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
      "e2e: no docs/showcase/library/e2e changes vs origin/main — skipping."
    );
    return;
  }
  if (plan.kind === "specs") {
    console.log(`e2e: running ${plan.specs.length} changed spec file(s).`);
    runPlaywright(plan.specs);
    return;
  }
  console.log(
    "e2e: library, showcase or docs changed vs origin/main — full suite."
  );
  runPlaywright([]);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === thisFile) {
  main();
}
