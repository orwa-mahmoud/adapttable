#!/usr/bin/env node
/**
 * The engine/binding line inside `@adapttable/core`.
 *
 * The core engine is framework-agnostic by construction: the model, state,
 * operators and serialization compile without React, and React lives in a
 * binding layer above them (hooks, Chrome, focus). That boundary is what makes
 * a Vue or Angular binding possible later without a rewrite — and a boundary
 * nobody checks is a boundary that closes the first time someone reaches for
 * `useMemo` in an operator.
 *
 * So the engine is a written list. `frameworkBoundary.engineModules` in
 * `feature-classification.json` names every module on the React-free side, and
 * this fails the build when one of them imports React, a React runtime, or a
 * framework-coupled package.
 *
 * Two directions matter, and both are checked:
 *
 * 1. **A listed module gained a framework import.** The line moved under
 *    someone building something else — the usual way a boundary is lost.
 * 2. **A listed module disappeared.** A rename or a delete silently shrinks
 *    the engine, so the list is reconciled against the tree rather than
 *    trusted.
 *
 * A module that is genuinely binding does not belong on the list: remove it in
 * the same change, with the reason in the commit. The list is an argument, not
 * a silencer.
 *
 *   node scripts/check-framework-boundary.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "scripts", "feature-classification.json");

const { frameworkBoundary } = JSON.parse(readFileSync(MANIFEST, "utf8"));
const { engineModules, forbiddenImports } = frameworkBoundary;

/** `react/*` and `@tanstack/*` are prefixes; the rest are exact specifiers. */
const matchers = forbiddenImports.map((pattern) =>
  pattern.endsWith("/*")
    ? (spec) => spec.startsWith(pattern.slice(0, -1))
    : (spec) => spec === pattern
);

/** Every `from "…"` and `import("…")` specifier in one file. */
function specifiersOf(source) {
  const out = [];
  const re = /(?:from|import)[\s(]*["']([^"']+)["']/g;
  for (const match of source.matchAll(re)) out.push(match[1]);
  return out;
}

const missing = [];
const violations = [];

for (const relative of engineModules) {
  const file = join(ROOT, "packages", relative);
  if (!existsSync(file)) {
    missing.push(relative);
    continue;
  }
  const banned = specifiersOf(readFileSync(file, "utf8")).filter((spec) =>
    matchers.some((matches) => matches(spec))
  );
  if (banned.length > 0) {
    violations.push({ relative, banned: [...new Set(banned)] });
  }
}

if (missing.length === 0 && violations.length === 0) {
  console.log(
    `✓ framework boundary — ${engineModules.length} engine modules, no framework imports`
  );
  process.exit(0);
}

for (const { relative, banned } of violations) {
  console.error(
    `✗ ${relative} is engine but imports ${banned.join(", ")}\n` +
      `  Move the React use into a binding module, or drop this module from ` +
      `frameworkBoundary.engineModules with the reason in the commit.`
  );
}
for (const relative of missing) {
  console.error(
    `✗ ${relative} is listed as engine but no longer exists\n` +
      `  Update frameworkBoundary.engineModules in the change that moved it.`
  );
}
console.error(
  `\n${violations.length} boundary violation(s), ${missing.length} stale entr(ies).`
);
process.exit(1);
