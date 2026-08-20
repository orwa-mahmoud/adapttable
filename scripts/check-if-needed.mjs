/**
 * Local library gate for husky pre-push. Same classify() as the PR Detect
 * job: skip lint/types/coverage/build when the diff vs origin/main cannot
 * break them. `pnpm check` stays the full command when you want every step.
 */

import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { classify } from "./ci-detect.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const GIT =
  process.platform === "win32"
    ? "C:\\Program Files\\Git\\cmd\\git.exe"
    : "/usr/bin/git";

const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

/**
 * @param {ReturnType<typeof classify>} flags
 * @returns {{ label: string, args: string[] }[]}
 */
export function checkPlan(flags) {
  if (
    flags.runLint &&
    flags.runLintRoot &&
    flags.runUnit &&
    flags.runPackage &&
    flags.runPublint
  ) {
    return [{ label: "check", args: ["run", "check"] }];
  }

  /** @type {{ label: string, args: string[] }[]} */
  const steps = [{ label: "format:check", args: ["run", "format:check"] }];

  if (flags.runLint) {
    steps.push({ label: "lint", args: ["run", "lint"] });
  }
  if (flags.runLintRoot) {
    steps.push({ label: "lint:root", args: ["run", "lint:root"] });
  }

  steps.push({ label: "check:readmes", args: ["run", "check:readmes"] });
  steps.push({ label: "check:docsurface", args: ["run", "check:docsurface"] });

  if (flags.runUnit) {
    steps.push({ label: "check:parts", args: ["run", "check:parts"] });
  }
  if (flags.runUnit || flags.runPackage) {
    steps.push({ label: "typecheck", args: ["run", "typecheck"] });
  }
  if (flags.runUnit) {
    steps.push({ label: "test:coverage", args: ["run", "test:coverage"] });
  }

  steps.push({ label: "test:scripts", args: ["run", "test:scripts"] });

  if (flags.runPackage) {
    steps.push({ label: "build", args: ["run", "build"] });
  }
  if (flags.runPublint) {
    steps.push({ label: "publint", args: ["run", "publint"] });
  }
  if (flags.runPackage) {
    steps.push({ label: "smoke:dist", args: ["run", "smoke:dist"] });
    steps.push({ label: "budget", args: ["run", "budget"] });
  }

  return steps;
}

/**
 * @param {ReturnType<typeof classify>} flags
 */
export function checkReason(flags) {
  if (flags.runUnit && flags.runPackage) return "package code changed";
  if (flags.versionOnly) return "version-only bump";
  if (flags.runPlaywright && !flags.runUnit) return "e2e-only";
  if (flags.runLintRoot || flags.runLint) return "root tooling";
  return "docs/meta-only";
}

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

function runPnpm(args) {
  execFileSync(PNPM, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
}

function main() {
  const files = changedFiles();
  if (files === null) {
    console.log(
      "check: could not diff against origin/main — running the full gate."
    );
    runPnpm(["run", "check"]);
    return;
  }

  const flags = classify(files);
  const steps = checkPlan(flags);
  console.log(
    `check: ${checkReason(flags)} vs origin/main — ${steps
      .map((step) => step.label)
      .join(", ")}`
  );
  for (const step of steps) {
    runPnpm(step.args);
  }
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === thisFile) {
  main();
}
