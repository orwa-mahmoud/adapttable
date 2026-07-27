#!/usr/bin/env node
/**
 * Every public export must be documented — api.md claims "the complete
 * public surface", and for most of v1 that was false: 181 of ~305 core
 * exports appeared in no doc page. Whole shipped modules (headless cell
 * editing, row grouping, the CSV pipeline) were invisible to anyone who
 * didn't read source, while versioning.md declared some of those same
 * names committed-stable. Nothing caught it: exports compile, tests
 * cover them, the site builds — only a reader notices, and readers leave.
 *
 * So the gate checks it: this script enumerates every package's real
 * export surface (via the TypeScript checker, so `export *`, aliases and
 * type-only exports all count) and fails on any name that no hand-written
 * doc page mentions. Exporting something IS documenting it — if a name
 * shouldn't be documented, it shouldn't be exported.
 *
 * `--report` prints the full per-package diff instead of failing fast —
 * useful when auditing rather than gating.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = join(REPO_ROOT, "docs");

/** Every published package: its export surface lives in src/index.ts. */
const PACKAGES = readdirSync(join(REPO_ROOT, "packages"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const corpus = readdirSync(DOCS_DIR)
  .filter((name) => name.endsWith(".md"))
  .map((name) => readFileSync(join(DOCS_DIR, name), "utf8"))
  .join("\n");

/** Word-boundary presence: `SortLevel` must not match inside `SortLevels`. */
function isDocumented(name) {
  const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`).test(corpus);
}

function exportsOf(program, checker, entryPath) {
  const source = program.getSourceFile(entryPath);
  if (!source) throw new Error(`Missing entry ${entryPath}`);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`No module symbol for ${entryPath}`);
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => symbol.name)
    .filter((name) => name !== "default")
    .sort((a, b) => a.localeCompare(b));
}

function auditPackages() {
  const entries = PACKAGES.map((pkg) =>
    join(REPO_ROOT, "packages", pkg, "src", "index.ts")
  );
  const program = ts.createProgram(entries, {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  return PACKAGES.map((pkg, index) => {
    const names = exportsOf(program, checker, entries[index]);
    const undocumented = new Set(names.filter((name) => !isDocumented(name)));
    return { pkg, names, undocumented };
  });
}

function printReport(audits) {
  for (const { pkg, names, undocumented } of audits) {
    console.log(`\n## ${pkg} — ${names.length} exports`);
    for (const name of names) {
      console.log(`${undocumented.has(name) ? "MISSING" : "ok     "} ${name}`);
    }
  }
}

function printFailures(audits) {
  for (const { pkg, undocumented } of audits) {
    if (undocumented.size === 0) continue;
    console.error(
      `\n${pkg}: ${undocumented.size} exported name(s) appear in no docs/*.md page:`
    );
    for (const name of undocumented) console.error(`  - ${name}`);
  }
}

function main() {
  const audits = auditPackages();
  const exportTotal = audits.reduce((sum, a) => sum + a.names.length, 0);
  const undocumentedTotal = audits.reduce(
    (sum, a) => sum + a.undocumented.size,
    0
  );

  if (process.argv.includes("--report")) {
    printReport(audits);
    console.log(
      `\nTotal: ${exportTotal} exports, ${undocumentedTotal} undocumented.`
    );
    return;
  }
  if (undocumentedTotal > 0) {
    printFailures(audits);
    console.error(
      `\n${undocumentedTotal} undocumented export(s). Document each name in docs/ or stop exporting it.`
    );
    process.exit(1);
  }
  console.log(`doc-surface: all ${exportTotal} exports documented.`);
}

main();
