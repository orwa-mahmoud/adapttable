/**
 * The published contract, and both directions of checking it.
 *
 * An API report says what the tags currently claim. The manifest in
 * `etc/api-contract.json` says what the project has committed to. Item 16 is
 * the reason both directions matter: 993 classifications were quietly
 * withdrawn and nothing noticed, because the only guard asked "is every
 * `@public` symbol approved?" and never "is every approved symbol still
 * `@public`?".
 *
 * What is checked, per published typed entry point:
 *
 * - every `@public` symbol in the report is in the manifest — an export
 *   nobody decided on, or machinery that leaked out of `@internal`
 * - every symbol in the manifest is still `@public` in the report — missing,
 *   renamed, or demoted, which is the direction that would have caught 16
 * - a pure re-export entry forwards the surface its policy names
 *
 * And structurally, so the manifest cannot rot into decoration:
 *
 * - no duplicate entry, and no duplicate name inside a surface
 * - no manifest entry naming a report that does not exist
 * - no surface that no entry uses
 * - no published typed entry point without a policy
 * - no documented entry point whose whole surface is `@internal`
 *
 * The manifest is committed, reviewed, and edited by hand. It is never
 * generated from the current reports during the gate: a list read back from
 * its own output approves whatever drift produced it, which is exactly how
 * the surface it replaced came to be wrong.
 */

/** A tagged declaration in a report, and the release tag above it. */
const TAG = /^\/\/ @(public|beta|alpha|internal)\b/;
// A declaration, exported inline or not. API Extractor writes a symbol whose
// public name differs from its local one as an unexported declaration plus a
// renamed export: `function print_2<TRow>(…)` then `export { print_2 as print }`.
const DECL =
  /^(?:export )?(?:declare )?(?:abstract )?(?:function|const|let|var|class|interface|type|enum) ([A-Za-z_$][\w$]*)/;
const INLINE_EXPORT = /^export /;
const STAR = /^export \* from "([^"]+)"/;

/**
 * Read one report into `{ tagged, stars, exported }`.
 *
 * `tagged` maps a declared name to its release tag. The name is the one on
 * the LEFT of the declaration — the name a consumer writes. A deprecated
 * alias reads `export const pinnedRowPart: typeof pinnedRowPart_2`, and
 * recording it under `pinnedRowPart_2` would file the public contract under a
 * private local name that no import can use.
 */
export function readReport(text) {
  const declared = {};
  const inline = new Set();
  const stars = [];
  let tag = null;
  for (const line of text.split("\n")) {
    tag = readLine(line, tag, declared, inline, stars);
  }
  const exported = blockExports(text);
  // File every declaration under the name a consumer writes. A renamed export
  // carries the tag of the local declaration behind it, so `print` is public
  // and `print_2` — the local name, which no import can use — never appears.
  const tagged = {};
  for (const [local, publicName] of exported) {
    if (local in declared) tagged[publicName] = declared[local];
  }
  for (const name of inline) {
    if (name in declared) tagged[name] = declared[name];
  }
  return { tagged, stars, exported: new Set(exported.values()) };
}

/** One line of a report: a tag to remember, a star, a declaration, or noise. */
function readLine(line, tag, declared, inline, stars) {
  const t = TAG.exec(line.trim());
  if (t) return t[1];
  const s = STAR.exec(line);
  if (s) {
    stars.push(s[1]);
    return null;
  }
  const d = DECL.exec(line);
  if (d) {
    declared[d[1]] = tag ?? "untagged";
    if (INLINE_EXPORT.test(line)) inline.add(d[1]);
  }
  return null;
}

/** `local name -> public name` for every `export { … }` specifier. */
function blockExports(text) {
  const exported = new Map();
  for (const block of text.matchAll(/export \{([^}]*)\}/g)) {
    for (const part of block[1].split(",")) {
      const spec = part.trim();
      if (!spec) continue;
      const renamed =
        /^(?:type )?([A-Za-z_$][\w$]*) as ([A-Za-z_$][\w$]*)$/.exec(spec);
      if (renamed) exported.set(renamed[1], renamed[2]);
      else {
        const name = spec.replace(/^type /, "");
        exported.set(name, name);
      }
    }
  }
  return exported;
}

