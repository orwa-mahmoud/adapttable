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

/** The suffix shapes the declaration bundler assigns to a duplicate. */
const GENERATED = /^(?<base>[A-Za-z_$][\w$]*?)(?<suffix>[$_]\d+)$/;

/** Any identifier, matched whole so the suffix test below stays anchored. */
const IDENTIFIER = /[A-Za-z_$][\w$]*/g;

/**
 * A report with the bundler's generated names folded to one spelling.
 *
 * The suffix is assigned by collision order, and this repository's build does
 * not settle on one: the same source emits `pinnedRowPart$1` on some runs and
 * `pinnedRowPart_2` on others, because the declaration bundler sometimes
 * inlines a shared declaration and sometimes hoists it to a chunk. Comparing
 * reports byte for byte therefore fails roughly half the time on a change that
 * altered nothing.
 *
 * Folding the suffix compares the contract instead of the bundler's private
 * naming. Nothing is lost: the name on the LEFT of each of those lines is
 * untouched, and `check-api-contract.mjs` compares the exported names exactly,
 * so a real symbol whose name ended in `_2` could not hide here.
 */
export function withoutGeneratedNames(report) {
  return report.replace(IDENTIFIER, (name) =>
    name.replace(GENERATED, "$<base><generated>")
  );
}

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
