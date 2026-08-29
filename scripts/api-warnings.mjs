/**
 * What a forgotten-export warning IS, decided on evidence rather than shape.
 *
 * `ae-forgotten-export` says a public signature named a type the entry point
 * does not export. Most of those are real. Two are artifacts of the
 * declaration bundler, and each has to prove itself — a rule that defers
 * anything ending in `$1` defers real findings too, because the bundler uses
 * the same suffix for a name it invented and for a name it merely renamed.
 *
 * The classes, in the order they are tested:
 *
 * 1. **alias** — a deprecated main-entry alias re-exported from
 *    `mainEntryAliases.ts`. The alias and its source module both land in
 *    core's rollup, so the bundler keeps two copies and suffixes the second.
 *    Deferring one requires all of: a suffix, a base name that is really an
 *    alias, and the report that alias lives in. A known alias reported from
 *    somewhere else is a finding, not an artifact.
 *
 * 2. **published** — a suffixed copy of a name the SAME entry point exports
 *    under its own spelling. `print_2` is not a leaked API when consumers
 *    import `print`: the type is nameable from that route, and the copy is
 *    private to the bundle. The proof is read out of the emitted declaration
 *    for that entry, never from a list — so it stops applying by itself the
 *    day the duplication does.
 *
 * Everything else is a finding, including a suffixed symbol whose base name
 * nothing exports.
 */
import { readFileSync } from "node:fs";

import { exportedNames } from "./packed-names.mjs";

/** The report the main-entry aliases are rolled into. */
export const ALIAS_REPORT = "core.api.md";

/**
 * The exact places a public type is derived from a runtime value.
 *
 * `FilterType` is `(typeof FILTER_TYPES)[number]`, and `FormulaErrorCode` is
 * the same shape over `FORMULA_ERRORS`. Naming the type from a subpath means
 * re-exporting the const, and a value re-export ships bytes: measured
 * 2026-08-29, adding these to the entry barrels cost 0.1–0.2 KB gzipped on
 * every one of the eight adapters, took `unstyled` from 0.2 KB of headroom to
 * 0.0, and moved `core/pivot` from 1.5 KB to 1.6 — a published figure. The
 * entries whose whole promise is that they are small do not pay that for a
 * name a consumer can already reach from `@adapttable/core`.
 *
 * Frozen, and exact: report and symbol both. Anything not on this list is a
 * finding, including a different symbol on one of these same reports.
 */
export const VALUE_BACKED = [
  ["core-adapter.api.md", "FILTER_TYPES"],
  ["core-features.api.md", "FILTER_TYPES"],
  ["core-formula.api.md", "FILTER_TYPES"],
  ["core-pdf.api.md", "FILTER_TYPES"],
  ["core-pivot.api.md", "FILTER_TYPES"],
  ["core-query.api.md", "FORMULA_ERRORS"],
  ["core-sparkline.api.md", "FILTER_TYPES"],
  ["core-xlsx.api.md", "FILTER_TYPES"],
];

const VALUE_BACKED_KEYS = new Set(
  VALUE_BACKED.map(([r, s]) => `${r}\u0000${s}`)
);

/** The suffix shapes the declaration bundler assigns to a duplicate. */
const GENERATED = /^(?<base>[A-Za-z_$][\w$]*?)(?<suffix>[$_]\d+)$/;

/**
 * Every name `mainEntryAliases.ts` re-exports.
 *
 * Keyed on the BASE name, never the generated one: the suffix is assigned by
 * collision order and moves whenever chunking moves, so a literal list of
 * `foo$1` silently stops matching. The set empties itself when the aliases go.
 */
export function aliasNames(source) {
  return new Set(
    [...source.matchAll(/^export (?:type|const) ([A-Za-z_$][\w$]*)/gm)].map(
      (m) => m[1]
    )
  );
}

/**
 * Read an entry point's emitted declaration once, for the `published` test.
 *
 * Returns an empty set when the file cannot be read: a missing declaration is
 * a reason to report the warning, never a reason to defer it.
 */
export function entryExports(entryDtsPath) {
  try {
    return exportedNames(readFileSync(entryDtsPath, "utf8"));
  } catch {
    return new Set();
  }
}

/**
 * Classify one `ae-forgotten-export`.
 *
 * Returns `{ kind, base, suffix }` where `kind` is `"alias"`, `"published"`,
 * `"front-door"` or `"subpath"`. The first two are artifacts and carry the
 * evidence that made them so; the last two are findings, split by whether the
 * entry point is one an application imports.
 */
export function classifyForgottenExport({
  symbol,
  report,
  isMainEntry,
  aliases,
  exports: entryExported,
}) {
  const match = GENERATED.exec(symbol);
  const base = match?.groups.base ?? symbol;
  const suffix = match?.groups.suffix ?? "";

  if (suffix && report === ALIAS_REPORT && aliases.has(base)) {
    return { kind: "alias", base, suffix };
  }
  if (suffix && entryExported.has(base)) {
    return { kind: "published", base, suffix };
  }
  if (VALUE_BACKED_KEYS.has(`${report}\u0000${symbol}`)) {
    return { kind: "value-backed", base, suffix };
  }
  return { kind: isMainEntry ? "front-door" : "subpath", base, suffix };
}

/**
 * The closing summary, as one line per class that occurred.
 *
 * Every class this run met is named with its count — a run that says nothing
 * about a class it silenced is a run that reports zero warnings while holding
 * some.
 */
export function summarize(counts) {
  const said = [];
  if (counts.alias) said.push(`${counts.alias} deprecated-alias artifact(s)`);
  if (counts.published) said.push(`${counts.published} published-name copy(s)`);
  if (counts.valueBacked)
    said.push(`${counts.valueBacked} value-backed type(s)`);
  if (counts.subpath) said.push(`${counts.subpath} on a subpath entry`);
  if (counts.frontDoor) said.push(`${counts.frontDoor} at a front door`);
  if (counts.unresolvedLink)
    said.push(`${counts.unresolvedLink} unresolved @link(s)`);
  if (counts.missingReleaseTag)
    said.push(`${counts.missingReleaseTag} missing release tag(s)`);
  if (counts.other) said.push(`${counts.other} other warning(s)`);
  return said.length === 0
    ? "api-reports: no warnings of any class."
    : `api-reports: ${said.join(", ")}.`;
}