/** The names a report classifies `@public`, sorted. */
export function publicNames(report) {
  return Object.entries(report.tagged)
    .filter(([, tag]) => tag === "public")
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Check the manifest against the reports, both ways.
 *
 * `entrypoints` is the list `api-entrypoints.mjs` produces; `reports` maps a
 * report file name to its text, or is absent when the file is missing.
 * Returns an array of human-readable failures — empty means the contract and
 * the reports agree.
 */
export function checkContract({ manifest, entrypoints, reports }) {
  const surfaces = manifest.surfaces ?? {};
  const policies = manifest.entrypoints ?? {};
  const errors = [
    ...shapeErrors(surfaces, policies),
    ...coverageErrors(policies, entrypoints),
  ];
  for (const [reportName, policy] of Object.entries(policies)) {
    const text = reports[reportName];
    if (text === undefined) {
      errors.push(`"${reportName}" is named by the manifest but not committed`);
      continue;
    }
    const report = readReport(text);
    const expected = surfaces[policy.surface ?? policy.reexport] ?? [];
    errors.push(
      ...(policy.reexport
        ? reexportErrors(reportName, report, expected)
        : surfaceErrors(reportName, report, expected))
    );
  }
  return errors;
}

/** The manifest read on its own: duplicates, dangling names, dead surfaces. */
function shapeErrors(surfaces, policies) {
  const errors = [];
  for (const [name, list] of Object.entries(surfaces)) {
    const seen = new Set();
    for (const symbol of list) {
      if (seen.has(symbol)) {
        errors.push(`surface "${name}" lists ${symbol} twice`);
      }
      seen.add(symbol);
    }
  }
  const used = new Set();
  for (const [report, policy] of Object.entries(policies)) {
    const named = policy.surface ?? policy.reexport;
    if (!named) {
      errors.push(`"${report}" has a policy with neither surface nor reexport`);
      continue;
    }
    used.add(named);
    if (!(named in surfaces)) {
      errors.push(`"${report}" names surface "${named}", which is not defined`);
    }
  }
  for (const name of Object.keys(surfaces)) {
    if (!used.has(name)) {
      errors.push(`surface "${name}" is defined but no entry point uses it`);
    }
  }
  return errors;
}

/** Every published entry point has a policy, and every policy has a report. */
function coverageErrors(policies, entrypoints) {
  const errors = [];
  const produced = new Set(entrypoints.map((entry) => entry.report));
  for (const report of Object.keys(policies)) {
    if (!produced.has(report)) {
      errors.push(
        `"${report}" has a policy but no entry point produces that report`
      );
    }
  }
  for (const entry of entrypoints) {
    if (entry.published && !(entry.report in policies)) {
      errors.push(
        `"${entry.report}" is a published typed entry point with no policy`
      );
    }
  }
  return errors;
}

/** A pure re-export entry: it forwards a canonical surface and declares none. */
function reexportErrors(reportName, report, expected) {
  const errors = [];
  const forwarded = new Set([...report.exported, ...report.stars]);
  const missing = expected.filter((name) => !forwarded.has(name));
  if (missing.length > 0) {
    errors.push(
      `"${reportName}" no longer forwards ${missing.length} name(s) its policy promises: ${missing.slice(0, 8).join(", ")}`
    );
  }
  const declared = publicNames(report);
  if (declared.length > 0) {
    errors.push(
      `"${reportName}" is declared a re-export entry but declares ${declared.length} symbol(s) of its own: ${declared.slice(0, 8).join(", ")}`
    );
  }
  return errors;
}

/** An entry that declares its own surface, checked in both directions. */
function surfaceErrors(reportName, report, expected) {
  const errors = [];
  const actual = publicNames(report);
  const approved = new Set(expected);
  const present = new Set(actual);
  const unexpected = actual.filter((name) => !approved.has(name));
  if (unexpected.length > 0) {
    errors.push(
      `"${reportName}" marks ${unexpected.length} symbol(s) @public that the contract does not list: ${unexpected.slice(0, 8).join(", ")}`
    );
  }
  const withdrawn = expected.filter((name) => !present.has(name));
  if (withdrawn.length > 0) {
    errors.push(
      `"${reportName}" no longer classifies ${withdrawn.length} contracted symbol(s) @public — missing, renamed or demoted: ${withdrawn.slice(0, 8).join(", ")}`
    );
  }
  if (expected.length > 0 && actual.length === 0) {
    errors.push(
      `"${reportName}" is a documented entry point whose whole surface is now internal`
    );
  }
  return errors;
}
